from __future__ import annotations

from agents.llm.types import TokenUsage
from agents.llm.usage import estimate_cost_usd, extract_token_usage, provider_reported_usage


class _Msg:
    def __init__(self, usage_metadata=None, response_metadata=None):
        self.usage_metadata = usage_metadata
        self.response_metadata = response_metadata


def test_extract_token_usage_from_langchain_metadata() -> None:
    msg = _Msg(
        usage_metadata={
            "input_tokens": 100,
            "output_tokens": 40,
            "total_tokens": 140,
            "input_token_details": {"cache_read": 20},
        }
    )
    usage = extract_token_usage(msg)
    assert usage == TokenUsage(input_tokens=100, output_tokens=40, total_tokens=140, cached_tokens=20)


def test_extract_token_usage_from_gemini_response_metadata() -> None:
    msg = _Msg(
        response_metadata={
            "usage_metadata": {
                "prompt_token_count": 80,
                "candidates_token_count": 25,
                "total_token_count": 105,
                "cached_content_token_count": 10,
            }
        }
    )
    usage = extract_token_usage(msg)
    assert usage.input_tokens == 80
    assert usage.output_tokens == 25
    assert usage.total_tokens == 105
    assert usage.cached_tokens == 10


def test_estimate_cost_usd_uses_cached_rate() -> None:
    cost = estimate_cost_usd(
        TokenUsage(input_tokens=1_000_000, output_tokens=1_000_000, cached_tokens=500_000),
        input_per_1m=0.10,
        output_per_1m=0.40,
        cached_per_1m=0.025,
    )
    # 0.5M * 0.10 + 0.5M * 0.025 + 1M * 0.40 = 0.05 + 0.0125 + 0.40
    assert float(cost) == 0.4625


def test_provider_reported_usage_requires_provider_counts() -> None:
    assert provider_reported_usage(TokenUsage()) is False
    assert provider_reported_usage(TokenUsage(input_tokens=10, output_tokens=5)) is True
