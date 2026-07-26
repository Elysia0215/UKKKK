import json
import re
import time
from html.parser import HTMLParser
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from proposal_quality import apply_quality_gate, validate_proposals
from pipeline_hooks import rebuild_proposal_connections

BASE_DIR = Path(__file__).resolve().parent.parent
MONGTTANG_PATH = BASE_DIR / "frontend" / "src" / "data" / "mongttang.json"
PROPOSALS_PATH = BASE_DIR / "data" / "final" / "proposals.json"
CSV_PATH = BASE_DIR / "data" / "processed" / "ver2_expanded" / "상상대로_출산양육관련_수집결과_ver2.csv"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
}

class TxtBlockParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.capture_depth = 0
        self.parts = []

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        classes = attrs_dict.get("class", "")
        if self.capture_depth > 0:
            self.capture_depth += 1
        elif tag == "div" and "txt-block" in classes.split():
            self.capture_depth = 1

    def handle_endtag(self, tag):
        if self.capture_depth > 0:
            self.capture_depth -= 1

    def handle_data(self, data):
        if self.capture_depth > 0:
            text = data.strip()
            if text:
                self.parts.append(text)

    def text(self):
        return "\n".join(self.parts)

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
        req = Request(url, headers=HEADERS)
        with urlopen(req, timeout=8) as res:
            html = res.read().decode("utf-8", errors="replace")
        parser = TxtBlockParser()
        parser.feed(html)
        return clean_content(parser.text())
    except (HTTPError, URLError, TimeoutError, OSError) as e:
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

        is_fallback = (
            not content.strip()
            or "상세 원문이 현재 화면 데이터에 연결되지 않았습니다" in content
            or "접수된 시민 정책 제안입니다" in content
            or content == title
            or len(content.strip()) < 50
        )

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
        for item in items:
            apply_quality_gate(item)
        errors = validate_proposals(items)
        if errors:
            raise RuntimeError("품질 검증 실패: " + "; ".join(errors[:10]))
        serialized = json.dumps(items, ensure_ascii=False, indent=2) + "\n"
        MONGTTANG_PATH.write_text(serialized, encoding="utf-8")
        PROPOSALS_PATH.write_text(serialized, encoding="utf-8")
        print(f"\n{MONGTTANG_PATH} 갱신 완료! (총 {updated_count}건 원문 업데이트)")
        print(f"{PROPOSALS_PATH} 동기화 완료!")
        rebuild_proposal_connections()
        print("분류·R&R·정책 후보 자동 재생성 완료!")

    print("전체 원문 스크래핑 및 동기화 작업 완료!")

if __name__ == "__main__":
    main()
