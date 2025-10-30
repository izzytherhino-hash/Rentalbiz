"""
Database connection management.

Handles SQLAlchemy engine and session creation.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator

from backend.config import get_settings

settings = get_settings()

# Create SQLAlchemy engine with optimized connection pooling
engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False} if "sqlite" in settings.database_url else {},
    echo=settings.debug,
    # Connection pool optimization for production workloads
    pool_size=20,          # Increase from default 5 to 20 connections
    max_overflow=40,       # Allow up to 60 total connections (20 + 40 overflow)
    pool_pre_ping=True,    # Verify connections are alive before using them
    pool_recycle=3600,     # Recycle connections every hour (prevents stale connections)
)

# Create SessionLocal class
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


def get_db() -> Generator[Session, None, None]:
    """
    Dependency function that yields database sessions.

    Yields:
        Session: SQLAlchemy database session

    Example:
        @app.get("/items")
        def get_items(db: Session = Depends(get_db)):
            return db.query(Item).all()
    """
    db = SessionLocal()
    try:
        yield db
        # Commit any uncommitted changes when request succeeds
        db.commit()
    except Exception:
        # Roll back on any exception
        db.rollback()
        raise
    finally:
        db.close()
