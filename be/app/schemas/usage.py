from datetime import date
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class LlmUsageSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    period: str
    period_start: date
    period_end: date
    request_count: int = 0
    requests_ok: int = 0
    requests_failed: int = 0
    requests_cancelled: int = 0
    input_tokens: int = 0
    output_tokens: int = 0
    total_tokens: int = 0
    cached_tokens: int = 0
    avg_tokens_per_request: float = 0.0
    max_tokens_per_request: int = 0
    estimated_cost_usd: Decimal = Field(default=Decimal("0"))
    monthly_token_soft_limit: int
    token_usage_pct: float = 0.0
    primary_model: str | None = None
    primary_provider: str | None = None
    selected_model: str | None = None
    available_models: list[str] = Field(default_factory=list)
    by_feature: dict[str, int] = Field(default_factory=dict)
    by_model: dict[str, int] = Field(default_factory=dict)
