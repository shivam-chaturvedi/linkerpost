from agents.linkerpost_ai_content_planner.schemas import SourceDocument
from agents.linkerpost_ai_content_planner.state import ContentGenerationState


async def source_normalizer(state: ContentGenerationState) -> ContentGenerationState:
    documents: list[dict] = []
    for index, raw in enumerate(state.get("source_documents") or []):
        source_key = str(raw.get("source_key") or f"source_{index + 1}")
        model = SourceDocument(
            source_key=source_key,
            url=str(raw.get("url") or ""),
            title=str(raw.get("title") or "")[:500],
            description=str(raw.get("description") or "")[:2000],
            content=str(raw.get("content") or "")[:12000],
            author=raw.get("author"),
            published_at=raw.get("published_at"),
            source_name=str(raw.get("source_name") or ""),
            images=list(raw.get("images") or [])[:5],
            videos=list(raw.get("videos") or [])[:3],
            language=str(raw.get("language") or "en"),
            fetch_method=str(raw.get("fetch_method") or "http"),
        )
        documents.append(model.model_dump())
    return {"source_documents": documents, "status": "crawling"}
