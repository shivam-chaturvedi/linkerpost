from agents.linkerpost_ai_content_planner.schemas import ContentPlan
from agents.linkerpost_ai_content_planner.state import ContentGenerationState
from agents.tools.ranking import score_source
from app.core.config import get_settings


async def source_ranker(state: ContentGenerationState) -> ContentGenerationState:
    plan = ContentPlan.model_validate(state["content_plan"])
    limit = get_settings().CONTENT_PLANNER_MAX_SOURCES
    ranked: list[dict] = []
    for document in state.get("source_documents") or []:
        scores = score_source(document, plan.topic)
        ranked.append({**document, "scores": scores, "final_score": scores["final_score"]})
    ranked.sort(key=lambda item: float(item.get("final_score") or 0), reverse=True)
    top = ranked[:limit]
    for index, item in enumerate(top):
        item["source_key"] = f"source_{index + 1}"
    return {"ranked_sources": top, "status": "planning"}
