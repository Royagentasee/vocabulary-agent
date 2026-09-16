"""修复 pos JSON 解析 + nginx 目录权限"""
import os
import paramiko
import sys
import time

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

HOST = 'agents.earthledger.com'
USER = 'ubuntu'
PASSWORD = os.environ.get('VOCAB_SSH_PASSWORD', '')
REMOTE_DIR = '/home/ubuntu/vocab-agent'
LOCAL_DB_PY = r'C:\AppSoft\vocabularyagent\services\ai-gateway\app\core\database.py'

def exec_cmd(client, cmd, timeout=60):
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
    log('[OK] connected\n')

    # 1. 上传修复后的 database.py
    log('=== 上传 database.py ===')
    sftp = client.open_sftp()
    remote_path = f'{REMOTE_DIR}/app/core/database.py'
    sftp.put(LOCAL_DB_PY, remote_path)
    sftp.close()
    log(f'  已覆盖 {remote_path}')

    # 2. 修复目录权限：www-data 需要能进入 /home/ubuntu
    log('\n=== 修复目录权限 ===')
    cmds = [
        'chmod o+x /home/ubuntu',
        f'chmod -R a+rX {REMOTE_DIR}/dist',
    ]
    for c in cmds:
        rc, out, err = exec_cmd(client, c, timeout=30)
        log(f'  {c}: rc={rc}')

    # 3. 重启服务
    log('\n=== 重启服务 ===')
    rc, out, err = exec_cmd(client, f"echo '{PASSWORD}' | sudo -S systemctl restart vocab-agent", timeout=60)
    log(f'  restart: rc={rc}')
    time.sleep(3)

    # 4. 验证
    log('\n=== 验证 ===')
    for name, c in [
        ('AI 网关健康', 'curl -s http://127.0.0.1:8000/health'),
        ('随机词条', 'curl -s "http://127.0.0.1:8000/api/words/random?limit=3"'),
        ('搜索 ab', 'curl -s "http://127.0.0.1:8000/api/words/search?q=ab"'),
        ('Web 状态码', 'curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:80/'),
        ('Web 内容', 'curl -s http://127.0.0.1:80/ | head -c 300'),
    ]:
        rc, out, err = exec_cmd(client, c, timeout=30)
        log(f'  {name}: {out.strip()[:400]}')

    client.close()
    return 0

if __name__ == '__main__':
    sys.exit(main())
