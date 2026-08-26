from __future__ import annotations

import re
import warnings
from html import unescape
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup, XMLParsedAsHTMLWarning

from app.core.config import get_settings

warnings.filterwarnings("ignore", category=XMLParsedAsHTMLWarning)

USER_AGENT = (
    "Mozilla/5.0 (compatible; LinkerPostContentPlanner/1.0; +https://linkerpost.local)"
)


def _clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", unescape(value)).strip()


def _make_soup(html: str) -> BeautifulSoup:
    start = html.lstrip()[:200].lower()
    if start.startswith("<?xml") or "<rss" in start or "<feed" in start:
        return BeautifulSoup(html, "xml")
    return BeautifulSoup(html, "lxml")


def extract_article(html: str, url: str) -> dict[str, object]:
    soup = _make_soup(html)
    for tag in soup(["script", "style", "noscript", "svg", "form", "nav", "footer"]):
        tag.decompose()

    title = ""
    if soup.title and soup.title.string:
        title = _clean_text(soup.title.string)
    og_title = soup.find("meta", property="og:title")
    if og_title and og_title.get("content"):
        title = _clean_text(str(og_title.get("content")))

    description = ""
    for selector in (
        {"name": "description"},
        {"property": "og:description"},
    ):
        tag = soup.find("meta", attrs=selector)
        if tag and tag.get("content"):
            description = _clean_text(str(tag.get("content")))
            break

    author = None
    author_tag = soup.find("meta", attrs={"name": "author"})
    if author_tag and author_tag.get("content"):
        author = _clean_text(str(author_tag.get("content")))

    published_at = None
    time_tag = soup.find("time")
    if time_tag and (time_tag.get("datetime") or time_tag.get_text()):
        published_at = _clean_text(str(time_tag.get("datetime") or time_tag.get_text()))

    article = soup.find("article") or soup.find("main") or soup.body
    paragraphs = [_clean_text(p.get_text(" ")) for p in (article.find_all("p") if article else [])]
    content = "\n\n".join(part for part in paragraphs if len(part) > 40)[:12000]

    images: list[str] = []
    if article:
        for img in article.find_all("img"):
            src = str(img.get("src") or "")
            absolute = urljoin(url, src)
            if absolute.startswith("http") and absolute not in images:
                images.append(absolute)
            if len(images) >= 5:
                break

    source_name = urlparse(url).netloc.replace("www.", "")
    useful = bool(content) and len(content) > 200
    return {
        "url": url,
        "title": title,
        "description": description,
        "content": content,
        "author": author,
        "published_at": published_at,
        "source_name": source_name,
        "images": images,
        "videos": [],
        "language": "en",
        "useful": useful,
        "fetch_method": "http",
    }


async def fetch_with_http(url: str) -> dict[str, object] | None:
    settings = get_settings()
    timeout = settings.CONTENT_PLANNER_CRAWL_TIMEOUT_SECONDS
    try:
        async with httpx.AsyncClient(
            follow_redirects=True,
            timeout=timeout,
            headers={"User-Agent": USER_AGENT, "Accept": "text/html,application/xhtml+xml"},
        ) as client:
            response = await client.get(url)
            response.raise_for_status()
            content_type = response.headers.get("content-type", "")
            if "html" not in content_type.lower() and not response.text.lstrip().startswith("<"):
                return None
            parsed = extract_article(response.text, str(response.url))
            if not parsed.get("useful"):
                parsed["useful"] = False
            return parsed
    except (httpx.HTTPError, ValueError):
        return None
