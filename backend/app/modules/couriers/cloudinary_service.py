"""Backend-only Cloudinary operations for courier delivery proof images."""

from __future__ import annotations

import logging
from io import BytesIO
from typing import Any

from cloudinary.exceptions import AuthorizationRequired

from app.core.config import settings

logger = logging.getLogger(__name__)


class CloudinaryServiceError(Exception):
    """Safe, user-facing Cloudinary operation failure."""


def _cloudinary() -> Any:
    if not all(
        (settings.CLOUDINARY_CLOUD_NAME, settings.CLOUDINARY_API_KEY, settings.CLOUDINARY_API_SECRET)
    ):
        raise CloudinaryServiceError("Cloudinary is not configured on the backend")

    try:
        import cloudinary
        import cloudinary.uploader
    except ImportError:
        raise CloudinaryServiceError("Cloudinary support is not installed on the backend") from None

    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True,
    )
    return cloudinary


def upload_image(content: bytes, filename: str) -> dict[str, str]:
    safe_filename = filename.replace("\\", "/").rsplit("/", 1)[-1] or "delivery-proof"
    try:
        response = _cloudinary().uploader.upload(
            BytesIO(content),
            resource_type="image",
            folder="nexdrop/delivery-proofs",
            filename=safe_filename,
            use_filename=False,
            unique_filename=True,
            overwrite=False,
        )
        secure_url = response.get("secure_url")
        public_id = response.get("public_id")
        if not secure_url or not public_id:
            raise CloudinaryServiceError("Cloudinary returned incomplete proof metadata")
        return {"secure_url": str(secure_url), "public_id": str(public_id)}
    except CloudinaryServiceError:
        raise
    except AuthorizationRequired:
        logger.error("Cloudinary proof upload rejected backend credentials (HTTP 401)")
        raise CloudinaryServiceError(
            "Cloudinary rejected the backend credentials. Verify the Cloudinary API key and secret in backend/.env."
        ) from None
    except Exception as exc:
        # SDK exceptions can contain signed URLs or credential material.
        logger.error("Cloudinary proof upload failed (%s)", type(exc).__name__)
        raise CloudinaryServiceError("Cloudinary proof upload failed") from None


def delete_image(public_id: str) -> None:
    try:
        result = _cloudinary().uploader.destroy(public_id, resource_type="image")
        if result.get("result") not in {"ok", "not found"}:
            raise CloudinaryServiceError("Cloudinary proof deletion failed")
    except CloudinaryServiceError:
        raise
    except AuthorizationRequired:
        logger.error("Cloudinary proof deletion rejected backend credentials (HTTP 401)")
        raise CloudinaryServiceError(
            "Cloudinary rejected the backend credentials. Verify the Cloudinary API key and secret in backend/.env."
        ) from None
    except Exception as exc:
        logger.error("Cloudinary proof deletion failed (%s)", type(exc).__name__)
        raise CloudinaryServiceError("Cloudinary proof deletion failed") from None
