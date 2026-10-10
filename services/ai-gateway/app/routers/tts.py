"""真人发音路由"""
from fastapi import APIRouter, HTTPException, Query, Response

from app.services import tts

router = APIRouter(prefix="/api/tts", tags=["tts"])


@router.get("/voices")
async def get_voices() -> dict:
    """可用音色列表。"""
    return {
        'items': tts.list_voices(),
        'default': tts.DEFAULT_VOICE,
        'available': True,
        'cache': tts.cache_stats(),
    }


@router.get("")
async def get_tts(
    text: str = Query(..., min_length=1, max_length=1200),
    voice: str = Query(tts.DEFAULT_VOICE),
) -> Response:
    """把文本合成为 mp3（结果带强缓存，同一个词只会真正合成一次）。"""
    audio = await tts.synthesize(text, voice)
    if not audio:
        raise HTTPException(status_code=503, detail='语音合成暂不可用')

    return Response(
        content=audio,
        media_type='audio/mpeg',
        headers={
            # 内容由哈希决定，内容不变 URL 就同一份，可以长期缓存
            'Cache-Control': 'public, max-age=2592000, immutable',
            'Content-Length': str(len(audio)),
        },
    )
