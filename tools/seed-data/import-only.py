"""
导入词库到 SQLite（自动选择可用的数据源）
"""
import csv
import json
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent.parent
DB_PATH = ROOT / "vocab_agent.db"
ECDICT_CSV = Path(__file__).parent / "data" / "ecdict.csv"
OFFLINE_CSV = Path(__file__).parent / "data" / "top1000_offline.csv"
GRE_JSON = Path(__file__).parent / "data" / "gre_core.json"

FRQ_THRESHOLD = 30.0


def ensure_schema(conn):
    conn.executescript("""
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
    """)
    conn.commit()


def parse_pos(pos: str) -> list:
    return [p.strip() for p in pos.replace('.', '/').split('/') if p.strip()]


def upsert_word(conn, headword: str, ipa: str, translation: str, frq: float, pos_list: list):
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
        (headword, ipa, json.dumps(pos_list, ensure_ascii=False),
         translation, translation, frq),
    )


def import_ecdict(conn, csv_path: Path, frq_threshold: float = FRQ_THRESHOLD) -> int:
    """导入 ECDICT（完整版）"""
    if not csv_path.exists() or csv_path.stat().st_size < 1_000_000:
        print(f"  ECDICT 文件不存在或为空: {csv_path}")
        return 0

    print(f"  导入 ECDICT (frq >= {frq_threshold})...")
    count = 0
    with csv_path.open(encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                frq = float(row.get("frq") or 0)
            except ValueError:
                continue
            if frq < frq_threshold:
                continue

            headword = (row.get("word") or "").strip()
            if not headword:
                continue
            cleaned = headword.replace(" ", "").replace("-", "").replace("'", "")
            if not cleaned.isalpha():
                continue

            upsert_word(
                conn,
                headword,
                (row.get("phonetic") or "").strip(),
                (row.get("translation") or "").strip(),
                frq,
                parse_pos(row.get("pos", "")),
            )
            count += 1
            if count % 1000 == 0:
                conn.commit()

    conn.commit()
    return count


def import_offline(conn, csv_path: Path) -> int:
    """导入离线 1000 词"""
    if not csv_path.exists():
        print(f"  Offline CSV 文件不存在: {csv_path}")
        return 0

    print(f"  导入离线 1000 词库...")
    count = 0
    with csv_path.open(encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                frq = float(row.get("frq") or 0)
            except ValueError:
                frq = 0

            headword = (row.get("word") or "").strip()
            if not headword:
                continue
            cleaned = headword.replace(" ", "").replace("-", "").replace("'", "")
            if not cleaned.isalpha():
                continue

            upsert_word(
                conn,
                headword,
                (row.get("phonetic") or "").strip(),
                (row.get("translation") or "").strip(),
                frq,
                parse_pos(row.get("pos", "")),
            )
            count += 1

    conn.commit()
    return count


def import_gre_core(conn, json_path: Path) -> int:
    if not json_path.exists():
        print(f"  GRE 文件不存在: {json_path}")
        return 0

    entries = json.loads(json_path.read_text(encoding="utf-8"))

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

    count = 0
    for idx, entry in enumerate(entries):
        headword = entry["headword"]
        conn.execute(
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
                json.dumps([
                    {"exam": entry.get("exam_tag"), "frequency": entry.get("frequency", 0)}
                ], ensure_ascii=False),
            ),
        )
        word_id_row = conn.execute(
            "SELECT id FROM words WHERE headword = ?", (headword,)
        ).fetchone()
        if word_id_row:
            conn.execute(
                "INSERT OR IGNORE INTO wordbook_words (wordbook_id, word_id, ord) VALUES (?, ?, ?)",
                ("wb-gre-core", word_id_row[0], idx),
            )
        count += 1

    conn.commit()
    return count


def main():
    if not DB_PATH.exists():
        print(f"ERROR: {DB_PATH} 不存在，请先创建空 SQLite 文件")
        return 1

    print(f"DB: {DB_PATH}\n")

    conn = sqlite3.connect(str(DB_PATH))
    try:
        ensure_schema(conn)

        # 优先级 1: 完整 ECDICT
        if ECDICT_CSV.exists() and ECDICT_CSV.stat().st_size > 1_000_000:
            count = import_ecdict(conn, ECDICT_CSV)
            print(f"  [OK] ECDICT: {count} words")
        # 优先级 2: 离线 1000 词
        elif OFFLINE_CSV.exists() and OFFLINE_CSV.stat().st_size > 1000:
            count = import_offline(conn, OFFLINE_CSV)
            print(f"  [OK] Offline: {count} words")
        else:
            print("  [!] No data source available")

        # 词书
        count = import_gre_core(conn, GRE_JSON)
        print(f"  [OK] GRE Core: {count} words\n")

        # 统计
        total = conn.execute("SELECT COUNT(*) FROM words").fetchone()[0]
        wb = conn.execute("SELECT COUNT(*) FROM wordbooks").fetchone()[0]
        wb_words = conn.execute("SELECT COUNT(*) FROM wordbook_words").fetchone()[0]
        print("=== Final Stats ===")
        print(f"  Words: {total}")
        print(f"  Wordbooks: {wb}")
        print(f"  Wordbook-Word Links: {wb_words}")
        return 0
    finally:
        conn.close()


if __name__ == "__main__":
    sys.exit(main())