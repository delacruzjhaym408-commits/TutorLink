"""
Migration Script for Phase 3: Separate Session Conversations from Private Chats
===============================================================================
This script adds two new columns to the `conversations` table:
  1. conversation_type VARCHAR(20) NOT NULL DEFAULT 'private'
  2. lesson_id INT NULL (Foreign Key to lessons.id, ON DELETE CASCADE)

Run this ONCE from C:\TutorLink\backend\:
    python migrate_phase3.py

If something goes wrong, restore from backup_before_migration.sql
"""

import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load credentials from .env
load_dotenv()

DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")
DB_NAME = os.getenv("DB_NAME")

# Build connection URL with SSL required (Aiven needs SSL)
DB_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}?ssl_ca="

print("=" * 60)
print("PHASE 3 MIGRATION: Adding conversation_type and lesson_id")
print("=" * 60)
print(f"Target: {DB_HOST}:{DB_PORT}/{DB_NAME}")
print()

engine = create_engine(DB_URL, connect_args={"ssl": {}})

with engine.connect() as conn:
    # --- Step 1: Check existing columns ---
    print("[1/4] Checking existing columns...")
    result = conn.execute(text("""
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = :db AND TABLE_NAME = 'conversations'
    """), {"db": DB_NAME})
    existing_cols = [row[0] for row in result]
    print(f"      Existing columns: {existing_cols}")

    # --- Step 2: Add conversation_type ---
    if "conversation_type" in existing_cols:
        print("[2/4] SKIP: conversation_type already exists.")
    else:
        print("[2/4] Adding conversation_type column...")
        conn.execute(text("""
            ALTER TABLE conversations 
            ADD COLUMN conversation_type VARCHAR(20) NOT NULL DEFAULT 'private'
        """))
        conn.commit()
        print("      DONE.")

    # --- Step 3: Add lesson_id ---
    if "lesson_id" in existing_cols:
        print("[3/4] SKIP: lesson_id already exists.")
    else:
        print("[3/4] Adding lesson_id column + foreign key...")
        conn.execute(text("""
            ALTER TABLE conversations 
            ADD COLUMN lesson_id INT NULL
        """))
        conn.execute(text("""
            ALTER TABLE conversations 
            ADD CONSTRAINT fk_conversation_lesson 
            FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
        """))
        conn.commit()
        print("      DONE.")

    # --- Step 4: Verify ---
    print("[4/4] Verifying final structure...")
    result = conn.execute(text("""
        SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = :db AND TABLE_NAME = 'conversations'
        ORDER BY ORDINAL_POSITION
    """), {"db": DB_NAME})
    print()
    print(f"{'Column':<25} {'Type':<20} {'Null':<8} {'Default':<15}")
    print("-" * 70)
    for row in result:
        print(f"{row[0]:<25} {row[1]:<20} {row[2]:<8} {str(row[3]):<15}")

print()
print("=" * 60)
print("✅ MIGRATION COMPLETE")
print("=" * 60)
print("Next: Update models.py, schemas.py, conversations.py, lessons.py")