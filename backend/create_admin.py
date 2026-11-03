import getpass

from app.database import SessionLocal
from app.models import User, UserRole
from app.security import hash_password


def main():
    email = input("Admin email: ").strip().lower()
    full_name = input("Full name: ").strip()
    password = getpass.getpass("Password (at least 8 characters): ")
    confirm = getpass.getpass("Repeat the password: ")

    if "@" not in email or len(full_name) < 2:
        print("The email or name is invalid.")
        return
    if password != confirm:
        print("The passwords do not match.")
        return
    if len(password) < 8 or len(password.encode("utf-8")) > 72:
        print("The password must be between 8 and 72 bytes.")
        return

    db = SessionLocal()
    try:
        if db.query(User).filter(User.email == email).first() is not None:
            print("An account with this email already exists.")
            return
        db.add(
            User(
                email=email,
                password_hash=hash_password(password),
                full_name=full_name,
                role=UserRole.admin,
            )
        )
        db.commit()
        print("The admin account has been created.")
    finally:
        db.close()


if __name__ == "__main__":
    main()