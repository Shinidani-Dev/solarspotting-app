from fastapi import APIRouter, HTTPException, Path, status

from backend.schemas.DetailedObservationSchemas import (
    DetailedObservationCreate,
    DetailedObservationUpdate,
    DetailedObservationResponse
)
from backend.crud import s_observation, s_day_data, s_group_data, s_instrument
from backend.core.dependencies import DB_DEPENDENCY, CURRENT_ACTIVE_USER
from backend.schemas.GroupDataSchemas import GroupDataCreate

router = APIRouter(
    prefix="/observation/detailed",
    tags=["detailed-observations"]
)


@router.get("/{observation_id}", response_model=DetailedObservationResponse)
async def get_detailed_observation(
        db: DB_DEPENDENCY,
        usr: CURRENT_ACTIVE_USER,
        observation_id: int = Path(..., description="The ID of the observation")
):
    """Get a detailed observation with day data and group data"""
    # Get the observation - this already checks if it belongs to the user or is public
    observation = await s_observation.get_observation(db, observation_id, usr.id)
    if not observation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Observation with id {observation_id} not found or you don't have permission to access it"
        )

    # Get day data for this observation
    day_data = await s_day_data.get_day_data_by_obs_id(db, observation_id)
    if not day_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Day data for observation with id {observation_id} not found"
        )

    # Get all group data for this observation
    group_data = await s_group_data.get_group_data_by_observation_id(db, observation_id)

    return {
        "observation": observation,
        "day_data": day_data,
        "group_data": group_data
    }


@router.post("/", response_model=DetailedObservationResponse, status_code=status.HTTP_201_CREATED)
async def create_detailed_observation(
        data: DetailedObservationCreate,
        db: DB_DEPENDENCY,
        usr: CURRENT_ACTIVE_USER
):
    """Create a detailed observation with day data and group data"""
    # Ensure the observer_id is set to the current user
    if data.observation.observer_id != usr.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot create an observation for another observer"
        )

    # Verify the instrument belongs to the user
    instrument = await s_instrument.get_instrument_by_id(db, data.observation.instrument_id)
    if not instrument:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Instrument with id {data.observation.instrument_id} not found"
        )

    if instrument.observer_id != usr.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot create an observation with an instrument that doesn't belong to you"
        )

    # 1. Create observation first
    observation, error_msg = await s_observation.create_observation(db, data.observation)
    if error_msg:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg
        )

    # 2. Create day data with the observation ID and sync the date
    from backend.schemas.DayDataSchemas import DayDataCreate

    # Convert from DetailedDayDataCreate to DayDataCreate
    day_data_dict = data.day_data.model_dump()
    day_data_dict["observation_id"] = observation.id  # Add observation_id to the dict

    # IMPORTANT: Always sync the day_data date with the observation created date
    day_data_dict["d_date"] = observation.created.date() if hasattr(observation.created,
                                                                    'date') else observation.created

    day_data_create = DayDataCreate(**day_data_dict)
    day_data, error_msg = await s_day_data.create_day_data(db, day_data_create)

    if error_msg:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg
        )

    # 3. Create group data entries
    from backend.schemas.GroupDataSchemas import GroupDataCreate

    group_data_list = []
    for detailed_group in data.group_data:
        # Convert from DetailedGroupDataCreate to GroupDataCreate
        group_dict = detailed_group.model_dump()
        group_dict["observation_id"] = observation.id
        group_dict["day_data_id"] = day_data.id

        # IMPORTANT: Always sync the group_data date with the observation created date
        group_dict["g_date"] = observation.created.date() if hasattr(observation.created,
                                                                     'date') else observation.created

        group_create = GroupDataCreate(**group_dict)
        group, error_msg = await s_group_data.create_group_data(db, group_create)

        if error_msg:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg
            )
        group_data_list.append(group)

    return {
        "observation": observation,
        "day_data": day_data,
        "group_data": group_data_list
    }


@router.put("/{observation_id}", response_model=DetailedObservationResponse)
async def update_detailed_observation(
        data: DetailedObservationUpdate,
        observation_id: int = Path(..., description="The ID of the observation to update"),
        db: DB_DEPENDENCY = None,
        usr: CURRENT_ACTIVE_USER = None
):
    """Update a detailed observation with day data and group data"""
    # Check if the observation exists and belongs to the user
    observation = await s_observation.get_user_observation(db, observation_id, usr.id)
    if not observation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Observation with id {observation_id} not found or you don't have permission"
        )

    # Check for instrument change
    obs_dict = data.observation.model_dump(exclude_unset=True) if data.observation else {}
    if "instrument_id" in obs_dict:
        new_instrument_id = obs_dict["instrument_id"]
        if new_instrument_id and new_instrument_id != observation.instrument_id:
            # Verify the new instrument belongs to the user
            instrument = await s_instrument.get_instrument_by_id(db, new_instrument_id)
            if not instrument:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Instrument with id {new_instrument_id} not found"
                )

            if instrument.observer_id != usr.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Cannot update observation to use an instrument that doesn't belong to you"
                )

    # Get existing day data
    day_data = await s_day_data.get_day_data_by_obs_id(db, observation_id)
    if not day_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Day data for observation with id {observation_id} not found"
        )

    # Get existing group data
    existing_groups = await s_group_data.get_group_data_by_observation_id(db, observation_id)
    existing_group_ids = {group.id for group in existing_groups}

    # 1. Update observation if provided
    new_observation_date = None
    if data.observation:
        # Check if created date is being updated
        if 'created' in obs_dict:
            new_observation_date = obs_dict['created']

        observation = await s_observation.update_observation(
            db, observation_id, usr.id, data.observation
        )

        # After update, we need the actual date that was set
        # (in case there were default values applied in the database)
        if new_observation_date is None:
            # Re-fetch the observation to get its current created date
            observation = await s_observation.get_observation(db, observation_id, usr.id)
            new_observation_date = observation.created

    # 2. Update day data if provided
    if data.day_data:
        from backend.schemas.DayDataSchemas import DayDataUpdate
        day_data_dict = data.day_data.model_dump(exclude_unset=True)

        # Sync date with observation if the observation date was updated
        if new_observation_date:
            day_data_dict["d_date"] = new_observation_date.date() if hasattr(new_observation_date,
                                                                             'date') else new_observation_date

        day_data_update = DayDataUpdate(**day_data_dict)
        day_data = await s_day_data.update_day_data(db, day_data.id, day_data_update)
    elif new_observation_date:
        # If day_data wasn't updated but observation date changed, update just the date
        from backend.schemas.DayDataSchemas import DayDataUpdate
        day_date = new_observation_date.date() if hasattr(new_observation_date, 'date') else new_observation_date
        day_data_update = DayDataUpdate(d_date=day_date)
        day_data = await s_day_data.update_day_data(db, day_data.id, day_data_update)

    # 3. Handle group data updates
    if data.group_data:
        from backend.schemas.GroupDataSchemas import GroupDataUpdate, GroupDataCreate

        # Identify which groups to update, create, or delete
        update_ids = {group.id for group in data.group_data if group.id is not None}

        # Delete groups that aren't in the update
        for group_id in existing_group_ids - update_ids:
            await s_group_data.delete_group_data(db, group_id)

        # Update or create group data
        updated_groups = []
        for detailed_group in data.group_data:
            if detailed_group.id and detailed_group.id in existing_group_ids:
                # Convert DetailedGroupDataUpdate to GroupDataUpdate
                group_dict = detailed_group.model_dump(exclude_unset=True)

                # Sync date with observation if the observation date was updated
                if new_observation_date:
                    group_dict["g_date"] = new_observation_date.date() if hasattr(new_observation_date,
                                                                                  'date') else new_observation_date

                group_update = GroupDataUpdate(**group_dict)

                # Update existing group
                updated_group = await s_group_data.update_group_data(db, detailed_group.id, group_update)
                updated_groups.append(updated_group)
            else:
                # Create new group data
                group_dict = detailed_group.model_dump(exclude={"id"})
                group_dict["observation_id"] = observation_id
                group_dict["day_data_id"] = day_data.id

                # Always use the observation date for new groups
                group_dict["g_date"] = observation.created.date() if hasattr(observation.created,
                                                                             'date') else observation.created

                group_create = GroupDataCreate(**group_dict)
                new_group, error_msg = await s_group_data.create_group_data(db, group_create)

                if error_msg:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=error_msg
                    )
                updated_groups.append(new_group)

        # If we have updated groups, use them, otherwise fetch all groups again
        if updated_groups:
            group_data_list = updated_groups
        else:
            group_data_list = await s_group_data.get_group_data_by_observation_id(db, observation_id)
    elif new_observation_date:
        # If group_data wasn't updated but observation date changed, update all group dates
        from backend.schemas.GroupDataSchemas import GroupDataUpdate

        # Update the date for all groups
        group_date = new_observation_date.date() if hasattr(new_observation_date, 'date') else new_observation_date
        updated_groups = []

        for group in existing_groups:
            group_update = GroupDataUpdate(g_date=group_date)
            updated_group = await s_group_data.update_group_data(db, group.id, group_update)
            updated_groups.append(updated_group)

        group_data_list = updated_groups
    else:
        # No updates to group data or observation date
        group_data_list = existing_groups

    return {
        "observation": observation,
        "day_data": day_data,
        "group_data": group_data_list
    }
