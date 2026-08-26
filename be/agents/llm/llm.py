"""Primary LLM facade for agents and rewrite-with-AI.

Providers live as sibling modules (`gemini.py`, `nemotron.py`, …).
Call sites import from `agents.llm` — never wire a provider directly.
"""

from __future__ import annotations

import asyncio
import logging
from collections.abc import AsyncIterator
from typing import TypeVar

from pydantic import BaseModel

from agents.llm import gemini as gemini_provider
from agents.llm import nemotron as nemotron_provider
from agents.llm.types import TokenUsage
from agents.llm.usage import record_llm_usage
from app.core.config import get_settings

T = TypeVar("T", bound=BaseModel)

logger = logging.getLogger(__name__)

DEFAULT_PROVIDER = "gemini"
MAX_PROMPT_CHARS = 500_000

_GEMINI_ALIASES = {"gemini", "google", "google-genai"}
_NEMOTRON_ALIASES = {"nemotron", "nvidia", "nim", "nvidia-nim"}


def get_active_provider() -> str:
    name = (get_settings().LLM_PROVIDER or DEFAULT_PROVIDER).strip().lower()
    return name or DEFAULT_PROVIDER


def _is_gemini(provider: str) -> bool:
    return provider in _GEMINI_ALIASES


def _is_nemotron(provider: str) -> bool:
    return provider in _NEMOTRON_ALIASES


def get_active_model_name(provider: str | None = None) -> str:
    name = (provider or get_active_provider()).strip().lower()
    settings = get_settings()
    if _is_gemini(name):
        return settings.GEMINI_MODEL
    if _is_nemotron(name):
        return settings.NEMOTRON_MODEL or nemotron_provider.DEFAULT_MODEL
    return settings.GEMINI_MODEL


def get_active_max_output_tokens() -> int:
    provider = get_active_provider()
    settings = get_settings()
    if _is_nemotron(provider):
        return settings.NEMOTRON_MAX_OUTPUT_TOKENS
    return settings.GEMINI_MAX_OUTPUT_TOKENS


def require_llm_key() -> str:
    provider = get_active_provider()
    if _is_gemini(provider):
        return gemini_provider.require_gemini_key()
    if _is_nemotron(provider):
        return nemotron_provider.require_nvidia_key()
    raise RuntimeError(f"LLM provider {provider!r} is not configured")


# Back-compat alias used by older routes/tests.
require_gemini_key = require_llm_key


def get_llm(provider: str | None = None, **kwargs):
    name = (provider or get_active_provider()).strip().lower()
    if _is_gemini(name):
        return gemini_provider.get_chat_model(**kwargs)
    if _is_nemotron(name):
        return nemotron_provider.get_chat_model(**kwargs)
    raise KeyError(
        f"No LLM provider registered for {provider!r}. "
        "Supported: 'gemini', 'nemotron'."
    )


get_chat_model = get_llm


def get_rate_limiter():
    provider = get_active_provider()
    if _is_nemotron(provider):
        return nemotron_provider.get_rate_limiter()
    return gemini_provider.get_rate_limiter()


accumulate_stream_text = gemini_provider.accumulate_stream_text


async def complete_structured(
    schema: type[T],
    *,
    system: str,
    user: str,
    temperature: float = 0.3,
    max_output_tokens: int | None = None,
) -> T:
    provider = get_active_provider()
    model_name = get_active_model_name(provider)
    try:
        if _is_gemini(provider):
            result = await gemini_provider.complete_structured(
                schema,
                system=system,
                user=user,
                temperature=temperature,
                max_output_tokens=max_output_tokens,
            )
        elif _is_nemotron(provider):
            result = await nemotron_provider.complete_structured(
                schema,
                system=system,
                user=user,
                temperature=temperature,
                max_output_tokens=max_output_tokens,
            )
        else:
            raise KeyError(f"No LLM provider registered for {provider!r}")
    except asyncio.CancelledError:
        await record_llm_usage(
            provider=provider,
            model=model_name,
            status="cancelled",
            usage=TokenUsage(),
        )
        raise
    except Exception:
        await record_llm_usage(
            provider=provider,
            model=model_name,
            status="failed",
            usage=TokenUsage(),
        )
        raise

    await record_llm_usage(
        provider=result.provider,
        model=result.model,
        status="ok",
        usage=result.usage,
    )
    return result.value


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
) -> str:
    provider = get_active_provider()
    model_name = get_active_model_name(provider)
    try:
        if _is_gemini(provider):
            result = await gemini_provider.complete_text(
                system=system,
                user=user,
                temperature=temperature,
                max_output_tokens=max_output_tokens,
                request_timeout=request_timeout,
                max_retries=max_retries,
                use_rate_limiter=use_rate_limiter,
                thinking_budget=thinking_budget,
            )
        elif _is_nemotron(provider):
            result = await nemotron_provider.complete_text(
                system=system,
                user=user,
                temperature=temperature,
                max_output_tokens=max_output_tokens,
                request_timeout=request_timeout,
                max_retries=max_retries,
                use_rate_limiter=use_rate_limiter,
                thinking_budget=thinking_budget,
            )
        else:
            raise KeyError(f"No LLM provider registered for {provider!r}")
    except asyncio.CancelledError:
        await record_llm_usage(
            provider=provider,
            model=model_name,
            status="cancelled",
            usage=TokenUsage(),
        )
        raise
    except Exception:
        await record_llm_usage(
            provider=provider,
            model=model_name,
            status="failed",
            usage=TokenUsage(),
        )
        raise

    await record_llm_usage(
        provider=result.provider,
        model=result.model,
        status="ok",
        usage=result.usage,
    )
    return result.text


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
) -> AsyncIterator[str]:
    provider = get_active_provider()
    usage = TokenUsage()
    model_name = get_active_model_name(provider)
    try:
        if _is_gemini(provider):
            stream = gemini_provider.stream_text(
                system=system,
                user=user,
                temperature=temperature,
                max_output_tokens=max_output_tokens,
                request_timeout=request_timeout,
                max_retries=max_retries,
                use_rate_limiter=use_rate_limiter,
                thinking_budget=thinking_budget,
            )
        elif _is_nemotron(provider):
            stream = nemotron_provider.stream_text(
                system=system,
                user=user,
                temperature=temperature,
                max_output_tokens=max_output_tokens,
                request_timeout=request_timeout,
                max_retries=max_retries,
                use_rate_limiter=use_rate_limiter,
                thinking_budget=thinking_budget,
            )
        else:
            raise KeyError(f"No LLM provider registered for {provider!r}")
        async for piece, maybe_usage in stream:
            if maybe_usage is not None:
                usage = maybe_usage
            if piece:
                yield piece
    except asyncio.CancelledError:
        await record_llm_usage(
            provider=provider,
            model=model_name,
            status="cancelled",
            usage=usage,
        )
        raise
    except Exception:
        await record_llm_usage(
            provider=provider,
            model=model_name,
            status="failed",
            usage=usage,
        )
        raise

    await record_llm_usage(
        provider=provider,
        model=model_name,
        status="ok",
        usage=usage,
    )
