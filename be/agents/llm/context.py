from __future__ import annotations

from contextlib import contextmanager
from contextvars import ContextVar
from dataclasses import dataclass
from typing import Iterator
from uuid import UUID

_user_id: ContextVar[UUID | None] = ContextVar("llm_user_id", default=None)
_run_id: ContextVar[UUID | None] = ContextVar("llm_run_id", default=None)
_feature: ContextVar[str | None] = ContextVar("llm_feature", default=None)


@dataclass(frozen=True, slots=True)
class LlmCallContext:
    user_id: UUID | None
    run_id: UUID | None
    feature: str | None


def get_llm_call_context() -> LlmCallContext:
    return LlmCallContext(
        user_id=_user_id.get(),
        run_id=_run_id.get(),
        feature=_feature.get(),
    )


@contextmanager
def llm_usage_scope(
    *,
    user_id: UUID | str | None,
    feature: str,
    run_id: UUID | str | None = None,
) -> Iterator[LlmCallContext]:
    """Attribute subsequent LLM calls to a user / feature / agent run."""
    parsed_user = UUID(str(user_id)) if user_id is not None else None
    parsed_run = UUID(str(run_id)) if run_id is not None else None
    t_user = _user_id.set(parsed_user)
    t_run = _run_id.set(parsed_run)
    t_feature = _feature.set(feature.strip() or None)
    try:
        yield get_llm_call_context()
    finally:
        _user_id.reset(t_user)
        _run_id.reset(t_run)
        _feature.reset(t_feature)
