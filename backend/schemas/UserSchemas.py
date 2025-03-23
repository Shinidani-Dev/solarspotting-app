from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field, model_validator
from backend.models.UserModel import User

import re


class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=64)
    firstname: str
    lastname: str
    email: EmailStr
    date_of_birth: date
    gender: str
    street: str
    postal_code: str
    city: str
    country: str = Field(..., min_length=2, max_length=2)

    # Optional Fields
    company: Optional[str] = None
    state: Optional[str] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None

    @model_validator(mode="after")
    def validate_gender(self):
        """Check if gender in Enum"""
        gender = self.gender
        allowed_genders = {"male", "female", "other"}
        if gender and gender.lower() not in allowed_genders:
            raise ValueError(f"Gender must be one of: {', '.join(allowed_genders)}")

        return self


class UserCreate(UserBase):
    password: str = Field(..., min_length=8)

    @model_validator(mode="after")
    def validate_password(self):
        """Enforce strong password rules"""
        password = self.password
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

        return self


class UserUpdate(BaseModel):
    firstname: Optional[str] = None
    lastname: Optional[str] = None
    email: Optional[EmailStr] = None
    company: Optional[str] = None
    street: Optional[str] = None
    postal_code: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: str = Field(..., min_length=2, max_length=2)
    phone: Optional[str] = None
    mobile: Optional[str] = None
    active: Optional[bool] = None

    class Config:
        from_attributes = True


class AdminUserUpdate(BaseModel):
    """Schema for admin-only user updates"""
    role: Optional[str] = "user"
    is_labeler: Optional[bool] = False
    locked: Optional[bool] = False

    @model_validator(mode="after")
    def validate_role(self):
        role = self.role
        if role is not None and role not in ["user", "admin"]:
            raise ValueError("Role must be 'user' or 'admin'")
        return self


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
        from_attributes = True

    @classmethod
    def from_user(cls, user: User) -> "UserResponse":
        """Create a UserResponse from a User model instance"""
        return cls(
            id=user.id,
            username=user.username,
            email=user.email,
            firstname=user.firstname,
            lastname=user.lastname,
            date_of_birth=user.date_of_birth,
            gender=user.gender,
            company=user.company,
            country=user.country,
            active=user.active,
            role=user.role,
            is_labeler=user.is_labeler,
            tstamp=user.tstamp
        )


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)

    @model_validator(mode="after")
    def validate_password(self):
        """Enforce strong password rules"""
        password = self.new_password
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

        return self


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None
    user_id: Optional[int] = None
    is_admin: bool = False
    is_labeler: bool = False


