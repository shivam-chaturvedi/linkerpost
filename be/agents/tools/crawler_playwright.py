from __future__ import annotations

import logging

from agents.tools.crawler_http import USER_AGENT, extract_article

logger = logging.getLogger(__name__)


async def fetch_with_playwright(url: str, *, timeout_ms: int = 20000) -> dict[str, object] | None:
    try:
        from playwright.async_api import async_playwright
    except ImportError:
        return None

    try:
        async with async_playwright() as playwright:
            browser = await playwright.chromium.launch(headless=True)
            page = await browser.new_page(user_agent=USER_AGENT)
            try:
                await page.goto(url, wait_until="domcontentloaded", timeout=timeout_ms)
                html = await page.content()
            finally:
                await browser.close()
        parsed = extract_article(html, url)
        parsed["fetch_method"] = "playwright"
        return parsed
    except Exception:
        logger.exception("Playwright fetch failed url=%s", url)
        return None
