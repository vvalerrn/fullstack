from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import SessionLocal
from ..models.meeting import Meeting
from ..models.user import User
from ..schemas.meeting import MeetingCreate, MeetingUpdate, MeetingResponse
from ..dependencies import get_current_user

router = APIRouter(prefix="/meetings", tags=["Meetings"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# CREATE
@router.post("/", response_model=MeetingResponse)
def create_meeting(
    meeting: MeetingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_meeting = Meeting(
        title=meeting.title,
        description=meeting.description,
        notes=meeting.notes,
        summary=meeting.summary,
        meeting_date=meeting.meeting_date,
        owner_id=current_user.id
    )

    db.add(db_meeting)
    db.commit()
    db.refresh(db_meeting)

    return db_meeting


# READ ALL
@router.get("/", response_model=list[MeetingResponse])
def get_meetings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(Meeting).filter(Meeting.owner_id == current_user.id).all()

# READ ONE
@router.get("/{meeting_id}", response_model=MeetingResponse)
def get_meeting(
    meeting_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    meeting = (
        db.query(Meeting)
        .filter(Meeting.id == meeting_id, Meeting.owner_id == current_user.id)
        .first()
    )

    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    return meeting


# UPDATE
@router.put("/{meeting_id}", response_model=MeetingResponse)
def update_meeting(
    meeting_id: int,
    meeting_data: MeetingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    meeting = (
        db.query(Meeting)
        .filter(Meeting.id == meeting_id, Meeting.owner_id == current_user.id)
        .first()
    )

    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    for key, value in meeting_data.model_dump(exclude_unset=True).items():
        setattr(meeting, key, value)

    db.commit()
    db.refresh(meeting)

    return meeting


# DELETE
@router.delete("/{meeting_id}")
def delete_meeting(
    meeting_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()

    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    if meeting.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    db.delete(meeting)
    db.commit()

    return {"message": "Meeting deleted"}