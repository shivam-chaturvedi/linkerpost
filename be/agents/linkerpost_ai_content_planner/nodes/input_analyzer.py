from agents.linkerpost_ai_content_planner.prompts import INPUT_ANALYZER_SYSTEM
from agents.linkerpost_ai_content_planner.schemas import ContentPlan
from agents.linkerpost_ai_content_planner.state import ContentGenerationState
from agents.linkerpost_ai_content_planner.tools.clock import (
    clock_context_block,
    extract_duration_days,
    extract_posts_per_day,
    parse_iso_datetime,
    utc_now,
)
from agents.linkerpost_ai_content_planner.tools.scheduling import sanitize_plan_for_clock
from agents.llm import complete_structured
from app.core.config import get_settings


async def input_analyzer(state: ContentGenerationState) -> ContentGenerationState:
    settings = get_settings()
    now_utc_iso = str(state.get("now_utc_iso") or utc_now().isoformat().replace("+00:00", "Z"))
    brief = str(state.get("user_input") or "")
    known_duration = extract_duration_days(brief)
    known_ppd = extract_posts_per_day(brief)
    diversity = settings.CONTENT_PLANNER_POST_DIVERSITY_SCORE
    plan = await complete_structured(
        ContentPlan,
        system=INPUT_ANALYZER_SYSTEM,
        user=(
            f"{clock_context_block(now_utc_iso=now_utc_iso)}\n\n"
            f"Parsed duration_days from brief (if any): {known_duration}\n"
            f"Parsed posts_per_day from brief (if any): {known_ppd}\n"
            f"Internal post_diversity_score (0=similar … 10=different): {diversity}\n"
            f"If duration_days is set and posts_per_day was not stated, use posts_per_day=1.\n"
            f"Never invent past start_date. Prefer start_date=null.\n"
            f"User brief:\n{brief}"
        ),
        temperature=0.2,
    )
    plan = sanitize_plan_for_clock(
        plan,
        now=parse_iso_datetime(now_utc_iso) or utc_now(),
        known_duration_days=known_duration,
        known_posts_per_day=known_ppd,
    )
    return {
        "content_plan": plan.model_dump(),
        "status": "analyzing",
        "now_utc_iso": now_utc_iso,
    }
