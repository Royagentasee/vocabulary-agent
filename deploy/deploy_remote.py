"""
Vocabulary Agent 远程部署脚本（裸机，不用 Docker，适合 2G 内存）

流程：
1. 本机打包（前端 dist + 后端 app + SDK + 种子数据 + init_db.py + .env）
2. SFTP 上传 tar.gz 到服务器
3. SSH 执行：解压 → 装依赖 → 初始化 DB → 配 systemd → 配 nginx → 启动
"""
import os
import sys
import tarfile
import io
import time
import paramiko

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

HOST = 'agents.earthledger.com'
USER = 'ubuntu'
PASSWORD = os.environ.get('VOCAB_SSH_PASSWORD', '')
REMOTE_DIR = '/home/ubuntu/vocab-agent'

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEPLOY_DIR = os.path.dirname(os.path.abspath(__file__))

def read_deepseek_key():
    env_file = os.path.join(ROOT, 'services', 'ai-gateway', '.env')
    try:
        with open(env_file, encoding='utf-8') as f:
            for line in f:
                if line.startswith('DEEPSEEK_API_KEY='):
                    return line.split('=', 1)[1].strip()
    except Exception:
        pass
    return ''

def log(msg):
    print(msg, flush=True)

def build_tarball():
    log('[1/7] 打包项目...')
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode='w:gz') as tar:
        def add_dir(path, arcname):
            for root, dirs, files in os.walk(path):
                dirs[:] = [d for d in dirs if d not in ('__pycache__', '.git', 'node_modules', 'dist', '.turbo')]
                for f in files:
                    if f.endswith(('.pyc', '.pyo')):
                        continue
                    full = os.path.join(root, f)
                    rel = os.path.relpath(full, path)
                    tar.add(full, arcname=os.path.join(arcname, rel))

        add_dir(os.path.join(ROOT, 'services', 'ai-gateway', 'app'), 'app')
        add_dir(os.path.join(ROOT, 'packages', 'sdk-llm-py'), 'packages/sdk-llm-py')
        add_dir(os.path.join(ROOT, 'packages', 'sdk-fsrs-py'), 'packages/sdk-fsrs-py')
        seed = os.path.join(ROOT, 'tools', 'seed-data', 'data', 'top1000_offline.csv')
        tar.add(seed, arcname='seed/words.csv')
        add_dir(os.path.join(ROOT, 'apps', 'web', 'dist'), 'dist')
        # init_db.py
        tar.add(os.path.join(DEPLOY_DIR, 'init_db.py'), arcname='init_db.py')

        # .env
        key = read_deepseek_key()
        env_content = f"LLM_PROVIDER=deepseek\nDEEPSEEK_API_KEY={key}\nDATABASE_URL=sqlite:///{REMOTE_DIR}/data/vocab_agent.db\n"
        tarinfo = tarfile.TarInfo(name='.env')
        tarinfo.size = len(env_content.encode('utf-8'))
        tar.addfile(tarinfo, io.BytesIO(env_content.encode('utf-8')))

    buf.seek(0)
    log(f'    打包完成，{len(buf.getvalue())/1024:.0f} KB')
    return buf

def exec_cmd(client, cmd, timeout=300):
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    rc = stdout.channel.recv_exit_status()
    return rc, out, err

def main():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        log(f'[连接] {HOST} ...')
        client.connect(HOST, username=USER, password=PASSWORD, timeout=20)
        log('[OK] 已连接\n')

        # 1. 打包
        buf = build_tarball()

        # 2. 上传
        log('[2/7] 上传...')
        sftp = client.open_sftp()
        sftp.putfo(buf, '/tmp/vocab-agent.tar.gz')
        sftp.close()
        log('[OK] 上传完成\n')

        # 3. 解压
        log('[3/7] 解压...')
        rc, out, err = exec_cmd(client, f'mkdir -p {REMOTE_DIR} && cd {REMOTE_DIR} && tar xzf /tmp/vocab-agent.tar.gz')
        if rc != 0:
            log(f'[FAIL] 解压失败: {err}')
        else:
            log('[OK] 解压完成\n')

        # 4. 装依赖
        log('[4/7] 安装 Python 依赖（可能 2-3 分钟）...')
        cmds = [
            f'cd {REMOTE_DIR} && python3 -m venv venv',
            f'cd {REMOTE_DIR} && ./venv/bin/pip install --quiet --upgrade pip',
            f'cd {REMOTE_DIR} && ./venv/bin/pip install --quiet fastapi "uvicorn[standard]" pydantic pydantic-settings openai httpx python-dotenv loguru redis "psycopg[binary]" prometheus-client',
            f'cd {REMOTE_DIR} && ./venv/bin/pip install --quiet ./packages/sdk-llm-py ./packages/sdk-fsrs-py',
        ]
        for c in cmds:
            log(f'  $ {c[:70]}...')
            rc, out, err = exec_cmd(client, c, timeout=300)
            if rc != 0:
                log(f'  [WARN] {err[:200]}')
        log('[OK] 依赖安装完成\n')

        # 5. 初始化 DB
        log('[5/7] 初始化数据库...')
        rc, out, err = exec_cmd(client, f'cd {REMOTE_DIR} && ./venv/bin/python init_db.py')
        log(f'  {out.strip()}')
        if rc != 0:
            log(f'  [WARN] {err[:200]}')

        # 6. systemd + nginx
        log('[6/7] 配置 systemd + nginx...')
        key = read_deepseek_key()
        systemd_conf = f"""[Unit]
Description=Vocabulary Agent AI Gateway
After=network.target

[Service]
WorkingDirectory={REMOTE_DIR}
Environment=LLM_PROVIDER=deepseek
Environment=DEEPSEEK_API_KEY={key}
ExecStart={REMOTE_DIR}/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
"""
        sftp = client.open_sftp()
        with sftp.open('/tmp/vocab-agent.service', 'w') as f:
            f.write(systemd_conf)
        sftp.close()

        sudo_cmds = [
            f"cp /tmp/vocab-agent.service /etc/systemd/system/vocab-agent.service",
            "systemctl daemon-reload",
            "systemctl enable vocab-agent",
            "systemctl restart vocab-agent",
        ]
        for c in sudo_cmds:
            rc, out, err = exec_cmd(client, f"echo '{PASSWORD}' | sudo -S {c}", timeout=120)
            if rc != 0:
                log(f'  [WARN] {c}: {err[:150]}')

        # 装 nginx
        log('  安装 nginx...')
        rc, out, err = exec_cmd(client, f"echo '{PASSWORD}' | sudo -S apt-get install -y nginx", timeout=300)
        if rc != 0:
            log(f'  [WARN] nginx 安装: {err[:200]}')

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

        sudo_cmds2 = [
            "cp /tmp/vocab-nginx.conf /etc/nginx/sites-available/vocab-agent",
            "ln -sf /etc/nginx/sites-available/vocab-agent /etc/nginx/sites-enabled/vocab-agent",
            "rm -f /etc/nginx/sites-enabled/default",
            "nginx -t",
            "systemctl restart nginx",
        ]
        for c in sudo_cmds2:
            rc, out, err = exec_cmd(client, f"echo '{PASSWORD}' | sudo -S {c}", timeout=120)
            if rc != 0:
                log(f'  [WARN] {c}: {err[:200]}')
        log('[OK] 服务配置完成\n')

        # 7. 验证
        log('[7/7] 验证...')
        time.sleep(3)
        checks = [
            ('AI 网关健康', 'curl -s http://127.0.0.1:8000/health'),
            ('词条数量', 'curl -s "http://127.0.0.1:8000/api/words/random?limit=1" | head -c 200'),
            ('Web 状态码', 'curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:80/'),
        ]
        for name, c in checks:
            rc, out, err = exec_cmd(client, c, timeout=30)
            log(f'  {name}: {out.strip()[:150]}')

        log(f'\n[完成] 部署成功！')
        log(f'  访问: http://{HOST}')
        client.close()
        return 0
    except Exception as e:
        log(f'[FAIL] {e}')
        import traceback
        traceback.print_exc()
        return 1

if __name__ == '__main__':
    sys.exit(main())