from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_student
from app.models import ApplicationStatus, TutorApplication, TutorProfile, User
from app.schemas_tutor import TutorApplicationOut, TutorProfileIn
from app.tutor_utils import apply_profile_data, application_to_out

router = APIRouter(prefix="/tutor-applications", tags=["Tutor Applications"])


@router.post("", response_model=TutorApplicationOut, status_code=status.HTTP_201_CREATED)
def submit_application(
    data: TutorProfileIn,
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db),
):
    profile = current_user.tutor_profile

    if profile is not None:
        if profile.is_approved:
            raise HTTPException(status.HTTP_409_CONFLICT, "You are already a tutor")
        pending = (
            db.query(TutorApplication)
            .filter(
                TutorApplication.tutor_profile_id == profile.id,
                TutorApplication.status == ApplicationStatus.pending,
            )
            .first()
        )
        if pending is not None:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                "You already have an application waiting for review",
            )
    else:
        # Bagong profile na HINDI pa aprubado, kaya hindi pa lalabas sa listahan
        profile = TutorProfile(
            user_id=current_user.id,
            qualifications=data.qualifications,
            hourly_rate=data.hourly_rate,
            is_approved=False,
        )
        db.add(profile)

    apply_profile_data(db, profile, data)
    db.flush()

    application = TutorApplication(
        tutor_profile_id=profile.id, status=ApplicationStatus.pending
    )
    db.add(application)
    db.commit()
    db.refresh(application)
    return application_to_out(application)


@router.get("/me", response_model=Optional[TutorApplicationOut])
def read_my_application(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = current_user.tutor_profile
    if profile is None:
        return None

    application = (
        db.query(TutorApplication)
        .filter(TutorApplication.tutor_profile_id == profile.id)
        .order_by(TutorApplication.submitted_at.desc(), TutorApplication.id.desc())
        .first()
    )
    return application_to_out(application) if application else None