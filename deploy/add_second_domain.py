"""给应用添加第二个域名（双域名 HTTPS）

场景：主域名 roy.earthledger.com 已配好 HTTPS，
现在让 agents.earthledger.com 指向同一台服务器并共用证书。

前提：agents.earthledger.com 的 A 记录已指向本机公网 IP。

用法: python deploy\\add_second_domain.py
"""
from __future__ import annotations

import os
import sys

import paramiko

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

HOST = os.environ.get('VOCAB_SSH_HOST', 'roy.earthledger.com')
USER = os.environ.get('VOCAB_SSH_USER', 'ubuntu')
SSH_KEY = os.environ.get('VOCAB_SSH_KEY', r'E:\aws\vocab-agent-key.pem')
REMOTE_DIR = '/home/ubuntu/vocab-agent'

DOMAINS = [d.strip() for d in os.environ.get(
    'VOCAB_DOMAINS', 'roy.earthledger.com,agents.earthledger.com').split(',') if d.strip()]
EMAIL = os.environ.get('VOCAB_EMAIL', 'roywang455@gmail.com')
PRIMARY = DOMAINS[0]


def log(m: str) -> None:
    print(m, flush=True)


def main() -> int:
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, username=USER, key_filename=SSH_KEY, timeout=25)

    def run(cmd, t=600):
        _, o, e = c.exec_command("sudo -n bash -c '%s'" % cmd, timeout=t)
        return (o.read().decode('utf-8', 'replace') + e.read().decode('utf-8', 'replace')).strip()

    log(f'=== 目标域名: {", ".join(DOMAINS)} ===')

    # 1) nginx：server_name 加上全部域名
    names = ' '.join(DOMAINS)
    log('\n=== 1) 更新 nginx server_name ===')
    log(run(f"sed -i 's/^    server_name .*/    server_name {names};/' "
            f"/etc/nginx/sites-available/vocab-agent && grep server_name /etc/nginx/sites-available/vocab-agent"))

    # 2) 申请/扩展证书（certbot --expand 会自动保留已有域名）
    log('\n=== 2) 扩展 SSL 证书 ===')
    dargs = ' '.join(f'-d {d}' for d in DOMAINS)
    out = run(f'certbot --nginx {dargs} --expand --non-interactive --agree-tos '
              f'-m {EMAIL} --redirect 2>&1 | tail -12', t=600)
    log(out)

    # 3) 重载并验证
    log('\n=== 3) 重载 nginx ===')
    log(run('nginx -t 2>&1 | tail -2 && systemctl reload nginx && echo reloaded'))

    log('\n=== 4) 验证 ===')
    log(run('certbot certificates 2>/dev/null | grep -E "Domains|Expiry"'))
    for d in DOMAINS:
        code = run(f'curl -s -o /dev/null -w "%{{http_code}}" -H "Host: {d}" https://127.0.0.1/ -k')
        log(f'  https://{d}  ->  HTTP {code}')

    c.close()
    log('\n完成。')
    return 0


if __name__ == '__main__':
    sys.exit(main())
