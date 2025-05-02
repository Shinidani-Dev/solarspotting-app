from fastapi import APIRouter, HTTPException, status, Query, Path
from typing import List, Optional

from backend.core.dependencies import DB_DEPENDENCY, CURRENT_ACTIVE_USER, CURRENT_ADMIN_USER
from backend.schemas.InstrumentSchemas import InstrumentCreate, InstrumentUpdate, InstrumentResponse
from backend.crud import s_instrument, s_observer

router = APIRouter(
    prefix="/instruments",
    tags=["instruments"]
)


@router.post("/", response_model=InstrumentResponse, status_code=status.HTTP_201_CREATED)
async def create_instrument(
        inst: InstrumentCreate,
        db: DB_DEPENDENCY,
        usr: CURRENT_ACTIVE_USER
):
    if usr.role != "admin" and inst.observer_id != usr.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="cannot create an instrument for another observer"
        )

    created_instrument, error_msg = await s_instrument.create_instrument(db, inst)

    if error_msg:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg
        )

    return created_instrument


@router.get("/", response_model=List[InstrumentResponse], status_code=status.HTTP_200_OK)
async def get_isntruments(
        db: DB_DEPENDENCY,
        usr: CURRENT_ADMIN_USER,
        observer_id: Optional[int] = Query(None, description="Filter by observer ID"),
        serial_number: Optional[str] = Query(None, description="Filter by serial number"),
        skip: Optional[int] = Query(0, description="Number of records to skip"),
        limit: Optional[int] = Query(100, description="Maximum number of records to return")
):
    instruments = await s_instrument.get_filtered_instruments(
        db,
        observer_id=observer_id,
        serial_number=serial_number,
        skip=skip,
        limit=limit
    )
    return instruments


@router.get("/my", response_model=List[InstrumentResponse], status_code=status.HTTP_200_OK)
async def get_my_instruments(
        db: DB_DEPENDENCY,
        usr: CURRENT_ACTIVE_USER,
        skip: Optional[int] = Query(0, description="Number of records to skip"),
        limit: Optional[int] = Query(100, description="Maximum number of records to return")
):
    instruments = await s_instrument.get_instruments_by_observer(db, usr.id, skip, limit)
    return instruments


@router.get("/{instrument_id}", response_model=InstrumentResponse, status_code=status.HTTP_200_OK)
async def get_instrument_by_id(
        db: DB_DEPENDENCY,
        usr: CURRENT_ACTIVE_USER,
        instrument_id: int = Path(..., description="The ID of the instrument to retrieve")
):
    """Get a specific instrument by ID"""
    instrument = await s_instrument.get_instrument_by_id(db, instrument_id)

    if not instrument:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Instrument with ID {instrument_id} not found"
        )

    # Check if user is admin or owns the instrument
    if usr.role != "admin" and instrument.observer_id != usr.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this instrument"
        )

    return instrument


@router.put("/{instrument_id}", response_model=InstrumentResponse, status_code=status.HTTP_200_OK)
async def update_instrument(
        db: DB_DEPENDENCY,
        usr: CURRENT_ACTIVE_USER,
        instrument_update: InstrumentUpdate,
        instrument_id: int = Path(..., description="The ID of the instrument to update")
):
    """Update an existing instrument"""
    existing_instrument = await s_instrument.get_instrument_by_id(db, instrument_id)

    if not existing_instrument:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Instrument with ID {instrument_id} not found"
        )

    if usr.role != "admin" and existing_instrument.observer_id != usr.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this instrument"
        )

    if instrument_update.observer_id and instrument_update.observer_id != existing_instrument.observer_id:
        if usr.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins can transfer instruments between observers"
            )

        # Check if target observer exists
        target_observer = await s_observer.get_observer(db, instrument_update.observer_id)
        if not target_observer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Target observer with ID {instrument_update.observer_id} not found"
            )

    updated_instrument = await s_instrument.update_instrument(db, instrument_id, instrument_update)

    return updated_instrument


@router.delete("/{instr_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_instrument(
        db: DB_DEPENDENCY,
        usr: CURRENT_ACTIVE_USER,
        instr_id: int = Path(..., description="The ID of the instrument to delete"),
):
    """Delete an instrument"""
    existing_instrument = await s_instrument.get_instrument_by_id(db, instr_id)

    if not existing_instrument:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Instrument with ID {instr_id} not found"
        )

    if usr.role != "admin" and existing_instrument.observer_id != usr.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this instrument"
        )

    success = await s_instrument.delete_instrument(db, instr_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to delete instrument"
        )

    return None
