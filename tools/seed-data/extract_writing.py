"""从 ETS 官方 GRE Analytical Writing 题库提取写作真题

官方来源（公开可下载）：
  Issue 池：    https://www.ets.org/pdfs/gre/issue-pool.pdf
  Argument 池： https://www.ets.org/content/dam/ets-org/pdfs/gre/argument-pool.pdf
"""
from __future__ import annotations

import json
import re
import ssl
import sys
import urllib.request
from pathlib import Path

from pypdf import PdfReader

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

OUT_DIR = Path(__file__).parent / 'data' / 'writing'
OUT_DIR.mkdir(parents=True, exist_ok=True)

SOURCES = {
    'issue': {
        'url': 'https://www.ets.org/pdfs/gre/issue-pool.pdf',
        'file': 'issue-pool.pdf',
        'taskType': 'issue',
        'label': 'Analyze an Issue',
        'source': 'ETS 官方 GRE Analytical Writing Issue 题库',
    },
    'argument': {
        'url': 'https://www.ets.org/content/dam/ets-org/pdfs/gre/argument-pool.pdf',
        'file': 'argument-pool.pdf',
        'taskType': 'argument',
        'label': 'Analyze an Argument',
        'source': 'ETS 官方 GRE Analytical Writing Argument 题库',
    },
}

UA = ('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
      '(KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36')

INSTRUCTION_MARK = 'Write a response in which'

# 指令结尾句（用于精确定位每条指令的结束，避免分页把多道题并进同一段）
END_PATTERNS = {
    'issue': [
        r'shape your position\.',
        r'challenge your position\.',
        r'the position you take\.',
        r'address both of the views presented\.',
    ],
    'argument': [
        r'strengthen or weaken [^.]{0,60}\.',
        r'weaken or strengthen [^.]{0,60}\.',
        r'help to evaluate [^.]{0,80}\.',
    ],
}

# ETS 版权页脚（分页时会混进正文）
NOISE_RE = [
    r'Copyright © \d{4} by ETS\.[^.]*\.',
    r'All rights reserved\.',
    r'ETS,? the ETS logo and GRE are registered trademarks of ETS[^.]*\.',
    r'ETS and GRE are registered trademarks of ETS[^.]*\.',
    r'All other trademarks are [^.]*\.',
    r'https?://\S+',
]


def strip_noise(text: str) -> str:
    for pat in NOISE_RE:
        text = re.sub(pat, ' ', text, flags=re.I)
    return text

# 说明性段落 / 页眉页脚噪声
SKIP_CONTAINS = [
    'This page contains the',
    'When you take the test, you will be presented',
    'Each Issue topic consists',
    'Each Argument topic consists',
    'because there may be multiple versions',
    'actual test.',
    'https://www.ets.org',
    'Pool of Issue Topics',
    'Pool of Argument Topics',
    'Analytical Writing—Analyze',
]


def download(url: str, path: Path) -> Path:
    if path.exists() and path.stat().st_size > 10000:
        return path
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    data = urllib.request.urlopen(req, timeout=120, context=ctx).read()
    path.write_bytes(data)
    print(f'  下载 {path.name} ({len(data)} bytes)')
    return path


def clean(text: str) -> str:
    text = re.sub(r'\s+', ' ', text)
    # 去掉混入的页码（段首/段尾的孤立 1-3 位数字）
    text = re.sub(r'^\s*\d{1,3}\s+', '', text)
    text = re.sub(r'\s+\d{1,3}\s*$', '', text)
    text = text.replace('“', '"').replace('”', '"').replace('’', "'").replace('‘', "'")
    return text.strip()


def _para_method(raw: str) -> list[tuple[str, str]]:
    """方法 A：按空行分段（Argument 池结构规整，此法完整）"""
    paras = [p.strip() for p in re.split(r'\n\s*\n', raw) if p.strip()]
    out: list[tuple[str, str]] = []
    cur = ''
    started = False
    for p in paras:
        if not started:
            if any(k in p for k in SKIP_CONTAINS) or len(p) < 180:
                continue
            started = True
        cur = f'{cur} {p}'.strip() if cur else p
        if INSTRUCTION_MARK in p:
            flat = re.sub(r'\s+', ' ', cur)
            idx = flat.find(INSTRUCTION_MARK)
            out.append((flat[:idx].strip(), flat[idx:].strip()))
            cur = ''
    return out


def _pattern_method(text: str, task_type: str) -> list[tuple[str, str]]:
    """方法 B：按指令结尾句切分（能救回被分页合并的题）"""
    marks = [m.start() for m in re.finditer(re.escape(INSTRUCTION_MARK), text)]
    ends: list[int] = []
    for i, s in enumerate(marks):
        e = marks[i + 1] if i + 1 < len(marks) else len(text)
        seg = text[s:e]
        last = None
        for pat in END_PATTERNS[task_type]:
            for m in re.finditer(pat, seg):
                if last is None or m.end() > last:
                    last = m.end()
        ends.append(s + last if last else e)

    out: list[tuple[str, str]] = []
    prev_end = None
    for i, s in enumerate(marks):
        start = prev_end if prev_end is not None else 0
        stmt = text[start:s]
        if prev_end is None:
            cut = stmt.rfind('actual test.')
            if cut != -1:
                stmt = stmt[cut + len('actual test.'):]
        out.append((clean(stmt), clean(text[s:ends[i]])))
        prev_end = ends[i]
    return out


def extract(pdf: Path, task_type: str, label: str) -> list[dict]:
    raw = '\n'.join((p.extract_text() or '') for p in PdfReader(str(pdf)).pages)

    # 段落法最稳（无重复、无异常）；分页导致的少量合并题目接受为缺失，
    # 也不混入结尾句法（会引入近似重复）。
    candidates = _para_method(strip_noise(raw))

    seen: set[str] = set()
    topics: list[dict] = []
    for prompt, instruction in candidates:
        prompt, instruction = clean(prompt), clean(instruction)
        if len(prompt) < 30 or len(instruction) < 40:
            continue
        if INSTRUCTION_MARK in prompt or 'Copyright' in prompt:
            continue
        key = re.sub(r'\W+', '', (prompt + '|' + instruction).lower())
        if key in seen:
            continue
        seen.add(key)
        topics.append({'prompt': prompt, 'instruction': instruction})

    return [
        {
            'id': f'gre-{task_type}-{i + 1}',
            'exam': 'GRE',
            'taskType': task_type,
            'taskLabel': label,
            'prompt': t['prompt'],
            'instruction': t['instruction'],
            'source': SOURCES[task_type]['source'],
            'sourceUrl': SOURCES[task_type]['url'],
        }
        for i, t in enumerate(topics)
    ]


def main() -> int:
    bank: list[dict] = []
    for key, cfg in SOURCES.items():
        print(f'\n=== {cfg["label"]} ===')
        pdf = download(cfg['url'], OUT_DIR / cfg['file'])
        items = extract(pdf, cfg['taskType'], cfg['label'])
        print(f'  提取 {len(items)} 道题')
        if items:
            s = items[0]
            print(f'  样例题目: {s["prompt"][:110]}')
            print(f'  样例指令: {s["instruction"][:90]}...')
        bank.extend(items)

    out = Path(__file__).parent / 'data' / 'writing_prompt_bank.json'
    out.write_text(json.dumps(bank, ensure_ascii=False, indent=1), encoding='utf-8')
    print(f'\n汇总：{len(bank)} 道写作真题 → {out}')
    from collections import Counter
    print('按类型:', dict(Counter(it['taskType'] for it in bank)))
    print('平均题目长度:', sum(len(it['prompt']) for it in bank) // max(len(bank), 1), '字符')
    return 0


if __name__ == '__main__':
    sys.exit(main())
