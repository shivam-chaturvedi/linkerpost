from __future__ import annotations

import re

from agents.linkerpost_ai_content_planner.prompts import REQUIREMENTS_GATHERER_SYSTEM
from agents.linkerpost_ai_content_planner.schemas import RequirementsIntake
from agents.linkerpost_ai_content_planner.state import ContentGenerationState
from agents.linkerpost_ai_content_planner.tools.clock import (
    clock_context_block,
    extract_duration_days,
    utc_now,
)
from agents.llm import clean_user_facing_text_fields, complete_structured
from app.core.config import get_settings

_PLACEHOLDER_PREFIX = re.compile(r"(?i)^\s*(e\.g\.|eg\.|example:|ex:)\s*")


def _normalize_suggestion(text: str) -> str:
    cleaned = _PLACEHOLDER_PREFIX.sub("", " ".join(str(text or "").split())).strip()
    return cleaned[:120]


def _default_suggestions(*, field_key: str, placeholder: str, brief: str) -> list[str]:
    suggestions: list[str] = []
    from_placeholder = _normalize_suggestion(placeholder)
    if from_placeholder:
        suggestions.append(from_placeholder)

    key = field_key.lower()
    if key in {"tone", "content_style", "voice"}:
        for item in ("professional", "casual", "educational", "bold"):
            if item not in suggestions:
                suggestions.append(item)
    elif key in {"posts_per_day", "cadence", "frequency"}:
        for item in ("1", "2"):
            if item not in suggestions:
                suggestions.append(item)
    elif key in {"audience", "who"}:
        for item in ("content creators", "founders", "marketing professionals"):
            if item not in suggestions:
                suggestions.append(item)
    elif key in {"topic", "theme", "subject"} and brief.strip():
        snippet = brief.strip()
        # Prefer the topical part after "for topic" / "about".
        match = re.search(
            r"(?i)(?:topic|about|on)\s+(.+?)(?:\s+for\s+\d|\s+in\s+\d|$)",
            snippet,
        )
        candidate = (match.group(1) if match else snippet).strip(" .,;:")
        candidate = re.sub(r"(?i)^(create|make|plan)\s+\d+\s*days?\s*(posts?\s*)?(for\s*)?", "", candidate).strip()
        if candidate and candidate.lower() not in {s.lower() for s in suggestions}:
            suggestions.insert(0, candidate[:120])

    # Deduplicate preserving order.
    unique: list[str] = []
    seen: set[str] = set()
    for item in suggestions:
        normalized = item.strip()
        marker = normalized.lower()
        if not normalized or marker in seen:
            continue
        seen.add(marker)
        unique.append(normalized)
        if len(unique) >= 4:
            break
    return unique


def _brief_already_has_topic(brief: str) -> bool:
    text = brief.strip()
    if len(text) < 20:
        return False
    lowered = text.lower()
    return any(
        token in lowered
        for token in (" about ", " topic ", " vs ", " versus ", " for topic", "posts for")
    ) or len(text.split()) >= 6


async def requirements_gatherer(state: ContentGenerationState) -> ContentGenerationState:
    settings = get_settings()
    round_number = int(state.get("follow_up_round") or 0)
    brief = str(state.get("user_input") or "").strip()
    now_utc_iso = str(state.get("now_utc_iso") or utc_now().isoformat().replace("+00:00", "Z"))
    known_duration = extract_duration_days(brief)
    topic_known = _brief_already_has_topic(brief)
    if round_number >= settings.CONTENT_PLANNER_MAX_FOLLOW_UPS:
        return {
            "status": "analyzing",
            "follow_up_questions": [],
            "follow_up_round": round_number,
            "combined_input": brief,
            "now_utc_iso": now_utc_iso,
        }

    # Skip intake entirely when the brief already has topic + duration.
    if known_duration is not None and topic_known and round_number == 0:
        return {
            "status": "analyzing",
            "follow_up_questions": [],
            "follow_up_round": round_number,
            "combined_input": brief,
            "now_utc_iso": now_utc_iso,
        }

    result = await complete_structured(
        RequirementsIntake,
        system=REQUIREMENTS_GATHERER_SYSTEM,
        user=(
            f"{clock_context_block(now_utc_iso=now_utc_iso)}\n\n"
            f"Follow-up round: {round_number + 1} of {settings.CONTENT_PLANNER_MAX_FOLLOW_UPS}\n"
            f"Parsed duration_days from brief (if any): {known_duration}\n"
            f"Topic already clear from brief: {topic_known}\n"
            f"User brief so far:\n{brief}"
        ),
        temperature=0.1,
    )
    questions = []
    for index, item in enumerate(result.questions[:4]):
        cleaned = clean_user_facing_text_fields(item.model_dump(), "question", "placeholder")
        if not str(cleaned.get("question") or "").strip():
            continue
        key = "".join(
            ch if ch.isalnum() or ch == "_" else "_" for ch in str(cleaned.get("field_key") or "").lower()
        ).strip("_")
        field_key = key or f"question_{index + 1}"
        if known_duration is not None and field_key in {"duration_days", "days", "duration"}:
            continue
        if topic_known and field_key in {"topic", "theme", "subject", "main_topic"}:
            continue

        raw_suggestions = [
            _normalize_suggestion(str(entry))
            for entry in (cleaned.get("suggestions") or [])
            if _normalize_suggestion(str(entry))
        ]
        fallback = _default_suggestions(
            field_key=field_key,
            placeholder=str(cleaned.get("placeholder") or ""),
            brief=brief,
        )
        suggestions = list(dict.fromkeys([*raw_suggestions, *fallback]))[:4]

        placeholder = str(cleaned.get("placeholder") or "").strip()
        if not placeholder and suggestions:
            placeholder = f"e.g. {suggestions[0]}"

        questions.append(
            {
                **cleaned,
                "field_key": field_key,
                "placeholder": placeholder,
                "suggestions": suggestions,
            }
        )
    if result.is_complete or not questions:
        return {
            "status": "analyzing",
            "follow_up_questions": [],
            "follow_up_round": round_number,
            "combined_input": brief,
            "now_utc_iso": now_utc_iso,
        }
    return {
        "status": "awaiting_input",
        "follow_up_questions": questions,
        "follow_up_round": round_number + 1,
        "combined_input": brief,
        "now_utc_iso": now_utc_iso,
    }
