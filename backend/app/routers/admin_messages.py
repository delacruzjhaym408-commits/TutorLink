from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_user, require_admin
from app.models import User, AdminMessage
from app.schemas import AdminMessageCreate, AdminMessageOut
from app.models import UserAppeal
from app.schemas import AppealCreate, AppealOut
router = APIRouter(prefix="/admin-messages", tags=["Admin Messages"])

# ADMIN LANG ANG PWEDENG MAG-SEND
@router.post("", response_model=AdminMessageOut, status_code=201)
def send_admin_message(data: AdminMessageCreate, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == data.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    msg = AdminMessage(user_id=data.user_id, message=data.message)
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg

@router.get("/my-messages")
def get_my_admin_messages(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    messages = db.query(AdminMessage).filter(
        AdminMessage.user_id == current_user.id
    ).order_by(AdminMessage.created_at.desc()).all()
    return messages

@router.post("/appeal", response_model=AppealOut, status_code=201)
def submit_appeal(data: AppealCreate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email.lower()).first()
    if not user:
        raise HTTPException(status_code=404, detail="Email not found in our system.")
    
    if user.is_active:
        raise HTTPException(status_code=400, detail="This account is not disabled.")
        
    appeal = UserAppeal(user_id=user.id, reason=data.reason)
    db.add(appeal)
    db.commit()
    db.refresh(appeal)
    return appeal

@router.get("/appeals")
def get_all_appeals(current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    appeals = db.query(UserAppeal).order_by(UserAppeal.created_at.desc()).all()
    result = []
    for a in appeals:
        user = db.query(User).filter(User.id == a.user_id).first()
        result.append({
            "id": a.id,
            "user_id": a.user_id,
            "user_name": user.full_name if user else "Unknown",
            "email": user.email if user else "N/A",
            "reason": a.reason,
            "status": a.status,
            "created_at": a.created_at
        })
    return result

@router.delete("/appeals/{appeal_id}", status_code=204)
def delete_appeal(appeal_id: int, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    appeal = db.query(UserAppeal).filter(UserAppeal.id == appeal_id).first()
    if not appeal:
        raise HTTPException(status_code=404, detail="Appeal not found")
    
    db.delete(appeal)
    db.commit()
    return None