from pydantic import BaseModel
from typing import Optional, List


class ObserverCreate(BaseModel):
    user_id: int
    is_ai: Optional[bool] = False


class ObserverUpdate(BaseModel):
    is_ai: Optional[bool] = None


class ObserverResponse(BaseModel):
    id: int
    user_id: int
    is_ai: bool

    class Config:
        orm_mode = True
        from_attributes = True
