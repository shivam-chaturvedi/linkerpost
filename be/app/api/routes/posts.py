import json
import logging
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Annotated
from urllib.parse import urlparse
from uuid import UUID

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy import select

from agents.llm import require_gemini_key
from agents.rewrite_with_ai.errors import (
    humanize_rewrite_error,
    is_rate_limit_error,
    is_timeout_error,
    is_unavailable_error,
)
from agents.rewrite_with_ai.rewrite import rewrite_linkedin_post
from app.api.dependencies import CurrentUser, DatabaseSession
from app.core.config import get_settings
from app.core.token_encryption import TokenCipher, TokenDecryptionError
from app.models.account import Account
from app.models.post import Post
from app.schemas.post import (
    CreateCommentRequest,
    PostAnalyticsResponse,
    PostCommentItem,
    PostCommentsResponse,
    PostResponse,
    PostsResponse,
    PublishPostRequest,
    RewritePostRequest,
    RewritePostResponse,
    UpdatePostRequest,
)
from app.services.linkedin_publishing import LinkedInPublishError, LinkedInPublishingClient
from app.services.post_publisher import PostPublishError, ensure_utc, publish_post_to_linkedin

router = APIRouter(prefix="/posts", tags=["posts"])
logger = logging.getLogger(__name__)

VALID_ACTIONS = {"draft", "schedule", "publish"}
VALID_CONTENT_TYPES = {"text", "image", "video", "document", "article"}
ALLOWED_DELTA_ATTRIBUTES = {"bold", "italic", "underline", "strike", "blockquote", "list", "link"}
MAX_FILE_BYTES = {
    "image": 10 * 1024 * 1024,
    "video": 50 * 1024 * 1024,
    "document": 20 * 1024 * 1024,
}
ALLOWED_MIME_TYPES = {
    "image": {"image/jpeg", "image/png", "image/gif"},
    "video": {"video/mp4"},
    "document": {
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    },
}


def _validate_article_url(value: str | None) -> str:
    if not value or len(value) > 2048:
        raise HTTPException(status_code=422, detail="A valid article URL is required")
    parsed = urlparse(value)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname or parsed.username:
        raise HTTPException(status_code=422, detail="A valid article URL is required")
    return value


def _validate_editor_delta(value: str | None, commentary: str) -> str | None:
    if value is None or value == "":
        return None
    if len(value) > 100_000:
        raise HTTPException(status_code=422, detail="The editor content is too large")
    try:
        delta = json.loads(value)
        operations = delta["ops"]
    except (json.JSONDecodeError, KeyError, TypeError) as exc:
        raise HTTPException(status_code=422, detail="Invalid editor content") from exc
    if not isinstance(delta, dict) or not isinstance(operations, list) or len(operations) > 3_100:
        raise HTTPException(status_code=422, detail="Invalid editor content")

    plain_parts: list[str] = []
    for operation in operations:
        if not isinstance(operation, dict) or not isinstance(operation.get("insert"), str):
            raise HTTPException(status_code=422, detail="Invalid editor content")
        plain_parts.append(operation["insert"])
        attributes = operation.get("attributes", {})
        if not isinstance(attributes, dict) or not set(attributes).issubset(
            ALLOWED_DELTA_ATTRIBUTES
        ):
            raise HTTPException(status_code=422, detail="Invalid editor formatting")
        link = attributes.get("link")
        if link is not None:
            if not isinstance(link, str):
                raise HTTPException(status_code=422, detail="Invalid editor link")
            parsed = urlparse(link)
            if parsed.scheme not in {"http", "https"} or not parsed.hostname:
                raise HTTPException(status_code=422, detail="Invalid editor link")

    if "".join(plain_parts).strip() != commentary:
        raise HTTPException(status_code=422, detail="Editor content does not match post text")
    return value


def _has_valid_signature(content_type: str, mime_type: str, data: bytes) -> bool:
    if content_type == "image":
        signatures = {
            "image/jpeg": data.startswith(b"\xff\xd8\xff"),
            "image/png": data.startswith(b"\x89PNG\r\n\x1a\n"),
            "image/gif": data.startswith((b"GIF87a", b"GIF89a")),
        }
        return signatures.get(mime_type, False)
    if content_type == "video":
        return len(data) >= 12 and data[4:8] == b"ftyp"
    if mime_type == "application/pdf":
        return data.startswith(b"%PDF-")
    return data.startswith(b"PK\x03\x04")


async def _read_media(upload: UploadFile | None, content_type: str) -> tuple[bytes, str, str]:
    if upload is None or not upload.filename:
        raise HTTPException(status_code=422, detail=f"A {content_type} file is required")
    mime_type = (upload.content_type or "").lower()
    if mime_type not in ALLOWED_MIME_TYPES[content_type]:
        raise HTTPException(status_code=422, detail=f"Unsupported {content_type} file type")
    max_bytes = MAX_FILE_BYTES[content_type]
    media_bytes = await upload.read(max_bytes + 1)
    await upload.close()
    if not media_bytes:
        raise HTTPException(status_code=422, detail="The uploaded file is empty")
    if len(media_bytes) > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"The {content_type} file exceeds the {max_bytes // (1024 * 1024)} MB limit",
        )
    if not _has_valid_signature(content_type, mime_type, media_bytes):
        raise HTTPException(status_code=422, detail="The uploaded file content is invalid")
    filename = Path(upload.filename).name[:255]
    return media_bytes, filename, mime_type


async def _owned_account(
    session: DatabaseSession, current_user: CurrentUser, account_id: UUID | None
) -> Account | None:
    if account_id is None:
        return None
    result = await session.execute(
        select(Account).where(Account.id == account_id, Account.user_id == current_user.id)
    )
    return result.scalar_one_or_none()


async def _owned_post(
    session: DatabaseSession, current_user: CurrentUser, post_id: UUID | None
) -> Post | None:
    if post_id is None:
        return None
    result = await session.execute(
        select(Post).where(Post.id == post_id, Post.user_id == current_user.id)
    )
    return result.scalar_one_or_none()


@router.get("", response_model=PostsResponse)
async def list_posts(
    current_user: CurrentUser,
    session: DatabaseSession,
    account_id: UUID | None = Query(None),
    sync: bool = Query(False),
) -> PostsResponse:
    settings = get_settings()

    if sync:
        acc_query = select(Account).where(Account.user_id == current_user.id, Account.status == "active")
        if account_id is not None:
            acc_query = acc_query.where(Account.id == account_id)
        accounts_to_sync = list((await session.execute(acc_query)).scalars().all())

        for acc in accounts_to_sync:
            try:
                token = TokenCipher(settings.linkedin_token_encryption_keys).decrypt(acc.access_token_encrypted)
                client = LinkedInPublishingClient(settings)
                remote_posts = await client.fetch_member_posts(
                    access_token=token,
                    owner_urn=f"urn:li:person:{acc.provider_account_id}",
                )
                if remote_posts:
                    existing_urns = set(
                        (
                            await session.execute(
                                select(Post.linkedin_post_urn).where(
                                    Post.user_id == current_user.id,
                                    Post.linkedin_post_urn.is_not(None),
                                )
                            )
                        )
                        .scalars()
                        .all()
                    )
                    added = False
                    for rp in remote_posts:
                        urn = rp.get("post_urn")
                        if urn and str(urn) not in existing_urns:
                            pub_at = None
                            pub_at_raw = rp.get("published_at")
                            if pub_at_raw is not None and isinstance(pub_at_raw, (int, float, str)):
                                try:
                                    pub_at = datetime.fromtimestamp(float(pub_at_raw) / 1000.0, tz=UTC)
                                except (ValueError, TypeError):
                                    pass
                            new_post = Post(
                                user_id=current_user.id,
                                account_id=acc.id,
                                status="published",
                                content_type="text",
                                commentary=str(rp.get("commentary") or ""),
                                linkedin_post_urn=str(urn),
                                published_at=pub_at or datetime.now(UTC),
                            )
                            session.add(new_post)
                            added = True
                    if added:
                        await session.commit()
            except Exception as exc:
                logger.warning("Post sync failed for account_id=%s exc=%s", acc.id, exc)

    query = select(Post).where(Post.user_id == current_user.id)
    if account_id is not None:
        query = query.where((Post.account_id == account_id) | (Post.account_id.is_(None)))
    query = query.order_by(Post.created_at.desc()).limit(1000)
    result = await session.execute(query)
    return PostsResponse(posts=list(result.scalars().all()))


@router.post("", response_model=PostResponse, status_code=status.HTTP_201_CREATED)
async def create_post(
    current_user: CurrentUser,
    session: DatabaseSession,
    action: Annotated[str, Form()],
    content_type: Annotated[str, Form()],
    commentary: Annotated[str, Form()] = "",
    editor_delta: Annotated[str | None, Form()] = None,
    first_comment: Annotated[str | None, Form()] = None,
    account_id: Annotated[UUID | None, Form()] = None,
    scheduled_for: Annotated[datetime | None, Form()] = None,
    article_source: Annotated[str | None, Form()] = None,
    article_title: Annotated[str | None, Form()] = None,
    article_description: Annotated[str | None, Form()] = None,
    media: Annotated[UploadFile | None, File()] = None,
) -> PostResponse:
    if action not in VALID_ACTIONS:
        raise HTTPException(status_code=422, detail="Invalid post action")
    if content_type not in VALID_CONTENT_TYPES:
        raise HTTPException(status_code=422, detail="Invalid post content type")
    commentary = commentary.strip()
    if len(commentary) > 3000:
        raise HTTPException(status_code=422, detail="Post text cannot exceed 3,000 characters")
    editor_delta = _validate_editor_delta(editor_delta, commentary)
    first_comment = (first_comment or "").strip() or None
    if first_comment is not None and len(first_comment) > 1250:
        raise HTTPException(status_code=422, detail="First comment cannot exceed 1,250 characters")

    account = await _owned_account(session, current_user, account_id)
    if account_id is not None and account is None:
        raise HTTPException(status_code=404, detail="LinkedIn account not found")
    if action in {"schedule", "publish"} and account is None:
        raise HTTPException(status_code=422, detail="Select a LinkedIn account")

    now = datetime.now(UTC)
    if action == "schedule":
        if scheduled_for is None or scheduled_for.tzinfo is None:
            raise HTTPException(status_code=422, detail="Select a scheduled date and time")
        scheduled_utc = ensure_utc(scheduled_for)
        if scheduled_utc < now:
            raise HTTPException(status_code=422, detail="Scheduled time cannot be in the past")
        if scheduled_utc > now + timedelta(days=366):
            raise HTTPException(status_code=422, detail="Scheduled time is too far in the future")
        scheduled_for = scheduled_utc
    elif scheduled_for is not None:
        raise HTTPException(status_code=422, detail="Scheduled time is only valid when scheduling")

    media_bytes: bytes | None = None
    media_filename: str | None = None
    media_mime: str | None = None
    if content_type in {"image", "video", "document"}:
        media_bytes, media_filename, media_mime = await _read_media(media, content_type)
    elif media is not None:
        await media.close()
        raise HTTPException(status_code=422, detail="This post type does not accept a file")

    if content_type == "article":
        article_source = _validate_article_url(article_source)
        article_title = (article_title or "").strip()
        article_description = (article_description or "").strip()
        if not article_title or len(article_title) > 200:
            raise HTTPException(status_code=422, detail="Article title is required")
        if len(article_description) > 500:
            raise HTTPException(status_code=422, detail="Article description is too long")
    elif not commentary and media_bytes is None:
        raise HTTPException(status_code=422, detail="Write post text or attach supported media")

    post_status = {"draft": "draft", "schedule": "scheduled", "publish": "publishing"}[action]
    post = Post(
        user_id=current_user.id,
        account_id=account.id if account else None,
        status=post_status,
        content_type=content_type,
        commentary=commentary,
        editor_delta=editor_delta,
        first_comment=first_comment,
        first_comment_status="pending" if first_comment else None,
        article_source=article_source,
        article_title=article_title,
        article_description=article_description,
        media_filename=media_filename,
        media_content_type=media_mime,
        media_size=len(media_bytes) if media_bytes is not None else None,
        media_bytes=media_bytes,
        scheduled_for=scheduled_for,
    )
    session.add(post)
    await session.commit()
    await session.refresh(post)

    if action != "publish" or account is None:
        return PostResponse.model_validate(post)

    # Immediate publish uses the same account-token path as the scheduler
    # (stored LinkedIn OAuth token — not the Linker Post session JWT).
    try:
        outcome = await publish_post_to_linkedin(session, post=post, account=account)
    except PostPublishError as exc:
        raise HTTPException(status_code=exc.http_status, detail=exc.message) from exc
    return PostResponse.model_validate(outcome.post)


@router.delete("/{post_id}", status_code=status.HTTP_200_OK)
async def delete_post(
    post_id: UUID,
    current_user: CurrentUser,
    session: DatabaseSession,
    delete_from_linkedin: bool = False,
) -> dict[str, str]:
    result = await session.execute(
        select(Post).where(Post.id == post_id, Post.user_id == current_user.id)
    )
    post = result.scalar_one_or_none()
    if post is None:
        raise HTTPException(status_code=404, detail="Post not found")

    if delete_from_linkedin and post.linkedin_post_urn:
        account = await _owned_account(session, current_user, post.account_id)
        if account is not None and account.status == "active":
            settings = get_settings()
            try:
                token = TokenCipher(settings.linkedin_token_encryption_keys).decrypt(
                    account.access_token_encrypted
                )
                linkedin_client = LinkedInPublishingClient(settings)
                await linkedin_client.delete_post(
                    access_token=token,
                    post_urn=post.linkedin_post_urn,
                )
            except TokenDecryptionError as exc:
                logger.warning("Token decryption failed during post deletion post_id=%s", post.id)
                raise HTTPException(
                    status_code=500, detail="Stored LinkedIn credentials could not be read"
                ) from exc
            except LinkedInPublishError as exc:
                logger.warning(
                    "LinkedIn post deletion failed post_id=%s status=%s",
                    post.id,
                    exc.status_code,
                )
                raise HTTPException(
                    status_code=502,
                    detail=f"Could not delete post from LinkedIn: {exc.public_message}",
                ) from exc

    await session.delete(post)
    await session.commit()
    return {"message": "Post deleted successfully"}


@router.post("/{post_id}/publish", response_model=PostResponse)
async def publish_post_now(
    post_id: UUID,
    current_user: CurrentUser,
    session: DatabaseSession,
    payload: PublishPostRequest | None = None,
) -> PostResponse:
    """Publish immediately — works for draft, scheduled, failed, etc."""
    result = await session.execute(
        select(Post).where(Post.id == post_id, Post.user_id == current_user.id)
    )
    post = result.scalar_one_or_none()
    if post is None:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.status == "published":
        raise HTTPException(status_code=400, detail="Post is already published")

    body_account_id = payload.account_id if payload is not None else None
    target_account_id = body_account_id or post.account_id
    if target_account_id is None:
        raise HTTPException(status_code=422, detail="Select a LinkedIn account")

    account = await _owned_account(session, current_user, target_account_id)
    if account is None:
        raise HTTPException(status_code=404, detail="LinkedIn account not found")

    try:
        outcome = await publish_post_to_linkedin(session, post=post, account=account)
    except PostPublishError as exc:
        raise HTTPException(status_code=exc.http_status, detail=exc.message) from exc

    return PostResponse.model_validate(outcome.post)


@router.patch("/{post_id}", response_model=PostResponse)
async def update_post(
    post_id: UUID,
    payload: UpdatePostRequest,
    current_user: CurrentUser,
    session: DatabaseSession,
) -> PostResponse:
    result = await session.execute(
        select(Post).where(Post.id == post_id, Post.user_id == current_user.id)
    )
    post = result.scalar_one_or_none()
    if post is None:
        raise HTTPException(status_code=404, detail="Post not found")

    if payload.account_id is not None:
        account = await _owned_account(session, current_user, payload.account_id)
        if account is None:
            raise HTTPException(status_code=404, detail="LinkedIn account not found")
        post.account_id = account.id

    if payload.scheduled_for is not None:
        now = datetime.now(UTC)
        if payload.scheduled_for.tzinfo is None:
            raise HTTPException(status_code=422, detail="Select a scheduled date and time")
        scheduled_utc = ensure_utc(payload.scheduled_for)
        if scheduled_utc < now:
            raise HTTPException(status_code=422, detail="Scheduled time cannot be in the past")
        if scheduled_utc > now + timedelta(days=366):
            raise HTTPException(status_code=422, detail="Scheduled time is too far in the future")
        post.scheduled_for = scheduled_utc
        post.status = "scheduled"

    if payload.status is not None:
        if payload.status in {"draft", "scheduled", "published", "failed"}:
            post.status = payload.status

    if payload.commentary is not None:
        if len(payload.commentary) > 3000:
            raise HTTPException(status_code=422, detail="Post text cannot exceed 3,000 characters")
        post.commentary = payload.commentary

    if payload.editor_delta is not None:
        post.editor_delta = payload.editor_delta

    if payload.first_comment is not None:
        post.first_comment = payload.first_comment

    if payload.article_source is not None:
        post.article_source = payload.article_source

    if payload.article_title is not None:
        post.article_title = payload.article_title

    if payload.article_description is not None:
        post.article_description = payload.article_description

    if payload.content_type is not None:
        if payload.content_type in VALID_CONTENT_TYPES:
            post.content_type = payload.content_type

    await session.commit()
    await session.refresh(post)
    return PostResponse.model_validate(post)


@router.get("/{post_id}/analytics", response_model=PostAnalyticsResponse)
async def get_post_analytics_route(
    post_id: UUID,
    current_user: CurrentUser,
    session: DatabaseSession,
) -> PostAnalyticsResponse:
    post = await _owned_post(session, current_user, post_id)
    if post is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    if post.status != "published" or not post.linkedin_post_urn or not post.account_id:
        return PostAnalyticsResponse(
            post_id=post.id,
            likes_count=0,
            comments_count=0,
            reposts_count=0,
            impressions_count=0,
        )

    account = await _owned_account(session, current_user, post.account_id)
    if account is None or account.status != "active":
        return PostAnalyticsResponse(
            post_id=post.id,
            likes_count=0,
            comments_count=0,
            reposts_count=0,
            impressions_count=0,
        )

    settings = get_settings()
    try:
        token = TokenCipher(settings.linkedin_token_encryption_keys).decrypt(account.access_token_encrypted)
        client = LinkedInPublishingClient(settings)
        data = await client.get_post_analytics(access_token=token, post_urn=post.linkedin_post_urn)
        return PostAnalyticsResponse(
            post_id=post.id,
            likes_count=data.get("likes_count", 0),
            comments_count=data.get("comments_count", 0),
            reposts_count=data.get("reposts_count", 0),
            impressions_count=data.get("impressions_count", 0),
        )
    except Exception as exc:
        logger.warning("Failed to fetch analytics for post_id=%s exc=%s", post.id, exc)
        return PostAnalyticsResponse(
            post_id=post.id,
            likes_count=0,
            comments_count=0,
            reposts_count=0,
            impressions_count=0,
        )


@router.get("/{post_id}/comments", response_model=PostCommentsResponse)
async def get_post_comments_route(
    post_id: UUID,
    current_user: CurrentUser,
    session: DatabaseSession,
) -> PostCommentsResponse:
    post = await _owned_post(session, current_user, post_id)
    if post is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    if post.status != "published" or not post.linkedin_post_urn or not post.account_id:
        return PostCommentsResponse(post_id=post.id, comments=[])

    account = await _owned_account(session, current_user, post.account_id)
    if account is None or account.status != "active":
        return PostCommentsResponse(post_id=post.id, comments=[])

    settings = get_settings()
    try:
        token = TokenCipher(settings.linkedin_token_encryption_keys).decrypt(account.access_token_encrypted)
        client = LinkedInPublishingClient(settings)
        raw_comments = await client.get_post_comments(access_token=token, post_urn=post.linkedin_post_urn)
        items: list[PostCommentItem] = []
        for c in raw_comments:
            comment_id = str(c.get("id") or "")
            actor_urn = str(c.get("actor_urn") or "")
            actor_name = str(c.get("actor_name")) if c.get("actor_name") is not None else None
            text = str(c.get("text") or "")
            created_at = str(c["created_at"]) if "created_at" in c and c["created_at"] is not None else None
            items.append(
                PostCommentItem(
                    id=comment_id,
                    actor_urn=actor_urn,
                    actor_name=actor_name,
                    text=text,
                    created_at=created_at,
                )
            )
        return PostCommentsResponse(post_id=post.id, comments=items)
    except Exception as exc:
        logger.warning("Failed to fetch comments for post_id=%s exc=%s", post.id, exc)
        return PostCommentsResponse(post_id=post.id, comments=[])


@router.post("/{post_id}/comments", response_model=PostCommentItem)
async def add_post_comment_route(
    post_id: UUID,
    body: CreateCommentRequest,
    current_user: CurrentUser,
    session: DatabaseSession,
) -> PostCommentItem:
    post = await _owned_post(session, current_user, post_id)
    if post is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    if post.status != "published" or not post.linkedin_post_urn or not post.account_id:
        raise HTTPException(status_code=400, detail="Post is not published on LinkedIn")

    account = await _owned_account(session, current_user, post.account_id)
    if account is None or account.status != "active":
        raise HTTPException(status_code=400, detail="LinkedIn account is not active")

    settings = get_settings()
    token = TokenCipher(settings.linkedin_token_encryption_keys).decrypt(account.access_token_encrypted)
    client = LinkedInPublishingClient(settings)
    target_urn = body.parent_comment_urn or post.linkedin_post_urn
    res = await client.create_first_comment(
        access_token=token,
        owner_urn=f"urn:li:person:{account.provider_account_id}",
        post_urn=target_urn,
        text=body.text,
    )
    return PostCommentItem(
        id=res.comment_id,
        actor_urn=f"urn:li:person:{account.provider_account_id}",
        actor_name=account.display_name,
        text=body.text,
        created_at=int(datetime.now(UTC).timestamp() * 1000),
    )


@router.post("/rewrite-ai", response_model=RewritePostResponse)
async def rewrite_post_with_ai(
    body: RewritePostRequest,
    current_user: CurrentUser,
) -> RewritePostResponse:
    text = body.commentary.strip() if body.commentary else ""
    link = body.article_source.strip() if body.article_source else ""

    if not text and not link:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Write some post text or add an article link to rewrite.",
        )

    try:
        require_gemini_key()
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI rewrite is not configured",
        ) from exc

    logger.info(
        "Rewrite-with-AI requested by user_id=%s chars=%s creative=%s",
        current_user.id,
        len(text),
        body.creative,
    )

    try:
        formatted = await rewrite_linkedin_post(
            commentary=text,
            article_source=link or None,
            creative=body.creative,
            user_id=current_user.id,
        )
    except Exception as exc:
        message = humanize_rewrite_error(exc)
        if is_rate_limit_error(exc) or is_unavailable_error(exc):
            logger.warning("Rewrite-with-AI unavailable: %s", message)
            code = (
                status.HTTP_429_TOO_MANY_REQUESTS
                if is_rate_limit_error(exc)
                else status.HTTP_503_SERVICE_UNAVAILABLE
            )
        elif is_timeout_error(exc):
            logger.warning("Rewrite-with-AI timed out: %s", message)
            code = status.HTTP_504_GATEWAY_TIMEOUT
        else:
            logger.exception("Rewrite-with-AI failed: %s", exc)
            code = status.HTTP_502_BAD_GATEWAY
        raise HTTPException(status_code=code, detail=message) from exc

    return RewritePostResponse(
        rewritten_commentary=formatted.commentary,
        rewritten_editor_delta=formatted.editor_delta,
        html=formatted.html,
    )

