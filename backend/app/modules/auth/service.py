import base64
import hashlib
import hmac
import logging
import secrets
from typing import Optional
from app.modules.auth.schemas import TokenSchema

logger = logging.getLogger(__name__)


class AuthService:
    """Shared password helpers using stdlib scrypt until the auth provider is selected."""

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        try:
            algorithm, salt, digest = hashed_password.split("$", 2)
            if algorithm != "scrypt":
                return False
            salt_bytes = base64.urlsafe_b64decode(salt.encode())
            expected = base64.urlsafe_b64decode(digest.encode())
            actual = hashlib.scrypt(
                plain_password.encode(), salt=salt_bytes, n=2**14, r=8, p=1, dklen=len(expected)
            )
            return hmac.compare_digest(actual, expected)
        except (ValueError, TypeError):
            return False

    @staticmethod
    def hash_password(password: str) -> str:
        salt = secrets.token_bytes(16)
        digest = hashlib.scrypt(password.encode(), salt=salt, n=2**14, r=8, p=1, dklen=32)
        return "scrypt${}${}".format(
            base64.urlsafe_b64encode(salt).decode(),
            "$" + base64.urlsafe_b64encode(digest).decode(),
        )

    @staticmethod
    def create_access_token(subject: str, role: str) -> TokenSchema:
        # Implementation point for PyJWT encoding
        return TokenSchema(
            access_token="auth-milestone-placeholder-token",
            token_type="bearer",
            expires_in=86400,
        )
