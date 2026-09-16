"""
一键下载 ECDICT + 导入数据库

用法：
    # 默认下载 ECDICT + 导入 SQLite（开发）
    python -m tools.seed-data.download_and_seed

    # 指定 Postgres
    DATABASE_URL=postgres://user:pass@host:5432/db python -m tools.seed-data.download_and_seed

    # 跳过下载，使用已有文件
    python -m tools.seed-data.download_and_seed --skip-download
"""
from __future__ import annotations

import argparse
import hashlib
import sys
import urllib.request
from pathlib import Path

from loguru import logger


ECDICT_RELEASES = [
    "https://github.com/skywind3000/ECDICT/releases/download/1.0.28/ecdict.csv",
    "https://github.com/skywind3000/ECDICT/releases/latest/download/ecdict.csv",
]

# MD5 of ecdict.csv (1.0.28) for verification
ECDICT_MD5 = ""


def download_ecdict(target: Path) -> bool:
    """下载 ECDICT CSV"""
    if target.exists() and target.stat().st_size > 50_000_000:  # > 50MB
        logger.info(f"ECDICT already exists: {target} ({target.stat().st_size / 1_000_000:.1f} MB)")
        return True

    for url in ECDICT_RELEASES:
        try:
            logger.info(f"Downloading ECDICT from {url} ...")
            target.parent.mkdir(parents=True, exist_ok=True)

            # 下载带进度
            def report(chunk, total, start_time=[0]):
                if start_time[0] == 0:
                    import time
                    start_time[0] = time.time()
                downloaded = chunk * 1024 * 1024  # mb
                pct = min(100, downloaded * 100 // total) if total else 0
                print(f"\r  下载进度: {pct}% ({downloaded / 1024:.1f} MB)", end="", flush=True)

            urllib.request.urlretrieve(url, str(target), reporthook=report)
            print()
            logger.success(f"下载完成: {target.stat().st_size / 1_000_000:.1f} MB")
            return True
        except Exception as e:
            logger.warning(f"下载失败 {url}: {e}")

    logger.error("所有下载源都失败了，请检查网络")
    return False


def run_import():
    """调用 seed.py 导入"""
    from tools.seed_data.seed import main as seed_main
    return seed_main()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--skip-download", action="store_true", help="跳过下载")
    parser.add_argument("--data-dir", type=Path, default=Path(__file__).parent / "data")
    args = parser.parse_args()

    csv_path = args.data_dir / "ecdict.csv"

    if not args.skip_download:
        if not download_ecdict(csv_path):
            return 1

    logger.info("开始导入数据库...")
    return run_import()


if __name__ == "__main__":
    sys.exit(main())