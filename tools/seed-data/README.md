# Seed Data 工具

把 ECDICT 高频词 + 1 本官方词书（GRE 核心）导入到 PostgreSQL。

## 数据源
- **ECDICT**：开源英汉词典（GPL-3.0），github.com/skywind3000/ECDICT
  - 频率字段 `frq` 来自 BNC / COCA 语料库
- **官方词书（mock）**：`data/gre_core.json`，内置 49 个 GRE 高频词
- **真实词书**：后续接《GRE 核心词汇》《雅思真词汇》授权后替换

## 启动
```bash
# 1. 准备 ECDICT 数据
# 从 https://github.com/skywind3000/ECDICT/releases 下载 ecdict.csv
# 放到 data/ecdict.csv

# 2. 准备官方词书
# data/gre_core.json（已包含 mock）

# 3. 启动 PostgreSQL + pgvector
docker-compose up -d postgres

# 4. 初始化 schema + 导入
python -m tools.seed-data.seed
```

## 导入的表
- `words`：词条主表（headword / ipa / 释义 / 词根 / 考频）
- `word_embeddings`：词条向量（pgvector，用于 RAG 检索）
- `wordbooks`：词书
- `wordbook_words`：词书↔词条关联
