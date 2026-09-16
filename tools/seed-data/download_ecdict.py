"""
下载 ECDICT CSV

用法：
    python -m tools.seed-data.download_ecdict
"""
from __future__ import annotations

import argparse
import sys
import urllib.error
import urllib.request
from pathlib import Path

from loguru import logger


ECDICT_URLS = [
    "https://github.com/skywind3000/ECDICT/releases/download/1.0.28/ecdict.csv",
    "https://raw.githubusercontent.com/skywind3000/ECDICT/master/ecdict.csv",
    "https://gh-proxy.com/https://github.com/skywind3000/ECDICT/releases/download/1.0.28/ecdict.csv",  # 镜像
    "https://mirror.ghproxy.com/https://github.com/skywind3000/ECDICT/releases/download/1.0.28/ecdict.csv",
]


def download(target: Path, timeout: int = 60) -> bool:
    """下载 ECDICT CSV"""
    target.parent.mkdir(parents=True, exist_ok=True)

    for url in ECDICT_URLS:
        try:
            logger.info(f"下载: {url}")
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                total = int(resp.headers.get('Content-Length', 0))
                logger.info(f"文件大小: {total / 1_000_000:.1f} MB")

                downloaded = 0
                with target.open('wb') as f:
                    while True:
                        chunk = resp.read(1024 * 256)
                        if not chunk:
                            break
                        f.write(chunk)
                        downloaded += len(chunk)
                        if total:
                            pct = downloaded * 100 // total
                            print(f"\r  进度: {pct}% ({downloaded / 1_000_000:.1f}/{total / 1_000_000:.1f} MB)", end='', flush=True)
                print()
            logger.success(f"下载完成: {target}")
            return True
        except (urllib.error.URLError, OSError, TimeoutError) as e:
            logger.warning(f"下载失败: {e}")
            continue

    logger.error("所有下载源都失败了")
    return False


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=Path(__file__).parent / "data" / "ecdict.csv")
    args = parser.parse_args()

    if args.output.exists() and args.output.stat().st_size > 50_000_000:
        logger.info(f"已存在: {args.output}")
        return 0

    if download(args.output):
        return 0
    return 1


if __name__ == "__main__":
    sys.exit(main())