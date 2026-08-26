import asyncio

from agents.linkerpost_ai_content_planner.state import ContentGenerationState
from agents.tools.crawler_http import fetch_with_http
from agents.tools.crawler_playwright import fetch_with_playwright


async def _fetch_one(index: int, url: str) -> dict | None:
    parsed = await fetch_with_http(url)
    if parsed and parsed.get("useful"):
        parsed["source_key"] = f"source_{index + 1}"
        return parsed
    fallback = await fetch_with_playwright(url)
    if fallback and fallback.get("useful"):
        fallback["source_key"] = f"source_{index + 1}"
        return fallback
    if parsed:
        parsed["source_key"] = f"source_{index + 1}"
        return parsed
    return None


async def url_fetcher(state: ContentGenerationState) -> ContentGenerationState:
    discovered = state.get("discovered_urls") or []
    urls = [str(item.get("url")) for item in discovered if item.get("url")]
    sem = asyncio.Semaphore(5)

    async def _guarded(index: int, url: str) -> dict | None:
        async with sem:
            return await _fetch_one(index, url)

    fetched = await asyncio.gather(*[_guarded(index, url) for index, url in enumerate(urls[:40])])
    documents = [item for item in fetched if item]
    return {"source_documents": documents, "status": "crawling"}
