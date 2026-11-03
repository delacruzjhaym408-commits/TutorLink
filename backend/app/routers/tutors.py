from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload, selectinload

from app.database import get_db
from app.dependencies import get_current_user
from app.models import DayOfWeek, Subject, TutorAvailability, TutorProfile, User
from app.schemas import AvailabilityOut, SubjectOut, TutorDetail, TutorSummary

# Kailangan ng login para makita ang mga tutor
router = APIRouter(
    prefix="/tutors",
    tags=["Tutors"],
    dependencies=[Depends(get_current_user)],
)


def to_summary(tutor: TutorProfile) -> TutorSummary:
    return TutorSummary(
        id=tutor.id,
        full_name=tutor.user.full_name,
        hourly_rate=float(tutor.hourly_rate),
        subjects=[SubjectOut.model_validate(s) for s in tutor.subjects],
    )


def to_detail(tutor: TutorProfile) -> TutorDetail:
    return TutorDetail(
        id=tutor.id,
        full_name=tutor.user.full_name,
        hourly_rate=float(tutor.hourly_rate),
        subjects=[SubjectOut.model_validate(s) for s in tutor.subjects],
        qualifications=tutor.qualifications,
        bio=tutor.bio,
        availability=[AvailabilityOut.model_validate(a) for a in tutor.availability],
    )


@router.get("", response_model=list[TutorSummary])
def list_tutors(
    subject_id: Optional[int] = None,
    min_rate: Optional[float] = Query(default=None, ge=0),
    max_rate: Optional[float] = Query(default=None, ge=0),
    day: Optional[DayOfWeek] = None,
    db: Session = Depends(get_db),
):
    # Approved at aktibong tutors lamang ang makikita
    query = (
        db.query(TutorProfile)
        .filter(
            TutorProfile.is_approved.is_(True),
            TutorProfile.user.has(User.is_active.is_(True)),
        )
        .options(joinedload(TutorProfile.user), selectinload(TutorProfile.subjects))
    )

    if subject_id is not None:
        query = query.filter(TutorProfile.subjects.any(Subject.id == subject_id))
    if min_rate is not None:
        query = query.filter(TutorProfile.hourly_rate >= min_rate)
    if max_rate is not None:
        query = query.filter(TutorProfile.hourly_rate <= max_rate)
    if day is not None:
        query = query.filter(
            TutorProfile.availability.any(TutorAvailability.day_of_week == day)
        )

    tutors = query.order_by(TutorProfile.hourly_rate).all()
    return [to_summary(t) for t in tutors]


@router.get("/{tutor_id}", response_model=TutorDetail)
def get_tutor(tutor_id: int, db: Session = Depends(get_db)):
    tutor = (
        db.query(TutorProfile)
        .filter(
            TutorProfile.id == tutor_id,
            TutorProfile.is_approved.is_(True),
            TutorProfile.user.has(User.is_active.is_(True)),
        )
        .options(
            joinedload(TutorProfile.user),
            selectinload(TutorProfile.subjects),
            selectinload(TutorProfile.availability),
        )
        .first()
    )
    if tutor is None:
        raise HTTPException(status_code=404, detail="Tutor not found.")
    return to_detail(tutor)