from __future__ import annotations

from typing import Any

from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, START, StateGraph

from app.core.config import get_settings
from agents.linkerpost_ai_content_planner.nodes.content_strategy import content_strategy
from agents.linkerpost_ai_content_planner.nodes.input_analyzer import input_analyzer
from agents.linkerpost_ai_content_planner.nodes.media_discovery import media_discovery
from agents.linkerpost_ai_content_planner.nodes.persistence import persistence
from agents.linkerpost_ai_content_planner.nodes.post_generator import post_generator
from agents.linkerpost_ai_content_planner.nodes.requirements_gatherer import requirements_gatherer
from agents.linkerpost_ai_content_planner.nodes.scheduler import scheduler
from agents.linkerpost_ai_content_planner.nodes.search_planner import search_planner
from agents.linkerpost_ai_content_planner.nodes.source_normalizer import source_normalizer
from agents.linkerpost_ai_content_planner.nodes.source_ranker import source_ranker
from agents.linkerpost_ai_content_planner.nodes.url_fetcher import url_fetcher
from agents.linkerpost_ai_content_planner.nodes.validator import validator
from agents.linkerpost_ai_content_planner.nodes.web_search import web_search
from agents.linkerpost_ai_content_planner.state import ContentGenerationState


def route_after_intake(state: ContentGenerationState) -> str:
    if state.get("status") == "awaiting_input":
        return "end"
    return "input_analyzer"


def route_after_validation(state: ContentGenerationState) -> str:
    errors = state.get("validation_errors") or []
    retries = int(state.get("retry_count") or 0)
    if not errors or retries > get_settings().CONTENT_PLANNER_MAX_RETRIES:
        return "persistence"
    regenerate = state.get("posts_to_regenerate") or []
    if regenerate:
        return "post_generator"
    # Schedule/date issues only — stamp times again without rewriting posts.
    return "scheduler"


def build_content_planner_graph() -> Any:
    graph = StateGraph(ContentGenerationState)
    graph.add_node("requirements_gatherer", requirements_gatherer)
    graph.add_node("input_analyzer", input_analyzer)
    graph.add_node("search_planner", search_planner)
    graph.add_node("web_search", web_search)
    graph.add_node("url_fetcher", url_fetcher)
    graph.add_node("source_normalizer", source_normalizer)
    graph.add_node("source_ranker", source_ranker)
    graph.add_node("content_strategy", content_strategy)
    graph.add_node("post_generator", post_generator)
    graph.add_node("media_discovery", media_discovery)
    graph.add_node("scheduler", scheduler)
    graph.add_node("validator", validator)
    graph.add_node("persistence", persistence)

    graph.add_edge(START, "requirements_gatherer")
    graph.add_conditional_edges(
        "requirements_gatherer",
        route_after_intake,
        {"input_analyzer": "input_analyzer", "end": END},
    )
    graph.add_edge("input_analyzer", "search_planner")
    graph.add_edge("search_planner", "web_search")
    graph.add_edge("web_search", "url_fetcher")
    graph.add_edge("url_fetcher", "source_normalizer")
    graph.add_edge("source_normalizer", "source_ranker")
    graph.add_edge("source_ranker", "content_strategy")
    graph.add_edge("content_strategy", "post_generator")
    graph.add_edge("post_generator", "media_discovery")
    graph.add_edge("media_discovery", "scheduler")
    graph.add_edge("scheduler", "validator")
    graph.add_conditional_edges(
        "validator",
        route_after_validation,
        {
            "post_generator": "post_generator",
            "scheduler": "scheduler",
            "persistence": "persistence",
        },
    )
    graph.add_edge("persistence", END)
    return graph.compile(checkpointer=MemorySaver())
