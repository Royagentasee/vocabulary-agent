"""Vocabulary Agent LLM SDK（Python 端）

与 TypeScript 端 (@vocab-agent/sdk-llm) 保持 API 对齐。
支持 DeepSeek / 智谱 GLM / OpenAI 等 OpenAI 兼容协议。
"""
from dataclasses import dataclass
from typing import Iterator, Literal, Optional

from openai import OpenAI

Provider = Literal["deepseek", "zhipu", "openai"]

DEFAULT_BASE_URL: dict[str, str] = {
    "deepseek": "https://api.deepseek.com/v1",
    "zhipu": "https://open.bigmodel.cn/api/paas/v4",
    "openai": "https://api.openai.com/v1",
}

DEFAULT_MODEL: dict[str, str] = {
    "deepseek": "deepseek-chat",
    "zhipu": "glm-4-plus",
    "openai": "gpt-4o-mini",
}


@dataclass
class ChatMessage:
    role: Literal["system", "user", "assistant"]
    content: str


@dataclass
class ChatOptions:
    temperature: float = 0.7
    max_tokens: int = 1024
    stream: bool = False


class LLMClient:
    """多模型 LLM 客户端统一封装。"""

    def __init__(
        self,
        provider: Provider,
        api_key: str,
        model: Optional[str] = None,
        base_url: Optional[str] = None,
    ) -> None:
        self.provider = provider
        self.model = model or DEFAULT_MODEL[provider]
        self.client = OpenAI(
            api_key=api_key,
            base_url=base_url or DEFAULT_BASE_URL[provider],
        )

    def chat(self, messages: list[ChatMessage], options: Optional[ChatOptions] = None) -> str:
        opts = options or ChatOptions()
        resp = self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": m.role, "content": m.content} for m in messages],
            temperature=opts.temperature,
            max_tokens=opts.max_tokens,
            stream=False,
        )
        return resp.choices[0].message.content or ""

    def stream(self, messages: list[ChatMessage], options: Optional[ChatOptions] = None) -> Iterator[str]:
        opts = options or ChatOptions()
        stream = self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": m.role, "content": m.content} for m in messages],
            temperature=opts.temperature,
            max_tokens=opts.max_tokens,
            stream=True,
        )
        for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta


def create_llm_client(provider: Provider, api_key: str, **kwargs) -> LLMClient:
    """工厂方法：与 TS 端 createLLMClient 对齐。"""
    return LLMClient(provider=provider, api_key=api_key, **kwargs)
