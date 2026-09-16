"""诊断 + 修复部署问题"""
import os
import paramiko
import sys
import time

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

HOST = 'agents.earthledger.com'
USER = 'ubuntu'
PASSWORD = os.environ.get('VOCAB_SSH_PASSWORD', '')
REMOTE_DIR = '/home/ubuntu/vocab-agent'

def exec_cmd(client, cmd, timeout=300, sudo=False):
    if sudo:
        cmd = f"echo '{PASSWORD}' | sudo -S {cmd}"
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

    # 1. 诊断 venv
    log('=== 诊断 venv ===')
    rc, out, err = exec_cmd(client, f'ls {REMOTE_DIR}/venv/bin/ 2>&1 | head -20')
    log(f'  venv/bin 内容: {out.strip()[:200]}')

    rc, out, err = exec_cmd(client, 'which python3 && python3 --version && which pip3')
    log(f'  python3: {out.strip()}')

    # 2. 诊断 apt lock
    log('\n=== 诊断 apt lock ===')
    rc, out, err = exec_cmd(client, 'ps aux | grep -E "apt|dpkg" | grep -v grep')
    log(f'  apt 进程: {out.strip()[:300]}')

    # 3. 修复：装 python3-venv + python3-pip + nginx（用系统 python 直接装依赖，绕过 venv）
    log('\n=== 修复 1：装 python3-venv + pip + nginx ===')
    rc, out, err = exec_cmd(client, 'apt-get update', timeout=180, sudo=True)
    log(f'  apt update: rc={rc}')
    if rc != 0:
        log(f'    {err[:200]}')

    rc, out, err = exec_cmd(client, 'apt-get install -y python3-venv python3-pip nginx', timeout=300, sudo=True)
    log(f'  apt install: rc={rc}')
    if rc != 0:
        log(f'    {err[:300]}')

    # 4. 用系统 python3 直接装依赖（pip install --user 或 sudo pip）
    log('\n=== 修复 2：安装 Python 依赖 ===')
    rc, out, err = exec_cmd(client, f'cd {REMOTE_DIR} && pip3 install --break-system-packages fastapi "uvicorn[standard]" pydantic pydantic-settings openai httpx python-dotenv loguru redis "psycopg[binary]" prometheus-client', timeout=400, sudo=True)
    log(f'  pip install 主依赖: rc={rc}')
    if rc != 0:
        log(f'    {err[:300]}')

    rc, out, err = exec_cmd(client, f'cd {REMOTE_DIR} && pip3 install --break-system-packages ./packages/sdk-llm-py ./packages/sdk-fsrs-py', timeout=200, sudo=True)
    log(f'  pip install SDK: rc={rc}')
    if rc != 0:
        log(f'    {err[:300]}')

    # 5. 用系统 python3 跑 uvicorn（更新 systemd 配置）
    log('\n=== 修复 3：更新 systemd 用系统 python ===')
    key = ''
    env_file = f'{REMOTE_DIR}/.env'
    rc, out, err = exec_cmd(client, f'cat {env_file} | grep DEEPSEEK')
    key_line = out.strip()
    key = key_line.split('=', 1)[1] if '=' in key_line else ''

    systemd_conf = f"""[Unit]
Description=Vocabulary Agent AI Gateway
After=network.target

[Service]
WorkingDirectory={REMOTE_DIR}
Environment=LLM_PROVIDER=deepseek
Environment=DEEPSEEK_API_KEY={key}
ExecStart=/usr/bin/python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
"""
    sftp = client.open_sftp()
    with sftp.open('/tmp/vocab-agent.service', 'w') as f:
        f.write(systemd_conf)
    sftp.close()

    for c in [
        'cp /tmp/vocab-agent.service /etc/systemd/system/vocab-agent.service',
        'systemctl daemon-reload',
        'systemctl enable vocab-agent',
        'systemctl restart vocab-agent',
    ]:
        rc, out, err = exec_cmd(client, c, sudo=True, timeout=120)
        log(f'  {c}: rc={rc} {err[:100]}')

    # 6. nginx 配置
    log('\n=== 修复 4：配置 nginx ===')
    nginx_conf = f"""server {{
    listen 80 default_server;
    server_name _;

    root {REMOTE_DIR}/dist;
    index index.html;

    location / {{
        try_files $uri $uri/ /index.html;
    }}

    location /api/ {{
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 60s;
    }}

    location ~* \\.(js|css|png|jpg|jpeg|gif|svg|ico|woff2?)$ {{
        expires 7d;
        add_header Cache-Control "public, immutable";
    }}
}}
"""
    sftp = client.open_sftp()
    with sftp.open('/tmp/vocab-nginx.conf', 'w') as f:
        f.write(nginx_conf)
    sftp.close()

    for c in [
        'cp /tmp/vocab-nginx.conf /etc/nginx/sites-available/vocab-agent',
        'ln -sf /etc/nginx/sites-available/vocab-agent /etc/nginx/sites-enabled/vocab-agent',
        'rm -f /etc/nginx/sites-enabled/default',
        'nginx -t',
        'systemctl restart nginx',
    ]:
        rc, out, err = exec_cmd(client, c, sudo=True, timeout=120)
        log(f'  {c}: rc={rc} {err[:150]}')

    # 7. 验证
    log('\n=== 验证 ===')
    time.sleep(3)
    for name, c in [
        ('AI 网关健康', 'curl -s http://127.0.0.1:8000/health'),
        ('Web 状态码', 'curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:80/'),
    ]:
        rc, out, err = exec_cmd(client, c, timeout=30)
        log(f'  {name}: {out.strip()[:150]}')

    client.close()
    return 0

if __name__ == '__main__':
    sys.exit(main())