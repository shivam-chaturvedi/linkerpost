"""Google Gemini provider adapter.

Call sites should use `agents.llm` (`llm.py`), not this module directly.
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from typing import TypeVar

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.rate_limiters import InMemoryRateLimiter
from langchain_google_genai import ChatGoogleGenerativeAI
from pydantic import BaseModel

from agents.llm.types import StructuredCompletion, TextCompletion, TokenUsage
from agents.llm.usage import extract_token_usage
from app.core.config import get_settings

T = TypeVar("T", bound=BaseModel)

PROVIDER = "gemini"
_RATE_LIMITER: InMemoryRateLimiter | None = None


def max_prompt_chars() -> int:
    return get_settings().LLM_MAX_PROMPT_CHARS


# Back-compat for importers that read the constant; prefer max_prompt_chars().
MAX_PROMPT_CHARS = 500_000


def require_gemini_key() -> str:
    key = get_settings().GEMINI_API_KEY.get_secret_value().strip()
    if not key:
        raise RuntimeError("GEMINI_API_KEY is required to run agents")
    return key


def get_rate_limiter() -> InMemoryRateLimiter:
    global _RATE_LIMITER
    if _RATE_LIMITER is None:
        rpm = max(1, get_settings().GEMINI_REQUESTS_PER_MINUTE)
        _RATE_LIMITER = InMemoryRateLimiter(
            requests_per_second=rpm / 60.0,
            check_every_n_seconds=0.25,
            max_bucket_size=1,
        )
    return _RATE_LIMITER


def get_chat_model(
    *,
    temperature: float = 0.3,
    max_output_tokens: int | None = None,
    timeout: float = 60,
    max_retries: int | None = None,
    use_rate_limiter: bool = True,
    thinking_budget: int | None = None,
    disable_streaming: bool = False,
) -> ChatGoogleGenerativeAI:
    settings = get_settings()
    tokens = max_output_tokens or settings.GEMINI_MAX_OUTPUT_TOKENS
    retries = settings.GEMINI_MAX_RETRIES if max_retries is None else max_retries
    return ChatGoogleGenerativeAI(
        model=settings.GEMINI_MODEL,
        google_api_key=require_gemini_key(),
        temperature=temperature,
        max_output_tokens=tokens,
        max_retries=retries,
        timeout=timeout,
        rate_limiter=get_rate_limiter() if use_rate_limiter else None,
        thinking_budget=thinking_budget,
        disable_streaming=disable_streaming,
    )


def _active_model_name() -> str:
    return get_settings().GEMINI_MODEL


def _message_text(content: object) -> str:
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, list):
        parts: list[str] = []
        for block in content:
            if isinstance(block, str):
                parts.append(block)
            elif isinstance(block, dict) and block.get("text"):
                parts.append(str(block["text"]))
        return "".join(parts).strip()
    return str(content).strip()


async def complete_structured(
    schema: type[T],
    *,
    system: str,
    user: str,
    temperature: float = 0.3,
    max_output_tokens: int | None = None,
) -> StructuredCompletion[T]:
    model = get_chat_model(
        temperature=temperature,
        max_output_tokens=max_output_tokens,
    ).with_structured_output(schema, include_raw=True)
    result = await model.ainvoke(
        [
            SystemMessage(content=system),
            HumanMessage(content=user[:max_prompt_chars()]),
        ],
    )

    usage = TokenUsage()
    parsed: object
    if isinstance(result, dict):
        raw = result.get("raw")
        parsed = result.get("parsed")
        if raw is not None:
            usage = extract_token_usage(raw)
        if result.get("parsing_error"):
            raise RuntimeError(f"Structured output parse failed: {result['parsing_error']}")
    else:
        parsed = result

    if not isinstance(parsed, schema):
        parsed = schema.model_validate(parsed)

    return StructuredCompletion(
        value=parsed,
        usage=usage,
        model=_active_model_name(),
        provider=PROVIDER,
    )


async def complete_text(
    *,
    system: str,
    user: str,
    temperature: float = 0.3,
    max_output_tokens: int | None = None,
    request_timeout: float = 60,
    max_retries: int = 0,
    use_rate_limiter: bool = False,
    thinking_budget: int | None = 0,
) -> TextCompletion:
    model = get_chat_model(
        temperature=temperature,
        max_output_tokens=max_output_tokens,
        timeout=request_timeout,
        max_retries=max_retries,
        use_rate_limiter=use_rate_limiter,
        thinking_budget=thinking_budget,
        disable_streaming=True,
    )
    result = await model.ainvoke(
        [
            SystemMessage(content=system),
            HumanMessage(content=user[:max_prompt_chars()]),
        ],
    )
    text = _message_text(getattr(result, "content", result))
    if not text:
        raise RuntimeError("The model returned empty text")
    return TextCompletion(
        text=text,
        usage=extract_token_usage(result),
        model=_active_model_name(),
        provider=PROVIDER,
    )


def accumulate_stream_text(current: str, piece: str) -> str:
    if not piece:
        return current
    if current and piece.startswith(current):
        return piece
    return f"{current}{piece}"


async def stream_text(
    *,
    system: str,
    user: str,
    temperature: float = 0.3,
    max_output_tokens: int | None = None,
    request_timeout: float = 120,
    max_retries: int = 0,
    use_rate_limiter: bool = False,
    thinking_budget: int | None = 0,
) -> AsyncIterator[tuple[str, TokenUsage | None]]:
    """Yield (text_piece, usage_or_none). Usage is only set on the final chunk when available."""
    model = get_chat_model(
        temperature=temperature,
        max_output_tokens=max_output_tokens,
        timeout=request_timeout,
        max_retries=max_retries,
        use_rate_limiter=use_rate_limiter,
        thinking_budget=thinking_budget,
    )
    messages = [
        SystemMessage(content=system),
        HumanMessage(content=user[:max_prompt_chars()]),
    ]
    last_chunk: object | None = None
    async for chunk in model.astream(messages):
        last_chunk = chunk
        piece = _message_text(getattr(chunk, "content", chunk))
        if piece:
            yield piece, None
    if last_chunk is not None:
        usage = extract_token_usage(last_chunk)
        if usage.total_tokens or usage.input_tokens or usage.output_tokens:
            yield "", usage
