"""从 Project Gutenberg 抓取公共版权名著，转成 App 书库格式

- 只抓公共版权作品（作者逝世超过 70 年）
- 自动去掉 Gutenberg 的文件头尾
- 按章节切分（识别 CHAPTER 标记，识别不了就按段落等分）
- 输出 tools/seed-data/data/library_books.json
"""
from __future__ import annotations

import json
import re
import sys
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

OUT = Path(__file__).parent / 'data' / 'library_books.json'
MAX_TEXT_BYTES = 1_600_000   # 单本超过 1.6MB 正文就跳过（避免仓库过大）

# (gutenberg_id, 英文名, 中文名, 作者, 难度, 分类, 推荐理由)
BOOKS = [
    (11,    "Alice's Adventures in Wonderland", "爱丽丝梦游仙境", "Lewis Carroll", "A2", "童话奇幻", "奇幻文学鼻祖，句式简单，入门首选"),
    (12,    "Through the Looking-Glass", "爱丽丝镜中奇遇记", "Lewis Carroll", "B1", "童话奇幻", "爱丽丝续集，含大量语言游戏"),
    (55,    "The Wonderful Wizard of Oz", "绿野仙踪", "L. Frank Baum", "A2", "童话奇幻", "美国童话经典，词汇友好"),
    (16,    "Peter Pan", "彼得·潘", "J. M. Barrie", "B1", "童话奇幻", "永不长大的男孩，比迪士尼原著更细腻"),
    (17396, "The Secret Garden", "秘密花园", "Frances Hodgson Burnett", "B1", "成长治愈", "语言优美，适合精读"),
    (289,   "The Wind in the Willows", "柳林风声", "Kenneth Grahame", "B1", "童话奇幻", "英式田园童话，哈利波特作者童年最爱"),
    (236,   "The Jungle Book", "丛林奇谭", "Rudyard Kipling", "B1", "冒险", "毛克利的故事，迪士尼改编原著"),
    (46,    "A Christmas Carol", "圣诞颂歌", "Charles Dickens", "B1", "经典文学", "狄更斯最短最好读的一本"),
    (45,    "Anne of Green Gables", "绿山墙的安妮", "L. M. Montgomery", "B1", "成长治愈", "加拿大经典少女成长小说"),
    (271,   "Black Beauty", "黑骏马", "Anna Sewell", "A2", "动物故事", "以一匹马的口吻写成，词汇简单感人"),
    (1874,  "The Railway Children", "铁路边的孩子们", "E. Nesbit", "A2", "成长治愈", "英国家庭冒险经典"),
    (120,   "Treasure Island", "金银岛", "Robert Louis Stevenson", "B1", "冒险", "海盗文学的源头，故事性强"),
    (74,    "The Adventures of Tom Sawyer", "汤姆·索亚历险记", "Mark Twain", "B1", "冒险", "美国文学经典，幽默好读"),
    (76,    "Adventures of Huckleberry Finn", "哈克贝利·费恩历险记", "Mark Twain", "B2", "冒险", "含大量方言口语，进阶挑战"),
    (11339, "Aesop's Fables", "伊索寓言", "Aesop", "A2", "寓言", "短小精悍，每篇一个道理"),
    (2591,  "Grimm's Fairy Tales", "格林童话", "Brothers Grimm", "A2", "童话奇幻", "原版格林，比动画版更完整"),
    (1597,  "Andersen's Fairy Tales", "安徒生童话", "H. C. Andersen", "A2", "童话奇幻", "海的女儿、卖火柴的小女孩原文"),
    (215,   "The Call of the Wild", "野性的呼唤", "Jack London", "B1", "动物故事", "一只狗的荒野觉醒，力量感强"),
    (910,   "White Fang", "白牙", "Jack London", "B1", "动物故事", "野性的呼唤姊妹篇"),
    (1661,  "The Adventures of Sherlock Holmes", "福尔摩斯探案集", "Arthur Conan Doyle", "B2", "推理悬疑", "12 个短篇，篇篇精彩"),
    (35,    "The Time Machine", "时间机器", "H. G. Wells", "B1", "科幻", "科幻小说开山之作"),
    (36,    "The War of the Worlds", "世界大战", "H. G. Wells", "B2", "科幻", "外星人入侵题材鼻祖"),
    (103,   "Around the World in Eighty Days", "八十天环游地球", "Jules Verne", "B1", "冒险", "环游世界的冒险经典"),
    (84,    "Frankenstein", "弗兰肯斯坦", "Mary Shelley", "B2", "科幻", "科幻与哥特小说源头"),
    (345,   "Dracula", "德古拉", "Bram Stoker", "B2", "推理悬疑", "吸血鬼文学经典"),
    (1342,  "Pride and Prejudice", "傲慢与偏见", "Jane Austen", "B2", "经典文学", "英式对话与反讽的巅峰"),
]

CHAP_RE = re.compile(
    r'^\s*(?:CHAPTER|Chapter)\s+(?:[IVXLCDM]{1,7}|\d{1,3}|One|Two|Three|Four|Five|Six|Seven|Eight|'
    r'Nine|Ten|Eleven|Twelve|Thirteen|Fourteen|Fifteen|Sixteen|Seventeen|Eighteen|Nineteen|Twenty)\b.*$',
    re.MULTILINE)


def strip_gutenberg(txt: str) -> str:
    """去掉 Gutenberg 的文件头与页脚"""
    m = re.search(r'\*{3}\s*START OF (?:THE|THIS) PROJECT GUTENBERG.*?\*{3}', txt, re.IGNORECASE | re.DOTALL)
    if m:
        txt = txt[m.end():]
    m = re.search(r'\*{3}\s*END OF (?:THE|THIS) PROJECT GUTENBERG', txt, re.IGNORECASE)
    if m:
        txt = txt[:m.start()]
    # 去掉 "Produced by ..." 之类的说明段
    txt = re.sub(r'^\s*(Produced by|Transcribed from|E-?text prepared by)[^\n]*\n', '', txt, flags=re.IGNORECASE | re.MULTILINE)
    return txt.strip()


def split_chapters(txt: str) -> list[dict]:
    """按 CHAPTER 标记切分；找不到就按段落等分成若干块"""
    marks = list(CHAP_RE.finditer(txt))
    chapters: list[dict] = []

    if len(marks) >= 3:
        # 前言/序言部分（第一章之前）
        preface = txt[:marks[0].start()].strip()
        if len(preface.split()) > 400:
            chapters.append({'title': 'Preface', 'titleZh': '序言', 'text': preface})
        for i, m in enumerate(marks):
            start = m.end()
            end = marks[i + 1].start() if i + 1 < len(marks) else len(txt)
            body = txt[start:end].strip()
            heading = re.sub(r'\s+', ' ', m.group(0)).strip()
            if len(body.split()) < 120:      # 太短的（目录条目之类）跳过
                continue
            chapters.append({'title': heading[:80], 'titleZh': '', 'text': body})
    else:
        # 按空行分组，切成长度接近的块
        paras = [p.strip() for p in re.split(r'\n\s*\n', txt) if p.strip()]
        buf: list[str] = []
        words = 0
        idx = 0
        for p in paras:
            buf.append(p)
            words += len(p.split())
            if words >= 2200:
                idx += 1
                chapters.append({'title': f'Part {idx}', 'titleZh': f'第 {idx} 部分', 'text': '\n\n'.join(buf)})
                buf, words = [], 0
        if buf:
            idx += 1
            chapters.append({'title': f'Part {idx}', 'titleZh': f'第 {idx} 部分', 'text': '\n\n'.join(buf)})
    return chapters


def fetch(book: tuple) -> dict | None:
    gid, title, title_zh, author, level, category, blurb = book
    url = f'https://www.gutenberg.org/cache/epub/{gid}/pg{gid}.txt'
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (VocabularyAgent educational)'})
            raw = urllib.request.urlopen(req, timeout=60).read()
            if len(raw) > MAX_TEXT_BYTES:
                return {'_skip': f'{title} 正文过大 ({len(raw)//1024}KB)'}
            txt = raw.decode('utf-8', 'replace')
            txt = strip_gutenberg(txt)
            chapters = split_chapters(txt)
            if len(chapters) < 2:
                return {'_skip': f'{title} 章节切分失败'}
            words = sum(len(c['text'].split()) for c in chapters)
            return {
                'id': f'pg{gid}',
                'gutenbergId': gid,
                'title': title,
                'titleZh': title_zh,
                'author': author,
                'level': level,
                'category': category,
                'blurb': blurb,
                'chapterCount': len(chapters),
                'wordCount': words,
                'chapters': chapters,
            }
        except Exception as e:
            if attempt == 2:
                return {'_skip': f'{title}: {type(e).__name__} {str(e)[:60]}'}
            time.sleep(3)
    return None


def main() -> int:
    books: list[dict] = []
    if OUT.exists():
        try:
            books = json.loads(OUT.read_text(encoding='utf-8'))
        except Exception:
            books = []
    have = {b['id'] for b in books}
    todo = [b for b in BOOKS if f'pg{b[0]}' not in have]
    print(f'已有 {len(books)} 本，待抓 {len(todo)} 本', flush=True)

    with ThreadPoolExecutor(max_workers=4) as ex:
        for res in ex.map(fetch, todo):
            if not res:
                continue
            if '_skip' in res:
                print(f'  跳过: {res["_skip"]}', flush=True)
                continue
            books.append(res)
            books.sort(key=lambda x: (x['level'], x['title']))
            OUT.write_text(json.dumps(books, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
            print(f"  ✅ {res['title'][:44]:44} {res['chapterCount']:3}章 {res['wordCount']:6}词", flush=True)

    size_mb = OUT.stat().st_size / 1024 / 1024 if OUT.exists() else 0
    print(f'\n完成：{len(books)} 本，{size_mb:.1f} MB → {OUT}', flush=True)
    return 0


if __name__ == '__main__':
    sys.exit(main())
