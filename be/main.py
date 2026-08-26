"""Vercel / multi-service entrypoint for the `be/` project.

Set ``LINKERPOST_SERVICE`` in `.env` or the Vercel project env:
  - ``api`` (default) → main FastAPI app (``app.main:app``)
  - ``scheduler`` → due-post scheduler (``scheduler.main:app``)

Local uvicorn can keep using ``app.main:app`` / ``scheduler.main:app`` directly.
"""

from __future__ import annotations

import os

# Prefer process env (Vercel); fall back to Settings so local `.env` is honored.
_service = (os.getenv("LINKERPOST_SERVICE") or "").strip().lower()
if not _service:
    from app.core.config import get_settings

    _service = (get_settings().LINKERPOST_SERVICE or "api").strip().lower()

if _service in {"scheduler", "sched", "worker"}:
    from scheduler.main import app as app
else:
    from app.main import app as app

__all__ = ["app"]
