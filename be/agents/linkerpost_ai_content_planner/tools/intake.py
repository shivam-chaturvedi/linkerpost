from __future__ import annotations

from typing import Any


def merge_follow_up_answers(user_input: str, answers: list[dict[str, Any]] | None) -> str:
    base = user_input.strip()
    if not answers:
        return base
    lines: list[str] = []
    for item in answers:
        question = str(item.get("question") or item.get("field_key") or "").strip()
        answer = str(item.get("answer") or "").strip()
        if not answer:
            continue
        lines.append(f"{question}: {answer}" if question else answer)
    if not lines:
        return base
    return f"{base}\n\nFollow-up answers:\n" + "\n".join(f"- {line}" for line in lines)
