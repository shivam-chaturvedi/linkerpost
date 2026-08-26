from __future__ import annotations

from datetime import UTC, date, datetime
from decimal import Decimal
from typing import Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.core.config import get_settings
from app.db.session import get_db_session
from app.models.llm_usage import LlmUsageEvent
from app.models.user import User
from app.schemas.usage import LlmUsageSummary

router = APIRouter(prefix="/usage", tags=["usage"])

Period = Literal["today", "month", "all"]


def _period_bounds(period: Period) -> tuple[date, date]:
    today = datetime.now(UTC).date()
    if period == "today":
        return today, today
    if period == "month":
        return today.replace(day=1), today
    return date(1970, 1, 1), today


@router.get("/llm", response_model=LlmUsageSummary)
async def get_llm_usage_summary(
    period: Period = Query(default="month"),
    model: str | None = Query(default=None, description="Filter by model name, or omit for all"),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> LlmUsageSummary:
    settings = get_settings()
    start, end = _period_bounds(period)
    soft_limit = settings.LLM_MONTHLY_TOKEN_SOFT_LIMIT
    selected_model = model.strip() if model and model.strip() and model.strip().lower() != "all" else None

    base_filters = [
        LlmUsageEvent.user_id == current_user.id,
        LlmUsageEvent.usage_date >= start,
        LlmUsageEvent.usage_date <= end,
    ]
    filters = list(base_filters)
    if selected_model:
        filters.append(LlmUsageEvent.model == selected_model)

    totals = (
        await session.execute(
            select(
                func.count().label("request_count"),
                func.coalesce(
                    func.sum(case((LlmUsageEvent.status == "ok", 1), else_=0)),
                    0,
                ).label("requests_ok"),
                func.coalesce(
                    func.sum(case((LlmUsageEvent.status == "failed", 1), else_=0)),
                    0,
                ).label("requests_failed"),
                func.coalesce(
                    func.sum(case((LlmUsageEvent.status == "cancelled", 1), else_=0)),
                    0,
                ).label("requests_cancelled"),
                func.coalesce(
                    func.sum(
                        case(
                            (LlmUsageEvent.status == "ok", LlmUsageEvent.input_tokens),
                            else_=0,
                        )
                    ),
                    0,
                ).label("input_tokens"),
                func.coalesce(
                    func.sum(
                        case(
                            (LlmUsageEvent.status == "ok", LlmUsageEvent.output_tokens),
                            else_=0,
                        )
                    ),
                    0,
                ).label("output_tokens"),
                func.coalesce(
                    func.sum(
                        case(
                            (LlmUsageEvent.status == "ok", LlmUsageEvent.total_tokens),
                            else_=0,
                        )
                    ),
                    0,
                ).label("total_tokens"),
                func.coalesce(
                    func.sum(
                        case(
                            (LlmUsageEvent.status == "ok", LlmUsageEvent.cached_tokens),
                            else_=0,
                        )
                    ),
                    0,
                ).label("cached_tokens"),
                func.coalesce(
                    func.max(
                        case(
                            (LlmUsageEvent.status == "ok", LlmUsageEvent.total_tokens),
                            else_=None,
                        )
                    ),
                    0,
                ).label("max_tokens"),
                func.coalesce(
                    func.sum(
                        case(
                            (LlmUsageEvent.status == "ok", LlmUsageEvent.estimated_cost_usd),
                            else_=0,
                        )
                    ),
                    0,
                ).label("cost"),
            ).where(*filters)
        )
    ).one()

    request_count = int(totals.request_count or 0)
    requests_ok = int(totals.requests_ok or 0)
    total_tokens = int(totals.total_tokens or 0)
    avg_tokens = (total_tokens / requests_ok) if requests_ok else 0.0
    token_pct = min(100.0, (total_tokens / soft_limit) * 100.0) if soft_limit else 0.0

    feature_rows = (
        await session.execute(
            select(LlmUsageEvent.feature, func.count())
            .where(*filters)
            .group_by(LlmUsageEvent.feature)
        )
    ).all()
    by_feature = {str(name): int(count) for name, count in feature_rows}

    model_rows = (
        await session.execute(
            select(LlmUsageEvent.model, func.count().label("n"))
            .where(*base_filters)
            .group_by(LlmUsageEvent.model)
            .order_by(func.count().desc())
        )
    ).all()
    by_model = {str(name): int(count) for name, count in model_rows if name}
    available_models = list(by_model.keys())

    model_row = (
        await session.execute(
            select(LlmUsageEvent.model, LlmUsageEvent.provider, func.count().label("n"))
            .where(*filters, LlmUsageEvent.status == "ok")
            .group_by(LlmUsageEvent.model, LlmUsageEvent.provider)
            .order_by(func.count().desc())
            .limit(1)
        )
    ).first()

    return LlmUsageSummary(
        period=period,
        period_start=start,
        period_end=end,
        request_count=request_count,
        requests_ok=requests_ok,
        requests_failed=int(totals.requests_failed or 0),
        requests_cancelled=int(totals.requests_cancelled or 0),
        input_tokens=int(totals.input_tokens or 0),
        output_tokens=int(totals.output_tokens or 0),
        total_tokens=total_tokens,
        cached_tokens=int(totals.cached_tokens or 0),
        avg_tokens_per_request=round(avg_tokens, 2),
        max_tokens_per_request=int(totals.max_tokens or 0),
        estimated_cost_usd=Decimal(str(totals.cost or 0)),
        monthly_token_soft_limit=soft_limit,
        token_usage_pct=round(token_pct, 2),
        primary_model=str(model_row.model) if model_row else None,
        primary_provider=str(model_row.provider) if model_row else None,
        selected_model=selected_model,
        available_models=available_models,
        by_feature=by_feature,
        by_model=by_model,
    )
