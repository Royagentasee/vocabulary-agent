"""从服务器抓取官方真题源，测试可达性"""
import os
import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

HOST = 'agents.earthledger.com'
USER = 'ubuntu'
PASSWORD = os.environ.get('VOCAB_SSH_PASSWORD', '')

URLS = [
    'https://ielts.org/take-a-test/preparation-resources/sample-test-questions',
    'https://takeielts.britishcouncil.org/take-ielts/prepare/free-ielts-practice-tests/reading',
    'https://www.ets.org/toefl/test-takers/ibt/prepare/free-practice-test.html',
    'https://www.ets.org/pdfs/toefl/toefl-ibt-free-practice-test.pdf',
    'https://satsuite.collegeboard.org/sat/practice-preparation',
    'https://www.ets.org/gre/test-takers/general-test/prepare.html',
]

def exec_cmd(client, cmd, timeout=90):
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

    log('=== 服务器抓取官方站点测试 ===')
    for u in URLS:
        cmd = (
            f"curl -sL --max-time 25 -A 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            f"AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36' "
            f"-o /tmp/fetch.out -w '%{{http_code}} %{{size_download}} %{{content_type}}' '{u}'"
        )
        rc, out, err = exec_cmd(client, cmd, timeout=60)
        log(f'  {out.strip():<45} {u}')
        # 看返回内容开头，判断是否是真实内容
        rc, head, err = exec_cmd(client, "head -c 200 /tmp/fetch.out | tr '\\n' ' '", timeout=30)
        log(f'      -> {head.strip()[:160]}')

    client.close()
    return 0

if __name__ == '__main__':
    sys.exit(main())
