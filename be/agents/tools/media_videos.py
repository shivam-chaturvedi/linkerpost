from __future__ import annotations

import httpx

from app.core.config import get_settings


async def video_search(query: str, *, count: int = 2) -> list[str]:
    settings = get_settings()
    key = settings.YOUTUBE_API_KEY.get_secret_value().strip()
    if key:
        params = {
            "part": "snippet",
            "type": "video",
            "q": query,
            "maxResults": min(count, 5),
            "key": key,
        }
        try:
            async with httpx.AsyncClient(timeout=20) as client:
                response = await client.get(
                    "https://www.googleapis.com/youtube/v3/search",
                    params=params,
                )
                response.raise_for_status()
                items = response.json().get("items") or []
                urls: list[str] = []
                for item in items:
                    video_id = (item.get("id") or {}).get("videoId")
                    if video_id:
                        urls.append(f"https://www.youtube.com/watch?v={video_id}")
                return urls[:count]
        except httpx.HTTPError:
            pass
    return _ddg_videos(query, count=count)


def _ddg_videos(query: str, *, count: int) -> list[str]:
    try:
        from ddgs import DDGS
    except ImportError:
        return []
    urls: list[str] = []
    with DDGS() as client:
        for item in client.videos(query, max_results=count) or []:
            link = str(item.get("content") or item.get("url") or "")
            if link.startswith("http"):
                urls.append(link)
    return urls[:count]
