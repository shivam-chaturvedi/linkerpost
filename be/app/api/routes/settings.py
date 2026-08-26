from __future__ import annotations

import secrets
from uuid import uuid4

from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.core.config import get_settings
from app.core.security import hash_password
from app.db.session import get_db_session
from app.models.user import User
from app.models.user_settings import DEFAULT_NOTIFICATION_PREFS, SupportTicket, UserSettings
from app.schemas.auth import AuthResponse
from app.schemas.settings import (
    CreateSupportTicketRequest,
    NotificationPrefs,
    SupportTicketResponse,
    UpdateProfileRequest,
    UpdateUserSettingsRequest,
    UserSettingsResponse,
)

router = APIRouter(prefix="/settings", tags=["settings"])


def _referral_code() -> str:
    return f"lp-{secrets.token_hex(4)}"


def _prefs(raw: object) -> NotificationPrefs:
    base = dict(DEFAULT_NOTIFICATION_PREFS)
    if isinstance(raw, dict):
        base.update({key: bool(value) for key, value in raw.items() if key in base})
    return NotificationPrefs.model_validate(base)


async def _ensure_settings(session: AsyncSession, user: User) -> UserSettings:
    settings = await session.get(UserSettings, user.id)
    if settings is not None:
        if not settings.notification_prefs:
            settings.notification_prefs = dict(DEFAULT_NOTIFICATION_PREFS)
        return settings
    settings = UserSettings(
        user_id=user.id,
        notification_prefs=dict(DEFAULT_NOTIFICATION_PREFS),
        referral_code=_referral_code(),
    )
    session.add(settings)
    await session.flush()
    return settings


def _settings_payload(settings: UserSettings) -> UserSettingsResponse:
    app_url = get_settings().FRONTEND_APP_URL.rstrip("/")
    return UserSettingsResponse(
        backup_email=settings.backup_email,
        headline=settings.headline,
        bio=settings.bio,
        company=settings.company,
        appearance=settings.appearance,
        timezone=settings.timezone,
        time_format=settings.time_format,
        week_start=settings.week_start,
        landing_page=settings.landing_page,
        notification_prefs=_prefs(settings.notification_prefs),
        referral_code=settings.referral_code,
        referral_url=f"{app_url}/signup?ref={settings.referral_code}",
    )


@router.get("", response_model=UserSettingsResponse)
async def get_settings_endpoint(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> UserSettingsResponse:
    settings = await _ensure_settings(session, current_user)
    await session.commit()
    return _settings_payload(settings)


@router.patch("/profile", response_model=AuthResponse)
async def update_profile(
    payload: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> AuthResponse:
    settings = await _ensure_settings(session, current_user)
    if payload.first_name is not None:
        current_user.first_name = " ".join(payload.first_name.split())
    if payload.last_name is not None:
        current_user.last_name = " ".join(payload.last_name.split())
    if payload.headline is not None:
        settings.headline = payload.headline.strip() or None
    if payload.bio is not None:
        settings.bio = payload.bio.strip() or None
    if payload.company is not None:
        settings.company = payload.company.strip() or None
    if payload.password is not None:
        current_user.password_hash = hash_password(payload.password)
    await session.commit()
    await session.refresh(current_user)
    return AuthResponse(user=current_user)


@router.patch("", response_model=UserSettingsResponse)
async def update_settings(
    payload: UpdateUserSettingsRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> UserSettingsResponse:
    settings = await _ensure_settings(session, current_user)
    if payload.appearance is not None:
        settings.appearance = payload.appearance
    if payload.timezone is not None:
        settings.timezone = payload.timezone.strip() or settings.timezone
    if payload.time_format is not None:
        settings.time_format = payload.time_format
    if payload.week_start is not None:
        settings.week_start = payload.week_start
    if payload.landing_page is not None:
        settings.landing_page = payload.landing_page
    if payload.notification_prefs is not None:
        settings.notification_prefs = payload.notification_prefs.model_dump()
    await session.commit()
    await session.refresh(settings)
    return _settings_payload(settings)


@router.post("/support", response_model=SupportTicketResponse, status_code=status.HTTP_201_CREATED)
async def create_support_ticket(
    payload: CreateSupportTicketRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> SupportTicketResponse:
    ticket = SupportTicket(
        id=uuid4(),
        user_id=current_user.id,
        kind=payload.kind,
        category=payload.category.strip() or "other",
        title=payload.title.strip(),
        body=payload.body.strip(),
    )
    session.add(ticket)
    await session.commit()
    await session.refresh(ticket)
    return SupportTicketResponse.model_validate(ticket)
