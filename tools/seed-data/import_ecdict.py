"""在服务器上下载 ECDICT 并导入 words 表

ECDICT（skywind3000/ECDICT，MIT 协议）：77 万条英汉词条，含音标、词性、
中英释义、考试标签（zk/gk/cet4/cet6/ky/toefl/ielts/gre）、COCA/BNC 词频。

导入策略：只收「常用词 + 考试词」，不收生僻词（那些交给 AI 兜底），
避免表过大拖慢随机抽词。
"""
from __future__ import annotations

import csv
import io
import json
import os
import re
import sqlite3
import subprocess
import sys
import time
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

DB = '/home/ubuntu/vocab-agent/data/vocab_agent.db'
CSV_PATH = '/home/ubuntu/ecdict.csv'

MIRRORS = [
    'https://raw.githubusercontent.com/skywind3000/ECDICT/master/ecdict.csv',
    'https://gh-proxy.com/https://raw.githubusercontent.com/skywind3000/ECDICT/master/ecdict.csv',
    'https://gitee.com/reder/ecdict/raw/master/ecdict.csv',
]

# 考试标签 → 我们的标签名
TAG_MAP = {
    'zk': '中考', 'gk': '高考', 'cet4': '四级', 'cet6': '六级',
    'ky': '考研', 'toefl': 'TOEFL', 'ielts': 'IELTS', 'gre': 'GRE',
}

# 收录门槛：有考试标签，或词频在常见范围内
MAX_BNC = 60000
MAX_FRQ = 60000


def download() -> bool:
    if os.path.exists(CSV_PATH) and os.path.getsize(CSV_PATH) > 50_000_000:
        print(f'  已存在 {os.path.getsize(CSV_PATH)//1024//1024} MB，跳过下载')
        return True
    for url in MIRRORS:
        try:
            print(f'  尝试 {url[:70]} …')
            t = time.time()
            r = subprocess.run(
                ['curl', '-sL', '--max-time', '600', '-o', CSV_PATH, url],
                capture_output=True, timeout=660,
            )
            size = os.path.getsize(CSV_PATH) if os.path.exists(CSV_PATH) else 0
            if r.returncode == 0 and size > 50_000_000:
                print(f'  ✅ {size//1024//1024} MB，耗时 {round(time.time()-t)}s')
                return True
            print(f'  ❌ 只有 {size//1024//1024} MB')
        except Exception as e:
            print(f'  ❌ {type(e).__name__}: {str(e)[:60]}')
    return False


def clean_pos(pos: str) -> str:
    """ECDICT 的 pos 形如 'n:64.29/v:35.71'，取占比最高的几个"""
    if not pos:
        return ''
    parts = []
    for seg in pos.split('/'):
        if ':' in seg:
            name = seg.split(':')[0].strip()
            if name:
                parts.append(name)
        elif seg.strip():
            parts.append(seg.strip())
    # 去重保序，最多 3 个
    seen, out = set(), []
    for p in parts:
        if p not in seen:
            seen.add(p)
            out.append(p)
    return '/'.join(out[:3])


def main() -> int:
    print('=== 1) 下载 ECDICT ===')
    if not download():
        print('下载失败')
        return 1

    print()
    print('=== 2) 解析并按门槛筛选 ===')
    kept: list[tuple] = []
    total = 0
    tag_hits: dict[str, int] = {}

    with io.open(CSV_PATH, encoding='utf-8', errors='replace', newline='') as f:
        reader = csv.DictReader(f)
        for row in reader:
            total += 1
            word = (row.get('word') or '').strip()
            translation = (row.get('translation') or '').strip()
            if not word or not translation:
                continue
            # 只收纯英文词/词组（含空格、连字符、撇号）
            if not re.fullmatch(r"[A-Za-z][A-Za-z'\-. ]{0,30}", word):
                continue
            if len(word) > 32:
                continue

            tag = (row.get('tag') or '').strip()
            try:
                bnc = int(float(row.get('bnc') or 0))
            except ValueError:
                bnc = 0
            try:
                frq = int(float(row.get('frq') or 0))
            except ValueError:
                frq = 0

            common = (0 < bnc <= MAX_BNC) or (0 < frq <= MAX_FRQ)
            if not common and not tag:
                continue

            tags = [TAG_MAP[t] for t in tag.split() if t in TAG_MAP]

            # 频率归一化成 0-100（越大越常见）
            ranks = [r for r in (bnc, frq) if r > 0]
            freq = round(max(0.0, 100 - min(ranks) / 600), 1) if ranks else 5.0

            kept.append((
                word.lower(),
                (row.get('phonetic') or '').strip(),
                clean_pos(row.get('pos') or ''),
                translation.replace('\\n', '\n').strip(),
                (row.get('definition') or '').strip()[:1200],
                json.dumps(tags, ensure_ascii=False) if tags else '',
                freq,
            ))
            for t in tags:
                tag_hits[t] = tag_hits.get(t, 0) + 1

    print(f'  扫描 {total:,} 条，收录 {len(kept):,} 条')
    print(f'  考试标签分布: {tag_hits}')

    print()
    print('=== 3) 写入数据库 ===')
    con = sqlite3.connect(DB, timeout=120)
    cur = con.cursor()
    before = cur.execute('SELECT COUNT(*) FROM words').fetchone()[0]
    print(f'  导入前: {before} 条')

    cur.executemany(
        """INSERT INTO words (headword, ipa, pos, translation, translation_en,
                              exam_tags, frq)
           VALUES (?,?,?,?,?,?,?)
           ON CONFLICT(headword) DO UPDATE SET
             ipa=excluded.ipa,
             pos=CASE WHEN words.pos IS NULL OR words.pos='' THEN excluded.pos ELSE words.pos END,
             translation=excluded.translation,
             translation_en=excluded.translation_en,
             exam_tags=CASE WHEN words.exam_tags IS NULL OR words.exam_tags=''
                            THEN excluded.exam_tags ELSE words.exam_tags END,
             frq=excluded.frq""",
        kept,
    )
    con.commit()
    after = cur.execute('SELECT COUNT(*) FROM words').fetchone()[0]
    print(f'  导入后: {after:,} 条（新增 {after - before:,}）')

    print()
    print('=== 4) 抽查常见词 ===')
    for w in ['happy', 'apple', 'bird', 'water', 'good', 'school',
              'friend', 'beautiful', 'government', 'understand']:
        r = cur.execute(
            'SELECT headword, ipa, translation, exam_tags, frq FROM words WHERE headword=?', (w,)
        ).fetchone()
        if r:
            print(f'  ✅ {w:12} /{r[1] or "":10}/ {(r[2] or "")[:26]:28} tags={r[3]} frq={r[4]}')
        else:
            print(f'  ❌ {w:12} 仍缺失')

    print()
    print('=== 5) 随机抽词耗时（应 <300ms）===')
    t = time.time()
    cur.execute('SELECT headword FROM words ORDER BY RANDOM() LIMIT 20').fetchall()
    print(f'  {round((time.time()-t)*1000)} ms')

    con.close()
    print()
    print('完成')
    return 0


if __name__ == '__main__':
    sys.exit(main())
