from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, UserRole
from app.schemas import TokenOut, UserCreate, UserOut, user_to_out
from app.security import (
    DUMMY_HASH,
    create_access_token,
    hash_password,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(data: UserCreate, db: Session = Depends(get_db)):
    email = data.email.lower()
    email_taken = HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail="An account with this email already exists",
    )

    if db.query(User).filter(User.email == email).first() is not None:
        raise email_taken

    user = User(
        email=email,
        password_hash=hash_password(data.password),
        full_name=data.full_name,
        phone_number=data.phone_number,
        role=UserRole.student,
    )

    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise email_taken
    db.refresh(user)
    return user_to_out(user)


@router.post("/login", response_model=TokenOut)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form.username.strip().lower()).first()

    password_hash = user.password_hash if user else DUMMY_HASH
    password_ok = verify_password(form.password, password_hash)

    if user is None or not password_ok:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account is disabled",
        )

    return TokenOut(
        access_token=create_access_token(user.id),
        token_type="bearer",
        user=user_to_out(user),
    )