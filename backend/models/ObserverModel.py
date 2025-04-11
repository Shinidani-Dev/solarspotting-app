from sqlalchemy import Column, Integer, Boolean, ForeignKey
from sqlalchemy.orm import relationship

from backend.core.db import Base


class Observer(Base):
    __tablename__ = "s_observer"

    # Primary key now matches the user ID
    id = Column(Integer, ForeignKey("s_user.id", ondelete="CASCADE"), primary_key=True)
    is_ai = Column(Boolean, default=False)

    # Relationship with User - now a one-to-one relationship
    user = relationship("User", back_populates="observer", uselist=False)

    # These relationships remain the same
    instruments = relationship("Instrument", back_populates="observer")
    observations = relationship("Observation", back_populates="observer")
