"""LinkerPost AI Content Planner — LangGraph LinkedIn content generation agent."""

from typing import Any

__all__ = ["build_content_planner_graph", "run_agent", "run_content_planner"]


def __getattr__(name: str) -> Any:
    if name == "build_content_planner_graph":
        from agents.linkerpost_ai_content_planner.graph import build_content_planner_graph

        return build_content_planner_graph
    if name in {"run_agent", "run_content_planner"}:
        from agents.linkerpost_ai_content_planner.main import run_agent, run_content_planner

        return run_agent if name == "run_agent" else run_content_planner
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
