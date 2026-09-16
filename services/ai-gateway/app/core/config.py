"""应用配置

统一读取环境变量，避免散落在各处。
"""
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # LLM
    llm_provider: str = "deepseek"
    deepseek_api_key: str = ""
    zhipu_api_key: str = ""
    openai_api_key: str = ""

    # 数据
    database_url: str = "postgres://vocab:vocab@localhost:5432/vocab_agent"
    redis_url: str = "redis://localhost:6379"

    # 业务
    llm_timeout_ms: int = 30000


@lru_cache
def get_settings() -> Settings:
    return Settings()
