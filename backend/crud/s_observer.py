from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, insert, update, delete
from sqlalchemy.exc import IntegrityError
from typing import List, Optional, Tuple

from backend.models.ObserverModel import Observer
from backend.schemas.ObserverSchemas import ObserverCreate, ObserverUpdate
from backend.helpers.LoggingHelper import LoggingHelper as logger


async def create_observer(db: AsyncSession, user_id: int, obs: ObserverCreate) -> Tuple[Optional[Observer], Optional[str]]:
    """
    Create a new observer in the database
    Args:
        db: the database
        user_id: the user ID which will also be the observer ID
        obs: the schema to follow
    Returns:
        Tuple containing:
        - The created Observer object or None if failed
        - Error message string if failed or None if successful
    """
    # Check if observer already exists for this user
    query = select(Observer).where(Observer.id == user_id)
    result = await db.execute(query)
    if result.scalars().first():
        return None, f"Observer with ID {user_id} already exists"

    try:
        # Now we're using the user_id as the observer's id
        stmt = insert(Observer).values(
            id=user_id,
            is_ai=obs.is_ai
        ).returning(Observer)
        logger.info(f"executing statement: {stmt}", module="crud/observer")
        result = await db.execute(stmt)
        await db.commit()
        return result.scalars().first(), None

    except IntegrityError as e:
        await db.rollback()
        logger.error(f"[Observer Creation Error] {e}", module="crud/observer", user_id=user_id)
        return None, f"Integrity error: {str(e.orig)}"


async def get_observer(db: AsyncSession, obs_id: int) -> Optional[Observer]:
    """
    Get Observer by ID (now the same as user_id)
    """
    query = select(Observer).where(Observer.id == obs_id)
    logger.info(f"executing query: {query}", module="crud/observer")
    result = await db.execute(query)
    return result.scalars().first()


async def get_observers(db: AsyncSession, skip: int = 0, limit: int = 100) -> List[Observer]:
    """
    Get list of observers
    """
    query = select(Observer).offset(skip).limit(limit)
    logger.info(f"executing query: {query}", module="crud/observer")
    result = await db.execute(query)
    return result.scalars().all()


async def update_observer(db: AsyncSession, obs_id: int, obs_update: ObserverUpdate) -> Optional[Observer]:
    """
    Update an observer
    """
    observer = await get_observer(db, obs_id)
    if not observer:
        return None

    update_data = obs_update.model_dump(exclude_unset=True)
    if update_data:
        stmt = (
            update(Observer)
            .where(Observer.id == obs_id)
            .values(**update_data)
            .returning(Observer)
        )
        logger.info(f"executing statement: {stmt}", module="crud/observer")
        result = await db.execute(stmt)
        await db.commit()
        return result.scalars().first()

    return observer


async def delete_observer(db: AsyncSession, obs_id: int) -> bool:
    """
    Delete an observer

    Returns:
        True if deletion was successful, False if observer not found
    """
    observer = await get_observer(db, obs_id)
    if not observer:
        return False

    stmt = delete(Observer).where(Observer.id == obs_id)
    logger.info(f"executing statement: {stmt}", module="crud/observer")
    await db.execute(stmt)
    await db.commit()
    return True
