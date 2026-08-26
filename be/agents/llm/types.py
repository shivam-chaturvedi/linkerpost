from __future__ import annotations

from dataclasses import dataclass
from typing import Generic, TypeVar

from typing import Literal

UsageStatus = Literal["ok", "failed", "cancelled"]

T = TypeVar("T")


@dataclass(frozen=True, slots=True)
class TokenUsage:
    """Token counts returned by the provider for a single LLM call."""

    input_tokens: int = 0
    output_tokens: int = 0
    total_tokens: int = 0
    cached_tokens: int = 0

    def __post_init__(self) -> None:
        if self.total_tokens <= 0 and (self.input_tokens or self.output_tokens):
            object.__setattr__(
                self,
                "total_tokens",
                max(0, self.input_tokens) + max(0, self.output_tokens),
            )


@dataclass(frozen=True, slots=True)
class TextCompletion:
    text: str
    usage: TokenUsage
    model: str
    provider: str


@dataclass(frozen=True, slots=True)
class StructuredCompletion(Generic[T]):
    value: T
    usage: TokenUsage
    model: str
    provider: str
