import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.httpsredirect import HTTPSRedirectMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app.api.routes import agents, assistant, auth, health, linkedin, notifications, posts, usage
from app.api.routes import config as config_routes
from app.api.routes import settings as settings_routes
from app.core.config import get_settings
from app.core.langsmith import configure_langsmith
from app.db.session import close_database
from app.middleware.authentication import (
    CookieAuthenticationMiddleware,
    SecurityHeadersMiddleware,
)
from app.middleware.request_id import RequestIdMiddleware

logger = logging.getLogger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    configure_langsmith(settings)
    yield
    await close_database()


app = FastAPI(
    title=settings.APP_NAME,
    version="0.1.0",
    docs_url=None if settings.is_production else "/docs",
    redoc_url=None if settings.is_production else "/redoc",
    openapi_url=None if settings.is_production else "/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(SecurityHeadersMiddleware, settings=settings)
if settings.FORCE_HTTPS:
    app.add_middleware(HTTPSRedirectMiddleware)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.trusted_hosts)
app.add_middleware(CookieAuthenticationMiddleware, settings=settings)
app.add_middleware(RequestIdMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.frontend_origins,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?" if not settings.is_production else None,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Accept", "Content-Type", "X-CSRF-Token", "X-Requested-With"],
    expose_headers=["X-Request-Id"],
)

app.include_router(health.router, prefix=settings.API_PREFIX)
app.include_router(config_routes.router, prefix=settings.API_PREFIX)
app.include_router(auth.router, prefix=settings.API_PREFIX)
app.include_router(assistant.router, prefix=settings.API_PREFIX)
app.include_router(linkedin.router, prefix=settings.API_PREFIX)
app.include_router(posts.router, prefix=settings.API_PREFIX)
app.include_router(agents.router, prefix=settings.API_PREFIX)
app.include_router(notifications.router, prefix=settings.API_PREFIX)
app.include_router(usage.router, prefix=settings.API_PREFIX)
app.include_router(settings_routes.router, prefix=settings.API_PREFIX)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    request_id = getattr(request.state, "request_id", "unknown")
    logger.exception("Unhandled request error: %s", exc, extra={"request_id": request_id})
    origin = request.headers.get("origin", "")
    headers = {"Cache-Control": "no-store"}
    if origin:
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
    detail = str(exc) if not settings.is_production else "Internal server error"
    return JSONResponse(
        {"detail": detail, "request_id": request_id},
        status_code=500,
        headers=headers,
    )
