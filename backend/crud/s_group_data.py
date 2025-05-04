from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, insert, update, delete, and_, or_, between, func
from sqlalchemy.exc import IntegrityError
from typing import List, Optional, Dict, Any, Tuple

from backend.models.ObservationModel import Observation
from backend.models.GroupDataModel import GroupData
from backend.schemas.GroupDataSchemas import GroupDataCreate, GroupDataUpdate, RectangleUpdate
from backend.helpers.LoggingHelper import LoggingHelper as logger


async def create_group_data(db: AsyncSession, group_data: GroupDataCreate) -> Tuple[Optional[GroupData], Optional[str]]:
    """
    Create a new group data entry in the database
    """
    try:
        # Try to get the related observation to sync the date
        observation = None
        try:
            stmt = select(Observation).where(Observation.id == group_data.observation_id)
            result = await db.execute(stmt)
            observation = result.scalars().first()
        except Exception as e:
            logger.warning(f"Failed to fetch observation: {e}", module="crud/group_data")

        # Create values dict from the group_data
        values = group_data.model_dump()

        # If observation exists and g_date wasn't explicitly set or differs, sync with observation date
        if observation and (not group_data.g_date or observation.created.date() != group_data.g_date):
            values['g_date'] = observation.created.date()
            logger.info(f"Syncing group_data date with observation date: {observation.created.date()}",
                        module="crud/group_data")

        stmt = insert(GroupData).values(**values).returning(GroupData)

        logger.info(f"executing statement: {stmt}", module="crud/group_data")
        result = await db.execute(stmt)
        await db.commit()
        return result.scalars().first(), None

    except IntegrityError as e:
        await db.rollback()
        logger.error(f"[Group Data Creation Error] {e}", module="crud/group_data",
                     day_data_id=group_data.day_data_id,
                     observation_id=group_data.observation_id)
        return None, f"Integrity error: {str(e.orig)}"


async def get_group_data_by_id(
        db: AsyncSession,
        group_data_id: int
) -> Optional[GroupData]:
    """
    Get group data by ID
    """
    query = select(GroupData).where(GroupData.id == group_data_id)
    logger.info(f"executing query: {query}", module="crud/group_data")
    result = await db.execute(query)
    return result.scalars().first()


async def get_group_data_by_observation_id(
        db: AsyncSession,
        observation_id: int
) -> List[GroupData]:
    """
    Get all group data entries for a specific observation
    """
    query = select(GroupData).where(GroupData.observation_id == observation_id)
    logger.info(f"executing query: {query}", module="crud/group_data")
    result = await db.execute(query)
    group_data = list(result.scalars().all())
    return group_data


async def get_group_data_by_day_data_id(
        db: AsyncSession,
        day_data_id: int
) -> List[GroupData]:
    """
    Get all group data entries for a specific day data
    """
    query = select(GroupData).where(GroupData.day_data_id == day_data_id)
    logger.info(f"executing query: {query}", module="crud/group_data")
    result = await db.execute(query)
    group_data = list(result.scalars().all())
    return group_data


async def update_group_data(
        db: AsyncSession,
        group_data_id: int,
        group_data_update: GroupDataUpdate
) -> Optional[GroupData]:
    """
    Simple update group data function - permission checks have to be implemented at router level (endpoints)
    """
    group_data = await get_group_data_by_id(db, group_data_id)
    if not group_data:
        return None

    # Try to get the related observation to sync the date
    observation = None
    try:
        stmt = select(Observation).where(Observation.id == group_data.observation_id)
        result = await db.execute(stmt)
        observation = result.scalars().first()
    except Exception as e:
        logger.warning(f"Failed to fetch observation: {e}", module="crud/group_data")

    update_data = group_data_update.model_dump(exclude_unset=True)

    # If observation exists and the date is being updated, sync with observation date
    if observation and 'g_date' in update_data:
        # Check if the group date differs from observation date
        if observation.created.date() != update_data['g_date']:
            update_data['g_date'] = observation.created.date()
            logger.info(f"Syncing updated group_data date with observation date: {observation.created.date()}",
                        module="crud/group_data")

    if update_data:
        stmt = (
            update(GroupData)
            .where(GroupData.id == group_data_id)
            .values(**update_data)
            .returning(GroupData)
        )
        logger.info(f"executing statement: {stmt}", module="crud/group_data")
        result = await db.execute(stmt)
        await db.commit()
        return result.scalars().first()

    return group_data


async def update_group_data_rectangle(
        db: AsyncSession,
        group_data_id: int,
        rect_update: RectangleUpdate
) -> Optional[GroupData]:
    """
    Update just the rectangle coordinates of group data
    """
    # First, get the group data to check if it exists
    group_data = await get_group_data_by_id(db, group_data_id)
    if not group_data:
        return None

    # Update the rectangle coordinates
    update_data = rect_update.model_dump(exclude_unset=True)
    if update_data:
        stmt = (
            update(GroupData)
            .where(GroupData.id == group_data_id)
            .values(**update_data)
            .returning(GroupData)
        )
        logger.info(f"executing statement: {stmt}", module="crud/group_data")
        result = await db.execute(stmt)
        await db.commit()
        return result.scalars().first()

    return group_data


async def delete_group_data(
        db: AsyncSession,
        group_data_id: int
) -> bool:
    """
    Simple delete group data function - permission checks happen at the router level
    """
    # First, get the group data to check if it exists
    group_data = await get_group_data_by_id(db, group_data_id)
    if not group_data:
        return False

    # Delete the group data
    stmt = delete(GroupData).where(GroupData.id == group_data_id)
    logger.info(f"executing statement: {stmt}", module="crud/group_data")
    await db.execute(stmt)
    await db.commit()
    return True













