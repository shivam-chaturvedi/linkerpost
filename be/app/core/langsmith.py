"""Configure LangSmith for internal team observability only.

User-facing usage metrics come from `llm_usage_events` (provider token metadata).
LangSmith is never exposed in the product UI or public API.
"""

from __future__ import annotations

import logging
import os

from app.core.config import Settings

logger = logging.getLogger(__name__)


def configure_langsmith(settings: Settings) -> None:
    """Enable LangChain/LangGraph tracing for internal debugging when configured."""
    if settings.LANGSMITH_INTERNAL_ONLY and settings.is_production:
        logger.info("LangSmith skipped in production (internal observability only)")
        return

    if not settings.LANGSMITH_TRACING:
        logger.debug("LangSmith tracing disabled (LANGSMITH_TRACING=false)")
        return

    api_key = settings.LANGSMITH_API_KEY.get_secret_value().strip()
    if not api_key:
        logger.info("LangSmith tracing requested but LANGSMITH_API_KEY is unset")
        return

    os.environ["LANGSMITH_API_KEY"] = api_key
    os.environ["LANGCHAIN_API_KEY"] = api_key
    os.environ["LANGSMITH_TRACING"] = "true"
    os.environ["LANGCHAIN_TRACING_V2"] = "true"

    project = settings.LANGSMITH_PROJECT.strip() or "linkerpost"
    os.environ["LANGSMITH_PROJECT"] = project
    os.environ["LANGCHAIN_PROJECT"] = project

    endpoint = settings.LANGSMITH_ENDPOINT.strip()
    if endpoint:
        os.environ["LANGSMITH_ENDPOINT"] = endpoint
        os.environ["LANGCHAIN_ENDPOINT"] = endpoint

    workspace_id = settings.LANGSMITH_WORKSPACE_ID.strip()
    if workspace_id:
        os.environ["LANGSMITH_WORKSPACE_ID"] = workspace_id

    logger.info("LangSmith internal tracing enabled project=%s env=%s", project, settings.APP_ENV)
