from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID, uuid4

import jwt
from pwdlib import PasswordHash

from app.core.config import Settings

password_hash = PasswordHash.recommended()
DUMMY_PASSWORD_HASH = password_hash.hash("not-a-real-user-password")


class InvalidAccessTokenError(ValueError):
    pass


@dataclass(frozen=True, slots=True)
class AccessTokenClaims:
    user_id: UUID
    token_version: int
    expires_at: datetime


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, password_digest: str) -> bool:
    return password_hash.verify(password, password_digest)


def create_access_token(*, user_id: UUID, token_version: int, settings: Settings) -> str:
    now = datetime.now(UTC)
    expires_at = now + timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    claims: dict[str, Any] = {
        "sub": str(user_id),
        "ver": token_version,
        "type": "access",
        "iat": now,
        "exp": expires_at,
        "jti": str(uuid4()),
        "iss": settings.JWT_ISSUER,
        "aud": settings.JWT_AUDIENCE,
    }
    return jwt.encode(
        claims,
        settings.JWT_SECRET_KEY.get_secret_value(),
        algorithm=settings.JWT_ALGORITHM,
    )


def decode_access_token(token: str, settings: Settings) -> AccessTokenClaims:
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY.get_secret_value(),
            algorithms=[settings.JWT_ALGORITHM],
            audience=settings.JWT_AUDIENCE,
            issuer=settings.JWT_ISSUER,
            options={"require": ["sub", "ver", "type", "iat", "exp", "jti", "iss", "aud"]},
        )
        if payload["type"] != "access" or not isinstance(payload["ver"], int):
            raise InvalidAccessTokenError("Invalid access-token claims")
        return AccessTokenClaims(
            user_id=UUID(payload["sub"]),
            token_version=payload["ver"],
            expires_at=datetime.fromtimestamp(payload["exp"], tz=UTC),
        )
    except (jwt.InvalidTokenError, KeyError, TypeError, ValueError) as exc:
        raise InvalidAccessTokenError("Invalid or expired access token") from exc
