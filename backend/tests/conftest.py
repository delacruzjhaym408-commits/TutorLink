import bcrypt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.engine import URL
from sqlalchemy.orm import sessionmaker

from app import models  # noqa: F401  (registers the tables)
from app.config import settings
from app.database import Base, get_db
from app.main import app
from app.models import Subject
from tests.helpers import create_admin, create_approved_tutor, create_user

TEST_DB_NAME = "tutorlink_test_db"

TEST_DATABASE_URL = URL.create(
    "mysql+pymysql",
    username=settings.DB_USER,
    password=settings.DB_PASSWORD,
    host=settings.DB_HOST,
    port=settings.DB_PORT,
    database=TEST_DB_NAME,
)

engine = create_engine(TEST_DATABASE_URL, pool_pre_ping=True, isolation_level="READ COMMITTED")
TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Safety: these tests must never run against the real database
assert engine.url.database == TEST_DB_NAME


@pytest.fixture(scope="session", autouse=True)
def fast_password_hashing():
    """Uses a cheaper bcrypt setting so the tests run faster."""
    original = bcrypt.gensalt
    bcrypt.gensalt = lambda rounds=12, prefix=b"2b": original(rounds=4, prefix=prefix)
    yield
    bcrypt.gensalt = original


@pytest.fixture(scope="session", autouse=True)
def create_test_tables():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    yield
    Base.metadata.drop_all(engine)


@pytest.fixture(autouse=True)
def clean_database():
    """Empties every table before each test and adds a few subjects."""
    with engine.begin() as connection:
        for table in reversed(Base.metadata.sorted_tables):
            connection.execute(table.delete())
    with TestingSession() as session:
        for name in ("Mathematics", "English", "Programming"):
            session.add(Subject(name=name, description=f"{name} lessons"))
        session.commit()
    yield


@pytest.fixture()
def db():
    session = TestingSession()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def client():
    def override_get_db():
        session = TestingSession()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture()
def admin_headers(client, db):
    return create_admin(client, db)


@pytest.fixture()
def tutor(client, db, admin_headers):
    return create_approved_tutor(client, db, admin_headers)


@pytest.fixture()
def parent_headers(client):
    return create_user(client, "parent@test.com", role="parent", full_name="Parent Test")