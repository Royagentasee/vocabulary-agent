"""
AI Gateway 入口
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import (
    explain, analyze, dialogue, voice, words, quiz,
    writing, writing_bank, reading, reading_bank,
)
from app.middleware.rate_limit import RateLimitMiddleware

app = FastAPI(
    title="Vocabulary Agent AI Gateway",
    description="LLM / RAG / 语音 / 词条检索统一入口",
    version="0.5.0",
)

# 注意中间件顺序：最后添加的最先执行
app.add_middleware(RateLimitMiddleware)  # 限流
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "service": "ai-gateway"}


# 路由
app.include_router(explain.router)
app.include_router(analyze.router)
app.include_router(dialogue.router)
app.include_router(voice.router)
app.include_router(words.router)
app.include_router(quiz.router)
app.include_router(writing.router)
app.include_router(writing_bank.router)
app.include_router(reading.router)
app.include_router(reading_bank.router)

# metrics 路由（可选依赖）
try:
    from app.routers import metrics
    app.include_router(metrics.router)
except ImportError as e:
    print(f"Warning: metrics router not loaded: {e}")