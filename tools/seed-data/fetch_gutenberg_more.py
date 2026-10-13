"""从 Project Gutenberg 追加 100 本公共版权名著（走官网，不走 gutendex）

gutendex.com 从服务器访问返回 403，改用官网：
- 榜单：https://www.gutenberg.org/browse/scores/top
- 正文：https://www.gutenberg.org/cache/epub/{id}/pg{id}.txt
- 书名/作者：直接读 txt 文件头（比解析 HTML 可靠）
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

OUT = Path(__file__).parent / 'data' / 'library_books_extra.json'
EXISTING = Path(__file__).parent / 'data' / 'library_books.json'
MAX_TEXT = 1_500_000
TARGET = 100
UA = {'User-Agent': 'Mozilla/5.0 (compatible; vocab-agent/1.0)'}

CATEGORY_RULES = [
    (('fairy', 'folklore', 'myth', 'legend'), '童话神话'),
    (('detective', 'mystery', 'crime', 'murder', 'sherlock'), '推理悬疑'),
    (('science fiction', 'space', 'martian', 'future', 'time machine'), '科幻'),
    (('adventure', 'sea', 'voyage', 'pirate', 'treasure', 'island'), '冒险'),
    (('history', 'historical', 'war', 'revolution'), '历史'),
    (('poetry', 'poems', 'verse', 'sonnets'), '诗歌'),
    (('philosophy', 'ethics', 'metaphysics', 'republic', 'prince'), '哲学'),
    (('children', 'juvenile', 'young', 'nursery'), '儿童文学'),
    (('romance', 'love', 'lover'), '爱情'),
    (('humor', 'comic', 'satire', 'jest'), '幽默讽刺'),
    (('biography', 'autobiography', 'letters', 'life of'), '传记'),
    (('drama', 'plays', 'tragedy', 'comedy', 'shakespeare'), '戏剧'),
    (('travel', 'description and travel', 'voyages'), '游记'),
    (('religion', 'bible', 'christian', 'theology'), '宗教'),
    (('economics', 'wealth', 'political economy'), '经济'),
    (('science', 'nature', 'natural', 'origin of species'), '科学'),
]

ZH_TITLE = {
    'pride and prejudice': '傲慢与偏见', 'jane eyre': '简·爱',
    'wuthering heights': '呼啸山庄', 'great expectations': '远大前程',
    'oliver twist': '雾都孤儿', 'a tale of two cities': '双城记',
    'david copperfield': '大卫·科波菲尔', 'moby dick': '白鲸',
    'moby-dick; or, the whale': '白鲸', 'dracula': '德古拉',
    'frankenstein; or, the modern prometheus': '弗兰肯斯坦',
    'the picture of dorian gray': '道林·格雷的画像',
    'heart of darkness': '黑暗之心', 'the scarlet letter': '红字',
    'little women': '小妇人', 'the great gatsby': '了不起的盖茨比',
    'the adventures of huckleberry finn': '哈克贝利·费恩历险记',
    'the adventures of tom sawyer': '汤姆·索亚历险记',
    'the prince': '君主论', 'the republic': '理想国',
    'meditations': '沉思录', 'the art of war': '孙子兵法',
    'thus spake zarathustra': '查拉图斯特拉如是说',
    'beyond good and evil': '善恶的彼岸',
    'the wealth of nations': '国富论',
    'on the origin of species': '物种起源',
    'the interpretation of dreams': '梦的解析',
    'leaves of grass': '草叶集', 'the raven': '乌鸦',
    'emma': '爱玛', 'sense and sensibility': '理智与情感',
    'mansfield park': '曼斯菲尔德庄园', 'northanger abbey': '诺桑觉寺',
    'persuasion': '劝导', 'the secret adversary': '暗藏杀机',
    'the mysterious affair at styles': '斯泰尔斯庄园奇案',
    'the hound of the baskervilles': '巴斯克维尔的猎犬',
    'a study in scarlet': '血字的研究', 'the sign of the four': '四签名',
    'the lost world': '失落的世界', 'the invisible man': '隐身人',
    'the island of doctor moreau': '莫罗博士的岛',
    'twenty thousand leagues under the sea': '海底两万里',
    'a journey to the centre of the earth': '地心游记',
    'a journey to the center of the earth': '地心游记',
    'from the earth to the moon': '从地球到月球',
    'the count of monte cristo': '基督山伯爵',
    'the three musketeers': '三个火枪手',
    'les misérables': '悲惨世界',
    'the hunchback of notre dame': '巴黎圣母院',
    'madame bovary': '包法利夫人', 'metamorphosis': '变形记',
    'crime and punishment': '罪与罚',
    'the brothers karamazov': '卡拉马佐夫兄弟',
    'war and peace': '战争与和平', 'anna karenina': '安娜·卡列尼娜',
    'the idiot': '白痴', 'fathers and sons': '父与子',
    'dead souls': '死魂灵', 'the cherry orchard': '樱桃园',
    'hamlet': '哈姆雷特', 'macbeth': '麦克白', 'king lear': '李尔王',
    'othello': '奥赛罗', 'romeo and juliet': '罗密欧与朱丽叶',
    "a midsummer night's dream": '仲夏夜之梦', 'the tempest': '暴风雨',
    'much ado about nothing': '无事生非', 'twelfth night': '第十二夜',
    'the merchant of venice': '威尼斯商人', 'paradise lost': '失乐园',
    'the divine comedy': '神曲', 'the iliad': '伊利亚特',
    'the odyssey': '奥德赛', 'the aeneid': '埃涅阿斯纪',
    "gulliver's travels": '格列佛游记',
    'the life and adventures of robinson crusoe': '鲁滨逊漂流记',
    "the pilgrim's progress": '天路历程',
    'the history of tom jones, a foundling': '汤姆·琼斯',
    'vanity fair': '名利场', 'the woman in white': '白衣女人',
    'the moonstone': '月光石', 'middlemarch': '米德尔马契',
    'silas marner': '织工马南',
    'the mill on the floss': '弗洛斯河上的磨坊',
    'far from the madding crowd': '远离尘嚣',
    "tess of the d'urbervilles": '德伯家的苔丝',
    'jude the obscure': '无名的裘德',
    'the return of the native': '还乡',
    'the mayor of casterbridge': '卡斯特桥市长',
    'north and south': '南方与北方', 'cranford': '克兰福德',
    'the tenant of wildfell hall': '荒野庄园的房客',
    'agnes grey': '阿格尼斯·格雷', 'villette': '维莱特',
    'shirley': '雪莉', 'the professor': '教师',
    'alice\'s adventures in wonderland': '爱丽丝梦游仙境',
    'the wonderful wizard of oz': '绿野仙踪',
    'the secret garden': '秘密花园',
    'the jungle book': '丛林奇谭',
    'a christmas carol': '圣诞颂歌',
    'anne of green gables': '绿山墙的安妮',
    'black beauty': '黑骏马',
    'the railway children': '铁路边的孩子们',
    'treasure island': '金银岛',
    "aesop's fables": '伊索寓言',
    "grimm's fairy tales": '格林童话',
    'fairy tales': '安徒生童话',
    'the call of the wild': '野性的呼唤', 'white fang': '白牙',
    'the adventures of sherlock holmes': '福尔摩斯探案集',
    'the time machine': '时间机器',
    'the war of the worlds': '世界大战',
    'around the world in eighty days': '八十天环游地球',
    'the metamorphosis': '变形记',
    'peter pan': '彼得·潘',
    'the wind in the willows': '柳林风声',
    'through the looking-glass': '爱丽丝镜中奇遇记',
}


def api(url: str, timeout: int = 30) -> bytes:
    req = urllib.request.Request(url, headers=UA)
    return urllib.request.urlopen(req, timeout=timeout).read()


def strip_gutenberg(text: str) -> str:
    m = re.search(r'\*\*\*\s*START OF (?:THE|THIS) PROJECT GUTENBERG.*?\*\*\*', text, re.I)
    if m:
        text = text[m.end():]
    m2 = re.search(r'\*\*\*\s*END OF (?:THE|THIS) PROJECT GUTENBERG', text, re.I)
    if m2:
        text = text[:m2.start()]
    return text.strip()


def read_header(text: str) -> tuple[str, str]:
    """从 txt 文件头读 Title / Author"""
    title = author = ''
    for line in text[:4000].split('\n')[:80]:
        if not title:
            m = re.match(r'^\s*Title:\s*(.+)$', line, re.I)
            if m:
                title = m.group(1).strip()
                continue
        if not author:
            m = re.match(r'^\s*Author:\s*(.+)$', line, re.I)
            if m:
                author = m.group(1).strip()
    return title, author


def split_chapters(text: str) -> list[dict]:
    pat = re.compile(
        r'^\s*(?:CHAPTER|Chapter|BOOK|Book|PART|Part|ACT|Act|SCENE|Scene)\s+'
        r'(?:[IVXLC]+|\d+|[A-Z])[.:\s]', re.M)
    marks = [m.start() for m in pat.finditer(text)]
    if len(marks) < 3:
        paras = [p for p in text.split('\n\n') if p.strip()]
        if not paras:
            return []
        per = max(1, len(paras) // 8)
        return [{'title': f'第 {i // per + 1} 部分', 'text': '\n\n'.join(paras[i:i + per])}
                for i in range(0, len(paras), per)]
    out = []
    for i, start in enumerate(marks):
        end = marks[i + 1] if i + 1 < len(marks) else len(text)
        body = text[start:end].strip()
        if len(body) < 600:
            continue
        head = body.split('\n', 1)[0].strip()[:60]
        out.append({'title': head or f'第 {i + 1} 章', 'text': body})
    return out


def guess_category(title: str) -> str:
    t = title.lower()
    for keys, cat in CATEGORY_RULES:
        if any(k in t for k in keys):
            return cat
    return '经典文学'


def guess_level(words: int) -> str:
    if words < 30000:
        return 'A2'
    if words < 70000:
        return 'B1'
    if words < 130000:
        return 'B2'
    return 'C1'


def fetch_book(gid: int) -> dict | None:
    url = f'https://www.gutenberg.org/cache/epub/{gid}/pg{gid}.txt'
    try:
        raw = api(url, timeout=60)
        if len(raw) > MAX_TEXT:
            return None
        text = raw.decode('utf-8', 'replace')
    except Exception:
        return None

    title, author = read_header(text)
    body = strip_gutenberg(text)
    if not title or len(body) < 5000:
        return None

    chapters = split_chapters(body)
    if not chapters:
        return None

    title = re.sub(r'\s+', ' ', title)[:120]
    author = re.sub(r',?\s*\d{4}-?\d{0,4}', '', author).strip()[:80]
    words = len(body.split())
    zh = ZH_TITLE.get(title.lower(), '')

    return {
        'id': f'pg-{gid}',
        'title': title,
        'titleZh': zh,
        'author': author,
        'level': guess_level(words),
        'category': guess_category(title),
        'reason': 'Project Gutenberg 公共版权名著',
        'kind': 'classic',
        'wordCount': words,
        'chapters': [{'index': i, 'title': c['title'], 'text': c['text']}
                     for i, c in enumerate(chapters)],
    }


def main() -> int:
    print('=== 1) 已有书单（去重用）===')
    have: set[str] = set()
    have_ids: set[str] = set()
    if EXISTING.exists():
        try:
            d = json.loads(EXISTING.read_text(encoding='utf-8'))
            books = d if isinstance(d, list) else d.get('books', [])
            for b in books:
                t = (b.get('title') or '').lower().strip()
                if t:
                    have.add(t)
                i = str(b.get('id') or '')
                if i:
                    have_ids.add(i)
        except Exception as e:
            print('  读失败:', e)
    print(f'  已有 {len(have)} 本')

    print()
    print('=== 2) 抓 Gutenberg 热门榜 ===')
    try:
        html = api('https://www.gutenberg.org/browse/scores/top', timeout=40).decode('utf-8', 'replace')
    except Exception as e:
        print('  榜单抓取失败:', type(e).__name__)
        return 1

    pairs = re.findall(r'/ebooks/(\d+)"[^>]*>([^<]{3,120})</a>', html)
    seen: set[int] = set()
    cands: list[tuple[int, str]] = []
    for gid_s, title in pairs:
        gid = int(gid_s)
        if gid in seen:
            continue
        seen.add(gid)
        t = re.sub(r'\s+', ' ', title).strip()
        if t.lower() in have or f'pg-{gid}' in have_ids:
            continue
        cands.append((gid, t))
    print(f'  榜单候选 {len(cands)} 本')

    print()
    print('=== 3) 下载并转换（目标 100 本）===')
    out: list[dict] = []
    with ThreadPoolExecutor(max_workers=6) as ex:
        for r in ex.map(fetch_book, [c[0] for c in cands[:260]]):
            if r:
                out.append(r)
                zh = r['titleZh'] or ''
                print(f'  ✅ {r["title"][:40]:42} {zh[:12]:14} {r["wordCount"]:>7} 词 {r["level"]}')
            if len(out) >= TARGET:
                break

    print()
    print(f'=== 4) 写出 {len(out)} 本 ===')
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({'books': out}, ensure_ascii=False), encoding='utf-8')
    print(f'  {OUT}  {OUT.stat().st_size / 1024 / 1024:.1f} MB')
    print(f'  合计 {sum(b["wordCount"] for b in out):,} 词，{sum(len(b["chapters"]) for b in out)} 章')
    return 0


if __name__ == '__main__':
    sys.exit(main())
