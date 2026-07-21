"""
부정감성 신호 키워드 - 별도 감성분석 모델 없이 키워드 매칭으로 경량 처리
(우리 MVP는 REPLY_YN + VOTE_SCORE를 주 지표로 쓰고, 이건 보조 신호로만 사용)

출처: 배기련 외(2021), "텍스트 마이닝을 활용한 저출산 정책과 대중인식 비교",
디지털융복합연구 19(12) — 정책 발표 직후 뉴스댓글 25,800건 CONCOR 분석에서
전 시기에 걸쳐 반복 등장한 대표적 부정 정서 키워드.
"""

NEGATIVE_KEYWORDS = ["포기", "노예", "독박", "헬조선"]


def has_negative_signal(text: str) -> bool:
    if not isinstance(text, str):
        return False
    return any(kw in text for kw in NEGATIVE_KEYWORDS)
