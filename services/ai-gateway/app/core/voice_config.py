"""语音服务配置"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class VoiceSettings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Aliyun 智能语音
    aliyun_ak_id: str = ""
    aliyun_ak_secret: str = ""
    aliyun_app_key: str = ""

    # 讯飞
    xunfei_app_id: str = ""
    xunfei_api_key: str = ""
    xunfei_api_secret: str = ""

    voice_provider: str = "aliyun"  # aliyun / xunfei


_voice_settings = None


def get_voice_settings():
    global _voice_settings
    if _voice_settings is None:
        _voice_settings = VoiceSettings()
    return _voice_settings