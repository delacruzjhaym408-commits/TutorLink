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

# KUNIN NG USER ANG MGA MENSAHE NIYA (READ-ONLY)
@router.get("/my-messages", response_model=list[AdminMessageOut])
def get_my_admin_messages(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    messages = db.query(AdminMessage).filter(AdminMessage.user_id == current_user.id).order_by(AdminMessage.created_at.desc()).all()
    
    # Markahan na read lahat ng messages pag binuksan
    for m in messages:
        m.is_read = True
    db.commit()
    
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

@router.get("/appeals", response_model=list[AppealOut])
def get_all_appeals(current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    return db.query(UserAppeal).order_by(UserAppeal.created_at.desc()).all()