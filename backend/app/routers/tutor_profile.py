from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_approved_tutor
from app.models import TutorProfile
from app.routers.tutors import to_detail
from app.schemas import TutorDetail
from app.schemas_tutor import TutorProfileIn
from app.tutor_utils import apply_profile_data

router = APIRouter(prefix="/tutor-profile", tags=["Tutor Profile"])


@router.get("/me", response_model=TutorDetail)
def read_my_profile(profile: TutorProfile = Depends(require_approved_tutor)):
    return to_detail(profile)


@router.put("/me", response_model=TutorDetail)
def update_my_profile(
    data: TutorProfileIn,
    profile: TutorProfile = Depends(require_approved_tutor),
    db: Session = Depends(get_db),
):
    apply_profile_data(db, profile, data)
    db.commit()
    db.refresh(profile)
    return to_detail(profile)