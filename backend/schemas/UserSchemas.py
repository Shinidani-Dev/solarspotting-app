from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field, model_validator

import re


class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=64)
    email: EmailStr
    firstname: str
    lastname: str


class UserCreate(BaseModel):
    password: str = Field(..., min_length=8)
    date_of_birth: date
    gender: str
    company: Optional[str] = None
    street: str
    postal_code: str
    city: str
    state: Optional[str] = None
    country: str = Field(..., min_length=2, max_length=2)
    phone: Optional[str] = None
    mobile: Optional[str] = None

    @model_validator(mode="before")
    def validate_fields(self, values):
        """Check if gender in Enum"""
        gender = values.get("gender")
        allowed_genders = {"male", "female", "other"}
        if gender and gender.lower() not in allowed_genders:
            raise ValueError(f"Gender must be one of: {', '.join(allowed_genders)}")

        """Enforce strong password rules"""
        password = values.get("password")
        if not password:
            raise ValueError("Password is required")

        if not re.search(r"[A-Z]", password):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", password):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"\d", password):
            raise ValueError("Password must contain at least one digit")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
            raise ValueError("Password must contain at least one special character")

        return values


class UserUpdate(BaseModel):
    firstname: Optional[str] = None
    lastname: Optional[str] = None
    email: Optional[EmailStr] = None
    company: Optional[str] = None
    street: Optional[str] = None
    postal_code: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None

    class Config:
        orm_mode = True


class UserResponse(BaseModel):
    id: int
    username: str
    email: EmailStr
    firstname: str
    lastname: str
    date_of_birth: date
    gender: str
    company: Optional[str] = None
    country: str
    active: bool
    role: str
    is_labeler: bool
    tstamp: datetime

    class Config:
        orm_mode = True


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None
    user_id: Optional[int] = None
    is_admin: bool = False
    is_labeler: bool = False


