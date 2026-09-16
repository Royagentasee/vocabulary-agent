"""诊断 DB total=0 与 nginx 500"""
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
    log('[OK] connected\n')

    # 1. DB 内容
    log('=== DB 内容检查 ===')
    py = ("import sqlite3\n"
          "for p in ['/home/ubuntu/vocab-agent/data/vocab_agent.db','/home/ubuntu/vocab-agent/vocab_agent.db']:\n"
          "    try:\n"
          "        c=sqlite3.connect(p)\n"
          "        n=c.execute('SELECT COUNT(*) FROM words').fetchone()[0]\n"
          "        t=c.execute(\"SELECT name FROM sqlite_master WHERE type='table'\").fetchall()\n"
          "        print(p, 'count=', n, 'tables=', [x[0] for x in t])\n"
          "        if n>0:\n"
          "            r=c.execute('SELECT id,headword,translation FROM words LIMIT 2').fetchall()\n"
          "            print('  sample:', r)\n"
          "        c.close()\n"
          "    except Exception as e:\n"
          "        print(p, 'ERR', repr(e))\n")
    rc, out, err = exec_cmd(client, f"python3 -c '{py}'", timeout=60)
    log(out or err)

    # 2. systemd 环境 + 进程 environ
    log('=== systemd 环境 ===')
    rc, out, err = exec_cmd(client, f"echo '{PASSWORD}' | sudo -S systemctl show vocab-agent -p Environment -p ExecStart -p WorkingDirectory", timeout=30)
    log(out.strip())

    log('=== 进程实际环境 DATABASE_URL ===')
    rc, out, err = exec_cmd(client, f"pid=$(pgrep -f 'uvicorn app.main' | head -1); echo PID=$pid; echo '{PASSWORD}' | sudo -S tr '\\0' '\\n' < /proc/$pid/environ | grep -E 'DATABASE_URL|DEEPSEEK|LLM_PROVIDER'")
    log(out.strip() or err.strip())

    # 3. 服务日志（找 DB: 行）
    log('=== 服务日志 ===')
    rc, out, err = exec_cmd(client, f"echo '{PASSWORD}' | sudo -S journalctl -u vocab-agent -n 40 --no-pager | tail -40", timeout=30)
    log(out.strip()[-2000:])

    # 4. nginx 配置
    log('\n=== nginx 配置 ===')
    rc, out, err = exec_cmd(client, f"echo '{PASSWORD}' | sudo -S cat /etc/nginx/sites-available/vocab-agent", timeout=30)
    log(out.strip())
    log('--- nginx 主 user ---')
    rc, out, err = exec_cmd(client, f"echo '{PASSWORD}' | sudo -S grep -E '^user' /etc/nginx/nginx.conf", timeout=30)
    log(out.strip())

    # 5. 目录权限
    log('=== 目录权限 ===')
    rc, out, err = exec_cmd(client, f"namei -l {REMOTE_DIR}/dist/index.html 2>&1; echo '---'; ls -ld /home/ubuntu /home/ubuntu/vocab-agent /home/ubuntu/vocab-agent/dist", timeout=30)
    log(out.strip())

    client.close()
    return 0

if __name__ == '__main__':
    sys.exit(main())
