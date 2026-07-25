"""
국민신문고 공개제안조회서비스(OpenProposalService2)에서 출산·양육 후보를 별도 수집한다.

상상대로 서울 824건과 병합하지 않고, source="국민신문고" CSV로만 저장한다.
네트워크가 불안정하거나 API 에러가 반복되면 대체 데이터를 만들지 않고 중단한다.
"""
from __future__ import annotations

import os
import time
from collections import Counter
from pathlib import Path
from typing import Any

import pandas as pd
import requests
from proposal_quality import classify_birth_policy_category, classify_birth_relevance, POLICY_FLOW_BY_CATEGORY

SERVICE_KEY = os.environ.get("DATA_GO_KR_SERVICE_KEY", "")
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
REVIEW_PATH = BASE_DIR / "data" / "processed" / "국민신문고_서울관련_수동검토후보.csv"
EXCLUDED_PATH = BASE_DIR / "data" / "processed" / "국민신문고_서울관련_제외로그.csv"
MAX_RETRIES = 2
MAX_REPEATED_API_ERRORS = 3
REQUEST_TIMEOUT = 10

class StopCollection(RuntimeError):
    pass


def request_json(url: str, params: dict[str, Any]) -> dict[str, Any]:
    last_error: Exception | None = None
    for attempt in range(MAX_RETRIES + 1):
        try:
            res = requests.get(url, params=params, headers=HEADERS, timeout=REQUEST_TIMEOUT)
            res.raise_for_status()
            return res.json()
        except (requests.Timeout, requests.ConnectionError) as exc:
            last_error = exc
            if attempt >= MAX_RETRIES:
                raise StopCollection(f"네트워크 문제로 중단: {exc}") from exc
            time.sleep(1)
        except requests.RequestException as exc:
            raise RuntimeError(f"API 요청 실패: {exc}") from exc
    raise StopCollection(f"네트워크 문제로 중단: {last_error}")


def smoke_test() -> None:
    if not SERVICE_KEY:
        raise StopCollection("실패: DATA_GO_KR_SERVICE_KEY 환경변수가 없습니다.")
    params = {
        "serviceKey": SERVICE_KEY,
        "keyword": KEYWORDS[0],
        "searchType": "title",
        "firstIndex": 1,
        "recordCountPerPage": 1,
    }
    request_json(LIST_URL, params)
    print("API 테스트 호출 1건 정상 응답")


def fetch_list(keyword: str, max_pages: int = 5, per_page: int = 100) -> list[dict]:
    results = []
    for page in range(1, max_pages + 1):
        params = {
            "serviceKey": SERVICE_KEY,
            "keyword": keyword,
            "searchType": "title",
            "firstIndex": page,
            "recordCountPerPage": per_page,
        }
        data = request_json(LIST_URL, params)
        items = data.get("resultList", []) or data.get("response", {}).get("body", {}).get("items", []) or []
        if not items:
            break
        results.extend(items)
        time.sleep(0.1)
    return results


def fetch_detail(peti_no: str) -> str | None:
    params = {"serviceKey": SERVICE_KEY, "petiNo": peti_no}
    data = request_json(ITEM_URL, params)
    item = data.get("resultData") or data.get("result") or data.get("item") or data.get("response", {}).get("body", {}).get("item", {})
    content = item.get("content") or item.get("improveIdea") or item.get("contents") or item.get("petiCntn")
    return str(content) if content else None


if __name__ == "__main__":
    started_at = time.monotonic()
    smoke_test()

    all_rows = []
    error_count = 0
    for kw in KEYWORDS:
        try:
            rows = fetch_list(kw, max_pages=5)
            print(f"'{kw}' 검색 (페이지 1~5): {len(rows)}건")
            all_rows.extend(rows)
        except Exception as e:
            error_count += 1
            print(f"'{kw}' 검색 실패: {e}")
            if error_count >= MAX_REPEATED_API_ERRORS:
                raise StopCollection("API 에러 3회 이상 반복으로 중단")
        time.sleep(0.2)
        if time.monotonic() - started_at > 30 * 60:
            print("30분 제한 도달로 수집 종료")
            break

    if not all_rows:
        raise StopCollection("실패: API에서 수집된 데이터가 없습니다.")

    df = pd.DataFrame(all_rows).drop_duplicates(subset="petiNo")
    print(f"\n전체 수집(중복제거): {len(df)}건")
    
    df["source"] = "국민신문고"

    # 처리기관명에 '서울' 포함된 것만 필터링
    df_seoul = df[df["ancName"].str.contains("서울", na=False)].copy()
    print(f"서울 관련 필터링: {len(df_seoul)}건")

    # 상세 본문 수집
    contents = []
    for i, peti_no in enumerate(df_seoul["petiNo"]):
        try:
            contents.append(fetch_detail(str(peti_no)))
        except Exception as e:
            error_count += 1
            contents.append(None)
            print(f"본문 수집 실패 ({peti_no}): {e}")
            if error_count >= MAX_REPEATED_API_ERRORS:
                raise StopCollection("API 에러 3회 이상 반복으로 중단")
        if (i + 1) % 20 == 0:
            print(f"본문 수집 {i + 1}/{len(df_seoul)}")
        time.sleep(0.3)
        if time.monotonic() - started_at > 30 * 60:
            print("30분 제한 도달로 본문 수집 종료")
            break

    df_seoul = df_seoul.iloc[:len(contents)].copy()
    df_seoul["content"] = contents
    df_seoul["source"] = "국민신문고"

    decisions = df_seoul.apply(
        lambda row: classify_birth_relevance(
            str(row.get("title", "")),
            str(row.get("content", "") or ""),
        ),
        axis=1,
    )
    df_seoul["review_status"] = [decision[0] for decision in decisions]
    df_seoul["review_reason"] = [decision[1] for decision in decisions]

    categories = df_seoul.apply(
        lambda row: classify_birth_policy_category(
            str(row.get("title", "")),
            str(row.get("content", "") or ""),
        ),
        axis=1,
    )
    df_seoul["category"] = [category[0] for category in categories]
    df_seoul["sub_category"] = [category[1] for category in categories]
    df_seoul["micro_category"] = [category[2] for category in categories]
    df_seoul["policy_flow"] = df_seoul["category"].map(POLICY_FLOW_BY_CATEGORY).fillna("전 주기")

    included = df_seoul[df_seoul["review_status"] == "include"].copy()
    manual_review = df_seoul[df_seoul["review_status"] == "review"].copy()
    excluded = df_seoul[df_seoul["review_status"] == "exclude"].copy()

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    included.to_csv(OUT_PATH, index=False, encoding="utf-8-sig")
    manual_review.to_csv(REVIEW_PATH, index=False, encoding="utf-8-sig")
    excluded.to_csv(EXCLUDED_PATH, index=False, encoding="utf-8-sig")

    print(f"서울관련 출산·양육 확정 저장: {OUT_PATH}")
    print(f"수동검토 후보 저장: {REVIEW_PATH}")
    print(f"제외로그 저장: {EXCLUDED_PATH}")
    print(f"본문 확보: {df_seoul['content'].notna().sum()}/{len(df_seoul)}")
    print(f"판정 분포: {dict(Counter(df_seoul['review_status']))}")
