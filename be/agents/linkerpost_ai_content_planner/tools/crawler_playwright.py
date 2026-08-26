"""Shared Playwright crawler re-exported for older import paths. Prefer `agents.tools`."""

from agents.tools.crawler_playwright import fetch_with_playwright

__all__ = ["fetch_with_playwright"]
