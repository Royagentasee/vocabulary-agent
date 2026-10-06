"""探测新服务器 roy.earthledger.com 的 SSH 与部署结构"""
import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

HOST = 'roy.earthledger.com'
USER = 'ubuntu'
PASSWORD = 'RoyHero0326!'


def try_connect(host, user, pw):
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(host, username=user, password=pw, timeout=15)
    return c


def run(c, cmd, t=30):
    _, o, e = c.exec_command(cmd, timeout=t)
    return (o.read().decode('utf-8', 'replace') + e.read().decode('utf-8', 'replace')).strip()


def main():
    # 1) 试默认凭据
    try:
        c = try_connect(HOST, USER, PASSWORD)
        print(f'[OK] SSH 登录成功: {USER}@{HOST}')
    except Exception as e:
        print(f'[FAIL] 默认凭据登录失败: {e}')
        print('  需要新服务器的新账号/密码')
        return 1

    print()
    print('=== 主机信息 ===')
    print(run(c, 'hostname; . /etc/os-release 2>/dev/null && echo "$PRETTY_NAME"; nproc; free -m | head -2 | tail -1'))

    print()
    print('=== 公网 IP / 地域 ===')
    print('出网IP:', run(c, 'curl -s --max-time 8 ifconfig.me; echo'))
    for k in ['placement/region', 'placement/zone', 'instance-id']:
        print(f'{k}:', run(c, f'curl -s --max-time 5 http://metadata.tencentyun.com/latest/meta-data/{k}'))

    print()
    print('=== 部署目录探测 ===')
    print(run(c, 'ls -la /home/ubuntu/ 2>/dev/null | head -20'))
    print('--- 可能的 app 目录 ---')
    print(run(c, 'find /home/ubuntu /root /var/www /srv -maxdepth 3 -name "app" -type d 2>/dev/null | head; find / -maxdepth 4 -name "vocab*" 2>/dev/null | head -20'))

    print()
    print('=== 监听端口 ===')
    print(run(c, "ss -tlnp 2>/dev/null | grep -E ':80|:443|:8000|:8088' || netstat -tlnp 2>/dev/null | grep -E ':80|:443|:8000'"))

    print()
    print('=== systemd 服务 ===')
    print(run(c, "systemctl list-units --type=service --all 2>/dev/null | grep -iE 'vocab|uvicorn|gunicorn|node' | head"))

    print()
    print('=== nginx 配置 ===')
    print(run(c, "sudo -n nginx -T 2>/dev/null | grep -E 'server_name|root |listen |proxy_pass' | head -30; ls /etc/nginx/sites-enabled/ 2>/dev/null"))

    c.close()
    return 0


if __name__ == '__main__':
    sys.exit(main())
