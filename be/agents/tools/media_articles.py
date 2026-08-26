from __future__ import annotations

from agents.tools.search import dedupe_hits, search_web


def article_search(query: str, *, count: int = 3) -> list[str]:
    hits = dedupe_hits(search_web(f"{query} article", max_results=count + 2))
    return [hit.url for hit in hits[:count]]
