import secrets
from pathlib import Path
from typing import Optional

from fastapi import UploadFile


MAX_DOCUMENT_SIZE = 5 * 1024 * 1024
DOCUMENT_DIRECTORY = Path(__file__).resolve().parents[3] / "private_uploads" / "couriers"


class DocumentValidationError(ValueError):
    pass


async def validate_and_store_documents(files: dict[str, Optional[UploadFile]]) -> dict[str, str]:
    """Validate document signatures and store with opaque names outside static web roots."""
    validated: list[tuple[str, bytes, str]] = []
    for field, upload in files.items():
        if upload is None:
            if field != "licence_back":
                raise DocumentValidationError(f"{field.replace('_', ' ').title()} is required.")
            continue
        content = await upload.read(MAX_DOCUMENT_SIZE + 1)
        if not content:
            raise DocumentValidationError(f"{field.replace('_', ' ').title()} is empty.")
        if len(content) > MAX_DOCUMENT_SIZE:
            raise DocumentValidationError("Each document must be 5 MB or smaller.")

        if content.startswith(b"\x89PNG\r\n\x1a\n"):
            extension, detected_type = ".png", "image/png"
        elif content.startswith(b"\xff\xd8\xff"):
            extension, detected_type = ".jpg", "image/jpeg"
        elif len(content) >= 12 and content[:4] == b"RIFF" and content[8:12] == b"WEBP":
            extension, detected_type = ".webp", "image/webp"
        elif content.startswith(b"%PDF-"):
            extension, detected_type = ".pdf", "application/pdf"
        else:
            raise DocumentValidationError(f"{field.replace('_', ' ').title()} must be a valid JPG, PNG, WebP, or PDF file.")

        if field == "profile_photo" and detected_type == "application/pdf":
            raise DocumentValidationError("Profile photo must be an image file.")
        if upload.content_type not in {detected_type, "application/octet-stream"}:
            raise DocumentValidationError(f"The selected file type for {field.replace('_', ' ')} does not match its contents.")
        validated.append((field, content, extension))

    DOCUMENT_DIRECTORY.mkdir(parents=True, exist_ok=True, mode=0o700)
    try:
        DOCUMENT_DIRECTORY.chmod(0o700)
    except OSError:
        pass

    stored: dict[str, str] = {}
    try:
        for field, content, extension in validated:
            filename = f"{secrets.token_hex(24)}{extension}"
            path = DOCUMENT_DIRECTORY / filename
            path.write_bytes(content)
            try:
                path.chmod(0o600)
            except OSError:
                pass
            stored[field] = filename
    except OSError:
        remove_stored_documents(stored)
        raise DocumentValidationError("Documents could not be stored. Please try again.")
    return stored


def remove_stored_documents(documents: dict[str, str]) -> None:
    for filename in documents.values():
        if Path(filename).name == filename:
            try:
                (DOCUMENT_DIRECTORY / filename).unlink(missing_ok=True)
            except OSError:
                pass
