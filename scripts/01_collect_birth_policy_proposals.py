# scripts/01_collect_birth_policy_proposals.py
"""
서울시 상상대로 출산·양육 정책 제안 전용 2단계 정밀 수집 & 필터링 스크립트

사용자 정의 분류 가이드라인:
1. 대분류 8개 축 유지
2. 2단계 크롤링/필터링 키워드 전략:
   - 1단계: 직접 출산·양육 키워드 (출산, 출생, 임신, 임산부, 난임, 신생아, 영유아, 육아, 보육, 어린이집, 유치원, 키움센터, 다자녀, 한부모, 육아휴직 등)
   - 2단계: 필수 조합 키워드 (주거/교통/교육/대출/월세/버스/지하철 + 출산/신혼부부/신생아/임산부/유모차)
   - 범용 단독 키워드 (어린이, 아동, 공원, 안전, 관광버스 등)의 무분별한 혼입 자동 방지!
"""

import re
import json
import pandas as pd
from pathlib import Path

# 1단계: 무조건 출산·양육으로 인정되는 직접 키워드
DIRECT_KEYWORDS = [
    '출산', '출생', '임신', '임산부', '임신부', '난임', '난임시술', '난임주사',
    '산모', '산후', '산후조리', '신생아', '영유아', '육아', '양육', '보육',
    '어린이집', '유치원', '아이돌봄', '초등돌봄', '키움센터', '다자녀', '다둥이',
    '한부모', '미혼모', '미혼부', '위기임산부', '육아휴직', '출산휴가', '조부모 돌봄',
    '신혼부부', '신생아 특례대출', '유모차', '유아차'
]

# 2단계: 반드시 출산·양육 맥락과 결합해야 인정되는 필수 조합 조건
COMBINATION_RULES = [
    (r'주거|임대|전세|월세|주택|대출', r'출산|신혼|신생아|자녀|다자녀|양육'),
    (r'교통|버스|지하철|배려석|좌석|이동', r'임산부|유모차|유아차|영유아|아이동반'),
    (r'공원|시설|편의|놀이', r'아이|유아|영유아|키즈|유모차|양육'),
    (r'교육|학습|강좌', r'유아|초등돌봄|자녀|부모교육|아빠교육'),
]

# 불필요 노이즈 제외 패턴 (파크골프, 소상공인, 관광버스, 홈플러스, 흡연구역 등)
EXCLUSION_PATTERNS = [
    r'파크골프', r'관광버스', r'소상공인', r'홈플러스', r'흡연', r'담배', r'반려동물', r'유기동물'
]

def is_birth_policy_proposal(title: str, content: str = '') -> tuple[bool, str]:
    text = f"{title} {content}"
    
    # 1. 제외 패턴 확인
    for exc in EXCLUSION_PATTERNS:
        if re.search(exc, text):
            return False, f"제외 키워드 감지 ({exc})"
            
    # 2. 1단계 직접 키워드 확인
    for kw in DIRECT_KEYWORDS:
        if kw in text:
            return True, f"직접 키워드 매칭 ({kw})"
            
    # 3. 2단계 조합 규칙 확인
    for base_pattern, target_pattern in COMBINATION_RULES:
        if re.search(base_pattern, text) and re.search(target_pattern, text):
            return True, f"조합 키워드 매칭 ({base_pattern} + {target_pattern})"
            
    return False, "미매칭 (출산·양육 관련성 부족)"

if __name__ == "__main__":
    test_titles = [
        "서울시 양육지원 서비스 이용대상 확대 및 종로구 백일·돌상 촬영공간 조성 건의",
        "지하철 임산부석 이용 방식 개선에 대한 시민 제안",
        "신생아 특례대출 기간 늘려주세요",
        "파크골프장 이용 시설 개선 요청",
        "유기동물 입양 활성화를 위한 프로젝트"
    ]
    for t in test_titles:
        is_matched, reason = is_birth_policy_proposal(t)
        print(f"[{'O' if is_matched else 'X'}] {t} -> {reason}")
