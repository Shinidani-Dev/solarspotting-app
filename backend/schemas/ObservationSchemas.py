from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class ObservationBase(BaseModel):
    observer_id: int
    instrument_id: int
    notes: Optional[str] = None
    status: Optional[str] = "draft"
    verified: Optional[bool] = False
    is_public: Optional[bool] = False


class ObservationCreate(ObservationBase):
    created: Optional[datetime] = None


class ObservationUpdate(BaseModel):
    daily_protocol: Optional[str] = None
    sdo_image: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None
    is_public: Optional[bool] = None
    verified: bool = False
    created: Optional[datetime] = None


class VerificationUpdate(BaseModel):
    verified: bool


class PublicStatusUpdate(BaseModel):
    is_public: bool


class ObservationQuery(BaseModel):
    skip: Optional[int] = 0
    limit: Optional[int] = 100
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    status: Optional[str] = None
    observer_id: Optional[int] = None
    instrument_id: Optional[int] = None
    verified: Optional[bool] = None
    is_public: Optional[bool] = None


class ObservationResponse(BaseModel):
    id: int
    tstamp: datetime
    created: datetime
    observer_id: int
    instrument_id: int
    daily_protocol: Optional[str] = None
    sdo_image: Optional[str] = None
    notes: Optional[str] = None
    status: str
    verified: bool
    is_public: bool

    class Config:
        orm_mode = True


class ObservationListResponse(BaseModel):
    observations: List[ObservationResponse]
    count: int

    class Config:
        orm_mode = True
