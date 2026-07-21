# scripts/01_collect_birth_policy_proposals.py
"""
서울시 상상대로 출산·양육 정책 제안 전용 다단계 규칙 기반 필터링 및 1차 후보 수집 스크립트

[보고서/발표용 개요]
- 출산·양육 직접 키워드와 조합 조건 기반의 규칙 기반 필터링(Rule-based Keyword Scoring) 적용
- 범용 키워드로 인한 일반 서울시 제안 혼입을 줄이기 위한 2차 필터링 수행
- 설명 가능한 1차 후보 필터링 및 분류 체계 (KMeans/AI 확정 배정이 아닌 Rule-based)
"""

import re
import json
import pandas as pd
from pathlib import Path
from typing import Dict, List, Tuple

BASE_DIR = Path('/Users/parkcy/Desktop/sesac_pjt/UKKKK')
RAW_CSV_PATH = BASE_DIR / 'data' / 'processed' / '상상대로_서울_전체_최신.csv'
RESULT_CSV = BASE_DIR / 'data' / 'processed' / '상상대로_출산양육관련_수집결과.csv'
RESULT_XLSX = BASE_DIR / 'data' / 'processed' / '상상대로_출산양육관련_수집결과.xlsx'
EXCLUDE_LOG_CSV = BASE_DIR / 'data' / 'processed' / '상상대로_출산양육관련_제외로그.csv'

# [1단계: 직접 출산·양육 키워드 - 단독 수집 가능]
DIRECT_BIRTH_KEYWORDS = [
    "출산", "출생", "임신", "임산부", "임신부", "난임", "난임시술", "난임주사",
    "산모", "산후", "신생아", "영유아", "육아", "양육", "보육",
    "어린이집", "유치원", "아이돌봄", "초등돌봄", "키움센터",
    "다자녀", "다둥이", "한부모", "미혼모", "미혼부", "위기임산부",
    "육아휴직", "출산휴가", "조부모 돌봄", "유모차", "유아차",
    "신혼부부", "신생아 특례대출"
]

# [2단계: 조합 조건 키워드 - 문맥 결합 필수]
COMBO_RULES = {
    "주거·대출": {
        "base": ["주거", "대출", "월세", "전세", "주택", "임대"],
        "context": ["출산", "신혼부부", "신생아", "자녀", "다자녀", "양육"]
    },
    "교통·이동": {
        "base": ["교통", "버스", "지하철", "좌석", "배려석", "이동", "엘리베이터"],
        "context": ["임산부", "임신부", "유모차", "유아차", "영유아", "아이동반"]
    },
    "공간·편의시설": {
        "base": ["공원", "시설", "공간", "화장실", "편의시설"],
        "context": ["유아", "영유아", "아이", "아동", "양육", "가족", "유모차"]
    },
    "교육·프로그램": {
        "base": ["교육", "강좌", "프로그램", "체험"],
        "context": ["유아", "영유아", "초등돌봄", "자녀", "부모교육", "육아"]
    }
}

# 범용 노이즈 키워드 (직접 키워드가 없을 때 제외)
NOISE_KEYWORDS = [
    "파크골프", "관광버스", "소상공인", "홈플러스", "유기동물", "반려동물"
]

def normalize_text(text: str) -> str:
    if text is None:
        return ""
    text = str(text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()

def find_keywords(text: str, keywords: List[str]) -> List[str]:
    return [kw for kw in keywords if kw in text]

def check_birth_policy_candidate(title: str, content: str = "") -> Dict[str, str]:
    """
    출산·양육 관련 후보 여부를 판단한다.
    이 함수는 확정 분류가 아니라 1차 후보 필터링용이다.
    """
    title = normalize_text(title)
    content = normalize_text(content)
    text = f"{title} {content}"

    # 1. 1차 직접 키워드 확인 (어린이집 주변 흡연 단속 등의 양육 환경 제안 포함 유지)
    direct_hits = find_keywords(text, DIRECT_BIRTH_KEYWORDS)
    if direct_hits:
        return {
            "출산양육관련여부": "직접관련",
            "분류근거_키워드": ", ".join(direct_hits[:10]),
            "분류신뢰도": "상",
            "수집방식": "1차 직접키워드 수집",
            "제외사유": ""
        }

    # 2. 2차 필수 조합 조건 확인
    combo_hits = []
    for rule_name, rule in COMBO_RULES.items():
        base_hits = find_keywords(text, rule["base"])
        context_hits = find_keywords(text, rule["context"])
        if base_hits and context_hits:
            combo_hits.append(
                f"{rule_name}: {'/'.join(base_hits[:3])} + {'/'.join(context_hits[:3])}"
            )

    if combo_hits:
        return {
            "출산양육관련여부": "조합관련",
            "분류근거_키워드": ", ".join(combo_hits[:5]),
            "분류신뢰도": "중",
            "수집방식": "2차 문맥조합 수집",
            "제외사유": ""
        }

    # 3. 비관련 노이즈 확인
    noise_hits = find_keywords(text, NOISE_KEYWORDS)
    if noise_hits:
        return {
            "출산양육관련여부": "제외",
            "분류근거_키워드": "",
            "분류신뢰도": "하",
            "수집방식": "제외필터링",
            "제외사유": f"일반 정책/노이즈 키워드: {', '.join(noise_hits)}"
        }

    return {
        "출산양육관련여부": "제외",
        "분류근거_키워드": "",
        "분류신뢰도": "하",
        "수집방식": "제외필터링",
        "제외사유": "출산·양육 직접 키워드 또는 조합 조건 미충족"
    }

def classify_birth_policy_category(title: str, content: str = "") -> Tuple[str, str, str]:
    """
    기존 8개 대분류 기준으로 대분류·중분류·소분류를 부여한다.
    """
    text = normalize_text(f"{title} {content}")
    if any(kw in text for kw in ["난임", "난임시술", "난임주사"]):
        return "임신·난임·생식건강", "난임 지원", "난임시술·주사·시술비"
    if any(kw in text for kw in ["임신", "임산부", "임신부", "산전검사"]):
        return "임신·난임·생식건강", "임산부 건강·배려", "임산부 건강관리·배려"
    if any(kw in text for kw in ["산후", "산모", "산후조리", "신생아 도우미"]):
        return "출산·산후 초기지원", "산후조리", "산후조리·산모도우미"
    if any(kw in text for kw in ["출산지원금", "출생축하", "출산장려금", "첫만남"]):
        return "출산·산후 초기지원", "출산가구 초기지원", "출산지원금·출생축하"
    if any(kw in text for kw in ["어린이집", "유치원", "보육교사"]):
        return "보육·돌봄 인프라", "어린이집·유치원", "보육시설·유아교육"
    if any(kw in text for kw in ["초등돌봄", "키움센터", "방과후", "방학돌봄"]):
        return "보육·돌봄 인프라", "초등돌봄", "초등돌봄·방과후"
    if any(kw in text for kw in ["아이돌봄", "조부모", "긴급돌봄", "가족돌봄"]):
        return "보육·돌봄 인프라", "가족돌봄", "아이돌봄·조부모돌봄"
    if any(kw in text for kw in ["다자녀", "다둥이", "2자녀", "세자녀"]):
        return "다자녀·양육비·생활지원", "다자녀 혜택", "다자녀 기준·할인·감면"
    if any(kw in text for kw in ["신혼부부", "신생아 특례대출", "무주택", "월세", "전세", "주거"]):
        return "주거·교통·도시생활환경", "출산가구 주거", "신혼부부·출산가구 주거지원"
    if any(kw in text for kw in ["유모차", "유아차", "저상버스", "엘리베이터"]):
        return "주거·교통·도시생활환경", "유모차 이동권", "유모차·유아차 이동편의"
    if any(kw in text for kw in ["임산부석", "배려석", "대중교통", "교통약자"]):
        return "주거·교통·도시생활환경", "임산부 이동권", "임산부 교통배려"
    if any(kw in text for kw in ["육아휴직", "출산휴가", "단축근무", "근로시간"]):
        return "일·가정 양립·부모 노동", "육아휴직·근로시간", "휴직·휴가·단축근무"
    if any(kw in text for kw in ["한부모", "미혼모", "미혼부", "위기임산부"]):
        return "취약·다양가족 사각지대", "한부모·위기임산부", "한부모·미혼부모·위기임산부"
    if any(kw in text for kw in ["앱", "플랫폼", "신청", "상담", "홍보", "정보"]):
        return "정보·상담·교육·거버넌스", "정보 접근성", "정보통합·상담·신청"
    return "정보·상담·교육·거버넌스", "정보 접근성", "수동검토 필요"

def main():
    print("=" * 60)
    print("서울시 상상대로 출산·양육 정책 제안 규칙 기반 수집 & 필터링 가동")
    print("=" * 60)

    if not RAW_CSV_PATH.exists():
        print(f"오류: 원본 파일이 없습니다: {RAW_CSV_PATH}")
        return

    df_raw = pd.read_csv(RAW_CSV_PATH)
    print(f"수집 원문 총 건수: {len(df_raw)}건\n")

    results = []
    excluded_logs = []

    for idx, row in df_raw.iterrows():
        sn = str(int(float(row.get('SN', idx))))
        title = str(row.get('TITLE', '')).strip()
        content = str(row.get('CONTENT', '')).strip()
        reg_date = str(row.get('REG_DATE', ''))[:10]

        check_res = check_birth_policy_candidate(title, content)
        status = check_res["출산양육관련여부"]

        cat1, cat2, cat3 = classify_birth_policy_category(title, content)

        row_data = {
            '제안ID': f'PROP-{sn}',
            '제안제목': title,
            '제안본문내용': content if content and not content.startswith('http') else title,
            '등록일자': reg_date,
            '연도': reg_date[:4] if reg_date else '',
            '공감수': float(row.get('VOTE_SCORE', 0.0) or 0.0),
            '댓글수': int(float(row.get('USER_COMMENT_CNT', 0) or 0)),
            '답변여부': 'Y' if row.get('REPLY_YN') == 'Y' else 'N',
            '원문URL': f'https://idea.seoul.go.kr/front/freeSuggest/view.do?sn={sn}',
            '대분류': cat1,
            '중분류': cat2,
            '소분류': cat3,
            '분류근거_키워드': check_res["분류근거_키워드"],
            '분류신뢰도': check_res["분류신뢰도"],
            '출산양육관련여부': status,
            '수집키워드': check_res["분류근거_키워드"].split(',')[0] if check_res["분류근거_키워드"] else '',
            '수집방식': check_res["수집방식"],
            '제외사유': check_res["제외사유"]
        }

        if status in ["직접관련", "조합관련"]:
            results.append(row_data)
        else:
            excluded_logs.append(row_data)

    df_results = pd.DataFrame(results)
    df_excluded = pd.DataFrame(excluded_logs)

    # 결과 파일 저장
    df_results.to_csv(RESULT_CSV, index=False, encoding='utf-8-sig')
    df_results.to_excel(RESULT_XLSX, index=False)
    df_excluded.to_csv(EXCLUDE_LOG_CSV, index=False, encoding='utf-8-sig')

    # 콘솔 현황 출력
    print("📊 [수집 현황 요약]")
    print(f"- 총 원문 건수: {len(df_raw)}건")
    print(f"- 최종 수집 완료 건수 (직접+조합): {len(df_results)}건")
    print(f"- 노이즈/미관련 제외 건수: {len(df_excluded)}건\n")

    print("🏷️ [출산양육관련여부별 분포]")
    print(df_results['출산양육관련여부'].value_counts(), "\n")

    print("⭐ [분류신뢰도별 분포]")
    print(df_results['분류신뢰도'].value_counts(), "\n")

    print("📂 [대분류별 건수]")
    print(df_results['대분류'].value_counts(), "\n")

    print(f"✅ 수집 결과 CSV 저장: {RESULT_CSV}")
    print(f"✅ 수집 결과 Excel 저장: {RESULT_XLSX}")
    print(f"✅ 제외 로그 CSV 저장: {EXCLUDE_LOG_CSV}")

if __name__ == "__main__":
    main()
