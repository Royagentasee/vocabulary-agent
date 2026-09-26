"""口语朗读路由"""
import asyncio

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.schemas.speaking import (
    SpeakingAssessRequest,
    SpeakingAssessResponse,
    SpeakingSentencesResponse,
    TranscribeResponse,
)
from app.services import stt
from app.services.speaking import SENTENCES, assess_speaking

router = APIRouter(prefix="/api/speaking", tags=["speaking"])

# 浏览器 MediaRecorder 常见格式（faster-whisper 通过 PyAV 解码）
_SUFFIX = {
    'audio/webm': '.webm',
    'audio/ogg': '.ogg',
    'audio/mp4': '.mp4',
    'audio/mpeg': '.mp3',
    'audio/wav': '.wav',
}


@router.get("/sentences", response_model=SpeakingSentencesResponse)
async def get_sentences() -> SpeakingSentencesResponse:
    """朗读练习句列表。"""
    return SpeakingSentencesResponse(items=SENTENCES, total=len(SENTENCES))


@router.get("/stt-status")
async def stt_status() -> dict:
    """语音识别可用状态（前端据此决定走服务端识别还是浏览器识别）。"""
    return {'available': stt.available(), 'engine': 'faster-whisper', 'model': stt.MODEL_SIZE}


@router.post("/transcribe", response_model=TranscribeResponse)
async def post_transcribe(file: UploadFile = File(...)) -> TranscribeResponse:
    """把浏览器录制的音频转成英文文本（服务端 Whisper，不依赖 Google，境内可用）。"""
    if not stt.available():
        raise HTTPException(status_code=503, detail='服务端语音识别未安装（faster-whisper）')

    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail='音频为空')
    if len(data) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail='音频过大（上限 10MB）')

    suffix = _SUFFIX.get((file.content_type or '').lower(), '.webm')
    text = await asyncio.to_thread(stt.transcribe, data, suffix)
    return TranscribeResponse(text=text, ok=bool(text))


@router.post("/assess", response_model=SpeakingAssessResponse)
async def post_assess(req: SpeakingAssessRequest) -> SpeakingAssessResponse:
    """评估用户朗读的发音。"""
    return await assess_speaking(req)
