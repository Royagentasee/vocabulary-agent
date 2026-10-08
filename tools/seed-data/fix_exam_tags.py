"""把 exam_tags 里存的字符串数组转成 schema 要求的 dict 数组

导入时写成了 ["中考","高考"]，而 Word.examTags 是 list[dict]，
导致 Pydantic 校验失败、词典查询被整体吞掉（只能走 AI）。
"""
import json
import sqlite3
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

DB = '/home/ubuntu/vocab-agent/data/vocab_agent.db'

con = sqlite3.connect(DB, timeout=120)
cur = con.cursor()

rows = cur.execute(
    "SELECT id, headword, exam_tags FROM words WHERE exam_tags IS NOT NULL AND exam_tags != ''"
).fetchall()
print(f'待检查: {len(rows):,} 条')

fixed = 0
updates = []
for _id, headword, raw in rows:
    try:
        tags = json.loads(raw)
    except Exception:
        continue
    if not isinstance(tags, list) or not tags:
        continue
    if all(isinstance(t, dict) for t in tags):
        continue
    new = []
    for t in tags:
        if isinstance(t, dict):
            new.append(t)
        elif isinstance(t, str) and t.strip():
            new.append({'exam': t.strip()})
    updates.append((json.dumps(new, ensure_ascii=False), _id))
    fixed += 1

print(f'需要转换: {fixed:,} 条')
if updates:
    cur.executemany('UPDATE words SET exam_tags = ? WHERE id = ?', updates)
    con.commit()
    print('已写入')

print()
print('=== 抽查 ===')
for w in ['happy', 'apple', 'water', 'government']:
    r = cur.execute('SELECT headword, exam_tags FROM words WHERE headword=?', (w,)).fetchone()
    if r:
        print(f'  {r[0]:12} {r[1]}')

con.close()
print()
print('完成')
