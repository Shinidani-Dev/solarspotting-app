# schemas/DetailedObservationSchemas.py
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import date

from .ObservationSchemas import ObservationCreate, ObservationUpdate, ObservationResponse
from .DayDataSchemas import DayDataResponse, DayDataUpdate
from .GroupDataSchemas import GroupDataResponse, GroupDataUpdate


# Special schemas for group data in detailed requests
class DetailedGroupDataCreate(BaseModel):
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
    # No observation_id or day_data_id required here


# Special schema for day data in detailed requests
class DetailedDayDataCreate(BaseModel):
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
    # No observation_id required here


# For creating a detailed observation
class DetailedObservationCreate(BaseModel):
    observation: ObservationCreate
    day_data: DetailedDayDataCreate
    group_data: List[DetailedGroupDataCreate]


# Special schemas for updating
class DetailedGroupDataUpdate(GroupDataUpdate):
    id: Optional[int] = None  # Include id for identifying existing records
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


# For updating a detailed observation
class DetailedObservationUpdate(BaseModel):
    observation: Optional[ObservationUpdate] = None
    day_data: Optional[DayDataUpdate] = None
    group_data: Optional[List[DetailedGroupDataUpdate]] = None


# For returning a detailed observation - this can stay the same
class DetailedObservationResponse(BaseModel):
    observation: ObservationResponse
    day_data: DayDataResponse
    group_data: List[GroupDataResponse]