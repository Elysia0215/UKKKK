import pandas as pd
import re

# 같은 폴더(정책) 내에 있는 키워드 사전 파일들 불러오기
from category_keywords import CATEGORY_KEYWORDS
from department_keywords import DEPARTMENT_KEYWORDS, CATEGORY_TO_DEFAULT_DEPARTMENT
from negative_keywords import has_negative_signal

def clean_text(text):
    """특수문자 제거 등 텍스트 전처리 함수"""
    if not isinstance(text, str):
<<<<<<< HEAD
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
        "negative_signal": has_negative_signal(text),  # 배기련 외(2021) 부정어 매칭 여부
    })
=======
        return ""
    # 한글, 영문, 숫자, 공백만 남기고 특수문자 제거
    text = re.sub(r'[^가-힣a-zA-Z0-9\s]', '', text)
    return text

def classify_and_score(text):
    """
    텍스트를 분석하여 카테고리, 담당부서, 수요점수를 산출하는 핵심 함수
    """
    cleaned_text = clean_text(text)
    if not cleaned_text.strip():
        return "기타", "미정", 0

    matched_category = None
    matched_department = None
    keyword_hit_count = 0  # 키워드 적중 횟수 (수요 점수 산출용)

    # 1. 카테고리 매칭 및 키워드 카운트
    for category, keywords in CATEGORY_KEYWORDS.items():
        for keyword in keywords:
            if keyword in cleaned_text:
                if not matched_category:
                    matched_category = category # 첫 번째로 매칭된 카테고리 할당
                keyword_hit_count += 1

    # 2. 담당 부서 매칭
    for dept, keywords in DEPARTMENT_KEYWORDS.items():
        for keyword in keywords:
            if keyword in cleaned_text:
                matched_department = dept
                break
        if matched_department:
            break

    # 3. 예외 처리 (부서를 못 찾았는데 카테고리는 있는 경우 최후의 보험 사용)
    if matched_category and not matched_department:
        matched_department = CATEGORY_TO_DEFAULT_DEPARTMENT.get(matched_category, "미정")

    # 4. 아무것도 매칭되지 않은 경우의 기본값
    if not matched_category:
        matched_category = "기타"
    if not matched_department:
        matched_department = "기타부서"

    # 5. 수요 점수(Score) 산출 로직 
    # (키워드가 많이 등장할수록 시급/중요한 이슈로 판단하여 가중치 부여)
    demand_score = min(100, keyword_hit_count * 10) # 1개당 10점, 최대 100점

    return matched_category, matched_department, demand_score
>>>>>>> f2190ca (Update policy classification and add scrape script)


# --- 테스트 및 실행 영역 ---
if __name__ == "__main__":
    print("🤖 AI 정책/여론 분류 테스트를 시작합니다...\n")

    # 가상의 뉴스 기사 / 민원 데이터 샘플
    sample_texts = [
        "신혼부부 전세자금 대출 소득기준이 너무 높아서 혜택을 못 받습니다. 완화해주세요.",
        "야간에 아이를 급하게 맡길 긴급돌봄 어린이집이 부족합니다.",
        "난임 시술비 지원 덕분에 임신에 성공했습니다!",
        "오늘 날씨가 참 좋네요. 한강공원에 놀러가고 싶어요." # 관련 없는 텍스트
    ]

    # 테스트 결과 출력
    for idx, text in enumerate(sample_texts, 1):
        category, dept, score = classify_and_score(text)
        print(f"📝 원문 [{idx}]: {text}")
        print(f"👉 분류 결과: [카테고리] {category} | [담당부서] {dept} | [수요점수] {score}점")
        print("-" * 50)