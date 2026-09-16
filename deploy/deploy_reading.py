"""部署真题库功能：后端文件 + 前端 dist"""
import os
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

BACKEND_FILES = [
    ('app/main.py', 'app/main.py'),
    ('app/routers/reading_bank.py', 'app/routers/reading_bank.py'),
    ('app/services/reading_bank.py', 'app/services/reading_bank.py'),
    ('app/schemas/reading.py', 'app/schemas/reading.py'),
    ('app/data/reading_bank.json', 'app/data/reading_bank.json'),
    # 写作真题库
    ('app/routers/writing_bank.py', 'app/routers/writing_bank.py'),
    ('app/services/writing_bank.py', 'app/services/writing_bank.py'),
    ('app/schemas/writing.py', 'app/schemas/writing.py'),
    ('app/services/writing.py', 'app/services/writing.py'),
    ('app/prompts/writing.py', 'app/prompts/writing.py'),
    ('app/data/writing_prompt_bank.json', 'app/data/writing_prompt_bank.json'),
]


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

    rc, out, err = exec_cmd(client, f'mkdir -p {REMOTE_DIR}/app/data {REMOTE_DIR}/dist/assets')
    log(f'准备目录: rc={rc}')

    sftp = client.open_sftp()

    log('\n=== 上传后端文件 ===')
    for rel_src, rel_dst in BACKEND_FILES:
        lp = os.path.join(LOCAL_GW, rel_src)
        rp = f'{REMOTE_DIR}/{rel_dst}'
        sftp.put(lp, rp)
        log(f'  ↑ {rel_dst} ({os.path.getsize(lp)} bytes)')

    log('\n=== 上传前端 dist ===')
    for root, dirs, files in os.walk(LOCAL_DIST):
        rel = os.path.relpath(root, LOCAL_DIST).replace('\\', '/')
        remote_root = f'{REMOTE_DIR}/dist' if rel == '.' else f'{REMOTE_DIR}/dist/{rel}'
        try:
            sftp.stat(remote_root)
        except IOError:
            sftp.mkdir(remote_root)
        for fn in files:
            lp = os.path.join(root, fn)
            rp = f'{remote_root}/{fn}'
            sftp.put(lp, rp)
            log(f'  ↑ dist/{rel}/{fn}' if rel != '.' else f'  ↑ dist/{fn}')
    sftp.close()

    # 旧资源清理（可选，避免残留旧 hash 文件）
    rc, out, err = exec_cmd(client, f'chmod -R a+rX {REMOTE_DIR}/dist', timeout=30)
    log(f'\nchmod: rc={rc}')

    log('\n=== 重启服务 ===')
    rc, out, err = exec_cmd(client, f"echo '{PASSWORD}' | sudo -S systemctl restart vocab-agent", timeout=60)
    log(f'  restart: rc={rc}  {err.strip()[:200]}')
    time.sleep(4)

    log('\n=== 验证 ===')
    for name, c in [
        ('健康检查', 'curl -s http://127.0.0.1:8000/health'),
        ('阅读真题库', 'curl -s "http://127.0.0.1:8000/api/reading/bank/stats"'),
        ('写作真题库统计', 'curl -s "http://127.0.0.1:8000/api/writing/prompts/stats"'),
        ('写作真题抽样', 'curl -s "http://127.0.0.1:8000/api/writing/prompts?limit=1&shuffle=true" | head -c 300'),
        ('首页', 'curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:80/'),
    ]:
        rc, out, err = exec_cmd(client, c, timeout=30)
        log(f'  {name}: {out.strip()[:420]}')

    # 服务日志尾部（排查启动错误）
    rc, out, err = exec_cmd(client, f"echo '{PASSWORD}' | sudo -S journalctl -u vocab-agent -n 12 --no-pager | tail -12", timeout=30)
    log('\n=== 服务日志 ===')
    log(out.strip()[-900:])

    client.close()
    return 0


if __name__ == '__main__':
    sys.exit(main())
