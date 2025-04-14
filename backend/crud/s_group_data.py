from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, insert, update, delete, and_, or_, between, func
from sqlalchemy.exc import IntegrityError
from typing import List, Optional, Dict, Any, Tuple

from backend.models.GroupDataModel import GroupData
from backend.schemas.GroupDataSchemas import GroupDataCreate, GroupDataUpdate, RectangleUpdate
from backend.helpers.LoggingHelper import LoggingHelper as logger


async def create_group_data(db: AsyncSession, group_data: GroupDataCreate) -> Tuple[Optional[GroupData], Optional[str]]:
    """
    Create a new group data entry in the database
    """
    try:
        stmt = insert(GroupData).values(
            g_code=group_data.g_code,
            g_date=group_data.g_date,
            g_ut=group_data.g_ut,
            g_q=group_data.g_q,
            g_nr=group_data.g_nr,
            g_f=group_data.g_f,
            g_zpd=group_data.g_zpd,
            g_p=group_data.g_p,
            g_s=group_data.g_s,
            g_sector=group_data.g_sector,
            g_a=group_data.g_a,
            g_pos=group_data.g_pos,
            rect_x_min=group_data.rect_x_min,
            rect_y_min=group_data.rect_y_min,
            rect_x_max=group_data.rect_x_max,
            rect_y_max=group_data.rect_y_max,
            day_data_id=group_data.day_data_id,
            observation_id=group_data.observation_id
        ).returning(GroupData)

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

    update_data = group_data_update.model_dump(exclude_unset=True)
    if update_data:
        stmt = (
            update(GroupData)
            .where(GroupData.id == group_data_id)
            .values(**update_data)
            .returning(GroupData)
        )
        logger.info(f"executing statement: {stmt}", model="crud/group_data")
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













