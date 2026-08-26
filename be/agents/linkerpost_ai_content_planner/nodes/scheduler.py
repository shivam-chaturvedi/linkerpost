from agents.linkerpost_ai_content_planner.schemas import ContentPlan
from agents.linkerpost_ai_content_planner.state import ContentGenerationState
from agents.linkerpost_ai_content_planner.tools.clock import parse_iso_datetime, utc_now
from agents.linkerpost_ai_content_planner.tools.scheduling import build_schedule


async def scheduler(state: ContentGenerationState) -> ContentGenerationState:
    plan = ContentPlan.model_validate(state["content_plan"])
    now = parse_iso_datetime(str(state.get("now_utc_iso") or "")) or utc_now()
    slots = {
        int(item["day"]): str(item["scheduled_at"])
        for item in build_schedule(plan, now=now)
    }
    posts = []
    for post in state.get("posts") or []:
        updated = dict(post)
        day = int(updated.get("day") or 1)
        updated["scheduled_at"] = slots.get(day) or slots.get(1)
        posts.append(updated)
    return {"posts": posts, "status": "validating"}
