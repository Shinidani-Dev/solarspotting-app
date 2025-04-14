from fastapi import APIRouter, HTTPException, Path, status
from typing import Optional

from backend.schemas.DayDataSchemas import (
    DayDataCreate,
    DayDataUpdate,
    DayDataResponse
)
from backend.crud import s_day_data, s_observation
from backend.core.dependencies import DB_DEPENDENCY, CURRENT_ACTIVE_USER, CURRENT_LABELER_USER


router = APIRouter(
    prefix="/day-data",
    tags=["day-data"]
)


@router.post("/", response_model=DayDataResponse, status_code=status.HTTP_201_CREATED)
async def create_day_data(
        db: DB_DEPENDENCY,
        usr: CURRENT_ACTIVE_USER,
        day_data: DayDataCreate
):
    """
    Endpoint for creating a new day data entry
    """
    observation = await s_observation.get_observation(db, day_data.observation_id, usr.id)
    if not observation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Observation with id {day_data.observation_id} not found"
        )

    is_owner = observation.observer_id == usr.id
    is_labeler = usr.is_labeler if hasattr(usr, "is_labeler") else False

    if not (is_owner or is_labeler):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to create day data for this observation"
        )

    existing_day_data = await s_day_data.get_day_data_by_obs_id(db, day_data.observation_id)
    if existing_day_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Day data already exists for observagtion with id {day_data.observation_id}"
        )

    created_entry, error_msg = await s_day_data.create_day_data(db, day_data)

    if error_msg:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg
        )

    return created_entry


@router.get("/{day_data_id}", response_model=DayDataResponse)
async def get_day_data(
        db: DB_DEPENDENCY,
        usr: CURRENT_ACTIVE_USER,
        day_data_id: int = Path(..., description="The ID of the day data")
):
    """
    Get day data by ID
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
            detail=f"You don't have permission to access this day data"
        )

    return day_data


@router.get("/observation/{observation_id}", response_model=DayDataResponse)
async def get_day_data_by_observation(
        db: DB_DEPENDENCY,
        usr: CURRENT_ACTIVE_USER,
        observation_id: int = Path(..., description="The ID of the corresponding observation")
):
    """
    Get day data by observation id
    """
    observation = await s_observation.get_observation(db, observation_id, usr.id)
    if not observation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Observation with id {observation_id} not found"
        )

    day_data = await s_day_data.get_day_data_by_obs_id(db, observation_id)
    if not day_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Day data for observation with id {observation_id} not found"
        )

    return day_data


@router.put("/{day_data_id}", response_model=DayDataResponse)
async def update_day_data(
        db: DB_DEPENDENCY,
        usr: CURRENT_ACTIVE_USER,
        day_data_update: DayDataUpdate,
        day_data_id: int = Path(..., "The ID of the day data to update")
):
    """
    Endpoint for updating day data element. Can only be done by user, or a labeler user
    """
    day_data = await s_day_data.get_day_data_by_id(db, day_data_id)
    if not day_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Day data with id {day_data_id} not found"
        )

    # Check if the observation exists
    observation = await s_observation.get_observation(db, day_data.observation_id, usr.id)
    if not observation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Observation with id {day_data.observation_id} not found"
        )

    is_owner = observation.observer_id == usr.id
    is_labeler = usr.is_labeler if hasattr(usr, "is_labeler") else False

    if not (is_owner or is_labeler):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to update this day data"
        )

    updated_day_data_entry = await s_day_data.update_day_data(db, day_data_id, day_data_update)
    return updated_day_data_entry


@router.delete("/{day_data_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_day_data(
        db: DB_DEPENDENCY,
        usr: CURRENT_ACTIVE_USER,
        day_data_id: int = Path(..., description="The ID of the day data to delete")
):
    """
    Delete day data - only possesing user or labeler can do this operation
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
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Observation with id {day_data.observation_id} not found"
        )

    is_owner = observation.observer_id == usr.id
    is_labeler = usr.is_labeler if hasattr(usr, 'is_labeler') else False

    if not (is_owner or is_labeler):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to delete this day data"
        )

    success = await s_day_data.delete_day_data(db, day_data_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to delete day data entry"
        )
    return None
