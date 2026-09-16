"""初始化 SQLite 数据库（在服务器上运行）"""
import sqlite3
import csv
import os

DB_PATH = os.environ.get('DB_PATH', '/home/ubuntu/vocab-agent/data/vocab_agent.db')
SEED_PATH = os.environ.get('SEED_PATH', '/home/ubuntu/vocab-agent/seed/words.csv')

os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

conn = sqlite3.connect(DB_PATH)
conn.executescript('''
CREATE TABLE IF NOT EXISTS words (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    headword TEXT NOT NULL UNIQUE,
    ipa TEXT,
    pos TEXT,
    translation TEXT,
    translation_en TEXT,
    etymology TEXT,
    collocations TEXT,
    exam_tags TEXT,
    frq REAL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_words_headword ON words (headword);
CREATE INDEX IF NOT EXISTS idx_words_frq ON words (frq DESC);

CREATE TABLE IF NOT EXISTS wordbooks (
    id TEXT PRIMARY KEY,
    name TEXT,
    description TEXT,
    exam_tag TEXT,
    cover_color TEXT,
    word_count INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS wordbook_words (
    wordbook_id TEXT,
    word_id INTEGER,
    ord INTEGER,
    PRIMARY KEY (wordbook_id, word_id)
);
''')

if os.path.exists(SEED_PATH):
    with open(SEED_PATH, encoding='utf-8') as f:
        count = 0
        for row in csv.DictReader(f):
            w = row.get('word', '').strip()
            if not w:
                continue
            try:
                frq = float(row.get('frq', 0))
            except ValueError:
                frq = 0
            conn.execute(
                'INSERT OR IGNORE INTO words (headword, ipa, pos, translation, translation_en, frq) VALUES (?,?,?,?,?,?)',
                (w, row.get('phonetic', ''), row.get('pos', 'n'),
                 row.get('translation', ''), row.get('definition', ''), frq)
            )
            count += 1
        conn.commit()
    print(f'words imported: {count}')
else:
    print(f'seed file not found: {SEED_PATH}')

total = conn.execute('SELECT COUNT(*) FROM words').fetchone()[0]
print(f'total words: {total}')
conn.close()
