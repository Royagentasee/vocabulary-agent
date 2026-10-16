"""拍照翻译路由"""
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, Form

from app.core.deps import require_quota
from app.schemas.ocr import OcrResponse, TranslateRequest, TranslateResponse
from app.services import ocr

router = APIRouter(prefix="/api/ocr", tags=["ocr"])

MAX_BYTES = 12 * 1024 * 1024      # 12MB，手机原图也够
ALLOWED = {'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/bmp'}


@router.get("/langs")
async def get_langs() -> dict:
    """可识别的语言 + 可翻译的目标语言"""
    return {
        'languages': ocr.list_languages(),
        'targets': ocr.list_targets(),
    }


@router.get("/status")
async def ocr_status() -> dict:
    """OCR 是否可用（前端据此决定是否展示拍照入口）。"""
    return {'available': ocr.available(), 'engine': 'tesseract', 'lang': 'eng'}


@router.post("", response_model=OcrResponse)
async def post_ocr(file: UploadFile = File(...),
                   lang: str = Form('eng')) -> OcrResponse:
    """识别图片里的英文（不消耗 AI 额度，纯本地 OCR）。"""
    if not ocr.available():
        raise HTTPException(status_code=503, detail='服务端未安装 OCR 引擎')

    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail='图片为空')
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=413, detail='图片过大（上限 12MB）')

    ctype = (file.content_type or '').lower()
    if ctype and ctype not in ALLOWED:
        raise HTTPException(status_code=415, detail=f'不支持的图片格式：{ctype}')

    result = await __import__('asyncio').to_thread(ocr.recognize, data)
    return OcrResponse(**result)


@router.post("/translate", response_model=TranslateResponse,
             dependencies=[Depends(require_quota('photo'))])
async def post_translate(req: TranslateRequest) -> TranslateResponse:
    """把识别出的文本翻译成目标语言（这一步用 AI，计入额度）。"""
    text = (req.text or '').strip()
    if not text:
        raise HTTPException(status_code=400, detail='文本为空')
    if len(text) > 6000:
        text = text[:6000]

    result = await ocr.translate_text(text, target=req.target or 'zh',
                                      source=req.source or '')
    return TranslateResponse(**result)
