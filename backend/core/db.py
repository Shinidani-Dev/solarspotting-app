from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from backend.core.config import settings, logger


try:
    engine = create_engine(
        settings.DATABASE_URL,
        pool_size=int(settings.DB_POOL_SIZE if hasattr(settings, 'DB_POOL_SIZE') else 5),
        max_overflow=int(settings.DB_MAX_OVERFLOW if hasattr(settings, 'DB_MAX_OVERFLOW') else 10),
        pool_timeout=int(settings.DB_POOL_TIMEOUT if hasattr(settings, 'DB_POOL_TIMEOUT') else 30)
    )
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base = declarative_base()
    logger.info("Database connection established")
except Exception as e:
    logger.error(f"Database connection failed: {e}")
    raise


# Dependency für FastAPI
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# DB Verbindung testsn
def test_db_connection():
    try:
        db = SessionLocal()
        result = db.execute("SELECT version();").fetchone()
        logger.info(f"PostgreSQL Version: {result[0]}")
        db.close()
        return True
    except Exception as e:
        logger.error(f"Database connection test failed: {e}")
        return False
