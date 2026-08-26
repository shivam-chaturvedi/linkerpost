from agents.linkerpost_ai_content_planner.prompts import SEARCH_PLANNER_SYSTEM
from agents.linkerpost_ai_content_planner.schemas import ContentPlan, SearchQueryPlan
from agents.linkerpost_ai_content_planner.state import ContentGenerationState
from agents.linkerpost_ai_content_planner.tools.clock import clock_context_block, utc_now
from agents.llm import complete_structured


async def search_planner(state: ContentGenerationState) -> ContentGenerationState:
    plan = ContentPlan.model_validate(state["content_plan"])
    now_utc_iso = str(state.get("now_utc_iso") or utc_now().isoformat().replace("+00:00", "Z"))
    req = plan.source_requirements
    types = []
    if req.latest_news:
        types.append("latest news")
    if req.latest_blogs:
        types.append("expert blogs")
    if req.official_documentation:
        types.append("official documentation")
    if req.research_papers:
        types.append("research papers")
    prompt = (
        f"{clock_context_block(now_utc_iso=now_utc_iso, timezone_name=plan.schedule.timezone)}\n\n"
        f"Topic: {plan.topic}\nNiche: {plan.niche}\nDescription: {plan.description}\n"
        f"Needed source types: {', '.join(types) or 'general web'}\n"
        f"Duration: {plan.duration_days} days"
    )
    result = await complete_structured(
        SearchQueryPlan,
        system=SEARCH_PLANNER_SYSTEM,
        user=prompt,
        temperature=0.4,
    )
    queries = list(dict.fromkeys(q.strip() for q in result.queries if q.strip()))[:8]
    return {"search_queries": queries, "status": "searching"}
