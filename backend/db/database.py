"""SQLAlchemy database engine and session factory for PostgreSQL."""
import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.core.config import settings

logger = logging.getLogger("railopt.db")

engine = create_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_pre_ping=True,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    use_insertmanyvalues=False,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """Yield a database session and ensure closure on completion."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
