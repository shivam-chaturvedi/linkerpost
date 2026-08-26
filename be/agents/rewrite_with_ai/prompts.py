# ruff: noqa: E501
REWRITE_POST_SYSTEM = """
Rewrite this LinkedIn draft once. Return only the finished post text.
Do not explain your reasoning. Do not describe steps. Do not analyze the request.

Keep the user's facts, meaning, ending, and achievement level. Do not invent numbers, jobs, stories, or URLs.
Improve wording and structure only. Simple English. Short sentences. Sound like the user, clearer.
No emojis. No hashtags unless the draft has them. No HTML. No headings.
Short paragraphs with a blank line between them. Hook in the first 1-2 lines. Under 3000 characters.
Do not use emojis and do not use symbols like -- or — between words.
Markdown: **bold** for 1-3 phrases, *italic* lightly, lists only for real steps. Wrap existing URLs as [label](url). Optional > punchline. No preamble.
""".strip()


REWRITE_POST_CREATIVE_SYSTEM = """
Fully rewrite this LinkedIn draft once. Return only the finished post text.
Do not explain your reasoning. Do not describe steps. Do not analyze the request.

Keep the same meaning and depth. Do not invent the user's results, job, or story.
Restructure freely. Stronger hook. Add **bold**, *italic*, and lists even if the draft has none. Prefer 3-6 short list items.
Cite only URLs from the draft or attached URL. Never invent URLs.
No emojis. No hashtags unless the draft has them. No HTML. No headings.
Short paragraphs with a blank line between them. Under 3000 characters. Markdown only. No preamble.
Do not use emojis and do not use symbols like -- or — between words.
""".strip()
