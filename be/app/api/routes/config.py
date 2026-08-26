from fastapi import APIRouter

from app.core.config import get_settings
from app.schemas.settings import PublicConfigResponse

router = APIRouter(prefix="/config", tags=["config"])


@router.get("", response_model=PublicConfigResponse)
async def public_config() -> PublicConfigResponse:
    return PublicConfigResponse(pricing_enabled=get_settings().PRICING_ENABLED)
