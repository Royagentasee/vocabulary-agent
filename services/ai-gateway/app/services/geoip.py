"""IP → 城市（离线缓存，只存城市不存完整 IP）

隐私取舍：
- 只保留到城市级，完整 IP 用完即弃（不落库）
- 用 /24 前缀做缓存，避免同一个机房反复查询
- 解析失败一律返回空，不影响主流程
"""
from __future__ import annotations

import ipaddress
import json
import urllib.request
from typing import Optional

from loguru import logger

# /24 前缀 -> {city, region, country}
_cache: dict[str, dict] = {}
_MAX_CACHE = 4000
_TIMEOUT = 3


def client_ip(x_real_ip: str = '', x_forwarded_for: str = '',
              fallback: str = '') -> str:
    """从 nginx 传来的头里取真实客户端 IP"""
    if x_real_ip:
        return x_real_ip.split(',')[0].strip()
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return (fallback or '').strip()


def _is_private(ip: str) -> bool:
    try:
        a = ipaddress.ip_address(ip)
        return a.is_private or a.is_loopback or a.is_reserved or a.is_link_local
    except Exception:
        return True


def _prefix(ip: str) -> str:
    parts = ip.split('.')
    return '.'.join(parts[:3]) if len(parts) == 4 else ip


def resolve(ip: str) -> dict:
    """同步解析（调用方应放在线程池里跑）。返回 {'city','region','country'}"""
    if not ip or _is_private(ip):
        return {}

    key = _prefix(ip)
    if key in _cache:
        return _cache[key]

    out: dict = {}
    try:
        url = (f'http://ip-api.com/json/{ip}'
               '?fields=status,country,regionName,city&lang=zh-CN')
        req = urllib.request.Request(url, headers={'User-Agent': 'vocab-agent/1.0'})
        with urllib.request.urlopen(req, timeout=_TIMEOUT) as r:
            d = json.loads(r.read().decode('utf-8', 'replace'))
        if d.get('status') == 'success':
            out = {
                'city': str(d.get('city') or '')[:40],
                'region': str(d.get('regionName') or '')[:40],
                'country': str(d.get('country') or '')[:40],
            }
    except Exception as e:
        logger.debug(f'IP 解析失败 {key}: {type(e).__name__}')

    if len(_cache) < _MAX_CACHE:
        _cache[key] = out
    return out


def stats() -> dict:
    known = sum(1 for v in _cache.values() if v.get('city'))
    return {'cached': len(_cache), 'resolved': known}
