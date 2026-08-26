from __future__ import annotations

from typing import Any
from uuid import UUID, uuid4

from agents.linkerpost_ai_content_planner.database.repository import complete_run, start_run
from agents.linkerpost_ai_content_planner.graph import build_content_planner_graph
from agents.linkerpost_ai_content_planner.presentation import public_agent_output
from agents.linkerpost_ai_content_planner.state import ContentGenerationState
from agents.linkerpost_ai_content_planner.tools.clock import utc_now
from agents.linkerpost_ai_content_planner.tools.intake import merge_follow_up_answers
from agents.llm import get_active_model_name, llm_usage_scope
from agents.registry import AI_CONTENT_PLANNER

_GRAPH = None


def get_graph() -> Any:
    global _GRAPH
    if _GRAPH is None:
        _GRAPH = build_content_planner_graph()
    return _GRAPH


def serialize_agent_output(value: Any) -> Any:
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, UUID):
        return str(value)
    if hasattr(value, "model_dump"):
        return serialize_agent_output(value.model_dump())
    if isinstance(value, dict):
        return {str(key): serialize_agent_output(item) for key, item in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [serialize_agent_output(item) for item in value]
    return str(value)


async def run_agent(
    *,
    user_id: str | UUID,
    user_input: str,
    run_id: str | UUID | None = None,
    answers: list[dict[str, Any]] | None = None,
    follow_up_round: int = 0,
) -> dict[str, Any]:
    """Run the AI Content Planner and return JSON-serializable output."""
    user_uuid = UUID(str(user_id))
    run_uuid = UUID(str(run_id)) if run_id else uuid4()
    prompt = merge_follow_up_answers(user_input, answers)
    if not prompt:
        raise ValueError("user_input is required")

    active_model = get_active_model_name()
    now_utc_iso = utc_now().isoformat().replace("+00:00", "Z")
    await start_run(
        run_id=run_uuid,
        user_id=user_uuid,
        user_input=prompt,
        model=active_model,
    )
    graph = get_graph()
    initial: ContentGenerationState = {
        "run_id": str(run_uuid),
        "user_id": str(user_uuid),
        "user_input": prompt,
        "combined_input": prompt,
        "model": active_model,
        "now_utc_iso": now_utc_iso,
        "content_plan": None,
        "search_queries": [],
        "discovered_urls": [],
        "source_documents": [],
        "ranked_sources": [],
        "content_strategy": [],
        "posts": [],
        "previous_angles": [],
        "validation_errors": [],
        "posts_to_regenerate": [],
        "retry_count": 0,
        "follow_up_round": max(0, int(follow_up_round)),
        "follow_up_questions": [],
        "status": "queued",
        "error_message": None,
    }
    graph_config = {
        "configurable": {"thread_id": f"{run_uuid}:{initial['follow_up_round']}"},
        "tags": [AI_CONTENT_PLANNER, "linkerpost"],
        "metadata": {
            "user_id": str(user_uuid),
            "run_id": str(run_uuid),
            "feature": AI_CONTENT_PLANNER,
            "agent_name": AI_CONTENT_PLANNER,
        },
    }
    try:
        with llm_usage_scope(
            user_id=user_uuid,
            feature=AI_CONTENT_PLANNER,
            run_id=run_uuid,
        ):
            result = await graph.ainvoke(initial, config=graph_config)
        await complete_run(
            run_id=run_uuid,
            status=str(result.get("status") or "completed"),
            content_plan=result.get("content_plan"),
            content_strategy=list(result.get("content_strategy") or []),
            retry_count=int(result.get("retry_count") or 0),
            error_message=result.get("error_message"),
        )
        if result.get("status") == "awaiting_input":
            return {
                "status": "awaiting_input",
                "run_id": str(run_uuid),
                "user_input": prompt,
                "combined_input": prompt,
                "follow_up_round": int(result.get("follow_up_round") or follow_up_round + 1),
                "follow_up_questions": list(result.get("follow_up_questions") or []),
            }
        output = serialize_agent_output(result)
        if isinstance(output, dict):
            output["combined_input"] = prompt
            output["run_id"] = str(run_uuid)
            output = public_agent_output(output)
        return output
    except Exception as exc:
        await complete_run(
            run_id=run_uuid,
            status="failed",
            error_message=str(exc),
        )
        raise


async def run_content_planner(
    *,
    user_id: str | UUID,
    run_id: str | UUID | None = None,
    user_input: str,
    answers: list[dict[str, Any]] | None = None,
    follow_up_round: int = 0,
) -> dict[str, Any]:
    return await run_agent(
        user_id=user_id,
        user_input=user_input,
        run_id=run_id,
        answers=answers,
        follow_up_round=follow_up_round,
    )
