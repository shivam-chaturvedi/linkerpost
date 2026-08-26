"""Authoritative clock context for the content planner (UTC + ISO)."""

from __future__ import annotations

import re
from datetime import UTC, datetime
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

_DURATION_RE = re.compile(
    r"(?i)(?:\bfor\b|\bnext\b|\bover\b|\bacross\b|\bcover(?:ing)?\b|\bcreate\b|\bmake\b|\bplan\b)?"
    r".{0,24}?\b(\d{1,2})\s*(?:-|\s)?\s*days?\b"
    r"|"
    r"\bduration(?:_days)?\s*[:=]\s*(\d{1,2})\b"
    r"|"
    r"\b(\d{1,2})\s*-?\s*day\s+(?:calendar|plan|content|campaign|series)\b"
)
_POSTS_PER_DAY_RE = re.compile(
    r"(?i)\b(\d{1,2})\s*posts?\s*(?:per|/)\s*day\b|\bposts_per_day\s*[:=]\s*(\d{1,2})\b"
)


def utc_now() -> datetime:
    return datetime.now(UTC)


def ensure_aware_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def parse_iso_datetime(value: str | None) -> datetime | None:
    if not value or not str(value).strip():
        return None
    text = str(value).strip().replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(text)
    except ValueError:
        return None
    return ensure_aware_utc(parsed)


def resolve_timezone(name: str | None) -> ZoneInfo:
    try:
        return ZoneInfo((name or "UTC").strip() or "UTC")
    except ZoneInfoNotFoundError:
        return ZoneInfo("UTC")


def extract_duration_days(text: str) -> int | None:
    """Best-effort parse of an explicit day count from the user brief."""
    if not text:
        return None
    match = _DURATION_RE.search(text)
    if not match:
        return None
    raw = next((group for group in match.groups() if group), None)
    if raw is None:
        return None
    days = int(raw)
    if 1 <= days <= 30:
        return days
    return None


def extract_posts_per_day(text: str) -> int | None:
    """Best-effort parse of posts-per-day from the user brief."""
    if not text:
        return None
    match = _POSTS_PER_DAY_RE.search(text)
    if not match:
        return None
    raw = next((group for group in match.groups() if group), None)
    if raw is None:
        return None
    count = int(raw)
    if 1 <= count <= 3:
        return count
    return None


def clock_context_block(
    *,
    now_utc_iso: str,
    timezone_name: str = "Asia/Kolkata",
) -> str:
    now_utc = parse_iso_datetime(now_utc_iso) or utc_now()
    tz = resolve_timezone(timezone_name)
    now_local = now_utc.astimezone(tz)
    return (
        "CURRENT DATE/TIME (authoritative — always use these values):\n"
        f"- now_utc_iso: {now_utc.isoformat().replace('+00:00', 'Z')}\n"
        f"- now_local_iso ({tz.key}): {now_local.isoformat()}\n"
        f"- timezone_default: {tz.key}\n"
        "Rules:\n"
        "- Treat the values above as wall-clock now. Do not invent another year/month.\n"
        "- schedule.start_date must be today or a FUTURE calendar date in the plan timezone.\n"
        "- Never schedule content in the past (previous days/months/years).\n"
        "- If the user already stated duration_days (e.g. '2 days'), do NOT ask again "
        "and do NOT invent a different duration.\n"
        "- Prefer ISO-8601 datetimes; internal scheduling is computed in code from this clock."
    )
