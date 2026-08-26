"""LLM adapters for agents.

Import `complete_text` / `complete_structured` from here. The active provider is
selected in `llm.py` via `LLM_PROVIDER` (`gemini` or `nemotron`).
"""

from agents.llm.context import LlmCallContext, get_llm_call_context, llm_usage_scope
from agents.llm.llm import (
    DEFAULT_PROVIDER,
    MAX_PROMPT_CHARS,
    accumulate_stream_text,
    complete_structured,
    complete_text,
    get_active_max_output_tokens,
    get_active_model_name,
    get_active_provider,
    get_chat_model,
    get_llm,
    get_rate_limiter,
    require_gemini_key,
    require_llm_key,
    stream_text,
)
from agents.llm.sanitize import clean_user_facing_text_fields, strip_model_thinking
from agents.llm.types import TokenUsage

__all__ = [
    "DEFAULT_PROVIDER",
    "LlmCallContext",
    "MAX_PROMPT_CHARS",
    "TokenUsage",
    "accumulate_stream_text",
    "clean_user_facing_text_fields",
    "complete_structured",
    "complete_text",
    "get_active_max_output_tokens",
    "get_active_model_name",
    "get_active_provider",
    "get_chat_model",
    "get_llm",
    "get_llm_call_context",
    "get_rate_limiter",
    "llm_usage_scope",
    "require_gemini_key",
    "require_llm_key",
    "stream_text",
    "strip_model_thinking",
]
