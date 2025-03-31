from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class InstrumentCreate(BaseModel):
    i_id: Optional[str] = None
    i_type: Optional[str] = None
    i_aperture: Optional[int] = None
    i_focal_length: Optional[int] = None
    i_filter: Optional[str] = None
    i_method: Optional[str] = None
    i_magnification: Optional[int] = None
    i_projection: Optional[int] = None
    i_inputpref: Optional[int] = None
    in_use: bool = True
    observer_id: Optional[int] = None


class InstrumentUpdate(BaseModel):
    i_id: Optional[str] = None
    i_type: Optional[str] = None
    i_aperture: Optional[int] = None
    i_focal_length: Optional[int] = None
    i_filter: Optional[str] = None
    i_method: Optional[str] = None
    i_magnification: Optional[int] = None
    i_projection: Optional[int] = None
    i_inputpref: Optional[int] = None
    in_use: Optional[bool] = None
    observer_id: Optional[int] = None


class InstrumentResponse(BaseModel):
    id: int
    tstamp: datetime
    i_id: Optional[str] = None
    i_type: Optional[str] = None
    i_aperture: Optional[int] = None
    i_focal_length: Optional[int] = None
    i_filter: Optional[str] = None
    i_method: Optional[str] = None
    i_magnification: Optional[int] = None
    i_projection: Optional[int] = None
    i_inputpref: Optional[int] = None
    in_use: bool
    observer_id: int

    class Config:
        orm_mode = True
        from_attributes = True
