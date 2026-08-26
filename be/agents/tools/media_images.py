from __future__ import annotations

import httpx

from app.core.config import get_settings


async def image_search(query: str, *, count: int = 3) -> list[str]:
    settings = get_settings()
    key = settings.GOOGLE_CSE_API_KEY.get_secret_value().strip()
    cx = settings.GOOGLE_CSE_CX.strip()
    if key and cx:
        params = {"q": query, "cx": cx, "key": key, "searchType": "image", "num": min(count, 5)}
        try:
            async with httpx.AsyncClient(timeout=20) as client:
                response = await client.get(
                    "https://www.googleapis.com/customsearch/v1",
                    params=params,
                )
                response.raise_for_status()
                items = response.json().get("items") or []
                return [str(item.get("link")) for item in items if item.get("link")][:count]
        except httpx.HTTPError:
            pass
    return _ddg_images(query, count=count)


def _ddg_images(query: str, *, count: int) -> list[str]:
    try:
        from ddgs import DDGS
    except ImportError:
        return []
    urls: list[str] = []
    with DDGS() as client:
        for item in client.images(query, max_results=count) or []:
            image = str(item.get("image") or item.get("url") or "")
            if image.startswith("http"):
                urls.append(image)
    return urls[:count]
