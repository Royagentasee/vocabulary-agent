"""写作助手 Schema"""
from __future__ import annotations

from pydantic import BaseModel, Field


class WritingRequest(BaseModel):
    topic: str = Field(..., min_length=1, max_length=200, description="写作主题")
    words: list[str] = Field(default=[], description="要求用到的单词")
    style: str = Field(default="academic", description="写作风格：academic/essay/daily/business")
    length: int = Field(default=150, ge=50, le=800, description="目标字数")
    instruction: str = Field(default="", max_length=2000, description="官方真题的写作指令（有则按真题范文模式生成）")
    task_label: str = Field(default="", max_length=80, description="任务类型标签，如 Analyze an Issue")


class WritingResponse(BaseModel):
    topic: str
    title: str = ""
    content: str = ""
    used_words: list[str] = []  # 实际用到的词
    is_mock: bool = False


# ============ 写作真题库 ============

class WritingPrompt(BaseModel):
    id: str
    exam: str = 'GRE'
    taskType: str = 'issue'
    taskLabel: str = ''
    prompt: str
    instruction: str
    source: str = ''
    sourceUrl: str = ''


class WritingPromptResponse(BaseModel):
    items: list[WritingPrompt]
    total: int
    exam: str = 'GRE'
    source: str = ''


class WritingPromptStats(BaseModel):
    total: int
    byType: dict[str, int] = {}
    source: str = ''
