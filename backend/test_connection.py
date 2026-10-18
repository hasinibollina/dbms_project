"""Database connection test utility.

Run with: python backend/test_connection.py
"""
import sys
from pathlib import Path
from sqlalchemy import text

# Ensure backend package can be imported
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.database import engine  # noqa: E402


def test_connection():
    """Verify that the database engine can successfully connect and execute queries."""
    print("Testing database connection...")
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT version();"))
            db_version = result.scalar()
            print("[SUCCESS] Connected to database successfully!")
            print(f"[INFO] Database Engine: {engine.dialect.name}")
            print(f"[INFO] Version: {db_version}")
            return True
    except Exception as exc:
        print(f"[ERROR] Failed to connect to database: {exc}")
        return False


if __name__ == "__main__":
    success = test_connection()
    sys.exit(0 if success else 1)
