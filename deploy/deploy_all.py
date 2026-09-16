"""全量部署：同步整个 app/ 目录 + 前端 dist，然后重启并验证"""
import os
import posixpath
import paramiko
import sys
import time

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

HOST = 'agents.earthledger.com'
USER = 'ubuntu'
PASSWORD = os.environ.get('VOCAB_SSH_PASSWORD', '')
REMOTE_DIR = '/home/ubuntu/vocab-agent'
LOCAL_GW = r'C:\AppSoft\vocabularyagent\services\ai-gateway'
LOCAL_DIST = r'C:\AppSoft\vocabularyagent\apps\web\dist'

SKIP_DIRS = {'__pycache__', '.pytest_cache', '.mypy_cache', '.ruff_cache'}


def exec_cmd(client, cmd, timeout=60):
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    rc = stdout.channel.recv_exit_status()
    return rc, out, err


def log(msg):
    print(msg, flush=True)


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
    client.connect(HOST, username=USER, password=PASSWORD, timeout=20)
    log('[OK] connected\n')

    sftp = client.open_sftp()
    log('=== 同步后端 app/ ===')
    upload_tree(sftp, os.path.join(LOCAL_GW, 'app'), f'{REMOTE_DIR}/app', 'app/')

    log('=== 同步前端 dist/ ===')
    # 先清空 dist，避免残留旧 hash 资源
    exec_cmd(client, f'rm -rf {REMOTE_DIR}/dist && mkdir -p {REMOTE_DIR}/dist')
    upload_tree(sftp, LOCAL_DIST, f'{REMOTE_DIR}/dist', 'dist/')
    sftp.close()

    exec_cmd(client, f'chmod -R a+rX {REMOTE_DIR}/dist')

    # nginx：index.html 禁缓存（否则手机一直拿到旧页面，新功能看不到）
    log('=== 更新 nginx 配置（index.html 禁缓存）===')
    nginx_conf = f"""server {{
    # 80：常规入口（受备案策略影响）
    listen 80 default_server;
    # 8088：绕过备案拦截的备用入口
    listen 8088;
    server_name _;

    root {REMOTE_DIR}/dist;
    index index.html;

    # index.html 不缓存，保证前端发版后手机能立刻拿到新的 hash 资源
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
        proxy_read_timeout 120s;
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
        rc, out, err = exec_cmd(client, f"echo '{PASSWORD}' | sudo -S {c} 2>&1", timeout=60)
        log(f'  {c}: rc={rc} {err.strip()[:120]}')

    log('=== 重启服务 ===')
    rc, out, err = exec_cmd(client, f"echo '{PASSWORD}' | sudo -S systemctl restart vocab-agent", timeout=60)
    log(f'  restart rc={rc}')
    time.sleep(5)

    log('=== 验证 ===')
    checks = [
        ('健康检查', 'curl -s http://127.0.0.1:8000/health'),
        ('随机词条(含词根)', 'curl -s "http://127.0.0.1:8000/api/words/random?limit=2"'),
        ('阅读真题库', 'curl -s "http://127.0.0.1:8000/api/reading/bank/stats"'),
        ('写作真题库', 'curl -s "http://127.0.0.1:8000/api/writing/prompts/stats"'),
        ('首页(80)', 'curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:80/'),
        ('首页(8088)', 'curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8088/'),
        ('API 经 8088 反代', 'curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8088/api/reading/bank/stats'),
    ]
    for name, c in checks:
        rc, out, err = exec_cmd(client, c, timeout=30)
        log(f'  {name}: {out.strip()[:600]}')

    rc, out, err = exec_cmd(client, f"echo '{PASSWORD}' | sudo -S journalctl -u vocab-agent -n 10 --no-pager | tail -10", timeout=30)
    log('\n=== 服务日志 ===')
    log(out.strip()[-700:])

    client.close()
    return 0


if __name__ == '__main__':
    sys.exit(main())
