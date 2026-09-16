"""Pydantic schema，与 shared types 保持一致。"""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class Sense(BaseModel):
    pos: str
    definition_en: str
    definition_cn: str


class Example(BaseModel):
    sentence: str
    translation: str
    source: str | None = None


class ExplainRequest(BaseModel):
    headword: str = Field(..., min_length=1, max_length=64)
    context: str | None = None


class RootAffix(BaseModel):
    """词根词缀拆解

    Python 侧沿用下划线命名（内部数据源就是这么存的），
    但对外 JSON 用驼峰，与前端 @vocab-agent/types 保持一致。
    """
    model_config = ConfigDict(populate_by_name=True)

    prefix: str = ""
    prefix_meaning: str = Field(default="", alias="prefixMeaning")
    root: str = ""
    root_meaning: str = Field(default="", alias="rootMeaning")
    suffix: str = ""
    suffix_meaning: str = Field(default="", alias="suffixMeaning")


class ExplainResponse(BaseModel):
    headword: str
    ipa: str = ""
    pos: list[str] = []
    etymology: str = ""
    root_affix: RootAffix | None = None
    senses: list[Sense] = []
    examples: list[Example] = []
    collocations: list[str] = []
    difficulty: Literal["easy", "medium", "hard"] = "medium"
    memory_tip: str = ""
    cached: bool = False
