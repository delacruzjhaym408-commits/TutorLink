from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import (
    DayOfWeek,
    Subject,
    TutorApplication,
    TutorAvailability,
    TutorProfile,
)
from app.schemas import AvailabilityOut, SubjectOut
from app.schemas_tutor import AdminApplicationOut, TutorApplicationOut, TutorProfileIn

DAY_ORDER = list(DayOfWeek)


def apply_profile_data(db: Session, profile: TutorProfile, data: TutorProfileIn) -> None:
    """Inilalagay ang laman ng form sa tutor profile (subjects at availability kasama)."""
    subjects = db.query(Subject).filter(Subject.id.in_(data.subject_ids)).all()
    if len(subjects) != len(data.subject_ids):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="One of the subjects does not exist",
        )

    profile.qualifications = data.qualifications
    profile.bio = data.bio
    profile.hourly_rate = data.hourly_rate
    profile.subjects = subjects
    # Binubura ang lumang availability at pinapalitan ng bago
    profile.availability = [
        TutorAvailability(
            day_of_week=slot.day_of_week,
            start_time=slot.start_time,
            end_time=slot.end_time,
        )
        for slot in data.availability
    ]


def _application_fields(application: TutorApplication) -> dict:
    profile = application.tutor_profile
    availability = sorted(
        profile.availability,
        key=lambda a: (DAY_ORDER.index(a.day_of_week), a.start_time),
    )
    return {
        "id": application.id,
        "status": application.status,
        "qualifications": profile.qualifications,
        "bio": profile.bio,
        "hourly_rate": float(profile.hourly_rate),
        "subjects": [SubjectOut.model_validate(s) for s in profile.subjects],
        "availability": [AvailabilityOut.model_validate(a) for a in availability],
        "admin_remarks": application.admin_remarks,
        "submitted_at": application.submitted_at,
        "reviewed_at": application.reviewed_at,
    }


def application_to_out(application: TutorApplication) -> TutorApplicationOut:
    return TutorApplicationOut(**_application_fields(application))


def admin_application_to_out(application: TutorApplication) -> AdminApplicationOut:
    user = application.tutor_profile.user
    return AdminApplicationOut(
        **_application_fields(application),
        applicant_name=user.full_name,
        applicant_email=user.email,
    )