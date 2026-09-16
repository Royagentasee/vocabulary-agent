"""修复 pip 安装 + 重启服务"""
import os
import paramiko
import sys
import time

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

HOST = 'agents.earthledger.com'
USER = 'ubuntu'
PASSWORD = os.environ.get('VOCAB_SSH_PASSWORD', '')
REMOTE_DIR = '/home/ubuntu/vocab-agent'

def exec_cmd(client, cmd, timeout=400):
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    rc = stdout.channel.recv_exit_status()
    return rc, out, err

def log(msg):
    print(msg, flush=True)

def main():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASSWORD, timeout=20)
    log('[OK] 已连接\n')

    # 1. 安装主依赖（用 sudo bash -c 支持 cd）
    log('=== 安装 Python 主依赖 ===')
    pip_cmd = (
        f"cd {REMOTE_DIR} && pip3 install --break-system-packages "
        'fastapi "uvicorn[standard]" pydantic pydantic-settings openai httpx '
        'python-dotenv loguru redis "psycopg[binary]" prometheus-client'
    )
    rc, out, err = exec_cmd(client, f"echo '{PASSWORD}' | sudo -S bash -c '{pip_cmd}'", timeout=400)
    log(f'  主依赖: rc={rc}')
    if rc != 0:
        log(f'    err: {err[:400]}')

    # 2. 安装 SDK
    log('\n=== 安装 SDK ===')
    sdk_cmd = (
        f"cd {REMOTE_DIR} && pip3 install --break-system-packages "
        "./packages/sdk-llm-py ./packages/sdk-fsrs-py"
    )
    rc, out, err = exec_cmd(client, f"echo '{PASSWORD}' | sudo -S bash -c '{sdk_cmd}'", timeout=300)
    log(f'  SDK: rc={rc}')
    if rc != 0:
        log(f'    err: {err[:400]}')

    # 3. 验证 uvicorn 装好
    log('\n=== 验证 uvicorn ===')
    rc, out, err = exec_cmd(client, 'which uvicorn || pip3 show uvicorn 2>/dev/null | head -3')
    log(f'  uvicorn: {out.strip()[:200]}')

    # 4. 重启 AI 网关
    log('\n=== 重启 AI 网关 ===')
    rc, out, err = exec_cmd(client, f"echo '{PASSWORD}' | sudo -S systemctl restart vocab-agent", timeout=60)
    log(f'  restart: rc={rc}')
    time.sleep(3)

    # 5. 看服务状态 + 日志
    log('\n=== 服务状态 ===')
    rc, out, err = exec_cmd(client, f"echo '{PASSWORD}' | sudo -S systemctl status vocab-agent --no-pager -l", timeout=30)
    log(f'  {out.strip()[-500:]}')

    log('\n=== 验证 ===')
    for name, c in [
        ('AI 网关健康', 'curl -s http://127.0.0.1:8000/health'),
        ('词条搜索', 'curl -s "http://127.0.0.1:8000/api/words/random?limit=1" | head -c 150'),
        ('Web 状态码', 'curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:80/'),
    ]:
        rc, out, err = exec_cmd(client, c, timeout=30)
        log(f'  {name}: {out.strip()[:150]}')

    client.close()
    return 0

if __name__ == '__main__':
    sys.exit(main())