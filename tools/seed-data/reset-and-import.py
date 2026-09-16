"""
清空 words 表并重新导入 (内联版，不调 subprocess)
"""
import sqlite3
from pathlib import Path

ROOT = Path(__file__).parent.parent.parent
DB_PATH = ROOT / "vocab_agent.db"
ECDICT_CSV = Path(__file__).parent / "data" / "ecdict.csv"
OFFLINE_CSV = Path(__file__).parent / "data" / "top1000_offline.csv"
GRE_JSON = Path(__file__).parent / "data" / "gre_core.json"

import csv
import json

print(f"DB: {DB_PATH}\n")

conn = sqlite3.connect(str(DB_PATH))

# Step 1: 清空
print("Step 1: Clearing tables...")
conn.execute("DELETE FROM user_word_progress")
conn.execute("DELETE FROM wordbook_words")
conn.execute("DELETE FROM wordbooks")
conn.execute("DELETE FROM words")
conn.commit()
print("  [OK] All tables cleared\n")

# Step 2: 导入离线 1000 词
print("Step 2: Importing offline 1000 words...")
count = 0
with OFFLINE_CSV.open(encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for row in reader:
        headword = row.get("word", "").strip()
        if not headword:
            continue
        cleaned = headword.replace(" ", "").replace("-", "").replace("'", "")
        if not cleaned.isalpha():
            continue

        try:
            frq = float(row.get("frq") or 0)
        except ValueError:
            frq = 0

        ipa = row.get("phonetic", "").strip()
        translation = row.get("translation", "").strip()
        pos = row.get("pos", "")
        pos_list = [p.strip() for p in pos.replace(".", "/").split("/") if p.strip()]

        cur = conn.execute(
            """
            INSERT OR IGNORE INTO words (headword, ipa, pos, translation, translation_en, frq)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (headword, ipa, json.dumps(pos_list, ensure_ascii=False),
             translation, translation, frq),
        )
        if cur.rowcount > 0:
            count += 1

conn.commit()
print(f"  [OK] Offline: {count} words")

# Step 3: GRE 核心词书
print("\nStep 3: Importing GRE core wordbook...")
entries = json.loads(GRE_JSON.read_text(encoding="utf-8"))
conn.execute(
    """
    INSERT INTO wordbooks (id, name, description, exam_tag, cover_color, word_count)
    VALUES (?, ?, ?, ?, ?, ?)
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
        """,
        (
            headword,
            entry.get("ipa", ""),
            entry.get("translation", ""),
            entry.get("example", ""),
            json.dumps([{"exam": entry.get("exam_tag"), "frequency": entry.get("frequency", 0)}], ensure_ascii=False),
        ),
    )
    word_id_row = conn.execute("SELECT id FROM words WHERE headword = ?", (headword,)).fetchone()
    if word_id_row:
        conn.execute(
            "INSERT INTO wordbook_words (wordbook_id, word_id, ord) VALUES (?, ?, ?)",
            ("wb-gre-core", word_id_row[0], idx),
        )
    count += 1

conn.commit()
print(f"  [OK] GRE Core: {count} words")

# Step 4: 统计
total = conn.execute("SELECT COUNT(*) FROM words").fetchone()[0]
wb = conn.execute("SELECT COUNT(*) FROM wordbooks").fetchone()[0]
wb_words = conn.execute("SELECT COUNT(*) FROM wordbook_words").fetchone()[0]

print("\n=== Final Stats ===")
print(f"  Words: {total}")
print(f"  Wordbooks: {wb}")
print(f"  Wordbook-Word Links: {wb_words}")

conn.close()
print("\nDone.")