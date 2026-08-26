from pydantic import BaseModel, Field

from agents.rewrite_with_ai.formatting import LINKEDIN_MAX_CHARS


class RewrittenLinkedInPost(BaseModel):
    rewritten_commentary: str = Field(min_length=1, max_length=LINKEDIN_MAX_CHARS)
