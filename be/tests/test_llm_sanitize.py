from agents.llm.sanitize import strip_model_thinking


def test_strip_model_thinking_removes_process_and_keeps_post() -> None:
    raw = (
        "Here's a thinking process:\n\n"
        "Analyze the Request:\nKeep meaning.\n\n"
        "Final post:\n\n"
        "I am starting my journey into the NVIDIA ecosystem."
    )
    cleaned = strip_model_thinking(raw)
    assert "thinking process" not in cleaned.lower()
    assert "NVIDIA ecosystem" in cleaned


def test_strip_model_thinking_removes_think_tags() -> None:
    assert (
        strip_model_thinking("<think>plan</think>\nI started learning CUDA.")
        == "I started learning CUDA."
    )
