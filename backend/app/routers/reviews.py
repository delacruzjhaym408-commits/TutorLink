from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from app.database import get_db
from app.dependencies import get_current_user
from app.models import User, Review, TutorPost, Conversation
from app.schemas import ReviewCreate, ReviewOut

router = APIRouter(prefix="/reviews", tags=["Reviews"])

@router.post("/tutor/{tutor_id}", response_model=ReviewOut, status_code=201)
def create_review(tutor_id: int, data: ReviewCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.id == tutor_id:
        raise HTTPException(status_code=400, detail="You cannot review yourself.")
    
    # 🔥 RESTRICTION: Kailangan may existing conversation (nag-usap sila)
    has_conversation = db.query(Conversation).filter(
        or_(
            and_(Conversation.participant1_id == current_user.id, Conversation.participant2_id == tutor_id),
            and_(Conversation.participant1_id == tutor_id, Conversation.participant2_id == current_user.id),
        )
    ).first()

    if not has_conversation:
        raise HTTPException(
            status_code=403, 
            detail="You can only rate a tutor after you have messaged them or had a session."
        )

    review = Review(
        tutor_id=tutor_id,
        reviewer_id=current_user.id,
        rating=data.rating,
        comment=data.comment
    )
    db.add(review)
    db.commit()
    db.refresh(review)

    posts = db.query(TutorPost).filter(TutorPost.user_id == tutor_id).all()
    if posts:
        all_reviews = db.query(Review).filter(Review.tutor_id == tutor_id).all()
        if all_reviews:
            avg_rating = sum([r.rating for r in all_reviews]) / len(all_reviews)
            for p in posts:
                p.rating = round(avg_rating, 1)
            db.commit()

    return {
        "id": review.id,
        "tutor_id": review.tutor_id,
        "reviewer_id": review.reviewer_id,
        "reviewer_name": current_user.full_name,
        "rating": review.rating,
        "comment": review.comment,
        "created_at": review.created_at
    }

@router.get("/tutor/{tutor_id}/stats")
def get_tutor_rating_stats(tutor_id: int, db: Session = Depends(get_db)):
    reviews = db.query(Review).filter(Review.tutor_id == tutor_id).all()
    if not reviews:
        return {"average": 5.0, "total_reviews": 0}
    total_stars = sum([r.rating for r in reviews])
    average = total_stars / len(reviews)
    return {"average": round(average, 1), "total_reviews": len(reviews)}

@router.get("/my-reviews", response_model=list[ReviewOut])
def get_my_reviews(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    reviews = db.query(Review).filter(Review.tutor_id == current_user.id).order_by(Review.created_at.desc()).all()
    result = []
    for r in reviews:
        reviewer = db.query(User).filter(User.id == r.reviewer_id).first()
        result.append({
            "id": r.id,
            "tutor_id": r.tutor_id,
            "reviewer_id": r.reviewer_id,
            "reviewer_name": reviewer.full_name if reviewer else "Unknown",
            "rating": r.rating,
            "comment": r.comment,
            "created_at": r.created_at
        })
    return result