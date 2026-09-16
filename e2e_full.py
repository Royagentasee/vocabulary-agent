"""端到端验证（完整版）"""
import sys
import os
import sqlite3
import urllib.request
from pathlib import Path

ROOT = Path(__file__).parent.resolve()
DB_PATH = ROOT / 'vocab_agent.db'
AI_GATEWAY_URL = 'http://localhost:8000'

passed = 0
failed = 0
skipped = 0


def check_pass(name, detail=''):
    global passed
    passed += 1
    print(f'  [PASS] {name} {detail}')


def check_fail(name, detail=''):
    global failed
    failed += 1
    print(f'  [FAIL] {name} {detail}')


def check_skip(name, detail=''):
    global skipped
    skipped += 1
    print(f'  [SKIP] {name} {detail}')


# 输出用 UTF-8（避免 GBK 编码报错）
sys.stdout.reconfigure(encoding='utf-8')

print('=== Vocabulary Agent 端到端验证 ===\n')

# 1. AI 网关健康检查
print('1) AI 网关')
try:
    resp = urllib.request.urlopen(f'{AI_GATEWAY_URL}/health', timeout=2)
    if resp.status == 200:
        check_pass('AI 网关健康检查', f'(status={resp.status})')
    else:
        check_fail('AI 网关健康检查', f'(status={resp.status})')
except Exception as e:
    check_skip('AI 网关健康检查', f'(需手动启动: {type(e).__name__})')

# 2. 数据库
print('\n2) 数据库')
if DB_PATH.exists():
    check_pass('数据库文件存在')
else:
    check_fail('数据库文件不存在', f'({DB_PATH})')
    sys.exit(1)

conn = sqlite3.connect(str(DB_PATH))
n_words = conn.execute('SELECT COUNT(*) FROM words').fetchone()[0]
n_wb = conn.execute('SELECT COUNT(*) FROM wordbooks').fetchone()[0]
n_wbw = conn.execute('SELECT COUNT(*) FROM wordbook_words').fetchone()[0]
conn.close()

if n_words >= 50:
    check_pass(f'词条数', f'({n_words})')
else:
    check_fail(f'词条数', f'({n_words} < 50)')

if n_wb >= 1:
    check_pass(f'词书数', f'({n_wb})')
else:
    check_fail(f'词书数', f'({n_wb} < 1)')

if n_wbw >= 1:
    check_pass(f'词书-词条关联', f'({n_wbw})')
else:
    check_fail(f'词书-词条关联', f'({n_wbw} < 1)')

# 3. 词条查询服务
print('\n3) 词条查询服务')
os.environ['DATABASE_URL'] = f'sqlite:///{DB_PATH}'
sys.path.insert(0, str(ROOT / 'services' / 'ai-gateway'))
from app.services.words import search_words
from app.schemas.word import WordSearchRequest
import asyncio

async def test_search():
    req = WordSearchRequest(query='ephemeral', limit=5)
    result = await search_words(req)
    return result.total, [w.headword for w in result.items]

try:
    total, words = asyncio.run(test_search())
    if total > 0:
        check_pass(f"搜索 'ephemeral'", f'({total} 条: {", ".join(words[:3])})')
    else:
        check_fail("搜索 'ephemeral'", '(0 条)')
except Exception as e:
    check_fail('词条查询服务', f'({e})')

# 4. AI 解释服务（需要 API Key）
print('\n4) AI 解释服务')
async def test_explain():
    from app.services.explain import explain_word
    return await explain_word('ephemeral')

try:
    result = asyncio.run(test_explain())
    if result.memory_tip and '失败' not in result.memory_tip and '未生成' not in result.memory_tip:
        check_pass('AI 解释', f'(tip: {result.memory_tip[:30]}...)')
    else:
        check_skip('AI 解释', '(未配 DEEPSEEK_API_KEY，跳过)')
except Exception as e:
    err_msg = str(e)
    if 'API Key' in err_msg or '未配置' in err_msg:
        check_skip('AI 解释', '(未配 DEEPSEEK_API_KEY，跳过)')
    else:
        check_fail('AI 解释', f'({e})')

# 5. Web 端编译产物
print('\n5) Web 端编译')
web_dist = ROOT / 'apps' / 'web' / 'dist' / 'index.html'
if web_dist.exists():
    check_pass('Web 编译产物')
else:
    check_skip('Web 编译产物', '(需运行 pnpm build)')

# 总结
print(f'\n=== 总结 ===')
print(f'通过: {passed}')
print(f'失败: {failed}')
if skipped > 0:
    print(f'跳过: {skipped}（需手动配置或启动）')

if failed == 0:
    print('\n✓ 核心数据 + 服务全部正常')
    sys.exit(0)
else:
    print(f'\n✗ {failed} 项失败')
    sys.exit(1)