from uuid import uuid4

from agents.registry import AI_CONTENT_PLANNER, AI_CONTENT_PLANNER_ID, get_agent_runner
from app.schemas.agent import (
    AgentResponse,
    AgentRunResponse,
    AgentsResponse,
    CreateAgentRequest,
    LibraryResponse,
    LibraryRunItem,
    RunAgentRequest,
    UpdateAgentRequest,
)


def test_agent_pydantic_schemas() -> None:
    user_id = uuid4()
    agent_id = AI_CONTENT_PLANNER_ID

    req = CreateAgentRequest(
        name="AI Content Planner",
        agent_name=AI_CONTENT_PLANNER,
        description="Sourced LinkedIn calendar",
        needs="Topic brief",
        persona="creator",
        mode="Auto publish",
        is_active=True,
        auto_save_to_library=True,
        notify_on_completion=True,
        run_cadence_datetimes=["2026-08-18T09:00:00Z"],
    )
    assert req.agent_name == "ai_content_planner"

    resp = AgentResponse(
        id=agent_id,
        user_id=user_id,
        agent_name=AI_CONTENT_PLANNER,
        key=AI_CONTENT_PLANNER,
        name=req.name,
        description=req.description,
        needs=req.needs,
        persona=req.persona,
        mode=req.mode,
        is_active=req.is_active,
        auto_save_to_library=req.auto_save_to_library,
        notify_on_completion=req.notify_on_completion,
        total_runs=0,
        next_run=None,
        run_cadence_datetimes=req.run_cadence_datetimes,
        created_at="2026-08-17T00:00:00Z",
        updated_at="2026-08-17T00:00:00Z",
    )
    assert resp.id == agent_id
    assert resp.agent_name == "ai_content_planner"
    assert AgentsResponse(agents=[resp]).agents[0].name == "AI Content Planner"

    update_req = UpdateAgentRequest(notify_on_completion=True, is_active=False)
    assert update_req.notify_on_completion is True
    assert update_req.is_active is False

    run_req = RunAgentRequest(input="Plan 7 days of posts about AI agents")
    assert run_req.input.startswith("Plan 7 days")
    follow = RunAgentRequest(
        input="Plan 7 days of posts about AI agents",
        answers=[{"field_key": "tone", "question": "What tone should we use?", "answer": "professional"}],
        follow_up_round=1,
    )
    assert follow.answers[0].answer == "professional"
    run = AgentRunResponse(
        id=uuid4(),
        run_id=uuid4(),
        user_id=user_id,
        agent_id=agent_id,
        input=run_req.input,
        output={"status": "completed", "posts": []},
        status="completed",
        error_message=None,
        created_at="2026-08-17T00:00:00Z",
    )
    assert run.output["status"] == "completed"

    library_item = LibraryRunItem(
        id=uuid4(),
        run_id=uuid4(),
        agent_id=agent_id,
        agent_name=AI_CONTENT_PLANNER,
        agent_display_name="AI Content Planner",
        agent_description="Sourced LinkedIn calendar",
        agent_needs="Topic brief",
        input=run_req.input,
        status="completed",
        error_message=None,
        created_at="2026-08-17T00:00:00Z",
        title="Health for Youth",
        model="gemini-3.7-flash",
        post_count=3,
        calendar_scheduled=False,
    )
    assert LibraryResponse(runs=[library_item]).runs[0].agent_name == AI_CONTENT_PLANNER

    try:
        get_agent_runner("unknown_agent")
    except KeyError as exc:
        assert "unknown_agent" in str(exc)
    else:
        raise AssertionError("unregistered agent names must fail lookup")
