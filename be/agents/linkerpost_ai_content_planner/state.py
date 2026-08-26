from typing import Any, Literal, TypedDict


class ContentGenerationState(TypedDict, total=False):
    run_id: str
    user_id: str
    user_input: str
    model: str

    content_plan: dict[str, Any] | None
    search_queries: list[str]
    discovered_urls: list[dict[str, Any]]
    source_documents: list[dict[str, Any]]
    ranked_sources: list[dict[str, Any]]

    content_strategy: list[dict[str, Any]]
    posts: list[dict[str, Any]]
    previous_angles: list[str]

    validation_errors: list[str]
    posts_to_regenerate: list[int]
    retry_count: int
    follow_up_round: int
    follow_up_questions: list[dict[str, Any]]
    combined_input: str
    # Authoritative wall clock for this run (UTC ISO-8601, usually ...Z).
    now_utc_iso: str
    status: Literal[
        "queued",
        "awaiting_input",
        "analyzing",
        "searching",
        "crawling",
        "planning",
        "generating",
        "validating",
        "persisting",
        "completed",
        "failed",
    ]
    error_message: str | None
