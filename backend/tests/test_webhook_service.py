import hashlib
import hmac
from datetime import datetime, timezone
import httpx
import pytest
from fastapi import BackgroundTasks

from app.core.config import settings
from app.modules.merchants.schemas import WebhookConfigResponse
from app.modules.webhooks.models import WebhookConfiguration, WebhookDeliveryLog
from app.modules.webhooks.schemas import WebhookConfigSchema
from app.modules.webhooks.service import (
    DeliveryAttempt,
    EndpointValidationError,
    ValidatedEndpoint,
    WebhookService,
    _decrypt_secret,
    _encrypt_secret,
    compute_hmac_signature,
    validate_endpoint,
)


class FakeStore:
    def __init__(self):
        self.configuration = None
        self.logs = []


class FakeResult:
    def __init__(self, values):
        self.values = values

    def scalars(self):
        return self

    def first(self):
        return self.values[0] if self.values else None

    def all(self):
        return list(self.values)


class FakeSession:
    def __init__(self, store):
        self.store = store

    async def execute(self, statement):
        entity = statement.column_descriptions[0]["entity"]
        if entity is WebhookConfiguration:
            values = [self.store.configuration] if self.store.configuration else []
            return FakeResult(values)
        if entity is WebhookDeliveryLog:
            return FakeResult(list(reversed(self.store.logs)))
        raise AssertionError(f"Unexpected query entity: {entity}")

    def add(self, instance):
        if isinstance(instance, WebhookConfiguration):
            self.store.configuration = instance
        elif isinstance(instance, WebhookDeliveryLog):
            if instance.created_at is None:
                instance.created_at = datetime.now(timezone.utc)
            instance.id = len(self.store.logs) + 1
            self.store.logs.append(instance)
        else:
            raise AssertionError(f"Unexpected database object: {type(instance)}")

    async def flush(self):
        return None

    async def commit(self):
        return None

    async def close(self):
        return None


async def _validated_endpoint(_target_url):
    return ValidatedEndpoint(
        request_url="https://93.184.216.34/webhook",
        original_hostname="receiver.example",
        host_header="receiver.example",
        tls_hostname="receiver.example",
    )


@pytest.fixture
def encryption_key(monkeypatch):
    monkeypatch.setattr(settings, "ENVIRONMENT", "test")
    monkeypatch.setattr(settings, "WEBHOOK_ENCRYPTION_KEY", None)
    monkeypatch.setattr(
        settings, "SECRET_KEY", "unit-test-encryption-key-with-more-than-32-bytes"
    )


def test_hmac_matches_exact_raw_request_bytes():
    raw_body = b'{"event":"order.delivered","data":{"tracking_number":"ND-123"}}'
    expected = hmac.new(
        b"unit-test-webhook-secret", raw_body, hashlib.sha256
    ).hexdigest()

    signature = compute_hmac_signature("unit-test-webhook-secret", raw_body)

    assert signature == f"sha256={expected}"
    assert compute_hmac_signature(
        "unit-test-webhook-secret", raw_body + b" "
    ) != signature


def test_signing_secret_is_encrypted_at_rest(encryption_key):
    secret = "unit-test-signing-secret"

    encrypted = _encrypt_secret(secret)

    assert encrypted.startswith("enc:v1:")
    assert secret not in encrypted
    assert _decrypt_secret(encrypted) == secret


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "url",
    [
        "http://receiver.example/hook",
        "https://localhost/hook",
        "https://api.localhost/hook",
        "https://127.0.0.1/hook",
        "https://10.0.0.2/hook",
        "https://169.254.169.254/latest",
        "https://receiver.example/hook?token=secret",
        "https://user:password@receiver.example/hook",
    ],
)
async def test_endpoint_validation_rejects_unsafe_urls(url):
    with pytest.raises(EndpointValidationError):
        await validate_endpoint(url)


@pytest.mark.asyncio
async def test_public_ip_endpoint_is_pinned():
    endpoint = await validate_endpoint("https://93.184.216.34/hooks/nexdrop")

    assert endpoint.request_url == "https://93.184.216.34/hooks/nexdrop"
    assert endpoint.tls_hostname is None


@pytest.mark.asyncio
async def test_request_signature_uses_exact_post_body(monkeypatch):
    captured = {}
    raw_body = b'{"id":"wh-test","event":"order.created","test":true}'
    signature = compute_hmac_signature("signing-secret", raw_body)

    async def handler(request):
        captured["method"] = request.method
        captured["body"] = request.content
        captured["signature"] = request.headers["X-NexDrop-Signature"]
        captured["host"] = request.headers["Host"]
        captured["sni"] = request.extensions.get("sni_hostname")
        return httpx.Response(202, request=request)

    monkeypatch.setattr(
        "app.modules.webhooks.service.validate_endpoint", _validated_endpoint
    )
    service = WebhookService(
        FakeSession(FakeStore()),
        transport=httpx.MockTransport(handler),
    )

    result = await service._send_attempt(
        "https://receiver.example/webhook",
        "order.created",
        "wh-test",
        raw_body,
        signature,
    )

    assert result.success is True
    assert result.status_code == 202
    assert captured == {
        "method": "POST",
        "body": raw_body,
        "signature": signature,
        "host": "receiver.example",
        "sni": "receiver.example",
    }


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("status_code", "should_succeed", "should_retry"),
    [(204, True, False), (503, False, True), (400, False, False), (302, False, False)],
)
async def test_http_status_is_reported_truthfully(
    monkeypatch, status_code, should_succeed, should_retry
):
    async def handler(request):
        return httpx.Response(status_code, request=request)

    monkeypatch.setattr(
        "app.modules.webhooks.service.validate_endpoint", _validated_endpoint
    )
    service = WebhookService(
        FakeSession(FakeStore()),
        transport=httpx.MockTransport(handler),
    )

    result = await service._send_attempt(
        "https://receiver.example/webhook",
        "order.created",
        "wh-status",
        b'{"event":"order.created"}',
        "sha256=test",
    )

    assert result.status_code == status_code
    assert result.success is should_succeed
    assert result.retryable is should_retry


@pytest.mark.asyncio
async def test_retry_limit_records_each_attempt_without_external_requests(
    monkeypatch, encryption_key
):
    store = FakeStore()
    secret = "test-only-signing-secret"
    store.configuration = WebhookConfiguration(
        merchant_id=17,
        target_url="https://receiver.example/webhook",
        encrypted_secret=_encrypt_secret(secret),
        is_active=True,
        subscribed_events=["order.created"],
    )
    response_codes = iter([503, 503, 503, 202])
    request_count = 0

    async def handler(request):
        nonlocal request_count
        request_count += 1
        return httpx.Response(next(response_codes), request=request)

    async def no_wait(_delay):
        return None

    monkeypatch.setattr(
        "app.modules.webhooks.service.validate_endpoint", _validated_endpoint
    )
    monkeypatch.setattr(
        "app.modules.webhooks.service.get_session_factory",
        lambda: lambda: FakeSession(store),
    )
    monkeypatch.setattr("app.modules.webhooks.service.asyncio.sleep", no_wait)
    tasks = BackgroundTasks()
    service = WebhookService(
        FakeSession(store),
        transport=httpx.MockTransport(handler),
    )

    first = await service.send_test_ping(
        merchant_id=17,
        event="order.created",
        background_tasks=tasks,
    )
    assert first.delivery_status == "retrying"
    assert first.status_code == 503
    assert len(tasks.tasks) == 1

    await tasks.tasks[0]()

    assert request_count == 4
    assert sorted(log.attempt_number for log in store.logs) == [1, 2, 3, 4]
    assert store.logs[-1].delivery_status == "delivered"
    assert store.logs[-1].status_code == 202


@pytest.mark.asyncio
async def test_configuration_persists_and_get_response_has_no_secret(
    monkeypatch, encryption_key
):
    store = FakeStore()
    monkeypatch.setattr(
        "app.modules.webhooks.service.validate_endpoint", _validated_endpoint
    )
    service = WebhookService(FakeSession(store))
    saved = await service.save_merchant_config(
        22,
        WebhookConfigSchema(
            target_url="https://receiver.example/webhook",
            secret_key="",
            is_active=True,
            subscribed_events=["order.created", "order.delivered"],
        ),
    )

    assert store.configuration.encrypted_secret != saved.secret_key
    reloaded = await WebhookService(FakeSession(store)).get_merchant_config(22)
    response = WebhookConfigResponse(
        targetUrl=reloaded.target_url,
        isActive=reloaded.is_active,
        subscribedEvents=reloaded.subscribed_events,
        secretConfigured=bool(reloaded.secret_key),
    )

    assert reloaded.secret_key == saved.secret_key
    assert response.secret_configured is True
    assert "secretKey" not in response.model_dump(by_alias=True)
