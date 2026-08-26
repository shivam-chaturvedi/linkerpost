from __future__ import annotations

from urllib.parse import urlparse

from pydantic import BaseModel

BLOCKED_HOST_FRAGMENTS = ("pinterest.", "facebook.com", "x.com", "twitter.com", "reddit.com")


class SearchHit(BaseModel):
    title: str
    url: str
    snippet: str = ""
    source: str = "duckduckgo"
    published_at: str | None = None


def normalize_url(url: str) -> str:
    parsed = urlparse(url.strip())
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        return ""
    path = parsed.path.rstrip("/")
    return f"{parsed.scheme}://{parsed.netloc.lower()}{path}"


def is_usable_url(url: str, *, blocked: tuple[str, ...] = BLOCKED_HOST_FRAGMENTS) -> bool:
    host = urlparse(url).netloc.lower()
    if not host:
        return False
    return not any(fragment in host for fragment in blocked)


def dedupe_hits(
    hits: list[SearchHit],
    *,
    blocked: tuple[str, ...] = BLOCKED_HOST_FRAGMENTS,
) -> list[SearchHit]:
    seen: set[str] = set()
    unique: list[SearchHit] = []
    for hit in hits:
        key = normalize_url(hit.url)
        if not key or key in seen or not is_usable_url(key, blocked=blocked):
            continue
        seen.add(key)
        unique.append(hit.model_copy(update={"url": key}))
    return unique


def search_web(query: str, *, max_results: int = 8) -> list[SearchHit]:
    from ddgs import DDGS

    results: list[SearchHit] = []
    with DDGS() as client:
        for item in client.text(query, max_results=max_results) or []:
            url = str(item.get("href") or item.get("url") or "")
            if not url:
                continue
            results.append(
                SearchHit(
                    title=str(item.get("title") or ""),
                    url=url,
                    snippet=str(item.get("body") or item.get("snippet") or ""),
                    source="duckduckgo",
                )
            )
    return results
