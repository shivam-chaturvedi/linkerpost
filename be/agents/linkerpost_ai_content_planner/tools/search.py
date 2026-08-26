"""Shared tools re-exported for older import paths. Prefer `agents.tools`."""

from agents.tools.search import (
    BLOCKED_HOST_FRAGMENTS,
    SearchHit,
    dedupe_hits,
    is_usable_url,
    normalize_url,
    search_web,
)

__all__ = [
    "BLOCKED_HOST_FRAGMENTS",
    "SearchHit",
    "dedupe_hits",
    "is_usable_url",
    "normalize_url",
    "search_web",
]
