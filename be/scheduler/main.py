"""Standalone FastAPI scheduler for due LinkedIn posts.

Uses the same `be/.env` / Settings as the main API.

Local (background poll loop):
    .venv/bin/uvicorn scheduler.main:app --host 0.0.0.0 --port 8001

Vercel (no long-running loop — Cron hits ``/api/cron/publish-due``):
    Set LINKERPOST_SERVICE=scheduler and deploy with vercel.scheduler.json
"""

from __future__ import annotations

import asyncio
import logging
import os
import secrets
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from datetime import UTC, datetime

from fastapi import FastAPI, Header, HTTPException, Request, status
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.db.session import close_database
from app.middleware.request_id import RequestIdMiddleware
from scheduler.worker import process_due_scheduled_posts

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [scheduler] %(name)s: %(message)s",
)
logger = logging.getLogger("scheduler")
settings = get_settings()

_poll_task: asyncio.Task[None] | None = None
_last_run_at: datetime | None = None
_last_result: dict[str, int] | None = None
_last_error: str | None = None


def _running_on_vercel() -> bool:
    return bool(os.getenv("VERCEL") or os.getenv("VERCEL_ENV"))


def _background_poll_enabled() -> bool:
    """Background while-True loop only for long-running hosts (not Vercel)."""
    if _running_on_vercel():
        return False
    flag = (os.getenv("SCHEDULER_DISABLE_BACKGROUND_POLL") or "").strip().lower()
    return flag not in {"1", "true", "yes", "on"}


def _verify_cron_auth(request: Request, authorization: str | None) -> None:
    """Vercel Cron sends Authorization: Bearer <CRON_SECRET> when CRON_SECRET is set."""
    expected = (os.getenv("CRON_SECRET") or settings.CRON_SECRET or "").strip()
    if not expected:
        # Local / unprotected — allow. Production should set CRON_SECRET.
        if settings.is_production or _running_on_vercel():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="CRON_SECRET is not configured",
            )
        return

    token = None
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization[7:].strip()
    if not token:
        token = (request.headers.get("x-cron-secret") or "").strip()
    if not token or not secrets.compare_digest(token, expected):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")


async def _poll_loop() -> None:
    global _last_run_at, _last_result, _last_error
    interval = settings.SCHEDULER_POLL_INTERVAL_SECONDS
    logger.info(
        "Scheduler poll loop started interval=%ss batch=%s",
        interval,
        settings.SCHEDULER_BATCH_SIZE,
    )
    while True:
        try:
            result = await process_due_scheduled_posts()
            _last_run_at = datetime.now(UTC)
            _last_result = result
            _last_error = None
            if result["published"] or result["failed"]:
                logger.info("Poll complete %s", result)
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            _last_error = str(exc)[:500]
            logger.exception("Scheduler poll failed")
        await asyncio.sleep(interval)


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    global _poll_task
    if _background_poll_enabled():
        _poll_task = asyncio.create_task(_poll_loop(), name="scheduler-poll-loop")
    else:
        logger.info(
            "Background poll disabled (Vercel/cron mode). Use /api/cron/publish-due or /run-once."
        )
    try:
        yield
    finally:
        if _poll_task is not None:
            _poll_task.cancel()
            try:
                await _poll_task
            except asyncio.CancelledError:
                pass
            _poll_task = None
        await close_database()


app = FastAPI(
    title="Linker Post Scheduler",
    version="0.1.0",
    docs_url=None if settings.is_production else "/docs",
    redoc_url=None if settings.is_production else "/redoc",
    openapi_url=None if settings.is_production else "/openapi.json",
    lifespan=lifespan,
)
app.add_middleware(RequestIdMiddleware)


@app.get("/health/live")
async def live() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/health/ready")
async def ready() -> JSONResponse:
    payload = {
        "status": "ok" if _last_error is None else "degraded",
        "mode": "cron" if not _background_poll_enabled() else "poll",
        "poll_interval_seconds": settings.SCHEDULER_POLL_INTERVAL_SECONDS,
        "last_run_at": _last_run_at.isoformat() if _last_run_at else None,
        "last_result": _last_result,
        "last_error": _last_error,
    }
    return JSONResponse(payload, status_code=200)


async def _execute_due_publish() -> dict[str, object]:
    global _last_run_at, _last_result, _last_error
    result = await process_due_scheduled_posts()
    _last_run_at = datetime.now(UTC)
    _last_result = result
    _last_error = None
    return {"ok": True, "result": result, "ran_at": _last_run_at.isoformat()}


@app.api_route("/api/cron/publish-due", methods=["GET", "POST"])
async def cron_publish_due(
    request: Request,
    authorization: str | None = Header(default=None),
) -> JSONResponse:
    """Vercel Cron entrypoint (every minute via vercel.scheduler.json)."""
    global _last_error
    _verify_cron_auth(request, authorization)
    try:
        return JSONResponse(await _execute_due_publish())
    except HTTPException:
        raise
    except Exception as exc:
        _last_error = str(exc)[:500]
        logger.exception("Cron publish-due failed")
        return JSONResponse({"ok": False, "error": _last_error}, status_code=500)


@app.post("/run-once")
async def run_once(
    request: Request,
    authorization: str | None = Header(default=None),
) -> JSONResponse:
    """Manual trigger for ops/testing — publishes all currently due posts."""
    global _last_error
    _verify_cron_auth(request, authorization)
    try:
        return JSONResponse(await _execute_due_publish())
    except HTTPException:
        raise
    except Exception as exc:
        _last_error = str(exc)[:500]
        logger.exception("Manual scheduler run failed")
        return JSONResponse({"ok": False, "error": _last_error}, status_code=500)
