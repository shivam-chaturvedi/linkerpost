from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.post import PostResponse

AgentMode = Literal["Draft only", "Auto publish", "Approval required"]
AgentPersona = Literal["creator", "hr", "custom"]


class AgentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID | None
    agent_name: str
    key: str
    name: str
    description: str
    needs: str
    persona: str
    mode: AgentMode
    is_active: bool
    auto_save_to_library: bool
    notify_on_completion: bool
    total_runs: int
    next_run: datetime | None
    run_cadence_datetimes: list[str]
    created_at: datetime
    updated_at: datetime


class AgentsResponse(BaseModel):
    agents: list[AgentResponse]


class CreateAgentRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    agent_name: str = Field(min_length=1, max_length=64)
    description: str = ""
    needs: str = ""
    persona: AgentPersona = "creator"
    mode: AgentMode = "Auto publish"
    is_active: bool = True
    auto_save_to_library: bool = True
    notify_on_completion: bool = True
    run_cadence_datetimes: list[str] = Field(default_factory=list)


class UpdateAgentRequest(BaseModel):
    name: str | None = None
    description: str | None = None
    needs: str | None = None
    mode: AgentMode | None = None
    is_active: bool | None = None
    auto_save_to_library: bool | None = None
    notify_on_completion: bool | None = None
    next_run: datetime | None = None
    run_cadence_datetimes: list[str] | None = None


class FollowUpAnswer(BaseModel):
    field_key: str = Field(min_length=1, max_length=64)
    question: str = ""
    answer: str = Field(min_length=1, max_length=2000)


class RunAgentRequest(BaseModel):
    input: str = Field(min_length=1, max_length=500_000)
    run_id: UUID | None = None
    answers: list[FollowUpAnswer] = Field(default_factory=list)
    follow_up_round: int = Field(default=0, ge=0, le=8)


class ScheduleAgentRunResponse(BaseModel):
    posts: list[PostResponse]
    already_scheduled: bool


class AgentRunResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    run_id: UUID
    user_id: UUID
    agent_id: UUID
    input: str
    output: Any
    status: str
    error_message: str | None
    saved_to_library: bool = False
    created_at: datetime


class AgentRunsResponse(BaseModel):
    runs: list[AgentRunResponse]


class LibraryRunItem(BaseModel):
    id: UUID
    run_id: UUID
    agent_id: UUID
    agent_name: str
    agent_display_name: str
    agent_description: str
    agent_needs: str
    input: str
    status: str
    error_message: str | None
    created_at: datetime
    title: str | None = None
    model: str | None = None
    post_count: int = 0
    calendar_scheduled: bool = False


class LibraryResponse(BaseModel):
    runs: list[LibraryRunItem]
