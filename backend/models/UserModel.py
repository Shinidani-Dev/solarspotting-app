from datetime import timezone, datetime
from sqlalchemy import Boolean, Column, Integer, String, Date, DateTime, CheckConstraint

from backend.core.db import Base


class User(Base):
    """The User Model for mapping to the s_user Table in the DB"""
    __tablename__ = "s_user"

    __table_args__ = (
        CheckConstraint("gender IN ('male', 'female', 'other')", name="check_gender"),
        CheckConstraint("role IN ('user', 'admin')", name="check_role"),
    )

    id = Column(Integer, primary_key=True, index=True)
    tstamp = Column(DateTime(timezone=True), default=datetime.now(timezone.utc))
    firstname = Column(String(255), nullable=False)
    lastname = Column(String(255), nullable=False)
    date_of_birth = Column(Date, nullable=False)
    gender = Column(String(10), nullable=False)
    company = Column(String(255), nullable=True)
    street = Column(String(255), nullable=False)
    postal_code = Column(String(32), nullable=False)
    city = Column(String(255), nullable=False)
    state = Column(String(64), nullable=True)
    country = Column(String(2), nullable=False)
    phone = Column(String(32), nullable=True)
    mobile = Column(String(32), nullable=True)
    email = Column(String(255), nullable=False, unique=True)
    username = Column(String(64), nullable=False, unique=True)
    hashed_pw = Column(String(255), nullable=False)
    active = Column(Boolean, default=True)
    login_attempts = Column(Integer, default=0)
    locked = Column(Boolean, default=False)
    role = Column(String(10), nullable=False, default="user")
    is_labeler = Column(Boolean, default=False)

    def __repr__(self):
        return f"<User {self.username}>"

    @property
    def full_name(self):
        """Return user's full name"""
        return f"{self.firstname} {self.lastname}"

    @property
    def is_admin(self):
        """Check if user has admin role"""
        return self.role == "admin"
