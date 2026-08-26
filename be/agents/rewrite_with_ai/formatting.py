from __future__ import annotations

import html
import json
import re
from dataclasses import dataclass
from urllib.parse import urlparse

from agents.llm.sanitize import strip_model_thinking

_PREAMBLE_RE = re.compile(
    r"^(here(?:'|’)s (?:your )?(?:improved |rewritten )?(?:linkedin )?post:?\s*)",
    re.IGNORECASE,
)
_HTML_TAG_RE = re.compile(r"<[^>]+>")
_FENCE_RE = re.compile(r"^```(?:\w+)?\s*|\s*```$")
_BULLET_RE = re.compile(r"^\s*[-•]\s+(.+)$")
_STAR_BULLET_RE = re.compile(r"^\s*\*\s+(.+)$")
_ORDERED_RE = re.compile(r"^\s*\d+[.)]\s+(.+)$")
_QUOTE_RE = re.compile(r"^\s*>\s?(.*)$")
_BOLD_RE = re.compile(r"\*\*(.+?)\*\*|__(.+?)__")
_ITALIC_RE = re.compile(r"(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)|(?<!_)_(?!_)(.+?)(?<!_)_(?!_)")
_LINK_RE = re.compile(r"\[([^\]]+)\]\((https?://[^\s)]+)\)")
_BARE_URL_RE = re.compile(r"(https?://[^\s)]+)")
LINKEDIN_MAX_CHARS = 3000


@dataclass(frozen=True)
class FormattedPost:
    commentary: str
    html: str
    editor_delta: str


def sanitize_rewritten_text(text: str) -> str:
    cleaned = strip_model_thinking(text.strip().strip('"').strip("'"))
    cleaned = _PREAMBLE_RE.sub("", cleaned).strip()
    if cleaned.startswith("```"):
        cleaned = _FENCE_RE.sub("", cleaned).strip()
    cleaned = _HTML_TAG_RE.sub("", cleaned)
    cleaned = (
        cleaned.replace("&nbsp;", " ")
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
    )
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned).strip()
    if len(cleaned) > LINKEDIN_MAX_CHARS:
        cleaned = cleaned[:LINKEDIN_MAX_CHARS].rsplit("\n", 1)[0].strip()
    return cleaned


def _safe_link(url: str) -> str | None:
    parsed = urlparse(url.strip())
    if parsed.scheme not in {"http", "https"} or not parsed.hostname or parsed.username:
        return None
    return url.strip()


def _parse_inline(text: str) -> list[tuple[str, dict[str, object]]]:
    runs: list[tuple[str, dict[str, object]]] = []
    cursor = 0
    while cursor < len(text):
        matches = [
            ("link", _LINK_RE.search(text, cursor)),
            ("bold", _BOLD_RE.search(text, cursor)),
            ("italic", _ITALIC_RE.search(text, cursor)),
        ]
        found: list[tuple[str, re.Match[str]]] = []
        for kind, match in matches:
            if match:
                found.append((kind, match))
        if not found:
            rest = text[cursor:]
            if rest:
                runs.append((rest, {}))
            break
        kind, match = min(found, key=lambda item: item[1].start())
        if match.start() > cursor:
            runs.append((text[cursor : match.start()], {}))
        attributes: dict[str, object] = {}
        if kind == "link":
            label = match.group(1)
            href = _safe_link(match.group(2))
            inner = _parse_inline(label) if label else [("", {})]
            if href:
                for inner_text, inner_attrs in inner:
                    merged = dict(inner_attrs)
                    merged["link"] = href
                    runs.append((inner_text, merged))
            else:
                runs.extend(inner)
        elif kind == "bold":
            payload = match.group(1) or match.group(2) or ""
            attributes["bold"] = True
            runs.append((payload, attributes))
        else:
            payload = match.group(1) or match.group(2) or ""
            attributes["italic"] = True
            runs.append((payload, attributes))
        cursor = match.end()
    return [(piece, attrs) for piece, attrs in runs if piece]


def _autolink(text: str) -> str:
    if "[" in text and "](" in text:
        return text

    def replace(match: re.Match[str]) -> str:
        url = match.group(1).rstrip(".,;:!?)")
        return f"[{url}]({url})"

    return _BARE_URL_RE.sub(replace, text)


def _line_kind(line: str) -> tuple[str, str]:
    stripped = line.rstrip()
    if not stripped.strip():
        return "empty", ""
    bullet = _BULLET_RE.match(stripped) or _STAR_BULLET_RE.match(stripped)
    if bullet:
        return "bullet", bullet.group(1)
    ordered = _ORDERED_RE.match(stripped)
    if ordered:
        return "ordered", ordered.group(1)
    quote = _QUOTE_RE.match(stripped)
    if quote:
        return "blockquote", quote.group(1)
    return "paragraph", stripped.strip()


def _runs_html(runs: list[tuple[str, dict[str, object]]]) -> str:
    parts: list[str] = []
    for text, attrs in runs:
        piece = html.escape(text)
        if attrs.get("italic"):
            piece = f"<em>{piece}</em>"
        if attrs.get("bold"):
            piece = f"<strong>{piece}</strong>"
        href = attrs.get("link")
        if isinstance(href, str):
            piece = (
                f'<a href="{html.escape(href, quote=True)}" '
                f'rel="noopener noreferrer">{piece}</a>'
            )
        parts.append(piece)
    return "".join(parts) or "<br>"


def markdown_to_quill(markdown: str) -> FormattedPost:
    source = _autolink(sanitize_rewritten_text(markdown))
    blocks: list[tuple[str, list[tuple[str, dict[str, object]]]]] = []
    for raw_line in source.split("\n"):
        kind, content = _line_kind(raw_line)
        if kind == "empty":
            blocks.append(("empty", []))
            continue
        blocks.append((kind, _parse_inline(content)))

    ops: list[dict[str, object]] = []
    html_parts: list[str] = []
    index = 0
    while index < len(blocks):
        kind, runs = blocks[index]
        if kind in {"bullet", "ordered"}:
            tag = "ul" if kind == "bullet" else "ol"
            html_parts.append(f"<{tag}>")
            while index < len(blocks) and blocks[index][0] == kind:
                item_runs = blocks[index][1]
                html_parts.append(f"<li>{_runs_html(item_runs)}</li>")
                for text, attrs in item_runs:
                    op: dict[str, object] = {"insert": text}
                    if attrs:
                        op["attributes"] = attrs
                    ops.append(op)
                ops.append({"insert": "\n", "attributes": {"list": kind}})
                index += 1
            html_parts.append(f"</{tag}>")
            continue
        if kind == "empty":
            html_parts.append("<p><br></p>")
            ops.append({"insert": "\n"})
            index += 1
            continue
        html_tag = "blockquote" if kind == "blockquote" else "p"
        html_parts.append(f"<{html_tag}>{_runs_html(runs)}</{html_tag}>")
        for text, attrs in runs:
            op = {"insert": text}
            if attrs:
                op["attributes"] = attrs
            ops.append(op)
        newline: dict[str, object] = {"insert": "\n"}
        if kind == "blockquote":
            newline["attributes"] = {"blockquote": True}
        ops.append(newline)
        index += 1

    if not ops:
        ops = [{"insert": "\n"}]
        html_parts = ["<p><br></p>"]
    commentary = "".join(
        str(op.get("insert") or "") for op in ops if isinstance(op.get("insert"), str)
    ).strip()
    return FormattedPost(
        commentary=commentary[:LINKEDIN_MAX_CHARS],
        html="".join(html_parts),
        editor_delta=json.dumps({"ops": ops}),
    )


def plain_text_to_editor_delta(text: str) -> str:
    return markdown_to_quill(text).editor_delta


def commentary_from_editor_delta(delta: str | None) -> str:
    if not delta:
        return ""
    try:
        payload = json.loads(delta)
        operations = payload["ops"]
    except (json.JSONDecodeError, KeyError, TypeError):
        return ""
    if not isinstance(operations, list):
        return ""
    parts: list[str] = []
    for operation in operations:
        if isinstance(operation, dict) and isinstance(operation.get("insert"), str):
            parts.append(operation["insert"])
    return "".join(parts).strip()
