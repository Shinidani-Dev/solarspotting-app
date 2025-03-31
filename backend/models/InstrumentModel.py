from sqlalchemy import Column, Integer, Boolean, ForeignKey, DateTime, Text, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from backend.core.db import Base


class Instrument(Base):
    __tablename__ = "s_instrument"

    id = Column(Integer, primary_key=True, index=True)
    tstamp = Column(DateTime(timezone=True), server_default=func.now())
    i_id = Column(String, nullable=True)
    i_type = Column(Text, nullable=True)
    i_aperture = Column(Integer, nullable=True)
    i_focal_length = Column(Integer, nullable=True)
    i_filter = Column(Text, nullable=True)
    i_method = Column(Text, nullable=True)
    i_magnification = Column(Integer, nullable=True)
    i_projection = Column(Integer, nullable=True)
    i_inputpref = Column(Integer, nullable=True)
    in_use = Column(Boolean, default=True)
    observer_id = Column(Integer, ForeignKey("s_observer.id", ondelete="CASCADE"))

    # Relationship with Observer
    observer = relationship("Observer", back_populates="instruments")
