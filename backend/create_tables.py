from app import models  # noqa: F401  (kailangan ito para makilala ang mga table)
from app.database import Base, engine

Base.metadata.create_all(bind=engine)
print("All tables have been created.")