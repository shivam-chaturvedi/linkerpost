from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified

from agents.linkerpost_ai_content_planner.database.repository import schedule_run_posts_to_calendar
from agents.linkerpost_ai_content_planner.presentation import library_run_fields, public_agent_output
from agents.registry import CATALOG_AGENT, run_registered_agent
from agents.rewrite_with_ai.errors import (
    is_rate_limit_error,
    is_timeout_error,
    is_unavailable_error,
    retry_wait_seconds,
)
from app.api.dependencies import get_current_user
from app.db.session import get_db_session
from app.models.agent import Agent, AgentRun, AgentUserSettings
from app.models.user import User
from app.services.notifications import AUTO_PUBLISH_MODE, create_user_notification
from app.schemas.agent import (
    AgentResponse,
    AgentRunResponse,
    AgentRunsResponse,
    AgentsResponse,
    CreateAgentRequest,
    LibraryResponse,
    LibraryRunItem,
    RunAgentRequest,
    ScheduleAgentRunResponse,
    UpdateAgentRequest,
)
from app.schemas.post import PostResponse

router = APIRouter(prefix="/agents", tags=["agents"])


async def _ensure_catalog_agent(session: AsyncSession) -> Agent:
    existing = await session.get(Agent, CATALOG_AGENT["id"])
    if existing:
        if existing.mode != AUTO_PUBLISH_MODE:
            existing.mode = AUTO_PUBLISH_MODE
            await session.commit()
            await session.refresh(existing)
        return existing
    named = (
        await session.execute(select(Agent).where(Agent.agent_name == CATALOG_AGENT["agent_name"]))
    ).scalar_one_or_none()
    if named:
        return named
    agent = Agent(
        id=CATALOG_AGENT["id"],
        user_id=None,
        agent_name=str(CATALOG_AGENT["agent_name"]),
        key=str(CATALOG_AGENT["key"]),
        name=str(CATALOG_AGENT["name"]),
        description=str(CATALOG_AGENT["description"]),
        needs=str(CATALOG_AGENT["needs"]),
        persona=str(CATALOG_AGENT["persona"]),
        mode=AUTO_PUBLISH_MODE,
        is_active=True,
        auto_save_to_library=True,
        notify_on_completion=True,
        total_runs=0,
        run_cadence_datetimes=[],
    )
    session.add(agent)
    await session.commit()
    await session.refresh(agent)
    return agent


async def _owned_or_catalog_agent(
    session: AsyncSession, current_user: User, agent_id: UUID
) -> Agent:
    agent = (
        await session.execute(
            select(Agent).where(
                Agent.id == agent_id,
                (Agent.user_id.is_(None)) | (Agent.user_id == current_user.id),
            )
        )
    ).scalar_one_or_none()
    if agent is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found")
    return agent


async def _settings_map(session: AsyncSession, user_id: UUID) -> dict[UUID, AgentUserSettings]:
    rows = list(
        (
            await session.execute(
                select(AgentUserSettings).where(AgentUserSettings.user_id == user_id)
            )
        ).scalars().all()
    )
    return {row.agent_id: row for row in rows}


async def _settings_for(
    session: AsyncSession, user_id: UUID, agent_id: UUID
) -> AgentUserSettings | None:
    return (
        await session.execute(
            select(AgentUserSettings).where(
                AgentUserSettings.user_id == user_id,
                AgentUserSettings.agent_id == agent_id,
            )
        )
    ).scalar_one_or_none()


def _serialize_agent(agent: Agent, settings: AgentUserSettings | None) -> AgentResponse:
    payload = AgentResponse.model_validate(agent)
    payload.mode = AUTO_PUBLISH_MODE
    if settings is not None:
        payload.is_active = settings.is_active
        payload.auto_save_to_library = settings.auto_save_to_library
        payload.notify_on_completion = settings.notify_on_completion
        payload.next_run = settings.next_run
        payload.run_cadence_datetimes = list(settings.run_cadence_datetimes or [])
    return payload


async def _upsert_settings(
    session: AsyncSession,
    user: User,
    agent: Agent,
    payload: UpdateAgentRequest,
) -> AgentUserSettings:
    settings = await _settings_for(session, user.id, agent.id)
    if settings is None:
        settings = AgentUserSettings(
            user_id=user.id,
            agent_id=agent.id,
            is_active=agent.is_active,
            auto_save_to_library=agent.auto_save_to_library,
            notify_on_completion=agent.notify_on_completion,
            next_run=agent.next_run,
            run_cadence_datetimes=list(agent.run_cadence_datetimes or []),
        )
        session.add(settings)
    if payload.is_active is not None:
        settings.is_active = payload.is_active
        if agent.user_id == user.id:
            agent.is_active = payload.is_active
    if payload.auto_save_to_library is not None:
        settings.auto_save_to_library = payload.auto_save_to_library
        if agent.user_id == user.id:
            agent.auto_save_to_library = payload.auto_save_to_library
    if payload.notify_on_completion is not None:
        settings.notify_on_completion = payload.notify_on_completion
        if agent.user_id == user.id:
            agent.notify_on_completion = payload.notify_on_completion
    if payload.next_run is not None:
        settings.next_run = payload.next_run
        if agent.user_id == user.id:
            agent.next_run = payload.next_run
    if payload.run_cadence_datetimes is not None:
        settings.run_cadence_datetimes = payload.run_cadence_datetimes
        if agent.user_id == user.id:
            agent.run_cadence_datetimes = payload.run_cadence_datetimes
    agent.mode = AUTO_PUBLISH_MODE
    return settings


@router.get("", response_model=AgentsResponse)
async def list_agents(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> AgentsResponse:
    await _ensure_catalog_agent(session)
    query = (
        select(Agent)
        .where((Agent.user_id.is_(None)) | (Agent.user_id == current_user.id))
        .order_by(Agent.created_at.asc())
    )
    agents = list((await session.execute(query)).scalars().all())
    settings_by_agent = await _settings_map(session, current_user.id)
    return AgentsResponse(
        agents=[_serialize_agent(agent, settings_by_agent.get(agent.id)) for agent in agents]
    )


@router.post("", response_model=AgentResponse, status_code=status.HTTP_201_CREATED)
async def create_agent(
    payload: CreateAgentRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> AgentResponse:
    slug = payload.agent_name.strip().lower().replace(" ", "_")
    agent = Agent(
        user_id=current_user.id,
        agent_name=slug,
        key=slug,
        name=payload.name,
        description=payload.description,
        needs=payload.needs,
        persona=payload.persona,
        mode=AUTO_PUBLISH_MODE,
        is_active=payload.is_active,
        auto_save_to_library=payload.auto_save_to_library,
        notify_on_completion=payload.notify_on_completion,
        total_runs=0,
        run_cadence_datetimes=payload.run_cadence_datetimes,
    )
    session.add(agent)
    await session.commit()
    await session.refresh(agent)
    return AgentResponse.model_validate(agent)


@router.patch("/{agent_id}", response_model=AgentResponse)
async def update_agent(
    agent_id: UUID,
    payload: UpdateAgentRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> AgentResponse:
    agent = await _owned_or_catalog_agent(session, current_user, agent_id)
    if payload.name is not None and agent.user_id == current_user.id:
        agent.name = payload.name
    if payload.description is not None and agent.user_id == current_user.id:
        agent.description = payload.description
    settings = await _upsert_settings(session, current_user, agent, payload)
    await session.commit()
    await session.refresh(agent)
    return _serialize_agent(agent, settings)


@router.delete("/{agent_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_agent(
    agent_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> None:
    agent = await _owned_or_catalog_agent(session, current_user, agent_id)
    if agent.user_id is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Catalog agents cannot be deleted")
    await session.delete(agent)
    await session.commit()


@router.get("/library", response_model=LibraryResponse)
async def list_library_runs(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> LibraryResponse:
    await _ensure_catalog_agent(session)
    rows = list(
        (
            await session.execute(
                select(AgentRun, Agent)
                .join(Agent, Agent.id == AgentRun.agent_id)
                .where(
                    AgentRun.user_id == current_user.id,
                    AgentRun.saved_to_library.is_(True),
                )
                .order_by(AgentRun.created_at.desc())
                .limit(200)
            )
        ).all()
    )
    items: list[LibraryRunItem] = []
    for run, agent in rows:
        fields = library_run_fields(run.output)
        items.append(
            LibraryRunItem(
                id=run.id,
                run_id=run.run_id,
                agent_id=run.agent_id,
                agent_name=agent.agent_name,
                agent_display_name=agent.name,
                agent_description=agent.description,
                agent_needs=agent.needs,
                input=run.input,
                status=run.status,
                error_message=run.error_message,
                created_at=run.created_at,
                title=fields["title"],
                model=fields["model"],
                post_count=int(fields["post_count"]),
                calendar_scheduled=bool(fields["calendar_scheduled"]),
            )
        )
    return LibraryResponse(runs=items)


@router.get("/{agent_id}/runs", response_model=AgentRunsResponse)
async def list_agent_runs(
    agent_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> AgentRunsResponse:
    await _owned_or_catalog_agent(session, current_user, agent_id)
    query = (
        select(AgentRun)
        .where(AgentRun.agent_id == agent_id, AgentRun.user_id == current_user.id)
        .order_by(AgentRun.created_at.desc())
        .limit(100)
    )
    runs = list((await session.execute(query)).scalars().all())
    summaries: list[AgentRunResponse] = []
    for run in runs:
        summaries.append(
            AgentRunResponse(
                id=run.id,
                run_id=run.run_id,
                user_id=run.user_id,
                agent_id=run.agent_id,
                input=run.input,
                output=None,
                status=run.status,
                error_message=run.error_message,
                created_at=run.created_at,
            )
        )
    return AgentRunsResponse(runs=summaries)


@router.get("/{agent_id}/runs/{run_id}", response_model=AgentRunResponse)
async def get_agent_run(
    agent_id: UUID,
    run_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> AgentRunResponse:
    await _owned_or_catalog_agent(session, current_user, agent_id)
    run = (
        await session.execute(
            select(AgentRun).where(
                AgentRun.run_id == run_id,
                AgentRun.agent_id == agent_id,
                AgentRun.user_id == current_user.id,
            )
        )
    ).scalar_one_or_none()
    if run is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent run not found")
    payload = AgentRunResponse.model_validate(run)
    if isinstance(payload.output, dict):
        payload.output = public_agent_output(payload.output)
    return payload


@router.post("/{agent_id}/runs/{run_id}/calendar", response_model=ScheduleAgentRunResponse)
async def schedule_agent_run_to_calendar(
    agent_id: UUID,
    run_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> ScheduleAgentRunResponse:
    await _owned_or_catalog_agent(session, current_user, agent_id)
    run = (
        await session.execute(
            select(AgentRun).where(
                AgentRun.run_id == run_id,
                AgentRun.agent_id == agent_id,
                AgentRun.user_id == current_user.id,
            )
        )
    ).scalar_one_or_none()
    if run is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent run not found")
    output = run.output if isinstance(run.output, dict) else {}
    posts_payload = list(output.get("posts") or [])
    if not posts_payload:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="This run has no generated posts to add to the calendar",
        )
    created, already = await schedule_run_posts_to_calendar(
        session,
        user_id=current_user.id,
        run_id=run_id,
        posts_payload=posts_payload,
    )
    if not created:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No valid posts were found in this run",
        )
    output = public_agent_output(output)
    output["calendar_scheduled"] = True
    output["calendar_post_ids"] = [str(post.id) for post in created]
    run.output = output
    flag_modified(run, "output")
    await session.commit()
    for post in created:
        await session.refresh(post)
    return ScheduleAgentRunResponse(
        posts=[PostResponse.model_validate(post) for post in created],
        already_scheduled=already,
    )


@router.post("/{agent_id}/run", response_model=AgentRunResponse)
async def run_agent_endpoint(
    agent_id: UUID,
    payload: RunAgentRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> AgentRunResponse:
    agent = await _owned_or_catalog_agent(session, current_user, agent_id)
    settings = await _settings_for(session, current_user.id, agent.id)
    is_active = settings.is_active if settings is not None else agent.is_active
    if not is_active:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This agent is paused")

    existing: AgentRun | None = None
    if payload.run_id is not None:
        existing = (
            await session.execute(
                select(AgentRun).where(
                    AgentRun.run_id == payload.run_id,
                    AgentRun.agent_id == agent.id,
                    AgentRun.user_id == current_user.id,
                )
            )
        ).scalar_one_or_none()
        if existing is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent run not found")
        run_uuid = existing.run_id
        previous_output = existing.output if isinstance(existing.output, dict) else {}
        user_input = str(previous_output.get("combined_input") or existing.input or payload.input).strip()
        stored_round = int(previous_output.get("follow_up_round") or 0)
        follow_up_round = max(payload.follow_up_round, stored_round)
    else:
        run_uuid = uuid4()
        user_input = payload.input.strip()
        follow_up_round = payload.follow_up_round

    previous_status = existing.status if existing else None
    answers = [item.model_dump() for item in payload.answers]
    try:
        output = await run_registered_agent(
            agent.agent_name,
            user_id=current_user.id,
            user_input=user_input,
            run_id=run_uuid,
            answers=answers,
            follow_up_round=follow_up_round,
        )
        status_value = str(output.get("status") or "completed") if isinstance(output, dict) else "completed"
        error_message = output.get("error_message") if isinstance(output, dict) else None
        stored_input = str((output.get("combined_input") if isinstance(output, dict) else None) or user_input)
    except KeyError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        raw = str(exc)
        if is_timeout_error(exc) or "deadline expired" in raw.lower():
            friendly = (
                "The AI timed out before finishing this run. "
                "Try a shorter brief, or run again in a moment."
            )
        elif is_rate_limit_error(exc):
            wait = retry_wait_seconds(raw)
            friendly = (
                f"The AI is rate-limited. Wait about {wait}s, then try again."
                if wait
                else "The AI is rate-limited right now. Please try again shortly."
            )
        elif is_unavailable_error(exc):
            friendly = "The AI is temporarily unavailable. Please try again in a moment."
        else:
            friendly = raw
        output = {"status": "failed", "error_message": friendly}
        status_value = "failed"
        error_message = friendly
        stored_input = user_input

    if existing:
        existing.input = stored_input
        existing.output = output
        existing.status = status_value
        existing.error_message = str(error_message) if error_message else None
        run = existing
    else:
        run = AgentRun(
            id=uuid4(),
            run_id=run_uuid,
            user_id=current_user.id,
            agent_id=agent.id,
            input=stored_input,
            output=output,
            status=status_value,
            error_message=str(error_message) if error_message else None,
        )
        session.add(run)

    auto_save = settings.auto_save_to_library if settings is not None else agent.auto_save_to_library
    notify = settings.notify_on_completion if settings is not None else agent.notify_on_completion
    finished = status_value not in {"awaiting_input"}
    just_finished = finished and previous_status in {None, "awaiting_input"}
    run.saved_to_library = bool(auto_save) and status_value == "completed"
    if just_finished:
        agent.total_runs += 1
        if notify:
            if status_value == "completed":
                title = f"{agent.name} finished"
                body = "Your agent run completed. Open Library or previous runs to review the output."
                if run.saved_to_library:
                    body = "Your agent run completed and was saved to Library."
            else:
                title = f"{agent.name} failed"
                body = str(error_message or "The agent run did not complete.")
            await session.flush()
            await create_user_notification(
                session,
                user_id=current_user.id,
                title=title,
                body=body,
                kind="agent_run",
                agent_id=agent.id,
                run_id=run.run_id,
            )
    await session.commit()
    await session.refresh(run)
    return AgentRunResponse.model_validate(run)
