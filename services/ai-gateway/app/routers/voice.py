"""语音路由（ASR + TTS + 发音评分）"""
from fastapi import APIRouter, HTTPException

from app.schemas.voice import (
    ASRRequest,
    ASRResponse,
    PronunciationRequest,
    PronunciationScore,
    TTSRequest,
    TTSResponse,
)
from app.services.voice import asr_recognize, pronunciation_score, tts_synthesize

router = APIRouter(prefix="/api/ai/voice", tags=["voice"])


@router.post("/asr", response_model=ASRResponse)
async def post_asr(req: ASRRequest) -> ASRResponse:
    """语音转文字。"""
    try:
        return await asr_recognize(req)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ASR 失败：{str(e)}")


@router.post("/tts", response_model=TTSResponse)
async def post_tts(req: TTSRequest) -> TTSResponse:
    """文字转语音。"""
    try:
        return await tts_synthesize(req)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS 失败：{str(e)}")


@router.post("/pronunciation", response_model=PronunciationScore)
async def post_pronunciation(req: PronunciationRequest) -> PronunciationScore:
    """发音评分。"""
    try:
        return await pronunciation_score(req)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"发音评分失败：{str(e)}")