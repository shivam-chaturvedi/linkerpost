"""Shared similarity helpers re-exported for older import paths. Prefer `agents.tools`."""

from agents.tools.similarity import duplicate_pairs, relationship_threshold, similarity_ratio

__all__ = ["duplicate_pairs", "relationship_threshold", "similarity_ratio"]
