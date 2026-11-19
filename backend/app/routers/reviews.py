from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from app.database import get_db
from app.dependencies import get_current_user
from app.models import User, Review, TutorPost, Conversation, SessionBooking, Enrollment, Lesson
from app.schemas import ReviewCreate, ReviewOut

router = APIRouter(prefix="/reviews", tags=["Reviews"])

@router.post("/tutor/{tutor_id}", response_model=ReviewOut, status_code=201)
def create_review(tutor_id: int, data: ReviewCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.id == tutor_id:
        raise HTTPException(status_code=400, detail="You cannot review yourself.")
    
    # 🔥 REVIEW GATING LOGIC: Kailangan may completed na 1v1 session O completed na GC enrollment
    completed_1v1 = db.query(SessionBooking).filter(
        SessionBooking.tutor_id == tutor_id,
        SessionBooking.student_id == current_user.id,
        SessionBooking.status == 'completed'
    ).first()

    completed_gc = db.query(Enrollment).join(Lesson).filter(
        Lesson.tutor_id == tutor_id,
        Enrollment.student_id == current_user.id,
        Enrollment.status == 'completed'
    ).first()

    if not completed_1v1 and not completed_gc:
        raise HTTPException(
            status_code=403, 
            detail="You can only rate a tutor after completing a session with them."
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

    # I-update ang average rating sa lahat ng posts ng tutor
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

@router.get("/can-review/{tutor_id}")
def can_review_tutor(
    tutor_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Check if the current user can review a tutor.

    Rules:
    - Must have a COMPLETED 1v1 session with the tutor, OR
    - Must have a COMPLETED GC enrollment with the tutor.
    - Cannot review yourself.
    - Cannot review the same tutor twice (one review per student-tutor pair).
    """
    # Cannot review yourself
    if current_user.id == tutor_id:
        return {
            "allowed": False,
            "reason": "You cannot review yourself.",
            "source": None,
        }

    # Check if tutor exists
    tutor = db.query(User).filter(User.id == tutor_id).first()
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor not found.")

    # Check if already reviewed
    existing_review = db.query(Review).filter(
        Review.tutor_id == tutor_id,
        Review.reviewer_id == current_user.id,
    ).first()
    if existing_review:
        return {
            "allowed": False,
            "reason": "You have already reviewed this tutor.",
            "source": None,
        }

    # Check for completed 1v1 session
    completed_1v1 = db.query(SessionBooking).filter(
        SessionBooking.tutor_id == tutor_id,
        SessionBooking.student_id == current_user.id,
        SessionBooking.status == "completed",
    ).first()

    if completed_1v1:
        return {
            "allowed": True,
            "reason": "You have a completed 1v1 session with this tutor.",
            "source": "1v1",
        }

    # Check for completed GC enrollment
    completed_gc = db.query(Enrollment).join(Lesson).filter(
        Lesson.tutor_id == tutor_id,
        Enrollment.student_id == current_user.id,
        Enrollment.status == "completed",
    ).first()

    if completed_gc:
        return {
            "allowed": True,
            "reason": "You have a completed group session with this tutor.",
            "source": "gc",
        }

    # No completed session
    return {
        "allowed": False,
        "reason": "You can only rate a tutor after completing a session with them.",
        "source": None,
    }

@router.get("/tutor/{tutor_id}/stats")
def get_tutor_rating_stats(tutor_id: int, db: Session = Depends(get_db)):
    tutor = db.query(User).filter(User.id == tutor_id).first()
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor not found.")

    reviews_query = db.query(Review).filter(Review.tutor_id == tutor_id)

    # 🔥 KUNG NAKA-HIDE ANG LOW RATINGS, I-EXCLUDE ANG 1 AT 2 STARS SA COUNTS
    if tutor.hide_low_ratings:
        reviews_query = reviews_query.filter(Review.rating > 2)

    reviews = reviews_query.all()
    
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

@router.get("/unread-count")
def get_unread_reviews_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    count = db.query(Review).filter(
        Review.tutor_id == current_user.id,
        Review.is_read == False
    ).count()
    return {"unread_reviews": count}

@router.put("/mark-as-read")
def mark_reviews_as_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db.query(Review).filter(
        Review.tutor_id == current_user.id,
        Review.is_read == False
    ).update({"is_read": True})
    db.commit()
    return {"status": "success"}