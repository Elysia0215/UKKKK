import re
from typing import Dict, List

import pandas as pd

from category_keywords import CATEGORY_KEYWORDS
from department_keywords import DEPARTMENT_KEYWORDS, CATEGORY_TO_DEFAULT_DEPARTMENT
from negative_keywords import has_negative_signal


def clean_text(text: str) -> str:
    """분류 키워드 매칭 전용 경량 전처리."""
    if not isinstance(text, str):
        return ""
    text = text.replace("?", " ")
    return re.sub(r"[^가-힣a-zA-Z0-9\s]", " ", text)


def score_keywords(text: str, keyword_dict: Dict[str, List[str]]) -> Dict[str, int]:
    """라벨별 키워드 출현 횟수를 계산한다."""
    scores: Dict[str, int] = {}
    for label, keywords in keyword_dict.items():
        hits = sum(text.count(keyword) for keyword in keywords)
        if hits > 0:
            scores[label] = hits
    return scores


def ranked_labels(scores: Dict[str, int]) -> List[str]:
    return [label for label, _ in sorted(scores.items(), key=lambda item: (-item[1], item[0]))]


def classify_text(text: str) -> dict:
    """논문 기반 키워드 사전으로 정책 카테고리와 담당부서를 분류한다.

    반환값은 Gap Matrix에서 쓰는 수요 신호의 전처리 근거로 연결된다.
    - category: 홍향희·이정화(2026) 민원 빈출어 기반 정책 분류
    - departments: 실무 R&R 라우팅 후보
    - demand_score: 키워드 적중량 기반 보조 수요 점수
    - negative_signal: 배기련 외(2021) 부정 정서 키워드 보조 신호
    """
    cleaned = clean_text(text)
    category_scores = score_keywords(cleaned, CATEGORY_KEYWORDS)
    department_scores = score_keywords(cleaned, DEPARTMENT_KEYWORDS)

    categories = ranked_labels(category_scores)
    departments = ranked_labels(department_scores)

    category = categories[0] if categories else "기타"
    if not departments:
        fallback = CATEGORY_TO_DEFAULT_DEPARTMENT.get(category)
        departments = [fallback] if fallback else ["기타부서"]

    demand_score = 0 if category == "기타" else min(100, sum(category_scores.values()) * 10)

    return {
        "category": category,
        "categories": categories,
        "department": departments[0],
        "departments": departments[:3],
        "demand_score": demand_score,
        "negative_signal": has_negative_signal(cleaned),
    }


def classify_row(row: pd.Series) -> pd.Series:
    title = row.get("TITLE") or row.get("title") or ""
    content = row.get("content_full") or row.get("content") or row.get("CONTENT") or ""
    result = classify_text(f"{title} {content}")
    return pd.Series(result)


if __name__ == "__main__":
    sample_texts = [
        "신혼부부 전세자금 대출 소득기준이 높아 혜택을 못 받습니다.",
        "야간에 아이를 맡길 긴급돌봄 어린이집이 부족합니다.",
        "난임 시술비 지원 기준과 배려석 안내를 개선해주세요.",
        "독박육아로 포기하고 싶은 마음이 듭니다.",
    ]

    for idx, text in enumerate(sample_texts, 1):
        result = classify_text(text)
        print(f"[{idx}] {text}")
        print(result)
        print("-" * 50)
