from fastapi import APIRouter, HTTPException, Query, Path, status
from typing import Optional, List
from backend.schemas.ObservationSchemas import (
    ObservationCreate,
    ObservationUpdate,
    ObservationResponse,
    VerificationUpdate,
    PublicStatusUpdate
)
from backend.crud import s_observation
from backend.core.dependencies import DB_DEPENDENCY, CURRENT_ACTIVE_USER, CURRENT_LABELER_USER


router = APIRouter(
    prefix="/observations",
    tags=["observations"]
)


@router.post("/", response_model=ObservationResponse, status_code=status.HTTP_201_CREATED)
async def create_observation(
        observation: ObservationCreate,
        db: DB_DEPENDENCY,
        usr: CURRENT_ACTIVE_USER
):
    if observation.observer_id != usr.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="cannot create an observation for another observer"
        )

    created_observation, error_msg = await s_observation.create_observation(db, observation)

    if error_msg:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg
        )

    return created_observation


@router.get("/", response_model=List[ObservationResponse], status_code=status.HTTP_200_OK)
async def get_my_and_public_observations(
        db: DB_DEPENDENCY,
        user: CURRENT_ACTIVE_USER,
        skip: Optional[int] = Query(0, description="Number of records to skip"),
        limit: Optional[int] = Query(100, description="Maximum number of records to return")
):
    """
    Gets all users and public observations
    """
    observations = await s_observation.get_my_and_all_public_observations(db, user.id, skip, limit)

    return observations


@router.get("/{observation_id}", response_model=ObservationResponse)
async def get_observation(
        db: DB_DEPENDENCY,
        usr: CURRENT_ACTIVE_USER,
        observation_id: int = Path(..., description="The ID of the observation")
):
    """
    Get a specific observation
    """
    observation = await s_observation.get_observation(db, observation_id, usr.id)

    if not observation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Observation with id {observation_id} not found"
        )

    return observation


@router.put("/{observation_id}", response_model=ObservationResponse)
async def update_observation(
        db: DB_DEPENDENCY,
        usr: CURRENT_ACTIVE_USER,
        observation_update: ObservationUpdate,
        observation_id: int = Path(..., description="The ID of the observation to update")
):
    """
    Lets a user update his provided observation
    """

    updated_obs = await s_observation.update_observation(db, observation_id, usr.id, observation_update)

    if not updated_obs:
        raise HTTPException(
            status_code=404,
            detail="Observation not found"
        )

    return updated_obs


@router.put("/{observation_id}/verify", response_model=ObservationResponse)
async def update_verification_status(
        db: DB_DEPENDENCY,
        labeler: CURRENT_LABELER_USER,
        verification_update: VerificationUpdate,
        observation_id: int = Path(..., description="The ID of the observation to update")
):
    """
    Only for LABELER users to update the verification status of an observation
    """
    observation = await s_observation.update_verification_status(db, observation_id, labeler.is_labeler, verification_update)

    if not observation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Observation with id {observation_id} not found"
        )

    return observation


@router.put("/{observation_id}/publicize", response_model=ObservationResponse)
async def update_public_status(
        db: DB_DEPENDENCY,
        usr: CURRENT_ACTIVE_USER,
        public_update: PublicStatusUpdate,
        observation_id: int = Path(..., description="The ID of the observation to update")
):
    """
    For a user to set an observations "public" status to either True or False
    """
    updated_observation = await s_observation.update_public_status(db, observation_id, usr.id, public_update)

    if not updated_observation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Observation with id {observation_id} not found"
        )

    return updated_observation


@router.delete("/{observation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_observation(
        db: DB_DEPENDENCY,
        usr: CURRENT_ACTIVE_USER,
        observation_id: int = Path(..., description="The ID of the observation to delete")
):
    """
    This endpoint allows a user to delete an observation.
    It has to be one of his own observations
    """
    success = s_observation.delete_observation(db, observation_id, usr.id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Observer with id {observation_id} not found"
        )

    return None
