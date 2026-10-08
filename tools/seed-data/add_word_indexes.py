"""给 words 表补索引，修复词库扩大后的查询变慢问题"""
import sqlite3
import sys
import time

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

DB = '/home/ubuntu/vocab-agent/data/vocab_agent.db'
con = sqlite3.connect(DB, timeout=180)
cur = con.cursor()

print('=== 当前索引 ===')
for r in cur.execute("SELECT name, sql FROM sqlite_master WHERE type='index' AND tbl_name='words'"):
    print(f'  {r[0]}: {(r[1] or "(自动)")[:90]}')

print()
print('=== 建索引 ===')
for sql in [
    'CREATE INDEX IF NOT EXISTS idx_words_frq ON words (frq DESC)',
    'CREATE INDEX IF NOT EXISTS idx_words_headword ON words (headword)',
    'CREATE INDEX IF NOT EXISTS idx_words_frq_id ON words (frq DESC, id)',
]:
    t = time.time()
    cur.execute(sql)
    print(f'  ✅ {sql[40:80]:44} {round((time.time()-t)*1000)} ms')
con.commit()

print()
print('=== 优化后性能 ===')
def bench(label, sql, params=()):
    t = time.time()
    rows = cur.execute(sql, params).fetchall()
    print(f'  {label:28} {round((time.time()-t)*1000):5} ms  ({len(rows)} 行)')

bench('随机抽 20 个词', 'SELECT * FROM words ORDER BY RANDOM() LIMIT 20')
bench('按 frq 取相似词', 'SELECT * FROM words WHERE id != ? ORDER BY frq DESC LIMIT 5', (1,))
bench('精确查词', 'SELECT * FROM words WHERE headword = ?', ('happy',))
bench('计数', 'SELECT COUNT(*) FROM words')

print()
print('=== ANALYZE（更新统计信息）===')
t = time.time()
cur.execute('ANALYZE')
con.commit()
print(f'  {round(time.time()-t,1)}s')

print()
print('=== 再测一次 ===')
bench('随机抽 20 个词', 'SELECT * FROM words ORDER BY RANDOM() LIMIT 20')
bench('按 frq 取相似词', 'SELECT * FROM words WHERE id != ? ORDER BY frq DESC LIMIT 5', (1,))
bench('精确查词', 'SELECT * FROM words WHERE headword = ?', ('happy',))

con.close()
print()
print('完成')
