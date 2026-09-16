"""综合 e2e 测试：覆盖多种词 + AI 解释"""
import urllib.request
import json
import sys
from pathlib import Path

# Set stdout to UTF-8 for Windows console
import sys
sys.stdout.reconfigure(encoding='utf-8')

results = {'pass': 0, 'fail': 0, 'errors': []}

def test(name, fn):
    try:
        result = fn()
        # Treat empty string as failure
        if isinstance(result, str) and not result.strip():
            result = None
        # Pass if result is truthy (not False / None / empty)
        if result and result is not False:
            results['pass'] += 1
            print(f"  [PASS] {name}")
        else:
            results['fail'] += 1
            print(f"  [FAIL] {name}: {result}")
    except Exception as e:
        results['fail'] += 1
        print(f"  [FAIL] {name}: {e}")
        results['errors'].append((name, str(e)))

print("=" * 70)
print("Vocabulary Agent - Comprehensive E2E Test")
print("=" * 70)

# Test 1: AI Gateway health
print("\n[Test 1] AI Gateway health")
test('health 200 OK', lambda: urllib.request.urlopen("http://localhost:8000/health", timeout=5).status == 200)

# Test 2: Web UI
print("\n[Test 2] Web UI")
test('web 200 OK', lambda: urllib.request.urlopen("http://localhost:5173/", timeout=5).status == 200)

# Test 3: Word search - various queries
print("\n[Test 3] Word search - various queries")
test_queries = ['computer', 'art', 'school', 'science', 'language', 'analysis', 'performance']
for q in test_queries:
    def make_test(qq):
        def _t():
            req = urllib.request.Request(f"http://localhost:8000/api/words/search?q={qq}&limit=3")
            resp = urllib.request.urlopen(req, timeout=10)
            data = json.loads(resp.read())
            return data.get('total', 0) > 0
        return _t
    test(f"search '{q}'", make_test(q))

# Test 4: AI explain - various words
print("\n[Test 4] AI explain")
test_words = ['computer', 'science', 'language']
for w in test_words:
    def make_ai_test(word):
        def _t():
            req = urllib.request.Request(
                "http://localhost:8000/api/ai/explain",
                data=json.dumps({"headword": word}).encode('utf-8'),
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            resp = urllib.request.urlopen(req, timeout=30)
            data = json.loads(resp.read())
            # 用文件输出避免 GBK 问题
            out_file = Path(f"ai_test_{word}.json")
            out_file.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
            return len(data.get('senses', [])) > 0 and data.get('memory_tip')
        return _t
    test(f"explain '{w}'", make_ai_test(w))
    if Path(f"ai_test_{w}.json").exists():
        data = json.loads(Path(f"ai_test_{w}.json").read_text(encoding='utf-8'))
        print(f"    -> memory_tip: {data.get('memory_tip', '')[:80]}")

# Test 5: Vite proxy
print("\n[Test 5] Vite proxy (web -> AI gateway)")
test('proxy search', lambda: urllib.request.urlopen("http://localhost:5173/api/words/search?q=computer", timeout=10).status == 200)

# Summary
print("\n" + "=" * 70)
print(f"Total: {results['pass']} passed, {results['fail']} failed")
print("=" * 70)

if results['errors']:
    print("\nErrors:")
    for name, err in results['errors']:
        print(f"  - {name}: {err[:100]}")

sys.exit(0 if results['fail'] == 0 else 1)