"""SSH 连接服务器并诊断环境"""
import os
import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

HOST = 'agents.earthledger.com'
USER = 'ubuntu'
PASSWORD = os.environ.get('VOCAB_SSH_PASSWORD', '')

def run(client, cmd):
    stdin, stdout, stderr = client.exec_command(cmd, timeout=30)
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    return out, err

def main():
    print(f'[连接] {HOST} ...')
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(HOST, username=USER, password=PASSWORD, timeout=15)
        print('[OK] 连接成功\n')

        commands = [
            ('主机名', 'hostname'),
            ('系统', 'uname -a'),
            ('Docker', 'docker --version'),
            ('Docker Compose', 'docker compose version'),
            ('磁盘空间', 'df -h /'),
            ('内存', 'free -h'),
            ('Python', 'python3 --version'),
            ('当前目录', 'pwd && ls -la'),
            ('Docker 容器', 'docker ps -a 2>&1 | head -20'),
        ]
        for name, cmd in commands:
            out, err = run(client, cmd)
            print(f'=== {name} ===')
            if out:
                print(out)
            if err:
                print(f'[stderr] {err[:300]}')
            print()

        client.close()
        return 0
    except Exception as e:
        print(f'[FAIL] 连接失败: {e}')
        return 1

if __name__ == '__main__':
    sys.exit(main())