from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_user
from app.models import User, Report, TutorPost
from app.schemas import ReportCreate, ReportOut

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.post("", response_model=ReportOut, status_code=201)
def create_report(data: ReportCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not data.reported_user_id and not data.reported_post_id:
        raise HTTPException(status_code=400, detail="You must report either a user or a post.")
    
    report = Report(
        reporter_id=current_user.id,
        reported_user_id=data.reported_user_id,
        reported_post_id=data.reported_post_id,
        reason=data.reason
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    
    reported_user = None
    if data.reported_user_id:
        reported_user = db.query(User).filter(User.id == data.reported_user_id).first()

    reported_post = None
    if data.reported_post_id:
        reported_post = db.query(TutorPost).filter(TutorPost.id == data.reported_post_id).first()

    post_details = None
    if reported_post:
        post_details = {
            "id": reported_post.id,
            "user_id": reported_post.user_id,
            "subject": reported_post.subject,
            "description": reported_post.description,
            "hourly_rate": float(reported_post.hourly_rate) if reported_post.hourly_rate else 0,
            "post_pictures": reported_post.post_pictures,
            "tutor_name": reported_post.owner.full_name if reported_post.owner else "Unknown",
            "tutor_email": reported_post.owner.email if reported_post.owner else "Unknown",
        }
        
    user_details = None
    if reported_user:
        user_details = {
            "id": reported_user.id,
            "full_name": reported_user.full_name,
            "email": reported_user.email,
            "profile_picture": reported_user.profile_picture,
        }
    
    return {
        "id": report.id,
        "reporter_id": report.reporter_id,
        "reporter_name": current_user.full_name,
        "reported_user_id": report.reported_user_id,
        "reported_user_name": reported_user.full_name if reported_user else None,
        "reported_post_id": report.reported_post_id,
        "reported_post_subject": reported_post.subject if reported_post else None,
        "reason": report.reason,
        "status": report.status,
        "created_at": report.created_at,
        "total_user_reports": 0,
        "post_details": post_details,
        "user_details": user_details
    }

@router.get("", response_model=list[ReportOut])
def get_reports(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can view reports")

    reports = db.query(Report).order_by(Report.created_at.desc()).all()
    result = []
    
    for r in reports:
        reporter = db.query(User).filter(User.id == r.reporter_id).first()
        reported_user = db.query(User).filter(User.id == r.reported_user_id).first() if r.reported_user_id else None
        reported_post = db.query(TutorPost).filter(TutorPost.id == r.reported_post_id).first() if r.reported_post_id else None
        
        # 🔥 Bilangin kung ilang beses na-report ang user
        total_user_reports = 0
        if r.reported_user_id:
            total_user_reports = db.query(Report).filter(Report.reported_user_id == r.reported_user_id).count()

        # 🔥 Bilangin kung ilang beses na-report ang post
        total_post_reports = 0
        if r.reported_post_id:
            total_post_reports = db.query(Report).filter(Report.reported_post_id == r.reported_post_id).count()

        post_details = None
        if reported_post:
            post_details = {
                "id": reported_post.id,
                "user_id": reported_post.user_id, 
                "subject": reported_post.subject,
                "description": reported_post.description,
                "hourly_rate": float(reported_post.hourly_rate) if reported_post.hourly_rate else 0,
                "post_pictures": reported_post.post_pictures,
                "tutor_name": reported_post.owner.full_name if reported_post.owner else "Unknown",
                "tutor_email": reported_post.owner.email if reported_post.owner else "Unknown",
            }
            
        user_details = None
        if reported_user:
            user_details = {
                "id": reported_user.id,
                "full_name": reported_user.full_name,
                "email": reported_user.email,
                "profile_picture": reported_user.profile_picture,
            }

        result.append({
            "id": r.id,
            "reporter_id": r.reporter_id,
            "reporter_name": reporter.full_name if reporter else "Unknown",
            "reported_user_id": r.reported_user_id,
            "reported_user_name": reported_user.full_name if reported_user else None,
            "reported_post_id": r.reported_post_id,
            "reported_post_subject": reported_post.subject if reported_post else None,
            "reason": r.reason,
            "status": r.status,
            "created_at": r.created_at,
            "total_user_reports": total_user_reports,
            "total_post_reports": total_post_reports, # 🔥 IDINAGDAG
            "post_details": post_details,
            "user_details": user_details
        })
        
    return result

@router.put("/{report_id}/resolve")
def resolve_report(report_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can resolve reports")
        
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    report.status = "resolved"
    db.commit()
    return {"status": "resolved"}