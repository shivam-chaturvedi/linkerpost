from __future__ import annotations

from uuid import UUID

from agents.llm import complete_text, get_active_max_output_tokens, llm_usage_scope
from agents.rewrite_with_ai.formatting import (
    LINKEDIN_MAX_CHARS,
    FormattedPost,
    markdown_to_quill,
)
from agents.rewrite_with_ai.prompts import (
    REWRITE_POST_CREATIVE_SYSTEM,
    REWRITE_POST_SYSTEM,
)

__all__ = ["rewrite_linkedin_post"]

REQUEST_TIMEOUT_SECONDS = 14
CONSERVATIVE_TEMPERATURE = 0.3
CREATIVE_TEMPERATURE = 0.65
FEATURE = "rewrite_ai"


def _build_user_prompt(
    *,
    commentary: str,
    article_source: str | None,
    creative: bool = False,
) -> str:
    draft = commentary.strip()[:LINKEDIN_MAX_CHARS]
    if creative:
        parts = [
            "Fully rewrite this draft. Keep meaning and depth. Do not only copy-edit it.",
            f"DRAFT:\n{draft}" if draft else "DRAFT:",
        ]
    else:
        parts = [
            "Rewrite only this current draft. Do not reuse or recall any previous draft.",
            f"DRAFT:\n{draft}" if draft else "DRAFT:",
        ]
    if article_source:
        parts.append(f"URL: {article_source.strip()[:2048]}")
    return "\n\n".join(parts)


async def rewrite_linkedin_post(
    *,
    commentary: str,
    article_source: str | None = None,
    creative: bool = False,
    user_id: UUID | str | None = None,
) -> FormattedPost:
    with llm_usage_scope(user_id=user_id, feature=FEATURE):
        raw = await complete_text(
            system=REWRITE_POST_CREATIVE_SYSTEM if creative else REWRITE_POST_SYSTEM,
            user=_build_user_prompt(
                commentary=commentary,
                article_source=article_source,
                creative=creative,
            ),
            temperature=CREATIVE_TEMPERATURE if creative else CONSERVATIVE_TEMPERATURE,
            max_output_tokens=get_active_max_output_tokens(),
            request_timeout=REQUEST_TIMEOUT_SECONDS,
            max_retries=0,
            use_rate_limiter=False,
            thinking_budget=0,
        )
    formatted = markdown_to_quill(raw)
    if not formatted.commentary:
        raise RuntimeError("The rewrite model returned empty text")
    return formatted
