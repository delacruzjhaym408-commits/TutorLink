from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings
import ssl

# 🔥 SSL Configuration para sa Aiven MySQL
connect_args = {}
if "aivencloud.com" in settings.database_url:
    connect_args = {"ssl": {"ssl_mode": "REQUIRED"}}

engine = create_engine(
    settings.database_url, 
    pool_pre_ping=True,
    connect_args=connect_args
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()