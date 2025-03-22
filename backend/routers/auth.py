from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from backend.core.config import settings
from backend.core.dependencies import DB_DEPENDENCY, CURRENT_USER
from backend.helpers.AuthenticationHelper import AuthHelper
from backend.helpers.LoggingHelper import LoggingHelper
from backend.schemas.UserSchemas import Token, UserResponse


router = APIRouter(
    prefix="/auth",
    tags=["authentication"]
)


@router.post("/token", response_model=Token)
async def login_for_access_token(
        db: DB_DEPENDENCY,
        form_data: OAuth2PasswordRequestForm = Depends()
):
    """Endpoint for obtaining JWT access token"""

    user = await AuthHelper.authenticate_user(db, form_data.username, form_data.password)
    if not user:
        LoggingHelper.warning(f"Authentication failed for user {form_data.username}", module="auth.api")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = AuthHelper.create_access_token(
        data={
            "sub": user.username,
            "id": user.id,
            "is_admin": user.role == "admin",
            "is_labeler": user.is_labeler
        },
        expires_delta=access_token_expires
    )

    LoggingHelper.info(
        f"User logged in successfully: {user.username}",
        module="auth.api"
    )

    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserResponse, status_code=status.HTTP_200_OK)
async def read_user_me(user: CURRENT_USER):
    """Get information about the currently authenticated user"""
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication failed")

    LoggingHelper.info(f"User authenticated: {user.username}")

    return UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        firstname=user.firstname,
        lastname=user.lastname,
        date_of_birth=user.date_of_birth,
        gender=user.gender,
        company=user.company,
        country=user.country,
        active=user.active,
        role=user.role,
        is_labeler=user.is_labeler,
        tstamp=user.tstamp
    )
