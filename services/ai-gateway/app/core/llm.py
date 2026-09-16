"""LLM 客户端工厂（单例）"""
from functools import lru_cache

from vocab_agent_llm import LLMClient, create_llm_client

from app.core.config import Settings, get_settings


@lru_cache
def get_llm_client(settings: Settings | None = None) -> LLMClient:
    s = settings or get_settings()
    provider = s.llm_provider
    api_key = {
        "deepseek": s.deepseek_api_key,
        "zhipu": s.zhipu_api_key,
        "openai": s.openai_api_key,
    }.get(provider, "")

    if not api_key:
        raise RuntimeError(f"LLM provider '{provider}' 未配置 API Key")

    return create_llm_client(provider=provider, api_key=api_key)  # type: ignore[arg-type]
