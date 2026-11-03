from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload, selectinload

from app.database import get_db
from app.dependencies import require_admin
from app.models import (
    ApplicationStatus,
    Booking,
    TutorApplication,
    TutorProfile,
    User,
)
from app.schemas import UserOut, user_to_out
from app.schemas_tutor import AdminApplicationOut, AdminStats, RejectIn
from app.tutor_utils import admin_application_to_out

# Ang dependencies sa router ay nalalapat sa LAHAT ng endpoint dito: admin lamang
router = APIRouter(
    prefix="/admin",
    tags=["Admin"],
    dependencies=[Depends(require_admin)],
)


@router.get("/users", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db)):
    users = (
        db.query(User).options(joinedload(User.tutor_profile)).order_by(User.id).all()
    )
    return [user_to_out(u) for u in users]


@router.get("/stats", response_model=AdminStats)
def get_stats(db: Session = Depends(get_db)):
    return AdminStats(
        total_users=db.query(func.count(User.id)).scalar() or 0,
        approved_tutors=db.query(func.count(TutorProfile.id))
        .filter(TutorProfile.is_approved.is_(True))
        .scalar()
        or 0,
        pending_applications=db.query(func.count(TutorApplication.id))
        .filter(TutorApplication.status == ApplicationStatus.pending)
        .scalar()
        or 0,
        total_bookings=db.query(func.count(Booking.id)).scalar() or 0,
    )


@router.get("/applications", response_model=list[AdminApplicationOut])
def list_applications(
    status_filter: Optional[ApplicationStatus] = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
):
    query = db.query(TutorApplication).options(
        joinedload(TutorApplication.tutor_profile).joinedload(TutorProfile.user),
        joinedload(TutorApplication.tutor_profile).selectinload(TutorProfile.subjects),
        joinedload(TutorApplication.tutor_profile).selectinload(TutorProfile.availability),
    )
    if status_filter is not None:
        query = query.filter(TutorApplication.status == status_filter)

    applications = query.order_by(TutorApplication.submitted_at.desc()).all()
    return [admin_application_to_out(a) for a in applications]


def get_pending_application(db: Session, application_id: int) -> TutorApplication:
    # Ni-lock ang row para hindi magkasabay ang dalawang admin sa pagsusuri
    application = (
        db.query(TutorApplication)
        .filter(TutorApplication.id == application_id)
        .with_for_update()
        .first()
    )
    if application is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Application not found")
    if application.status != ApplicationStatus.pending:
        raise HTTPException(status.HTTP_409_CONFLICT, "This application has already been reviewed")
    return application


@router.post("/applications/{application_id}/approve", response_model=AdminApplicationOut)
def approve_application(
    application_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    application = get_pending_application(db, application_id)
    application.status = ApplicationStatus.approved
    application.admin_remarks = None
    application.reviewed_by = admin.id
    application.reviewed_at = func.now()
    # Dito nagiging tutor ang user: lalabas na siya sa listahan
    application.tutor_profile.is_approved = True
    db.commit()
    db.refresh(application)
    return admin_application_to_out(application)


@router.post("/applications/{application_id}/reject", response_model=AdminApplicationOut)
def reject_application(
    application_id: int,
    data: RejectIn,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    application = get_pending_application(db, application_id)
    application.status = ApplicationStatus.rejected
    application.admin_remarks = data.remarks
    application.reviewed_by = admin.id
    application.reviewed_at = func.now()
    db.commit()
    db.refresh(application)
    return admin_application_to_out(application)