from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, insert, update, delete, and_, or_, between, func
from sqlalchemy.exc import IntegrityError
from datetime import datetime
from typing import List, Optional, Dict, Any, Tuple

from backend.models.DayDataModel import DayData
from backend.models.GroupDataModel import GroupData
from backend.models.ObservationModel import Observation
from backend.schemas.ObservationSchemas import ObservationCreate, ObservationUpdate, ObservationQuery, VerificationUpdate, PublicStatusUpdate
from backend.helpers.LoggingHelper import LoggingHelper as logger


async def create_observation(db: AsyncSession, obs: ObservationCreate) -> Tuple[Optional[Observation], Optional[str]]:
    """
    Create a new observation in the database
    """
    try:
        # Create a dictionary from the observation object
        obs_dict = obs.model_dump()

        # Check if created is in the request and use it if provided
        created_date = obs_dict.get('created', datetime.now(timezone.utc))

        stmt = insert(Observation).values(
            observer_id=obs.observer_id,
            instrument_id=obs.instrument_id,
            notes=obs.notes,
            status=obs.status,
            created=created_date,  # Use the provided date or default to now
            verified=False,
            is_public=obs.is_public or False
        ).returning(Observation)

        logger.info(f"executing statement: {stmt}", module="crud/observation")
        result = await db.execute(stmt)
        await db.commit()
        return result.scalars().first(), None

    except IntegrityError as e:
        await db.rollback()
        logger.error(f"[Observation Creation Error] {e}", module="crud/observation", observer_id=obs.observer_id)
        return None, f"Integrity error: {str(e.orig)}"


async def get_observation(db: AsyncSession, obs_id: int, user_id: int) -> Optional[Observation]:
    """
    Get Observation by ID
    """
    query = select(Observation).where(
        and_(
            Observation.id == obs_id,
            or_(
                Observation.observer_id == user_id,
                Observation.is_public == True
            )
        )
    )
    logger.info(f"executing query: {query}", module="crud/observation")
    result = await db.execute(query)
    return result.scalars().first()


async def get_user_observation(db: AsyncSession, observation_id: int, observer_id: int) -> Optional[Observation]:
    """
    Gets an Observation by ID and only if the observer_id on the Observation matches the passed observer_id
    """
    query = select(Observation).where(
        and_(
            Observation.id == observation_id,
            Observation.observer_id == observer_id
        )
    )

    logger.info(f"executing query: {query}", module="crud/observation")
    result = await db.execute(query)
    observation = result.scalars().first()

    if not observation:
        return None

    return observation


async def get_my_and_all_public_observations(
        db: AsyncSession,
        usr_id: int,
        skip: int,
        limit: int
) -> List[Observation] :
    """
    Gets all observations that belong to the user or are public
    """
    query = select(Observation).where(
        or_(
            Observation.observer_id == usr_id,
            Observation.is_public == True
        )
    ).offset(skip).limit(limit)

    logger.info(f"executing query: {query}", module="crud/observation")
    result = await db.execute(query)
    observations = list(result.scalars().all())
    return observations


async def update_observation(
        db: AsyncSession,
        observation_id: int,
        observer_id: int,
        obs_update: ObservationUpdate
) -> Optional[Observation]:
    """
    Update an observation if it belongs to the observer
    """
    observation = await get_user_observation(db, observation_id, observer_id)

    if not observation:
        return None

    update_data = obs_update.model_dump(exclude_unset=True)

    # Check if created date is being updated
    date_updated = False
    new_date = None

    if 'created' in update_data and update_data['created'] != observation.created:
        date_updated = True
        new_date = update_data['created']
        logger.info(f"Updating creation date for observation {observation_id} to {new_date}",
                    module="crud/observation")

    # Update the observation
    if update_data:
        stmt = (
            update(Observation)
            .where(Observation.id == observation_id)
            .values(**update_data)
            .returning(Observation)
        )
        logger.info(f"executing statement: {stmt}", module="crud/observation")
        result = await db.execute(stmt)
        await db.commit()
        updated_observation = result.scalars().first()

        # If date was updated, update related day_data and group_data dates
        if date_updated and new_date:
            try:
                # Update day_data date
                await db.execute(
                    update(DayData)
                    .where(DayData.observation_id == observation_id)
                    .values(d_date=new_date.date())
                )

                # Update group_data dates
                await db.execute(
                    update(GroupData)
                    .where(GroupData.observation_id == observation_id)
                    .values(g_date=new_date.date())
                )

                await db.commit()
                logger.info(f"Updated dates for related day_data and group_data to {new_date.date()}",
                            module="crud/observation")
            except Exception as e:
                logger.error(f"Failed to update related dates: {e}", module="crud/observation")

        return updated_observation

    return observation


async def update_verification_status(
        db: AsyncSession,
        observation_id: int,
        is_labeler: bool,
        verification_update: VerificationUpdate
) -> Optional[Observation]:
    """
    Update the "verified" status of an observation.
    Only allowed for user that are "labeler"
    """

    if is_labeler == False:
        return None

    query = select(Observation).where(
        and_(
            Observation.id == observation_id,
            Observation.is_public == True
        )
    )

    logger.info(f"executing query: {query}", module="crud/observation")
    result = await db.execute(query)
    observation = result.scalars().first()

    if not observation:
        return None

    update_data = verification_update.model_dump(exclude_unset=True)
    if update_data:
        stmt = (
            update(Observation)
            .where(Observation.id == observation_id)
            .values(**update_data)
            .returning(Observation)
        )
        logger.info(f"executing statement: {stmt}", module="crud/observation")
        result = await db.execute(stmt)
        await db.commit()
        return result.scalars().first()

    return observation


async def update_public_status(
        db: AsyncSession,
        observation_id: int,
        observer_id: int,
        public_status_update: PublicStatusUpdate
) -> Optional[Observation]:
    """
    updates the "public" flag of a users observation
    """
    observation = await get_user_observation(db, observation_id, observer_id)

    if not observation:
        return None

    update_data = public_status_update.model_dump(exclude_unset=True)
    if update_data:
        stmt = (
            update(Observation)
            .where(Observation.id == observation_id)
            .values(**update_data)
            .returning(Observation)
        )
        logger.info(f"executing statement: {stmt}", module="crud/observation")
        result = await db.execute(stmt)
        await db.commit()
        return result.scalars().first()

    return observation


async def delete_observation(
        db: AsyncSession,
        observation_id: int,
        observer_id: int,
):
    observation = await get_user_observation(db, observation_id, observer_id)

    if not observation:
        return None

    stmt = delete(Observation).where(Observation.id == observation_id)
    logger.info(f"executing statement: {stmt}", module="crud/observation")
    await db.execute(stmt)
    await db.commit()
    return True

####################################################################################################
# TODO: Try to implement a better approach for querying. So far the code below this line is not used
####################################################################################################
async def get_observations(
        db: AsyncSession,
        query_params: ObservationQuery,
        current_observer_id: int,
) -> Tuple[List[Observation], int]:
    """
    Get observations with flexible filtering options
    """

    if query_params.observer_id == current_observer_id:
        # Fetch all observations for the current user, regardless of public status
        base_query = select(Observation).where(Observation.observer_id == current_observer_id)
    else:
        # Fetch all public observations or observations from the current user
        base_query = select(Observation).where(
            or_(
                Observation.observer_id == current_observer_id,  # Current user's observations
                Observation.is_public == True  # Public observations
            )
        )

    # Apply filters and pagination
    paginated_query, count_query = await _apply_filters(base_query, query_params)

    # Get total count
    count_result = await db.execute(count_query)
    total_count = int(count_result.scalar() or 0)

    # Execute the paginated query
    logger.info(f"executing query: {paginated_query}", module="crud/observation")
    result = await db.execute(paginated_query)
    observations = list(result.scalars().all())

    return observations, total_count

async def _apply_filters(base_query, query_params: Optional[ObservationQuery]=None):
    """
    Applies filters to a base query
    """

    skip = 0
    limit = 100
    filtered_query = base_query

    if query_params:
        if query_params.start_date and query_params.end_date:
            filtered_query = filtered_query.where(
                between(Observation.created, query_params.start_date, query_params.end_date)
            )
        elif query_params.start_date:
            filtered_query = filtered_query.where(Observation.created >= query_params.start_date)
        elif query_params.end_date:
            filtered_query = filtered_query.where(Observation.created <= query_params.end_date)

        if query_params.status:
            filtered_query = filtered_query.where(Observation.status == query_params.status)

        if query_params.observer_id:
            filtered_query = filtered_query.where(Observation.observer_id == query_params.observer_id)

        if query_params.instrument_id:
            filtered_query = filtered_query.where(Observation.instrument_id == query_params.instrument_id)

        if query_params.verified is not None:
            filtered_query = filtered_query.where(Observation.verified == query_params.verified)

        if query_params.is_public is not None:
            filtered_query = filtered_query.where(Observation.is_public == query_params.is_public)

        skip = query_params.skip if query_params.skip is not None else 0
        limit = query_params.limit if query_params.limit is not None else 100

    count_query = select(func.count()).select_from(filtered_query.subquery())

    paginated_query = filtered_query.order_by(Observation.created.desc()).offset(skip).limit(limit)

    return paginated_query, count_query
