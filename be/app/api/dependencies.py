from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db_session
from app.models.user import User
from app.repositories.users import get_user_by_id

DatabaseSession = Annotated[AsyncSession, Depends(get_db_session)]


async def get_current_user(request: Request, session: DatabaseSession) -> User:
    user_id = getattr(request.state, "user_id", None)
    token_version = getattr(request.state, "token_version", None)
    if user_id is None or token_version is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required"
        )

    user = await get_user_by_id(session, user_id)
    if user is None or not user.is_active or user.token_version != token_version:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
