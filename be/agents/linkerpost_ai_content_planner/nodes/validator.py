from pydantic import ValidationError

from agents.linkerpost_ai_content_planner.schemas import ContentPlan, LinkedInPostDraft
from agents.linkerpost_ai_content_planner.state import ContentGenerationState
from agents.linkerpost_ai_content_planner.tools.clock import parse_iso_datetime, utc_now
from agents.tools.similarity import diversity_threshold, duplicate_pairs
from app.core.config import get_settings


async def validator(state: ContentGenerationState) -> ContentGenerationState:
    plan = ContentPlan.model_validate(state["content_plan"])
    settings = get_settings()
    errors: list[str] = []
    regenerate: set[int] = set()
    posts = list(state.get("posts") or [])
    now = parse_iso_datetime(str(state.get("now_utc_iso") or "")) or utc_now()
    expected = min(plan.total_posts, settings.CONTENT_PLANNER_MAX_POSTS)

    if not posts:
        return {
            "validation_errors": ["No posts were generated"],
            "posts_to_regenerate": [],
            "retry_count": int(state.get("retry_count") or 0) + 1,
            "status": "validating",
        }

    if len(posts) > expected:
        posts = posts[:expected]
    elif len(posts) < expected:
        errors.append(
            f"Expected {expected} posts for duration_days={plan.duration_days} "
            f"× posts_per_day={plan.posts_per_day}, got {len(posts)}"
        )

    for index, post in enumerate(posts):
        try:
            LinkedInPostDraft.model_validate(post)
        except ValidationError as exc:
            errors.append(f"Post {index + 1}: {exc.errors()[0]['msg']}")
            regenerate.add(index)
            continue
        scheduled_raw = post.get("scheduled_at")
        if scheduled_raw is None:
            errors.append(f"Post {index + 1} is missing scheduled_at")
            regenerate.add(index)
            continue
        scheduled = parse_iso_datetime(str(scheduled_raw))
        if scheduled is None:
            errors.append(f"Post {index + 1} has invalid scheduled_at")
            post["scheduled_at"] = None
        elif scheduled <= now:
            errors.append(f"Post {index + 1} is scheduled in the past ({scheduled_raw})")
            post["scheduled_at"] = None

    threshold = diversity_threshold(settings.CONTENT_PLANNER_POST_DIVERSITY_SCORE)
    for left, right, ratio in duplicate_pairs(posts, threshold=threshold):
        errors.append(
            f"Posts {left + 1} and {right + 1} are too similar ({ratio:.0%}) "
            f"for diversity_score={settings.CONTENT_PLANNER_POST_DIVERSITY_SCORE}"
        )
        regenerate.add(right)

    retry_count = int(state.get("retry_count") or 0)
    if errors:
        retry_count += 1
    return {
        "posts": posts,
        "validation_errors": errors,
        "posts_to_regenerate": sorted(regenerate),
        "retry_count": retry_count,
        "status": "validating",
    }
