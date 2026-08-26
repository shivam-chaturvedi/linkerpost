from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from agents.llm.context import llm_usage_scope
from agents.llm.llm import complete_structured, require_llm_key
from agents.llm.sanitize import strip_model_thinking
from app.api.dependencies import CurrentUser
from app.schemas.assistant import AssistantChatRequest, AssistantChatResponse, AssistantLink

router = APIRouter(prefix="/assistant", tags=["assistant"])

APP_PAGES = [
    ("Dashboard", "/app/dashboard", "Overview, AI usage, and workspace home"),
    ("Accounts", "/app/accounts", "Connect and manage LinkedIn accounts"),
    ("Manage Posts", "/app/manage-posts", "Create, edit, schedule, publish, rewrite posts"),
    ("Create", "/app/create", "Quick create flow for a new post"),
    ("Calendar", "/app/calendar", "Scheduled posts calendar"),
    ("Agents", "/app/agents", "AI agents including AI Content Planner"),
    ("Library", "/app/library", "Saved content library"),
    ("Settings", "/app/settings", "Profile, preferences, billing, help & support"),
    ("Support", "/app/support", "Help center and feature suggestions"),
    ("Recruiting", "/app/recruiting", "HR recruiting tools when enabled"),
]

SYSTEM_PROMPT = """You are the Linker Post Assistant for a LinkedIn content workspace SaaS.

Your job:
- Help users navigate the product (which page to open)
- Explain how to use LinkedIn accounts, posts, scheduling, rewrite-with-AI, and agents
- Recommend which agent or page fits their goal
- Give concise, practical product help

Rules:
- Keep replies short (2–5 sentences) unless the user asks for detail
- Prefer directing users to real in-app pages from the catalog below
- Do not invent pages, billing plans, or features that are not listed
- Do not claim you can publish to LinkedIn yourself — guide them to the right screens
- Never invent credentials, API keys, or private data
- If unsure, say so and suggest Support or Settings → Help

Product pages (label | path | purpose):
""" + "\n".join(f"- {label} | {path} | {purpose}" for label, path, purpose in APP_PAGES) + """

When helpful, include up to 3 links using exact paths from the catalog.
"""


class _AssistantModelReply(BaseModel):
    reply: str = Field(min_length=1, max_length=4000)
    links: list[AssistantLink] = Field(default_factory=list, max_length=4)


_ALLOWED_PATHS = {path for _, path, _ in APP_PAGES}


@router.post("/chat", response_model=AssistantChatResponse)
async def assistant_chat(
    payload: AssistantChatRequest,
    current_user: CurrentUser,
) -> AssistantChatResponse:
    try:
        require_llm_key()
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Assistant is not configured",
        ) from exc

    history_lines: list[str] = []
    for item in payload.history[-8:]:
        role = "User" if item.role == "user" else "Assistant"
        history_lines.append(f"{role}: {item.content.strip()[:1500]}")
    history_block = "\n".join(history_lines) if history_lines else "(none)"
    user_prompt = (
        f"Conversation so far:\n{history_block}\n\n"
        f"User question:\n{payload.message.strip()}\n\n"
        "Respond with a helpful reply and optional page links."
    )

    with llm_usage_scope(user_id=current_user.id, feature="assistant_chat"):
        result = await complete_structured(
            _AssistantModelReply,
            system=SYSTEM_PROMPT,
            user=user_prompt,
            temperature=0.4,
            max_output_tokens=1024,
        )

    reply = strip_model_thinking(result.reply).strip()
    if not reply:
        reply = (
            "I can help you find the right page or agent. "
            "Try asking about posts, LinkedIn accounts, scheduling, or Agents."
        )

    links: list[AssistantLink] = []
    for link in result.links:
        path = link.path.strip()
        if path in _ALLOWED_PATHS:
            links.append(AssistantLink(label=link.label.strip()[:64] or path, path=path))
        if len(links) >= 3:
            break

    return AssistantChatResponse(reply=reply, links=links)
