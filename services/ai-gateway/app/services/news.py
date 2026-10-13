"""国外新闻（可听）

数据源用 RSS，服务端抓取后解析并缓存，前端只拿结构化 JSON。
- 有音频的源（Breaking News English / NPR）直接播原声
- 没音频的源，用本项目已有的神经语音念摘要 —— 任何新闻都能「听」
"""
from __future__ import annotations

import html
import re
import time
import urllib.request
import xml.etree.ElementTree as ET
from typing import Optional

from loguru import logger

# 源列表。level 是给用户的难度提示。
SOURCES: dict[str, dict] = {
    'bne': {
        'name': 'Breaking News English',
        'desc': '专为英语学习者改写，语速慢、有音频',
        'level': 'B1',
        'flag': '🌍',
        'url': 'https://breakingnewsenglish.com/rss.xml',
    },
    'npr': {
        'name': 'NPR News',
        'desc': '美国国家公共电台，播音标准、有播客音频',
        'level': 'B2',
        'flag': '🇺🇸',
        'url': 'https://feeds.npr.org/1001/rss.xml',
    },
    'cnn': {
        'name': 'CNN World',
        'desc': '国际新闻，文字为主（用本站语音朗读）',
        'level': 'C1',
        'flag': '📺',
        'url': 'http://rss.cnn.com/rss/edition.rss',
    },
    'bbc': {
        'name': 'BBC World',
        'desc': '英式英语，国际新闻',
        'level': 'B2',
        'flag': '🇬🇧',
        'url': 'https://feeds.bbci.co.uk/news/world/rss.xml',
    },
}

_CACHE: dict[str, tuple[float, list[dict]]] = {}
_TTL = 1800            # 30 分钟
_MAX_ITEMS = 40
_TIMEOUT = 12


def _strip(s: str) -> str:
    if not s:
        return ''
    s = re.sub(r'<[^>]+>', ' ', s)
    s = html.unescape(s)
    s = re.sub(r'\s+', ' ', s)
    return s.strip()


def _text(el, tag: str) -> str:
    if el is None:
        return ''
    for child in el:
        # 忽略命名空间前缀
        if child.tag.split('}')[-1] == tag:
            return _strip(child.text or '')
    return ''


_AUDIO_EXT = ('.mp3', '.m4a', '.aac', '.ogg', '.wav', '.mp4')


def _find_audio(item) -> str:
    """从 RSS item 里找音频地址

    各家格式差别很大（enclosure / media:content / itunes:... / 自定义标签），
    所以先把整个 item 序列化回 XML，再正则扫一遍所有 URL —— 比逐个标签判断稳。
    """
    try:
        raw = ET.tostring(item, encoding='unicode')
    except Exception:
        raw = ''

    # 1) 任何以音频扩展名结尾的 URL（优先）
    for m in re.finditer(r'url=["\']([^"\']+)["\']', raw):
        url = m.group(1)
        base = url.lower().split('?')[0]
        if base.endswith(_AUDIO_EXT):
            return url

    # 2) NPR 这类把音频放在 link 里的（用 .mp3 出现在任意位置兜底）
    for m in re.finditer(r'(https?://[^"\'\s<>]+?\.mp3[^"\'\s<>]*)', raw):
        return m.group(1)

    return ''


def _image(item) -> str:
    for child in item:
        tag = child.tag.split('}')[-1]
        if tag in ('thumbnail', 'content', 'image'):
            url = child.attrib.get('url', '')
            if url:
                return url
    return ''


def fetch_source(key: str) -> list[dict]:
    """抓一个源（带缓存）"""
    conf = SOURCES.get(key)
    if not conf:
        return []

    now = time.time()
    hit = _CACHE.get(key)
    if hit and now - hit[0] < _TTL:
        return hit[1]

    items: list[dict] = []
    try:
        req = urllib.request.Request(
            conf['url'],
            headers={'User-Agent': 'Mozilla/5.0 (compatible; vocab-agent/1.0)'},
        )
        raw = urllib.request.urlopen(req, timeout=_TIMEOUT).read()
        root = ET.fromstring(raw)

        for it in root.iter():
            if it.tag.split('}')[-1] != 'item':
                continue
            title = _text(it, 'title')
            if not title:
                continue
            desc = _text(it, 'description') or _text(it, 'summary')
            link = _text(it, 'link')
            pub = _text(it, 'pubDate')
            audio = _find_audio(it)

            # 去掉摘要开头重复的日期（BNE 的格式：Oct 12, 2026. XXX）
            desc = re.sub(r'^[A-Z][a-z]{2}\s+\d{1,2},\s+\d{4}\.\s*', '', desc)

            items.append({
                'id': f'{key}:{abs(hash(title)) % 10**9}',
                'source': key,
                'sourceName': conf['name'],
                'flag': conf['flag'],
                'level': conf['level'],
                'title': title[:200],
                'summary': desc[:600],
                'link': link,
                'pubDate': pub,
                'audio': audio,
                'image': _image(it),
            })
            if len(items) >= _MAX_ITEMS:
                break

        _CACHE[key] = (now, items)
        logger.info(f'新闻源 {key} 抓取 {len(items)} 条')
    except Exception as e:
        logger.warning(f'新闻源 {key} 抓取失败: {type(e).__name__} {e}')
        # 失败时用旧缓存（过期也比没有好）
        if hit:
            return hit[1]

    return items


def list_items(source: str = '', limit: int = 60) -> dict:
    keys = [source] if source in SOURCES else list(SOURCES.keys())
    out: list[dict] = []
    for k in keys:
        out.extend(fetch_source(k))
    # 按发布时间粗排（解析失败的排后面）
    out.sort(key=lambda x: x.get('pubDate') or '', reverse=True)
    return {
        'items': out[:max(1, min(120, limit))],
        'total': len(out),
        'sources': [
            {'key': k, **{kk: vv for kk, vv in v.items() if kk != 'url'}}
            for k, v in SOURCES.items()
        ],
    }


def get_item(item_id: str) -> Optional[dict]:
    for it in list_items(limit=200)['items']:
        if it['id'] == item_id:
            return it
    return None


async def translate_news(text: str) -> dict:
    """把新闻标题/摘要译成中文，并挑出值得记的词

    复用拍照翻译那套 LLM 逻辑（同样的输出结构），省一份实现。
    """
    from app.services.ocr import translate_text

    return await translate_text(text[:1500])
