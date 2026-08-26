"""Reusable agent tools: search, crawl, ranking, similarity, and media lookup."""

from agents.tools.crawler_http import extract_article, fetch_with_http
from agents.tools.crawler_playwright import fetch_with_playwright
from agents.tools.media_articles import article_search
from agents.tools.media_images import image_search
from agents.tools.media_videos import video_search
from agents.tools.ranking import score_source
from agents.tools.search import SearchHit, dedupe_hits, normalize_url, search_web
from agents.tools.similarity import duplicate_pairs, relationship_threshold, similarity_ratio

__all__ = [
    "SearchHit",
    "article_search",
    "dedupe_hits",
    "duplicate_pairs",
    "extract_article",
    "fetch_with_http",
    "fetch_with_playwright",
    "image_search",
    "normalize_url",
    "relationship_threshold",
    "score_source",
    "search_web",
    "similarity_ratio",
    "video_search",
]
