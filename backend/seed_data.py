from datetime import time

from app.database import SessionLocal
from app.models import (
    ApplicationStatus,
    Booking,
    DayOfWeek,
    Subject,
    TutorApplication,
    TutorAvailability,
    TutorProfile,
    User,
    UserRole,
)

# The subjects (course codes) used by the app
SUBJECTS = [
    "IT-IM01",
    "IT-SAO",
    "ELP",
    "IT-IPT01",
    "IT-IAS01",
    "IT-IPT02",
    "FIL3",
    "IT-MS01",
    "CC103",
    "GEN ED 6",
    "GE8",
    "IT-WS02",
    "IT-PF01",
    "PATH FIT3",
]

# Sample tutors (for testing only; they cannot log in)
TUTORS = [
    {
        "email": "sample.tutor@example.com",
        "full_name": "Sample Tutor",
        "hourly_rate": 250,
        "subjects": ["IT-PF01", "IT-IM01"],
        "qualifications": "3rd year BS Information Technology student; Dean's Lister",
        "bio": "Patient and approachable. Teaches programming and information management.",
        "availability": [
            ("monday", time(16, 0), time(18, 0)),
            ("wednesday", time(16, 0), time(18, 0)),
            ("saturday", time(9, 0), time(12, 0)),
        ],
    },
    {
        "email": "ana.reyes.sample@example.com",
        "full_name": "Ana Reyes",
        "hourly_rate": 250,
        "subjects": ["GE8", "GEN ED 6"],
        "qualifications": "3rd year BS Education; Dean's Lister",
        "bio": "Patient and approachable. I like explaining things step by step until they make sense.",
        "availability": [
            ("monday", time(16, 0), time(18, 0)),
            ("wednesday", time(16, 0), time(18, 0)),
            ("saturday", time(9, 0), time(12, 0)),
        ],
    },
    {
        "email": "mark.villanueva.sample@example.com",
        "full_name": "Mark Villanueva",
        "hourly_rate": 300,
        "subjects": ["IT-IPT01", "IT-IPT02", "IT-WS02"],
        "qualifications": "4th year BS Information Technology; 2 years of web development experience",
        "bio": "I teach beginners programming and web development using real examples.",
        "availability": [
            ("tuesday", time(18, 0), time(20, 0)),
            ("thursday", time(18, 0), time(20, 0)),
            ("sunday", time(13, 0), time(17, 0)),
        ],
    },
    {
        "email": "liza.mendoza.sample@example.com",
        "full_name": "Liza Mendoza",
        "hourly_rate": 200,
        "subjects": ["FIL3", "ELP"],
        "qualifications": "3rd year BSE major in Filipino; Campus journalist",
        "bio": "I will help you improve your reading, writing, and grammar.",
        "availability": [
            ("friday", time(15, 0), time(18, 0)),
            ("saturday", time(8, 0), time(11, 0)),
        ],
    },
    {
        "email": "carlo.bautista.sample@example.com",
        "full_name": "Carlo Bautista",
        "hourly_rate": 350,
        "subjects": ["IT-IAS01", "IT-MS01", "CC103"],
        "qualifications": "BS Information Technology graduate; Board exam passer",
        "bio": "I use examples and diagrams to make hard topics easier to understand.",
        "availability": [
            ("monday", time(17, 0), time(19, 0)),
            ("thursday", time(17, 0), time(19, 0)),
            ("saturday", time(13, 0), time(16, 0)),
        ],
    },
]


def find_subjects(db, names):
    return db.query(Subject).filter(Subject.name.in_(names)).all()


def seed_subjects(db):
    for name in SUBJECTS:
        if db.query(Subject).filter(Subject.name == name).first() is None:
            db.add(Subject(name=name, description=None))
    db.commit()


def seed_tutors(db):
    for data in TUTORS:
        user = db.query(User).filter(User.email == data["email"]).first()
        if user is not None:
            # Already exists: refresh the text fields and the subjects
            profile = user.tutor_profile
            if profile is not None:
                profile.qualifications = data["qualifications"]
                profile.bio = data["bio"]
                profile.subjects = find_subjects(db, data["subjects"])
            continue

        user = User(
            email=data["email"],
            password_hash="SAMPLE-NOT-A-REAL-HASH",
            full_name=data["full_name"],
            role=UserRole.student,
        )
        db.add(user)
        db.flush()  # to get user.id

        profile = TutorProfile(
            user_id=user.id,
            qualifications=data["qualifications"],
            bio=data["bio"],
            hourly_rate=data["hourly_rate"],
            is_approved=True,
        )
        profile.subjects = find_subjects(db, data["subjects"])
        profile.availability = [
            TutorAvailability(
                day_of_week=DayOfWeek(day), start_time=start, end_time=end
            )
            for day, start, end in data["availability"]
        ]
        db.add(profile)
        db.flush()

        db.add(
            TutorApplication(
                tutor_profile_id=profile.id,
                status=ApplicationStatus.approved,
                admin_remarks="Sample data",
            )
        )
    db.commit()


def remove_old_subjects(db):
    """Deletes subjects that are not in SUBJECTS, unless a booking still uses them."""
    old_subjects = db.query(Subject).filter(Subject.name.not_in(SUBJECTS)).all()
    for subject in old_subjects:
        in_use = (
            db.query(Booking.id).filter(Booking.subject_id == subject.id).first()
            is not None
        )
        if in_use:
            print(f"Kept '{subject.name}' because a booking still uses it.")
            continue
        db.delete(subject)
    db.commit()


def main():
    db = SessionLocal()
    try:
        seed_subjects(db)
        seed_tutors(db)
        remove_old_subjects(db)
        print("Subjects and sample tutors are up to date.")
    finally:
        db.close()


if __name__ == "__main__":
    main()