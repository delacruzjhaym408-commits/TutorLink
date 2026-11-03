from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import Subject
from app.schemas import SubjectOut

# Kailangan ng login para makita ang mga subject
router = APIRouter(
    prefix="/subjects",
    tags=["Subjects"],
    dependencies=[Depends(get_current_user)],
)


@router.get("", response_model=list[SubjectOut])
def list_subjects(db: Session = Depends(get_db)):
    return db.query(Subject).order_by(Subject.name).all()