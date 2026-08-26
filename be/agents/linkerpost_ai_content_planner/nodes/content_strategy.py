from pydantic import BaseModel, Field

from agents.linkerpost_ai_content_planner.prompts import STRATEGY_SYSTEM
from agents.linkerpost_ai_content_planner.schemas import ContentPlan, StrategyItem
from agents.linkerpost_ai_content_planner.state import ContentGenerationState
from agents.linkerpost_ai_content_planner.tools.clock import clock_context_block, utc_now
from agents.llm import complete_structured
from app.core.config import get_settings


class StrategyPlan(BaseModel):
    items: list[StrategyItem] = Field(min_length=1)


async def content_strategy(state: ContentGenerationState) -> ContentGenerationState:
    settings = get_settings()
    plan = ContentPlan.model_validate(state["content_plan"])
    now_utc_iso = str(state.get("now_utc_iso") or utc_now().isoformat().replace("+00:00", "Z"))
    total = min(plan.total_posts, settings.CONTENT_PLANNER_MAX_POSTS)
    diversity = settings.CONTENT_PLANNER_POST_DIVERSITY_SCORE
    sources = [
        {
            "source_key": item.get("source_key"),
            "title": item.get("title"),
            "url": item.get("url"),
            "description": str(item.get("description") or "")[:400],
        }
        for item in (state.get("ranked_sources") or [])[:12]
    ]
    prompt = (
        f"{clock_context_block(now_utc_iso=now_utc_iso, timezone_name=plan.schedule.timezone)}\n\n"
        f"Create exactly {total} LinkedIn calendar items "
        f"(duration_days={plan.duration_days}, posts_per_day={plan.posts_per_day}). "
        f"Do not create more than {total} items.\n"
        f"post_diversity_score={diversity}/10 "
        f"(0=similar OK, 10=completely different angles/content).\n"
        f"Topic: {plan.topic}\nAudience: {plan.content_style.audience}\n"
        f"Tone: {plan.content_style.tone}\n"
        f"content_relationship_score: {plan.variation.content_relationship_score}/10\n"
        f"Constraints: {plan.user_constraints}\n"
        f"Sources: {sources}"
    )
    result = await complete_structured(
        StrategyPlan,
        system=STRATEGY_SYSTEM,
        user=prompt,
        temperature=0.5,
    )
    items = [item.model_dump() for item in result.items[:total]]
    while len(items) < total:
        day = len(items) + 1
        items.append(
            {
                "day": day,
                "angle": f"{plan.topic} field note {day}",
                "source_ids": [str(sources[0]["source_key"])] if sources else [],
                "media_focus": "image",
            }
        )
    for index, item in enumerate(items):
        item["day"] = index + 1
    return {"content_strategy": items[:total], "previous_angles": [], "status": "planning"}
