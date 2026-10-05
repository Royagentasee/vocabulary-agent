"""把旧腾讯云服务器改成 301 跳转到新站，避免用户停留在旧版本"""
import os
import sys
import time

import paramiko

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

OLD_HOST = '106.53.41.134'
OLD_USER = 'ubuntu'
OLD_PASSWORD = os.environ.get('VOCAB_SSH_PASSWORD', '')
NEW_URL = 'https://roy.earthledger.com'

NGINX = f"""# 已迁移到 AWS（{NEW_URL}），旧服务器只做跳转
server {{
    listen 80 default_server;
    listen [::]:80 default_server;
    listen 8088;
    server_name _;

    # 旧 IP / agents.earthledger.com 一律跳到新站
    return 301 {NEW_URL}$request_uri;
}}
"""


def main() -> int:
    if not OLD_PASSWORD:
        print('需要 VOCAB_SSH_PASSWORD（旧腾讯云服务器密码）')
        return 1

    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(OLD_HOST, username=OLD_USER, password=OLD_PASSWORD, timeout=25)

    def run(cmd, t=120, sudo=True):
        if sudo:
            cmd = f"echo '{OLD_PASSWORD}' | sudo -S bash -c '{cmd}'"
        _, o, e = c.exec_command(cmd, timeout=t)
        return (o.read().decode('utf-8', 'replace') + e.read().decode('utf-8', 'replace')).strip()

    print('=== 备份原 nginx 配置 ===')
    print(run('cp /etc/nginx/sites-available/vocab-agent /etc/nginx/sites-available/vocab-agent.bak.$(date +%s) '
              '&& ls /etc/nginx/sites-available/ | tail -3'))

    print('\n=== 写入跳转配置 ===')
    sftp = c.open_sftp()
    with sftp.open('/tmp/redirect.nginx', 'w') as f:
        f.write(NGINX)
    sftp.close()
    print(run('cp /tmp/redirect.nginx /etc/nginx/sites-available/vocab-agent'))
    print(run('nginx -t 2>&1 | tail -2'))
    print(run('systemctl reload nginx && echo reloaded'))

    print('\n=== 验证 ===')
    time.sleep(2)
    print('  nginx 配置:', run('grep -c "return 301" /etc/nginx/sites-available/vocab-agent'))
    c.close()
    print('\n完成。旧地址现在会自动跳转到 ' + NEW_URL)
    return 0


if __name__ == '__main__':
    sys.exit(main())
