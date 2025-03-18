from typing import Annotated
from fastapi import Depends
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base

from backend.core.config import settings
from backend.helpers.LoggingHelper import LoggingHelper


engine = create_async_engine(
    settings.SQLALCHEMY_DATABASE_URI,
    echo=settings.DEBUG,
    future=True
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        LoggingHelper.debug("Database session created", module="db")
        try:
            yield session
        finally:
            await session.close()
            LoggingHelper.debug("Database session closed", module="db")


# TODO: Implement the init function using Alembic for future initialization of Tables if they don't exist.

DB_DEPENDENCY = Annotated[AsyncSession, Depends(get_db)]
