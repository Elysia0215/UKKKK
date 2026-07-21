import json
import re
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
MONGTTANG_PATH = BASE_DIR / "frontend" / "src" / "data" / "mongttang.json"
MOCK_DATA_PATH = BASE_DIR / "frontend" / "src" / "data" / "mockData.ts"
PROPOSALS_PATH = BASE_DIR / "data" / "final" / "proposals.json"

NOISE_PATTERNS = [
    r"상상대로 서울[\s\S]*?서울을 바꾸는 생각, 여기서 시작됩니다\.\s*",
    r"상상대로 서울[\s\S]*?로그인\s*",
    r"함께 참여해요[\s\S]*?로그인\s*",
    r"상상대로 서울\s+함께 참여해요\s+시민제안[\s\S]*?로그인\s*",
    r"서\*\*님의 프로필[^\n]*",
    r"네이버서 \* \*\s*",
    r"제안접수\s*\d{4}\.\d{2}\.\d{2}\.[\s\S]*?현재 단계\s*",
    r"시민의견\s*:\s*\d+[^\n]*",
    r"빈출단어\s*:[^\n]*",
    r"공감\s+공감",
    r"스크랩공유"
]

def clean_gnb_noise(text: str) -> str:
    if not text:
        return ""
    
    # Apply regex cleanups
    for pattern in NOISE_PATTERNS:
        text = re.sub(pattern, "", text, flags=re.IGNORECASE)

    lines = [line.strip() for line in text.split("\n") if line.strip()]
    
    # Drop leading boilerplate lines if any remain
    clean_lines = []
    ignoring = True
    for line in lines:
        if ignoring:
            if any(k in line for k in ["상상대로 서울", "함께 참여해요", "시민제안", "서울시가 묻습니다", "검색어를 입력하세요", "로그인", "프로필"]):
                continue
            if re.search(r"제안접수\d{4}", line) or re.search(r"시민의견\s*:", line) or "공감 마감" in line:
                continue
            ignoring = False
        clean_lines.append(line)

    return "\n\n".join(clean_lines).strip()

def main():
    print("=" * 60)
    print("상상대로 서울 182건 GNB 메뉴/프로필 헤더 노이즈 100% 정제")
    print("=" * 60)

    with open(MONGTTANG_PATH, "r", encoding="utf-8") as f:
        items = json.load(f)

    cleaned_count = 0
    for item in items:
        old_content = item.get("content") or item.get("CONTENT") or ""
        cleaned = clean_gnb_noise(old_content)
        if cleaned != old_content:
            item["content"] = cleaned
            item["CONTENT"] = cleaned
            cleaned_count += 1

    with open(MONGTTANG_PATH, "w", encoding="utf-8") as f:
        json.dump(items, f, ensure_ascii=False, indent=2)
    print(f"{MONGTTANG_PATH} GNB 노이즈 정제 완료! (총 {cleaned_count}건 정제)")

    if PROPOSALS_PATH.exists():
        with open(PROPOSALS_PATH, "w", encoding="utf-8") as f:
            json.dump(items, f, ensure_ascii=False, indent=2)

    # Sync mockData.ts
    with open(MOCK_DATA_PATH, "r", encoding="utf-8") as f:
        mock_code = f.read()

    id_content_map = { (it.get("id") or f"PROP-{int(float(it.get('SN', 0)))}"): it.get("content") for it in items if it.get("id") or it.get("SN") }

    for p_id, content in id_content_map.items():
        if not content:
            continue
        # Escape quotes for TS string literal
        escaped_content = json.dumps(content)[1:-1]
        pattern = re.compile(rf'("id":\s*"{re.escape(p_id)}",[\s\S]*?"content":\s*")([^"]+)(")')
        mock_code = pattern.sub(lambda m, c=escaped_content: m.group(1) + c + m.group(3), mock_code)

    with open(MOCK_DATA_PATH, "w", encoding="utf-8") as f:
        f.write(mock_code)
    print(f"{MOCK_DATA_PATH} 동기화 완료!")

if __name__ == "__main__":
    main()
