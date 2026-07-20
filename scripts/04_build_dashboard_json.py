"""
4단계: 분류 완료된 데이터를 React 대시보드용 JSON으로 변환
입력: data/processed/상상대로_서울_출산육아_분류완료.csv
출력: data/final/proposals.json, data/final/dashboard_stats.json
"""
import json
import ast
import pandas as pd
from pathlib import Path

IN_PATH = Path("../data/processed/상상대로_서울_출산육아_분류완료.csv")
OUT_DIR = Path("../data/final")


def normalize_reg_date(raw: str) -> str:
    return str(raw).split(" ")[0]


def build_proposals(path: Path) -> list:
    df = pd.read_csv(path)
    proposals = []
    for _, row in df.iterrows():
        district_site = row.get("district_site")
        district = district_site if district_site and district_site != "-" else "미상"

        department_raw = row.get("department")
        try:
            department = ast.literal_eval(department_raw) if isinstance(department_raw, str) else ["미지정"]
        except (ValueError, SyntaxError):
            department = ["미지정"]

        proposals.append({
            "id": f"PROP-{int(row['SN'])}",
            "title": row["TITLE"],
            "content": row.get("content_full") or row["TITLE"],
            "reg_date": normalize_reg_date(row["REG_DATE"]),
            "vote_score": float(row.get("VOTE_SCORE") or 0),
            "comment_cnt": int(row.get("USER_COMMENT_CNT") or 0),
            "reply_yn": row.get("REPLY_YN", "N"),
            "district": district,
            "category": row.get("category", "기타"),
            "department": department,
        })
    return proposals


def build_dashboard_stats(proposals: list) -> dict:
    total = len(proposals)
    unanswered = [p for p in proposals if p["reply_yn"] == "N"]
    avg_vote = sum(p["vote_score"] for p in proposals) / total if total else 0
    return {
        "totalCount": total,
        "avgVoteScore": round(avg_vote, 1),
        "unansweredCount": len(unanswered),
        "unansweredRate": round(len(unanswered) / total * 100, 1) if total else 0,
    }


if __name__ == "__main__":
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    proposals = build_proposals(IN_PATH)
    stats = build_dashboard_stats(proposals)

    with open(OUT_DIR / "proposals.json", "w", encoding="utf-8") as f:
        json.dump(proposals, f, ensure_ascii=False, indent=2)

    with open(OUT_DIR / "dashboard_stats.json", "w", encoding="utf-8") as f:
        json.dump(stats, f, ensure_ascii=False, indent=2)

    print(f"proposals.json 저장 완료: {len(proposals)}건")
    print("dashboard_stats.json:", stats)
    print("\n※ district_stats.json은 통계 파일(합계출산율 등) 컬럼 구조 확인 후 별도 작업 필요")
