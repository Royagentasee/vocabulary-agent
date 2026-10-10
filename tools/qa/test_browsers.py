"""跨浏览器实测：用无头 Chrome 模拟各种 UA，真实渲染页面，检查识别与功能

（用 Python 写是因为 PowerShell 读 UTF-8 脚本的中文会乱码）
"""
import os
import re
import shutil
import subprocess
import sys
import tempfile

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

CHROME = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
SITE = 'https://roy.earthledger.com'
BASE = os.path.join(tempfile.gettempdir(), 'va-browsers')
os.makedirs(BASE, exist_ok=True)

TARGETS = [
    ('iPhone Safari', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1', 'Safari（iPhone）'),
    ('iPad Safari', 'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1', 'Safari（iPhone）'),
    ('iPhone Chrome', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.6478.54 Mobile/15E148 Safari/604.1', 'iPhone 第三方浏览器'),
    ('iPhone 微信', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.49(0x18003128) NetType/WIFI Language/zh_CN', '微信内置浏览器'),
    ('安卓 Chrome', 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.6478.71 Mobile Safari/537.36', 'Chrome / Edge（安卓）'),
    ('小米浏览器 MIUI', 'Mozilla/5.0 (Linux; U; Android 14; zh-cn; 23127PN0CC Build/UKQ1.230804.001) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/110.0.5481.154 Mobile Safari/537.36 XiaoMi/MiuiBrowser/19.2.518', '小米浏览器'),
    ('华为浏览器', 'Mozilla/5.0 (Linux; Android 13; ALN-AL00 Build/HUAWEIALN-AL00; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/114.0.5735.196 Mobile Safari/537.36 HuaweiBrowser/14.0.3.302', '华为浏览器'),
    ('荣耀浏览器', 'Mozilla/5.0 (Linux; Android 13; FNE-AN00 Build/HONORFNE-AN00) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/114.0.5735.196 Mobile Safari/537.36 HonorBrowser/8.0.1.301', '荣耀浏览器'),
    ('鸿蒙 HarmonyOS', 'Mozilla/5.0 (Phone; HarmonyOS 4.0; ALN-AL80) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.5735.196 ArkWeb/4.0.0 Mobile Safari/537.36', '华为浏览器'),
    ('QQ 浏览器', 'Mozilla/5.0 (Linux; U; Android 14; zh-cn; 22081212C Build/UP1A.231005.007) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/107.0.5304.141 Mobile Safari/537.36 MQQBrowser/14.6', 'QQ 浏览器'),
    ('UC 浏览器', 'Mozilla/5.0 (Linux; U; Android 13; zh-CN; V2183A Build/TP1A.220624.014) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/100.0.4896.58 UCBrowser/15.5.8.1229 Mobile Safari/537.36', 'UC 浏览器'),
    ('三星浏览器', 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36', 'Chrome / Edge（安卓）'),
    ('安卓微信', 'Mozilla/5.0 (Linux; Android 14; 23127PN0CC Build/UKQ1.230804.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/116.0.0.0 Mobile Safari/537.36 XWEB/1160065 MMWEBSDK/20231202 MMWEBID/1234 MicroMessenger/8.0.47.2560 WeChat/arm64 Weixin NetType/WIFI Language/zh_CN ABI/arm64', '微信内置浏览器'),
    ('桌面 Chrome', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36', '电脑浏览器'),
    ('桌面 Edge', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0', '电脑浏览器'),
    ('桌面 Firefox', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0', '电脑浏览器'),
    ('桌面 Safari', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15', '电脑浏览器'),
]


def render(ua: str, path: str, tag: str) -> str:
    prof = os.path.join(BASE, f'p_{tag}')
    os.makedirs(prof, exist_ok=True)
    args = [
        CHROME, '--headless=new', '--disable-gpu', '--no-sandbox',
        '--no-first-run', '--no-default-browser-check', '--disable-extensions',
        '--hide-scrollbars', f'--user-data-dir={prof}', f'--user-agent={ua}',
        '--virtual-time-budget=9000', '--dump-dom', SITE + path,
    ]
    try:
        r = subprocess.run(args, capture_output=True, timeout=90)
        return r.stdout.decode('utf-8', 'replace')
    except Exception as e:
        return f'__ERR__ {e}'


print('=' * 74)
print('  跨浏览器实测（无头 Chrome 真实渲染）')
print('=' * 74)

rows = []
for i, (name, ua, expect) in enumerate(TARGETS, 1):
    tag = f't{i}'
    dom_home = render(ua, '/', tag + 'h')
    dom_acct = render(ua, '/account', tag + 'a')

    # 挂载判定：看到 React 渲染出的容器，且 root 里没有独立的加载占位
    mounted = ('min-h-screen' in dom_home) and ('<div id="va-boot"' not in dom_home)
    err = dom_home.startswith('__ERR__')

    # 平台识别：ReminderCard 头部的浏览器名
    detected = ''
    m = re.search(r'rounded-full bg-ink-100 text-ink-600">([^<]+)<', dom_acct)
    if m:
        detected = m.group(1).strip()

    ok_platform = detected == expect
    has_calendar = '日历提醒' in dom_acct
    has_caveat = '依赖 Google 服务' in dom_acct or '添加到主屏幕' in dom_acct
    has_welcome = '欢迎使用 Vocabulary Agent' in dom_home

    rows.append({
        'name': name, 'mounted': mounted, 'err': err,
        'detected': detected, 'expect': expect, 'ok': ok_platform,
        'calendar': has_calendar, 'caveat': has_caveat, 'welcome': has_welcome,
    })

    flag = 'OK  ' if (mounted and ok_platform and not err) else 'FAIL'
    print(f'  [{i:2}/{len(TARGETS)}] {flag} {name:16} 识别=[{detected}]  期望=[{expect}]')

print()
print('=' * 74)
print('  明细')
print('=' * 74)
print(f"  {'浏览器':<16} {'挂载':<6} {'平台识别':<20} {'日历提醒':<9} {'推送说明':<9} {'欢迎弹窗'}")
print('  ' + '-' * 72)
for r in rows:
    print(f"  {r['name']:<16} {'OK' if r['mounted'] else 'FAIL':<6} "
          f"{r['detected'][:18]:<20} {'OK' if r['calendar'] else '-':<9} "
          f"{'OK' if r['caveat'] else '-':<9} {'OK' if r['welcome'] else '-'}")

passed = [r for r in rows if r['mounted'] and r['ok'] and not r['err']]
print()
print(f"  通过 {len(passed)} / {len(rows)}")
bad = [r for r in rows if not (r['mounted'] and r['ok'] and not r['err'])]
if bad:
    print()
    print('  失败项：')
    for r in bad:
        reason = []
        if r['err']:
            reason.append('渲染出错')
        if not r['mounted']:
            reason.append('React 未挂载')
        if not r['ok']:
            reason.append(f"平台识别错误（得到 {r['detected']!r}，期望 {r['expect']!r}）")
        print(f"    - {r['name']}: {'; '.join(reason)}")

# ---- 截图 ----
print()
print('=' * 74)
print('  截图（iPhone 尺寸 390x844）')
print('=' * 74)
shot_dir = os.path.join(BASE, 'shots')
os.makedirs(shot_dir, exist_ok=True)
IPHONE_UA = TARGETS[0][1]
for path, fname in [('/', 'home'), ('/account', 'account'), ('/guide', 'guide'), ('/path', 'path')]:
    shot = os.path.join(shot_dir, f'{fname}.png')
    if os.path.exists(shot):
        os.remove(shot)
    args = [
        CHROME, '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
        '--hide-scrollbars', '--window-size=390,844',
        f'--user-data-dir={os.path.join(BASE, "shot_" + fname)}',
        f'--user-agent={IPHONE_UA}', '--virtual-time-budget=9000',
        f'--screenshot={shot}', SITE + path,
    ]
    try:
        subprocess.run(args, capture_output=True, timeout=90)
        size = os.path.getsize(shot) if os.path.exists(shot) else 0
        print(f'  {fname:8} {size // 1024:5} KB  {shot}')
    except Exception as e:
        print(f'  {fname:8} 失败: {e}')

print()
print('截图目录:', shot_dir)
