"""全量部署：同步整个 app/ 目录 + 前端 dist，然后重启并验证"""
import os
import posixpath
import paramiko
import sys
import time

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

HOST = os.environ.get('VOCAB_SSH_HOST', 'roy.earthledger.com')   # AWS 东京
USER = os.environ.get('VOCAB_SSH_USER', 'ubuntu')
PASSWORD = os.environ.get('VOCAB_SSH_PASSWORD', '')
SSH_KEY = os.environ.get('VOCAB_SSH_KEY', r'E:\aws\vocab-agent-key.pem')
REMOTE_DIR = '/home/ubuntu/vocab-agent'
LOCAL_GW = r'E:\vocabularyagent\services\ai-gateway'
LOCAL_DIST = r'E:\vocabularyagent\apps\web\dist'

SKIP_DIRS = {'__pycache__', '.pytest_cache', '.mypy_cache', '.ruff_cache'}


def exec_cmd(client, cmd, timeout=60):
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    rc = stdout.channel.recv_exit_status()
    return rc, out, err


def log(msg):
    print(msg, flush=True)


def sudo_cmd(cmd):
    """有密码时用 sudo -S 喂密码；密钥登录（AWS）用免密 sudo -n"""
    if PASSWORD:
        return f"echo '{PASSWORD}' | sudo -S {cmd} 2>&1"
    return f'sudo -n {cmd} 2>&1'


def ensure_remote_dir(sftp, path):
    parts = path.strip('/').split('/')
    cur = ''
    for p in parts:
        cur = f'{cur}/{p}' if cur else f'/{p}'
        try:
            sftp.stat(cur)
        except IOError:
            try:
                sftp.mkdir(cur)
            except IOError:
                pass


def upload_tree(sftp, local_root, remote_root, label):
    n = 0
    for root, dirs, files in os.walk(local_root):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        rel = os.path.relpath(root, local_root).replace('\\', '/')
        remote_dir = remote_root if rel == '.' else posixpath.join(remote_root, rel)
        ensure_remote_dir(sftp, remote_dir)
        for fn in files:
            if fn.endswith(('.pyc', '.pyo')):
                continue
            sftp.put(os.path.join(root, fn), posixpath.join(remote_dir, fn))
            n += 1
    log(f'  {label}: 上传 {n} 个文件')
    return n


def main():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    if SSH_KEY and os.path.exists(SSH_KEY):
        client.connect(HOST, username=USER, key_filename=SSH_KEY, timeout=25)
    else:
        client.connect(HOST, username=USER, password=PASSWORD, timeout=20)
    log(f'[OK] connected to {HOST}\n')

    sftp = client.open_sftp()
    log('=== 同步后端 app/ ===')
    upload_tree(sftp, os.path.join(LOCAL_GW, 'app'), f'{REMOTE_DIR}/app', 'app/')

    log('=== 同步前端 dist/ ===')
    # 先清空 dist，避免残留旧 hash 资源
    exec_cmd(client, f'rm -rf {REMOTE_DIR}/dist && mkdir -p {REMOTE_DIR}/dist')
    upload_tree(sftp, LOCAL_DIST, f'{REMOTE_DIR}/dist', 'dist/')
    sftp.close()

    exec_cmd(client, f'chmod -R a+rX {REMOTE_DIR}/dist')

    # nginx：HTTP 跳 HTTPS + index.html 禁缓存 + 放开上传体积
    log('=== 更新 nginx 配置 ===')
    DOMAIN = os.environ.get('VOCAB_DOMAIN', 'roy.earthledger.com')
    CERT = f'/etc/letsencrypt/live/{DOMAIN}'
    nginx_conf = f"""server {{
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name {DOMAIN};
    return 301 https://$host$request_uri;
}}

server {{
    listen 443 ssl default_server;
    listen [::]:443 ssl default_server;
    server_name {DOMAIN};

    ssl_certificate     {CERT}/fullchain.pem;
    ssl_certificate_key {CERT}/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    root {REMOTE_DIR}/dist;
    index index.html;
    client_max_body_size 20m;

    # index.html 不缓存，保证前端发版后手机能立刻拿到新的 hash 资源
    location = /index.html {{
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        expires 0;
    }}

    # Service Worker 绝不能缓存，否则发版后用户永远拿到旧的 SW
    location = /sw.js {{
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        expires 0;
    }}

    # PWA 清单：给正确 MIME 类型，否则浏览器不认
    location = /manifest.webmanifest {{
        default_type application/manifest+json;
        add_header Cache-Control "public, max-age=3600";
    }}

    location / {{
        try_files $uri $uri/ /index.html;
    }}

    location /api/ {{
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
    }}

    location ~* \\.(js|css|png|jpg|jpeg|gif|svg|ico|woff2?)$ {{
        expires 7d;
        add_header Cache-Control "public, immutable";
    }}
}}
"""
    sftp = client.open_sftp()
    with sftp.open('/tmp/vocab-agent.nginx', 'w') as f:
        f.write(nginx_conf)
    sftp.close()
    for c in [
        'cp /tmp/vocab-agent.nginx /etc/nginx/sites-available/vocab-agent',
        'nginx -t',
        'systemctl reload nginx',
    ]:
        rc, out, err = exec_cmd(client, sudo_cmd(c), timeout=60)
        log(f'  {c}: rc={rc} {err.strip()[:120]}')

    log('=== 更新 systemd 服务 ===')
    rc, out, err = exec_cmd(client, f'grep DEEPSEEK {REMOTE_DIR}/.env 2>/dev/null | head -1')
    deepseek_key = out.strip().split('=', 1)[1] if '=' in out else ''
    log(f'  DeepSeek key 前缀: {deepseek_key[:10]}...')
    systemd_conf = f"""[Unit]
Description=Vocabulary Agent AI Gateway
After=network.target

[Service]
WorkingDirectory={REMOTE_DIR}
Environment=LLM_PROVIDER=deepseek
Environment=DEEPSEEK_API_KEY={deepseek_key}
Environment=DATABASE_URL=sqlite:///{REMOTE_DIR}/data/vocab_agent.db
# 语音识别：本地 Whisper 模型目录（不依赖 Google，境内可用）
Environment=WHISPER_MODEL_DIR={REMOTE_DIR}/models/faster-whisper-tiny
Environment=HF_ENDPOINT=https://hf-mirror.com
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
    ]:
        rc, out, err = exec_cmd(client, sudo_cmd(c), timeout=60)
        log(f'  {c}: rc={rc} {err.strip()[:120]}')

    log('=== 重启服务 ===')
    rc, out, err = exec_cmd(client, sudo_cmd('systemctl restart vocab-agent'), timeout=60)
    log(f'  restart rc={rc}')
    time.sleep(5)

    log('=== 验证 ===')
    checks = [
        ('健康检查', 'curl -s http://127.0.0.1:8000/health'),
        ('随机词条(含词根)', 'curl -s "http://127.0.0.1:8000/api/words/random?limit=2"'),
        ('阅读真题库', 'curl -s "http://127.0.0.1:8000/api/reading/bank/stats"'),
        ('写作真题库', 'curl -s "http://127.0.0.1:8000/api/writing/prompts/stats"'),
        ('听力题库', 'curl -s http://127.0.0.1:8000/api/listening/stats'),
        ('语音识别', 'curl -s http://127.0.0.1:8000/api/speaking/stt-status'),
        ('HTTP 跳转', 'curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1/'),
        ('HTTPS 首页', 'curl -sk -o /dev/null -w "%{http_code}" https://127.0.0.1/'),
    ]
    for name, c in checks:
        rc, out, err = exec_cmd(client, c, timeout=30)
        log(f'  {name}: {out.strip()[:600]}')

    rc, out, err = exec_cmd(client, sudo_cmd('journalctl -u vocab-agent -n 10 --no-pager') + ' | tail -10', timeout=30)
    log('\n=== 服务日志 ===')
    log(out.strip()[-700:])

    client.close()
    return 0


if __name__ == '__main__':
    sys.exit(main())
