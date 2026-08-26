from __future__ import annotations

import math
import re

try:
    from google.api_core.exceptions import (
        DeadlineExceeded,
        ResourceExhausted,
        ServiceUnavailable,
    )
except ImportError:  # pragma: no cover
    DeadlineExceeded = ()  # type: ignore[misc, assignment]
    ResourceExhausted = ()  # type: ignore[misc, assignment]
    ServiceUnavailable = ()  # type: ignore[misc, assignment]

RETRY_IN_RE = re.compile(r"retry in\s+(\d+(?:\.\d+)?)\s*s", re.IGNORECASE)
RETRY_DELAY_RE = re.compile(
    r"retry_delay\s*\{[^}]*seconds:\s*(\d+)",
    re.IGNORECASE | re.DOTALL,
)


def retry_wait_seconds(message: str) -> int | None:
    match = RETRY_IN_RE.search(message) or RETRY_DELAY_RE.search(message)
    if not match:
        return None
    return max(1, math.ceil(float(match.group(1))))


def is_rate_limit_error(exc: BaseException) -> bool:
    message = str(exc).lower()
    name = type(exc).__name__.lower()
    return (
        isinstance(exc, ResourceExhausted)
        or "resourceexhausted" in name
        or "429" in message
        or "quota" in message
        or "rate-limit" in message
        or "rate limit" in message
        or "resource_exhausted" in message
    )


def is_timeout_error(exc: BaseException) -> bool:
    message = str(exc).lower()
    name = type(exc).__name__.lower()
    return (
        isinstance(exc, TimeoutError)
        or isinstance(exc, DeadlineExceeded)
        or "deadlineexceeded" in name
        or "timed out" in message
        or "timeout" in name
        or "timeout" in message
    )


def is_unavailable_error(exc: BaseException) -> bool:
    message = str(exc).lower()
    name = type(exc).__name__.lower()
    return (
        isinstance(exc, ServiceUnavailable)
        or "serviceunavailable" in name
        or message.startswith("503")
        or " 503 " in f" {message}"
        or "high demand" in message
        or "statuscode.unavailable" in message
    )


def humanize_rewrite_error(exc: BaseException) -> str:
    message = str(exc)
    if is_rate_limit_error(exc):
        wait = retry_wait_seconds(message)
        if wait:
            unit = "second" if wait == 1 else "seconds"
            return (
                "Our model is busy right now. "
                f"Please wait about {wait} {unit}, then try again."
            )
        lowered = message.lower()
        if "perday" in lowered.replace("_", "") or "free_tier" in lowered:
            return (
                "Our model has reached its daily request limit. "
                "Please try again later today."
            )
        return "Our model is busy right now. Please wait a minute, then try again."
    if is_unavailable_error(exc):
        return "Our model is busy right now. Please try again in a moment."
    if is_timeout_error(exc):
        return "AI rewrite timed out. Please try again in a moment."
    return "Failed to rewrite the post. Please try again."
