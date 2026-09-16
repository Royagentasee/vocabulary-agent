# @vocab-agent/ai-gateway

AI 网关：Python + FastAPI，封装 LLM 调用、RAG 检索、语音 ASR/TTS。

## 启动
```bash
# 1. 准备环境
cp .env.example .env
# 填入 DEEPSEEK_API_KEY

# 2. 安装依赖
pip install -r requirements.txt

# 3. 启动
uvicorn app.main:app --reload --port 8000
```

## 已实现的接口

### POST /api/ai/explain
请求：
```json
{ "headword": "ephemeral", "context": "in IELTS reading" }
```
响应：
```json
{
  "headword": "ephemeral",
  "ipa": "/ɪˈfem.ər.əl/",
  "pos": ["adj"],
  "etymology": "希腊语 ephemeros（只生存一天）",
  "senses": [{ "pos": "adj", "definition_en": "lasting for a very short time", "definition_cn": "短暂的" }],
  "examples": [{ "sentence": "...", "translation": "...", "source": "Cambridge IELTS 14" }],
  "collocations": ["ephemeral pleasure", "ephemeral fame"],
  "difficulty": "medium",
  "memory_tip": "EF(em) + HE + MER(mer)al：马云说他（MER）的钱花光（EF），财富短暂",
  "cached": false
}
```

### GET /health
健康检查。

## 目录
```
app/
├── main.py             # FastAPI 入口
├── routers/            # 路由（explain / dialogue / recite）
├── services/           # LLM / RAG / 语音服务封装
├── prompts/            # Prompt 模板（版本管理）
├── schemas/            # Pydantic 数据模型
└── core/               # 配置 / LLM 工厂 / 鉴权
```
