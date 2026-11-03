from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db
from app.routers import (
    admin,
    auth,
    bookings,
    subjects,
    tutor_applications,
    tutor_profile,
    tutors,
    users,
)

app = FastAPI(
    title="TutorLink API",
    description="Backend API ng TutorLink: Tutor Discovery and Hiring Mobile Application",
    version="0.4.0",
)

# Pinapayagan ang Ionic app (na tumatakbo sa port 8100) na tumawag sa API na ito
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8100", "http://127.0.0.1:8100"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(admin.router)
app.include_router(subjects.router)
app.include_router(tutors.router)
app.include_router(tutor_applications.router)
app.include_router(tutor_profile.router)
app.include_router(bookings.router)


@app.get("/")
def read_root():
    return {"message": "Welcome to TutorLink API", "status": "running"}


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.get("/health/db")
def health_check_db(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ok", "database": "connected"}
    except Exception:
        raise HTTPException(
            status_code=500, detail="Cannot connect to the database"
        )