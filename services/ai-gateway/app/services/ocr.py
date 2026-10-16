"""图片文字识别（拍照翻译）

用 **tesseract 本地识别**，不依赖任何云服务：
- 境内可用、免费、图片不出服务器（隐私友好）
- 针对手机拍书页做了预处理：EXIF 转正 → 灰度 → 自动对比度 → 缩放
- 输出按行还原，并给出平均置信度

翻译部分交给 DeepSeek（只发识别出的文本，不发图片）。
"""
from __future__ import annotations

import asyncio
import os
import re
import subprocess
import tempfile
from typing import Optional

from loguru import logger

MAX_SIDE = 2200          # 长边超过就缩小，兼顾速度与精度
MIN_SIDE = 900           # 太小就放大一点，tesseract 对小字把握差

# 支持的语言（tesseract 代码 → 展示信息）
# 服务端已安装的语言包见 LANG_PACKS；未安装的会被 _safe_lang 过滤掉
LANGUAGES: dict[str, dict] = {
    'eng':      {'name': '英语', 'flag': '🇬🇧', 'cjk': False},
    'chi_sim':  {'name': '简体中文', 'flag': '🇨🇳', 'cjk': True},
    'chi_tra':  {'name': '繁体中文', 'flag': '🇭🇰', 'cjk': True},
    'jpn':      {'name': '日语', 'flag': '🇯🇵', 'cjk': True},
    'kor':      {'name': '韩语', 'flag': '🇰🇷', 'cjk': True},
    'fra':      {'name': '法语', 'flag': '🇫🇷', 'cjk': False},
    'deu':      {'name': '德语', 'flag': '🇩🇪', 'cjk': False},
    'spa':      {'name': '西班牙语', 'flag': '🇪🇸', 'cjk': False},
    'rus':      {'name': '俄语', 'flag': '🇷🇺', 'cjk': False},
    'por':      {'name': '葡萄牙语', 'flag': '🇵🇹', 'cjk': False},
    'ita':      {'name': '意大利语', 'flag': '🇮🇹', 'cjk': False},
    'ara':      {'name': '阿拉伯语', 'flag': '🇸🇦', 'cjk': False},
    'tha':      {'name': '泰语', 'flag': '🇹🇭', 'cjk': False},
    'vie':      {'name': '越南语', 'flag': '🇻🇳', 'cjk': False},
    'hin':      {'name': '印地语', 'flag': '🇮🇳', 'cjk': False},
}

# 翻译目标语言
TARGETS: dict[str, str] = {
    'zh': '中文',
    'en': 'English',
    'ja': '日本語',
    'ko': '한국어',
    'fr': 'Français',
    'de': 'Deutsch',
    'es': 'Español',
    'ru': 'Русский',
}


def _is_cjk(lang: str) -> bool:
    """语言里是否含 CJK（决定断词与清洗策略）"""
    for part in (lang or '').split('+'):
        if LANGUAGES.get(part, {}).get('cjk'):
            return True
    return False


def _safe_lang(lang: str) -> str:
    """过滤成服务端真正装了的语言，避免 tesseract 报错"""
    packs = _installed()
    parts = [p for p in (lang or '').split('+') if p in LANGUAGES and (not packs or p in packs)]
    return '+'.join(parts) if parts else 'eng'


_installed_cache: Optional[set[str]] = None


def _installed() -> set[str]:
    """已安装的 tesseract 语言包（缓存）"""
    global _installed_cache
    if _installed_cache is not None:
        return _installed_cache
    try:
        p = subprocess.run(['tesseract', '--list-langs'],
                           capture_output=True, timeout=15)
        out = p.stdout.decode('utf-8', 'replace')
        langs = {l.strip() for l in out.splitlines()[1:] if l.strip()}
        _installed_cache = langs
    except Exception:
        _installed_cache = set()
    return _installed_cache


def list_languages() -> list[dict]:
    """返回服务端真正可用的语言"""
    packs = _installed()
    return [
        {'code': k, **v}
        for k, v in LANGUAGES.items()
        if not packs or k in packs
    ]


def list_targets() -> list[dict]:
    return [{'code': k, 'name': v} for k, v in TARGETS.items()]



def available() -> bool:
    try:
        subprocess.run(['tesseract', '--version'], capture_output=True, timeout=10)
        return True
    except Exception:
        return False


def _preprocess(data: bytes) -> str:
    """把上传的图片处理成适合 OCR 的 PNG，返回临时文件路径"""
    from PIL import Image, ImageOps

    with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as f:
        out = f.name

    img = Image.open(__import__('io').BytesIO(data))
    img = ImageOps.exif_transpose(img)          # 手机竖拍常带旋转信息
    img = img.convert('L')                       # 灰度
    img = ImageOps.autocontrast(img, cutoff=1)   # 自动对比度，去掉灰底

    w, h = img.size
    long_side = max(w, h)
    if long_side > MAX_SIDE:
        scale = MAX_SIDE / long_side
        img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
    elif long_side < MIN_SIDE:
        scale = MIN_SIDE / long_side
        img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)

    img.save(out, 'PNG', optimize=True)
    return out


def _run_tesseract(path: str, psm: int, lang: str = 'eng') -> tuple[str, float]:
    """跑 tesseract，返回 (文本, 平均置信度 0-100)

    lang 支持组合，如 'eng+chi_sim'（中英混排时识别更准）。
    """
    proc = subprocess.run(
        ['tesseract', path, 'stdout', '-l', lang, '--psm', str(psm), 'tsv'],
        capture_output=True, timeout=90,
    )
    raw = proc.stdout.decode('utf-8', errors='replace')

    lines: dict[tuple, list[str]] = {}
    confs: list[float] = []
    for row in raw.splitlines()[1:]:
        parts = row.split('\t')
        if len(parts) < 12:
            continue
        try:
            level = int(parts[0])
            conf = float(parts[10])
        except ValueError:
            continue
        word = parts[11].strip()
        if level != 5 or not word:
            continue
        key = (parts[1], parts[2], parts[3], parts[4])   # page block par line
        lines.setdefault(key, []).append(word)
        if conf > 0:
            confs.append(conf)

    ordered = [' '.join(v) for k, v in sorted(lines.items())]
    text = '\n'.join(ordered)
    mean_conf = round(sum(confs) / len(confs), 1) if confs else 0.0
    return text, mean_conf


def _clean(text: str, lang: str = 'eng') -> str:
    """清理 OCR 常见噪声

    CJK 文本不能按空格合并（会毁掉版式），也不能删掉单字符行。
    """
    t = text.replace('\r', '')
    if _is_cjk(lang):
        # 中文/日文里空格多是误识别，去掉行内多余空格但不合并字符
        t = re.sub(r'(?<=[\u4e00-\u9fff\u3040-\u30ff])\s+(?=[\u4e00-\u9fff\u3040-\u30ff])', '', t)
        t = re.sub(r'[ \t]{2,}', ' ', t)
    else:
        t = re.sub(r'[ \t]+', ' ', t)
        # 修掉行首行尾散落的单字符（英文 OCR 常见噪声）
        t = re.sub(r'^\s*\W\s*$', '', t, flags=re.MULTILINE)
    # 合并连续空行
    t = re.sub(r'\n{3,}', '\n\n', t)
    return t.strip()


def recognize(data: bytes, lang: str = 'eng') -> dict:
    """识别图片中的文字，返回文本与质量信息

    lang 是 tesseract 的语言代码，支持组合（如 'eng+chi_sim'）。
    """
    lang = _safe_lang(lang)
    path = ''
    try:
        path = _preprocess(data)
        # psm 6：把图当作一整块文本（拍书页最合适）
        text, conf = _run_tesseract(path, 6, lang)
        # 结果太短就换 psm 3（自动版面分析），应对带图片/多栏的页面
        if len(text.split()) < 5:
            text2, conf2 = _run_tesseract(path, 3, lang)
            if len(text2.split()) > len(text.split()):
                text, conf = text2, conf2
        text = _clean(text, lang)
        # 词数统计：CJK 按字算，其他按词算
        if _is_cjk(lang):
            words = len(re.findall(r'[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]', text))
        else:
            words = len(re.findall(r"[^\s\d\W]+", text, re.UNICODE))
        return {
            'ok': bool(text),
            'text': text,
            'lang': lang,
            'wordCount': words,
            'lineCount': len([l for l in text.split('\n') if l.strip()]),
            'confidence': conf,
            'quality': 'good' if conf >= 80 else ('fair' if conf >= 60 else 'poor'),
        }
    except subprocess.TimeoutExpired:
        logger.warning('OCR 超时')
        return {'ok': False, 'text': '', 'wordCount': 0, 'lineCount': 0,
                'confidence': 0.0, 'quality': 'poor'}
    except Exception as e:
        logger.warning(f'OCR 失败: {e}')
        return {'ok': False, 'text': '', 'wordCount': 0, 'lineCount': 0,
                'confidence': 0.0, 'quality': 'poor'}
    finally:
        if path:
            try:
                os.unlink(path)
            except OSError:
                pass


# ---------------- 翻译（AI） ----------------

_TRANSLATE_SYSTEM = """你是多语言翻译助手，为语言学习者服务。

任务：把用户给的文本翻译成指定的目标语言。

要求：
1. 保持原文的段落结构（段落之间用 \\n\\n 分隔）
2. 译文要通顺地道，不要逐字硬译
3. 人名、地名、专有名词保留原文，或用目标语言的常见译名
4. 如果原文不是目标语言，另外挑出 5-8 个值得学习的词或短语，
   给出目标语言释义；如果原文已经是目标语言，vocabulary 给空数组
5. summary 用目标语言写一句话大意

只输出 JSON（不要 markdown 代码块）：
{
  "translation": "译文",
  "summary": "一句话大意",
  "vocabulary": [
    {"word": "原文里的词或短语", "meaning": "目标语言释义"}
  ]
}
"""


async def translate_text(text: str, target: str = 'zh',
                         source: str = '') -> dict:
    """把文本翻译成目标语言（默认中文），并提取生词

    target / source 用短代码：zh / en / ja / ko / fr / de / es / ru
    """
    from app.core.config import get_settings
    from vocab_agent_llm import ChatMessage, ChatOptions, create_llm_client

    tgt_name = TARGETS.get(target, '中文')
    src_hint = ''
    if source and source in LANGUAGES:
        src_hint = f'\n原文语言：{LANGUAGES[source]["name"]}。'
    prompt = f'目标语言：{tgt_name}。{src_hint}\n\n原文：\n{text[:6000]}'

    settings = get_settings()
    client = create_llm_client(provider=settings.llm_provider,
                               api_key=settings.deepseek_api_key)
    messages = [
        ChatMessage(role='system', content=_TRANSLATE_SYSTEM),
        ChatMessage(role='user', content=prompt),
    ]

    def _call() -> str:
        return client.chat(messages, ChatOptions(temperature=0.3, max_tokens=3000))

    raw = await asyncio.get_event_loop().run_in_executor(None, _call)

    import json
    c = raw.strip()
    if c.startswith('```'):
        c = c.strip('`')
        if '\n' in c:
            c = c.split('\n', 1)[1]
        if c.endswith('```'):
            c = c[:-3]
    try:
        d = json.loads(c)
    except Exception as e:
        logger.warning(f'翻译结果解析失败: {e}')
        return {'translation': raw.strip(), 'summary': '', 'vocabulary': []}

    return {
        'translation': (d.get('translation') or '').strip(),
        'summary': (d.get('summary') or '').strip(),
        'vocabulary': d.get('vocabulary') or [],
    }
