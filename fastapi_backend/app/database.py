# fastapi_backend/app/database.py
from typing import AsyncGenerator
from urllib.parse import urlparse
from fastapi import Depends
from fastapi_users.db import SQLAlchemyUserDatabase
from sqlalchemy import NullPool
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import sessionmaker

from .config import settings
from .models import Base, User

# ------------------------------------------------------------
# Build proper async connection URL for asyncpg
# ------------------------------------------------------------
parsed_db_url = urlparse(settings.DATABASE_URL)

async_db_connection_url = (
    f"postgresql+asyncpg://{parsed_db_url.username}:{parsed_db_url.password}@"
    f"{parsed_db_url.hostname}{':' + str(parsed_db_url.port) if parsed_db_url.port else ''}"
    f"{parsed_db_url.path}"
)

# ------------------------------------------------------------
# Create Async Engine & Session
# ------------------------------------------------------------
engine = create_async_engine(async_db_connection_url, poolclass=NullPool)

async_session_maker = async_sessionmaker(
    bind=engine, expire_on_commit=settings.EXPIRE_ON_COMMIT
)

# ------------------------------------------------------------
# Utility for Alembic or startup
# ------------------------------------------------------------
async def create_db_and_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

# ------------------------------------------------------------
# Async session dependency for FastAPI routes
# ------------------------------------------------------------
async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        yield session

# ------------------------------------------------------------
# Optional helper for fastapi-users
# ------------------------------------------------------------
async def get_user_db(session: AsyncSession = Depends(get_async_session)):
    yield SQLAlchemyUserDatabase(session, User)