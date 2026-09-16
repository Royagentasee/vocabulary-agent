"""语音 Schema（ASR + TTS + 发音评分）"""
from __future__ import annotations

from pydantic import BaseModel, Field


class ASRRequest(BaseModel):
    """语音识别请求（base64 编码的音频 + 格式）"""
    audio_base64: str = Field(..., description="Base64 编码的音频数据")
    format: str = Field(default="pcm", description="音频格式：pcm / wav / mp3")
    sample_rate: int = Field(default=16000, description="采样率")
    language: str = Field(default="en-US", description="识别语言")


class ASRResponse(BaseModel):
    text: str
    confidence: float = Field(..., ge=0, le=1)


class TTSRequest(BaseModel):
    text: str = Field(..., max_length=1000)
    voice: str = Field(default="female_en", description="发音人")
    format: str = Field(default="mp3")
    sample_rate: int = Field(default=16000)


class TTSResponse(BaseModel):
    audio_base64: str
    audio_url: str | None = None
    format: str


class PronunciationRequest(BaseModel):
    """发音评分请求"""
    audio_base64: str
    reference_text: str
    format: str = "pcm"
    sample_rate: int = 16000
    language: str = "en-US"


class PronunciationScore(BaseModel):
    """发音评分"""
    overall: float = Field(..., ge=0, le=100)
    pronunciation: float
    fluency: float
    integrity: float
    phonemes: list[dict] = []  # 每个音素的得分
    words: list[dict] = []  # 每个词的得分