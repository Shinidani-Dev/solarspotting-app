from sqlalchemy import Column, Integer, DateTime, Date, ForeignKey, String
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from backend.core.db import Base


class GroupData(Base):
    __tablename__ = "s_group_data"

    id = Column(Integer, primary_key=True, autoincrement=True)
    tstamp = Column(DateTime(timezone=True), default=datetime.now(timezone.utc))

    # Group data fields
    g_code = Column(Integer, nullable=False)
    g_date = Column(Date, nullable=False)
    g_ut = Column(Integer, nullable=True)
    g_q = Column(Integer, nullable=True)
    g_nr = Column(Integer, nullable=True)
    g_f = Column(Integer, nullable=True)
    g_zpd = Column(String(3), nullable=True)
    g_p = Column(Integer, nullable=True)
    g_s = Column(Integer, nullable=True)
    g_sector = Column(Integer, nullable=True)
    g_a = Column(Integer, nullable=True)
    g_pos = Column(String(6), nullable=True)

    # Bounding rectangle coordinates (can be NULL)
    rect_x_min = Column(Integer, nullable=True)
    rect_y_min = Column(Integer, nullable=True)
    rect_x_max = Column(Integer, nullable=True)
    rect_y_max = Column(Integer, nullable=True)

    # Foreign keys
    day_data_id = Column(Integer, ForeignKey("s_day_data.id"), nullable=False)
    observation_id = Column(Integer, ForeignKey("s_observation.id"), nullable=False)

    # Relationships
    day_data = relationship("DayData", back_populates="group_data")
    observation = relationship("Observation", back_populates="group_data")

    def __repr__(self):
        return f"GroupData(id={self.id}, g_code={self.g_code}, day_data_id={self.day_data_id}, observation_id={self.observation_id})"
