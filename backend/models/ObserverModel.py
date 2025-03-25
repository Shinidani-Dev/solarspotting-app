from sqlalchemy import Column, Integer, Boolean, ForeignKey
from sqlalchemy.orm import relationship

from backend.core.db import Base


class Observer(Base):
    __tablename__ = "s_observer"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("s_user.id"), nullable=False, unique=True)
    is_ai = Column(Boolean, default=False)

    # TODO: Uncomment when the other entities are implemented
    user = relationship("User", back_populates="observer")
    # instruments = relationship("Instrument", back_populates="observer")
    # observations = relationship("Observation", back_populates="observer")
