from __future__ import annotations

import random
from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from agents.linkerpost_ai_content_planner.schemas import ContentPlan, ScheduleConfig
from agents.linkerpost_ai_content_planner.tools.clock import ensure_aware_utc
from app.core.config import get_settings

# Local posting window (plan timezone). Avoids every post landing at 10:00.
_POSTING_HOUR_START = 8
_POSTING_HOUR_END = 20  # exclusive upper bound for hour choice → last hour 19
_MINUTE_CHOICES = (0, 10, 15, 20, 30, 40, 45, 50)


def _timezone(name: str) -> ZoneInfo:
    try:
        return ZoneInfo(name)
    except ZoneInfoNotFoundError:
        return ZoneInfo("UTC")


def _parse_start_date(value: str, *, tz: ZoneInfo) -> datetime.date | None:
    text = value.strip()
    if not text:
        return None
    try:
        if len(text) == 10 and text[4] == "-" and text[7] == "-":
            return datetime.fromisoformat(text).date()
        parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=tz)
        return parsed.astimezone(tz).date()
    except ValueError:
        return None


def _random_local_time(
    *,
    day: datetime.date,
    tz: ZoneInfo,
    rng: random.Random,
    used_hm: set[tuple[int, int]],
) -> datetime:
    """Pick a varied HH:MM in business hours; avoid repeating the same clock time."""
    for _ in range(48):
        hour = rng.randint(_POSTING_HOUR_START, _POSTING_HOUR_END - 1)
        minute = rng.choice(_MINUTE_CHOICES)
        if (hour, minute) in used_hm and len(used_hm) < len(_MINUTE_CHOICES) * (
            _POSTING_HOUR_END - _POSTING_HOUR_START
        ):
            continue
        used_hm.add((hour, minute))
        return datetime(day.year, day.month, day.day, hour, minute, tzinfo=tz)
    return datetime(day.year, day.month, day.day, 12, 0, tzinfo=tz)


def build_schedule(
    plan: ContentPlan,
    *,
    now: datetime | None = None,
    rng: random.Random | None = None,
) -> list[dict[str, str | int]]:
    """Build future-only schedule slots with varied local times (ISO + UTC).

    Past ``start_date`` values from the LLM are ignored. Each post gets a different
    random time in the plan timezone (not a fixed 10:00 for every post).
    """
    config: ScheduleConfig = plan.schedule
    tz = _timezone(config.timezone)
    current = ensure_aware_utc(now).astimezone(tz) if now else datetime.now(tz)
    generator = rng or random.Random(
        f"{plan.topic}|{plan.duration_days}|{current.date().isoformat()}|{config.timezone}"
    )

    start_day = None
    if config.start_date:
        candidate = _parse_start_date(config.start_date, tz=tz)
        if candidate is not None and candidate >= current.date():
            start_day = candidate
    if start_day is None:
        start_day = (current + timedelta(days=1)).date()

    # Honor initial_delay_days on the first calendar day, then space by interval_days.
    cursor_day = start_day + timedelta(days=config.initial_delay_days)
    max_posts = get_settings().CONTENT_PLANNER_MAX_POSTS
    total = min(plan.total_posts, max_posts)
    slots: list[dict[str, str | int]] = []
    used_hm: set[tuple[int, int]] = set()

    for index in range(total):
        day = cursor_day + timedelta(days=config.interval_days * index)
        when = _random_local_time(day=day, tz=tz, rng=generator, used_hm=used_hm)
        while when <= current:
            day = day + timedelta(days=1)
            when = _random_local_time(day=day, tz=tz, rng=generator, used_hm=used_hm)
        when_utc = when.astimezone(UTC)
        slots.append(
            {
                "day": index + 1,
                "scheduled_at": when.isoformat(),
                "scheduled_at_utc": when_utc.isoformat().replace("+00:00", "Z"),
            }
        )
    return slots


def sanitize_plan_for_clock(
    plan: ContentPlan,
    *,
    now: datetime | None = None,
    known_duration_days: int | None = None,
    known_posts_per_day: int | None = None,
) -> ContentPlan:
    """Normalize plan against clock + env diversity; enforce user day counts."""
    settings = get_settings()
    current = ensure_aware_utc(now) if now else datetime.now(UTC)
    tz = _timezone(plan.schedule.timezone)
    local_now = current.astimezone(tz)

    start_date = plan.schedule.start_date
    if start_date:
        parsed = _parse_start_date(start_date, tz=tz)
        if parsed is None or parsed < local_now.date():
            start_date = None
    schedule = plan.schedule.model_copy(update={"start_date": start_date})

    duration_days = known_duration_days if known_duration_days is not None else plan.duration_days
    duration_days = max(1, min(30, int(duration_days)))

    # Default 1 post/day unless the user explicitly asked for more.
    if known_posts_per_day is not None:
        posts_per_day = max(1, min(3, int(known_posts_per_day)))
    elif known_duration_days is not None:
        posts_per_day = 1
    else:
        posts_per_day = max(1, min(3, int(plan.posts_per_day or 1)))

    diversity = settings.CONTENT_PLANNER_POST_DIVERSITY_SCORE
    # Map diversity (0=similar … 10=different) onto legacy relationship score
    # (0=independent … 10=connected series) for strategy prompts.
    relationship = 10 - diversity
    variation = plan.variation.model_copy(update={"content_relationship_score": relationship})

    return plan.model_copy(
        update={
            "schedule": schedule,
            "duration_days": duration_days,
            "posts_per_day": posts_per_day,
            "variation": variation,
        }
    )
