"""
Script para gumawa ng lahat ng tables sa database.
Patakbuhin ito isang beses pagkatapos ng DROP TABLE.

Usage:
    python create_tables.py
"""
from app.database import Base, engine
from app import models  # noqa: F401 — import para ma-register ang models


def main():
    print("Creating tables...")
    Base.metadata.create_all(bind=engine)
    print("✅ Tables created successfully!")
    print("\nTables:")
    for table_name in Base.metadata.tables.keys():
        print(f"  - {table_name}")


if __name__ == "__main__":
    main()