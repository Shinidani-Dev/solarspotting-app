from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime


class DayDataBase(BaseModel):
    d_code: int
    d_date: date
    d_ut: Optional[int] = None
    d_q: Optional[int] = None
    d_gruppen: Optional[int] = None
    d_flecken: Optional[int] = None
    d_a: Optional[int] = None
    d_b: Optional[int] = None
    d_c: Optional[int] = None
    d_d: Optional[int] = None
    d_e: Optional[int] = None
    d_f: Optional[int] = None
    d_g: Optional[int] = None
    d_h: Optional[int] = None
    d_j: Optional[int] = None
    observation_id: int


class DayDataCreate(DayDataBase):
    pass


class DayDataUpdate(BaseModel):
    d_code: Optional[int] = None
    d_date: Optional[date] = None
    d_ut: Optional[int] = None
    d_q: Optional[int] = None
    d_gruppen: Optional[int] = None
    d_flecken: Optional[int] = None
    d_a: Optional[int] = None
    d_b: Optional[int] = None
    d_c: Optional[int] = None
    d_d: Optional[int] = None
    d_e: Optional[int] = None
    d_f: Optional[int] = None
    d_g: Optional[int] = None
    d_h: Optional[int] = None
    d_j: Optional[int] = None


class DayDataResponse(DayDataBase):
    id: int
    tstamp: datetime

    class Config:
        orm_mode = True
