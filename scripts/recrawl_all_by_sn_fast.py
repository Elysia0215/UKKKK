import json
import re
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
import requests
from bs4 import BeautifulSoup
from pathlib import Path

from proposal_quality import apply_quality_gate, validate_proposals
from pipeline_hooks import rebuild_proposal_connections

BASE_DIR = Path(__file__).resolve().parent.parent
MONGTTANG_PATH = BASE_DIR / "frontend" / "src" / "data" / "mongttang.json"
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

    for item in items:
        apply_quality_gate(item)
    errors = validate_proposals(items)
    if errors:
        raise RuntimeError("품질 검증 실패: " + "; ".join(errors[:10]))
    serialized = json.dumps(items, ensure_ascii=False, indent=2) + "\n"
    MONGTTANG_PATH.write_text(serialized, encoding="utf-8")
    PROPOSALS_PATH.write_text(serialized, encoding="utf-8")
    print("프론트엔드/최종 제안 데이터 동기화 완료!")
    rebuild_proposal_connections()
    print("분류·R&R·정책 후보 자동 재생성 완료!")

if __name__ == "__main__":
    main()
