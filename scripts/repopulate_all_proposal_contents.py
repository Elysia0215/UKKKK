import json
import re
import time
import requests
from bs4 import BeautifulSoup
from pathlib import Path

from proposal_quality import apply_quality_gate, validate_proposals

BASE_DIR = Path(__file__).resolve().parent.parent
MONGTTANG_PATH = BASE_DIR / "frontend" / "src" / "data" / "mongttang.json"
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


def needs_real_body(item: dict) -> bool:
    title = (item.get("title") or item.get("TITLE") or "").strip()
    content = (item.get("content") or item.get("CONTENT") or "").strip()
    return (
        not content
        or content == title
        or len(content) < 30
        or "접수된 시민 정책 제안입니다" in content
        or "국민신문고를 통해 접수된" in content
    )

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
        if needs_real_body(item):
            real_text = fetch_real_body(sn)
            if real_text and len(real_text) >= 30:
                item["content"] = real_text
                item["CONTENT"] = real_text
                updated_count += 1
                print(f"[{i+1}/{total}] SN {sn} 원문 복구 성공: {real_text[:40]}...")
                time.sleep(0.05)
            else:
                print(f"[{i+1}/{total}] SN {sn} 원문 복구 실패: 기존 값 유지")

    for item in items:
        apply_quality_gate(item)
    errors = validate_proposals(items)
    if errors:
        raise RuntimeError("품질 검증 실패: " + "; ".join(errors[:10]))
    serialized = json.dumps(items, ensure_ascii=False, indent=2) + "\n"
    MONGTTANG_PATH.write_text(serialized, encoding="utf-8")
    PROPOSALS_PATH.write_text(serialized, encoding="utf-8")
    print(f"\n제안 원문 데이터 동기화 완료! (총 {updated_count}건 웹 원문 추가)")

if __name__ == "__main__":
    main()
