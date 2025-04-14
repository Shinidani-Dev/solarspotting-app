from fastapi import APIRouter, HTTPException, Path, status
from typing import List

from backend.schemas.GroupDataSchemas import (
    GroupDataCreate,
    GroupDataUpdate,
    GroupDataResponse,
    RectangleUpdate
)
from backend.crud import s_group_data, s_observation, s_day_data
from backend.core.dependencies import DB_DEPENDENCY, CURRENT_ACTIVE_USER

router = APIRouter(
    prefix="/group-data",
    tags=["group-data"]
)


@router.post("/", response_model=GroupDataResponse, status_code=status.HTTP_201_CREATED)
async def create_group_data(
        group_data: GroupDataCreate,
        db: DB_DEPENDENCY,
        usr: CURRENT_ACTIVE_USER
):
    """
    Create a new group data entry
    """
    observation = await s_observation.get_observation(db, group_data.observation_id, usr.id)
    if not observation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Observation with id {group_data.observation_id} not found"
        )

    day_data = await s_day_data.get_day_data_by_id(db, group_data.day_data_id)
    if not day_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Day data with id {group_data.day_data_id} not found"
        )

    if day_data.observation_id != group_data.observation_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Day data with id {group_data.day_data_id} does not belong to observation with id {group_data.observation_id}"
        )

    is_owner = observation.observer_id == usr.id
    is_labeler = usr.is_labeler if hasattr(usr, 'is_labeler') else False

    if not (is_owner or is_labeler):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to create group data for this observation"
        )

    created_group_data, error_msg = await s_group_data.create_group_data(db, group_data)

    if error_msg:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg
        )

    return created_group_data


@router.get("/{group_data_id}", response_model=GroupDataResponse)
async def get_group_data(
        db: DB_DEPENDENCY,
        usr: CURRENT_ACTIVE_USER,
        group_data_id: int = Path(..., description="The ID of the group data")
):
    """
    Get group data by ID
    """
    group_data = await s_group_data.get_group_data_by_id(db, group_data_id)

    if not group_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Group data with id {group_data_id} not found"
        )

    observation = await s_observation.get_observation(db, group_data.observation_id, usr.id)
    if not observation:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"You don't have permission to access this group data"
        )

    return group_data


@router.get("/observation/{observation_id}", response_model=List[GroupDataResponse])
async def get_group_data_by_observation(
        db: DB_DEPENDENCY,
        usr: CURRENT_ACTIVE_USER,
        observation_id: int = Path(..., description="The ID of the observation")
):
    """
    Get all group data entries for a specific observation
    """
    observation = await s_observation.get_observation(db, observation_id, usr.id)
    if not observation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Observation with id {observation_id} not found or you don't have permission to access it"
        )

    group_data_list = await s_group_data.get_group_data_by_observation_id(db, observation_id)
    return group_data_list


@router.get("/day-data/{day_data_id}", response_model=List[GroupDataResponse])
async def get_group_data_by_day_data(
        db: DB_DEPENDENCY,
        usr: CURRENT_ACTIVE_USER,
        day_data_id: int = Path(..., description="The ID of the day data")
):
    """
    Get all group data entries for a specific day data
    """
    day_data = await s_day_data.get_day_data_by_id(db, day_data_id)
    if not day_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Day data with id {day_data_id} not found"
        )

    observation = await s_observation.get_observation(db, day_data.observation_id, usr.id)
    if not observation:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"You don't have permission to access this day data's group data"
        )

    group_data_list = await s_group_data.get_group_data_by_day_data_id(db, day_data_id)
    return group_data_list


@router.put("/{group_data_id}", response_model=GroupDataResponse)
async def update_group_data(
        db: DB_DEPENDENCY,
        usr: CURRENT_ACTIVE_USER,
        group_data_update: GroupDataUpdate,
        group_data_id: int = Path(..., description="The ID of the group data to update")
):
    """
    Update group data - only the owner of the related observation or a labeler can update
    """
    group_data = await s_group_data.get_group_data_by_id(db, group_data_id)
    if not group_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Group data with id {group_data_id} not found"
        )

    observation = await s_observation.get_observation(db, group_data.observation_id, usr.id)
    if not observation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Observation with id {group_data.observation_id} not found"
        )

    is_owner = observation.observer_id == usr.id
    is_labeler = usr.is_labeler if hasattr(usr, 'is_labeler') else False

    if not (is_owner or is_labeler):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to update this group data"
        )
    updated_group_data = await s_group_data.update_group_data(db, group_data_id, group_data_update)

    return updated_group_data


@router.put("/{group_data_id}/rectangle", response_model=GroupDataResponse)
async def update_group_data_rectangle(
        db: DB_DEPENDENCY,
        usr: CURRENT_ACTIVE_USER,
        rect_update: RectangleUpdate,
        group_data_id: int = Path(..., description="The ID of the group data to update")
):
    """
    Update just the rectangle coordinates of group data
    """
    group_data = await s_group_data.get_group_data_by_id(db, group_data_id)
    if not group_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Group data with id {group_data_id} not found"
        )

    observation = await s_observation.get_observation(db, group_data.observation_id, usr.id)
    if not observation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Observation with id {group_data.observation_id} not found"
        )

    is_owner = observation.observer_id == usr.id
    is_labeler = usr.is_labeler if hasattr(usr, 'is_labeler') else False

    if not (is_owner or is_labeler):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to update this group data's rectangle"
        )

    updated_group_data = await s_group_data.update_group_data_rectangle(db, group_data_id, rect_update)

    return updated_group_data


@router.delete("/{group_data_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_group_data(
        db: DB_DEPENDENCY,
        usr: CURRENT_ACTIVE_USER,
        group_data_id: int = Path(..., description="The ID of the group data to delete")
):
    """
    Delete group data - only the owner of the related observation or a labeler can delete
    """
    group_data = await s_group_data.get_group_data_by_id(db, group_data_id)
    if not group_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Group data with id {group_data_id} not found"
        )

    observation = await s_observation.get_observation(db, group_data.observation_id, usr.id)
    if not observation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Observation with id {group_data.observation_id} not found"
        )

    is_owner = observation.observer_id == usr.id
    is_labeler = usr.is_labeler if hasattr(usr, 'is_labeler') else False

    if not (is_owner or is_labeler):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to delete this group data"
        )

    success = await s_group_data.delete_group_data(db, group_data_id)

    return None
