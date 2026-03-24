from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, datetime


class MeetingBase(BaseModel):
    title: str = Field(..., min_length=3)
    description: Optional[str] = None
    meeting_date: Optional[date] = None
    owner_id: Optional[int] = None
    notes: Optional[str] = None
    summary: Optional[str] = None


class MeetingCreate(MeetingBase):
    pass


class MeetingUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3)
    description: Optional[str] = None
    meeting_date: Optional[date] = None
    notes: Optional[str] = None
    summary: Optional[str] = None


class MeetingResponse(MeetingBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True