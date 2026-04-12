"""SQLite persistence for evaluation results — survives server restarts."""

import json
from pathlib import Path
from typing import Any

import aiosqlite

DB_PATH = Path(__file__).parent / "data" / "eval_results.db"


async def init_db() -> None:
    DB_PATH.parent.mkdir(exist_ok=True)
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS eval_results (
                eval_id      TEXT PRIMARY KEY,
                created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                eval_type    TEXT,   -- 'single' | 'compare'
                tasks        TEXT,   -- JSON array
                models       TEXT,   -- JSON array
                harness      TEXT,
                data         TEXT    -- full result as JSON
            )
        """)
        await db.commit()


async def save_result(
    eval_id: str,
    eval_type: str,
    tasks: list[str],
    models: list[str],
    harness: str,
    data: dict[str, Any],
) -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """INSERT OR REPLACE INTO eval_results
               (eval_id, eval_type, tasks, models, harness, data)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (eval_id, eval_type, json.dumps(tasks), json.dumps(models), harness, json.dumps(data)),
        )
        await db.commit()


async def get_result(eval_id: str) -> dict[str, Any] | None:
    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute(
            "SELECT data FROM eval_results WHERE eval_id = ?", (eval_id,)
        ) as cursor:
            row = await cursor.fetchone()
            return json.loads(row[0]) if row else None


async def list_results() -> list[dict[str, Any]]:
    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute(
            """SELECT eval_id, created_at, eval_type, tasks, models, harness
               FROM eval_results ORDER BY created_at DESC"""
        ) as cursor:
            rows = await cursor.fetchall()
            return [
                {
                    "eval_id": r[0],
                    "created_at": r[1],
                    "eval_type": r[2],
                    "tasks": json.loads(r[3]),
                    "models": json.loads(r[4]),
                    "harness": r[5],
                }
                for r in rows
            ]
