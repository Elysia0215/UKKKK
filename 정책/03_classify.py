"""
정책분류(category) + 담당부서(department) 키워드 매칭
입력: data/processed/상상대로_서울_출산육아_본문포함.csv
출력: data/processed/상상대로_서울_출산육아_분류완료.csv

키워드 사전은 category_keywords.py / department_keywords.py 에서 관리
(사전만 수정하고 싶으면 이 파일은 건드릴 필요 없음)
"""
import pandas as pd
from pathlib import Path

from category_keywords import CATEGORY_KEYWORDS
from department_keywords import DEPARTMENT_KEYWORDS, CATEGORY_TO_DEFAULT_DEPARTMENT

IN_PATH = Path("../data/processed/상상대로_서울_출산육아_본문포함.csv")
OUT_PATH = Path("../data/processed/상상대로_서울_출산육아_분류완료.csv")


def match_keywords(text: str, keyword_dict: dict) -> list:
    if not isinstance(text, str):
        return []
    scores = {}
    for label, keywords in keyword_dict.items():
        hits = sum(1 for kw in keywords if kw in text)
        if hits > 0:
            scores[label] = hits
    return [k for k, _ in sorted(scores.items(), key=lambda x: -x[1])]


def classify_row(row: pd.Series) -> pd.Series:
    text = f"{row['TITLE']} {row.get('content_full') or ''}"
    categories = match_keywords(text, CATEGORY_KEYWORDS)
    departments = match_keywords(text, DEPARTMENT_KEYWORDS)

    category = categories[0] if categories else "기타"

    if not departments:
        # 키워드로 못 찾으면 정책분류 기준 대표부서로 보완
        fallback = CATEGORY_TO_DEFAULT_DEPARTMENT.get(category)
        departments = [fallback] if fallback else ["미지정"]

    return pd.Series({
        "category": category,
        "department": departments[:3],
    })


if __name__ == "__main__":
    df = pd.read_csv(IN_PATH)
    classified = df.apply(classify_row, axis=1)
    df = pd.concat([df, classified], axis=1)
    df.to_csv(OUT_PATH, index=False, encoding="utf-8-sig")

    print("category 분포:")
    print(df["category"].value_counts())
    print()
    print("department 미지정 비율:", (df["department"].apply(lambda d: d == ["미지정"])).mean())
