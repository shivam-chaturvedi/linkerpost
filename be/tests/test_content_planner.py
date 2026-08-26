from datetime import datetime
from zoneinfo import ZoneInfo

from agents.linkerpost_ai_content_planner.database.repository import (
    _post_from_generated_item,
    parse_scheduled_at,
)
from agents.linkerpost_ai_content_planner.graph import route_after_intake
from agents.linkerpost_ai_content_planner.nodes.scheduler import scheduler
from agents.linkerpost_ai_content_planner.nodes.validator import validator
from agents.linkerpost_ai_content_planner.presentation import (
    library_run_fields,
    public_agent_output,
)
from agents.linkerpost_ai_content_planner.schemas import ContentPlan, FollowUpQuestion
from agents.linkerpost_ai_content_planner.tools.intake import merge_follow_up_answers
from agents.linkerpost_ai_content_planner.tools.scheduling import build_schedule
from agents.tools.ranking import score_source
from agents.tools.search import SearchHit, dedupe_hits, normalize_url
from agents.tools.similarity import (
    duplicate_pairs,
    relationship_threshold,
)


def test_normalize_and_dedupe_urls() -> None:
    hits = [
        SearchHit(title="A", url="https://Example.com/Post/"),
        SearchHit(title="A dup", url="https://example.com/Post"),
        SearchHit(title="B", url="https://news.example.org/ai"),
        SearchHit(title="blocked", url="https://www.facebook.com/post"),
    ]
    unique = dedupe_hits(hits)
    assert [hit.url for hit in unique] == ["https://example.com/Post", "https://news.example.org/ai"]
    assert normalize_url("not-a-url") == ""


def test_schedule_uses_python_not_llm() -> None:
    import random

    plan = ContentPlan(
        topic="AI Agents",
        duration_days=3,
        posts_per_day=1,
        schedule={
            "start_date": "2026-08-18",
            "interval_days": 2,
            "preferred_time": "10:30",
            "timezone": "Asia/Kolkata",
            "initial_delay_days": 0,
        },
    )
    slots = build_schedule(
        plan,
        now=datetime(2026, 8, 17, 12, tzinfo=ZoneInfo("Asia/Kolkata")),
        rng=random.Random(7),
    )
    assert len(slots) == 3
    assert all(str(item["scheduled_at_utc"]).endswith("Z") for item in slots)
    times = [str(item["scheduled_at"])[11:16] for item in slots]
    assert len(set(times)) == 3  # varied clock times, not all 10:00
    assert str(slots[0]["scheduled_at"]).startswith("2026-08-18")
    assert str(slots[1]["scheduled_at"]).startswith("2026-08-20")
    assert str(slots[2]["scheduled_at"]).startswith("2026-08-22")


def test_schedule_ignores_past_start_date() -> None:
    import random

    plan = ContentPlan(
        topic="AI Agents",
        duration_days=2,
        posts_per_day=1,
        schedule={
            "start_date": "2024-06-16",
            "preferred_time": "10:00",
            "timezone": "Asia/Kolkata",
        },
    )
    now = datetime(2026, 8, 26, 12, tzinfo=ZoneInfo("Asia/Kolkata"))
    slots = build_schedule(plan, now=now, rng=random.Random(1))
    assert len(slots) == 2
    assert all(datetime.fromisoformat(str(item["scheduled_at"])) > now for item in slots)
    assert str(slots[0]["scheduled_at"]).startswith("2026-08-27")


def test_extract_duration_days_from_brief() -> None:
    from agents.linkerpost_ai_content_planner.tools.clock import (
        extract_duration_days,
        extract_posts_per_day,
    )

    assert extract_duration_days("Create 2 days of LinkedIn posts about AI") == 2
    assert extract_duration_days("plan for 3 days on agents") == 3
    assert extract_duration_days("duration_days: 5") == 5
    assert extract_duration_days("just write about AI") is None
    assert extract_posts_per_day("2 posts per day for a week") == 2
    assert extract_posts_per_day("create 2 days of posts") is None


def test_sanitize_forces_two_posts_for_two_days() -> None:
    from agents.linkerpost_ai_content_planner.tools.scheduling import sanitize_plan_for_clock

    plan = ContentPlan(
        topic="AI",
        duration_days=7,
        posts_per_day=2,
        schedule={"start_date": "2024-06-16", "timezone": "Asia/Kolkata"},
    )
    cleaned = sanitize_plan_for_clock(
        plan,
        now=datetime(2026, 8, 26, 12, tzinfo=ZoneInfo("UTC")),
        known_duration_days=2,
        known_posts_per_day=None,
    )
    assert cleaned.duration_days == 2
    assert cleaned.posts_per_day == 1
    assert cleaned.total_posts == 2
    assert cleaned.schedule.start_date is None


def test_diversity_threshold_scale() -> None:
    from agents.tools.similarity import diversity_threshold

    assert diversity_threshold(0) > diversity_threshold(5) > diversity_threshold(10)


def test_relationship_threshold_and_duplicates() -> None:
    assert relationship_threshold(0) < relationship_threshold(10)
    posts = [
        {"content": "AI agents are changing software development in 2026."},
        {"content": "AI agents are changing software development in 2026!!"},
        {"content": "A completely different essay about recruiting operations."},
    ]
    flagged = duplicate_pairs(posts, threshold=0.8)
    assert flagged
    assert flagged[0][0] == 0
    assert flagged[0][1] == 1


def test_source_ranking_prefers_authority() -> None:
    openai = score_source(
        {
            "url": "https://openai.com/blog/agents",
            "title": "AI agents",
            "content": "AI agents " * 80,
            "published_at": "2026-08-01",
        },
        "AI agents",
    )
    random_blog = score_source(
        {"url": "https://unknown-blog.test/x", "title": "Hello", "content": "short"},
        "AI agents",
    )
    assert openai["final_score"] > random_blog["final_score"]


async def test_scheduler_and_validator_nodes() -> None:
    plan = ContentPlan(topic="AI Agents", duration_days=2, posts_per_day=1).model_dump()
    generated = await scheduler(
        {
            "content_plan": plan,
            "posts": [
                {
                    "day": 1,
                    "title": "What AI agents actually do",
                    "content": "A" * 60,
                    "first_comment": None,
                    "source_ids": ["source_1"],
                    "angle": "definition",
                    "images": [],
                    "videos": [],
                    "articles": ["https://example.com"],
                },
                {
                    "day": 2,
                    "title": "How teams ship agents",
                    "content": "B" * 60,
                    "first_comment": None,
                    "source_ids": ["source_2"],
                    "angle": "production",
                    "images": [],
                    "videos": [],
                    "articles": ["https://example.org"],
                },
            ],
        }
    )
    assert generated["posts"][0]["scheduled_at"]
    checked = await validator({**generated, "content_plan": plan, "retry_count": 0})
    assert checked["validation_errors"] == []
    assert checked["posts_to_regenerate"] == []


def test_merge_follow_ups_and_intake_routing() -> None:
    merged = merge_follow_up_answers(
        "Write about AI agents",
        [
            {
                "field_key": "duration_days",
                "question": "How many days should this cover?",
                "answer": "7",
            }
        ],
    )
    assert "Write about AI agents" in merged
    assert "How many days should this cover?: 7" in merged
    assert route_after_intake({"status": "awaiting_input"}) == "end"
    assert route_after_intake({"status": "analyzing"}) == "input_analyzer"
    question = FollowUpQuestion(
        field_key="topic",
        question="What should the posts cover?",
        placeholder="AI agents",
    )
    assert question.input_type == "text"


def test_public_output_drops_crawled_bodies() -> None:
    slim = public_agent_output(
        {
            "status": "completed",
            "model": "gemini-3.7-flash",
            "posts": [{"day": 1, "title": "Hello", "content": "A" * 80}],
            "source_documents": [{"content": "huge body"}],
            "discovered_urls": [{"url": "https://example.com"}],
            "ranked_sources": [
                {
                    "source_key": "source_1",
                    "url": "https://example.com",
                    "title": "Example",
                    "content": "huge body",
                    "images": ["https://example.com/a.png"],
                    "final_score": 8,
                }
            ],
        }
    )
    assert "source_documents" not in slim
    assert "discovered_urls" not in slim
    assert slim["model"] == "gemini-3.7-flash"
    assert slim["posts"][0]["title"] == "Hello"
    assert slim["ranked_sources"][0]["url"] == "https://example.com"
    assert "content" not in slim["ranked_sources"][0]


def test_library_run_fields_from_plan() -> None:
    fields = library_run_fields(
        {
            "model": "gemini-3.7-flash",
            "calendar_scheduled": True,
            "content_plan": {"topic": "Health for Youth"},
            "posts": [{}, {}, {}],
        }
    )
    assert fields["title"] == "Health for Youth"
    assert fields["model"] == "gemini-3.7-flash"
    assert fields["post_count"] == 3
    assert fields["calendar_scheduled"] is True


def test_parse_scheduled_at_from_iso() -> None:
    parsed = parse_scheduled_at("2026-08-18T10:00:00+05:30")
    assert parsed is not None
    assert parsed.hour == 10
    assert parsed.tzinfo is not None


def test_calendar_post_maps_planner_fields() -> None:
    from uuid import uuid4

    post = _post_from_generated_item(
        user_id=uuid4(),
        item={
            "day": 1,
            "title": "Navigating Digital Fatigue",
            "content": "Early in your academic journey...",
            "first_comment": "How do you protect your focus?",
            "articles": ["https://jedfoundation.org/example"],
            "scheduled_at": "2026-08-18T10:00:00+05:30",
        },
    )
    assert post.status == "scheduled"
    assert post.article_title == "Navigating Digital Fatigue"
    assert post.commentary.startswith("Early in your academic")
    assert post.first_comment == "How do you protect your focus?"
    assert post.article_source == "https://jedfoundation.org/example"
    assert post.scheduled_for is not None
    assert post.scheduled_for.hour == 10


def test_shared_llm_and_tools_keep_legacy_import_paths() -> None:
    from agents.linkerpost_ai_content_planner.llm import complete_structured as legacy_complete
    from agents.linkerpost_ai_content_planner.tools.search import normalize_url as legacy_normalize
    from agents.llm import complete_structured
    from agents.llm.llm import complete_structured as facade_complete
    from agents.tools.search import normalize_url

    assert complete_structured is facade_complete is legacy_complete
    assert normalize_url is legacy_normalize
    assert normalize_url("https://Example.com/A/") == "https://example.com/A"

