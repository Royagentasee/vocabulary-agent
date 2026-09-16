"""数据库抽象层

同时支持：
- PostgreSQL + pgvector（生产）
- SQLite（开发 / 无 Docker 环境）

通过 DATABASE_URL 自动判断。
"""
from __future__ import annotations

import json
import os
import re
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator, Optional

from loguru import logger


def _parse_pos(value) -> list[str]:
    """把 DB 里可能为 JSON 数组或裸字符串（如 'n' / 'n, v' / 'art'）的 pos 解析成 list[str]。"""
    if not value:
        return []
    if isinstance(value, (list, tuple)):
        return [str(x) for x in value]
    text = str(value).strip()
    if not text:
        return []
    try:
        parsed = json.loads(text)
        if isinstance(parsed, list):
            return [str(x) for x in parsed]
        if isinstance(parsed, (dict, int, float)):
            return [str(parsed)]
    except (ValueError, TypeError):
        pass
    # 裸字符串：按逗号/斜杠/分号拆分
    return [p.strip() for p in re.split(r'[,/;]+', text) if p.strip()]


def _parse_exam_tags(value) -> list[dict]:
    """把 DB 里的 exam_tags 解析成 list[dict]（可能是 JSON，也可能是空/NULL）。"""
    if not value:
        return []
    if isinstance(value, list):
        return value
    text = str(value).strip()
    if not text:
        return []
    try:
        parsed = json.loads(text)
        if isinstance(parsed, list):
            return parsed
        return [parsed]
    except (ValueError, TypeError):
        return []


def _is_sqlite() -> bool:
    url = os.getenv('DATABASE_URL', 'sqlite:///./vocab_agent.db')
    return url.startswith('sqlite')


class DBBackend:
    """抽象基类"""

    async def search_words(self, query: str, limit: int, exam_tag: Optional[str]) -> list[dict]:
        raise NotImplementedError

    async def get_word_by_headword(self, headword: str) -> Optional[dict]:
        raise NotImplementedError

    async def find_similar_words(self, word_id: str, limit: int) -> list[dict]:
        raise NotImplementedError

    async def get_word_embedding(self, word_id: str) -> Optional[list[float]]:
        raise NotImplementedError

    async def list_random_words(self, limit: int, exclude_ids: list[str] | None = None) -> list[dict]:
        raise NotImplementedError


class SQLiteBackend(DBBackend):
    def __init__(self, db_path: str):
        self.db_path = db_path

    @contextmanager
    def conn(self) -> Iterator[sqlite3.Connection]:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
        finally:
            conn.close()

    def _row_to_word(self, row: sqlite3.Row) -> dict:
        return {
            'id': str(row['id']),  # 统一转 str
            'headword': row['headword'],
            'ipa': row['ipa'] or '',
            'pos': _parse_pos(row['pos']),
            'translation': row['translation'] or '',
            'etymology': row['etymology'] or '',
            'examTags': _parse_exam_tags(row['exam_tags']),
            'frq': row['frq'],
        }

    async def search_words(self, query: str, limit: int, exam_tag: Optional[str]) -> list[dict]:
        with self.conn() as conn:
            sql = """
                SELECT * FROM words
                WHERE headword LIKE ? OR translation LIKE ?
                ORDER BY frq DESC NULLS LAST
                LIMIT ?
            """
            pattern = f'%{query}%'
            cur = conn.execute(sql, (pattern, pattern, limit))
            return [self._row_to_word(r) for r in cur.fetchall()]

    async def get_word_by_headword(self, headword: str) -> Optional[dict]:
        with self.conn() as conn:
            cur = conn.execute('SELECT * FROM words WHERE headword = ?', (headword,))
            row = cur.fetchone()
            return self._row_to_word(row) if row else None

    async def find_similar_words(self, word_id: str, limit: int) -> list[dict]:
        # SQLite 无向量检索，返回同 exam_tag 的词
        with self.conn() as conn:
            cur = conn.execute(
                """
                SELECT w.* FROM words w
                WHERE w.id != ?
                ORDER BY w.frq DESC NULLS LAST
                LIMIT ?
                """,
                (word_id, limit),
            )
            return [self._row_to_word(r) for r in cur.fetchall()]

    async def get_word_embedding(self, word_id: str) -> Optional[list[float]]:
        return None  # SQLite 不支持向量

    async def list_random_words(self, limit: int, exclude_ids: list[str] | None = None) -> list[dict]:
        """随机取 limit 个词（排除已学过的 exclude_ids）"""
        with self.conn() as conn:
            if exclude_ids:
                placeholders = ','.join('?' * len(exclude_ids))
                sql = f"SELECT * FROM words WHERE id NOT IN ({placeholders}) ORDER BY RANDOM() LIMIT ?"
                cur = conn.execute(sql, (*exclude_ids, limit))
            else:
                sql = "SELECT * FROM words ORDER BY RANDOM() LIMIT ?"
                cur = conn.execute(sql, (limit,))
            return [self._row_to_word(r) for r in cur.fetchall()]


class PostgresBackend(DBBackend):
    def __init__(self, dsn: str):
        self.dsn = dsn

    async def search_words(self, query: str, limit: int, exam_tag: Optional[str]) -> list[dict]:
        try:
            import psycopg
            from psycopg.rows import dict_row
        except ImportError:
            logger.warning('psycopg not installed')
            return []
        with psycopg.connect(self.dsn) as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                # 用 ILIKE 模糊匹配 + 全文检索（tsvector）
                sql = """
                    SELECT id, headword, ipa, pos, translation, etymology, exam_tags, frq
                    FROM words
                    WHERE
                        headword ILIKE %s
                        OR translation ILIKE %s
                        OR to_tsvector('simple', headword || ' ' || COALESCE(translation, ''))
                           @@ plainto_tsquery('simple', %s)
                    ORDER BY frq DESC NULLS LAST
                    LIMIT %s
                """
                pattern = f'%{query}%'
                cur.execute(sql, (pattern, pattern, query, limit))
                return [self._row_to_word(r) for r in cur.fetchall()]

    async def get_word_by_headword(self, headword: str) -> Optional[dict]:
        try:
            import psycopg
            from psycopg.rows import dict_row
        except ImportError:
            return None
        with psycopg.connect(self.dsn) as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                cur.execute('SELECT * FROM words WHERE headword = %s', (headword,))
                row = cur.fetchone()
                return self._row_to_word(row) if row else None

    async def find_similar_words(self, word_id: str, limit: int) -> list[dict]:
        # pgvector 余弦相似度
        try:
            import psycopg
            from psycopg.rows import dict_row
        except ImportError:
            return []
        with psycopg.connect(self.dsn) as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                sql = """
                    SELECT w.* FROM words w
                    JOIN word_embeddings e ON w.id = e.word_id
                    WHERE w.id != %s
                    ORDER BY e.embedding <=> (
                        SELECT embedding FROM word_embeddings WHERE word_id = %s
                    )
                    LIMIT %s
                """
                cur.execute(sql, (word_id, word_id, limit))
                return [self._row_to_word(r) for r in cur.fetchall()]

    async def get_word_embedding(self, word_id: str) -> Optional[list[float]]:
        try:
            import psycopg
            from psycopg.rows import dict_row
        except ImportError:
            return None
        with psycopg.connect(self.dsn) as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                cur.execute('SELECT embedding FROM word_embeddings WHERE word_id = %s', (word_id,))
                row = cur.fetchone()
                if row and row['embedding']:
                    return list(row['embedding'])
        return None

    async def list_random_words(self, limit: int, exclude_ids: list[str] | None = None) -> list[dict]:
        """随机取 limit 个词（排除 exclude_ids）"""
        try:
            import psycopg
            from psycopg.rows import dict_row
        except ImportError:
            return []
        with psycopg.connect(self.dsn) as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                if exclude_ids:
                    placeholders = ','.join('%s' for _ in exclude_ids)
                    sql = f"SELECT id, headword, ipa, pos, translation, etymology, exam_tags, frq FROM words WHERE id NOT IN ({placeholders}) ORDER BY random() LIMIT %s"
                    cur.execute(sql, (*exclude_ids, limit))
                else:
                    sql = "SELECT id, headword, ipa, pos, translation, etymology, exam_tags, frq FROM words ORDER BY random() LIMIT %s"
                    cur.execute(sql, (limit,))
                return [self._row_to_word(r) for r in cur.fetchall()]

    def _row_to_word(self, row: dict) -> dict:
        return {
            'id': row['id'],
            'headword': row['headword'],
            'ipa': row.get('ipa') or '',
            'pos': _parse_pos(row.get('pos')),
            'translation': row.get('translation') or '',
            'etymology': row.get('etymology') or '',
            'examTags': _parse_exam_tags(row.get('exam_tags')),
            'frq': row.get('frq'),
        }


_db_instance: Optional[DBBackend] = None


def get_db() -> DBBackend:
    global _db_instance
    if _db_instance is None:
        url = os.getenv('DATABASE_URL', 'sqlite:///./vocab_agent.db')
        if _is_sqlite():
            db_path = url.replace('sqlite:///', '').replace('sqlite://', '')
            logger.info(f'DB: SQLite ({db_path})')
            _db_instance = SQLiteBackend(db_path)
        else:
            logger.info(f'DB: PostgreSQL')
            _db_instance = PostgresBackend(url)
    return _db_instance