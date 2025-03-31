from pydantic import BaseModel, Field
from typing import Optional


class ObserverBase(BaseModel):
    is_ai: bool = False


class ObserverCreate(ObserverBase):
    pass


class ObserverUpdate(ObserverBase):
    is_ai: Optional[bool] = None


class ObserverResponse(BaseModel):
    id: int
    is_ai: bool

    class Config:
        orm_mode = True
        from_attributes = True
