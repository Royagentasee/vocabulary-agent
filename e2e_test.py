"""完整 e2e 测试"""
import urllib.request
import json
import sys
from pathlib import Path

print("=" * 60)
print("Vocabulary Agent - End-to-End Test")
print("=" * 60)

# Test 1: AI Gateway health
print("\n[Test 1] AI Gateway health")
try:
    resp = urllib.request.urlopen("http://localhost:8000/health", timeout=5)
    print(f"  Status: {resp.status}")
    body = json.loads(resp.read())
    print(f"  Body: {body}")
except Exception as e:
    print(f"  FAIL: {e}")
    sys.exit(1)

# Test 2: Web UI
print("\n[Test 2] Web UI accessible")
try:
    resp = urllib.request.urlopen("http://localhost:5173/", timeout=5)
    print(f"  Status: {resp.status}")
    print(f"  Length: {len(resp.read())} bytes")
except Exception as e:
    print(f"  FAIL: {e}")

# Test 3: Word search (computer)
print("\n[Test 3] Word search - 'computer'")
try:
    resp = urllib.request.urlopen("http://localhost:8000/api/words/search?q=computer&limit=5", timeout=10)
    data = json.loads(resp.read())
    print(f"  Found: {data.get('total', 0)}")
    for item in (data.get("items") or [])[:5]:
        print(f"    - {item.get('headword')}: {item.get('translation')}")
except Exception as e:
    print(f"  FAIL: {e}")

# Test 4: AI explain (computer)
print("\n[Test 4] AI explain - 'computer'")
try:
    req = urllib.request.Request(
        "http://localhost:8000/api/ai/explain",
        data=json.dumps({"headword": "computer"}).encode('utf-8'),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    resp = urllib.request.urlopen(req, timeout=30)
    data = json.loads(resp.read())
    print(f"  Headword: {data.get('headword')}")
    print(f"  IPA: {data.get('ipa')}")
    print(f"  Memory tip: {data.get('memory_tip', '')[:80]}")
    print(f"  Etymology: {data.get('etymology', '')[:80]}")
    print(f"  Senses: {len(data.get('senses', []))}")
    print(f"  Examples: {len(data.get('examples', []))}")
except Exception as e:
    print(f"  FAIL: {e}")

# Test 5: Search via Vite proxy
print("\n[Test 5] Vite proxy - word search via :5173")
try:
    resp = urllib.request.urlopen("http://localhost:5173/api/words/search?q=computer", timeout=10)
    data = json.loads(resp.read())
    print(f"  Found: {data.get('total', 0)} (via proxy)")
except Exception as e:
    print(f"  FAIL: {e}")

print("\n" + "=" * 60)
print("All tests completed.")
print("=" * 60)