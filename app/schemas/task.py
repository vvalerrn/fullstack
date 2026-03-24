from pydantic import BaseModel, Field
from typing import Optional
from datetime import date


class TaskBase(BaseModel):
    title: str = Field(..., min_length=3)
    description: Optional[str] = None
    status: Optional[str] = "pending"
    deadline: Optional[date] = None
    meeting_id: int
    assigned_to: Optional[int] = None


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3)
    description: Optional[str] = None
    status: Optional[str] = None
    deadline: Optional[date] = None


class TaskResponse(TaskBase):
    id: int

    class Config:
        from_attributes = True