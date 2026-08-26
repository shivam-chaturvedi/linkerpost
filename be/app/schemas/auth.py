from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    first_name: str = Field(min_length=1, max_length=80)
    last_name: str = Field(min_length=1, max_length=80)

    @field_validator("first_name", "last_name")
    @classmethod
    def clean_name(cls, value: str) -> str:
        cleaned = " ".join(value.split())
        if not cleaned:
            raise ValueError("Name cannot be blank")
        return cleaned


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class GoogleSessionExchangeRequest(BaseModel):
    """One-time code from Google OAuth redirect → FE credentialed exchange."""

    code: str = Field(min_length=32, max_length=512)


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: EmailStr
    first_name: str
    last_name: str
    created_at: datetime


class AuthResponse(BaseModel):
    user: UserResponse


class CsrfResponse(BaseModel):
    csrf_token: str


class MessageResponse(BaseModel):
    message: str
