import secrets

from starlette.datastructures import Headers
from starlette.requests import Request
from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.core.config import Settings
from app.core.security import InvalidAccessTokenError, decode_access_token

UNSAFE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}


class CookieAuthenticationMiddleware:
    """Validate JWT cookies for protected API routes and CSRF for state changes."""

    def __init__(self, app: ASGIApp, settings: Settings) -> None:
        self.app = app
        self.settings = settings
        self.public_api_paths = {
            f"{settings.API_PREFIX}/auth/csrf",
            f"{settings.API_PREFIX}/auth/login",
            f"{settings.API_PREFIX}/auth/signup",
            f"{settings.API_PREFIX}/auth/google",
            f"{settings.API_PREFIX}/auth/google/callback",
            # FE exchanges one-time code over credentialed fetch so Partitioned
            # cookies are keyed to the frontend top-level site (CHIPS).
            f"{settings.API_PREFIX}/auth/google/session",
            # LinkedIn redirects here as a top-level navigation on the API host.
            # Partitioned/session cookies from the FE origin are not sent — user is
            # resolved from the one-time OAuth state row instead.
            f"{settings.API_PREFIX}/linkedin/callback",
            f"{settings.API_PREFIX}/health/live",
            f"{settings.API_PREFIX}/health/ready",
            f"{settings.API_PREFIX}/config",
        }

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        path = scope["path"].rstrip("/") or "/"
        if not path.startswith(f"{self.settings.API_PREFIX}/"):
            await self.app(scope, receive, send)
            return

        request = Request(scope)
        is_public = path in self.public_api_paths
        method = scope["method"].upper()

        if method in UNSAFE_METHODS and path != f"{self.settings.API_PREFIX}/auth/csrf":
            csrf_cookie = request.cookies.get(self.settings.CSRF_COOKIE_NAME)
            csrf_header = request.headers.get("x-csrf-token")
            if (
                csrf_cookie is None
                or csrf_header is None
                or not secrets.compare_digest(csrf_cookie, csrf_header)
            ):
                await self._reject(scope, receive, send, 403, "CSRF validation failed")
                return

        token = request.cookies.get(self.settings.AUTH_COOKIE_NAME)
        if token:
            try:
                claims = decode_access_token(token, self.settings)
                scope.setdefault("state", {})["user_id"] = claims.user_id
                scope["state"]["token_version"] = claims.token_version
            except InvalidAccessTokenError:
                if not is_public:
                    await self._reject(scope, receive, send, 401, "Invalid or expired session")
                    return
        elif not is_public and method != "OPTIONS":
            await self._reject(scope, receive, send, 401, "Authentication required")
            return

        await self.app(scope, receive, send)

    @staticmethod
    async def _reject(
        scope: Scope,
        receive: Receive,
        send: Send,
        status_code: int,
        detail: str,
    ) -> None:
        response = JSONResponse(
            {"detail": detail},
            status_code=status_code,
            headers={"Cache-Control": "no-store"},
        )
        await response(scope, receive, send)


class SecurityHeadersMiddleware:
    def __init__(self, app: ASGIApp, settings: Settings) -> None:
        self.app = app
        self.settings = settings

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        async def send_with_headers(message: Message) -> None:
            if message["type"] == "http.response.start":
                headers = list(message.get("headers", []))
                existing = Headers(raw=headers)
                additions = {
                    "cache-control": existing.get("cache-control", "no-store"),
                    "referrer-policy": "no-referrer",
                    "x-content-type-options": "nosniff",
                    "x-frame-options": "DENY",
                    "permissions-policy": "camera=(), geolocation=(), microphone=(), payment=()",
                }
                if scope["path"].startswith(f"{self.settings.API_PREFIX}/"):
                    additions["content-security-policy"] = (
                        "default-src 'none'; frame-ancestors 'none'"
                    )
                if self.settings.FORCE_HTTPS:
                    additions["strict-transport-security"] = "max-age=63072000; includeSubDomains"
                existing_names = {name.lower() for name, _ in headers}
                for name, value in additions.items():
                    if name.encode() not in existing_names:
                        headers.append((name.encode(), value.encode()))
                message["headers"] = headers
            await send(message)

        await self.app(scope, receive, send_with_headers)
