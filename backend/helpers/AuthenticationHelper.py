from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from backend.core.config import settings
from backend.core.dependencies import DB_DEPENDENCY
from backend.helpers.LoggingHelper import LoggingHelper
from backend.models.UserModel import User
from backend.schemas.UserSchemas import TokenData


class AuthHelper:
    """Helper class for authentication operations"""

    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/token")

    @classmethod
    def verify_password(cls, plain_password: str, hashed_password: str):
        return cls.pwd_context.verify(plain_password, hashed_password)

    @classmethod
    def get_password_hash(cls, password: str) -> str:
        return cls.pwd_context.hash(password)

    @classmethod
    async def get_user_by_username(cls, db: AsyncSession, username: str) -> Optional[User]:
        LoggingHelper.debug(f"Looking up a user by username: {username}", module="auth")
        result = await db.execute(select(User).filter(User.username == username))
        return result.scalar_one_or_none()

    @classmethod
    async def get_user_by_email(cls, db: AsyncSession, email: str) -> Optional[User]:
        LoggingHelper.debug(f"Looking up a user by email: {email}", module="auth")
        result = await db.execute(select(User).filter(User.email == email))
        return result.scalar_one_or_none()

    @classmethod
    async def authenticate_user(cls, db: AsyncSession, username: str, password: str) -> Optional[User]:
        """Authenticate a user with username and password"""
        # Try to get user by username
        user = await cls.get_user_by_username(db, username)

        # If not found, try email
        if not user:
            user = await cls.get_user_by_email(db, username)

        if not user:
            LoggingHelper.warning(f"Authentication failed: Invalid username or password", module="auth")
            return None

        if user.locked:
            LoggingHelper.warning(f"Authentication blocked: User account is locked: {username}", module="auth")
            return None

        if not cls.verify_password(password, user.hashed_pw):
            LoggingHelper.warning(f"Authentication failed: Invalid username or password", module="auth")
            user.login_attempts += 1

            if user.login_attempts >= 5:
                LoggingHelper.warning(f"User account locked: {username} after {user.login_attempts} attempts", module="auth")
                user.locked = True

            await db.commit()
            return None

        user.login_attempts = 0

        await db.commit()

        LoggingHelper.info(f"User authenticated successfully: {username}", module="auth")
        return user

    @classmethod
    def create_access_token(cls, data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
        """Create JWT Token for future authentication"""
        to_encode = data.copy()
        LoggingHelper.info("Creating access token", module="TOKENIZER")
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

        to_encode.update({"exp": expire})

        encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

        return encoded_jwt

    @classmethod
    async def get_current_user(cls, db: DB_DEPENDENCY, token: str = Depends(oauth2_scheme)) -> User:
        """Get the current user from JWT-Token"""
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            username: str = payload.get("sub")

            if username is None:
                LoggingHelper.warning("Token validation failed: Missing subject claim", module="auth")
                raise credentials_exception

            token_data = TokenData(
                username=username,
                user_id=payload.get("id"),
                is_admin=payload.get("is_admin", False)
            )
        except jwt.PyJWTError as e:
            LoggingHelper.error(f"Token validation error: {str(e)}", module="auth")
            raise credentials_exception

        user = await cls.get_user_by_username(db, token_data.username)
        if user is None:
            LoggingHelper.warning(f"Token validation failed: User not found: {token_data.username}", module="auth")
            raise credentials_exception

        if not user.active:
            LoggingHelper.warning(f"Token validation failed: User is inactive: {user.username}", module="auth")
            raise HTTPException(status_code=401, detail="Inactive user")

        if user.locked:
            LoggingHelper.warning(f"Token validation failed: User is locked: {user.username}", module="auth")
            raise HTTPException(status_code=403, detail="Account locked")

        return user

    @classmethod
    async def get_current_active_user(cls, current_user: User = Depends(get_current_user)) -> User:
        """Check if the current user is active"""
        if not current_user.active:
            raise HTTPException(status_code=401, detail="Inactive user")
        return current_user

    @classmethod
    async def get_current_admin_user(cls, current_user: User = Depends(get_current_active_user)) -> User:
        """Check if the current user is an admin"""
        if current_user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permission denied"
            )
        return current_user

    @classmethod
    async def get_current_labeler_user(cls, current_user: User = Depends(get_current_active_user)) -> User:
        if not current_user.is_labeler:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permission denied"
            )
        return current_user
