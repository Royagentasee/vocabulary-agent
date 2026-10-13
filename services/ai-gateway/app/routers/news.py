"""国外新闻路由"""
from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.deps import require_quota

from app.services import news

router = APIRouter(prefix="/api/news", tags=["news"])


@router.get("")
async def get_news(
    source: str = Query('', description='bne / npr / cnn / bbc，空=全部'),
    limit: int = Query(60, ge=1, le=120),
) -> dict:
    """新闻列表（服务端抓 RSS 并缓存 30 分钟）"""
    return news.list_items(source=source, limit=limit)


@router.get("/sources")
async def get_sources() -> dict:
    """新闻源列表"""
    return {
        'items': [
            {'key': k, **{kk: vv for kk, vv in v.items() if kk != 'url'}}
            for k, v in news.SOURCES.items()
        ]
    }


@router.get("/{item_id}")
async def get_item(item_id: str, _=Depends(require_quota('news'))) -> dict:
    """单条新闻"""
    it = news.get_item(item_id)
    if not it:
        raise HTTPException(status_code=404, detail='新闻不存在或已过期')
    return it
