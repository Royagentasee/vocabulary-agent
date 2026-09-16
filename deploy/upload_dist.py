"""上传新的前端 dist 到服务器（含移动端适配）"""
import os
import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

HOST = 'agents.earthledger.com'
USER = 'ubuntu'
PASSWORD = os.environ.get('VOCAB_SSH_PASSWORD', '')
REMOTE_DIR = '/home/ubuntu/vocab-agent'
LOCAL_DIST = r'C:\AppSoft\vocabularyagent\apps\web\dist'

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

    sftp = client.open_sftp()

    # 1. 清空并重建 dist
    log('=== 准备远程 dist 目录 ===')
    for c in [f'rm -rf {REMOTE_DIR}/dist', f'mkdir -p {REMOTE_DIR}/dist/assets']:
        rc, out, err = exec_cmd(client, c, timeout=30)
        log(f'  {c}: rc={rc}')

    # 2. 递归上传
    log('\n=== 上传文件 ===')
    uploaded = 0
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
            uploaded += 1
            log(f'  ↑ {rp} ({os.path.getsize(lp)} bytes)')
    sftp.close()
    log(f'  共上传 {uploaded} 个文件')

    # 3. 权限
    log('\n=== 修复权限 ===')
    rc, out, err = exec_cmd(client, f'chmod -R a+rX {REMOTE_DIR}/dist', timeout=30)
    log(f'  chmod: rc={rc}')
    rc, out, err = exec_cmd(client, f'ls -la {REMOTE_DIR}/dist {REMOTE_DIR}/dist/assets', timeout=30)
    log(out.strip())

    # 4. 验证
    log('\n=== 验证 ===')
    for name, c in [
        ('首页', 'curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:80/'),
        ('favicon', 'curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:80/favicon.svg'),
        ('index.html 引用', 'curl -s http://127.0.0.1:80/ | grep -o "assets/[^\\"]*"'),
    ]:
        rc, out, err = exec_cmd(client, c, timeout=30)
        log(f'  {name}: {out.strip()}')

    client.close()
    return 0

if __name__ == '__main__':
    sys.exit(main())
