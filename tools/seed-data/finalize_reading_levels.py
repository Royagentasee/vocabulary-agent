"""分级阅读题库收尾：去重 + 同步到后端 + 输出统计"""
import io
import json
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

SRC = Path(r'E:\vocabularyagent\tools\seed-data\data\reading_levels.json')
DST = Path(r'E:\vocabularyagent\services\ai-gateway\app\data\reading_levels.json')

bank = json.loads(io.open(SRC, encoding='utf-8').read())
print(f'原始：{len(bank)} 篇')

# 同标题视为重复，保留先出现的（内容不同但标题撞了，留着体验差）
seen: set[str] = set()
clean: list[dict] = []
for it in bank:
    key = (it.get('title') or '').strip().lower()
    if key and key in seen:
        continue
    if key:
        seen.add(key)
    clean.append(it)

removed = len(bank) - len(clean)
if removed:
    print(f'去掉同标题重复：{removed} 篇')

clean.sort(key=lambda x: (x['level'], x['id']))
io.open(DST, 'w', encoding='utf-8', newline='').write(
    json.dumps(clean, ensure_ascii=False, indent=1))

levels = {}
for it in clean:
    lv = it['level']
    a = levels.setdefault(lv, {'n': 0, 'q': 0, 'w': 0})
    a['n'] += 1
    a['q'] += len(it.get('questions') or [])
    a['w'] += int(it.get('wordCount') or 0)

print()
print(f'入库：{len(clean)} 篇')
for lv in ('junior', 'senior', 'college'):
    if lv in levels:
        a = levels[lv]
        print(f"  {lv:8} {a['n']:3} 篇  {a['q']:4} 题  {a['w']:7} 词")
print(f"  合计     {sum(a['n'] for a in levels.values()):3} 篇  "
      f"{sum(a['q'] for a in levels.values()):4} 题  "
      f"{sum(a['w'] for a in levels.values()):7} 词")
print()
print('已写入:', DST, f'({DST.stat().st_size // 1024} KB)')
