"""
Seed Vocabulary Agent 数据库

同时支持 PostgreSQL（生产）和 SQLite（开发 / 无 Docker 环境）。

用法：
    # PostgreSQL（默认）
    python -m tools.seed-data.seed

    # SQLite（无需 Docker）
    python -m tools.seed-data.seed --db-url sqlite:///./vocab_agent.db
"""
from __future__ import annotations

import argparse
import csv
import json
import os
import sqlite3
import sys
from pathlib import Path
from typing import Any

from loguru import logger


# ============ Backend 判断 ============
def is_sqlite(db_url: str) -> bool:
    return db_url.startswith("sqlite")


def is_postgres(db_url: str) -> bool:
    return db_url.startswith(("postgres://", "postgresql://"))


# ============ Schema 初始化 ============
SQLITE_SCHEMA = """
CREATE TABLE IF NOT EXISTS words (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    headword      TEXT NOT NULL UNIQUE,
    ipa           TEXT,
    pos           TEXT,
    translation   TEXT,
    translation_en TEXT,
    etymology     TEXT,
    collocations  TEXT,
    exam_tags     TEXT,
    frq           REAL,
    created_at    TEXT DEFAULT (datetime('now')),
    updated_at    TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_words_headword ON words (headword);
CREATE INDEX IF NOT EXISTS idx_words_frq ON words (frq DESC);

CREATE TABLE IF NOT EXISTS wordbooks (
    id           TEXT PRIMARY KEY,
    name         TEXT NOT NULL,
    description  TEXT,
    exam_tag     TEXT,
    cover_color  TEXT,
    word_count   INTEGER DEFAULT 0,
    created_at   TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS wordbook_words (
    wordbook_id TEXT NOT NULL,
    word_id     INTEGER NOT NULL,
    ord         INTEGER NOT NULL,
    PRIMARY KEY (wordbook_id, word_id)
);

CREATE TABLE IF NOT EXISTS user_word_progress (
    user_id          TEXT NOT NULL,
    word_id          INTEGER NOT NULL,
    status           TEXT NOT NULL DEFAULT 'new',
    fsrs_state       TEXT NOT NULL,
    last_reviewed_at TEXT,
    next_due_at      TEXT,
    wrong_count      INTEGER DEFAULT 0,
    PRIMARY KEY (user_id, word_id)
);
"""


def init_schema(db_url: str) -> None:
    if is_sqlite(db_url):
        # 去掉 sqlite:/// 前缀拿到文件路径
        db_path = db_url.replace("sqlite:///", "").replace("sqlite://", "")
        db_file = Path(db_path)
        db_file.parent.mkdir(parents=True, exist_ok=True)
        with sqlite3.connect(db_file) as conn:
            conn.executescript(SQLITE_SCHEMA)
            conn.commit()
        logger.success(f"SQLite Schema 初始化完成：{db_file}")
        return

    # PostgreSQL
    import psycopg
    schema_path = Path(__file__).parent / "sql" / "schema.sql"
    sql = schema_path.read_text(encoding="utf-8")
    with psycopg.connect(db_url) as conn:
        with conn.cursor() as cur:
            cur.execute(sql)
        conn.commit()
    logger.success("PostgreSQL Schema 初始化完成")


# ============ 通用工具 ============
def _to_json_text(obj: Any) -> str:
    return json.dumps(obj, ensure_ascii=False)


def _exc():
    """上下文管理器：返回 cursor / connection。"""
    raise NotImplementedError


# ============ 导入 ECDICT 高频词 ============
def import_ecdict(db_url: str, csv_path: Path, frq_threshold: float = 30.0) -> int:
    """导入 ECDICT 高频词（默认取 BNC 频率 ≥ 30 的，约 5000 词）。"""
    if not csv_path.exists():
        logger.warning(f"ECDICT 文件不存在：{csv_path}，跳过")
        return 0

    count = 0

    if is_sqlite(db_url):
        db_file = Path(db_url.replace("sqlite:///", "").replace("sqlite://", ""))
        with sqlite3.connect(db_file) as conn:
            for row in _iter_ecdict(csv_path, frq_threshold):
                conn.execute(
                    """
                    INSERT INTO words (headword, ipa, pos, translation, translation_en, frq)
                    VALUES (?, ?, ?, ?, ?, ?)
                    ON CONFLICT(headword) DO UPDATE SET
                        ipa=excluded.ipa,
                        pos=excluded.pos,
                        translation=excluded.translation,
                        translation_en=excluded.translation_en,
                        frq=excluded.frq,
                        updated_at=datetime('now')
                    """,
                    (row["headword"], row["ipa"], _to_json_text(row["pos"]),
                     row["translation"], row["translation_en"], row["frq"]),
                )
                count += 1
                if count % 1000 == 0:
                    conn.commit()
                    logger.info(f"已导入 {count} 词")
            conn.commit()
        logger.success(f"ECDICT 导入完成：{count} 词")
        return count

    # PostgreSQL
    import psycopg
    with psycopg.connect(db_url) as conn:
        with conn.cursor() as cur:
            for row in _iter_ecdict(csv_path, frq_threshold):
                cur.execute(
                    """
                    INSERT INTO words (headword, ipa, pos, translation, translation_en, frq)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    ON CONFLICT (headword) DO UPDATE SET
                        ipa = EXCLUDED.ipa,
                        pos = EXCLUDED.pos,
                        translation = EXCLUDED.translation,
                        translation_en = EXCLUDED.translation_en,
                        frq = EXCLUDED.frq,
                        updated_at = now()
                    """,
                    (row["headword"], row["ipa"], row["pos"],
                     row["translation"], row["translation_en"], row["frq"]),
                )
                count += 1
                if count % 1000 == 0:
                    conn.commit()
                    logger.info(f"已导入 {count} 词")
        conn.commit()
    logger.success(f"ECDICT 导入完成：{count} 词")
    return count


def _iter_ecdict(csv_path: Path, frq_threshold: float):
    """流式迭代 ECDICT CSV"""
    with csv_path.open(encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                frq = float(row.get("frq") or 0)
            except ValueError:
                frq = 0
            if frq < frq_threshold:
                continue

            headword = (row.get("word") or "").strip()
            if not headword:
                continue

            yield {
                "headword": headword,
                "ipa": row.get("phonetic") or "",
                "pos": [p.strip() for p in (row.get("pos") or "").split("/") if p.strip()],
                "translation": row.get("translation") or "",
                "translation_en": row.get("definition") or "",
                "frq": frq,
            }


# ============ 导入官方词书（GRE 核心） ============
def import_gre_core(db_url: str, json_path: Path) -> int:
    """导入 GRE 核心词书，并建立 wordbook ↔ word 关联。"""
    if not json_path.exists():
        logger.warning(f"GRE 核心词书不存在：{json_path}，跳过")
        return 0

    entries = json.loads(json_path.read_text(encoding="utf-8"))

    if is_sqlite(db_url):
        db_file = Path(db_url.replace("sqlite:///", "").replace("sqlite://", ""))
        with sqlite3.connect(db_file) as conn:
            # 词书
            conn.execute(
                """
                INSERT INTO wordbooks (id, name, description, exam_tag, cover_color, word_count)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    name=excluded.name,
                    description=excluded.description,
                    word_count=excluded.word_count
                """,
                ("wb-gre-core", "GRE 核心词汇", "GRE 高频核心词精选", "GRE", "#111111", len(entries)),
            )
            conn.commit()

            # 词条 + 关联
            count = 0
            for idx, entry in enumerate(entries):
                headword = entry["headword"]
                cur = conn.execute(
                    """
                    INSERT INTO words (headword, ipa, translation, etymology, exam_tags)
                    VALUES (?, ?, ?, ?, ?)
                    ON CONFLICT(headword) DO UPDATE SET
                        ipa=excluded.ipa,
                        translation=excluded.translation,
                        etymology=COALESCE(excluded.etymology, words.etymology),
                        exam_tags=excluded.exam_tags,
                        updated_at=datetime('now')
                    """,
                    (
                        headword,
                        entry.get("ipa", ""),
                        entry.get("translation", ""),
                        entry.get("example", ""),
                        _to_json_text([
                            {"exam": entry.get("exam_tag"), "frequency": entry.get("frequency", 0)}
                        ]),
                    ),
                )
                # SQLite UPSERT 不返回 id，需要再查
                word_id_row = conn.execute(
                    "SELECT id FROM words WHERE headword = ?", (headword,)
                ).fetchone()
                word_id = word_id_row[0]
                conn.execute(
                    """
                    INSERT OR IGNORE INTO wordbook_words (wordbook_id, word_id, ord)
                    VALUES (?, ?, ?)
                    """,
                    ("wb-gre-core", word_id, idx),
                )
                count += 1
            conn.commit()
        logger.success(f"GRE 核心词书导入完成：{count} 词")
        return count

    # PostgreSQL
    import psycopg
    with psycopg.connect(db_url) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO wordbooks (id, name, description, exam_tag, cover_color, word_count)
                VALUES ('wb-gre-core', 'GRE 核心词汇', 'GRE 高频核心词精选', 'GRE', '#111111', %s)
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    description = EXCLUDED.description,
                    word_count = EXCLUDED.word_count
                """,
                (len(entries),),
            )
        conn.commit()

        count = 0
        with psycopg.connect(db_url) as conn:
            with conn.cursor() as cur:
                for idx, entry in enumerate(entries):
                    headword = entry["headword"]
                    cur.execute(
                        """
                        INSERT INTO words (headword, ipa, translation, etymology, exam_tags)
                        VALUES (%s, %s, %s, %s, %s)
                        ON CONFLICT (headword) DO UPDATE SET
                            ipa = EXCLUDED.ipa,
                            translation = EXCLUDED.translation,
                            etymology = COALESCE(EXCLUDED.etymology, words.etymology),
                            exam_tags = EXCLUDED.exam_tags,
                            updated_at = now()
                        RETURNING id
                        """,
                        (
                            headword,
                            entry.get("ipa", ""),
                            entry.get("translation", ""),
                            entry.get("example", ""),
                            json.dumps([
                                {"exam": entry.get("exam_tag"), "frequency": entry.get("frequency", 0)}
                            ]),
                        ),
                    )
                    word_id = cur.fetchone()[0]
                    cur.execute(
                        """
                        INSERT INTO wordbook_words (wordbook_id, word_id, ord)
                        VALUES (%s, %s, %s)
                        ON CONFLICT DO NOTHING
                        """,
                        ("wb-gre-core", word_id, idx),
                    )
                    count += 1
            conn.commit()
        logger.success(f"GRE 核心词书导入完成：{count} 词")
        return count


# ============ 入参 ============
def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Seed Vocabulary Agent DB")
    parser.add_argument(
        "--db-url",
        default=os.getenv("DATABASE_URL", "sqlite:///./vocab_agent.db"),
        help="DB URL. 默认 SQLite (vocab_agent.db)；生产用 postgres://...",
    )
    parser.add_argument("--ecdict", type=Path, default=Path(__file__).parent / "data" / "ecdict.csv")
    parser.add_argument("--gre-core", type=Path, default=Path(__file__).parent / "data" / "gre_core.json")
    parser.add_argument("--frq-threshold", type=float, default=30.0)
    parser.add_argument("--skip-schema", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    logger.info(f"DB: {args.db_url}")

    if is_sqlite(args.db_url):
        logger.info("Backend: SQLite")
    elif is_postgres(args.db_url):
        logger.info("Backend: PostgreSQL")
    else:
        logger.error(f"未知的 DB URL: {args.db_url}")
        return 1

    if not args.skip_schema:
        try:
            init_schema(args.db_url)
        except Exception as e:
            logger.error(f"Schema 初始化失败：{e}")
            return 1

    try:
        import_ecdict(args.db_url, args.ecdict, args.frq_threshold)
    except Exception as e:
        logger.warning(f"ECDICT 导入失败（继续）：{e}")

    try:
        import_gre_core(args.db_url, args.gre_core)
    except Exception as e:
        logger.warning(f"GRE 核心词书导入失败：{e}")

    logger.success("全部完成")
    return 0


if __name__ == "__main__":
    sys.exit(main())
