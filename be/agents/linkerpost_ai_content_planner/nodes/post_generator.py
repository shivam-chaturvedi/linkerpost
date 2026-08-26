from __future__ import annotations

from typing import Any

from agents.linkerpost_ai_content_planner.prompts import (
    POST_GENERATOR_SYSTEM,
    VALIDATOR_REPAIR_SYSTEM,
)
from agents.linkerpost_ai_content_planner.schemas import ContentPlan, LinkedInPostDraft
from agents.linkerpost_ai_content_planner.state import ContentGenerationState
from agents.linkerpost_ai_content_planner.tools.clock import clock_context_block, utc_now
from agents.llm import clean_user_facing_text_fields, complete_structured


def _source_payload(state: ContentGenerationState, source_ids: list[str]) -> list[dict[str, Any]]:
    wanted = set(source_ids)
    selected = []
    for source in state.get("ranked_sources") or []:
        if source.get("source_key") in wanted:
            selected.append(
                {
                    "source_key": source.get("source_key"),
                    "title": source.get("title"),
                    "url": source.get("url"),
                    "excerpt": str(source.get("content") or source.get("description") or "")[:700],
                }
            )
    return selected[:4]


async def _generate_one(
    *,
    plan: ContentPlan,
    item: dict[str, Any],
    sources: list[dict[str, Any]],
    previous_angles: list[str],
    repair_errors: list[str] | None = None,
    now_utc_iso: str,
) -> dict[str, Any]:
    prompt = (
        f"{clock_context_block(now_utc_iso=now_utc_iso, timezone_name=plan.schedule.timezone)}\n\n"
        f"Topic: {plan.topic}\nTone: {plan.content_style.tone}\nAudience: {plan.content_style.audience}\n"
        f"technical_depth: {plan.content_style.technical_depth}/10\n"
        f"creativity: {plan.content_style.creativity}/10\n"
        f"content_relationship_score: {plan.variation.content_relationship_score}/10\n"
        f"Assigned angle: {item['angle']}\nDay: {item['day']}\n"
        f"Previous angles (do not repeat): {previous_angles}\n"
        f"Sources: {sources}\nConstraints: {plan.user_constraints}"
    )
    system = POST_GENERATOR_SYSTEM
    if repair_errors:
        system = VALIDATOR_REPAIR_SYSTEM
        prompt += f"\nValidation errors to fix: {repair_errors}"
    draft = await complete_structured(
        LinkedInPostDraft,
        system=system,
        user=prompt,
        temperature=0.55 if plan.variation.content_relationship_score < 5 else 0.4,
    )
    payload = clean_user_facing_text_fields(
        draft.model_dump(),
        "content",
        "title",
        "first_comment",
        "angle",
    )
    payload["day"] = int(item["day"])
    payload["angle"] = item["angle"]
    payload["source_ids"] = item.get("source_ids") or payload.get("source_ids") or []
    return payload


async def post_generator(state: ContentGenerationState) -> ContentGenerationState:
    plan = ContentPlan.model_validate(state["content_plan"])
    strategy = state.get("content_strategy") or []
    existing = list(state.get("posts") or [])
    regenerate = set(state.get("posts_to_regenerate") or [])
    previous_angles = [str(item.get("angle") or "") for item in strategy]
    independent = plan.variation.content_relationship_score <= 4
    now_utc_iso = str(state.get("now_utc_iso") or utc_now().isoformat().replace("+00:00", "Z"))

    async def make(item: dict[str, Any], seen: list[str]) -> dict[str, Any]:
        sources = _source_payload(state, list(item.get("source_ids") or []))
        return await _generate_one(
            plan=plan,
            item=item,
            sources=sources,
            previous_angles=seen,
            repair_errors=state.get("validation_errors") if regenerate else None,
            now_utc_iso=now_utc_iso,
        )

    posts: list[dict[str, Any]]
    if regenerate and existing:
        posts = existing
        for index in sorted(regenerate):
            if 0 <= index < len(strategy):
                seen = [str(post.get("angle") or "") for i, post in enumerate(posts) if i != index]
                posts[index] = await make(strategy[index], seen)
    else:
        posts = []
        seen: list[str] = []
        for item in strategy:
            previous = [entry["angle"] for entry in strategy if entry["day"] != item["day"]] if independent else seen
            post = await make(item, previous)
            posts.append(post)
            seen.append(str(post.get("angle") or item["angle"]))

    return {
        "posts": posts,
        "previous_angles": [str(post.get("angle") or "") for post in posts],
        "posts_to_regenerate": [],
        "status": "generating",
    }
