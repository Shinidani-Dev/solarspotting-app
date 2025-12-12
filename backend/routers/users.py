from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from typing import List, Optional

from backend.core.dependencies import DB_DEPENDENCY, CURRENT_ACTIVE_USER, CURRENT_ADMIN_USER, CURRENT_LABELER_USER
from backend.helpers.LoggingHelper import LoggingHelper as logger
from backend.helpers.AuthenticationHelper import get_password_hash
from backend.models.UserModel import User
from backend.schemas.UserSchemas import UserCreate, UserUpdate, UserResponse, AdminUserUpdate, PasswordChange

router = APIRouter(prefix="/users", tags=["Users"])


# user endpoints
@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(user_data: UserCreate, db: DB_DEPENDENCY, user: CURRENT_ADMIN_USER):
    usr = await db.execute(select(User).where(User.username == user_data.username))
    if usr.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="username already registered"
        )

    usr = await db.execute(select(User).where(User.email == user_data.email))
    if usr.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    logger.info(f"Creating new user: {user_data.username}", module="Users")

    user_dict = user_data.dict(exclude={"password"})
    new_user = User(
        **user_dict,
        hashed_pw=get_password_hash(user_data.password)
    )

    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    return new_user


@router.get("/me", response_model=UserResponse, status_code=status.HTTP_200_OK)
async def get_current_user_info(current_user: CURRENT_ACTIVE_USER):
    return current_user


@router.put("/me", response_model=UserResponse, status_code=status.HTTP_200_OK)
async def update_current_user(
        user_data: UserUpdate,
        current_user: CURRENT_ACTIVE_USER,
        db: DB_DEPENDENCY
):
    if user_data.email and user_data.email != current_user.email:
        usr = await db.execute(select(User).where(User.email == user_data.email))
        if usr.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
    logger.info(f"Updating user profile: {current_user.username}", module="Users")

    update_data = user_data.dict(exclude_unset=True)

    for key, value in update_data.items():
        setattr(current_user, key, value)

    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.put("/me/change-password", status_code=status.HTTP_200_OK)
async def change_password(
        password_data: PasswordChange,
        current_user: CURRENT_ACTIVE_USER,
        db: DB_DEPENDENCY
):
    from backend.helpers.AuthenticationHelper import verify_password

    if not verify_password(password_data.current_password, current_user.hashed_pw):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    from backend.helpers.AuthenticationHelper import get_password_hash

    current_user.hashed_pw = get_password_hash(password_data.new_password)
    current_user.login_attempts = 0

    db.add(current_user)
    await db.commit()

    logger.info(f"User {current_user.username} changed their password", module="Users")

    return {"message": "Password updated successfully"}


# Admin endpoints
@router.get("/", response_model=List[UserResponse], status_code=status.HTTP_200_OK)
async def get_all_users(
        admin_user: CURRENT_ADMIN_USER,
        db: DB_DEPENDENCY,
        skip: int = 0,
        limit: int = 100
):
    result = await db.execute(select(User).offset(skip).limit(limit))
    users = result.scalars().all()

    return users


@router.put("/{user_id}", response_model=UserResponse, status_code=status.HTTP_200_OK)
async def update_user_by_admin(
        user_data: AdminUserUpdate,
        admin_user: CURRENT_ADMIN_USER,
        db: DB_DEPENDENCY,
        user_id: int
):
    result = await db.execute(select(User).filter(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    if (user.id == admin_user.id and
            user_data.role is not None and
            user_data.role != "admin"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove admin role from yourself"
        )

    logger.info(f"Admin {admin_user.username} updating user: {user.username}", module="Users")

    update_data = user_data.dict(exclude_unset=True)

    for key, value in update_data.items():
        setattr(user, key, value)

    db.add(user)
    await db.commit()
    await db.refresh(user)

    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
        user_id: int,
        admin_user: CURRENT_ADMIN_USER,
        db: DB_DEPENDENCY
):
    """Delete a user (admin only)"""
    result = await db.execute(select(User).filter(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    if user.id == admin_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete yourself"
        )

    logger.info(f"Admin {admin_user.username} deleting user: {user.username}", module="Users")

    await db.delete(user)
    await db.commit()

    return None

# TODO implement a password reset via mail mechanism
