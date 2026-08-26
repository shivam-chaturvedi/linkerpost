"""Maps `agents.agent_name` values to callable LangGraph runners."""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from typing import Any
from uuid import UUID, uuid5

AgentRunner = Callable[..., Awaitable[dict[str, Any]]]

AI_CONTENT_PLANNER = "ai_content_planner"
CATALOG_NAMESPACE = UUID("7c1a4d2e-8f3b-4e9a-9c1d-0a2b3c4d5e6f")
AI_CONTENT_PLANNER_ID = uuid5(CATALOG_NAMESPACE, AI_CONTENT_PLANNER)

CATALOG_AGENT = {
    "id": AI_CONTENT_PLANNER_ID,
    "agent_name": AI_CONTENT_PLANNER,
    "key": AI_CONTENT_PLANNER,
    "name": "AI Content Planner",
    "description": "Turns a topic into a sourced LinkedIn content calendar, drafts, and media.",
    "needs": "Natural-language brief (topic, days, tone, cadence)",
    "persona": "creator",
    "mode": "Auto publish",
}


def get_agent_runner(agent_name: str) -> AgentRunner:
    if agent_name == AI_CONTENT_PLANNER:
        from agents.linkerpost_ai_content_planner.main import run_agent

        return run_agent
    raise KeyError(f"No runner is registered for agent_name={agent_name!r}")


async def run_registered_agent(
    agent_name: str,
    *,
    user_id: str | UUID,
    user_input: str,
    run_id: str | UUID | None = None,
    answers: list[dict[str, Any]] | None = None,
    follow_up_round: int = 0,
) -> dict[str, Any]:
    runner = get_agent_runner(agent_name)
    return await runner(
        user_id=user_id,
        user_input=user_input,
        run_id=run_id,
        answers=answers,
        follow_up_round=follow_up_round,
    )
