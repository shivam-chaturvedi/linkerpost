from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict

PostStatus = Literal["draft", "scheduled", "publishing", "published", "failed"]
PostContentType = Literal["text", "image", "video", "document", "article"]


class PostResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    account_id: UUID | None
    status: PostStatus
    content_type: PostContentType
    commentary: str
    editor_delta: str | None
    first_comment: str | None
    first_comment_status: Literal["pending", "published", "failed"] | None
    first_comment_error: str | None
    article_source: str | None
    article_title: str | None
    article_description: str | None
    media_filename: str | None
    media_content_type: str | None
    media_size: int | None
    linkedin_media_urn: str | None
    linkedin_post_urn: str | None
    linkedin_comment_id: str | None
    linkedin_comment_urn: str | None
    scheduled_for: datetime | None
    published_at: datetime | None
    failure_reason: str | None
    created_at: datetime
    updated_at: datetime


class PostsResponse(BaseModel):
    posts: list[PostResponse]


class UpdatePostRequest(BaseModel):
    scheduled_for: datetime | None = None
    account_id: UUID | None = None
    status: PostStatus | None = None
    commentary: str | None = None
    editor_delta: str | None = None
    first_comment: str | None = None
    article_source: str | None = None
    article_title: str | None = None
    article_description: str | None = None
    content_type: PostContentType | None = None


class PostAnalyticsResponse(BaseModel):
    post_id: UUID
    likes_count: int = 0
    comments_count: int = 0
    reposts_count: int = 0
    impressions_count: int = 0


class PostCommentItem(BaseModel):
    id: str
    actor_urn: str
    actor_name: str | None = None
    text: str
    created_at: int | str | None = None


class PostCommentsResponse(BaseModel):
    post_id: UUID
    comments: list[PostCommentItem]


class CreateCommentRequest(BaseModel):
    text: str
    parent_comment_urn: str | None = None


class RewritePostRequest(BaseModel):
    commentary: str
    article_source: str | None = None
    editor_delta: str | None = None
    creative: bool = False


class RewritePostResponse(BaseModel):
    rewritten_commentary: str
    rewritten_editor_delta: str | None = None
    html: str | None = None


class PublishPostRequest(BaseModel):
    account_id: UUID | None = None

