from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import aiosqlite

from config import settings

_db_path = Path(settings.database_path)


async def init_db() -> None:
    _db_path.parent.mkdir(parents=True, exist_ok=True)
    async with aiosqlite.connect(_db_path) as db:
        await db.executescript(
            """
            CREATE TABLE IF NOT EXISTS documents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                content TEXT NOT NULL DEFAULT '',
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS grammar_checks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                document_id INTEGER,
                issue_count INTEGER,
                grammar_score INTEGER,
                payload TEXT,
                created_at TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (document_id) REFERENCES documents(id)
            );

            CREATE TABLE IF NOT EXISTS suggestions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                document_id INTEGER,
                original_text TEXT,
                rewritten_text TEXT,
                mode TEXT,
                created_at TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (document_id) REFERENCES documents(id)
            );

            CREATE TABLE IF NOT EXISTS history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                document_id INTEGER,
                action TEXT,
                before_text TEXT,
                after_text TEXT,
                created_at TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (document_id) REFERENCES documents(id)
            );
            """
        )
        await db.commit()
    await seed_sample_documents()


DEMO_SAMPLE_TEXT = (
    "Medicare Clinic is a mid-sized outpatient healthcare facility managing over 1,000 chronic disease patients. "
    "The clinical team struggles to proactively manage follow-up care across patients with conditions such as "
    "Type 2 Diabetes, Hypertension, Heart Failure, COPD, and Anemia. Patients who miss appointments or show "
    "worsening lab values are often not tidied until their next scheduled visit, leading to avoidable complications "
    "and hospital readmissions.\n\n"
    "The clinic's medical director wants to deploy an AI-peered agent that can autonomously review patient records, "
    "identify high-risk patients, and generate prioritized action plans for the care coordination team."
)

SAMPLE_DOCS = [
    ("Medicare Clinic Brief", DEMO_SAMPLE_TEXT),
    (
        "Resume bullet draft",
        "Worked on website project. Helped team with tasks. Used React sometimes. "
        "Responsible for fixing bugs and attending meetings.",
    ),
    (
        "Professional Email",
        "hey just checking in about the interview. let me know when you can thanks",
    ),
    (
        "Cover Letter",
        "I am writing to apply for the role. I think I would be good fit because I like coding and worked on projects before.",
    ),
]


async def seed_sample_documents() -> None:
    async with aiosqlite.connect(_db_path) as db:
        cursor = await db.execute("SELECT COUNT(*) FROM documents")
        count = (await cursor.fetchone())[0]
        if count > 0:
            return
        for title, content in SAMPLE_DOCS:
            await db.execute(
                "INSERT INTO documents (title, content, updated_at) VALUES (?, ?, datetime('now'))",
                (title, content),
            )
        await db.commit()


async def list_documents() -> list[dict[str, Any]]:
    async with aiosqlite.connect(_db_path) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT id, title, content, created_at, updated_at FROM documents ORDER BY updated_at DESC"
        )
        rows = await cursor.fetchall()
        return [dict(r) for r in rows]


async def get_document(doc_id: int) -> dict[str, Any] | None:
    async with aiosqlite.connect(_db_path) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT id, title, content, created_at, updated_at FROM documents WHERE id = ?",
            (doc_id,),
        )
        row = await cursor.fetchone()
        return dict(row) if row else None


async def save_document(title: str, content: str, doc_id: int | None = None) -> dict[str, Any]:
    async with aiosqlite.connect(_db_path) as db:
        db.row_factory = aiosqlite.Row
        if doc_id:
            await db.execute(
                "UPDATE documents SET title = ?, content = ?, updated_at = datetime('now') WHERE id = ?",
                (title, content, doc_id),
            )
        else:
            cursor = await db.execute(
                "INSERT INTO documents (title, content) VALUES (?, ?)",
                (title, content),
            )
            doc_id = cursor.lastrowid
        await db.commit()
    doc = await get_document(doc_id)
    assert doc is not None
    return doc


async def delete_document(doc_id: int) -> bool:
    async with aiosqlite.connect(_db_path) as db:
        cursor = await db.execute("DELETE FROM documents WHERE id = ?", (doc_id,))
        await db.commit()
        return cursor.rowcount > 0


async def log_grammar_check(document_id: int | None, payload: dict, issue_count: int, grammar_score: int) -> None:
    async with aiosqlite.connect(_db_path) as db:
        await db.execute(
            "INSERT INTO grammar_checks (document_id, issue_count, grammar_score, payload) VALUES (?, ?, ?, ?)",
            (document_id, issue_count, grammar_score, json.dumps(payload)),
        )
        await db.commit()


async def log_suggestion(
    document_id: int | None, original: str, rewritten: str, mode: str
) -> None:
    async with aiosqlite.connect(_db_path) as db:
        await db.execute(
            "INSERT INTO suggestions (document_id, original_text, rewritten_text, mode) VALUES (?, ?, ?, ?)",
            (document_id, original, rewritten, mode),
        )
        await db.commit()


async def log_history(document_id: int | None, action: str, before: str, after: str) -> None:
    async with aiosqlite.connect(_db_path) as db:
        await db.execute(
            "INSERT INTO history (document_id, action, before_text, after_text) VALUES (?, ?, ?, ?)",
            (document_id, action, before, after),
        )
        await db.commit()
