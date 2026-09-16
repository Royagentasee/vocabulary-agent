# AI Gateway 生产镜像
# build context 必须是仓库根目录（因为要 COPY packages/ 和 seed 数据）
FROM python:3.11-slim

WORKDIR /app

# 1. 复制本地 SDK
COPY packages/sdk-llm-py ./packages/sdk-llm-py
COPY packages/sdk-fsrs-py ./packages/sdk-fsrs-py

# 2. 复制种子数据
COPY tools/seed-data/data/top1000_offline.csv ./seed/words.csv

# 3. 安装运行时依赖
RUN pip install --no-cache-dir \
    fastapi>=0.110.0 \
    uvicorn[standard]>=0.30.0 \
    pydantic>=2.7.0 \
    pydantic-settings>=2.3.0 \
    openai>=1.30.0 \
    httpx>=0.27.0 \
    python-dotenv>=1.0.1 \
    loguru>=0.7.2 \
    redis>=5.0.0 \
    psycopg[binary]>=3.1.0 \
    prometheus-client>=0.20.0

# 4. 安装本地 SDK
RUN pip install --no-cache-dir ./packages/sdk-llm-py ./packages/sdk-fsrs-py

# 5. 复制应用代码
COPY services/ai-gateway/app ./app

# 6. 数据目录（SQLite）
RUN mkdir -p /data
ENV DATABASE_URL=sqlite:////data/vocab_agent.db

# 7. entrypoint
COPY services/ai-gateway/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/entrypoint.sh"]
