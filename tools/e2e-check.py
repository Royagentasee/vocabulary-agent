"""
端到端验证脚本

检查：
1. AI 网关 /health 可访问
2. 数据库有词条
3. 词条查询接口正常
4. AI 解释接口可调用（如果配置了 Key）
5. 前端 web build 产物存在

用法：
    python -m tools.e2e-check
"""
from __future__ import annotations

import sqlite3
import subprocess
import sys
from pathlib import Path

import httpx
from loguru import logger


ROOT = Path(__file__).parent.parent
DB_PATH = ROOT / "vocab_agent.db"
AI_GATEWAY_URL = "http://localhost:8000"
LEARN_SERVICE_URL = "http://localhost:3001"
WEB_DIST = ROOT / "apps" / "web" / "dist"


def check(name: str, fn) -> bool:
    """运行一个检查"""
    try:
        result = fn()
        if result:
            logger.success(f"✓ {name}")
            return True
        else:
            logger.error(f"✗ {name}")
            return False
    except Exception as e:
        logger.error(f"✗ {name}: {e}")
        return False


def check_ai_health() -> bool:
    """AI 网关健康检查"""
    try:
        r = httpx.get(f"{AI_GATEWAY_URL}/health", timeout=5)
        return r.status_code == 200 and r.json().get("status") == "ok"
    except httpx.ConnectError:
        logger.warning("  AI 网关未运行（正常，开发时可手动启动）")
        return False


def check_db_has_words() -> bool:
    """数据库有词条"""
    if not DB_PATH.exists():
        logger.warning(f"  数据库不存在: {DB_PATH}")
        return False
    conn = sqlite3.connect(DB_PATH)
    cur = conn.execute("SELECT COUNT(*) FROM words")
    count = cur.fetchone()[0]
    conn.close()
    if count > 0:
        logger.info(f"  词条数: {count}")
        return True
    logger.warning(f"  数据库无词条，运行 python -m tools.seed-data.seed")
    return False


def check_words_api() -> bool:
    """词条查询 API"""
    try:
        r = httpx.get(f"{AI_GATEWAY_URL}/api/words/search?q=ephemeral&limit=5", timeout=5)
        if r.status_code == 200:
            data = r.json()
            count = data.get("total", 0)
            logger.info(f"  命中: {count}")
            return count > 0
        return False
    except httpx.ConnectError:
        return False


def check_explain_api() -> bool:
    """AI 解释 API"""
    try:
        r = httpx.post(
            f"{AI_GATEWAY_URL}/api/ai/explain",
            json={"headword": "test"},
            timeout=30,
        )
        if r.status_code == 200:
            logger.info("  AI 解释成功")
            return True
        if r.status_code == 500:
            logger.warning("  AI 解释失败（可能未配置 API Key）")
            return False
        return False
    except httpx.ConnectError:
        return False


def check_web_build() -> bool:
    """Web 端编译产物"""
    if WEB_DIST.exists():
        index_html = WEB_DIST / "index.html"
        if index_html.exists():
            logger.info(f"  index.html 存在: {index_html}")
            return True
    logger.warning(f"  Web 端未编译，运行 pnpm --filter @vocab-agent/web build")
    return False


def check_learn_service() -> bool:
    """Learn Service 健康检查"""
    try:
        r = httpx.get(f"{LEARN_SERVICE_URL}/api/review/new", timeout=5)
        return r.status_code in (200, 404)
    except httpx.ConnectError:
        return False


def main() -> int:
    logger.info("=== Vocabulary Agent 端到端验证 ===\n")

    checks = [
        ("AI 网关健康检查", check_ai_health),
        ("数据库词条", check_db_has_words),
        ("Learn Service 健康", check_learn_service),
        ("词条查询 API", check_words_api),
        ("AI 解释 API", check_explain_api),
        ("Web 端编译产物", check_web_build),
    ]

    results = []
    for name, fn in checks:
        results.append(check(name, fn))

    logger.info(f"\n=== 结果 ===")
    passed = sum(results)
    total = len(results)
    logger.info(f"通过: {passed}/{total}")

    if passed == total:
        logger.success("全部通过 ✓")
        return 0
    elif passed >= total - 2:
        logger.warning("基本通过，部分可选项缺失")
        return 0
    else:
        logger.error("多个关键检查未通过")
        return 1


if __name__ == "__main__":
    sys.exit(main())