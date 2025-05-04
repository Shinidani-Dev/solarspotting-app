from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, insert, update, delete, and_, or_, between, func
from sqlalchemy.exc import IntegrityError
from typing import List, Optional, Dict, Any, Tuple

from backend.models.DayDataModel import DayData
from backend.models.ObservationModel import Observation
from backend.schemas.DayDataSchemas import DayDataCreate, DayDataUpdate
from backend.helpers.LoggingHelper import LoggingHelper as logger
from backend.crud.s_observation import get_observation


async def create_day_data(
        db: AsyncSession,
        day_data: DayDataCreate
) -> Tuple[Optional[DayData], Optional[str]]:
    """
    Create a new day data entry and return it or return the error message on fail
    """
    try:
        # Try to get the observation to sync dates
        observation = None
        try:
            stmt = select(Observation).where(Observation.id == day_data.observation_id)
            result = await db.execute(stmt)
            observation = result.scalars().first()
        except Exception as e:
            logger.warning(f"Failed to fetch observation: {e}", module="crud/day_data")

        # Create values dict from the day_data
        values = day_data.model_dump()

        # If observation exists, always sync with observation created date
        if observation:
            # Convert to date object if it's a datetime
            obs_date = observation.created.date() if hasattr(observation.created, 'date') else observation.created
            values['d_date'] = obs_date
            logger.info(f"Syncing day_data date with observation date: {obs_date}",
                        module="crud/day_data")

        stmt = insert(DayData).values(**values).returning(DayData)

        logger.info(f"executing statement: {stmt}", module="crud/day_data")
        result = await db.execute(stmt)
        await db.commit()
        return result.scalars().first(), None

    except IntegrityError as e:
        await db.rollback()
        logger.error(f"[Day Data Creation Error] {e}", module="crud/day_data", observation_id=day_data.observation_id)
        return None, f"Integrity error: {str(e.orig)}"


async def get_day_data_by_id(
        db: AsyncSession,
        day_data_id: int
) -> Optional[DayData]:
    """
    Get day data by ID
    """
    query = select(DayData).where(DayData.id == day_data_id)
    logger.info(f"executing query: {query}", module="crud/day_data")
    result = await db.execute(query)
    return result.scalars().first()


async def get_day_data_by_obs_id(
        db: AsyncSession,
        observation_id: int
) -> Optional[DayData]:
    """
    Get day data by observation ID
    """
    query = select(DayData).where(DayData.observation_id == observation_id)
    logger.info(f"executing query: {query}", module="crud/day_data")
    result = await db.execute(query)
    return result.scalars().first()


async def update_day_data(
        db: AsyncSession,
        day_data_id: int,
        day_data_update: DayDataUpdate
) -> Optional[DayData]:
    """
    Update day data
    The checks who can update the day data entry has to be done in the endpoint
    """
    day_data = await get_day_data_by_id(db, day_data_id)
    if not day_data:
        return None

    update_data = day_data_update.model_dump(exclude_unset=True)
    if update_data:
        stmt = (
            update(DayData)
            .where(DayData.id == day_data_id)
            .values(**update_data)
            .returning(DayData)
        )
        logger.info(f"executing statement: {stmt}", module="crud/day_data")
        result = await db.execute(stmt)
        await db.commit()
        return result.scalars().first()


async def delete_day_data(
        db: AsyncSession,
        day_data_id: int
) -> bool:
    day_data = await get_day_data_by_id(db, day_data_id)
    if not day_data:
        return False

    stmt = delete(DayData).where(DayData.id == day_data_id)
    logger.info(f"executing statement {stmt}", module="crud/day_data")
    await db.execute(stmt)
    await db.commit()
    return True
