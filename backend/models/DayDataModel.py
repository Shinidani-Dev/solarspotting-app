from sqlalchemy import Column, Integer, DateTime, Date, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from backend.core.db import Base


class DayData(Base):
    __tablename__ = "s_day_data"

    id = Column(Integer, primary_key=True, autoincrement=True)
    tstamp = Column(DateTime(timezone=True), default=datetime.now(timezone.utc))

    # Day data fields
    d_code = Column(Integer, nullable=False)
    d_date = Column(Date, nullable=False)
    d_ut = Column(Integer, nullable=True)
    d_q = Column(Integer, nullable=True)
    d_gruppen = Column(Integer, nullable=True)
    d_flecken = Column(Integer, nullable=True)
    d_a = Column(Integer, nullable=True)
    d_b = Column(Integer, nullable=True)
    d_c = Column(Integer, nullable=True)
    d_d = Column(Integer, nullable=True)
    d_e = Column(Integer, nullable=True)
    d_f = Column(Integer, nullable=True)
    d_g = Column(Integer, nullable=True)
    d_h = Column(Integer, nullable=True)
    d_j = Column(Integer, nullable=True)

    # Foreign keys
    observation_id = Column(Integer, ForeignKey("s_observation.id"), nullable=False, unique=True)

    # Relationships
    observation = relationship("Observation", back_populates="day_data")
    group_data = relationship("GroupData", back_populates="day_data", cascade="all, delete-orphan")

    def __repr__(self):
        return f"DayData(id={self.id}, date={self.d_date}, observation_id={self.observation_id})"