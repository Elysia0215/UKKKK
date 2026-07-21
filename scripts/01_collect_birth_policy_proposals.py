# scripts/01_collect_birth_policy_proposals.py
"""
서울시 상상대로 출산·양육 정책 제안 전용 다단계 규칙 기반 수집 & 확장 필터링 스크립트

[보고서/발표용 개요]
- 기존 704건 핵심 직접 수집 외에 생활형/조합형 확장 키워드 수집 체계 구축 (목표: ~1,000건 후보 확보)
- 대분류 8개 축 유지하며 세부 중분류/소분류를 정교하게 획정
- 직접 키워드 단독 수집 + 범용 키워드는 필수 문맥 조합 조건 결합
- 제외 로그 세부 기록 및 수집방식(기존수집/직접확장/조합확장) 트래킹
"""

import re
import json
import pandas as pd
from pathlib import Path
from typing import Dict, List, Tuple

BASE_DIR = Path('/Users/parkcy/Desktop/sesac_pjt/UKKKK')
RAW_CSV_PATH = BASE_DIR / 'data' / 'processed' / '상상대로_서울_전체_최신.csv'
VER2_DIR = BASE_DIR / 'data' / 'processed' / 'ver2_expanded'
RESULT_CSV = VER2_DIR / '상상대로_출산양육관련_수집결과_ver2.csv'
RESULT_XLSX = VER2_DIR / '상상대로_출산양육관련_수집결과_ver2.xlsx'
EXCLUDE_LOG_CSV = VER2_DIR / '상상대로_출산양육관련_제외로그_ver2.csv'

# 1단계: 기존 직접 출산·양육 키워드
CORE_DIRECT_KEYWORDS = [
    "출산", "출생", "임신", "임산부", "임신부", "난임", "난임시술", "난임주사",
    "산모", "산후", "신생아", "영유아", "육아", "양육", "보육",
    "어린이집", "유치원", "아이돌봄", "초등돌봄", "키움센터",
    "다자녀", "다둥이", "한부모", "미혼모", "미혼부", "위기임산부",
    "육아휴직", "출산휴가", "조부모 돌봄", "유모차", "유아차",
    "신혼부부", "신생아 특례대출"
]

# 1단계 확장: 추가 생활형 직접 키워드
EXPANSION_DIRECT_KEYWORDS = [
    # 부모 생활·양육 부담
    "양육부담", "육아부담", "육아비용", "양육비용", "육아스트레스", "육아고립",
    "독박육아", "공동육아", "육아품앗이", "육아커뮤니티", "부모모임",
    "초보부모", "초보엄마", "초보아빠", "예비부모", "예비맘", "엄마아빠",
    "아빠육아", "남성육아",
    # 돌봄 공백
    "돌봄공백", "보육공백", "등하원", "하원", "등원", "방학돌봄", "방학중돌봄",
    "등하원도우미", "등하원지원", "긴급돌봄", "틈새돌봄", "일시돌봄", "시간제돌봄",
    "시간제보육", "야간돌봄", "주말돌봄",
    "휴일돌봄", "새벽돌봄", "아픈아이", "아픈아이돌봄", "병아동", "병아동돌봄",
    # 아이 동반 편의시설
    "수유실", "모유수유실", "기저귀교환대", "기저귀갈이대", "유아휴게실",
    "가족화장실", "어린이화장실", "아기쉼터", "영유아쉼터", "아이동반",
    "아이와함께", "아기랑", "아동친화", "아동친화도시", "키즈존",
    "실내놀이터", "공공키즈카페", "서울형키즈카페", "장난감도서관", "육아종합지원센터",
    # 산후 건강
    "산후우울", "산후우울증", "산모건강", "산모회복", "산모지원", "산모교실",
    "모유수유", "수유상담", "산후관리", "산후건강", "산후검진",
    "산모신생아", "산모신생아건강관리", "공공산후조리", "산모건강증진센터",
    # 임신 준비·가임력
    "가임력", "가임력검사", "임신준비", "임신준비검사", "예비부부검진",
    "신혼부부검진", "정자검사", "난소나이", "난자냉동", "정자냉동",
    "생식건강", "임신상담", "임신계획",
    # 아동 의료
    "소아과", "소아청소년과", "소아응급", "소아응급실", "달빛어린이병원",
    "어린이병원", "아동병원", "야간진료", "휴일진료", "주말진료",
    "영유아검진", "예방접종", "아이진료", "아기진료",
    # 양육비·생활비
    "분유", "기저귀", "이유식", "아기용품", "육아용품", "교재비", "학원비",
    "돌봄비", "간식비", "급식비", "체험비", "양육수당", "아동수당",
    "부모급여", "첫만남이용권"
]

# 2단계: 문맥 결합 필수 조합 규칙
# ver2 검증 결과, 아이/아동/어린이 같은 범용 키워드는 노이즈가 커서
# 조합 룰에서는 보육·양육 직접 맥락이 있는 경우만 통과시킨다.
COMBO_RULES = {
    "주거·대출": {
        "base": ["주거", "대출", "월세", "전세", "주택", "임대", "청약", "이자"],
        "context": ["출산", "신혼부부", "신생아", "자녀", "다자녀", "양육"]
    },
    "교통·이동": {
        "base": ["교통", "버스", "지하철", "좌석", "배려석", "이동", "엘리베이터", "에스컬레이터", "보행로", "저상버스"],
        "context": ["임산부", "임신부", "유모차", "유아차", "영유아", "아이동반"]
    },
    "아이동반_생활편의": {
        "base": ["공원", "시설", "공간", "화장실", "편의시설", "주민센터"],
        "context": ["수유실", "기저귀교환대", "기저귀갈이대", "유아휴게실", "유모차", "유아차", "영유아", "양육", "부모교육"]
    },
    "공공문화시설_육아편의": {
        "base": ["도서관", "박물관", "미술관", "체육센터", "문화센터", "공공시설"],
        "context": ["수유실", "기저귀교환대", "기저귀갈이대", "유아휴게실", "유모차", "유아차", "영유아", "부모교육", "장난감도서관"]
    },
    "교육·프로그램": {
        "base": ["교육", "강좌", "프로그램", "체험"],
        "context": ["유아", "영유아", "초등돌봄", "자녀", "부모교육", "육아"]
    },
    "부모_노동시간": {
        "base": ["근무", "휴가", "휴직", "재택", "유연근무", "단축근무", "퇴근", "출근"],
        "context": ["육아", "출산", "임신", "자녀", "아이돌봄", "부모"]
    },
    "아동_안전환경": {
        "base": ["흡연", "안전", "범죄", "CCTV", "통학로", "보호구역", "스쿨존"],
        "context": ["어린이집", "유치원", "영유아", "등하원", "돌봄", "양육", "부모"]
    }
}

NOISE_KEYWORDS = [
    "파크골프", "관광버스", "소상공인", "홈플러스", "유기동물", "반려동물"
]

WEAK_CHILD_CONTEXT_KEYWORDS = ["아이", "아동", "어린이"]

NOISE_FOCUS_KEYWORDS = [
    "학교폭력", "청소년", "학교", "체육센터", "스포츠센터", "생활SOC",
    "보호구역", "스쿨존", "통학로"
]

DIRECT_LIFE_CONTEXT_KEYWORDS = [
    "어린이집", "유치원", "영유아", "초등돌봄", "돌봄", "양육", "부모",
    "등하원", "수유실", "기저귀교환대", "기저귀갈이대", "유아휴게실",
    "유모차", "유아차", "장난감도서관", "육아종합지원센터", "서울형키즈카페"
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
    title = normalize_text(title)
    content = normalize_text(content)
    text = f"{title} {content}"

    # 1. 핵심 직접 키워드 확인
    core_hits = find_keywords(text, CORE_DIRECT_KEYWORDS)
    if core_hits:
        return {
            "출산양육관련여부": "직접관련",
            "분류근거_키워드": ", ".join(core_hits[:10]),
            "분류신뢰도": "상",
            "수집방식": "기존 1차 직접키워드 수집",
            "제외사유": ""
        }

    # 2. 확장 직접 키워드 확인
    exp_hits = find_keywords(text, EXPANSION_DIRECT_KEYWORDS)
    if exp_hits:
        return {
            "출산양육관련여부": "직접관련",
            "분류근거_키워드": ", ".join(exp_hits[:10]),
            "분류신뢰도": "상",
            "수집방식": "확장 1차 생활키워드 수집",
            "제외사유": ""
        }

    # 3. 일반 아동/학교/시설/안전 중심 노이즈 선제 제외
    noise_hits = find_keywords(text, NOISE_KEYWORDS)
    if noise_hits:
        return {
            "출산양육관련여부": "제외",
            "분류근거_키워드": "",
            "분류신뢰도": "하",
            "수집방식": "제외필터링",
            "제외사유": f"일반 정책/노이즈 키워드: {', '.join(noise_hits)}"
        }

    weak_child_hits = find_keywords(text, WEAK_CHILD_CONTEXT_KEYWORDS)
    noise_focus_hits = find_keywords(text, NOISE_FOCUS_KEYWORDS)
    direct_life_hits = find_keywords(text, DIRECT_LIFE_CONTEXT_KEYWORDS)
    if weak_child_hits and noise_focus_hits and not direct_life_hits:
        return {
            "출산양육관련여부": "제외",
            "분류근거_키워드": "",
            "분류신뢰도": "하",
            "수집방식": "제외필터링",
            "제외사유": (
                "일반 아동/학교/시설/안전 제안: "
                f"{', '.join(noise_focus_hits[:5])} 중심이며 출산·양육 직접 맥락 부족"
            )
        }

    # 4. 2차 조합 조건 확인
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

    return {
        "출산양육관련여부": "제외",
        "분류근거_키워드": "",
        "분류신뢰도": "하",
        "수집방식": "제외필터링",
        "제외사유": "출산·양육 직접 키워드 또는 조합 조건 미충족"
    }

def classify_birth_policy_category(title: str, content: str = "") -> Tuple[str, str, str]:
    text = normalize_text(f"{title} {content}")

    # 1. 임신 준비·가임력 지원
    if any(kw in text for kw in ["가임력", "가임력검사", "임신준비", "임신준비검사", "예비부부검진", "신혼부부검진", "정자검사", "난소나이", "난자냉동", "정자냉동"]):
        return "임신·난임·생식건강", "임신 준비·가임력 지원", "가임력검사·난자냉동·예비부부검진"
    if any(kw in text for kw in ["난임", "난임시술", "난임주사", "PGT", "유전자검사", "AMH"]):
        return "임신·난임·생식건강", "난임 지원", "난임시술·주사·시술비"
    if any(kw in text for kw in ["임신", "임산부", "임신부", "산전검사", "생식건강", "임신상담"]):
        return "임신·난임·생식건강", "임산부 건강·배려", "임산부 건강관리·배려"

    # 2. 산모 회복·산후 초기지원
    if any(kw in text for kw in ["산후우울", "산후우울증", "산모건강", "산모회복", "산모지원", "산모교실", "모유수유", "수유상담", "산후검진", "공공산후조리"]):
        return "출산·산후 초기지원", "산모 회복·건강관리", "산후우울·산후검진·수유상담"
    if any(kw in text for kw in ["산후", "산모", "산후조리", "신생아 도우미", "조리원"]):
        return "출산·산후 초기지원", "산후조리", "산후조리·산모도우미"
    if any(kw in text for kw in ["출산지원금", "출생축하", "출산장려금", "첫만남", "신생아", "출산"]):
        return "출산·산후 초기지원", "출산가구 초기지원", "출산지원금·출생축하"

    # 3. 돌봄 공백 및 아동 건강·의료
    if any(kw in text for kw in ["돌봄공백", "보육공백", "야간돌봄", "주말돌봄", "휴일돌봄", "새벽돌봄", "아픈아이", "아픈아이돌봄", "병아동", "병아동돌봄", "틈새돌봄"]):
        return "보육·돌봄 인프라", "긴급·시간제 돌봄", "야간·주말·아픈아이 돌봄"
    if any(kw in text for kw in ["소아과", "소아청소년과", "소아응급", "소아응급실", "달빛어린이병원", "어린이병원", "아동병원", "야간진료", "휴일진료", "영유아검진", "예방접종"]):
        return "보육·돌봄 인프라", "아동 건강·의료 접근성", "소아응급·야간진료·영유아검진"
    if any(kw in text for kw in ["공공키즈카페", "서울형키즈카페", "장난감도서관", "유아휴게실", "수유실", "모유수유실", "기저귀교환대", "기저귀갈이대", "키즈존"]):
        return "보육·돌봄 인프라", "아동 놀이·체험공간", "공공키즈카페·수유실·유아휴게실"
    if any(kw in text for kw in ["초등돌봄", "키움센터", "방과후", "방학돌봄", "초등학생", "등하원", "하원", "등원"]):
        return "보육·돌봄 인프라", "초등돌봄", "초등돌봄·방과후"
    if any(kw in text for kw in ["어린이집", "유치원", "보육교사", "보육", "특별보육", "시간제보육"]):
        return "보육·돌봄 인프라", "어린이집·유치원", "보육시설·유아교육"
    if any(kw in text for kw in ["아이돌봄", "조부모", "긴급돌봄", "가족돌봄", "일시돌봄", "돌봄"]):
        return "보육·돌봄 인프라", "가족돌봄", "아이돌봄·조부모돌봄"

    # 4. 주거·교통·도시생활환경
    if any(kw in text for kw in ["가족화장실", "어린이화장실", "아기쉼터", "영유아쉼터", "아동친화"]):
        return "주거·교통·도시생활환경", "아이동반 공공시설", "가족화장실·아이동반 편의시설"
    if any(kw in text for kw in ["임산부석", "배려석", "뱃지", "태그", "임산부 좌석", "임산부 교통"]):
        return "주거·교통·도시생활환경", "임산부 이동권", "임산부 교통배려"
    if any(kw in text for kw in ["유모차", "유아차", "저상버스", "엘리베이터"]):
        return "주거·교통·도시생활환경", "유모차 이동권", "유모차·유아차 이동편의"
    if any(kw in text for kw in ["신혼부부", "신생아 특례대출", "무주택", "월세", "전세", "주거", "임차보증금", "청약"]):
        return "주거·교통·도시생활환경", "출산가구 주거", "신혼부부·출산가구 주거지원"

    # 5. 다자녀·양육비·생활지원
    if any(kw in text for kw in ["분유", "기저귀", "이유식", "아동수당", "부모급여", "양육수당", "첫만남이용권", "양육비", "양육비용", "육아비용"]):
        return "다자녀·양육비·생활지원", "양육비·생활비 지원", "분유·기저귀·아동수당·부모급여"
    if any(kw in text for kw in ["다자녀", "다둥이", "2자녀", "세자녀", "양육부담", "육아부담"]):
        return "다자녀·양육비·생활지원", "다자녀 혜택", "다자녀 기준·할인·감면"

    # 6. 일·가정 양립·부모 노동
    if any(kw in text for kw in ["재택", "유연근무", "단축근무", "퇴근", "출근"]) and any(kw in text for kw in ["육아", "자녀", "부모", "아이"]):
        return "일·가정 양립·부모 노동", "유연근무·재택근무", "부모 노동시간·돌봄 병행"
    if any(kw in text for kw in ["육아휴직", "출산휴가", "근로시간"]):
        return "일·가정 양립·부모 노동", "육아휴직·근로시간", "휴직·휴가·단축근무"

    # 7. 취약·다양가족 사각지대
    if any(kw in text for kw in ["한부모", "미혼모", "미혼부", "위기임산부"]):
        return "취약·다양가족 사각지대", "한부모·위기임산부", "한부모·미혼부모·위기임산부"

    # 8. 정보·상담·교육·거버넌스
    if any(kw in text for kw in ["초보부모", "공동육아", "육아커뮤니티", "부모모임", "아빠육아", "남성육아", "초보엄마", "초보아빠", "부모교육"]):
        return "정보·상담·교육·거버넌스", "부모·가족 교육/상담", "초보부모·공동육아·육아정보"
    if any(kw in text for kw in ["저출산", "저출생", "고령화"]) and any(kw in text for kw in ["정책", "대책", "제안", "아이디어", "홍보", "인식개선"]):
        return "정보·상담·교육·거버넌스", "저출산 정책 일반", "인식개선·정책제안"
    if any(kw in text for kw in ["양육지원", "이용대상", "신청기준", "서류제출"]):
        return "정보·상담·교육·거버넌스", "양육지원 서비스 접근성", "신청·이용대상 기준 개선"
    if any(kw in text for kw in ["앱", "플랫폼", "신청", "상담", "홍보", "정보", "거버넌스"]):
        return "정보·상담·교육·거버넌스", "정보 접근성", "정보통합·상담·신청"

    return "정보·상담·교육·거버넌스", "정보 접근성", "일반 출산정책 안건"

def main():
    print("=" * 60)
    print("서울시 상상대로 출산·양육 정책 제안 2단계 확장 수집 & 필터링 가동")
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

    # 기존 수집방식 vs 신규 확장 수집방식 카운트
    prev_cnt = len(df_results[df_results['수집방식'] == '기존 1차 직접키워드 수집'])
    exp_dir_cnt = len(df_results[df_results['수집방식'] == '확장 1차 생활키워드 수집'])
    exp_combo_cnt = len(df_results[df_results['수집방식'] == '2차 문맥조합 수집'])

    print("📊 [확장 수집 현황 요약]")
    print(f"- 원문 총 건수: {len(df_raw)}건")
    print(f"- 기존 핵심 수집 건수: {prev_cnt}건")
    print(f"- 신규 생활/돌봄공백 확장 수집 건수: {exp_dir_cnt}건")
    print(f"- 신규 2차 문맥조합 수집 건수: {exp_combo_cnt}건")
    print(f"- 🚀 최종 확장 수집 완료 건수: {len(df_results)}건 (+{exp_dir_cnt + exp_combo_cnt}건 증가!)")
    print(f"- 노이즈/미관련 제외 건수: {len(df_excluded)}건\n")

    print("🏷️ [수집방식별 분포]")
    print(df_results['수집방식'].value_counts(), "\n")

    print("⭐ [분류신뢰도별 분포]")
    print(df_results['분류신뢰도'].value_counts(), "\n")

    print("📂 [대분류별 건수 분포]")
    print(df_results['대분류'].value_counts(), "\n")

    print(f"✅ 수집 결과 CSV 저장: {RESULT_CSV}")
    print(f"✅ 수집 결과 Excel 저장: {RESULT_XLSX}")
    print(f"✅ 제외 로그 CSV 저장: {EXCLUDE_LOG_CSV}")

if __name__ == "__main__":
    main()
