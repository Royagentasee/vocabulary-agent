"""拉取 nginx 访问/错误日志，分析深圳用户访问情况"""
import os
import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

HOST = 'agents.earthledger.com'
USER = 'ubuntu'
PASSWORD = os.environ.get('VOCAB_SSH_PASSWORD', '')

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

    # 访问日志：最近 40 条
    log('=== nginx access.log 最近 40 条 ===')
    rc, out, err = exec_cmd(client, f"echo '{PASSWORD}' | sudo -S tail -40 /var/log/nginx/access.log 2>&1")
    log(out.strip() or f'(无日志, rc={rc} err={err.strip()})')

    # 错误日志：最近 30 条
    log('\n=== nginx error.log 最近 30 条 ===')
    rc, out, err = exec_cmd(client, f"echo '{PASSWORD}' | sudo -S tail -30 /var/log/nginx/error.log 2>&1")
    log(out.strip() or '(无)')

    # 统计访问来源 IP 分布
    log('\n=== 访问来源 IP TOP ===')
    rc, out, err = exec_cmd(client, f"echo '{PASSWORD}' | sudo -S awk '{{print $1}}' /var/log/nginx/access.log 2>/dev/null | sort | uniq -c | sort -rn | head -20")
    log(out.strip() or '(空)')

    # access.log 大小/行数
    log('\n=== access.log 信息 ===')
    rc, out, err = exec_cmd(client, f"echo '{PASSWORD}' | sudo -S sh -c 'wc -l /var/log/nginx/access.log /var/log/nginx/error.log 2>&1'")
    log(out.strip())

    client.close()
    return 0

if __name__ == '__main__':
    sys.exit(main())
