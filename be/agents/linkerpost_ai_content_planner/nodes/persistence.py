from uuid import UUID

from agents.linkerpost_ai_content_planner.database.repository import persist_generated_content
from agents.linkerpost_ai_content_planner.state import ContentGenerationState


async def persistence(state: ContentGenerationState) -> ContentGenerationState:
    await persist_generated_content(
        run_id=UUID(state["run_id"]),
        user_id=UUID(state["user_id"]),
        content_plan=state.get("content_plan"),
        content_strategy=list(state.get("content_strategy") or []),
        ranked_sources=list(state.get("ranked_sources") or []),
        posts=list(state.get("posts") or []),
        retry_count=int(state.get("retry_count") or 0),
    )
    return {"status": "completed", "error_message": None}
