"""NVIDIA NIM provider for Nemotron models (OpenAI-compatible chat API).

Call sites should use `agents.llm` (`llm.py`), not this module directly.
Model: nvidia/nemotron-3.5-lightning-30b-a3b
Docs: https://docs.api.nvidia.com/nim/reference/nvidia-nemotron-3-5-lightning-30b-a3b

Nemotron 3.5 Lightning enables reasoning by default. We disable it unless
explicitly requested so product surfaces only get the final answer.
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from typing import Any, TypeVar

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.rate_limiters import InMemoryRateLimiter
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, SecretStr

from agents.llm.sanitize import strip_model_thinking
from agents.llm.types import StructuredCompletion, TextCompletion, TokenUsage
from agents.llm.usage import extract_token_usage
from app.core.config import get_settings

T = TypeVar("T", bound=BaseModel)

PROVIDER = "nemotron"
DEFAULT_MODEL = "nvidia/nemotron-3.5-lightning-30b-a3b"
_RATE_LIMITER: InMemoryRateLimiter | None = None
_THINKING_BLOCK_TYPES = {"thinking", "reasoning", "thought"}


def max_prompt_chars() -> int:
    return get_settings().LLM_MAX_PROMPT_CHARS


# Back-compat for importers that read the constant; prefer max_prompt_chars().
MAX_PROMPT_CHARS = 500_000


def require_nvidia_key() -> str:
    key = get_settings().NVIDIA_API_KEY.get_secret_value().strip()
    if not key:
        raise RuntimeError("NVIDIA_API_KEY is required to use Nemotron / NIM models")
    return key


def get_rate_limiter() -> InMemoryRateLimiter:
    global _RATE_LIMITER
    if _RATE_LIMITER is None:
        rpm = max(1, get_settings().NEMOTRON_REQUESTS_PER_MINUTE)
        _RATE_LIMITER = InMemoryRateLimiter(
            requests_per_second=rpm / 60.0,
            check_every_n_seconds=0.25,
            max_bucket_size=1,
        )
    return _RATE_LIMITER


def _active_model_name() -> str:
    return get_settings().NEMOTRON_MODEL.strip() or DEFAULT_MODEL


def _thinking_enabled(thinking_budget: int | None) -> bool:
    """Map Gemini-style thinking_budget and env default onto Nemotron enable_thinking."""
    settings = get_settings()
    if thinking_budget is not None and thinking_budget <= 0:
        return False
    if thinking_budget is not None and thinking_budget > 0:
        return True
    return bool(settings.NEMOTRON_ENABLE_THINKING)


def get_chat_model(
    *,
    temperature: float = 0.3,
    max_output_tokens: int | None = None,
    timeout: float = 60,
    max_retries: int | None = None,
    use_rate_limiter: bool = True,
    thinking_budget: int | None = None,
    disable_streaming: bool = False,
) -> ChatOpenAI:
    settings = get_settings()
    tokens = max_output_tokens or settings.NEMOTRON_MAX_OUTPUT_TOKENS
    retries = settings.NEMOTRON_MAX_RETRIES if max_retries is None else max_retries
    enable_thinking = _thinking_enabled(thinking_budget)
    chat_template_kwargs: dict[str, Any] = {
        "enable_thinking": enable_thinking,
        "force_nonempty_content": True,
    }
    kwargs: dict[str, Any] = {
        "model": _active_model_name(),
        "api_key": SecretStr(require_nvidia_key()),
        "base_url": settings.NVIDIA_NIM_BASE_URL.rstrip("/"),
        "temperature": temperature,
        "max_tokens": tokens,
        "max_retries": retries,
        "timeout": timeout,
        "streaming": not disable_streaming,
        "model_kwargs": {
            "top_p": settings.NEMOTRON_TOP_P,
        },
        # OpenAI-compatible NIM: disable reasoning unless explicitly enabled.
        "extra_body": {"chat_template_kwargs": chat_template_kwargs},
    }
    if use_rate_limiter:
        kwargs["rate_limiter"] = get_rate_limiter()
    return ChatOpenAI(**kwargs)


def _message_text(content: object) -> str:
    if isinstance(content, str):
        return strip_model_thinking(content)
    if isinstance(content, list):
        parts: list[str] = []
        for block in content:
            if isinstance(block, str):
                parts.append(block)
                continue
            if not isinstance(block, dict):
                continue
            block_type = str(block.get("type") or "").lower()
            if block_type in _THINKING_BLOCK_TYPES:
                continue
            if block.get("text"):
                parts.append(str(block["text"]))
        return strip_model_thinking("".join(parts))
    return strip_model_thinking(str(content))


def _strip_thinking_markup(text: str) -> str:
    return strip_model_thinking(text)


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
        thinking_budget=0,
        disable_streaming=True,
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
