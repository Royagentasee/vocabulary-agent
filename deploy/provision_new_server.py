"""一键迁移到新服务器（支持 AWS 密钥登录 / 腾讯云密码登录）

用法（PowerShell）:

  # AWS：用 .pem 密钥登录
  $env:VOCAB_NEW_HOST="1.2.3.4"
  $env:VOCAB_NEW_USER="ubuntu"
  $env:VOCAB_NEW_KEY="C:\\path\\to\\key.pem"
  $env:VOCAB_DOMAIN="agents.earthledger.com"      # 可选：配 HTTPS
  $env:VOCAB_EMAIL="you@example.com"              # 配 HTTPS 时需要
  python deploy\\provision_new_server.py

  # 或密码登录
  $env:VOCAB_NEW_PASSWORD="..."

脚本会：
  1. 装系统依赖（python3-pip / python3-venv / nginx）
  2. 上传后端、SDK、词库、前端 dist
  3. 从旧服务器拉取 SQLite 数据库（保留历史统计）
  4. 装 Python 依赖 + 下载 Whisper 模型（国内镜像）
  5. 配置 systemd 服务 + nginx
  6. 可选：配 Let's Encrypt HTTPS（需域名已解析到本机、443 已放行）
  7. 跑一遍验证
"""
from __future__ import annotations

import os
import posixpath
import sys
import time

import paramiko

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

LOCAL_ROOT = r'C:\AppSoft\vocabularyagent'
LOCAL_GW = posixpath.join(LOCAL_ROOT, 'services', 'ai-gateway')
LOCAL_DIST = posixpath.join(LOCAL_ROOT, 'apps', 'web', 'dist')

REMOTE_DIR = '/home/ubuntu/vocab-agent'
SKIP_DIRS = {'__pycache__', '.pytest_cache', '.mypy_cache', '.ruff_cache', '.git'}

# 旧服务器（用于搬运数据库，保留历史统计）
OLD_HOST = 'agents.earthledger.com'
OLD_USER = 'ubuntu'
OLD_PASSWORD = os.environ.get('VOCAB_SSH_PASSWORD', '')
OLD_DB = f'{REMOTE_DIR}/data/vocab_agent.db'

NEW_HOST = os.environ.get('VOCAB_NEW_HOST', '')
NEW_USER = os.environ.get('VOCAB_NEW_USER', 'ubuntu')
NEW_KEY = os.environ.get('VOCAB_NEW_KEY', '')
NEW_PASSWORD = os.environ.get('VOCAB_NEW_PASSWORD', '')
DOMAIN = os.environ.get('VOCAB_DOMAIN', '')
EMAIL = os.environ.get('VOCAB_EMAIL', '')


def log(msg: str) -> None:
    print(msg, flush=True)


def connect(host, user, password='', key=''):
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    kw = {'username': user, 'timeout': 25}
    if key:
        kw['key_filename'] = key
    else:
        kw['password'] = password
    c.connect(host, **kw)
    return c


def run(client, cmd, timeout=900, sudo=False, password=''):
    if sudo and password:
        cmd = f"echo '{password}' | sudo -S bash -c {shell_quote(cmd)}"
    elif sudo:
        cmd = f'sudo -n bash -c {shell_quote(cmd)}'
    _, out, err = client.exec_command(cmd, timeout=timeout)
    o = out.read().decode('utf-8', 'replace')
    e = err.read().decode('utf-8', 'replace')
    rc = out.channel.recv_exit_status()
    return rc, (o + e).strip()


def shell_quote(s: str) -> str:
    return "'" + s.replace("'", "'\\''") + "'"


def ensure_dir(sftp, path: str) -> None:
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


def upload_tree(sftp, local_root: str, remote_root: str, label: str) -> int:
    n = 0
    for root, dirs, files in os.walk(local_root):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        rel = os.path.relpath(root, local_root).replace('\\', '/')
        rdir = remote_root if rel == '.' else posixpath.join(remote_root, rel)
        ensure_dir(sftp, rdir)
        for fn in files:
            if fn.endswith(('.pyc', '.pyo')):
                continue
            sftp.put(os.path.join(root, fn), posixpath.join(rdir, fn))
            n += 1
    log(f'  {label}: {n} 个文件')
    return n


def main() -> int:
    if not NEW_HOST:
        log('请先设置 VOCAB_NEW_HOST（新服务器公网 IP）')
        return 1
    if not NEW_KEY and not NEW_PASSWORD:
        log('请设置 VOCAB_NEW_KEY（.pem 路径）或 VOCAB_NEW_PASSWORD')
        return 1

    # ---------- 1. 从旧服务器拉数据库 ----------
    db_bytes = b''
    if OLD_PASSWORD:
        try:
            log('=== 从旧服务器拉取数据库 ===')
            old = connect(OLD_HOST, OLD_USER, password=OLD_PASSWORD)
            sftp = old.open_sftp()
            with sftp.open(OLD_DB, 'rb') as f:
                db_bytes = f.read()
            sftp.close()
            old.close()
            log(f'  已获取 {len(db_bytes)} 字节（保留历史学习/统计数据）')
        except Exception as e:
            log(f'  [警告] 拉取数据库失败（将使用空库）：{e}')

    # ---------- 2. 连接新服务器 ----------
    log(f'\n=== 连接新服务器 {NEW_HOST} ===')
    c = connect(NEW_HOST, NEW_USER, password=NEW_PASSWORD, key=NEW_KEY)
    log('  已连接')

    log('\n=== 系统依赖 ===')
    rc, out = run(c, 'apt-get update -qq && apt-get install -y -qq python3-pip python3-venv nginx curl',
                  sudo=True, password=NEW_PASSWORD, timeout=900)
    log(f'  apt: rc={rc}')
    rc, out = run(c, 'python3 -V; nginx -v 2>&1')
    log(f'  {out}')

    # ---------- 3. 上传代码 ----------
    log('\n=== 上传代码 ===')
    run(c, f'mkdir -p {REMOTE_DIR}/app {REMOTE_DIR}/data {REMOTE_DIR}/dist '
           f'{REMOTE_DIR}/packages {REMOTE_DIR}/seed')
    sftp = c.open_sftp()
    upload_tree(sftp, posixpath.join(LOCAL_GW, 'app'), f'{REMOTE_DIR}/app', 'app/')
    for pkg in ('sdk-llm-py', 'sdk-fsrs-py'):
        lp = posixpath.join(LOCAL_ROOT, 'packages', pkg)
        if os.path.isdir(lp):
            upload_tree(sftp, lp, f'{REMOTE_DIR}/packages/{pkg}', f'packages/{pkg}')
    seed = posixpath.join(LOCAL_ROOT, 'tools', 'seed-data', 'data', 'top1000_offline.csv')
    if os.path.exists(seed):
        sftp.put(seed, f'{REMOTE_DIR}/seed/words.csv')
    upload_tree(sftp, LOCAL_DIST, f'{REMOTE_DIR}/dist', 'dist/')

    # .env（DeepSeek key）
    env_local = posixpath.join(LOCAL_GW, '.env')
    if os.path.exists(env_local):
        sftp.put(env_local, f'{REMOTE_DIR}/.env')
        log('  .env: 已上传')

    # 数据库
    if db_bytes:
        with sftp.open(f'{REMOTE_DIR}/data/vocab_agent.db', 'wb') as f:
            f.write(db_bytes)
        log(f'  数据库: 已写入 {len(db_bytes)} 字节')
    sftp.close()

    # ---------- 4. Python 依赖 ----------
    log('\n=== 安装 Python 依赖（约 1 分钟）===')
    deps = ('fastapi uvicorn pydantic pydantic-settings loguru python-multipart '
            'faster-whisper')
    rc, out = run(c, f'pip3 install --break-system-packages --ignore-installed {deps} 2>&1 | tail -3',
                  sudo=True, password=NEW_PASSWORD, timeout=1800)
    log(f'  {out[-400:]}')

    # 本地 SDK 源码
    sdk = f'{REMOTE_DIR}/packages/sdk-llm-py'
    rc, out = run(c, f'[ -d {sdk} ] && pip3 install --break-system-packages --ignore-installed -e {sdk} 2>&1 | tail -2')
    log(f'  sdk-llm-py: rc={rc}')

    # ---------- 5. Whisper 模型 ----------
    log('\n=== 下载 Whisper 模型（国内镜像）===')
    dl = (
        "import os\n"
        "os.environ['HF_ENDPOINT']='https://hf-mirror.com'\n"
        "from huggingface_hub import snapshot_download\n"
        f"snapshot_download('Systran/faster-whisper-tiny', local_dir='{REMOTE_DIR}/models/faster-whisper-tiny')\n"
        "print('model ready')\n"
    )
    sftp = c.open_sftp()
    with sftp.open('/tmp/dl_model.py', 'w') as f:
        f.write(dl)
    sftp.close()
    rc, out = run(c, f'cd {REMOTE_DIR} && python3 /tmp/dl_model.py 2>&1 | tail -2')
    log(f'  {out[-200:]}')

    # ---------- 6. systemd ----------
    log('\n=== 配置 systemd ===')
    key = ''
    rc, out = run(c, f'grep DEEPSEEK {REMOTE_DIR}/.env 2>/dev/null | head -1')
    key = out.split('=', 1)[1].strip() if '=' in out else ''
    unit = f"""[Unit]
Description=Vocabulary Agent AI Gateway
After=network.target

[Service]
WorkingDirectory={REMOTE_DIR}
Environment=LLM_PROVIDER=deepseek
Environment=DEEPSEEK_API_KEY={key}
Environment=DATABASE_URL=sqlite:///{REMOTE_DIR}/data/vocab_agent.db
Environment=WHISPER_MODEL_DIR={REMOTE_DIR}/models/faster-whisper-tiny
Environment=HF_ENDPOINT=https://hf-mirror.com
ExecStart=/usr/bin/python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
"""
    sftp = c.open_sftp()
    with sftp.open('/tmp/vocab-agent.service', 'w') as f:
        f.write(unit)
    sftp.close()
    run(c, 'cp /tmp/vocab-agent.service /etc/systemd/system/vocab-agent.service', sudo=True, password=NEW_PASSWORD)
    run(c, 'systemctl daemon-reload && systemctl enable vocab-agent && systemctl restart vocab-agent',
        sudo=True, password=NEW_PASSWORD)
    time.sleep(6)

    # ---------- 7. nginx ----------
    log('\n=== 配置 nginx ===')
    srv_name = DOMAIN if DOMAIN else '_'
    nginx = f"""server {{
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name {srv_name};

    root {REMOTE_DIR}/dist;
    index index.html;

    client_max_body_size 20m;

    location = /index.html {{
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        expires 0;
    }}

    location / {{
        try_files $uri $uri/ /index.html;
    }}

    location /api/ {{
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 300s;
    }}

    location ~* \\.(js|css|png|jpg|jpeg|gif|svg|ico|woff2?)$ {{
        expires 7d;
        add_header Cache-Control "public, immutable";
    }}
}}
"""
    sftp = c.open_sftp()
    with sftp.open('/tmp/vocab-agent.nginx', 'w') as f:
        f.write(nginx)
    sftp.close()
    run(c, 'rm -f /etc/nginx/sites-enabled/default', sudo=True, password=NEW_PASSWORD)
    run(c, 'cp /tmp/vocab-agent.nginx /etc/nginx/sites-available/vocab-agent', sudo=True, password=NEW_PASSWORD)
    run(c, f'ln -sf /etc/nginx/sites-available/vocab-agent /etc/nginx/sites-enabled/vocab-agent',
        sudo=True, password=NEW_PASSWORD)
    rc, out = run(c, 'nginx -t 2>&1', sudo=True, password=NEW_PASSWORD)
    log(f'  nginx -t: {out[-200:]}')
    run(c, 'systemctl reload nginx', sudo=True, password=NEW_PASSWORD)

    # ---------- 8. HTTPS ----------
    if DOMAIN and EMAIL:
        log(f'\n=== 配置 HTTPS（{DOMAIN}）===')
        rc, out = run(c, 'apt-get install -y -qq certbot python3-certbot-nginx',
                      sudo=True, password=NEW_PASSWORD, timeout=900)
        rc, out = run(
            c,
            f'certbot --nginx -d {DOMAIN} --non-interactive --agree-tos -m {EMAIL} --redirect 2>&1 | tail -8',
            sudo=True, password=NEW_PASSWORD, timeout=600)
        log(f'  {out[-500:]}')
    else:
        log('\n（未配置 HTTPS：未提供 VOCAB_DOMAIN / VOCAB_EMAIL）')

    # ---------- 9. 验证 ----------
    log('\n=== 验证 ===')
    for name, cmd in [
        ('健康检查', 'curl -s http://127.0.0.1:8000/health'),
        ('语音识别状态', 'curl -s http://127.0.0.1:8000/api/speaking/stt-status'),
        ('词条接口', 'curl -s "http://127.0.0.1:8000/api/words/random?limit=1" | head -c 200'),
        ('听力题库', 'curl -s http://127.0.0.1:8000/api/listening/stats'),
        ('首页', 'curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1/'),
    ]:
        rc, out = run(c, cmd, timeout=120)
        log(f'  {name}: {out[:250]}')

    c.close()
    log('\n迁移完成。')
    return 0


if __name__ == '__main__':
    sys.exit(main())
