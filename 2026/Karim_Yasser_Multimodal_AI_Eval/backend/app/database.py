"""Async SQLAlchemy database configuration using aiosqlite."""

import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

DATABASE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
os.makedirs(DATABASE_DIR, exist_ok=True)
DATABASE_URL = f"sqlite+aiosqlite:///{os.path.join(DATABASE_DIR, 'eval_framework.db')}"

engine = create_async_engine(DATABASE_URL, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    """Dependency that provides an async database session."""
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def init_db():
    """Create all tables on startup, and add any missing columns to existing tables."""
    async with engine.begin() as conn:
        from app.models import Dataset, ModelConfig, EvaluationRun, EvaluationResult, BenchmarkRun, BenchmarkTaskResult, Setting  # noqa: F401
        await conn.run_sync(Base.metadata.create_all)
        # Lightweight schema migration: add columns that exist in ORM but not in DB
        await conn.run_sync(_add_missing_columns)


def _add_missing_columns(conn):
    """Inspect each table and ALTER TABLE ADD COLUMN for any missing columns."""
    from sqlalchemy import inspect as sa_inspect, text

    inspector = sa_inspect(conn)
    for table_name, table in Base.metadata.tables.items():
        if not inspector.has_table(table_name):
            continue
        existing = {col["name"] for col in inspector.get_columns(table_name)}
        for column in table.columns:
            if column.name not in existing:
                col_type = column.type.compile(conn.engine.dialect)
                default = ""
                if column.default is not None:
                    val = column.default.arg
                    if callable(val):
                        val = val()
                    if isinstance(val, str):
                        default = f" DEFAULT '{val}'"
                    elif isinstance(val, bool):
                        default = f" DEFAULT {1 if val else 0}"
                    elif val is not None:
                        default = f" DEFAULT {val}"
                nullable = "" if column.nullable else " NOT NULL"
                # SQLite doesn't support NOT NULL without a default on ALTER TABLE
                if nullable and not default:
                    nullable = ""
                stmt = f'ALTER TABLE "{table_name}" ADD COLUMN "{column.name}" {col_type}{default}{nullable}'
                conn.execute(text(stmt))
