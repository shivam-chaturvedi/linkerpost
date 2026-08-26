import secrets
from uuid import uuid4

import pytest
from fastapi import FastAPI, Request
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.core.config import Settings
from app.core.security import (
    InvalidAccessTokenError,
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)
from app.middleware.authentication import CookieAuthenticationMiddleware
from app.schemas.auth import SignupRequest


@pytest.fixture
def settings() -> Settings:
    return Settings(
        _env_file=None,
        APP_ENV="test",
        DATABASE_URL="postgresql+asyncpg://postgres:postgres@localhost/linkerpost_test",
        JWT_SECRET_KEY=secrets.token_urlsafe(48),
        FRONTEND_ORIGINS="http://localhost:8080",
        TRUSTED_HOSTS="testserver",
    )


def test_session_defaults_to_one_week(settings: Settings) -> None:
    assert settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES == 60 * 24 * 7
    assert settings.session_cookie_max_age_seconds == 60 * 60 * 24 * 7


def test_cross_site_cookies_are_secure_and_partitioned() -> None:
    from fastapi import Response

    from app.core.cookies import set_session_cookie

    settings = Settings(
        _env_file=None,
        APP_ENV="test",
        DATABASE_URL="postgresql+asyncpg://postgres:postgres@localhost/linkerpost_test",
        JWT_SECRET_KEY=secrets.token_urlsafe(48),
        FRONTEND_ORIGINS="https://app.example.com",
        TRUSTED_HOSTS="testserver",
        COOKIE_SAMESITE="none",
        COOKIE_SECURE=True,
    )
    params = settings.cookie_kwargs()
    assert params["samesite"] == "none"
    assert params["secure"] is True
    assert params["partitioned"] is True
    assert params["max_age"] == 60 * 60 * 24 * 7

    response = Response()
    set_session_cookie(response, key="linker_post_csrf", value="token", settings=settings)
    set_cookie = "; ".join(response.headers.getlist("set-cookie"))
    assert "SameSite=none" in set_cookie or "SameSite=None" in set_cookie
    assert "Secure" in set_cookie
    assert "Partitioned" in set_cookie
    assert "HttpOnly" in set_cookie


def test_passwords_are_hashed_and_verified() -> None:
    digest = hash_password("a-correct-horse-battery-staple")
    assert digest != "a-correct-horse-battery-staple"
    assert verify_password("a-correct-horse-battery-staple", digest)
    assert not verify_password("incorrect-password", digest)


def test_signup_password_minimum_is_six_characters() -> None:
    payload = {
        "email": "password-check@example.com",
        "first_name": "Password",
        "last_name": "Check",
    }
    accepted_password = "x" * 6
    assert SignupRequest(**payload, password=accepted_password).password == accepted_password
    with pytest.raises(ValidationError):
        SignupRequest(**payload, password="x" * 5)


def test_access_token_round_trip_and_tamper_rejection(settings: Settings) -> None:
    user_id = uuid4()
    token = create_access_token(user_id=user_id, token_version=3, settings=settings)
    claims = decode_access_token(token, settings)
    assert claims.user_id == user_id
    assert claims.token_version == 3

    header, payload, signature = token.split(".")
    replacement = "a" if signature[0] != "a" else "b"
    with pytest.raises(InvalidAccessTokenError):
        decode_access_token(f"{header}.{payload}.{replacement}{signature[1:]}", settings)


def test_protected_api_requires_cookie_and_csrf(settings: Settings) -> None:
    test_app = FastAPI()
    test_app.add_middleware(CookieAuthenticationMiddleware, settings=settings)

    @test_app.post("/api/protected")
    async def protected(request: Request) -> dict[str, str]:
        return {"user_id": str(request.state.user_id)}

    client = TestClient(test_app)
    assert client.post("/api/protected").status_code == 403

    csrf_token = secrets.token_urlsafe(32)
    client.cookies.set(settings.CSRF_COOKIE_NAME, csrf_token)
    assert client.post("/api/protected", headers={"X-CSRF-Token": csrf_token}).status_code == 401

    user_id = uuid4()
    token = create_access_token(user_id=user_id, token_version=0, settings=settings)
    client.cookies.set(settings.AUTH_COOKIE_NAME, token)
    response = client.post("/api/protected", headers={"X-CSRF-Token": csrf_token})
    assert response.status_code == 200
    assert response.json() == {"user_id": str(user_id)}
