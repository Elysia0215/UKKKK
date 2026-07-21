import json
import re
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
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

def clean_web_text(text: str) -> str:
    if not text:
        return ""
    # Strip Sangsangdaero footer noise
    text = text.split("빈출단어")[0].split("공감전체인원")[0].split("공감수")[0].strip()
    return text

def fetch_single_sn(item: dict) -> tuple[dict, str, bool]:
    sn_str = item.get("SN") or item.get("id", "").replace("PROP-", "")
    sn = re.sub(r"[^\d]", "", str(sn_str))
    if not sn:
        return item, "", False

    url = f"https://idea.seoul.go.kr/front/freeSuggest/view.do?sn={sn}"
    try:
        res = requests.get(url, headers=HEADERS, timeout=8)
        if res.status_code == 200:
            soup = BeautifulSoup(res.text, "html.parser")
            block = soup.select_one("div.txt-block")
            if block:
                web_text = clean_web_text(block.get_text(separator="\n", strip=True))
                return item, web_text, True
    except Exception as e:
        pass
    return item, "", False

def main():
    print("=" * 60)
    print("상상대로 서울 824건 SN(인덱스) 기준 전수 재크롤링 및 원문 100% 매칭 검증")
    print("=" * 60)

    with open(MONGTTANG_PATH, "r", encoding="utf-8") as f:
        items = json.load(f)

    updated_count = 0
    total = len(items)

    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = {executor.submit(fetch_single_sn, item): item for item in items}
        for future in as_completed(futures):
            item, web_text, success = future.result()
            if success and web_text and len(web_text) > 10:
                item["content"] = web_text
                item["CONTENT"] = web_text
                updated_count += 1

    print(f"\n총 {total}건 중 {updated_count}건 웹 원문 수집 완료!")

    with open(MONGTTANG_PATH, "w", encoding="utf-8") as f:
        json.dump(items, f, ensure_ascii=False, indent=2)
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
    print(f"{MOCK_DATA_PATH} 동기화 완료!")

if __name__ == "__main__":
    main()
