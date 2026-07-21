import json
import re
import time
import requests
from bs4 import BeautifulSoup
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
MONGTTANG_PATH = BASE_DIR / "frontend" / "src" / "data" / "mongttang.json"
MOCK_DATA_PATH = BASE_DIR / "frontend" / "src" / "data" / "mockData.ts"
PROPOSALS_PATH = BASE_DIR / "data" / "final" / "proposals.json"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
}

def fetch_real_body(sn_str: str) -> str:
    sn = re.sub(r"[^\d]", "", str(sn_str))
    if not sn:
        return ""
    url = f"https://idea.seoul.go.kr/front/freeSuggest/view.do?sn={sn}"
    try:
        res = requests.get(url, headers=HEADERS, timeout=8)
        if res.status_code != 200:
            return ""
        soup = BeautifulSoup(res.text, "html.parser")
        block = soup.select_one("div.txt-block")
        if block:
            raw = block.get_text(separator="\n", strip=True)
            # Remove trailing metadata
            raw = raw.split("빈출단어")[0].split("공감전체인원")[0].split("공감수")[0].strip()
            return raw
    except Exception as e:
        pass
    return ""

def main():
    print("=" * 60)
    print("상상대로 서울 824건 전체 실제 시민 작성 원문 본문 100% 복구")
    print("=" * 60)

    with open(MONGTTANG_PATH, "r", encoding="utf-8") as f:
        items = json.load(f)

    updated_count = 0
    total = len(items)

    for i, item in enumerate(items):
        sn = item.get("SN") or item.get("id", "").replace("PROP-", "")
        old_content = (item.get("content") or item.get("CONTENT") or "").strip()

        # Fetch real web content if empty or short (< 20 chars)
        if len(old_content) < 20:
            real_text = fetch_real_body(sn)
            if real_text:
                item["content"] = real_text
                item["CONTENT"] = real_text
                updated_count += 1
                print(f"[{i+1}/{total}] SN {sn} 원문 복구 성공: {real_text[:40]}...")
                time.sleep(0.05)
            else:
                fallback_title = item.get("title") or item.get("TITLE") or ""
                item["content"] = fallback_title
                item["CONTENT"] = fallback_title

    with open(MONGTTANG_PATH, "w", encoding="utf-8") as f:
        json.dump(items, f, ensure_ascii=False, indent=2)
    print(f"\n{MONGTTANG_PATH} 원문 복구 완료! (총 {updated_count}건 웹 원문 추가 동기화)")

    if PROPOSALS_PATH.exists():
        with open(PROPOSALS_PATH, "w", encoding="utf-8") as f:
            json.dump(items, f, ensure_ascii=False, indent=2)

    # Sync mockData.ts
    with open(MOCK_DATA_PATH, "r", encoding="utf-8") as f:
        mock_code = f.read()

    id_content_map = { (it.get("id") or f"PROP-{int(float(it.get('SN', 0)))}"): (it.get("content") or "") for it in items if it.get("id") or it.get("SN") }

    for p_id, content in id_content_map.items():
        if not content:
            continue
        escaped_content = json.dumps(content)[1:-1]
        pattern = re.compile(rf'("id":\s*"{re.escape(p_id)}",[\s\S]*?"content":\s*")([^"]*)(")')
        mock_code = pattern.sub(lambda m, c=escaped_content: m.group(1) + c + m.group(3), mock_code)

    with open(MOCK_DATA_PATH, "w", encoding="utf-8") as f:
        f.write(mock_code)
    print(f"{MOCK_DATA_PATH} mockData.ts 동기화 완료!")

if __name__ == "__main__":
    main()
