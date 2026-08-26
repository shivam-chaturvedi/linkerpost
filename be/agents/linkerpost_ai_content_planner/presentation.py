from __future__ import annotations

from typing import Any

from agents.llm import clean_user_facing_text_fields, strip_model_thinking

PUBLIC_OUTPUT_KEYS = (
    "run_id",
    "status",
    "error_message",
    "combined_input",
    "user_input",
    "model",
    "content_plan",
    "content_strategy",
    "search_queries",
    "posts",
    "follow_up_questions",
    "follow_up_round",
    "calendar_scheduled",
    "calendar_post_ids",
)


def slim_ranked_source(source: dict[str, Any]) -> dict[str, Any]:
    images = list(source.get("images") or [])
    return {
        "source_key": source.get("source_key"),
        "url": source.get("url"),
        "title": source.get("title"),
        "source_name": source.get("source_name"),
        "final_score": source.get("final_score"),
        "images": images[:2],
    }


def _clean_post(post: Any) -> Any:
    if not isinstance(post, dict):
        return post
    return clean_user_facing_text_fields(
        post,
        "content",
        "title",
        "first_comment",
        "angle",
        "commentary",
    )


def _clean_follow_up(item: Any) -> Any:
    if not isinstance(item, dict):
        return item
    cleaned = clean_user_facing_text_fields(item, "question", "placeholder")
    suggestions = cleaned.get("suggestions")
    if isinstance(suggestions, list):
        cleaned["suggestions"] = [
            strip_model_thinking(str(entry)).strip()[:120]
            for entry in suggestions
            if str(entry or "").strip()
        ][:4]
    return cleaned


def public_agent_output(value: Any) -> Any:
    """Drop crawled page bodies so the UI and agent_runs JSON stay small."""
    if not isinstance(value, dict):
        return value
    public = {key: value.get(key) for key in PUBLIC_OUTPUT_KEYS if key in value}
    ranked = value.get("ranked_sources")
    if isinstance(ranked, list):
        public["ranked_sources"] = [
            slim_ranked_source(item) if isinstance(item, dict) else item for item in ranked[:12]
        ]
    posts = public.get("posts")
    if isinstance(posts, list):
        public["posts"] = [_clean_post(item) for item in posts]
    elif "posts" not in public:
        public["posts"] = [_clean_post(item) for item in (value.get("posts") or [])]
    questions = public.get("follow_up_questions")
    if isinstance(questions, list):
        public["follow_up_questions"] = [_clean_follow_up(item) for item in questions]
    if "status" not in public:
        public["status"] = value.get("status")
    if "model" not in public:
        public["model"] = value.get("model")
    error = public.get("error_message")
    if isinstance(error, str):
        public["error_message"] = strip_model_thinking(error)
    return public


def library_run_fields(output: Any) -> dict[str, Any]:
    """Compact fields for the Library history list (no crawled bodies)."""
    if not isinstance(output, dict):
        return {"title": None, "model": None, "post_count": 0, "calendar_scheduled": False}
    plan = output.get("content_plan") if isinstance(output.get("content_plan"), dict) else {}
    posts = output.get("posts") if isinstance(output.get("posts"), list) else []
    title = strip_model_thinking(str(plan.get("topic") or "").strip()) or None
    model = str(output.get("model") or "").strip() or None
    return {
        "title": title,
        "model": model,
        "post_count": len(posts),
        "calendar_scheduled": bool(output.get("calendar_scheduled")),
    }
