"""修复 DB 路径 + 诊断 Web 500"""
import os
import paramiko
import sys
import time

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

HOST = 'agents.earthledger.com'
USER = 'ubuntu'
PASSWORD = os.environ.get('VOCAB_SSH_PASSWORD', '')
REMOTE_DIR = '/home/ubuntu/vocab-agent'

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
    log('[OK] 已连接\n')

    # 1. 检查 DB 文件位置
    log('=== DB 文件位置 ===')
    rc, out, err = exec_cmd(client, f'ls -la {REMOTE_DIR}/*.db {REMOTE_DIR}/data/*.db 2>&1')
    log(f'  {out.strip()}')

    # 2. 检查 nginx 错误日志
    log('\n=== nginx 错误日志 ===')
    rc, out, err = exec_cmd(client, f"echo '{PASSWORD}' | sudo -S tail -20 /var/log/nginx/error.log", timeout=30)
    log(f'  {out.strip()[-500:]}')

    # 3. 检查前端 dist
    log('\n=== 前端 dist ===')
    rc, out, err = exec_cmd(client, f'ls -la {REMOTE_DIR}/dist/ && cat {REMOTE_DIR}/dist/index.html | head -20')
    log(f'  {out.strip()[:400]}')

    # 4. 修复 systemd 加 DATABASE_URL
    log('\n=== 修复 systemd DATABASE_URL ===')
    key = ''
    rc, out, err = exec_cmd(client, f'grep DEEPSEEK {REMOTE_DIR}/.env')
    key = out.strip().split('=', 1)[1] if '=' in out.strip() else ''
    log(f'  key 前缀: {key[:10]}...')

    systemd_conf = f"""[Unit]
Description=Vocabulary Agent AI Gateway
After=network.target

[Service]
WorkingDirectory={REMOTE_DIR}
Environment=LLM_PROVIDER=deepseek
Environment=DEEPSEEK_API_KEY={key}
Environment=DATABASE_URL=sqlite:///{REMOTE_DIR}/data/vocab_agent.db
ExecStart=/usr/bin/python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
"""
    sftp = client.open_sftp()
    with sftp.open('/tmp/vocab-agent.service', 'w') as f:
        f.write(systemd_conf)
    sftp.close()

    for c in ['cp /tmp/vocab-agent.service /etc/systemd/system/vocab-agent.service', 'systemctl daemon-reload', 'systemctl restart vocab-agent']:
        rc, out, err = exec_cmd(client, f"echo '{PASSWORD}' | sudo -S {c}", timeout=60)
        log(f'  {c}: rc={rc}')

    time.sleep(3)

    # 5. 验证
    log('\n=== 验证 ===')
    for name, c in [
        ('AI 网关健康', 'curl -s http://127.0.0.1:8000/health'),
        ('词条数量', 'curl -s "http://127.0.0.1:8000/api/words/random?limit=3"'),
        ('Web 状态码', 'curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:80/'),
        ('Web 内容', 'curl -s http://127.0.0.1:80/ | head -c 300'),
    ]:
        rc, out, err = exec_cmd(client, c, timeout=30)
        log(f'  {name}: {out.strip()[:200]}')

    client.close()
    return 0

if __name__ == '__main__':
    sys.exit(main())