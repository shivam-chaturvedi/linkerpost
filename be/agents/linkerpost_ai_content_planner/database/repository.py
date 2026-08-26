from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.session import AsyncSessionFactory
from app.models.content_planner import ContentRun, ContentSource, GeneratedPost
from app.models.post import Post
from agents.llm import strip_model_thinking


async def start_run(*, run_id: UUID, user_id: UUID, user_input: str, model: str) -> ContentRun:
    async with AsyncSessionFactory() as session:
        existing = await session.get(ContentRun, run_id)
        if existing:
            existing.status = "analyzing"
            existing.input_text = user_input
            existing.model = model
            existing.error_message = None
            await session.commit()
            await session.refresh(existing)
            return existing
        run = ContentRun(
            id=run_id,
            user_id=user_id,
            input_text=user_input,
            status="analyzing",
            model=model,
        )
        session.add(run)
        await session.commit()
        await session.refresh(run)
        return run


async def complete_run(
    *,
    run_id: UUID,
    status: str,
    content_plan: dict[str, Any] | None = None,
    content_strategy: list[dict[str, Any]] | None = None,
    retry_count: int = 0,
    error_message: str | None = None,
) -> None:
    async with AsyncSessionFactory() as session:
        run = await session.get(ContentRun, run_id)
        if run is None:
            return
        run.status = status
        run.retry_count = retry_count
        run.error_message = error_message
        if content_plan is not None:
            run.content_plan = content_plan
        if content_strategy is not None:
            run.content_strategy = content_strategy
        if status in {"completed", "failed"}:
            run.completed_at = datetime.now(UTC)
        await session.commit()


async def persist_generated_content(
    *,
    run_id: UUID,
    user_id: UUID,
    content_plan: dict[str, Any] | None,
    content_strategy: list[dict[str, Any]],
    ranked_sources: list[dict[str, Any]],
    posts: list[dict[str, Any]],
    retry_count: int,
) -> list[UUID]:
    settings = get_settings()
    saved_ids: list[UUID] = []
    async with AsyncSessionFactory() as session:
        run = await session.get(ContentRun, run_id)
        if run is None:
            run = ContentRun(id=run_id, user_id=user_id, input_text="", status="persisting")
            session.add(run)
            await session.flush()

        run.status = "persisting"
        run.content_plan = content_plan
        run.content_strategy = content_strategy
        run.retry_count = retry_count

        existing_sources = await session.execute(select(ContentSource).where(ContentSource.run_id == run_id))
        for row in existing_sources.scalars():
            await session.delete(row)
        existing_posts = await session.execute(select(GeneratedPost).where(GeneratedPost.run_id == run_id))
        for row in existing_posts.scalars():
            await session.delete(row)
        await session.flush()

        for source in ranked_sources:
            scores = source.get("scores") if isinstance(source.get("scores"), dict) else {}
            session.add(
                ContentSource(
                    run_id=run_id,
                    source_key=str(source.get("source_key") or ""),
                    url=str(source.get("url") or "")[:2048],
                    title=str(source.get("title") or "")[:500],
                    description=str(source.get("description") or ""),
                    content=str(source.get("content") or "")[:20000],
                    author=source.get("author"),
                    published_at=source.get("published_at"),
                    source_name=str(source.get("source_name") or ""),
                    language=str(source.get("language") or "en"),
                    images=list(source.get("images") or []),
                    videos=list(source.get("videos") or []),
                    scores=scores,
                    final_score=float((scores or {}).get("final_score") or source.get("final_score") or 0),
                )
            )

        for item in posts:
            scheduled_raw = item.get("scheduled_at")
            scheduled_at = None
            if scheduled_raw:
                scheduled_at = datetime.fromisoformat(str(scheduled_raw).replace("Z", "+00:00"))

            draft_post_id = None
            cleaned_content = strip_model_thinking(str(item.get("content") or ""))
            cleaned_title = strip_model_thinking(str(item.get("title") or ""))
            cleaned_first = item.get("first_comment")
            if isinstance(cleaned_first, str):
                cleaned_first = strip_model_thinking(cleaned_first) or None
            if settings.CONTENT_PLANNER_SAVE_AS_DRAFTS:
                draft = Post(
                    user_id=user_id,
                    status="scheduled" if scheduled_at else "draft",
                    content_type="text",
                    commentary=cleaned_content,
                    first_comment=cleaned_first,
                    article_source=(item.get("articles") or [None])[0],
                    article_title=cleaned_title[:200] or None,
                    scheduled_for=scheduled_at,
                )
                session.add(draft)
                await session.flush()
                draft_post_id = draft.id

            generated = GeneratedPost(
                run_id=run_id,
                user_id=user_id,
                day=int(item.get("day") or 1),
                title=cleaned_title[:300],
                content=cleaned_content,
                first_comment=cleaned_first,
                scheduled_at=scheduled_at,
                images=list(item.get("images") or []),
                videos=list(item.get("videos") or []),
                articles=list(item.get("articles") or []),
                source_ids=list(item.get("source_ids") or []),
                status="scheduled" if scheduled_at else "draft",
                post_id=draft_post_id,
            )
            session.add(generated)
            await session.flush()
            saved_ids.append(generated.id)

        run.status = "completed"
        run.completed_at = datetime.now(UTC)
        await session.commit()
    return saved_ids


def parse_scheduled_at(value: Any) -> datetime | None:
    if value in (None, ""):
        return None
    if isinstance(value, datetime):
        parsed = value
    else:
        parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=UTC)
    return parsed


def ensure_future_scheduled_at(value: datetime | None, *, now: datetime | None = None) -> datetime | None:
    """If a stamp is missing or in the past, push to the next UTC morning slot."""
    current = now or datetime.now(UTC)
    if current.tzinfo is None:
        current = current.replace(tzinfo=UTC)
    else:
        current = current.astimezone(UTC)
    if value is None:
        return None
    scheduled = value if value.tzinfo is not None else value.replace(tzinfo=UTC)
    scheduled = scheduled.astimezone(UTC)
    if scheduled > current:
        return scheduled
    # Next calendar day 10:00 UTC — better than keeping a past June date.
    tomorrow = (current + timedelta(days=1)).date()
    return datetime(tomorrow.year, tomorrow.month, tomorrow.day, 10, 0, tzinfo=UTC)


def _post_from_generated_item(*, user_id: UUID, item: dict[str, Any]) -> Post:
    scheduled_at = ensure_future_scheduled_at(parse_scheduled_at(item.get("scheduled_at")))
    articles = [str(url) for url in (item.get("articles") or []) if url]
    commentary = strip_model_thinking(str(item.get("content") or "").strip())[:3000]
    first_comment = strip_model_thinking(str(item.get("first_comment") or "").strip())[:1250] or None
    title = strip_model_thinking(str(item.get("title") or "").strip())[:200] or None
    article_source = articles[0][:2048] if articles else None
    content_type = "article" if article_source and title else "text"
    return Post(
        user_id=user_id,
        status="scheduled" if scheduled_at else "draft",
        content_type=content_type,
        commentary=commentary,
        first_comment=first_comment,
        first_comment_status="pending" if first_comment else None,
        article_source=article_source,
        article_title=title,
        scheduled_for=scheduled_at,
    )


async def existing_calendar_posts(
    session: AsyncSession, *, run_id: UUID, user_id: UUID
) -> list[Post]:
    generated = list(
        (
            await session.execute(
                select(GeneratedPost).where(
                    GeneratedPost.run_id == run_id,
                    GeneratedPost.user_id == user_id,
                    GeneratedPost.post_id.is_not(None),
                )
            )
        ).scalars()
    )
    post_ids = [row.post_id for row in generated if row.post_id]
    if not post_ids:
        return []
    posts = list((await session.execute(select(Post).where(Post.id.in_(post_ids)))).scalars())
    by_id = {post.id: post for post in posts}
    return [by_id[post_id] for post_id in post_ids if post_id in by_id]


async def schedule_run_posts_to_calendar(
    session: AsyncSession,
    *,
    user_id: UUID,
    run_id: UUID,
    posts_payload: list[dict[str, Any]],
) -> tuple[list[Post], bool]:
    existing = await existing_calendar_posts(session, run_id=run_id, user_id=user_id)
    if existing:
        return existing, True

    generated_rows = list(
        (
            await session.execute(
                select(GeneratedPost).where(
                    GeneratedPost.run_id == run_id,
                    GeneratedPost.user_id == user_id,
                )
            )
        ).scalars()
    )
    generated_by_day = {int(row.day): row for row in generated_rows}

    created: list[Post] = []
    for item in posts_payload:
        if not str(item.get("content") or "").strip():
            continue
        post = _post_from_generated_item(user_id=user_id, item=item)
        session.add(post)
        await session.flush()
        created.append(post)
        linked = generated_by_day.get(int(item.get("day") or 0))
        if linked is not None:
            linked.post_id = post.id
            linked.status = post.status
            linked.scheduled_at = post.scheduled_for
    return created, False

