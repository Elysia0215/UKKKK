"""Shared quality gates for proposal ingestion and connection pipelines."""

from __future__ import annotations

import re
from collections import Counter
from typing import Any, Iterable


PLACEHOLDER_PHRASES = (
    "접수된 시민 정책 제안입니다",
    "국민신문고를 통해 접수된",
)

BIRTH_TERMS = (
    "임신", "임산부", "임신부", "출산", "산모", "신생아", "난임", "육아",
    "양육", "보육", "어린이집", "유치원", "다자녀", "아이돌봄", "산후",
    "가임", "영유아", "유모차", "유아차", "신혼부부",
)

BIRTH_POLICY_ACTION_TERMS = (
    "임신 지원", "임산부 지원", "출산 지원", "산모 지원", "신생아 지원",
    "육아 지원", "양육 지원", "보육 지원", "아이돌봄", "어린이집",
    "난임 지원", "다자녀 지원", "산후조리", "가임력",
)

NON_BIRTH_RULES = {
    "흡연·공중보건 중심": (
        "흡연", "담배", "담배꽁초", "간접흡연", "금연", "폐암",
    ),
    "노인 교통 중심": (
        "버스", "지하철", "승차", "하차", "교통카드", "시니어패스",
        "보호구역",
        "노인", "어르신", "고령자",
    ),
    "반려동물 중심": (
        "반려동물", "유기동물", "강아지", "고양이",
    ),
}

POLICY_STOP_WORDS = {
    "서울", "서울시", "서울형", "사업", "정책", "지원", "시행", "관련",
    "이상", "이하", "대상", "시민", "서비스", "제공", "신청",
}

POLICY_FLOW_BY_CATEGORY = {
    "임신·난임·생식건강": "임신 전·임신 중",
    "출산·산후 초기지원": "출산 직후",
    "보육·돌봄 인프라": "영유아기",
    "다자녀·양육비·생활지원": "양육기",
    "주거·교통·도시생활환경": "도시생활 기반",
    "일·가정 양립·부모 노동": "부모 노동·돌봄 병행",
    "취약·다양가족 사각지대": "사각지대 보호",
    "정보·상담·교육·거버넌스": "전 주기 정보·상담",
}

DIRECT_BIRTH_TERMS = (
    "난임", "부모급여", "아동수당", "위기임산부", "미혼모", "보호출산",
    "다태아", "쌍둥이", "모유수유", "산후우울", "유모차", "유아차",
    "임신", "임산부", "임신부", "출산", "산모", "신생아", "육아휴직",
    "근로시간단축", "어린이집", "아이돌봄", "시간제보육", "소아응급",
    "다자녀", "공공키즈카페", "서울형키즈카페", "장난감도서관", "유아숲",
    "숲체험", "유아체험", "수유실", "기저귀교환대", "기저귀갈이대",
)

WEAK_CHILD_TERMS = ("아이", "아동", "어린이", "청소년", "학교", "통학", "스쿨존", "보호구역")
REQUIRED_CHILDCARE_CONTEXT = (
    "어린이집", "유치원", "영유아", "초등돌봄", "돌봄", "양육",
    "부모", "등하원", "통학", "보육", "육아",
)
FACILITY_TERMS = ("도서관", "문화센터", "체육센터", "공공시설", "스포츠센터", "생활SOC")
FACILITY_CONTEXT_TERMS = (
    "수유실", "기저귀교환대", "기저귀갈이대", "유아휴게실", "유모차",
    "유아차", "영유아", "부모교육", "장난감도서관", "키즈카페", "유아숲",
    "숲체험", "유아체험",
)
OUT_OF_SCOPE_TERMS = ("학교폭력", "청소년", "스포츠센터", "생활SOC")


def normalize(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def has_any(text: str, terms: Iterable[str]) -> bool:
    return any(term in text for term in terms)


def classify_birth_relevance(title: Any, content: Any) -> tuple[str, str]:
    """Return include/review/exclude for newly collected external candidates."""
    text = f"{normalize(title)} {normalize(content)}"
    outside, reason = detect_outside_scope(title, content)
    if outside:
        return "exclude", reason
    if has_any(text, DIRECT_BIRTH_TERMS):
        return "include", "직접 출산·양육 키워드"
    if has_any(text, OUT_OF_SCOPE_TERMS) and not has_any(text, DIRECT_BIRTH_TERMS):
        return "exclude", "학교·청소년·생활SOC 중심"
    if has_any(text, FACILITY_TERMS):
        if has_any(text, FACILITY_CONTEXT_TERMS):
            return "include", "시설+육아 편의·체험 맥락"
        return "review", "공공시설 키워드이나 육아 편의 맥락 약함"
    if has_any(text, WEAK_CHILD_TERMS):
        if has_any(text, REQUIRED_CHILDCARE_CONTEXT):
            return "review", "아동 일반어+양육 맥락"
        return "exclude", "아동 일반어 단독"
    return "exclude", "출산·양육 직접성 부족"


def classify_birth_policy_category(title: Any, content: Any = "") -> tuple[str, str, str]:
    title_text = normalize(title)
    text = normalize(f"{title} {content}")

    # 제목은 시민이 직접 요약한 핵심 요구이므로 본문의 일반적인
    # '출산·아이·지원' 표현보다 먼저 판정한다. 구체 수단이 있는 안건이
    # 포괄적인 출산지원 분류에 선점되는 것을 막는다.
    if (
        has_any(title_text, ("임산부석", "배려석", "임산부 배려", "임산부 교통", "유모차", "유아차", "저상버스", "엘리베이터"))
        or ("임산부" in title_text and has_any(title_text, ("뱃지", "배지", "태그")))
    ):
        return "주거·교통·도시생활환경", "임산부·유모차 이동권", "임산부 교통배려·유모차 이동편의"
    if has_any(title_text, ("주차", "통행료", "공공자전거", "따릉이", "대중교통", "교통", "도로", "보호구역")):
        return "주거·교통·도시생활환경", "출산·양육가구 이동환경", "주차·통행·교통안전"
    if has_any(title_text, ("신혼부부", "무주택", "월세", "전세", "주거", "임차", "보증금", "청약", "오피스텔", "공공매입", "매입임대")):
        return "주거·교통·도시생활환경", "출산가구 주거", "신혼부부·출산가구 주거지원"
    if has_any(title_text, ("다자녀", "다둥이", "2자녀", "세자녀", "다태아", "쌍둥이")):
        return "다자녀·양육비·생활지원", "다자녀 혜택", "다자녀 기준·할인·감면"
    if has_any(title_text, ("아동수당", "부모급여", "양육수당", "양육비", "육아비용", "분유", "기저귀", "첫만남이용권")):
        return "다자녀·양육비·생활지원", "양육비·생활비 지원", "분유·기저귀·아동수당·부모급여"
    if has_any(title_text, ("육아휴직", "출산휴가", "근로시간", "유연근무", "재택근무", "단축근무", "직장", "맞벌이")):
        return "일·가정 양립·부모 노동", "육아휴직·근로시간", "휴직·휴가·유연근무"
    if has_any(title_text, ("한부모", "미혼모", "미혼부", "위기임산부", "다문화", "결혼이민", "이주여성")):
        return "취약·다양가족 사각지대", "취약·다양가족 지원", "한부모·다문화·위기임산부"
    if has_any(title_text, ("산후우울", "산후조리", "산모", "모유수유", "신생아", "출산지원금", "출생축하", "출산장려금", "첫만남")):
        return "출산·산후 초기지원", "출산가구 초기지원", "산후회복·신생아·출산지원"
    if has_any(title_text, ("난임", "가임력", "난자동결", "정자검사", "임신준비", "AMH")):
        return "임신·난임·생식건강", "난임·가임력 지원", "난임시술·가임력검사"
    if has_any(title_text, ("키즈카페", "유아숲", "숲체험", "장난감도서관", "놀이공간", "유아휴게실", "영유아쉼터", "수유실", "기저귀교환대")):
        return "보육·돌봄 인프라", "아동 놀이·체험공간", "공공키즈카페·유아숲·수유실"
    if has_any(title_text, ("어린이집", "유치원", "보육", "돌봄", "아이돌봄", "키움센터", "방과후", "육아도우미", "가사관리사", "가사서비스")):
        return "보육·돌봄 인프라", "보육·돌봄 서비스", "어린이집·아이돌봄·돌봄공급"

    # 제목이 포괄적일 때는 본문에 반복되는 구체 정책수단을 먼저 본다.
    if (
        ("임산부" in text and has_any(text, ("배려석", "뱃지", "배지", "교통", "좌석", "태그")))
        or has_any(text, ("유모차 이동", "유아차 이동", "저상버스"))
    ):
        return "주거·교통·도시생활환경", "임산부·유모차 이동권", "임산부 교통배려·유모차 이동편의"
    if has_any(text, ("신혼부부", "무주택", "월세", "전세", "주거", "임차보증금", "청약", "오피스텔", "공공매입", "매입임대")):
        return "주거·교통·도시생활환경", "출산가구 주거", "신혼부부·출산가구 주거지원"
    if has_any(text, ("다자녀", "다둥이", "2자녀", "세자녀", "다태아", "쌍둥이", "자녀의 수", "자녀 수")):
        return "다자녀·양육비·생활지원", "다자녀 혜택", "다자녀 기준·할인·감면"
    if has_any(text, ("육아휴직", "출산휴가", "근로시간단축", "단축근무", "유연근무", "재택근무")):
        return "일·가정 양립·부모 노동", "육아휴직·근로시간", "휴직·휴가·단축근무"
    if has_any(text, ("한부모", "미혼모", "미혼부", "위기임산부", "결혼이민", "결혼이주", "이주여성", "다문화가족")):
        return "취약·다양가족 사각지대", "취약·다양가족 지원", "한부모·다문화·위기임산부"
    if has_any(text, ("공공키즈카페", "서울형키즈카페", "장난감도서관", "유아숲", "숲체험", "유아휴게실", "영유아쉼터", "수유실", "기저귀교환대")):
        return "보육·돌봄 인프라", "아동 놀이·체험공간", "공공키즈카페·유아숲·수유실"
    if has_any(text, ("야간돌봄", "주말돌봄", "휴일돌봄", "아픈아이", "초등돌봄", "키움센터", "방과후", "시간제보육", "어린이집", "아이돌봄")):
        return "보육·돌봄 인프라", "보육·돌봄 서비스", "어린이집·아이돌봄·돌봄공급"

    if has_any(text, ("가임력", "가임력검사", "임신준비", "임신준비검사", "예비부부검진", "신혼부부검진", "정자검사", "난소나이", "난자냉동", "정자냉동")):
        return "임신·난임·생식건강", "임신 준비·가임력 지원", "가임력검사·난자냉동·예비부부검진"
    if has_any(text, ("난임", "난임시술", "난임주사", "PGT", "유전자검사", "AMH")):
        return "임신·난임·생식건강", "난임 지원", "난임시술·주사·시술비"
    if has_any(text, ("임신", "임산부", "임신부", "산전검사", "생식건강", "임신상담")):
        return "임신·난임·생식건강", "임산부 건강·배려", "임산부 건강관리·배려"

    if has_any(text, ("산후우울", "산후우울증", "산모건강", "산모회복", "산모지원", "산모교실", "모유수유", "수유상담", "산후검진", "공공산후조리")):
        return "출산·산후 초기지원", "산모 회복·건강관리", "산후우울·산후검진·수유상담"
    if has_any(text, ("산후", "산모", "산후조리", "신생아 도우미", "조리원")):
        return "출산·산후 초기지원", "산후조리", "산후조리·산모도우미"
    if has_any(text, ("출산지원금", "출생축하", "출산장려금", "첫만남", "신생아", "출산")):
        return "출산·산후 초기지원", "출산가구 초기지원", "출산지원금·출생축하"

    if has_any(text, ("돌봄공백", "보육공백", "야간돌봄", "주말돌봄", "휴일돌봄", "새벽돌봄", "아픈아이", "아픈아이돌봄", "병아동", "병아동돌봄", "틈새돌봄")):
        return "보육·돌봄 인프라", "긴급·시간제 돌봄", "야간·주말·아픈아이 돌봄"
    if has_any(text, ("소아과", "소아청소년과", "소아응급", "소아응급실", "달빛어린이병원", "어린이병원", "아동병원", "야간진료", "휴일진료", "영유아검진", "예방접종")):
        return "보육·돌봄 인프라", "아동 건강·의료 접근성", "소아응급·야간진료·영유아검진"
    if has_any(text, ("공공키즈카페", "서울형키즈카페", "장난감도서관", "유아숲", "숲체험", "유아체험", "유아휴게실", "수유실", "모유수유실", "기저귀교환대", "기저귀갈이대", "키즈존")):
        return "보육·돌봄 인프라", "아동 놀이·체험공간", "공공키즈카페·유아숲·수유실"
    if has_any(text, ("초등돌봄", "키움센터", "방과후", "방학돌봄", "초등학생", "등하원", "하원", "등원")):
        return "보육·돌봄 인프라", "초등돌봄", "초등돌봄·방과후"
    if has_any(text, ("어린이집", "유치원", "보육교사", "보육", "특별보육", "시간제보육")):
        return "보육·돌봄 인프라", "어린이집·유치원", "보육시설·유아교육"
    if has_any(text, ("아이돌봄", "조부모", "긴급돌봄", "가족돌봄", "일시돌봄", "돌봄")):
        return "보육·돌봄 인프라", "가족돌봄", "아이돌봄·조부모돌봄"

    if has_any(text, ("가족화장실", "어린이화장실", "아기쉼터", "영유아쉼터", "아동친화")):
        return "주거·교통·도시생활환경", "아이동반 공공시설", "가족화장실·아이동반 편의시설"
    if has_any(text, ("임산부석", "배려석", "뱃지", "태그", "임산부 좌석", "임산부 교통")):
        return "주거·교통·도시생활환경", "임산부 이동권", "임산부 교통배려"
    if has_any(text, ("유모차", "유아차", "저상버스", "엘리베이터")):
        return "주거·교통·도시생활환경", "유모차 이동권", "유모차·유아차 이동편의"
    if has_any(text, ("신혼부부", "신생아 특례대출", "무주택", "월세", "전세", "주거", "임차보증금", "청약", "오피스텔", "공공매입", "매입임대")):
        return "주거·교통·도시생활환경", "출산가구 주거", "신혼부부·출산가구 주거지원"

    if has_any(text, ("분유", "기저귀", "이유식", "아동수당", "부모급여", "양육수당", "첫만남이용권", "양육비", "양육비용", "육아비용")):
        return "다자녀·양육비·생활지원", "양육비·생활비 지원", "분유·기저귀·아동수당·부모급여"
    if has_any(text, ("다자녀", "다둥이", "2자녀", "세자녀", "양육부담", "육아부담")):
        return "다자녀·양육비·생활지원", "다자녀 혜택", "다자녀 기준·할인·감면"

    if has_any(text, ("재택", "유연근무", "단축근무", "퇴근", "출근")) and has_any(text, ("육아", "자녀", "부모", "아이")):
        return "일·가정 양립·부모 노동", "유연근무·재택근무", "부모 노동시간·돌봄 병행"
    if has_any(text, ("육아휴직", "출산휴가", "근로시간")):
        return "일·가정 양립·부모 노동", "육아휴직·근로시간", "휴직·휴가·단축근무"

    if has_any(text, ("한부모", "미혼모", "미혼부", "위기임산부")):
        return "취약·다양가족 사각지대", "한부모·위기임산부", "한부모·미혼부모·위기임산부"

    if has_any(text, ("초보부모", "공동육아", "육아커뮤니티", "부모모임", "아빠육아", "남성육아", "초보엄마", "초보아빠", "부모교육")):
        return "정보·상담·교육·거버넌스", "부모·가족 교육/상담", "초보부모·공동육아·육아정보"
    if has_any(text, ("저출산", "저출생", "고령화")) and has_any(text, ("정책", "대책", "제안", "아이디어", "홍보", "인식개선")):
        return "정보·상담·교육·거버넌스", "저출산 정책 일반", "인식개선·정책제안"
    if has_any(text, ("양육지원", "이용대상", "신청기준", "서류제출")):
        return "정보·상담·교육·거버넌스", "양육지원 서비스 접근성", "신청·이용대상 기준 개선"
    if has_any(text, ("앱", "플랫폼", "신청", "상담", "홍보", "정보", "거버넌스")):
        return "정보·상담·교육·거버넌스", "정보 접근성", "정보통합·상담·신청"

    return "정보·상담·교육·거버넌스", "정보 접근성", "일반 출산정책 안건"


def normalize_policy_tags(item: dict[str, Any]) -> dict[str, Any]:
    """Recalculate taxonomy fields from title/body so regenerated data stays aligned."""
    category, sub_category, micro_category = classify_birth_policy_category(
        item.get("title") or item.get("TITLE"),
        item.get("content") or item.get("CONTENT") or item.get("content_full"),
    )
    item["category"] = category
    item["sub_category"] = sub_category
    item["micro_category"] = micro_category
    item["policy_flow"] = POLICY_FLOW_BY_CATEGORY.get(category, "전 주기")
    return item


def proposal_id(value: Any) -> str:
    raw = normalize(value)
    if not raw:
        return ""
    if raw.startswith("PROP-"):
        return raw
    try:
        return f"PROP-{int(float(raw))}"
    except ValueError:
        match = re.search(r"(\d+)", raw)
        return f"PROP-{match.group(1)}" if match else ""


def is_placeholder_content(title: Any, content: Any) -> bool:
    normalized_title = normalize(title)
    normalized_content = normalize(content)
    return (
        not normalized_content
        or normalized_content == normalized_title
        or len(normalized_content) < 30
        or normalized_content.startswith(("http://", "https://"))
        or any(phrase in normalized_content for phrase in PLACEHOLDER_PHRASES)
    )


def detect_outside_scope(title: Any, content: Any) -> tuple[bool, str]:
    text = f"{normalize(title)} {normalize(content)}".lower()
    has_birth_term = any(term in text for term in BIRTH_TERMS)
    has_birth_action = any(term in text for term in BIRTH_POLICY_ACTION_TERMS)

    public_health_hits = [
        term for term in NON_BIRTH_RULES["흡연·공중보건 중심"] if term in text
    ]
    if public_health_hits and not has_birth_action:
        return True, (
            "흡연·공중보건 중심: "
            + ", ".join(public_health_hits[:4])
        )

    for label, terms in NON_BIRTH_RULES.items():
        if label == "흡연·공중보건 중심":
            continue
        hits = [term for term in terms if term in text]
        if len(hits) >= 2 and not has_birth_term:
            return True, f"{label}: {', '.join(hits[:4])}"
    return False, ""


def tokenize_policy_text(text: Any) -> set[str]:
    tokens = re.split(
        r"""[\s,·()[\]{}<>"'“”‘’/|:+\-]+""",
        normalize(text).lower(),
    )
    normalized_tokens: set[str] = set()
    for token in tokens:
        cleaned = re.sub(
            r"^[^0-9a-z가-힣]+|[^0-9a-z가-힣]+$",
            "",
            token,
        )
        if len(cleaned) < 2:
            continue
        # 한국어 조사 때문에 같은 핵심어가 달라지는 것을 최소 범위에서
        # 정규화한다(예: 난임부부의 -> 난임부부).
        stripped = re.sub(
            r"(으로|에서|에게|까지|부터|처럼|보다|이나|거나|은|는|이|가|을|를|의|에|와|과|도|만)$",
            "",
            cleaned,
        )
        normalized_tokens.add(
            stripped if len(stripped) >= 2 else cleaned
        )
    return normalized_tokens - POLICY_STOP_WORDS - {""}


def policy_shared_keyword_count(
    proposal_title: Any,
    proposal_content: Any,
    policy_name: Any,
) -> int:
    proposal_tokens = tokenize_policy_text(
        f"{normalize(proposal_title)} {normalize(proposal_content)}"
    )
    return len(proposal_tokens & tokenize_policy_text(policy_name))


def is_safe_policy_match(
    proposal_title: Any,
    proposal_content: Any,
    policy_name: Any,
) -> bool:
    if is_placeholder_content(proposal_title, proposal_content):
        return False
    outside, _ = detect_outside_scope(proposal_title, proposal_content)
    if outside:
        return False
    return policy_shared_keyword_count(
        proposal_title,
        proposal_content,
        policy_name,
    ) >= 2


def apply_quality_gate(item: dict[str, Any]) -> dict[str, Any]:
    """Annotate an item and clear unsafe computed connections."""
    title = normalize(item.get("title") or item.get("TITLE"))
    content = normalize(item.get("content") or item.get("CONTENT"))
    flags: list[str] = []

    curated_exclusion_reason = normalize(
        item.get("curated_scope_exclusion_reason")
    )
    outside, reason = detect_outside_scope(title, content)
    if curated_exclusion_reason:
        status = "out_of_scope"
        flags.append("CURATED_OUT_OF_SCOPE")
        item["scope_exclusion_reason"] = curated_exclusion_reason
    elif outside:
        status = "out_of_scope"
        flags.append("OUT_OF_SCOPE")
        item["scope_exclusion_reason"] = reason
    elif is_placeholder_content(title, content):
        status = "source_missing"
        flags.append("CONTENT_MISSING")
        item.pop("scope_exclusion_reason", None)
    else:
        status = "reviewable"
        item.pop("scope_exclusion_reason", None)

    item["connection_status"] = status
    item["quality_flags"] = flags

    if status != "reviewable":
        item["department"] = []
        item["department_rankings"] = []
        item["matched_policies"] = []

    return item


def prepare_proposals(
    items: Iterable[dict[str, Any]],
    *,
    exclude_out_of_scope: bool = True,
) -> list[dict[str, Any]]:
    prepared: list[dict[str, Any]] = []
    for raw in items:
        item = apply_quality_gate(dict(raw))
        if exclude_out_of_scope and item["connection_status"] == "out_of_scope":
            continue
        prepared.append(item)
    return prepared


def validate_proposals(items: list[dict[str, Any]]) -> list[str]:
    errors: list[str] = []
    ids = [proposal_id(item.get("id")) for item in items]
    duplicates = [item_id for item_id, count in Counter(ids).items() if count > 1]
    if duplicates:
        errors.append(f"duplicate proposal IDs: {', '.join(duplicates[:10])}")

    for item in items:
        item_id = proposal_id(item.get("id"))
        url = normalize(item.get("url"))
        url_match = re.search(r"[?&]sn=(\d+)", url)
        if url_match and item_id != f"PROP-{url_match.group(1)}":
            errors.append(
                f"{item_id}: URL sn mismatch ({url_match.group(1)})"
            )
        if item.get("connection_status") != "reviewable":
            if item.get("department") or item.get("department_rankings"):
                errors.append(f"{item_id}: unsafe department connection remains")
            if item.get("matched_policies"):
                errors.append(f"{item_id}: unsafe policy connection remains")
    return errors
