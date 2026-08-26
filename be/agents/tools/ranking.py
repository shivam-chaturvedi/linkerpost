from urllib.parse import urlparse

AUTHORITY_DOMAINS = {
    "openai.com": 9,
    "anthropic.com": 9,
    "google.com": 8,
    "microsoft.com": 8,
    "github.com": 8,
    "arxiv.org": 8,
    "techcrunch.com": 7,
    "theverge.com": 7,
    "wired.com": 7,
    "bloomberg.com": 8,
    "reuters.com": 9,
    "nytimes.com": 8,
    "bbc.com": 8,
    "wikipedia.org": 6,
}


def _topic_overlap(text: str, topic: str) -> float:
    tokens = {part.lower() for part in topic.replace("-", " ").split() if len(part) > 2}
    if not tokens:
        return 5.0
    haystack = text.lower()
    hits = sum(1 for token in tokens if token in haystack)
    return min(10.0, 3.0 + (hits / max(len(tokens), 1)) * 7.0)


def score_source(document: dict, topic: str) -> dict[str, float]:
    blob = " ".join(
        str(document.get(key) or "")
        for key in ("title", "description", "content", "snippet", "url")
    )
    host = urlparse(str(document.get("url") or "")).netloc.replace("www.", "")
    authority = 5.0
    for domain, score in AUTHORITY_DOMAINS.items():
        if host.endswith(domain):
            authority = float(score)
            break
    content_len = len(str(document.get("content") or ""))
    quality = 4.0
    if content_len > 400:
        quality = 6.0
    if content_len > 1200:
        quality = 8.0
    recency = 6.0 if document.get("published_at") else 4.0
    relevance = _topic_overlap(blob, topic)
    final_score = round(
        (relevance * 0.4) + (recency * 0.2) + (authority * 0.2) + (quality * 0.2),
        2,
    )
    return {
        "relevance": round(relevance, 2),
        "recency": recency,
        "authority": authority,
        "content_quality": quality,
        "final_score": min(10.0, final_score),
    }
