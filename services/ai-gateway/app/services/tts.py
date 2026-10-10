"""神经网络语音合成（真人发音）

用 Microsoft Edge 的在线神经语音（edge-tts，免费），比浏览器自带的
speechSynthesis 自然得多。生成结果按内容哈希缓存到磁盘，同一个词/句子
只会真正合成一次，之后直接读文件。
"""
from __future__ import annotations

import asyncio
import hashlib
import os
from pathlib import Path
from typing import Optional

from loguru import logger

CACHE_DIR = Path('/home/ubuntu/vocab-agent/data/tts')
MAX_TEXT = 1200          # 单次合成上限，防止被当成免费 TTS 接口刷
_RATE = '-8%'            # 稍慢一点，单词听得更清楚

# 可选音色（前端只暴露这几个，其余不开放以免被滥用）
VOICES: dict[str, dict] = {
    'us-f': {'id': 'en-US-AriaNeural', 'label': '美音 · 女', 'flag': '🇺🇸'},
    'us-m': {'id': 'en-US-GuyNeural', 'label': '美音 · 男', 'flag': '🇺🇸'},
    'uk-f': {'id': 'en-GB-SoniaNeural', 'label': '英音 · 女', 'flag': '🇬🇧'},
    'uk-m': {'id': 'en-GB-RyanNeural', 'label': '英音 · 男', 'flag': '🇬🇧'},
    'au-f': {'id': 'en-AU-NatashaNeural', 'label': '澳音 · 女', 'flag': '🇦🇺'},
}
DEFAULT_VOICE = 'us-f'

_locks: dict[str, asyncio.Lock] = {}


def voice_id(key: str) -> str:
    return VOICES.get(key, VOICES[DEFAULT_VOICE])['id']


def list_voices() -> list[dict]:
    return [{'key': k, **v} for k, v in VOICES.items()]


def _cache_path(text: str, voice: str) -> Path:
    h = hashlib.sha256(f'{voice}\x00{text}'.encode()).hexdigest()[:40]
    return CACHE_DIR / f'{h}.mp3'


async def synthesize(text: str, voice_key: str = DEFAULT_VOICE) -> Optional[bytes]:
    """合成语音，返回 mp3 字节；失败返回 None（前端会退回浏览器 TTS）"""
    text = (text or '').strip()
    if not text:
        return None
    if len(text) > MAX_TEXT:
        text = text[:MAX_TEXT]

    vid = voice_id(voice_key)
    path = _cache_path(text, vid)

    # 命中缓存
    if path.exists() and path.stat().st_size > 0:
        try:
            return path.read_bytes()
        except Exception as e:
            logger.warning(f'读 TTS 缓存失败 {path.name}: {e}')

    # 同一段文本并发请求时只合成一次
    key = path.name
    lock = _locks.setdefault(key, asyncio.Lock())
    async with lock:
        if path.exists() and path.stat().st_size > 0:
            return path.read_bytes()

        try:
            import edge_tts
        except ImportError:
            logger.warning('edge-tts 未安装，跳过服务端 TTS')
            return None

        try:
            CACHE_DIR.mkdir(parents=True, exist_ok=True)
            tmp = path.with_suffix('.part')
            comm = edge_tts.Communicate(text, vid, rate=_RATE)
            await comm.save(str(tmp))
            if not tmp.exists() or tmp.stat().st_size == 0:
                return None
            os.replace(tmp, path)
            logger.info(f'TTS 合成 {path.name} ({path.stat().st_size} 字节) {text[:24]!r}')
            return path.read_bytes()
        except Exception as e:
            logger.warning(f'TTS 合成失败 {text[:24]!r}: {e}')
            return None
        finally:
            _locks.pop(key, None)


def cache_stats() -> dict:
    try:
        files = list(CACHE_DIR.glob('*.mp3'))
        return {'files': len(files), 'bytes': sum(f.stat().st_size for f in files)}
    except Exception:
        return {'files': 0, 'bytes': 0}
