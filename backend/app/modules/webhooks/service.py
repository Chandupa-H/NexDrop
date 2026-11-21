import asyncio
import base64
import hashlib
import hmac
import ipaddress
import json
import logging
import secrets
import socket
import time
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional
from urllib.parse import urlsplit, urlunsplit

import httpx
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.exceptions import InvalidTag
from fastapi import BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_db, get_session_factory
from app.modules.webhooks.models import WebhookConfiguration, WebhookDeliveryLog
from app.modules.webhooks.repository import WebhookRepository
from app.modules.webhooks.schemas import (
    WebhookConfigSchema,
    WebhookLogResponse,
    WebhookTestPingResponse,
)

logger = logging.getLogger(__name__)

WEBHOOK_EVENTS = {
    "order.created",
    "order.picked_up",
    "order.in_transit",
    "order.out_for_delivery",
    "order.delivered",
    "order.failed",
}
MAX_ATTEMPTS = 4
RETRY_DELAYS_SECONDS = (0.25, 0.5, 1.0)
RETRYABLE_STATUSES = {408, 425, 429}


class EndpointValidationError(ValueError):
    pass


@dataclass(frozen=True)
class ValidatedEndpoint:
    request_url: str
    original_hostname: str
    host_header: str
    tls_hostname: Optional[str]


@dataclass(frozen=True)
class DeliveryAttempt:
    status_code: Optional[int]
    status_text: str
    duration_ms: int
    error_message: Optional[str]
    success: bool
    retryable: bool


def compute_hmac_signature(secret_token: str, payload_bytes: bytes) -> str:
    """Sign the exact request bytes with the merchant's webhook secret."""
    digest = hmac.new(
        secret_token.encode("utf-8"), payload_bytes, hashlib.sha256
    ).hexdigest()
    return f"sha256={digest}"


def _encryption_key() -> bytes:
    key_material = settings.WEBHOOK_ENCRYPTION_KEY
    if not key_material:
        if settings.ENVIRONMENT.lower() in {"prod", "production"}:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Webhook encryption key is not configured.",
            )
        key_material = settings.SECRET_KEY
    if not key_material:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Webhook encryption key is not configured.",
        )
    if len(key_material.encode("utf-8")) < 32:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Webhook encryption key must contain at least 32 bytes.",
        )
    return hashlib.sha256(
        b"nexdrop-webhook-secret-v1:" + key_material.encode("utf-8")
    ).digest()


def _encrypt_secret(secret: str) -> str:
    nonce = secrets.token_bytes(12)
    encrypted = AESGCM(_encryption_key()).encrypt(nonce, secret.encode("utf-8"), None)
    token = base64.urlsafe_b64encode(nonce + encrypted).decode("ascii")
    return f"enc:v1:{token}"


def _decrypt_secret(encrypted_secret: str) -> str:
    if not encrypted_secret.startswith("enc:v1:"):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Webhook secret requires rotation before it can be used.",
        )
    try:
        encrypted = base64.urlsafe_b64decode(encrypted_secret[7:].encode("ascii"))
        nonce, ciphertext = encrypted[:12], encrypted[12:]
        return AESGCM(_encryption_key()).decrypt(nonce, ciphertext, None).decode("utf-8")
    except (InvalidTag, ValueError, UnicodeDecodeError):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Webhook secret cannot be decrypted; rotate it before delivery.",
        ) from None


async def validate_endpoint(target_url: str) -> ValidatedEndpoint:
    """Validate a public HTTPS destination and pin the request to its resolved IP."""
    if not target_url or len(target_url) > 2048 or target_url != target_url.strip():
        raise EndpointValidationError("Enter a valid HTTPS webhook URL.")
    try:
        parsed = urlsplit(target_url)
        port = parsed.port or 443
    except ValueError:
        raise EndpointValidationError("Enter a valid HTTPS webhook URL.") from None

    if (
        parsed.scheme.lower() != "https"
        or not parsed.hostname
        or parsed.username is not None
        or parsed.password is not None
        or parsed.query
        or parsed.fragment
    ):
        raise EndpointValidationError(
            "Webhook URLs must use HTTPS and cannot contain credentials, query strings, or fragments."
        )
    if not 1 <= port <= 65535:
        raise EndpointValidationError("Webhook URL contains an invalid port.")

    try:
        hostname = parsed.hostname.encode("idna").decode("ascii").lower()
    except UnicodeError:
        raise EndpointValidationError("Webhook URL contains an invalid hostname.") from None
    if hostname in {"localhost", "localhost.localdomain"} or hostname.endswith(".localhost"):
        raise EndpointValidationError("Local and internal webhook destinations are not allowed.")

    try:
        address = ipaddress.ip_address(hostname)
        addresses = [address]
    except ValueError:
        try:
            records = await asyncio.get_running_loop().getaddrinfo(
                hostname, port, type=socket.SOCK_STREAM
            )
        except (OSError, socket.gaierror):
            raise EndpointValidationError("Webhook hostname could not be resolved.") from None
        addresses = []
        for record in records:
            try:
                address = ipaddress.ip_address(record[4][0])
            except ValueError:
                continue
            if address not in addresses:
                addresses.append(address)

    if not addresses:
        raise EndpointValidationError("Webhook hostname has no usable address.")
    if any(not address.is_global for address in addresses):
        raise EndpointValidationError("Private and reserved webhook destinations are not allowed.")

    selected = addresses[0]
    path = parsed.path or "/"
    if selected.version == 6:
        pinned_host = f"[{selected.compressed}]"
    else:
        pinned_host = selected.compressed
    netloc = pinned_host if port == 443 else f"{pinned_host}:{port}"
    request_url = urlunsplit(("https", netloc, path, "", ""))
    header_hostname = f"[{hostname}]" if ":" in hostname else hostname
    host_header = header_hostname if port == 443 else f"{header_hostname}:{port}"
    try:
        literal_address = ipaddress.ip_address(hostname)
        tls_hostname = None if literal_address else hostname
    except ValueError:
        tls_hostname = hostname

    return ValidatedEndpoint(
        request_url=request_url,
        original_hostname=hostname,
        host_header=host_header,
        tls_hostname=tls_hostname,
    )


class WebhookService:
    def __init__(
        self,
        session: AsyncSession,
        transport: Optional[httpx.AsyncBaseTransport] = None,
    ):
        self.session = session
        self.repository = WebhookRepository(session)
        self.transport = transport

    async def get_merchant_config(self, merchant_id: int) -> WebhookConfigSchema:
        config = await self.repository.get_configuration(merchant_id)
        if config is None:
            return WebhookConfigSchema(
                target_url="",
                secret_key="",
                is_active=False,
                subscribed_events=[],
            )
        return WebhookConfigSchema(
            target_url=config.target_url,
            secret_key=_decrypt_secret(config.encrypted_secret),
            is_active=config.is_active,
            subscribed_events=list(config.subscribed_events or []),
        )

    async def save_merchant_config(
        self, merchant_id: int, payload: WebhookConfigSchema
    ) -> WebhookConfigSchema:
        events = list(dict.fromkeys(payload.subscribed_events))
        invalid_events = set(events) - WEBHOOK_EVENTS
        if invalid_events:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="One or more webhook events are not supported.",
            )
        if payload.is_active and (not payload.target_url or not events):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="An active webhook requires an HTTPS URL and at least one event.",
            )
        if payload.target_url:
            try:
                await validate_endpoint(payload.target_url)
            except EndpointValidationError as error:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=str(error),
                ) from None

        config = await self.repository.get_configuration(merchant_id)
        if config is None:
            secret = secrets.token_urlsafe(32)
            config = WebhookConfiguration(
                merchant_id=merchant_id,
                target_url=payload.target_url,
                encrypted_secret=_encrypt_secret(secret),
                is_active=payload.is_active,
                subscribed_events=events,
            )
            self.session.add(config)
        else:
            config.target_url = payload.target_url
            config.is_active = payload.is_active
            config.subscribed_events = events
            if not config.encrypted_secret.startswith("enc:v1:"):
                config.encrypted_secret = _encrypt_secret(secrets.token_urlsafe(32))
        await self.session.flush()
        return WebhookConfigSchema(
            target_url=config.target_url,
            secret_key=_decrypt_secret(config.encrypted_secret),
            is_active=config.is_active,
            subscribed_events=list(config.subscribed_events or []),
        )

    async def rotate_secret(self, merchant_id: int) -> str:
        config = await self.repository.get_configuration(merchant_id)
        if config is None:
            config = WebhookConfiguration(
                merchant_id=merchant_id,
                target_url="",
                encrypted_secret="",
                is_active=False,
                subscribed_events=[],
            )
            self.session.add(config)
        secret = secrets.token_urlsafe(32)
        config.encrypted_secret = _encrypt_secret(secret)
        await self.session.flush()
        return secret

    async def list_merchant_logs(
        self, merchant_id: int, limit: int = 50
    ) -> list[WebhookLogResponse]:
        logs = await self.repository.list_delivery_logs(merchant_id, limit)
        return [
            WebhookLogResponse(
                id=str(log.delivery_id or log.id),
                event=log.event_type,
                tracking_number=log.tracking_number,
                status=log.status_code,
                status_text=log.status_text,
                timestamp=log.created_at.isoformat(),
                duration_ms=log.duration_ms,
                delivery_status=log.delivery_status,
                attempt_number=log.attempt_number,
                error_message=log.error_message,
                payload_summary=log.payload_summary,
            )
            for log in logs
        ]

    async def send_test_ping(
        self,
        merchant_id: int,
        event: str,
        background_tasks: BackgroundTasks,
    ) -> WebhookTestPingResponse:
        if event not in WEBHOOK_EVENTS:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Unsupported webhook event.",
            )
        config = await self.repository.get_configuration(merchant_id)
        if config is None or not config.target_url or not config.encrypted_secret:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Configure a webhook endpoint and signing secret before sending a test.",
            )
        secret = _decrypt_secret(config.encrypted_secret)
        delivery_id = f"wh-{uuid.uuid4().hex}"
        tracking_number = f"TEST-{delivery_id[-12:]}"
        timestamp = datetime.now(timezone.utc).isoformat()
        payload = {
            "id": delivery_id,
            "event": event,
            "timestamp": timestamp,
            "test": True,
            "data": {
                "tracking_number": tracking_number,
                "status": "test",
                "location": None,
                "note": None,
                "failure_reason": None,
                "updated_at": timestamp,
            },
        }
        payload_bytes = json.dumps(
            payload, separators=(",", ":"), ensure_ascii=False
        ).encode("utf-8")
        signature = compute_hmac_signature(secret, payload_bytes)
        result = await self._send_attempt(
            config.target_url, event, delivery_id, payload_bytes, signature
        )
        retrying = result.retryable
        await self._record_attempt(
            merchant_id=merchant_id,
            delivery_id=delivery_id,
            event=event,
            tracking_number=tracking_number,
            target_url=config.target_url,
            attempt_number=1,
            result=result,
            delivery_status="retrying" if retrying else (
                "delivered" if result.success else "failed"
            ),
            payload=payload,
        )
        if retrying:
            background_tasks.add_task(
                self._retry_background,
                merchant_id,
                delivery_id,
                event,
                tracking_number,
                config.target_url,
                payload,
                payload_bytes,
                signature,
                2,
                self.transport,
            )
        delivery_status = "retrying" if retrying else (
            "delivered" if result.success else "failed"
        )
        return WebhookTestPingResponse(
            success=result.success,
            status_code=result.status_code,
            status_text=result.status_text,
            duration_ms=result.duration_ms,
            payload_sent=payload,
            signature=signature,
            delivery_id=delivery_id,
            delivery_status=delivery_status,
            attempt_number=1,
            message=(
                "Webhook receiver accepted the test event."
                if result.success
                else "Webhook test attempt failed; see delivery history for details."
            ),
        )

    async def _send_attempt(
        self,
        target_url: str,
        event: str,
        delivery_id: str,
        payload_bytes: bytes,
        signature: str,
    ) -> DeliveryAttempt:
        started = time.perf_counter()
        try:
            endpoint = await validate_endpoint(target_url)
        except EndpointValidationError as error:
            return DeliveryAttempt(
                status_code=None,
                status_text="Invalid endpoint",
                duration_ms=int((time.perf_counter() - started) * 1000),
                error_message=str(error),
                success=False,
                retryable=False,
            )

        headers = {
            "Content-Type": "application/json",
            "User-Agent": "NexDrop-Webhooks/1.0",
            "X-NexDrop-Event": event,
            "X-NexDrop-Delivery": delivery_id,
            "X-NexDrop-Signature": signature,
            "Host": endpoint.host_header,
        }
        extensions = {}
        if endpoint.tls_hostname:
            extensions["sni_hostname"] = endpoint.tls_hostname
        try:
            async with httpx.AsyncClient(
                timeout=httpx.Timeout(connect=3.0, read=4.0, write=3.0, pool=2.0),
                follow_redirects=False,
                trust_env=False,
                transport=self.transport,
            ) as client:
                request = client.build_request(
                    "POST",
                    endpoint.request_url,
                    content=payload_bytes,
                    headers=headers,
                    extensions=extensions,
                )
                response = await client.send(request)
            status_code = response.status_code
            success = 200 <= status_code < 300
            retryable = status_code in RETRYABLE_STATUSES or 500 <= status_code < 600
            return DeliveryAttempt(
                status_code=status_code,
                status_text=(response.reason_phrase or f"HTTP {status_code}")[:64],
                duration_ms=int((time.perf_counter() - started) * 1000),
                error_message=None if success else f"Receiver returned HTTP {status_code}.",
                success=success,
                retryable=retryable,
            )
        except httpx.TimeoutException:
            return DeliveryAttempt(
                status_code=None,
                status_text="Timeout",
                duration_ms=int((time.perf_counter() - started) * 1000),
                error_message="Webhook request timed out.",
                success=False,
                retryable=True,
            )
        except httpx.RequestError:
            return DeliveryAttempt(
                status_code=None,
                status_text="Connection error",
                duration_ms=int((time.perf_counter() - started) * 1000),
                error_message="Could not connect to the webhook receiver.",
                success=False,
                retryable=True,
            )

    async def _record_attempt(
        self,
        merchant_id: int,
        delivery_id: str,
        event: str,
        tracking_number: Optional[str],
        target_url: str,
        attempt_number: int,
        result: DeliveryAttempt,
        delivery_status: str,
        payload: dict,
    ) -> None:
        log = WebhookDeliveryLog(
            merchant_id=merchant_id,
            delivery_id=delivery_id,
            event_type=event,
            tracking_number=tracking_number,
            target_url=target_url,
            attempt_number=attempt_number,
            delivery_status=delivery_status,
            status_code=result.status_code,
            status_text=result.status_text,
            duration_ms=result.duration_ms,
            error_message=result.error_message,
            payload_summary=json.dumps(
                {"test": payload.get("test", False), "status": payload["data"]["status"]},
                separators=(",", ":"),
            ),
        )
        await self.repository.add_delivery_log(log)

    @staticmethod
    def _should_retry(result: DeliveryAttempt, attempt_number: int) -> bool:
        return result.retryable and attempt_number < MAX_ATTEMPTS

    @staticmethod
    async def _retry_background(
        merchant_id: int,
        delivery_id: str,
        event: str,
        tracking_number: str,
        target_url: str,
        payload: dict,
        payload_bytes: bytes,
        signature: str,
        first_attempt: int,
        transport: Optional[httpx.AsyncBaseTransport] = None,
    ) -> None:
        attempt_number = first_attempt
        while attempt_number <= MAX_ATTEMPTS:
            await asyncio.sleep(RETRY_DELAYS_SECONDS[attempt_number - 2])
            service = await WebhookService._service_for_background(transport)
            if service is None:
                return
            try:
                result = await service._send_attempt(
                    target_url, event, delivery_id, payload_bytes, signature
                )
                retrying = WebhookService._should_retry(result, attempt_number)
                await service._record_attempt(
                    merchant_id=merchant_id,
                    delivery_id=delivery_id,
                    event=event,
                    tracking_number=tracking_number,
                    target_url=target_url,
                    attempt_number=attempt_number,
                    result=result,
                    delivery_status="retrying" if retrying else (
                        "delivered" if result.success else "failed"
                    ),
                    payload=payload,
                )
                await service.session.commit()
            finally:
                await service.session.close()
            if result.success or not retrying:
                return
            attempt_number += 1

    @staticmethod
    async def _service_for_background(
        transport: Optional[httpx.AsyncBaseTransport] = None,
    ) -> Optional["WebhookService"]:
        session_factory = get_session_factory()
        if session_factory is None:
            logger.error("Webhook retry was not persisted because the database is unavailable.")
            return None
        session = session_factory()
        return WebhookService(session, transport=transport)

    @staticmethod
    def schedule_parcel_event(
        background_tasks: BackgroundTasks,
        merchant_id: Optional[int],
        tracking_number: str,
        status_value: str,
        location: Optional[str] = None,
        note: Optional[str] = None,
        failure_reason: Optional[str] = None,
    ) -> None:
        if merchant_id is None:
            return
        status_key = status_value.strip().lower()
        event_map = {
            "pending": "order.created",
            "created": "order.created",
            "picked_up": "order.picked_up",
            "in_transit": "order.in_transit",
            "out_for_delivery": "order.out_for_delivery",
            "delivered": "order.delivered",
            "failed": "order.failed",
            "cancelled": "order.failed",
        }
        event = event_map.get(status_key)
        if event is None:
            logger.warning("No merchant webhook mapping for parcel status %s", status_key)
            return
        background_tasks.add_task(
            WebhookService._dispatch_parcel_event,
            merchant_id,
            tracking_number,
            status_key,
            event,
            location,
            note,
            failure_reason,
        )

    @staticmethod
    async def _dispatch_parcel_event(
        merchant_id: int,
        tracking_number: str,
        status_value: str,
        event: str,
        location: Optional[str],
        note: Optional[str],
        failure_reason: Optional[str],
    ) -> None:
        service = await WebhookService._service_for_background()
        if service is None:
            return
        try:
            config = await service.repository.get_configuration(merchant_id)
            if (
                config is None
                or not config.is_active
                or event not in (config.subscribed_events or [])
            ):
                return
            target_url = config.target_url
            secret = _decrypt_secret(config.encrypted_secret)
        finally:
            await service.session.close()
        delivery_id = f"wh-{uuid.uuid4().hex}"
        timestamp = datetime.now(timezone.utc).isoformat()
        payload = {
            "id": delivery_id,
            "event": event,
            "timestamp": timestamp,
            "test": False,
            "data": {
                "tracking_number": tracking_number,
                "status": status_value,
                "location": location,
                "note": note,
                "failure_reason": failure_reason,
                "updated_at": timestamp,
            },
        }
        payload_bytes = json.dumps(
            payload, separators=(",", ":"), ensure_ascii=False
        ).encode("utf-8")
        signature = compute_hmac_signature(secret, payload_bytes)
        attempt_number = 1
        while attempt_number <= MAX_ATTEMPTS:
            if attempt_number > 1:
                await asyncio.sleep(RETRY_DELAYS_SECONDS[attempt_number - 2])
            service = await WebhookService._service_for_background()
            if service is None:
                return
            try:
                result = await service._send_attempt(
                    target_url, event, delivery_id, payload_bytes, signature
                )
                retrying = WebhookService._should_retry(result, attempt_number)
                await service._record_attempt(
                    merchant_id=merchant_id,
                    delivery_id=delivery_id,
                    event=event,
                    tracking_number=tracking_number,
                    target_url=target_url,
                    attempt_number=attempt_number,
                    result=result,
                    delivery_status="retrying" if retrying else (
                        "delivered" if result.success else "failed"
                    ),
                    payload=payload,
                )
                await service.session.commit()
            finally:
                await service.session.close()
            if result.success or not retrying:
                return
            attempt_number += 1


def get_webhook_service(
    session: AsyncSession = Depends(get_db),
) -> WebhookService:
    return WebhookService(session)


def authorize_merchant_path(path_merchant_id: str, authenticated_merchant_id: int) -> int:
    if path_merchant_id == "me":
        return authenticated_merchant_id
    normalized = path_merchant_id.upper().replace("MER-", "").lstrip("0") or "0"
    if normalized.isdigit() and int(normalized) == authenticated_merchant_id:
        return authenticated_merchant_id
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You may only access your own webhook configuration.",
    )
