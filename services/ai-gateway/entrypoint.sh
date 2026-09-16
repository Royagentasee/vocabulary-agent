#!/bin/sh
# AI Gateway 启动脚本：首次启动时自动初始化数据库

set -e

DB_FILE="/data/vocab_agent.db"

echo "==> AI Gateway entrypoint"
echo "    DATABASE_URL=$DATABASE_URL"

# 如果数据库不存在或为空，导入种子数据
if [ ! -f "$DB_FILE" ] || [ ! -s "$DB_FILE" ]; then
    echo "==> Database not found, initializing..."
    python -c "
import sqlite3, csv, json, os
from pathlib import Path

db = Path('$DB_FILE')
db.parent.mkdir(parents=True, exist_ok=True)
conn = sqlite3.connect(str(db))
conn.executescript('''
CREATE TABLE IF NOT EXISTS words (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    headword TEXT NOT NULL UNIQUE,
    ipa TEXT, pos TEXT, translation TEXT, translation_en TEXT,
    etymology TEXT, collocations TEXT, exam_tags TEXT, frq REAL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS wordbooks (
    id TEXT PRIMARY KEY, name TEXT, description TEXT, exam_tag TEXT,
    cover_color TEXT, word_count INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS wordbook_words (
    wordbook_id TEXT, word_id INTEGER, ord INTEGER,
    PRIMARY KEY (wordbook_id, word_id)
);
''')
# 导入种子词（从镜像内打包的 seed 文件）
seed = Path('/app/seed/words.csv')
if seed.exists():
    with seed.open(encoding='utf-8') as f:
        for row in csv.DictReader(f):
            w = row.get('word','').strip()
            if not w: continue
            try: frq = float(row.get('frq', 0))
            except: frq = 0
            conn.execute(
                'INSERT OR IGNORE INTO words (headword, ipa, pos, translation, translation_en, frq) VALUES (?,?,?,?,?,?)',
                (w, row.get('phonetic',''), row.get('pos','n'),
                 row.get('translation',''), row.get('definition',''), frq)
            )
    conn.commit()
print('==> DB initialized with', conn.execute('SELECT COUNT(*) FROM words').fetchone()[0], 'words')
conn.close()
"
else
    echo "==> Database exists, skipping init"
fi

echo "==> Starting uvicorn..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
