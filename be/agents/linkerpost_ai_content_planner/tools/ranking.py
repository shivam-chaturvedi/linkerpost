"""Shared ranking re-exported for older import paths. Prefer `agents.tools`."""

from agents.tools.ranking import AUTHORITY_DOMAINS, score_source

__all__ = ["AUTHORITY_DOMAINS", "score_source"]
