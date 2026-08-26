from __future__ import annotations

import logging
from datetime import UTC, date, datetime
from decimal import Decimal
from uuid import UUID, uuid4

from agents.llm.context import get_llm_call_context
from agents.llm.types import TokenUsage, UsageStatus
from app.core.config import get_settings
from app.db.session import AsyncSessionFactory
from app.models.llm_usage import LlmUsageEvent

logger = logging.getLogger(__name__)


def estimate_cost_usd(
    usage: TokenUsage,
    *,
    input_per_1m: float | None = None,
    output_per_1m: float | None = None,
    cached_per_1m: float | None = None,
) -> Decimal:
    """Estimate USD cost from provider token counts and configured rates."""
    settings = get_settings()
    in_rate = input_per_1m if input_per_1m is not None else settings.LLM_INPUT_COST_PER_1M
    out_rate = output_per_1m if output_per_1m is not None else settings.LLM_OUTPUT_COST_PER_1M
    cache_rate = (
        cached_per_1m if cached_per_1m is not None else settings.LLM_CACHED_INPUT_COST_PER_1M
    )
    cached = max(0, min(usage.cached_tokens, usage.input_tokens))
    billable_input = max(0, usage.input_tokens - cached)
    dollars = (
        (billable_input / 1_000_000.0) * in_rate
        + (cached / 1_000_000.0) * cache_rate
        + (max(0, usage.output_tokens) / 1_000_000.0) * out_rate
    )
    return Decimal(str(round(dollars, 8)))


def extract_token_usage(message: object) -> TokenUsage:
    """Parse provider usage metadata from a model response message."""
    meta = getattr(message, "usage_metadata", None)
    if isinstance(meta, dict) and meta:
        input_tokens = int(meta.get("input_tokens") or 0)
        output_tokens = int(meta.get("output_tokens") or 0)
        total_tokens = int(meta.get("total_tokens") or 0)
        details = meta.get("input_token_details") or {}
        cached = 0
        if isinstance(details, dict):
            cached = int(
                details.get("cache_read")
                or details.get("cache_read_tokens")
                or details.get("cached_tokens")
                or 0
            )
        if total_tokens <= 0:
            total_tokens = input_tokens + output_tokens
        return TokenUsage(
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            total_tokens=total_tokens,
            cached_tokens=cached,
        )

    response_meta = getattr(message, "response_metadata", None)
    if isinstance(response_meta, dict):
        gemini = response_meta.get("usage_metadata") or response_meta.get("token_usage") or {}
        if isinstance(gemini, dict) and gemini:
            input_tokens = int(
                gemini.get("prompt_token_count")
                or gemini.get("prompt_tokens")
                or gemini.get("input_tokens")
                or 0
            )
            output_tokens = int(
                gemini.get("candidates_token_count")
                or gemini.get("completion_tokens")
                or gemini.get("output_tokens")
                or 0
            )
            total_tokens = int(gemini.get("total_token_count") or gemini.get("total_tokens") or 0)
            cached = int(
                gemini.get("cached_content_token_count")
                or gemini.get("cached_tokens")
                or 0
            )
            if total_tokens <= 0:
                total_tokens = input_tokens + output_tokens
            return TokenUsage(
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                total_tokens=total_tokens,
                cached_tokens=cached,
            )

    return TokenUsage()


def provider_reported_usage(usage: TokenUsage) -> bool:
    return bool(usage.input_tokens or usage.output_tokens or usage.total_tokens)


async def record_llm_usage(
    *,
    provider: str,
    model: str,
    status: UsageStatus,
    usage: TokenUsage | None = None,
    feature: str | None = None,
    user_id: UUID | None = None,
    run_id: UUID | None = None,
) -> None:
    """Persist one LLM call from provider metadata. Never raises to callers."""
    ctx = get_llm_call_context()
    resolved_user = user_id if user_id is not None else ctx.user_id
    if resolved_user is None:
        return

    tokens = usage or TokenUsage()
    if status == "ok" and not provider_reported_usage(tokens):
        logger.warning(
            "Provider returned no token usage user_id=%s feature=%s model=%s",
            resolved_user,
            feature or ctx.feature,
            model,
        )

    now = datetime.now(UTC)
    event = LlmUsageEvent(
        id=uuid4(),
        user_id=resolved_user,
        feature=(feature or ctx.feature or "unknown")[:64],
        run_id=run_id if run_id is not None else ctx.run_id,
        provider=provider[:32],
        model=model[:128],
        status=status,
        input_tokens=max(0, tokens.input_tokens),
        output_tokens=max(0, tokens.output_tokens),
        total_tokens=max(0, tokens.total_tokens),
        cached_tokens=max(0, tokens.cached_tokens),
        estimated_cost_usd=(
            estimate_cost_usd(tokens)
            if status == "ok" and provider_reported_usage(tokens)
            else Decimal("0")
        ),
        usage_date=date(now.year, now.month, now.day),
        created_at=now,
    )
    try:
        async with AsyncSessionFactory() as session:
            session.add(event)
            await session.commit()
    except Exception:
        logger.exception(
            "Failed to record LLM usage user_id=%s feature=%s status=%s",
            resolved_user,
            event.feature,
            status,
        )
