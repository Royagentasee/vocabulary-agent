"""下载 ECDICT — 兼容 Windows + PowerShell 的简单版本（多镜像 fallback）"""
import os
import sys
import urllib.request
from pathlib import Path

# 多个镜像源，按优先级排序
URLS = [
    # 1. 国内镜像（最快）
    "https://gh-proxy.com/https://raw.githubusercontent.com/skywind3000/ECDICT/master/ecdict.csv",
    "https://mirror.ghproxy.com/https://raw.githubusercontent.com/skywind3000/ECDICT/master/ecdict.csv",
    # 2. jsDelivr CDN（很稳定）
    "https://cdn.jsdelivr.net/gh/skywind3000/ECDICT@master/ecdict.csv",
    # 3. GitHack（GitHub raw 加速）
    "https://raw.gitmirror.com/skywind3000/ECDICT/master/ecdict.csv",
    # 4. GitHub 直接（最慢但最稳定）
    "https://raw.githubusercontent.com/skywind3000/ECDICT/master/ecdict.csv",
]

EXPECTED_SIZE = 90_000_000  # 90MB


def download_with_resume(url: str, target: Path, timeout: int = 120) -> bool:
    """下载（支持断点续传）"""
    try:
        # 检查已有大小
        existing = target.stat().st_size if target.exists() else 0

        req = urllib.request.Request(url)
        if existing > 0:
            req.add_header('Range', f'bytes={existing}-')

        with urllib.request.urlopen(req, timeout=timeout) as resp:
            total = int(resp.headers.get('Content-Length', 0))
            if total and existing:
                total += existing

            mode = 'ab' if existing else 'wb'
            downloaded = existing

            with target.open(mode) as f:
                while True:
                    chunk = resp.read(64 * 1024)
                    if not chunk:
                        break
                    f.write(chunk)
                    downloaded += len(chunk)
                    if total:
                        pct = min(100, downloaded * 100 // total)
                        print(f"\r  进度: {pct}% ({downloaded/1_000_000:.1f} MB)", end='', flush=True)

            print()
            final_size = target.stat().st_size
            if final_size > 50_000_000:
                return True
            else:
                print(f"  文件太小 ({final_size / 1_000_000:.1f} MB)，可能下载不完整")
                return False
    except Exception as e:
        print(f"  失败: {type(e).__name__}: {e}")
        return False


def main():
    target = Path(__file__).parent / "data" / "ecdict.csv"
    target.parent.mkdir(parents=True, exist_ok=True)

    if target.exists() and target.stat().st_size > 50_000_000:
        print(f"已存在: {target} ({target.stat().st_size / 1_000_000:.1f} MB)")
        return 0

    for i, url in enumerate(URLS, 1):
        print(f"[{i}/{len(URLS)}] 尝试: {url[:80]}...")
        if download_with_resume(url, target):
            print(f"下载完成: {target.stat().st_size / 1_000_000:.1f} MB")
            return 0
        print(f"  切换下一个镜像...")

    print("所有下载源都失败了")
    print("手动下载:")
    print("  1. 用浏览器打开 https://github.com/skywind3000/ECDICT")
    print("  2. 下载 ecdict.csv 文件")
    print(f"  3. 保存到 {target}")
    return 1


if __name__ == "__main__":
    sys.exit(main())