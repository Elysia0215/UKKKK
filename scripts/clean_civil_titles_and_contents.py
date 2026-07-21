import json
import html
import time
import requests
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
CIVIL_JSON_PATH = BASE_DIR / "frontend" / "src" / "data" / "civil_requests_all.json"
FINAL_JSON_PATH = BASE_DIR / "data" / "final" / "civil_requests_all.json"

SERVICE_KEY = "2BOebv4LMSyFeF371dGJhDpzY4s/1CsQeSR5S+CsdwrNKEd5SP+pvZFwrE4yUH/JkIdO+qBzHdMDzNqClrc2Jg=="
ITEM_URL = "https://apis.data.go.kr/1140100/OpenProposalService2/OpenProposalItem"
HEADERS = {"User-Agent": "Mozilla/5.0"}

def clean_text(text: str) -> str:
    if not text:
        return ""
    # HTML Entity unescape (e.g. &#x28; -> (, &#x29; -> ), &#x26; -> &)
    text = html.unescape(text)
    # Fix repeated HTML escapes
    for _ in range(3):
        if "&#x" in text or "&amp;" in text:
            text = html.unescape(text)
        else:
            break
    return text.strip()

def fetch_full_item(peti_no: str) -> tuple[str, str]:
    params = {"serviceKey": SERVICE_KEY, "petiNo": peti_no}
    try:
        res = requests.get(ITEM_URL, params=params, headers=HEADERS, timeout=8)
        res.raise_for_status()
        data = res.json()
        item = data.get("resultData") or data.get("result") or data.get("item") or {}
        full_title = clean_text(item.get("title") or "")
        content = clean_text(item.get("content") or item.get("contents") or "")
        idea = clean_text(item.get("improveIdea") or "")
        
        full_content = []
        if content:
            full_content.append(content)
        if idea:
            full_content.append(f"[개선방안/제안내용]\n{idea}")
            
        return full_title, "\n\n".join(full_content)
    except Exception as e:
        pass
    return "", ""

def main():
    print("=" * 60)
    print("국민신문고 582건 전체 제목 풀텍스트 복원 및 HTML 이스케이프 정화")
    print("=" * 60)

    with open(CIVIL_JSON_PATH, "r", encoding="utf-8") as f:
        items = json.load(f)

    updated_count = 0
    total = len(items)

    for i, item in enumerate(items):
        peti_no = item.get("peti_no") or item.get("id", "").replace("1AB-", "")
        old_title = item.get("title", "")
        old_content = item.get("content", "")

        # Clean text first
        cleaned_title = clean_text(old_title)
        cleaned_content = clean_text(old_content)

        # If title was truncated with '..' or contains HTML entity remains
        is_truncated = ".." in cleaned_title or "&#" in old_title or len(cleaned_title) < 25

        if is_truncated or len(cleaned_content) < 50:
            full_t, full_c = fetch_full_item(peti_no)
            if full_t and len(full_t) > len(cleaned_title):
                cleaned_title = full_t
            if full_c and len(full_c) > len(cleaned_content):
                cleaned_content = full_c
            updated_count += 1
            print(f"[{i+1}/{total}] {peti_no} 제목 & 본문 완벽 복원: {cleaned_title[:30]}...")
            time.sleep(0.08)

        item["title"] = cleaned_title
        item["content"] = cleaned_content

    with open(CIVIL_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(items, f, ensure_ascii=False, indent=2)
    with open(FINAL_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(items, f, ensure_ascii=False, indent=2)

    print(f"\n{CIVIL_JSON_PATH} 갱신 완료! (총 {total}건 제목/본문 풀텍스트 디코딩 및 복원 완료)")

if __name__ == "__main__":
    main()
