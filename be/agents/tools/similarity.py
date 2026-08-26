from __future__ import annotations

from difflib import SequenceMatcher


def similarity_ratio(left: str, right: str) -> float:
    return SequenceMatcher(None, left.lower().strip(), right.lower().strip()).ratio()


def relationship_threshold(content_relationship_score: int) -> float:
    """Legacy: higher relationship (connected series) allows more textual overlap."""
    score = max(0, min(10, content_relationship_score))
    return 0.22 + (score / 10) * 0.50


def diversity_threshold(post_diversity_score: int) -> float:
    """Similarity ceiling for duplicate detection.

    ``post_diversity_score``: 0 = similar OK (loose), 10 = must differ (strict).
    Returns the max allowed SequenceMatcher ratio before a pair is flagged.
    """
    score = max(0, min(10, post_diversity_score))
    # diversity 0 → 0.92, diversity 5 → 0.62, diversity 10 → 0.32
    return 0.92 - (score / 10) * 0.60


def duplicate_pairs(posts: list[dict], *, threshold: float) -> list[tuple[int, int, float]]:
    flagged: list[tuple[int, int, float]] = []
    for i, current in enumerate(posts):
        current_text = str(current.get("content") or "")
        for j in range(i + 1, len(posts)):
            other_text = str(posts[j].get("content") or "")
            ratio = similarity_ratio(current_text, other_text)
            if ratio >= threshold:
                flagged.append((i, j, ratio))
    return flagged
