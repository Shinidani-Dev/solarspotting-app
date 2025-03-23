from typing import Annotated, Callable
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from backend.core.db import get_db
from backend.models.UserModel import User

# Database Dependency
DB_DEPENDENCY = Annotated[AsyncSession, Depends(get_db)]


# Create function factories that delay the import
def get_current_user_dependency():
    from backend.helpers.AuthenticationHelper import get_current_user
    return Depends(get_current_user)


def get_current_active_user_dependency():
    from backend.helpers.AuthenticationHelper import get_current_active_user
    return Depends(get_current_active_user)


def get_current_admin_user_dependency():
    from backend.helpers.AuthenticationHelper import get_current_admin_user
    return Depends(get_current_admin_user)


def get_current_labeler_user_dependency():
    from backend.helpers.AuthenticationHelper import get_current_labeler_user
    return Depends(get_current_labeler_user)


# User dependencies
CURRENT_USER = Annotated[User, get_current_user_dependency()]
CURRENT_ACTIVE_USER = Annotated[User, get_current_active_user_dependency()]
CURRENT_ADMIN_USER = Annotated[User, get_current_admin_user_dependency()]
CURRENT_LABELER_USER = Annotated[User, get_current_labeler_user_dependency()]
