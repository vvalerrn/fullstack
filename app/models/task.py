from sqlalchemy import Column, Integer, String, Text, Date, ForeignKey
from sqlalchemy.orm import relationship

from ..database import Base


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    status = Column(String(50), default="pending")
    deadline = Column(Date)

    meeting_id = Column(Integer, ForeignKey("meetings.id"))
    assigned_to = Column(Integer, ForeignKey("users.id"))

    # связи
    meeting = relationship("Meeting", back_populates="tasks")
    assigned_user = relationship("User", back_populates="tasks")