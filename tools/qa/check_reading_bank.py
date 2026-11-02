"""SAT 真题库质量体检

用法：
    python tools/qa/check_reading_bank.py            # 只报告
    python tools/qa/check_reading_bank.py --fix      # 顺带修可自动修的

检查项：
1. 脏数据：选项/解析里混入 PDF 页眉页脚、说明文字、跨栏粘连内容
2. 答案键：解析里写了「Choice X is the best answer」却和 correctLabel 不一致
3. 答案键（弱校验）：解析引用的原文片段出现在别的选项里
4. 空选项 / 选项重复 / 正确答案不在选项里
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BANK = ROOT / 'services' / 'ai-gateway' / 'app' / 'data' / 'reading_bank.json'

try:  # Windows 控制台默认 GBK，中文会乱码
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

GARBAGE = re.compile(
    r'SAT\s+PRACTICE|ANSWER\s+EXPLANATIONS|READING\s+AND\s+WRITING|'
    r'MODULE\s+\d|one or more passages|single best answer|multiple-?choice|'
    r'Read each passage|-{3,}',
    re.I,
)
TAIL_NUM = re.compile(r'(?<=[.?!""”’])\s+\d{1,3}\s*$')
CUT = [
    r'\s*-{2,}.*$',
    r'\s+SAT\s+PRACTICE\s+TEST.*$',
    r'\s+SAT\s+ANSWER\s+EXPLANATIONS.*$',
    r'\s+ANSWER\s+EXPLANATIONS.*$',
    r'\s+READING\s+AND\s+WRITING.*$',
    r'\s+MODULE\s+\d\b.*$',
    r'\s+question includes one or more passages.*$',
    r'\s+Read each passage and question carefully.*$',
    r'\s+All questions in this section are multiple-?choice.*$',
    r'\s+Each question has a single best answer.*$',
]
CUT_RE = [re.compile(p, re.I) for p in CUT]

CLAIM = re.compile(r'Choice\s+([A-D])\s+is\s+the\s+best\s+answer', re.I)
QUOTE = re.compile(r'[“"]([^”"]{2,60})[”"]')
LOWER_START = re.compile(r'^[a-z]')

# 补句号时只认「一定是句首」的词，专有名词一律不碰
STARTERS = [
    'However', 'Therefore', 'Thus', 'Moreover', 'Furthermore', 'Consequently',
    'Meanwhile', 'Additionally', 'Nevertheless', 'Nonetheless', 'Similarly',
    'Ultimately', 'Instead', 'Rather', 'Despite', 'Although', 'Though',
    'Whereas', 'Unless', 'Afterward', 'Afterwards', 'Recently', 'Today',
]
PUNCT = re.compile(r'([a-z])(\s+)(' + '|'.join(STARTERS) + r')\b')


def clean(s: str) -> str:
    t = str(s or '')
    for r in CUT_RE:
        t = r.sub('', t)
    t = TAIL_NUM.sub('', t)
    t = re.sub(r'[ \t]+', ' ', t).strip()
    return re.sub(r'[\s\-~—–_]{2,}$', '', t).strip()


def main() -> int:
    fix = '--fix' in sys.argv
    arr = json.loads(BANK.read_text(encoding='utf-8'))
    print(f'题库: {BANK.name}  共 {len(arr)} 题\n')

    issues = {'garbage': [], 'empty': [], 'dupChoice': [], 'noCorrect': [],
              'keyMismatch': [], 'keyWeak': [], 'lowerExpl': 0, 'missingPunct': 0}

    for it in arr:
        qid = it.get('id')
        choices = it.get('choices') or []
        cur = (it.get('correctLabel') or '').upper()

        # 1. 脏数据
        for c in choices:
            if c.get('text') and GARBAGE.search(str(c['text'])):
                issues['garbage'].append((qid, c.get('label')))
                break
        if GARBAGE.search(it.get('explanation') or ''):
            issues['garbage'].append((qid, 'explanation'))

        # 2. 空选项 / 重复选项 / 答案不在选项里
        labels = [c.get('label') for c in choices]
        texts = [(str(c.get('text') or '')).strip() for c in choices]
        if any(not t for t in texts):
            issues['empty'].append(qid)
        if len(set(t.lower() for t in texts if t)) != len([t for t in texts if t]):
            issues['dupChoice'].append(qid)
        if cur not in labels:
            issues['noCorrect'].append(qid)

        # 3. 答案键：强校验
        labels_in_expl = CLAIM.findall(it.get('explanation') or '')
        if labels_in_expl:
            claim = labels_in_expl[0].upper()
            if claim != cur:
                issues['keyMismatch'].append((qid, cur, claim))

        # 4. 答案键：弱校验（引文落在哪个选项）
        elif cur in labels:
            quotes = [q.strip() for q in QUOTE.findall(it.get('explanation') or '') if len(q.strip()) >= 3]
            if quotes:
                score = {c.get('label'): sum(1 for q in quotes if q.lower() in str(c.get('text') or '').lower())
                         for c in choices}
                if sum(score.values()) > 0:
                    best = max(score, key=lambda k: score[k])
                    if score.get(cur, 0) < score[best]:
                        issues['keyWeak'].append((qid, cur, best, score))

        # 5. 文本质量
        if LOWER_START.match((it.get('explanation') or '').strip()):
            issues['lowerExpl'] += 1
        if PUNCT.search(it.get('passage') or ''):
            issues['missingPunct'] += 1

    print('=== 结果 ===')
    print(f"  选项/解析含脏数据 : {len(issues['garbage'])}")
    print(f"  空选项            : {len(issues['empty'])}")
    print(f"  选项重复          : {len(issues['dupChoice'])}")
    print(f"  答案不在选项里    : {len(issues['noCorrect'])}")
    print(f"  答案键 (强校验)   : {len(issues['keyMismatch'])} 处不一致")
    print(f"  答案键 (弱校验)   : {len(issues['keyWeak'])} 处可疑")
    print(f"  解析缺主语        : {issues['lowerExpl']}")
    print(f"  段落缺句号        : {issues['missingPunct']}")

    for k in ('keyMismatch', 'keyWeak'):
        if issues[k]:
            print(f'\n--- {k} 明细 ---')
            for x in issues[k][:15]:
                print('  ', x)

    if not fix:
        print('\n（加 --fix 可自动修脏数据/缺主语/缺句号）')
        return 0

    # ---------------- 修复 ----------------
    n_g = n_e = n_p = 0
    for it in arr:
        for c in it.get('choices') or []:
            old = str(c.get('text') or '')
            new = clean(old)
            if new != old:
                c['text'] = new
                n_g += 1
        old_e = str(it.get('explanation') or '')
        if LOWER_START.match(old_e.strip()):
            lbl = it.get('correctLabel') or ''
            e = old_e.strip()
            if e.lower().startswith('it '):
                it['explanation'] = f'Choice {lbl} is the best answer because {e}'
            else:
                it['explanation'] = f'Choice {lbl} is the best answer. {e[0].upper() + e[1:]}'
            n_e += 1
        it['explanation'] = clean(it['explanation'] or '') if GARBAGE.search(it['explanation'] or '') else it['explanation']
        old_p = str(it.get('passage') or '')
        new_p, k = PUNCT.subn(lambda m: m.group(1) + '.' + m.group(2) + m.group(3), old_p)
        if k:
            it['passage'] = new_p
            n_p += k

    BANK.write_text(json.dumps(arr, ensure_ascii=False), encoding='utf-8')
    print(f'\n已修复：选项 {n_g} 处 / 解析补主语 {n_e} 条 / 段落补句号 {n_p} 处')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
