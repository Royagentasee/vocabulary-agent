"""日历提醒（.ics）

为什么需要这个：Web Push 在中国大陆的安卓上基本不可用 ——
Chrome/Edge 走 Google FCM（被墙），小米/华为/QQ/UC 浏览器
不开放 Web Push 接口，微信更不支持。

日历提醒不依赖任何推送服务：
下载 .ics 文件导入，或把订阅链接粘到「小米日历 / 华为日历 → 订阅日历」，
系统日历就会每天准点提醒 —— 全平台通用。
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

PRODID = '-//Vocabulary Agent//学习提醒//CN'
SITE = 'https://roy.earthledger.com/path'


def _esc(text: str) -> str:
    return (text.replace('\\', '\\\\').replace(';', '\\;')
                .replace(',', '\\,').replace('\n', '\\n'))


def build_ics(hour: int = 20, minute: int = 0, uid: str = 'default',
              title: str = '📖 该学英语了', days: int = 365) -> str:
    """生成每日重复的学习提醒日历。

    DTSTART 用「浮动时间」（不带 Z）—— 表示各设备按自己的本地时区解释，
    这样用户选 20:00 就是他自己时区的 20:00，不需要知道他的时区。
    """
    hour = max(0, min(23, int(hour)))
    minute = max(0, min(59, int(minute)))

    now = datetime.now(timezone.utc)
    stamp = now.strftime('%Y%m%dT%H%M%SZ')

    # 从明天开始（今天可能已经过了那个点）
    start_local = (now + timedelta(days=1)).replace(
        hour=hour, minute=minute, second=0, microsecond=0)
    dtstart = start_local.strftime('%Y%m%dT%H%M%S')

    desc = ('打开 Vocabulary Agent 完成今天的学习。\\n'
            '10 分钟就能完成每日目标。\\n' + SITE)

    lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        f'PRODID:{PRODID}',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'X-WR-CALNAME:Vocabulary Agent 学习提醒',
        'X-WR-TIMEZONE:Asia/Shanghai',
        'BEGIN:VEVENT',
        f'UID:va-reminder-{uid}@roy.earthledger.com',
        f'DTSTAMP:{stamp}',
        f'DTSTART:{dtstart}',
        'DURATION:PT10M',
        'RRULE:FREQ=DAILY;COUNT=%d' % max(1, int(days)),
        f'SUMMARY:{_esc(title)}',
        f'DESCRIPTION:{desc}',
        f'URL:{SITE}',
        'TRANSP:TRANSPARENT',
        'BEGIN:VALARM',
        'TRIGGER:PT0M',
        'ACTION:DISPLAY',
        f'DESCRIPTION:{_esc(title)}',
        'END:VALARM',
        'END:VEVENT',
        'END:VCALENDAR',
    ]
    # iCalendar 规范要求 CRLF
    return '\r\n'.join(lines) + '\r\n'


def build_client_ics(hour: int = 20, title: str = '📖 该学英语了') -> str:
    """抖音式的一次性下载版（客户端也能生成，这里保持一致）"""
    return build_ics(hour=hour, uid='download', title=title, days=3650)
