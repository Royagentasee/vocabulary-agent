"""
环境配置检查 + 修复工具

检查项：
1. AI 网关 .env 是否存在
2. 必要字段是否填写
3. Key 格式是否正确（DeepSeek sk- 前缀）
4. 默认值是否有安全风险

用法：
    python -m tools.env-check
    python -m tools.env-check --fix   # 自动修复（填占位符 / 生成新 Secret）
"""
from __future__ import annotations

import argparse
import os
import secrets
import sys
from pathlib import Path

from loguru import logger


ENV_FILE = Path(__file__).parent.parent / "services" / "ai-gateway" / ".env"
EXAMPLE_FILE = Path(__file__).parent.parent / "services" / "ai-gateway" / ".env.example"

REQUIRED_KEYS = {
    'LLM_PROVIDER': ('deepseek', str),
    'DEEPSEEK_API_KEY': ('', str),
    'DATABASE_URL': ('sqlite:///./vocab_agent.db', str),
    'REDIS_URL': ('', str),
}

SECRET_KEYS = ['JWT_SECRET', 'DEEPSEEK_API_KEY', 'REDIS_PASSWORD']


def load_env() -> dict[str, str]:
    """读取 .env 文件为 dict"""
    env = {}
    if not ENV_FILE.exists():
        return env
    with ENV_FILE.open(encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#') or '=' not in line:
                continue
            k, _, v = line.partition('=')
            env[k.strip()] = v.strip()
    return env


def check() -> tuple[bool, list[str]]:
    """检查配置，返回 (pass, issues)"""
    issues = []

    if not ENV_FILE.exists():
        issues.append(f'.env 文件不存在: {ENV_FILE}')
        if EXAMPLE_FILE.exists():
            issues.append(f'  → 已找到 .env.example，执行 python -m tools.env-check --fix 可自动创建')
        return False, issues

    env = load_env()

    # 必填字段
    for key, (default, _) in REQUIRED_KEYS.items():
        if key not in env or not env[key]:
            issues.append(f'缺少字段: {key}')

    # Key 格式
    if 'DEEPSEEK_API_KEY' in env and env['DEEPSEEK_API_KEY']:
        key = env['DEEPSEEK_API_KEY']
        if 'sk-' not in key:
            issues.append(f'DEEPSEEK_API_KEY 格式异常，应以 sk- 开头')
        if 'your-' in key.lower() or key == 'sk-your-deepseek-key':
            issues.append(f'DEEPSEEK_API_KEY 是占位符，请填入真实 Key')

    # Secret 安全
    if env.get('JWT_SECRET', '').startswith('please-change'):
        issues.append('JWT_SECRET 是默认值，生产环境必须改')

    # 数据库连通性（仅做格式检查）
    db_url = env.get('DATABASE_URL', '')
    if db_url and not (db_url.startswith('postgres://') or db_url.startswith('sqlite://')):
        issues.append(f'DATABASE_URL 格式异常: {db_url}')

    return len(issues) == 0, issues


def fix() -> bool:
    """自动修复：复制 example + 生成新 JWT Secret"""
    if not EXAMPLE_FILE.exists():
        logger.error(f'.env.example 不存在: {EXAMPLE_FILE}')
        return False

    # 复制 example
    if not ENV_FILE.exists():
        ENV_FILE.write_text(EXAMPLE_FILE.read_text(encoding='utf-8'), encoding='utf-8')
        logger.success(f'创建 .env from .env.example')
    else:
        logger.info(f'.env 已存在')

    env = load_env()

    # 生成新 JWT Secret（如果还是占位符）
    if env.get('JWT_SECRET', '').startswith('please-change'):
        new_secret = secrets.token_hex(32)
        replace_in_env('JWT_SECRET', new_secret)
        logger.success(f'生成新 JWT_SECRET')

    return True


def replace_in_env(key: str, value: str) -> None:
    """替换 .env 中的某个 key 的值"""
    lines = ENV_FILE.read_text(encoding='utf-8').splitlines()
    new_lines = []
    replaced = False
    for line in lines:
        if line.strip().startswith(f'{key}='):
            new_lines.append(f'{key}={value}')
            replaced = True
        else:
            new_lines.append(line)
    if not replaced:
        new_lines.append(f'{key}={value}')
    ENV_FILE.write_text('\n'.join(new_lines) + '\n', encoding='utf-8')


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--fix', action='store_true', help='自动修复（生成 .env / JWT Secret）')
    args = parser.parse_args()

    if args.fix:
        if fix():
            logger.success('自动修复完成')
        else:
            return 1

    logger.info('检查 AI Gateway .env 配置...')
    pass_, issues = check()

    if pass_:
        logger.success('✓ 配置检查通过')
        print()
        print('可以启动 AI 网关：')
        print('  cd services/ai-gateway && python -m uvicorn app.main:app --reload --port 8000')
        return 0
    else:
        logger.error('✗ 配置有问题：')
        for issue in issues:
            print(f'  - {issue}')
        return 1


if __name__ == '__main__':
    sys.exit(main())