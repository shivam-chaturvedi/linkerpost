"""Vercel Python function entrypoint (must live under ``api/``).

Re-exports the FastAPI app selected by ``LINKERPOST_SERVICE`` in ``main.py``.
"""

from main import app

__all__ = ["app"]
