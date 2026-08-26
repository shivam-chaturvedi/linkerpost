from urllib.parse import urlencode

import httpx

from app.core.config import Settings
from app.schemas.linkedin import LinkedInTokenResponse, LinkedInUserInfo

AUTHORIZATION_URL = "https://www.linkedin.com/oauth/v2/authorization"
ACCESS_TOKEN_ENDPOINT = "https://www.linkedin.com/oauth/v2/accessToken"  # noqa: S105
USERINFO_URL = "https://api.linkedin.com/v2/userinfo"


class LinkedInServiceError(RuntimeError):
    def __init__(
        self,
        message: str,
        public_code: str,
        stage: str,
        upstream_status: int | None = None,
        provider_error: str | None = None,
    ) -> None:
        super().__init__(message)
        self.public_code = public_code
        self.stage = stage
        self.upstream_status = upstream_status
        self.provider_error = provider_error


def _provider_error(response: httpx.Response) -> str | None:
    try:
        payload = response.json()
    except ValueError:
        return None
    if not isinstance(payload, dict):
        return None
    error = payload.get("error") or payload.get("serviceErrorCode")
    return str(error)[:128] if error is not None else None


def _token_error_code(provider_error: str | None, status_code: int) -> str:
    normalized = (provider_error or "").lower()
    if "redirect" in normalized:
        return "redirect_uri_mismatch"
    if normalized in {"invalid_client", "client_authentication_failed"} or status_code == 401:
        return "credentials_invalid"
    return "code_exchange_failed"


class LinkedInClient:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def authorization_url(self, state: str) -> str:
        query = urlencode(
            {
                "response_type": "code",
                "client_id": self.settings.LINKEDIN_CLIENT_ID,
                "redirect_uri": self.settings.LINKEDIN_REDIRECT_URI,
                "state": state,
                "scope": " ".join(self.settings.linkedin_scopes),
            }
        )
        return f"{AUTHORIZATION_URL}?{query}"

    async def exchange_code(self, code: str) -> LinkedInTokenResponse:
        data = {
            "grant_type": "authorization_code",
            "code": code,
            "client_id": self.settings.LINKEDIN_CLIENT_ID,
            "client_secret": self.settings.LINKEDIN_CLIENT_SECRET.get_secret_value(),
            "redirect_uri": self.settings.LINKEDIN_REDIRECT_URI,
        }
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(
                    ACCESS_TOKEN_ENDPOINT,
                    data=data,
                    headers={"Accept": "application/json"},
                )
        except httpx.RequestError as exc:
            raise LinkedInServiceError(
                "LinkedIn token endpoint was unavailable",
                public_code="linkedin_unavailable",
                stage="token_exchange",
            ) from exc

        if not response.is_success:
            provider_error = _provider_error(response)
            raise LinkedInServiceError(
                "LinkedIn rejected the authorization code exchange",
                public_code=_token_error_code(provider_error, response.status_code),
                stage="token_exchange",
                upstream_status=response.status_code,
                provider_error=provider_error,
            )
        try:
            return LinkedInTokenResponse.model_validate(response.json())
        except ValueError as exc:
            raise LinkedInServiceError(
                "LinkedIn returned an invalid token response",
                public_code="token_response_invalid",
                stage="token_exchange",
                upstream_status=response.status_code,
            ) from exc

    async def refresh_access_token(self, refresh_token: str) -> LinkedInTokenResponse:
        """Exchange a stored refresh token for a new access token (no user session)."""
        data = {
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
            "client_id": self.settings.LINKEDIN_CLIENT_ID,
            "client_secret": self.settings.LINKEDIN_CLIENT_SECRET.get_secret_value(),
        }
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(
                    ACCESS_TOKEN_ENDPOINT,
                    data=data,
                    headers={"Accept": "application/json"},
                )
        except httpx.RequestError as exc:
            raise LinkedInServiceError(
                "LinkedIn token endpoint was unavailable",
                public_code="linkedin_unavailable",
                stage="token_refresh",
            ) from exc

        if not response.is_success:
            provider_error = _provider_error(response)
            raise LinkedInServiceError(
                "LinkedIn rejected the refresh token",
                public_code="token_refresh_failed",
                stage="token_refresh",
                upstream_status=response.status_code,
                provider_error=provider_error,
            )
        try:
            return LinkedInTokenResponse.model_validate(response.json())
        except ValueError as exc:
            raise LinkedInServiceError(
                "LinkedIn returned an invalid refresh token response",
                public_code="token_response_invalid",
                stage="token_refresh",
                upstream_status=response.status_code,
            ) from exc

    async def get_userinfo(self, access_token: str) -> LinkedInUserInfo:
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
            raise LinkedInServiceError(
                "LinkedIn profile endpoint was unavailable",
                public_code="linkedin_unavailable",
                stage="profile_lookup",
            ) from exc

        if not response.is_success:
            raise LinkedInServiceError(
                "LinkedIn rejected the profile lookup",
                public_code="profile_permission_failed",
                stage="profile_lookup",
                upstream_status=response.status_code,
                provider_error=_provider_error(response),
            )
        try:
            return LinkedInUserInfo.model_validate(response.json())
        except ValueError as exc:
            raise LinkedInServiceError(
                "LinkedIn returned an invalid profile response",
                public_code="profile_response_invalid",
                stage="profile_lookup",
                upstream_status=response.status_code,
            ) from exc
