"""语音识别（服务端 Whisper）

为什么不用浏览器自带的 SpeechRecognition：
它把录音上传到 Google 的语音服务转写，而 Google 在中国大陆无法访问
（实测 speech.googleapis.com 超时），所以境内用户会「麦克风能用但识别不出文字」。

这里改为：浏览器只负责录音（MediaRecorder）→ 上传到本服务 → 服务端用
faster-whisper 本地推理转文字，不依赖任何境外服务。
"""
from __future__ import annotations

import os
import tempfile
import threading
from typing import Optional

from loguru import logger

MODEL_SIZE = os.getenv('WHISPER_MODEL', 'tiny')      # tiny / base / small
_MODEL_DIR = os.getenv('WHISPER_MODEL_DIR', '')       # 本地模型目录（离线部署用）

_model = None
_lock = threading.Lock()


def available() -> bool:
    try:
        import faster_whisper  # noqa: F401
        return True
    except Exception:
        return False


def _get_model():
    """懒加载模型（首次调用会下载/加载，之后常驻内存）"""
    global _model
    if _model is None:
        with _lock:
            if _model is None:
                from faster_whisper import WhisperModel
                src = _MODEL_DIR if _MODEL_DIR and os.path.isdir(_MODEL_DIR) else MODEL_SIZE
                logger.info(f'正在加载 Whisper 模型: {src} ...')
                _model = WhisperModel(src, device='cpu', compute_type='int8')
                logger.info('Whisper 模型加载完成')
    return _model


def transcribe(data: bytes, suffix: str = '.webm') -> str:
    """把音频字节流转成英文文本。失败返回空串（不抛异常，避免影响主流程）。"""
    if not data:
        return ''
    try:
        model = _get_model()
    except Exception as e:
        logger.warning(f'Whisper 不可用: {e}')
        return ''

    path = ''
    try:
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as f:
            f.write(data)
            path = f.name
        segments, _info = model.transcribe(
            path,
            language='en',
            beam_size=1,
            vad_filter=True,          # 过滤静音，短句更准
        )
        text = ' '.join(seg.text.strip() for seg in segments).strip()
        logger.info(f'STT: {len(data)} bytes -> "{text[:80]}"')
        return text
    except Exception as e:
        logger.warning(f'Whisper 转写失败: {e}')
        return ''
    finally:
        if path:
            try:
                os.unlink(path)
            except OSError:
                pass
