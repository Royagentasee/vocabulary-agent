"""从 College Board 官方 SAT 练习题 PDF 提取阅读真题（文章+题目+选项+答案+解析）

官方说明：https://satsuite.collegeboard.org/practice/practice-tests/paper
"While anyone is welcome to use our downloadable paper practice tests"
"""
from __future__ import annotations

import json
import re
import ssl
import sys
import urllib.request
from collections import Counter
from pathlib import Path

from pypdf import PdfReader

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

BASE = 'https://satsuite.collegeboard.org'
UA = ('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
      '(KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36')
OUT_DIR = Path(__file__).parent / 'data' / 'reading'
OUT_DIR.mkdir(parents=True, exist_ok=True)
TEST_NUMBERS = [4, 5, 6, 7, 8, 9, 10, 11]
QUESTIONS_PER_MODULE = 33


def download(url: str, path: Path) -> Path:
    if path.exists() and path.stat().st_size > 10000:
        return path
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    data = urllib.request.urlopen(req, timeout=180, context=ctx).read()
    path.write_bytes(data)
    print(f'  下载 {path.name} ({len(data)} bytes)')
    return path


def load_pages(pdf: Path) -> list[str]:
    return [(p.extract_text() or '') for p in PdfReader(str(pdf)).pages]


def strip_footer(text: str) -> str:
    """去掉页脚。注意页脚有时和正文挤在同一行（'...illegal. 28 While researchin'）。"""
    out = []
    for ln in text.split('\n'):
        if 'Unauthorized copying' in ln or 'CONTINUE' in ln:
            s = re.sub(r'Unauthorized copying or reuse of any part of this page is illegal\.?', ' ', ln)
            s = re.sub(r'\bCONTINUE\b', ' ', s).strip()
            if re.fullmatch(r'\d{0,3}', s):
                continue  # 只剩页码 → 整行丢弃
            ln = s
        ln = re.sub(r'[.\-~_]{6,}', ' ', ln)
        out.append(ln)
    return '\n'.join(out)


def remove_module_header(raw: str) -> str:
    """去掉每页页眉 'Module / 1 / Reading and Writing'（其数字会被误认成题号）"""
    return re.sub(r'Module\s*\n\s*[12]\s*\n\s*(?:Reading and Writing|Math)\s*\n?', '', raw)


NOISE = [
    re.compile(r'^Module\s*$'),
    re.compile(r'^Reading and Writing\s*$'),
    re.compile(r'^Math\s*$'),
    re.compile(r'^\d{1,2} QUESTIONS\s*$'),
    re.compile(r'^DIRECTIONS\s*$'),
    re.compile(r'^No Test Material On This Page\s*$'),
    re.compile(r'^The questions in this section address'),
    re.compile(r'^For multiple-choice questions'),
    re.compile(r'^For student-produced response questions'),
    re.compile(r'^Test begins on the next page'),
    re.compile(r'^\s*$'),
]


def is_noise(line: str) -> bool:
    s = line.strip()
    return any(p.match(s) for p in NOISE)


def find_section_pages(pages: list[str]) -> tuple[int, int]:
    """返回 (R&W 起始页, Math 起始页)，0-based"""
    rw_start = 0
    math_start = len(pages)
    for i, t in enumerate(pages):
        if re.search(r'Reading and Writing[\s\S]{0,40}?QUESTIONS', t):
            rw_start = i
            break
    for i in range(rw_start + 1, len(pages)):
        if re.search(r'\bMath[\s\S]{0,40}?QUESTIONS', pages[i]):
            math_start = i
            break
    return rw_start, math_start


HEADER_RE = re.compile(
    r'Module\s*\n\s*([12])\s*\n\s*(?:Reading and Writing|Math)\s*\n\s*\d{1,2}\s*QUESTIONS'
)


def strip_header_block(raw: str) -> tuple[str, int | None]:
    """去掉模块标题 + Directions 说明段，保留第一道题。

    返回 (处理后的文本, 该页声明的模块号或 None)
    """
    m = HEADER_RE.search(raw)
    if not m:
        return raw, None
    mod = int(m.group(1))
    after = raw[m.end():]
    # 从第一个“独立数字行”开始才是题目正文（可能是 1，也可能是 3 等）
    m2 = re.search(r'(?m)^\s*\d{1,2}\s*$', after)
    return (after[m2.start():] if m2 else after), mod


def page_lines(raw: str) -> list[str]:
    return [ln.rstrip() for ln in raw.split('\n') if not is_noise(ln)]


def clean_inline(s: str) -> str:
    """清除行内残留的页脚垃圾，如 'obtain CO N T I N U E16 - 2'"""
    s = re.sub(r'C\s*O\s*N\s*T\s*I\s*N\s*U\s*E.*$', '', s, flags=re.I)
    s = re.sub(r'Unauthorized\s*copying.*$', '', s, flags=re.I)
    s = re.sub(r'\s+-\s*\d{1,3}\s*$', '', s)              # 尾部 " - 2"
    s = re.sub(r'\s+\d{1,3}\s*-\s*\d{1,3}\s*$', '', s)   # 尾部 "16 - 2"
    s = re.sub(r'\s+\d{1,3}\s*$', '', s) if re.search(r'[a-zA-Z]\s+\d{1,3}\s*$', s) else s
    s = re.sub(r'\s{2,}', ' ', s)
    return s.strip()


def split_passage_stem(text: str) -> tuple[str, str]:
    idx = text.rfind('?')
    if idx == -1:
        return text.strip(), ''
    start = 0
    for m in re.finditer(r'[.!?]\s+', text[:idx]):
        start = m.end()
    return text[:start].strip(), text[start:idx + 1].strip()


def build_items(lines: list[str]) -> list[dict]:
    """按 1..33 顺序切题"""
    # 找到所有“独立数字行”的下标
    marks = [(i, int(ln.strip())) for i, ln in enumerate(lines) if re.fullmatch(r'\d{1,2}', ln.strip())]
    segs: list[tuple[int, list[str]]] = []
    expected = 1
    cur_start = None
    cur_qno = None
    for i, n in marks:
        if n == expected:
            if cur_start is not None:
                segs.append((cur_qno, lines[cur_start + 1:i]))
            cur_start = i
            cur_qno = n
            expected += 1
    if cur_start is not None:
        segs.append((cur_qno, lines[cur_start + 1:]))

    items = []
    for qno, body_lines in segs:
        choices: list[dict] = []
        pre: list[str] = []
        for ln in body_lines:
            m = re.match(r'^([A-D])\)\s*(.*)$', ln.strip())
            if m:
                choices.append({'label': m.group(1), 'text': clean_inline(m.group(2))})
            elif choices and ln.strip():
                merged = clean_inline(choices[-1]['text'] + ' ' + ln.strip())
                choices[-1]['text'] = merged
            else:
                pre.append(clean_inline(ln))
        if len(choices) != 4:
            continue
        pre_text = '\n'.join(pre).strip()
        if len(pre_text) < 30:
            continue
        passage, stem = split_passage_stem(pre_text)
        passage = clean_inline(passage)
        stem = clean_inline(stem)
        items.append({
            'questionNo': qno,
            'passage': passage,
            'question': stem,
            'choices': choices,
        })
    return items


def parse_test(pages: list[str]) -> dict[int, list[dict]]:
    """按模块解析 R&W 区域，返回 {1: items, 2: items}"""
    rw_start, math_start = find_section_pages(pages)
    segments: list[tuple[int, list[str]]] = []
    module = 1
    buf: list[str] = []
    for i in range(rw_start, math_start):
        raw = pages[i]
        hm = HEADER_RE.search(raw)
        declared = int(hm.group(1)) if hm else None
        raw = remove_module_header(strip_footer(raw))
        if hm:
            # 标题页：跳过 Directions 说明段，从第一道题开始
            m2 = re.search(r'(?m)^\s*\d{1,2}\s*$', raw)
            raw = raw[m2.start():] if m2 else raw
        if declared is not None and declared != module:
            segments.append((module, buf))
            buf = []
            module = declared
        buf.extend(page_lines(raw))
    segments.append((module, buf))

    result: dict[int, list[dict]] = {}
    for mod, lines in segments:
        items = build_items(lines)
        for it in items:
            it['module'] = mod
        result[mod] = items
    return result


def parse_answers(pdf: Path) -> dict[tuple[int, int], dict]:
    """解析答案册 → {(module, qno): {'answer','explanation'}}

    注意：答案册里 Math 部分的题号也是 1..27，若不截断会覆盖阅读 Module 2 的答案。
    """
    text = '\n'.join(load_pages(pdf))
    mm = re.search(r'MATH\s*:', text)
    limit = mm.start() if mm else len(text)

    mod_marks = [(m.start(), int(m.group(1)))
                 for m in re.finditer(r'READING AND WRITING\s*:\s*MODULE\s*([12])', text)]

    # 所有 QUESTION 标记，用它把每个解析严格框在本题目范围内
    marks = [(m.start(), m.end(), int(m.group(1)))
             for m in re.finditer(r'QUESTION\s+(\d{1,2})\s', text)]

    out: dict[tuple[int, int], dict] = {}
    for i, (qs, qe, qno) in enumerate(marks):
        if qs >= limit:
            continue
        body_end = marks[i + 1][0] if i + 1 < len(marks) else min(len(text), qs + 9000)
        body = text[qe:min(body_end, qs + 9000)]
        am = re.search(r'Choice\s+([A-D])\s+is the best answer', body)
        if not am:
            continue
        em = re.search(
            r'Choice\s+[A-D]\s+is the best answer[.,]?\s*(?:because\s+)?(.*?)'
            r'(?=Choice\s+[A-D]\s+is incorrect|$)',
            body, re.S)
        expl = re.sub(r'\s+', ' ', em.group(1)).strip() if em else ''
        module = 1
        for p, mnum in mod_marks:
            if p <= qs:
                module = mnum
        out[(module, qno)] = {'answer': am.group(1), 'explanation': expl}
    return out


def main() -> int:
    all_items: list[dict] = []
    for n in TEST_NUMBERS:
        print(f'\n=== Practice Test #{n} ===')
        test_pdf = download(f'{BASE}/media/pdf/sat-practice-test-{n}-digital.pdf',
                            OUT_DIR / f'sat-practice-test-{n}-digital.pdf')
        ans_pdf = download(f'{BASE}/media/pdf/sat-practice-test-{n}-answers-digital.pdf',
                           OUT_DIR / f'sat-practice-test-{n}-answers-digital.pdf')
        pages = load_pages(test_pdf)
        by_mod = parse_test(pages)
        m1 = by_mod.get(1, [])
        m2 = by_mod.get(2, [])
        answers = parse_answers(ans_pdf)
        ok = len(m1) == QUESTIONS_PER_MODULE and len(m2) == QUESTIONS_PER_MODULE
        print(f'  解析: module1={len(m1)} 题, module2={len(m2)} 题, 答案 {len(answers)} 条  '
              f'{"✔ 完整" if ok else "✘ 不完整，跳过（保证答案不错位）"}')
        if not ok:
            continue

        for it in m1 + m2:
            key = (it['module'], it['questionNo'])
            ans = answers.get(key)
            if not ans:
                continue
            it['correctLabel'] = ans['answer']
            it['explanation'] = ans['explanation']
            it['exam'] = 'SAT'
            it['source'] = f'College Board 官方 SAT Practice Test #{n}'
            it['testNo'] = n
            it['id'] = f'sat{n}-m{it["module"]}-q{it["questionNo"]}'
            all_items.append(it)

    out = Path(__file__).parent / 'data' / 'sat_reading_bank.json'
    out.write_text(json.dumps(all_items, ensure_ascii=False, indent=1), encoding='utf-8')
    print(f'\n汇总: {len(all_items)} 题 → {out}')
    print('按测试套数:', dict(Counter(it['testNo'] for it in all_items)))
    print('按模块:', dict(Counter(it['module'] for it in all_items)))
    if all_items:
        s = all_items[0]
        print('\n--- 样例 ---')
        print('passage:', s['passage'][:200])
        print('question:', s['question'][:120])
        print('choices:', s['choices'])
        print('answer:', s['correctLabel'])
        print('explanation:', s['explanation'][:150])
    return 0


if __name__ == '__main__':
    sys.exit(main())
