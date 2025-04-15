from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime


class GroupDataBase(BaseModel):
    g_code: int
    g_date: date
    g_ut: Optional[int] = None
    g_q: Optional[int] = None
    g_nr: Optional[int] = None
    g_f: Optional[int] = None
    g_zpd: Optional[str] = Field(None, max_length=3)
    g_p: Optional[int] = None
    g_s: Optional[int] = None
    g_sector: Optional[int] = None
    g_a: Optional[int] = None
    g_pos: Optional[str] = Field(None, max_length=6)
    rect_x_min: Optional[int] = None
    rect_y_min: Optional[int] = None
    rect_x_max: Optional[int] = None
    rect_y_max: Optional[int] = None
    day_data_id: int
    observation_id: int


class GroupDataCreate(GroupDataBase):
    pass


class GroupDataUpdate(BaseModel):
    g_code: Optional[int] = None
    g_date: Optional[date] = None
    g_ut: Optional[int] = None
    g_q: Optional[int] = None
    g_nr: Optional[int] = None
    g_f: Optional[int] = None
    g_zpd: Optional[str] = Field(None, max_length=3)
    g_p: Optional[int] = None
    g_s: Optional[int] = None
    g_sector: Optional[int] = None
    g_a: Optional[int] = None
    g_pos: Optional[str] = Field(None, max_length=6)
    rect_x_min: Optional[int] = None
    rect_y_min: Optional[int] = None
    rect_x_max: Optional[int] = None
    rect_y_max: Optional[int] = None


class RectangleUpdate(BaseModel):
    rect_x_min: Optional[int] = None
    rect_y_min: Optional[int] = None
    rect_x_max: Optional[int] = None
    rect_y_max: Optional[int] = None


class GroupDataResponse(GroupDataBase):
    id: int
    tstamp: datetime

    class Config:
        orm_mode = True
        