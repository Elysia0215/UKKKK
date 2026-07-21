"""
국민신문고 공개제안조회서비스(OpenProposalService2)에서 전국 데이터를 키워드로 수집하고,
처리기관명(ancName)에 '서울'이 포함된 것만 걸러서 상상대로 서울 데이터와 합칠 수 있는
형태로 정리한다.

실행 위치: class_pjt/scripts/
출력: data/processed/국민신문고_서울관련_제안.csv
"""
import requests
import pandas as pd
import time
from pathlib import Path

SERVICE_KEY = "2BOebv4LMSyFeF371dGJhDpzY4s/1CsQeSR5S+CsdwrNKEd5SP+pvZFwrE4yUH/JkIdO+qBzHdMDzNqClrc2Jg=="
LIST_URL = "https://apis.data.go.kr/1140100/OpenProposalService2/OpenProposalList"
ITEM_URL = "https://apis.data.go.kr/1140100/OpenProposalService2/OpenProposalItem"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
}

# 우리가 지금까지 확장해온 키워드 그대로 재사용
KEYWORDS = [
    "출산", "육아", "보육", "임신", "다자녀", "산후조리", "어린이집", "아이돌봄", "저출생", "돌봄",
    "난임", "부모급여", "아동수당", "위기임산부", "미혼모", "보호출산",
    "다태아", "쌍둥이", "모유수유", "산후우울", "유모차",
]

BASE_DIR = Path(__file__).resolve().parent.parent
OUT_PATH = BASE_DIR / "data" / "processed" / "국민신문고_서울관련_제안.csv"


def fetch_list(keyword: str, page: int = 1, per_page: int = 100) -> list[dict]:
    params = {
        "serviceKey": SERVICE_KEY,
        "keyword": keyword,
        "searchType": "title",
        "firstIndex": page,
        "recordCountPerPage": per_page,
    }
    res = requests.get(LIST_URL, params=params, headers=HEADERS, timeout=15)
    res.raise_for_status()
    try:
        data = res.json()
        return data.get("resultList", []) or data.get("response", {}).get("body", {}).get("items", []) or []
    except Exception as e:
        print(f"JSON parsing error ({keyword}): {e}, raw text: {res.text[:200]}")
        return []


def fetch_detail(peti_no: str) -> str | None:
    params = {"serviceKey": SERVICE_KEY, "petiNo": peti_no}
    try:
        res = requests.get(ITEM_URL, params=params, headers=HEADERS, timeout=15)
        res.raise_for_status()
        data = res.json()
        item = data.get("resultData") or data.get("result") or data.get("item") or data.get("response", {}).get("body", {}).get("item", {})
        content = item.get("content") or item.get("improveIdea") or item.get("contents") or item.get("petiCntn")
        return content
    except Exception as e:
        print(f"[Detail Error petiNo={peti_no}]: {e}")
        return None


if __name__ == "__main__":
    all_rows = []
    for kw in KEYWORDS:
        try:
            rows = fetch_list(kw)
            print(f"'{kw}' 검색: {len(rows)}건")
            all_rows.extend(rows)
        except Exception as e:
            print(f"'{kw}' 검색 실패: {e}")
        time.sleep(0.3)

    df = pd.DataFrame(all_rows).drop_duplicates(subset="petiNo")
    print(f"\n전체 수집(중복제거): {len(df)}건")

    # 처리기관명에 '서울' 포함된 것만 필터링
    df_seoul = df[df["ancName"].str.contains("서울", na=False)].copy()
    print(f"서울 관련 필터링: {len(df_seoul)}건")

    # 상세 본문 수집 (건수 많으면 시간 걸림 - 필요시 상위 N건만)
    contents = []
    for i, peti_no in enumerate(df_seoul["petiNo"]):
        contents.append(fetch_detail(peti_no))
        if (i + 1) % 20 == 0:
            print(f"본문 수집 {i + 1}/{len(df_seoul)}")
        time.sleep(0.3)
    df_seoul["content"] = contents

    df_seoul["source"] = "국민신문고"
    df_seoul.to_csv(OUT_PATH, index=False, encoding="utf-8-sig")
    print(f"\n저장 완료: {OUT_PATH}")
    print(f"본문 확보: {df_seoul['content'].notna().sum()}/{len(df_seoul)}")
