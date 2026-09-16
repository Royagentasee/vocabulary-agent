"""
ECDICT → 小程序 / 移动端词库打包工具

将 ECDICT CSV 转成 JSON bundle，按频率 + 长度过滤，输出到：
  apps/mini/src/services/words-bundle.ts
  apps/web/src/services/words-bundle.ts
  apps/mobile/src/services/words-bundle.ts

这样前端首次加载就拿到 5000 词，无需额外网络请求。

用法：
  # 下载 ECDICT
  curl -L https://github.com/skywind3000/ECDICT/releases/download/1.0.28/ecdict.csv \
       -o tools/seed-data/data/ecdict.csv

  # 打包
  python -m tools.seed-data.ecdict_to_bundle \
       --input tools/seed-data/data/ecdict.csv \
       --output-dir apps/mini/src/services \
       --top 5000
"""
from __future__ import annotations

import argparse
import csv
import json
import sys
from pathlib import Path


def normalize_pos(pos: str) -> list[str]:
    """ECDICT 的 pos 字段是 'n./v./adj.' 这种格式。"""
    return [p.strip() for p in pos.replace('.', '/').split('/') if p.strip()]


def build_entry(row: dict) -> dict | None:
    headword = (row.get('word') or '').strip()
    if not headword or not headword.replace(' ', '').replace('-', '').replace("'", '').isalpha():
        return None

    try:
        frq = float(row.get('frq') or 0)
    except ValueError:
        frq = 0

    translation = (row.get('translation') or '').strip()
    if not translation:
        return None

    return {
        'id': f'w-{headword}',
        'headword': headword,
        'ipa': (row.get('phonetic') or '').strip(),
        'pos': normalize_pos(row.get('pos', '')),
        'audioUrl': '',
        'senses': [
            {
                'pos': p,
                'definitionEn': '',
                'definitionCn': translation.split(';')[0].strip(),
            }
            for p in (normalize_pos(row.get('pos', '')) or ['n'])
        ],
        'etymology': '',
        'collocations': [],
        'examTags': [
            {'exam': 'GENERAL', 'frequency': round(frq / 100.0, 2)},
        ],
        'examples': [],
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--input', type=Path, required=True, help='ECDICT CSV 文件')
    parser.add_argument('--output-dir', type=Path, required=True)
    parser.add_argument('--top', type=int, default=5000, help='取频率最高的 N 词')
    parser.add_argument('--max-len', type=int, default=12, help='单词最长字符数')
    args = parser.parse_args()

    if not args.input.exists():
        print(f'ERROR: ECDICT CSV not found: {args.input}', file=sys.stderr)
        print('Download from: https://github.com/skywind3000/ECDICT/releases', file=sys.stderr)
        return 1

    print(f'Reading ECDICT from {args.input}...')

    # 第一遍：收集所有词条 + 按频率排序
    all_entries: list[dict] = []
    with args.input.open(encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            entry = build_entry(row)
            if not entry:
                continue
            if len(entry['headword']) > args.max_len:
                continue
            all_entries.append(entry)

    print(f'Total valid entries: {len(all_entries)}')

    # 按 frequency 排序取 top
    all_entries.sort(
        key=lambda e: e['examTags'][0]['frequency'] if e['examTags'] else 0,
        reverse=True,
    )
    top_entries = all_entries[: args.top]
    print(f'Selected top {len(top_entries)} entries')

    # 输出文件
    args.output_dir.mkdir(parents=True, exist_ok=True)
    output_file = args.output_dir / 'words-bundle.ts'

    content = f"""/**
 * 词库 bundle（自动生成，请勿手工编辑）
 *
 * 来源：ECDICT (https://github.com/skywind3000/ECDICT)
 * 词条数：{len(top_entries)}
 * 生成时间：自动
 */
import type {{ Word }} from '@vocab-agent/types'

export const WORDS_BUNDLE: Word[] = {json.dumps(top_entries, ensure_ascii=False, indent=2)}

export const WORDS_BUNDLE_SIZE = {len(top_entries)}
"""

    output_file.write_text(content, encoding='utf-8')
    print(f'Written: {output_file}')

    # 同时输出 wordbooks
    wordbooks = [
        {
            'id': 'wb-high5000',
            'name': '高频 5000 词',
            'description': '覆盖雅思/托福核心高频词',
            'examTag': 'GENERAL',
            'wordCount': len(top_entries),
            'coverColor': '#3b82f6',
        },
        {
            'id': 'wb-gre-core',
            'name': 'GRE 核心词汇',
            'description': '高频 GRE 词汇精选',
            'examTag': 'GRE',
            'wordCount': 1500,
            'coverColor': '#111111',
        },
        {
            'id': 'wb-ielts-7',
            'name': '雅思 7+ 词汇',
            'description': '冲 7 分必备',
            'examTag': 'IELTS',
            'wordCount': 2500,
            'coverColor': '#10b981',
        },
    ]

    wordbooks_file = args.output_dir / 'wordbooks-bundle.ts'
    wordbooks_content = f"""/**
 * 词书 bundle（自动生成）
 */
export const WORDBOOKS_BUNDLE = {json.dumps(wordbooks, ensure_ascii=False, indent=2)}
"""
    wordbooks_file.write_text(wordbooks_content, encoding='utf-8')
    print(f'Written: {wordbooks_file}')

    return 0


if __name__ == '__main__':
    sys.exit(main())