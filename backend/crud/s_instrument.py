from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, insert, update, delete
from sqlalchemy.exc import IntegrityError
from typing import List, Optional, Tuple, Union

from backend.models.InstrumentModel import Instrument
from backend.schemas.InstrumentSchemas import InstrumentCreate, InstrumentUpdate
from backend.helpers.LoggingHelper import LoggingHelper as Logger


# Create
async def create_instrument(db: AsyncSession, inst: InstrumentCreate) -> Tuple[Optional[Instrument], Optional[str]]:
    """
    Create a new Instrument in the DB
    """
    try:
        stmt = insert(Instrument).values(
            i_id=inst.i_id,
            i_type=inst.i_type,
            i_aperture=inst.i_aperture,
            i_focal_length=inst.i_focal_length,
            i_filter=inst.i_filter,
            i_method=inst.i_method,
            i_magnification=inst.i_magnification,
            i_projection=inst.i_projection,
            i_inputpref=inst.i_inputpref,
            in_use=inst.in_use,
            observer_id=inst.observer_id
        ).returning(Instrument)
        Logger.info(f"executing statement: {stmt}", module="crud/instrument")
        result = await db.execute(stmt)
        await db.commit()
        return result.scalars().first(), None

    except IntegrityError as e:
        await db.rollback()
        Logger.error(f"[Instrument Creation Error] {e}", module="crud/instrument", observer_id=inst.observer_id)
        return None, f"Integrity error: {str(e.orig)}"


# Read
async def get_filtered_instruments(
        db: AsyncSession,
        observer_id: Optional[int] = None,
        serial_number: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
) -> List[Instrument]:
    """
    Get instruments with optional filtering by observer_id and serial_number

    Args:
        db: Database session
        observer_id: Optional observer ID to filter by
        serial_number: Optional serial number to filter by (partial match)
        skip: Number of records to skip
        limit: Maximum number of records to return

    Returns:
        List of instruments matching the criteria
    """
    query = select(Instrument)

    if observer_id is not None:
        query = query.where(Instrument.observer_id == observer_id)

    if serial_number is not None:
        query = query.where(Instrument.i_id.ilike(f"%{serial_number}%"))

    query = query.offset(skip).limit(limit)

    Logger.info(f"executing query: {query}", module="crud/instrument")
    result = await db.execute(query)
    instruments = list(result.scalars().all())
    return instruments


async def get_instruments_by_observer(db: AsyncSession, obs_id: int) -> List[Instrument]:
    query = select(Instrument).where(Instrument.observer_id == obs_id)
    Logger.info(f"executing query: {query}", module="crud/instrument")
    result = await db.execute(query)
    instruments = list(result.scalars().all())
    return instruments

async def get_instrument_by_id(db: AsyncSession, instr_id: int) -> Optional[Instrument]:
    query = select(Instrument).where(Instrument.id == instr_id)
    Logger.info(f"executing query: {query}", module="crud/instrument")
    result = await db.execute(query)
    return result.scalars().first()


async def get_instrument_by_serial_number(db: AsyncSession, serial_num: int) -> Optional[Instrument]:
    query = select(Instrument).where(Instrument.i_id == serial_num)
    Logger.info(f"executing query: {query}", module="crud/instrument")
    result = await db.execute(query)
    return result.scalars().first()


# Update
async def update_instrument(db: AsyncSession, inst_id: int, inst_update: InstrumentUpdate) -> Optional[Instrument]:
    instrument = await get_instrument_by_id(db, inst_id)
    if not instrument:
        return None

    update_data = inst_update.model_dump(exclude_unset=True)
    if update_data:
        stmt = (
            update(Instrument)
            .where(Instrument.id == inst_id)
            .values(**update_data)
            .returning(Instrument)
        )
        Logger.info(f"executing statement: {stmt}", module="crud/instrument")
        result = await db.execute(stmt)
        await db.commit()
        return result.scalars().first()

    return instrument


# Delete
async def delete_instrument(db: AsyncSession, inst_id: int) -> bool:
    instrument = await get_instrument_by_id(db, inst_id)
    if not instrument:
        return False

    stmt = delete(Instrument).where(Instrument.id == inst_id)
    Logger.info(f"executing statement: {stmt}", module="crud/instrument")
    await db.execute(stmt)
    await db.commit()
    return True
