import json

from agents.rewrite_with_ai.formatting import (
    commentary_from_editor_delta,
    markdown_to_quill,
    plain_text_to_editor_delta,
    sanitize_rewritten_text,
)
from app.schemas.post import RewritePostRequest, RewritePostResponse


def test_rewrite_post_schemas() -> None:
    req = RewritePostRequest(
        commentary="Just launched our new product feature for creators!",
        article_source="https://example.com/blog/launch",
    )
    assert req.commentary == "Just launched our new product feature for creators!"
    assert req.article_source == "https://example.com/blog/launch"
    assert req.creative is False
    assert RewritePostRequest(commentary="x", creative=True).creative is True

    rewritten = (
        "I launched a product feature for creators.\n\n"
        "The interesting part was how small the first version needed to be."
    )
    resp = RewritePostResponse(
        rewritten_commentary=rewritten,
        rewritten_editor_delta=plain_text_to_editor_delta(rewritten),
    )
    assert "🚀" not in resp.rewritten_commentary
    assert "launched a product feature" in resp.rewritten_commentary
    assert resp.rewritten_editor_delta is not None


def test_rewrite_plain_text_becomes_quill_delta() -> None:
    text = "I thought the problem was Redis.\n\nIt wasn't."
    delta = json.loads(plain_text_to_editor_delta(text))
    joined = "".join(op["insert"] for op in delta["ops"]).strip()
    assert joined == text
    assert commentary_from_editor_delta(json.dumps(delta)) == text


def test_sanitize_strips_html_and_fences() -> None:
    raw = "```text\n<p>I spent 3 days debugging an API.</p>\n```"
    assert sanitize_rewritten_text(raw) == "I spent 3 days debugging an API."


def test_sanitize_strips_thinking_process_and_keeps_final_post() -> None:
    raw = (
        "Here's a thinking process:\n\n"
        "Analyze the Request:\nKeep meaning.\n\n"
        "Final rewritten post:\n\n"
        "I am starting my journey into the NVIDIA ecosystem.\n\n"
        "Here is what I am focusing on as I begin:\n\n"
        "- CUDA fundamentals\n"
        "- GPU acceleration\n"
    )
    cleaned = sanitize_rewritten_text(raw)
    assert "thinking process" not in cleaned.lower()
    assert "analyze the request" not in cleaned.lower()
    assert "NVIDIA ecosystem" in cleaned
    assert "CUDA fundamentals" in cleaned


def test_sanitize_strips_think_tags() -> None:
    raw = "<think>plan the rewrite</think>\nI started learning CUDA this week."
    assert sanitize_rewritten_text(raw) == "I started learning CUDA this week."


def test_markdown_to_quill_applies_bold_italic_lists_and_links() -> None:
    formatted = markdown_to_quill(
        "I spent **3 days** debugging.\n\n"
        "- Check logs\n"
        "- *Retry* the boot step\n\n"
        "Read [the notes](https://example.com/x)"
    )
    assert "3 days" in formatted.commentary
    assert "<strong>3 days</strong>" in formatted.html
    assert "<em>Retry</em>" in formatted.html
    assert "<ul>" in formatted.html
    assert 'href="https://example.com/x"' in formatted.html
    ops = json.loads(formatted.editor_delta)["ops"]
    assert any(op.get("attributes", {}).get("bold") for op in ops)
    assert any(op.get("attributes", {}).get("italic") for op in ops)
    assert any(op.get("attributes", {}).get("list") == "bullet" for op in ops)
    assert any(
        op.get("attributes", {}).get("link") == "https://example.com/x" for op in ops
    )
    assert commentary_from_editor_delta(formatted.editor_delta) == formatted.commentary


def test_rewrite_user_prompt_includes_draft_and_link() -> None:
    from agents.rewrite_with_ai.rewrite import _build_user_prompt

    prompt = _build_user_prompt(
        commentary="I spent 3 days debugging an API.",
        article_source="https://example.com/post",
    )
    assert "I spent 3 days debugging an API." in prompt
    assert "https://example.com/post" in prompt
    assert "DRAFT:" in prompt
    assert "previous draft" in prompt.lower()


def test_accumulate_stream_text_accepts_deltas_or_full_chunks() -> None:
    from agents.llm.gemini import accumulate_stream_text

    assert accumulate_stream_text("", "Hel") == "Hel"
    assert accumulate_stream_text("Hel", "lo") == "Hello"
    assert accumulate_stream_text("Hello", "Hello world") == "Hello world"


async def test_rewrite_linkedin_post_completes_then_sanitizes(monkeypatch) -> None:
    from agents.llm import get_active_max_output_tokens
    from agents.rewrite_with_ai import rewrite as rewrite_mod

    async def fake_complete(**kwargs):
        assert "schema" not in kwargs
        assert "I spent 3 days debugging an API." in kwargs["user"]
        assert kwargs["max_output_tokens"] == get_active_max_output_tokens()
        assert kwargs["request_timeout"] == rewrite_mod.REQUEST_TIMEOUT_SECONDS
        assert kwargs["max_retries"] == 0
        assert kwargs["use_rate_limiter"] is False
        assert kwargs["thinking_budget"] == 0
        assert kwargs["temperature"] == rewrite_mod.CONSERVATIVE_TEMPERATURE
        assert "Fully rewrite" not in kwargs["system"]
        return "<p>I spent 3 days debugging an API.</p>\n\nThe fix was one env var."

    monkeypatch.setattr(rewrite_mod, "complete_text", fake_complete)
    formatted = await rewrite_mod.rewrite_linkedin_post(
        commentary="I spent 3 days debugging an API."
    )
    assert "<p>" not in formatted.commentary
    assert "The fix was one env var." in formatted.commentary
    assert "I spent 3 days" in json.loads(formatted.editor_delta)["ops"][0]["insert"]


QUOTA_ERROR = """429 You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit.
* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 20, model: gemini-3.7-flash
Please retry in 54.941508992s. [links {
  description: "Learn more about Gemini API quotas"
  url: "https://ai.google.dev/gemini-api/docs/rate-limits"
}
, violations {
  quota_metric: "generativelanguage.googleapis.com/generate_content_free_tier_requests"
  quota_id: "GenerateRequestsPerDayPerProjectPerModel-FreeTier"
  quota_dimensions {
    key: "model"
    value: "gemini-3.7-flash"
  }
  quota_value: 20
}
, retry_delay {
  seconds: 54
}
]"""


def test_humanize_quota_error_includes_wait_seconds() -> None:
    from agents.rewrite_with_ai.errors import humanize_rewrite_error, is_rate_limit_error

    exc = RuntimeError(QUOTA_ERROR)
    assert is_rate_limit_error(exc)
    message = humanize_rewrite_error(exc)
    assert "Our model is busy" in message
    assert "55 seconds" in message
    assert "Gemini" not in message
    assert "https://ai.google.dev" not in message
    assert "quota_metric" not in message


def test_humanize_timeout_and_generic_errors() -> None:
    from agents.rewrite_with_ai.errors import humanize_rewrite_error

    assert "timed out" in humanize_rewrite_error(TimeoutError("deadline exceeded")).lower()
    assert humanize_rewrite_error(RuntimeError("boom")).startswith("Failed to rewrite")


HIGH_DEMAND_ERROR = (
    "503 This model is currently experiencing high demand. "
    "Spikes in demand are usually temporary. Please try again later."
)


def test_humanize_high_demand_error() -> None:
    from agents.rewrite_with_ai.errors import humanize_rewrite_error, is_unavailable_error

    exc = RuntimeError(HIGH_DEMAND_ERROR)
    assert is_unavailable_error(exc)
    message = humanize_rewrite_error(exc)
    assert "Our model is busy" in message
    assert "Gemini" not in message
    assert "503" not in message


def test_rewrite_system_prompts_stay_under_150_words() -> None:
    from agents.rewrite_with_ai.prompts import (
        REWRITE_POST_CREATIVE_SYSTEM,
        REWRITE_POST_SYSTEM,
    )

    assert len(REWRITE_POST_SYSTEM.split()) <= 150
    assert len(REWRITE_POST_CREATIVE_SYSTEM.split()) <= 150


async def test_creative_rewrite_uses_open_prompt(monkeypatch) -> None:
    from agents.llm import get_active_max_output_tokens
    from agents.rewrite_with_ai import rewrite as rewrite_mod
    from agents.rewrite_with_ai.prompts import REWRITE_POST_CREATIVE_SYSTEM

    async def fake_complete(**kwargs):
        assert kwargs["system"] == REWRITE_POST_CREATIVE_SYSTEM
        assert kwargs["temperature"] == rewrite_mod.CREATIVE_TEMPERATURE
        assert kwargs["max_output_tokens"] == get_active_max_output_tokens()
        assert kwargs["request_timeout"] == rewrite_mod.REQUEST_TIMEOUT_SECONDS
        assert kwargs["thinking_budget"] == 0
        assert "Fully rewrite" in kwargs["user"]
        return "I spent **3 days** debugging an API."

    monkeypatch.setattr(rewrite_mod, "complete_text", fake_complete)

    formatted = await rewrite_mod.rewrite_linkedin_post(
        commentary="I spent 3 days debugging an API.",
        creative=True,
    )
    assert "3 days" in formatted.commentary

