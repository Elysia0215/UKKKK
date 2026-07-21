import json
import re
import time
import requests
from bs4 import BeautifulSoup
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
MONGTTANG_PATH = BASE_DIR / "frontend" / "src" / "data" / "mongttang.json"
MOCK_DATA_PATH = BASE_DIR / "frontend" / "src" / "data" / "mockData.ts"
CSV_PATH = BASE_DIR / "data" / "processed" / "ver2_expanded" / "상상대로_출산양육관련_수집결과_ver2.csv"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
}

def clean_content(text):
    if not text:
        return ""
    text = text.split("빈출단어")[0].split("공감전체인원")[0].strip()
    return text

def fetch_detail(sn_str: str) -> str:
    sn = re.sub(r"[^\d]", "", sn_str)
    if not sn:
        return ""
    url = f"https://idea.seoul.go.kr/front/freeSuggest/view.do?sn={sn}"
    try:
        res = requests.get(url, headers=HEADERS, timeout=8)
        res.raise_for_status()
        soup = BeautifulSoup(res.text, "html.parser")
        block = soup.select_one("div.txt-block")
        if block:
            return clean_content(block.get_text(separator="\n", strip=True))
    except Exception as e:
        print(f"Error fetching {sn}: {e}")
    return ""

def main():
    print("=" * 60)
    print("상상대로 서울 824건 제안 원문 Real Web Scraper 가동")
    print("=" * 60)

    with open(MONGTTANG_PATH, "r", encoding="utf-8") as f:
        items = json.load(f)

    updated_count = 0
    total = len(items)

    for i, item in enumerate(items):
        title = item.get("TITLE", "") or item.get("title", "")
        content = item.get("CONTENT", "") or item.get("content", "")
        sn_id = item.get("SN", "") or item.get("id", "")

        is_fallback = "접수된 시민 정책 제안입니다" in content or content == title or len(content.strip()) < 30

        if is_fallback:
            real_text = fetch_detail(sn_id)
            if real_text and len(real_text) > 10:
                item["CONTENT"] = real_text
                item["content"] = real_text
                updated_count += 1
                print(f"[{i+1}/{total}] {sn_id} 원문 확보 성공! ({len(real_text)}자)")
            else:
                print(f"[{i+1}/{total}] {sn_id} 원문 가져오기 실패 (유지)")
            time.sleep(0.15)

    if updated_count > 0:
        with open(MONGTTANG_PATH, "w", encoding="utf-8") as f:
            json.dump(items, f, ensure_ascii=False, indent=2)
        print(f"\n{MONGTTANG_PATH} 갱신 완료! (총 {updated_count}건 원문 업데이트)")

        # Update mockData.ts
        with open(MOCK_DATA_PATH, "r", encoding="utf-8") as f:
            mock_text = f.read()

        # Build ID to real_content map
        real_map = {}
        for it in items:
            p_id = it.get("id") or f"PROP-{int(float(it.get('SN', 0)))}" if it.get('SN') else ""
            c_text = it.get("CONTENT") or it.get("content")
            if p_id and c_text:
                real_map[p_id] = c_text

        # Replace in mockData.ts
        def replancer(match):
            prop_id = match.group(1)
            old_content = match.group(2)
            if prop_id in real_map and "접수된 시민 정책 제안입니다" in old_content:
                new_c = real_map[prop_id].replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n')
                return f'"id": "{prop_id}",\n    "title": "{match.group(3)}",\n    "content": "{new_c}"'
            return match.group(0)

        # Simple regex replace for mockData.ts entries
        for p_id, r_text in real_map.items():
            escaped_text = r_text.replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n')
            pattern = re.compile(rf'("id":\s*"{re.escape(p_id)}",\s*"title":\s*"([^"]+)",\s*"content":\s*")[^"]+(")')
            mock_text = pattern.sub(rf'\g<1>{escaped_text}\g<3>', mock_text)

        with open(MOCK_DATA_PATH, "w", encoding="utf-8") as f:
            f.write(mock_text)
        print(f"{MOCK_DATA_PATH} 갱신 완료!")

    print("전체 원문 스크래핑 및 동기화 작업 완료!")

if __name__ == "__main__":
    main()
