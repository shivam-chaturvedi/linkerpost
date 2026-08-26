from urllib.parse import urlencode

import httpx
from pydantic import BaseModel, Field

from app.core.config import Settings

AUTHORIZATION_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token"  # noqa: S105
USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"


class GoogleServiceError(RuntimeError):
    def __init__(self, message: str, *, public_code: str) -> None:
        super().__init__(message)
        self.public_code = public_code


class GoogleTokenResponse(BaseModel):
    access_token: str
    expires_in: int | None = None
    token_type: str | None = None
    scope: str | None = None
    id_token: str | None = None
    refresh_token: str | None = None


class GoogleUserInfo(BaseModel):
    sub: str
    email: str
    email_verified: bool = False
    given_name: str | None = None
    family_name: str | None = None
    name: str | None = None
    picture: str | None = None
    hd: str | None = Field(default=None)


class GoogleClient:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def authorization_url(self, state: str) -> str:
        query = urlencode(
            {
                "response_type": "code",
                "client_id": self.settings.GOOGLE_CLIENT_ID,
                "redirect_uri": self.settings.GOOGLE_REDIRECT_URI,
                "state": state,
                "scope": " ".join(self.settings.google_oauth_scopes),
                "access_type": "online",
                "prompt": "select_account",
            }
        )
        return f"{AUTHORIZATION_URL}?{query}"

    async def exchange_code(self, code: str) -> GoogleTokenResponse:
        data = {
            "grant_type": "authorization_code",
            "code": code,
            "client_id": self.settings.GOOGLE_CLIENT_ID,
            "client_secret": self.settings.GOOGLE_CLIENT_SECRET.get_secret_value(),
            "redirect_uri": self.settings.GOOGLE_REDIRECT_URI,
        }
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(
                    TOKEN_ENDPOINT,
                    data=data,
                    headers={"Accept": "application/json"},
                )
        except httpx.RequestError as exc:
            raise GoogleServiceError(
                "Google token endpoint was unavailable",
                public_code="google_unavailable",
            ) from exc

        if not response.is_success:
            raise GoogleServiceError(
                "Google rejected the authorization code exchange",
                public_code="code_exchange_failed",
            )
        try:
            return GoogleTokenResponse.model_validate(response.json())
        except ValueError as exc:
            raise GoogleServiceError(
                "Google returned an invalid token response",
                public_code="token_response_invalid",
            ) from exc

    async def get_userinfo(self, access_token: str) -> GoogleUserInfo:
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(
                    USERINFO_URL,
                    headers={
                        "Accept": "application/json",
                        "Authorization": f"Bearer {access_token}",
                    },
                )
        except httpx.RequestError as exc:
            raise GoogleServiceError(
                "Google profile endpoint was unavailable",
                public_code="google_unavailable",
            ) from exc

        if not response.is_success:
            raise GoogleServiceError(
                "Google rejected the profile lookup",
                public_code="profile_lookup_failed",
            )
        try:
            info = GoogleUserInfo.model_validate(response.json())
        except ValueError as exc:
            raise GoogleServiceError(
                "Google returned an invalid profile response",
                public_code="profile_response_invalid",
            ) from exc
        if not info.email or not info.email_verified:
            raise GoogleServiceError(
                "Google account email is missing or unverified",
                public_code="email_unverified",
            )
        return info
