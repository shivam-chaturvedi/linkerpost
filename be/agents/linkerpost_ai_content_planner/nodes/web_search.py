import asyncio

from agents.linkerpost_ai_content_planner.state import ContentGenerationState
from agents.tools.search import SearchHit, dedupe_hits, search_web


async def web_search(state: ContentGenerationState) -> ContentGenerationState:
    queries = state.get("search_queries") or []

    async def _run(query: str) -> list[SearchHit]:
        return await asyncio.to_thread(search_web, query, max_results=6)

    batches = await asyncio.gather(*[_run(query) for query in queries], return_exceptions=True)
    hits: list[SearchHit] = []
    for batch in batches:
        if isinstance(batch, BaseException):
            continue
        hits.extend(batch)
    unique = dedupe_hits(hits)
    return {
        "discovered_urls": [hit.model_dump() for hit in unique[:60]],
        "status": "searching",
    }
