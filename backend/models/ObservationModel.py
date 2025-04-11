from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from backend.core.db import Base


class Observation(Base):
    __tablename__ = "s_observation"

    id = Column(Integer, primary_key=True, autoincrement=True)
    tstamp = Column(DateTime(timezone=True), default=datetime.now(timezone.utc))
    created = Column(DateTime(timezone=True), default=datetime.now(timezone.utc))

    # Foreign keys
    observer_id = Column(Integer, ForeignKey("s_observer.id"), nullable=False)
    instrument_id = Column(Integer, ForeignKey("s_instrument.id"), nullable=False)

    # Observation data
    daily_protocol = Column(String(255), nullable=True)  # Link to stored protocol image
    sdo_image = Column(String(255), nullable=True)  # Link to stored solar image
    verified = Column(Boolean, default=False)
    notes = Column(Text, nullable=True)
    status = Column(String(50), default="draft")
    is_public = Column(Boolean, default=False)

    # Relationships
    observer = relationship("Observer", back_populates="observations")
    instrument = relationship("Instrument", back_populates="observations")

    # TODO: uncomment below, as soon as groups is implemented
    # sunspots = relationship("Sunspot", back_populates="observation", cascade="all, delete-orphan")

    def __repr__(self):
        return f"Observation(id={self.id}, date={self.tstamp}, observer_id={self.observer_id})"
