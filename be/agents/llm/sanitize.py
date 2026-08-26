"""Strip provider reasoning / chain-of-thought from model text.

Used by Nemotron (and any future reasoning models) so product surfaces only
receive the final answer — rewrite, agents, and structured post bodies.
"""

from __future__ import annotations

import re
from typing import Any

_THINK_TAG_RE = re.compile(
    r"<think>.*?</think>|<thinking>.*?</thinking>",
    re.IGNORECASE | re.DOTALL,
)
_THINKING_LEAD_RE = re.compile(
    r"^(?:here'?s a thinking process|thinking process|chain of thought|"
    r"let me think|analyze the request|analysis:)\b.*?(?=\n\n|\Z)",
    re.IGNORECASE | re.DOTALL,
)
_PLANNING_PARAGRAPH_RE = re.compile(
    r"^(analyze|identify|drafting|constraints|key elements|original text|"
    r"transformation|step-by-step|here'?s a thinking|thinking process|"
    r"chain of thought|let me think)\b",
    re.IGNORECASE,
)
_FINAL_ANSWER_MARKERS = (
    "final rewritten post:",
    "final post:",
    "rewritten post:",
    "here is the rewritten post:",
    "here's the rewritten post:",
    "here is the finished post:",
    "here's the finished post:",
    "here is the post:",
    "here's the post:",
    "output:",
)


def strip_model_thinking(text: str) -> str:
    """Remove thinking traces; return only the user-facing answer text."""
    if not text:
        return ""
    cleaned = text.strip()
    cleaned = _THINK_TAG_RE.sub("", cleaned).strip()
    cleaned = _extract_final_answer(cleaned)
    cleaned = _THINKING_LEAD_RE.sub("", cleaned).strip()
    if _looks_like_planning_dump(cleaned):
        cleaned = _drop_planning_paragraphs(cleaned)
    return cleaned.strip()


def clean_user_facing_text_fields(payload: dict[str, Any], *keys: str) -> dict[str, Any]:
    """Return a shallow copy with selected string fields cleaned of thinking."""
    out = dict(payload)
    for key in keys:
        value = out.get(key)
        if isinstance(value, str) and value.strip():
            out[key] = strip_model_thinking(value)
    return out


def _extract_final_answer(text: str) -> str:
    lowered = text.lower()
    for marker in _FINAL_ANSWER_MARKERS:
        idx = lowered.rfind(marker)
        if idx >= 0:
            return text[idx + len(marker) :].strip()
    return text


def _looks_like_planning_dump(text: str) -> bool:
    lowered = text.lower()
    return bool(
        re.search(
            r"\b(analyze the request|thinking process|drafting - step-by-step|"
            r"chain of thought|identify transformation)\b",
            lowered,
        )
    )


def _drop_planning_paragraphs(text: str) -> str:
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    usable = [p for p in paragraphs if not _PLANNING_PARAGRAPH_RE.match(p)]
    if usable:
        return "\n\n".join(usable[-4:]).strip()
    return text
