from fastapi import APIRouter, HTTPException, status
from typing import List, Optional

from backend.core.dependencies import DB_DEPENDENCY, CURRENT_ACTIVE_USER, CURRENT_ADMIN_USER
from backend.schemas.ObserverSchemas import ObserverCreate, ObserverUpdate, ObserverResponse
from backend.crud import s_observer

router = APIRouter(
    prefix="/observers",
    tags=["observers"]
)


@router.post("/", response_model=ObserverResponse, status_code=status.HTTP_201_CREATED)
async def create_observer(
        obs: ObserverCreate,
        db: DB_DEPENDENCY,
        usr: CURRENT_ACTIVE_USER
):
    # Now we use the current user's ID as the observer ID
    created_observer, error_msg = await s_observer.create_observer(
        db=db,
        user_id=usr.id,
        obs=obs
    )

    if error_msg:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg
        )

    return created_observer


@router.get("/me", response_model=ObserverResponse, status_code=status.HTTP_200_OK)
async def get_own_observer(
        usr: CURRENT_ACTIVE_USER,
        db: DB_DEPENDENCY
):
    """Get the current user's observer profile"""
    observer = await s_observer.get_observer(db, obs_id=usr.id)

    if not observer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Observer profile not found for current user"
        )

    return observer


@router.put("/me", response_model=ObserverResponse, status_code=status.HTTP_200_OK)
async def update_own_observer(
        usr: CURRENT_ACTIVE_USER,
        db: DB_DEPENDENCY,
        obs_update: ObserverUpdate
):
    """Update the current user's observer profile"""
    observer = await s_observer.update_observer(db=db, obs_id=usr.id, obs_update=obs_update)

    if not observer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Observer profile not found for current user"
        )

    return observer


@router.get("/", response_model=List[ObserverResponse], status_code=status.HTTP_200_OK)
async def get_observers(
        usr: CURRENT_ACTIVE_USER,
        db: DB_DEPENDENCY,
        skip: Optional[int] = 0,
        limit: Optional[int] = 100,
):
    """Get all observers"""
    return await s_observer.get_observers(db=db, skip=skip, limit=limit)


@router.get("/{obs_id}", response_model=ObserverResponse, status_code=status.HTTP_200_OK)
async def get_observer_by_id(
        usr: CURRENT_ACTIVE_USER,
        db: DB_DEPENDENCY,
        obs_id: int
):
    # Regular users can only view their own observer profile
    if usr.role != "admin" and obs_id != usr.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only access your own observer profile"
        )

    observer = await s_observer.get_observer(db, obs_id=obs_id)

    if not observer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Observer with id {obs_id} not found"
        )

    return observer


@router.put("/{obs_id}", response_model=ObserverResponse, status_code=status.HTTP_200_OK)
async def update_observer(
        usr: CURRENT_ADMIN_USER,  # Admin only can update other observers
        db: DB_DEPENDENCY,
        obs_update: ObserverUpdate,
        obs_id: int
):
    """Update an observer profile (admin only)"""
    observer = await s_observer.update_observer(db=db, obs_id=obs_id, obs_update=obs_update)

    if not observer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Observer with id {obs_id} not found"
        )

    return observer


@router.delete("/{obs_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_observer(
        usr: CURRENT_ADMIN_USER,
        db: DB_DEPENDENCY,
        obs_id: int
):
    """Delete an observer profile (admin only)"""
    success = await s_observer.delete_observer(db, obs_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Observer with id {obs_id} not found"
        )

    return None
