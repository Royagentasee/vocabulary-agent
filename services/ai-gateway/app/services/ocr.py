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


def _run_tesseract(path: str, psm: int) -> tuple[str, float]:
    """跑 tesseract，返回 (文本, 平均置信度 0-100)"""
    proc = subprocess.run(
        ['tesseract', path, 'stdout', '-l', 'eng', '--psm', str(psm), 'tsv'],
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


def _clean(text: str) -> str:
    """清理 OCR 常见噪声"""
    t = text.replace('\r', '')
    t = re.sub(r'[ \t]+', ' ', t)
    # 修掉行首行尾散落的单字符
    t = re.sub(r'^\s*\W\s*$', '', t, flags=re.MULTILINE)
    # 合并连续空行
    t = re.sub(r'\n{3,}', '\n\n', t)
    # 常见误识别：l/1、O/0 在英文句子里的错位先不动，交给使用者判断
    return t.strip()


def recognize(data: bytes) -> dict:
    """识别图片中的英文，返回文本与质量信息"""
    path = ''
    try:
        path = _preprocess(data)
        # psm 6：把图当作一整块文本（拍书页最合适）
        text, conf = _run_tesseract(path, 6)
        # 结果太短就换 psm 3（自动版面分析），应对带图片/多栏的页面
        if len(text.split()) < 5:
            text2, conf2 = _run_tesseract(path, 3)
            if len(text2.split()) > len(text.split()):
                text, conf = text2, conf2
        text = _clean(text)
        words = len(re.findall(r"[A-Za-z][A-Za-z'-]*", text))
        return {
            'ok': bool(text),
            'text': text,
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

_TRANSLATE_SYSTEM = """你是英语翻译助手，为中国的英语学习者服务。

任务：把用户给的英文段落翻译成自然流畅的中文。

要求：
1. 保持原文的段落结构（段落之间用 \\n\\n 分隔）
2. 译文要通顺地道，不要逐字硬译
3. 人名、地名、专有名词保留英文，或用常见译名
4. 另外挑出 5-8 个值得学习的词或短语，给出中文释义

只输出 JSON（不要 markdown 代码块）：
{
  "translation": "中文翻译",
  "summary": "整段话的一句话大意",
  "vocabulary": [
    {"word": "英文单词或短语", "meaning": "中文释义"}
  ]
}
"""


async def translate_text(text: str) -> dict:
    """把英文翻译成中文（带生词提取）"""
    from app.core.config import get_settings
    from vocab_agent_llm import ChatMessage, ChatOptions, create_llm_client

    settings = get_settings()
    client = create_llm_client(provider=settings.llm_provider,
                               api_key=settings.deepseek_api_key)
    messages = [
        ChatMessage(role='system', content=_TRANSLATE_SYSTEM),
        ChatMessage(role='user', content=text[:6000]),
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
