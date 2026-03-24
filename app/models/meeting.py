from sqlalchemy import Column, Integer, String, Text, Date, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime

from ..database import Base


class Meeting(Base):
    __tablename__ = "meetings"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    notes = Column(Text)
    summary = Column(Text)
    meeting_date = Column(Date)
    created_at = Column(DateTime, default=datetime.utcnow)

    owner_id = Column(Integer, ForeignKey("users.id"))

    # связи
    owner = relationship("User", back_populates="meetings")

    tasks = relationship(
        "Task",
        back_populates="meeting",
        cascade="all, delete"
    )