"""
1단계: 상상대로 서울 자유제안 전체 수집 + 출산·육아 키워드 필터링
(팀 전체 1회만 실행하면 됨 - 4명이 나눠서 할 필요 없음)
출력: data/processed/상상대로_서울_전체.csv
      data/processed/상상대로_서울_출산육아_필터링.csv
"""
import requests
import pandas as pd
import time
from pathlib import Path

API_KEY = "6a564a7772746e6532306861565169"
SERVICE = "ChunmanFreeSuggestions"
BASE_URL = f"http://openapi.seoul.go.kr:8088/{API_KEY}/json/{SERVICE}"

KEYWORDS = [
    "출산", "육아", "보육", "임신", "다자녀", "산후조리", "어린이집", "아이돌봄", "저출생", "돌봄",
    "난임", "부모급여", "아동수당", "위기임산부", "미혼모", "보호출산",
    "다태아", "쌍둥이", "모유수유", "산후우울", "유모차",
]
OUT_DIR = Path("../data/processed")


def fetch_page(start: int, end: int) -> dict:
    url = f"{BASE_URL}/{start}/{end}/"
    res = requests.get(url, timeout=10)
    res.raise_for_status()
    return res.json().get(SERVICE, {})


def collect_all() -> pd.DataFrame:
    first = fetch_page(1, 1)
    total_count = int(first.get("list_total_count", 0))
    print(f"전체 건수: {total_count}")

    all_rows = []
    step = 1000
    for start in range(1, total_count + 1, step):
        end = min(start + step - 1, total_count)
        chunk = fetch_page(start, end)
        all_rows.extend(chunk.get("row", []))
        print(f"{start}~{end} 수집 완료 (누적 {len(all_rows)})")
        time.sleep(0.3)

    return pd.DataFrame(all_rows)


def filter_by_keyword(df: pd.DataFrame) -> pd.DataFrame:
    pattern = "|".join(KEYWORDS)
    mask = df["TITLE"].str.contains(pattern, na=False) | df["CONTENT"].str.contains(pattern, na=False)
    return df[mask]


if __name__ == "__main__":
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    df = collect_all()
    df.to_csv(OUT_DIR / "상상대로_서울_전체.csv", index=False, encoding="utf-8-sig")

    df_filtered = filter_by_keyword(df)
    df_filtered.to_csv(OUT_DIR / "상상대로_서울_출산육아_필터링.csv", index=False, encoding="utf-8-sig")
    print(f"필터링 후 {len(df_filtered)}건 저장 완료")
