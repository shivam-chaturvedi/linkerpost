from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class LinkedInConnectRequest(BaseModel):
    return_to: Literal["/app/accounts", "/onboarding"] = "/app/accounts"


class LinkedInConnectResponse(BaseModel):
    authorization_url: str


class LinkedInTokenResponse(BaseModel):
    access_token: str = Field(min_length=1)
    expires_in: int = Field(gt=0)
    refresh_token: str | None = None
    refresh_token_expires_in: int | None = Field(default=None, gt=0)
    scope: str = ""


class LinkedInUserInfo(BaseModel):
    sub: str = Field(min_length=1, max_length=255)
    name: str | None = Field(default=None, max_length=255)
    given_name: str | None = Field(default=None, max_length=120)
    family_name: str | None = Field(default=None, max_length=120)
    picture: str | None = Field(default=None, max_length=2048)
    email: str | None = Field(default=None, max_length=320)
    email_verified: bool | None = None
    # LinkedIn has returned both OIDC strings ("en-US") and legacy locale objects.
    locale: str | dict[str, str] | None = None


class AccountResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    provider: str
    provider_account_id: str
    account_type: str
    display_name: str
    given_name: str | None
    family_name: str | None
    email: str | None
    email_verified: bool | None
    profile_image_url: str | None
    locale: str | dict[str, str] | None
    token_expires_at: datetime
    scopes: list[str]
    status: str
    last_synced_at: datetime
    created_at: datetime


class AccountsResponse(BaseModel):
    accounts: list[AccountResponse]


class DeleteAccountResponse(BaseModel):
    message: str
