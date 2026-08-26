import asyncio

from agents.linkerpost_ai_content_planner.schemas import ContentPlan
from agents.linkerpost_ai_content_planner.state import ContentGenerationState
from agents.tools.media_articles import article_search
from agents.tools.media_images import image_search
from agents.tools.media_videos import video_search


async def _attach_media(plan: ContentPlan, post: dict, source_lookup: dict[str, dict]) -> dict:
    query = f"{plan.topic} {post.get('angle') or post.get('title') or ''}".strip()
    images: list[str] = []
    videos: list[str] = []
    articles: list[str] = []
    for source_id in post.get("source_ids") or []:
        source = source_lookup.get(str(source_id)) or {}
        images.extend(str(url) for url in (source.get("images") or [])[:1])
        articles.append(str(source.get("url") or ""))
    images = [url for url in images if url.startswith("http")][:2]
    articles = [url for url in articles if url.startswith("http")][:2]

    if plan.media.images and len(images) < 2:
        images.extend(await image_search(query, count=2))
    if plan.media.videos:
        videos = await video_search(query, count=1)
    if plan.media.articles and len(articles) < 2:
        extra = await asyncio.to_thread(article_search, query, count=2)
        articles.extend(extra)

    post["images"] = list(dict.fromkeys(images))[:3]
    post["videos"] = list(dict.fromkeys(videos))[:2]
    post["articles"] = list(dict.fromkeys(articles))[:3]
    return post


async def media_discovery(state: ContentGenerationState) -> ContentGenerationState:
    plan = ContentPlan.model_validate(state["content_plan"])
    lookup = {str(item.get("source_key")): item for item in (state.get("ranked_sources") or [])}
    posts = []
    for post in state.get("posts") or []:
        posts.append(await _attach_media(plan, dict(post), lookup))
    return {"posts": posts, "status": "generating"}
