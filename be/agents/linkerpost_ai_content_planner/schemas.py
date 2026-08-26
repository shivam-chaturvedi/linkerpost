from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator

from agents.tools.search import SearchHit as SearchHit

LINKEDIN_MAX_CHARS = 3000
FIRST_COMMENT_MAX_CHARS = 1250


class ScheduleConfig(BaseModel):
    initial_delay_days: int = Field(default=0, ge=0, le=30)
    interval_days: int = Field(default=1, ge=1, le=14)
    preferred_time: str = Field(default="10:00")
    timezone: str = Field(default="Asia/Kolkata")
    start_date: str | None = None

    @field_validator("preferred_time")
    @classmethod
    def validate_preferred_time(cls, value: str) -> str:
        parts = value.split(":")
        if len(parts) != 2:
            raise ValueError("preferred_time must use HH:MM")
        hour, minute = int(parts[0]), int(parts[1])
        if hour < 0 or hour > 23 or minute < 0 or minute > 59:
            raise ValueError("preferred_time must be a valid 24-hour time")
        return f"{hour:02d}:{minute:02d}"


class ContentStyle(BaseModel):
    tone: str = "professional"
    audience: str = "professionals"
    technical_depth: int = Field(default=5, ge=0, le=10)
    creativity: int = Field(default=5, ge=0, le=10)
    controversy: int = Field(default=1, ge=0, le=10)


class VariationConfig(BaseModel):
    content_relationship_score: int = Field(default=3, ge=0, le=10)


class SourceRequirements(BaseModel):
    latest_news: bool = True
    latest_blogs: bool = True
    official_documentation: bool = True
    research_papers: bool = False


class MediaConfig(BaseModel):
    images: bool = True
    videos: bool = True
    articles: bool = True


class FollowUpQuestion(BaseModel):
    field_key: str = Field(min_length=1, max_length=40)
    question: str = Field(min_length=8, max_length=220)
    placeholder: str = Field(default="", max_length=120)
    # Clickable answer chips shown under the input (user can click or type).
    suggestions: list[str] = Field(default_factory=list, max_length=4)
    input_type: Literal["text", "number"] = "text"

    @field_validator("suggestions")
    @classmethod
    def clean_suggestions(cls, value: list[str]) -> list[str]:
        cleaned: list[str] = []
        for item in value:
            text = " ".join(str(item or "").split()).strip()
            if not text or text in cleaned:
                continue
            cleaned.append(text[:120])
            if len(cleaned) >= 4:
                break
        return cleaned


class RequirementsIntake(BaseModel):
    is_complete: bool
    questions: list[FollowUpQuestion] = Field(default_factory=list, max_length=4)


class ContentPlan(BaseModel):
    topic: str
    niche: str = ""
    description: str = ""
    duration_days: int = Field(default=7, ge=1, le=30)
    posts_per_day: int = Field(default=1, ge=1, le=3)
    schedule: ScheduleConfig = Field(default_factory=ScheduleConfig)
    content_style: ContentStyle = Field(default_factory=ContentStyle)
    variation: VariationConfig = Field(default_factory=VariationConfig)
    source_requirements: SourceRequirements = Field(default_factory=SourceRequirements)
    media: MediaConfig = Field(default_factory=MediaConfig)
    user_constraints: list[str] = Field(default_factory=list)

    @property
    def total_posts(self) -> int:
        return min(self.duration_days * self.posts_per_day, 30)


class SearchQueryPlan(BaseModel):
    queries: list[str] = Field(min_length=1, max_length=16)


class SourceDocument(BaseModel):
    source_key: str
    url: str
    title: str = ""
    description: str = ""
    content: str = ""
    author: str | None = None
    published_at: str | None = None
    source_name: str = ""
    images: list[str] = Field(default_factory=list)
    videos: list[str] = Field(default_factory=list)
    language: str = "en"
    fetch_method: str = "http"


class SourceScores(BaseModel):
    relevance: float = Field(default=0, ge=0, le=10)
    recency: float = Field(default=0, ge=0, le=10)
    authority: float = Field(default=0, ge=0, le=10)
    content_quality: float = Field(default=0, ge=0, le=10)
    final_score: float = Field(default=0, ge=0, le=10)


class RankedSource(SourceDocument):
    scores: SourceScores = Field(default_factory=SourceScores)


class StrategyItem(BaseModel):
    day: int = Field(ge=1)
    angle: str
    source_ids: list[str] = Field(default_factory=list)
    media_focus: Literal["image", "video", "article", "none"] = "image"


class LinkedInPostDraft(BaseModel):
    day: int = Field(ge=1)
    title: str = Field(min_length=1, max_length=220)
    content: str = Field(min_length=40, max_length=LINKEDIN_MAX_CHARS)
    first_comment: str | None = None
    source_ids: list[str] = Field(default_factory=list)
    angle: str = ""
    images: list[str] = Field(default_factory=list)
    videos: list[str] = Field(default_factory=list)
    articles: list[str] = Field(default_factory=list)
    scheduled_at: datetime | None = None

    @field_validator("first_comment")
    @classmethod
    def validate_first_comment(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip() or None
        if cleaned and len(cleaned) > FIRST_COMMENT_MAX_CHARS:
            raise ValueError("first_comment exceeds LinkedIn limit")
        return cleaned
