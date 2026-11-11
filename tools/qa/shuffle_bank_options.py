"""打乱题库选项顺序，消除「正确答案总在同一位置」的偏置

用法：
    python tools/qa/shuffle_bank_options.py            # 预览（不写文件）
    python tools/qa/shuffle_bank_options.py --apply    # 实际写入

背景：
AI 生成的题库有强烈的答案位置偏置（实测：听力 B 占 49%、D 仅 1%，
分级阅读 B 占 54%、D 仅 1%），用户一直选同一个字母就能对一半。
官方题库（SAT）本身分布正常，不需要处理。

关键点：
这些题库的解析里大量引用选项字母（如「A项文中未提及；C项以偏概全」），
所以打乱选项时必须把解析里的字母一起改写，否则解析会自相矛盾。

支持的两种格式：
1. choices = [{label, text}]，答案在 correctLabel / correct_label
2. choices = ['A. xxx', 'B. yyy']（故事库），答案在 answer
"""
from __future__ import annotations

import json
import random
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / 'services' / 'ai-gateway' / 'app' / 'data'
LABELS = 'ABCD'

try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

# 只匹配「独立的」A-D（前后不是英文字母），避免误伤英文单词
LETTER = re.compile(r'(?<![A-Za-z])([A-D])(?![A-Za-z])')
PREFIX = re.compile(r'^\s*([A-D])[\.\)、]\s*(.*)$')

# 文件名 → (答案字段, choices 是否为字符串数组)
BANKS = {
    'reading_levels.json': ('correctLabel', False),
    'listening_bank.json': ('correct_label', False),
    'story_bank.json': ('answer', True),
}


def remap_explanation(expl: str, mapping: dict[str, str]) -> str:
    """把解析里引用的选项字母按 mapping 改写（单次替换，不会连锁）"""
    if not expl or not mapping:
        return expl
    return LETTER.sub(lambda m: mapping.get(m.group(1), m.group(1)), expl)


def shuffle_question(q: dict, ans_key: str, str_choices: bool) -> bool:
    """就地打乱一道题的选项；成功返回 True"""
    choices = q.get('choices')
    if not isinstance(choices, list) or len(choices) < 2:
        return False
    old = str(q.get(ans_key) or '').upper()
    if old not in LABELS:
        return False

    if str_choices:
        parsed = []
        for c in choices:
            m = PREFIX.match(str(c))
            if not m or m.group(1) not in LABELS:
                return False          # 格式不符就不动，避免破坏数据
            parsed.append((m.group(1), m.group(2)))
        random.shuffle(parsed)
        mapping = {lbl: LABELS[i] for i, (lbl, _) in enumerate(parsed)}
        q['choices'] = [f'{LABELS[i]}. {txt}' for i, (_, txt) in enumerate(parsed)]
    else:
        if not all(isinstance(c, dict) for c in choices):
            return False
        by_label = {c.get('label'): str(c.get('text') or '')
                    for c in choices if c.get('label') in LABELS}
        if len(by_label) < 2:
            return False
        items = list(by_label.items())
        random.shuffle(items)
        mapping = {lbl: LABELS[i] for i, (lbl, _) in enumerate(items)}
        q['choices'] = [{'label': LABELS[i], 'text': txt}
                        for i, (_, txt) in enumerate(items)]

    q[ans_key] = mapping.get(old, old)
    if 'explanation' in q:
        q['explanation'] = remap_explanation(str(q.get('explanation') or ''), mapping)
    return True


def distribution(arr, ans_key):
    counts = {lab: 0 for lab in LABELS}
    total = 0
    for it in arr:
        for q in it.get('questions') or []:
            if not isinstance(q, dict):
                continue
            total += 1
            lab = str(q.get(ans_key) or '').upper()
            if lab in counts:
                counts[lab] += 1
    return counts, total


def main() -> int:
    apply = '--apply' in sys.argv
    random.seed(20261111)      # 固定种子，结果可复现

    for fname, (ans_key, str_choices) in BANKS.items():
        p = DATA / fname
        if not p.exists():
            print(f'{fname}: 不存在，跳过')
            continue
        raw = json.loads(p.read_text(encoding='utf-8'))
        is_list = isinstance(raw, list)
        arr = raw if is_list else raw.get('items', [])

        before, total = distribution(arr, ans_key)
        n = 0
        for it in arr:
            for q in it.get('questions') or []:
                if isinstance(q, dict) and shuffle_question(q, ans_key, str_choices):
                    n += 1
        after, _ = distribution(arr, ans_key)

        print(f'--- {fname}: {total} 题，打乱 {n} 题')
        for tag, d in (('打乱前', before), ('打乱后', after)):
            row = '  '.join(f'{k}:{v}({v * 100 // max(total, 1)}%)' for k, v in d.items())
            print(f'    {tag}  {row}')

        if apply:
            p.write_text(json.dumps(arr if is_list else raw, ensure_ascii=False),
                         encoding='utf-8')
            print('    已写入')
        print()

    if not apply:
        print('（加 --apply 实际写入）')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
