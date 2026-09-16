"""诊断外网访问：公网IP、监听、防火墙、DNS"""
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

    # 1. 公网出口 IP
    log('=== 服务器公网 IP ===')
    rc, out, err = exec_cmd(client, 'curl -s --max-time 10 http://ifconfig.me; echo; curl -s --max-time 10 http://api.ipify.org')
    log(f'  {out.strip()}')

    # 2. 监听端口
    log('\n=== 监听端口 ===')
    rc, out, err = exec_cmd(client, "ss -tlnp 2>/dev/null | grep -E ':80|:8000' || netstat -tlnp 2>/dev/null | grep -E ':80|:8000'")
    log(f'  {out.strip()}')

    # 3. ufw 状态
    log('\n=== ufw 防火墙 ===')
    rc, out, err = exec_cmd(client, f"echo '{PASSWORD}' | sudo -S ufw status verbose 2>&1")
    log(f'  {out.strip()[:500]}')

    # 4. iptables
    log('\n=== iptables ===')
    rc, out, err = exec_cmd(client, f"echo '{PASSWORD}' | sudo -S iptables -L -n 2>&1 | head -40")
    log(f'  {out.strip()[:800]}')

    # 5. nginx listen 配置
    log('\n=== nginx listen ===')
    rc, out, err = exec_cmd(client, f"echo '{PASSWORD}' | sudo -S nginx -T 2>&1 | grep -E 'listen|server_name|root'")
    log(f'  {out.strip()}')

    # 6. DNS 解析
    log('\n=== DNS 解析 ===')
    rc, out, err = exec_cmd(client, "getent hosts agents.earthledger.com; echo '---'; (dig +short agents.earthledger.com 2>/dev/null || nslookup agents.earthledger.com 2>/dev/null | tail -5)")
    log(f'  {out.strip()}')

    client.close()
    return 0

if __name__ == '__main__':
    sys.exit(main())
