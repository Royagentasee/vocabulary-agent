"""Prometheus metrics 端点（可选依赖）"""
from fastapi import APIRouter, Response

router = APIRouter(tags=['metrics'])


@router.get('/metrics')
async def metrics():
    """Prometheus 抓取端点（如果 prometheus_client 未装，返回简单占位）"""
    try:
        from prometheus_client import CONTENT_TYPE_LATEST, generate_latest
        return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)
    except ImportError:
        # 降级：返回简单文本
        return Response(
            content="# prometheus_client not installed\n",
            media_type='text/plain',
        )