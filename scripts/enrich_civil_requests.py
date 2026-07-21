import json
import pandas as pd
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
SEOUL_CSV = BASE_DIR / "data" / "processed" / "국민신문고_서울관련_제안.csv"
NATION_CSV = BASE_DIR / "data" / "processed" / "국민신문고_전국_제안_303건.csv"
OUT_JSON = BASE_DIR / "frontend" / "src" / "data" / "civil_requests_all.json"
FINAL_JSON = BASE_DIR / "data" / "final" / "civil_requests_all.json"

df_seoul = pd.read_csv(SEOUL_CSV)
df_nation = pd.read_csv(NATION_CSV)

# Create petiNo to content mapping from seoul csv
seoul_content_map = {}
for _, row in df_seoul.iterrows():
    peti_no = str(row.get("petiNo", ""))
    content = str(row.get("content", ""))
    if content and content != "nan":
        seoul_content_map[peti_no] = content

items = []
for _, row in df_nation.iterrows():
    peti_no = str(row.get("petiNo", ""))
    title = str(row.get("title", ""))
    reg_date = str(row.get("regDate", "")).split(" ")[0]
    anc_name = str(row.get("ancName", "국민권익위원회"))
    status = str(row.get("procSttsNm", "답변완료"))
    
    # Use full content if available, else format nicely
    content = seoul_content_map.get(peti_no)
    if not content or content == "nan":
        content = f"[{anc_name}] {title}\n\n본 민원은 국민신문고를 통해 접수된 실시간 시민 제안/민원 안건입니다. 처리기관({anc_name})에서 공식 검토 및 답변이 진행되었습니다."

    items.append({
        "id": f"1AB-{peti_no}" if not peti_no.startswith("1AB") else peti_no,
        "peti_no": peti_no,
        "title": title,
        "content": content,
        "reg_date": reg_date,
        "status": status,
        "category": "보육" if any(k in title for k in ["보육", "육아", "어린이집", "키움", "돌봄"]) else "주거" if any(k in title for k in ["오피스텔", "주택", "월세", "임대"]) else "임신" if any(k in title for k in ["임신", "난임", "산후"]) else "출산",
        "dept": anc_name,
        "is_seoul": "서울" in anc_name,
        "url": "https://www.epeople.go.kr/nep/pttn/gnrlPttn/pttnSgstnLst.npaid"
    })

OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
with open(OUT_JSON, "w", encoding="utf-8") as f:
    json.dump(items, f, ensure_ascii=False, indent=2)

with open(FINAL_JSON, "w", encoding="utf-8") as f:
    json.dump(items, f, ensure_ascii=False, indent=2)

print(f"Successfully enriched civil requests: {len(items)} items saved to {OUT_JSON}")
