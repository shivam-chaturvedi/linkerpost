"""Shared HTTP crawler re-exported for older import paths. Prefer `agents.tools`."""

from agents.tools.crawler_http import USER_AGENT, extract_article, fetch_with_http

__all__ = ["USER_AGENT", "extract_article", "fetch_with_http"]
