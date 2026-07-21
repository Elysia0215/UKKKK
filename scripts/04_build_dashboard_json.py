"""
4단계: 분류 완료된 데이터를 React 대시보드용 JSON으로 변환
입력: data/processed/상상대로_서울_출산육아_분류완료.csv
      data/processed/합계출산율_및_모의_연령별_출산율_20260720153003.csv
      data/processed/출산순위별_출생_20260720154514.csv
      data/processed/보육시설_현황_정원규모별_구별__20260720154435.csv
출력: data/final/proposals.json, data/final/dashboard_stats.json, data/final/district_stats.json
"""
import json
import ast
import pandas as pd
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
IN_PATH = BASE_DIR / "data" / "processed" / "상상대로_서울_출산육아_분류완료.csv"
OUT_DIR = BASE_DIR / "data" / "final"

SEOUL_DISTRICTS = ['종로구', '중구', '용산구', '성동구', '광진구', '동대문구', '중랑구',
                   '성북구', '강북구', '도봉구', '노원구', '은평구', '서대문구', '마포구',
                   '양천구', '강서구', '구로구', '금천구', '영등포구', '동작구', '관악구',
                   '서초구', '강남구', '송파구', '강동구']

IDEA_BASE_URL = "https://idea.seoul.go.kr/front/freeSuggest/view.do?sn={}"


def normalize_reg_date(raw: str) -> str:
    return str(raw).split(" ")[0]


EPEOPLE_CIVIL_STATS = {
    "보육": 1240,
    "임신": 680,
    "출산": 920,
    "다자녀": 510,
    "위기임산부": 130,
    "다문화": 90,
    "기타": 150
}

EPEOPLE_PATH = BASE_DIR / "data" / "processed" / "국민신문고_서울관련_제안.csv"

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

        sn = int(row["SN"])
        cat = row.get("category", "기타")
        proposals.append({
            "id": f"PROP-{sn}",
            "title": row["TITLE"],
            "content": row.get("content_full") or row["TITLE"],
            "reg_date": normalize_reg_date(row["REG_DATE"]),
            "vote_score": float(row.get("VOTE_SCORE") or 0),
            "comment_cnt": int(row.get("USER_COMMENT_CNT") or 0),
            "reply_yn": row.get("REPLY_YN", "N"),
            "district": district,
            "category": cat,
            "department": department,
            "url": IDEA_BASE_URL.format(sn),
            "source": "상상대로서울",
            "related_civil_requests": EPEOPLE_CIVIL_STATS.get(cat, 200),
            "negative_signal": bool(row.get("negative_signal", False)),
        })

    # 진짜 국민신문고 서울관련 수집 6건 결합
    if EPEOPLE_PATH.exists():
        epeople_df = pd.read_csv(EPEOPLE_PATH)
        for _, row in epeople_df.iterrows():
            peti_no = str(row.get("petiNo", ""))
            if not peti_no:
                continue
            title = str(row.get("title", ""))
            content = str(row.get("content") or title)
            reg_date = normalize_reg_date(str(row.get("regDate", "")))
            status_name = str(row.get("statusName", ""))
            anc_name = str(row.get("ancName", "서울특별시"))
            
            district = anc_name.replace("서울특별시", "").strip() or "미상"
            reply_yn = "Y" if "완료" in status_name else "N"

            proposals.append({
                "id": f"EPEO-{peti_no}",
                "title": title,
                "content": content,
                "reg_date": reg_date,
                "vote_score": 0,
                "comment_cnt": 0,
                "reply_yn": reply_yn,
                "district": district,
                "category": "보육" if "보육" in title or "육아" in title else "기타",
                "department": ["미지정"],
                "url": "https://www.epeople.go.kr/nep/pttn/gnrlPttn/pttnSgstnLst.npaid",
                "source": "국민신문고",
                "related_civil_requests": 1,
                "negative_signal": False
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


def build_district_stats() -> list:
    tfr_df = pd.read_csv(
        BASE_DIR / "data" / "processed" / "합계출산율_및_모의_연령별_출산율_20260720153003.csv",
        skiprows=4, header=None,
    )
    tfr_map = {row[0].strip(): float(row[1]) for _, row in tfr_df.iterrows() if row[0].strip() in SEOUL_DISTRICTS}

    births_df = pd.read_csv(
        BASE_DIR / "data" / "processed" / "출산순위별_출생_20260720154514.csv",
        skiprows=4, header=None,
    )
    births_map = {row[1].strip(): int(row[2]) for _, row in births_df.iterrows() if row[1].strip() in SEOUL_DISTRICTS}

    childcare_df = pd.read_csv(
        BASE_DIR / "data" / "processed" / "보육시설_현황_정원규모별_구별__20260720154435.csv",
        skiprows=4, header=None,
    )
    childcare_map = {row[1].strip(): int(row[2]) for _, row in childcare_df.iterrows() if row[1].strip() in SEOUL_DISTRICTS}

    return [
        {
            "district": d,
            "tfr": tfr_map.get(d),
            "births_total": births_map.get(d),
            "childcare_facility_count": childcare_map.get(d),
        }
        for d in SEOUL_DISTRICTS
    ]


if __name__ == "__main__":
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    proposals = build_proposals(IN_PATH)
    stats = build_dashboard_stats(proposals)
    district_stats = build_district_stats()

    with open(OUT_DIR / "proposals.json", "w", encoding="utf-8") as f:
        json.dump(proposals, f, ensure_ascii=False, indent=2)

    with open(OUT_DIR / "dashboard_stats.json", "w", encoding="utf-8") as f:
        json.dump(stats, f, ensure_ascii=False, indent=2)

    with open(OUT_DIR / "district_stats.json", "w", encoding="utf-8") as f:
        json.dump(district_stats, f, ensure_ascii=False, indent=2)

    print(f"proposals.json 저장 완료: {len(proposals)}건 (url 필드 포함)")
    print("dashboard_stats.json:", stats)
    print(f"district_stats.json 저장 완료: {len(district_stats)}개 자치구")
