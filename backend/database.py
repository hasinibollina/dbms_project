import os
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Locate and load environment variables from backend/.env or project root .env
backend_env = Path(__file__).resolve().parent / ".env"
root_env = Path(__file__).resolve().parent.parent / ".env"

if backend_env.exists():
    load_dotenv(dotenv_path=backend_env)
elif root_env.exists():
    load_dotenv(dotenv_path=root_env)
else:
    load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError(
        "DATABASE_URL is not set in environment or .env file. "
        "Please check your .env configuration."
    )

# Create database engine with pool pre-ping to handle stale connections
engine = create_engine(DATABASE_URL, pool_pre_ping=True)

# Session factory for database transactions
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Declarative base class for ORM models
Base = declarative_base()


def get_db():
    """Dependency helper to yield a database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
