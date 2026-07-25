"""
6단계: 426건 출산·육아 제안 데이터에
1) 출산정책관련 업무담당.xlsx (18개 실무 분장) 기반 부서 매칭 Top 3 랭킹
2) classified_policy.json (몽땅정보 322건) 기반 연관 기존 정책 혜택 정보
를 파싱 매핑하여 frontend/final 제안 JSON을 함께 갱신한다.
"""
import json
import ast
import csv
import re
import pandas as pd
from pathlib import Path
from proposal_quality import (
    apply_quality_gate,
    classify_birth_policy_category,
    is_safe_policy_match,
    normalize_policy_tags,
    validate_proposals,
)

BASE_DIR = Path(__file__).resolve().parent.parent
EXCEL_PATH = BASE_DIR / "data" / "mongttang" / "출산정책관련_업무담당.xlsx"
CLASSIFIED_PATH = BASE_DIR / "frontend" / "src" / "data" / "classified_policy.json"
PROPOSALS_PATH = BASE_DIR / "data" / "final" / "proposals.json"
FRONTEND_PROPOSALS_PATH = BASE_DIR / "frontend" / "src" / "data" / "mongttang.json"
PROCESSED_ROOT = BASE_DIR / "data" / "processed"

WORK_LIFE_TERMS = [
    "육아휴직", "근로시간", "근로단축", "단축근무", "출산휴가", "돌봄휴가",
    "복직", "퇴사", "맞벌이", "직장", "프리랜서", "자영업"
]
WORK_POLICY_TERMS = [
    "육아휴직", "근로시간", "출산휴가", "일생활", "일·생활", "일?생활",
    "생활 균형", "프리랜서", "자영업", "아이돌봄"
]
HOUSING_POLICY_TERMS = [
    "신혼부부", "신혼", "무주택", "주거", "주택", "임차", "보증금",
    "대출", "희망타운", "살림비용", "결혼"
]
PREGNANT_TRANSPORT_TERMS = [
    "임산부 배려석", "임산부배려석", "임산부석", "배려석", "뱃지", "배지",
    "지하철", "버스", "대중교통", "교통약자", "좌석", "양보"
]
PREGNANT_TRANSPORT_POLICY_TERMS = [
    "임산부 배려공간", "배려공간", "교통 약자", "양보", "엘리베이터",
    "임산부 교통", "KTX", "SRT"
]
CHILD_FRIENDLY_PLACE_TERMS = [
    "키즈오케이존", "키즈 오케이존", "아이 동반", "아이와 양육자",
    "음식점", "카페", "외식", "환영받고", "아이의자", "아이식기"
]
DISABILITY_TERMS = ["장애인", "장애아", "장애", "발달장애", "특수교육", "특수학교", "휠체어"]
DISABILITY_POLICY_TERMS = ["장애인가정", "장애인", "장애아", "장애", "홈헬퍼", "여성장애인"]
UTILITY_POLICY_TERMS = ["하수도", "상하수도", "수도요금", "전기요금", "도시가스"]
UTILITY_PROPOSAL_TERMS = ["하수도", "상하수도", "수도요금", "전기요금", "도시가스", "공공요금"]
VEHICLE_TAX_POLICY_TERMS = ["자동차 취득세", "차량 취득세", "취득세"]
VEHICLE_TAX_PROPOSAL_TERMS = ["자동차 취득세", "차량 취득세", "취득세", "자동차 구입", "차량 구입", "자동차 구매", "차량 구매"]
HOUSING_PROPOSAL_TERMS = [
    "주거", "주택", "전세", "임차", "보증금", "대출", "무주택",
    "오피스텔", "공공매입", "매입임대", "청약"
]
NON_HOUSING_BENEFIT_TERMS = ["하수도", "자동차", "차량", "취득세", "전기", "도시가스"]
GENERAL_POLICY_TERMS = [
    "보육", "돌봄", "산후조리", "다자녀", "임산부", "응급", "바우처",
    "난임", "유모차", "수유", "기저귀", "아이돌봄", "어린이집"
]
MULTICULTURAL_TERMS = [
    "다문화", "다문화가족", "결혼이민", "결혼이주", "이주여성",
    "외국인주민", "외국인가족", "중도입국", "통번역", "다누리",
]
MULTI_CHILD_PROPOSAL_TERMS = [
    "다둥이", "다자녀", "자녀의 수", "자녀 수",
]
MULTI_CHILD_POLICY_TERMS = [
    "다둥이", "다자녀", "세자녀", "자녀 2명", "자녀 3명",
]
DEPARTMENT_STOP_WORDS = {
    "서울", "서울시", "시민", "정책", "사업", "지원", "관련", "대한",
    "위한", "대상", "운영", "관리", "업무", "정보", "서비스", "제안",
    "필요", "확대", "개선", "추진", "검토", "경우", "통해", "있는",
    "없는", "않은", "않는", "하지", "되지", "생활", "예산", "평가",
}
DEPARTMENT_CONTEXT_TERMS = {
    "다문화지원팀": MULTICULTURAL_TERMS,
    "장애인가족지원팀": DISABILITY_TERMS,
    "고령사회정책팀": ["노인", "어르신", "고령", "노약자", "경로"],
    "건강임신지원팀": [
        "난임", "가임력", "난자동결", "임신준비", "산전검사", "AMH",
    ],
    "가족지원팀": [
        "육아휴직", "근로시간", "단축근무", "출산휴가", "돌봄휴가",
        "한부모", "미혼모", "미혼부", "양육비", "가족지원",
    ],
    "돌봄사업팀": [
        "아이돌봄", "초등돌봄", "긴급돌봄", "시간제보육", "어린이집",
        "키움센터", "방과후", "보육교사",
    ],
}

CATEGORY_PRIMARY_DEPT = {
    "임신·난임·생식건강": "건강임신지원팀",
    "출산·산후 초기지원": "가족건강팀",
    "보육·돌봄 인프라": "돌봄사업팀",
    "다자녀·양육비·생활지원": "저출생사업1팀",
    "주거·교통·도시생활환경": "저출생사업1팀",
    "일·가정 양립·부모 노동": "가족지원팀",
    "취약·다양가족 사각지대": "가족지원팀",
    "정보·상담·교육·거버넌스": "저출생사업1팀",
}

def has_any(text, terms):
    return any(term in text for term in terms)

def policy_text(pol):
    fields = [
        "사업명", "사업내용", "지원대상", "이용대상", "사업대상", "Category",
        "사업대분류명", "사업중분류명", "사업소분류명", "Department"
    ]
    return " ".join(str(pol.get(field, "") or "") for field in fields)


def load_curated_scope_exclusions():
    """Load authoritative final exclusion decisions from collection review."""
    exclusions = {}
    for path in PROCESSED_ROOT.rglob("*보정제외로그_ver3.csv"):
        try:
            with path.open(encoding="utf-8-sig", newline="") as handle:
                for row in csv.DictReader(handle):
                    raw_id = str(
                        row.get("제안ID") or row.get("id") or row.get("SN") or ""
                    ).strip()
                    match = re.search(r"(\d+)", raw_id)
                    if not match:
                        continue
                    item_id = f"PROP-{match.group(1)}"
                    reason = str(row.get("제외사유") or "최종 보정 제외").strip()
                    status = str(
                        row.get("출산양육관련여부")
                        or row.get("보정판정")
                        or row.get("판정")
                        or ""
                    ).strip()
                    if reason or status == "제외":
                        exclusions[item_id] = reason or "최종 보정 제외"
        except (UnicodeDecodeError, csv.Error):
            continue
    return exclusions

# 1. 엑셀 실무 부서 정보 로드
dept_df = pd.read_excel(EXCEL_PATH)
dept_info_list = []

for _, row in dept_df.iterrows():
    dept_name = str(row.iloc[0]).strip()
    position = str(row.iloc[1]).strip() if pd.notna(row.iloc[1]) else ""
    phone = str(row.iloc[2]).strip() if pd.notna(row.iloc[2]) else ""
    duty = str(row.iloc[3]).strip() if pd.notna(row.iloc[3]) else ""
    location = str(row.iloc[4]).strip() if pd.notna(row.iloc[4]) else ""
    
    # 단축 팀명 추출 (예: '저출생사업1팀', '돌봄사업팀', '가족지원팀', '가족건강팀' 등)
    short_dept = dept_name.split()[-1] if len(dept_name.split()) > 0 else dept_name
    
    dept_info_list.append({
        "full_dept": dept_name,
        "short_dept": short_dept,
        "position": position,
        "phone": phone,
        "duty": duty,
        "location": location
    })

# 2. 몽땅정보 322건 정책 사업 데이터 로드
with open(CLASSIFIED_PATH, "r", encoding="utf-8") as f:
    classified_policies = json.load(f)

# 3. Proposals 426건 로드 및 매핑
with open(PROPOSALS_PATH, "r", encoding="utf-8") as f:
    proposals = json.load(f)

def match_department_rankings(proposal):
    apply_quality_gate(proposal)
    if proposal.get("connection_status") != "reviewable":
        return []
    title_content = proposal["title"] + " " + proposal["content"]
    title = proposal["title"]
    cat = proposal["category"]
    
    scored_depts = []
    for info in dept_info_list:
        score = 0
        reasons = []
        # 카테고리 매칭 가중치
        if cat in info["duty"] or cat in info["full_dept"]:
            score += 30
            reasons.append("카테고리 업무 일치")
        
        # 업무분장 키워드 매칭
        words = {
            word for word in re.findall(r"[0-9A-Za-z가-힣]+", title_content)
            if len(word) >= 2 and word not in DEPARTMENT_STOP_WORDS
        }
        for w in words:
            if len(w) >= 2 and w in info["duty"]:
                score += 10
                reasons.append(f"업무 키워드: {w}")

        context_terms = DEPARTMENT_CONTEXT_TERMS.get(info["short_dept"], [])
        # 다문화·장애·고령은 본문 속 비교·사례 언급만으로 협조부서가
        # 되기 쉬우므로 제목에서 핵심 의제로 명시된 경우만 가산한다.
        context_source = (
            title
            if info["short_dept"] in {
                "다문화지원팀", "장애인가족지원팀", "고령사회정책팀",
            }
            else title_content
        )
        context_hits = [term for term in context_terms if term in context_source]
        if context_hits:
            score += 60
            reasons.append(f"부서 고유 문맥: {', '.join(context_hits[:3])}")
        
        # 지정된 department 배열에 포함되어 있으면 보너스
        if any(info["short_dept"] in d or d in info["short_dept"] for d in proposal["department"]):
            score += 50
            reasons.append("기존 담당부서 일치")
            
        scored_depts.append({
            "dept_name": info["short_dept"],
            "full_dept": info["full_dept"],
            "score": score,
            "phone": info["phone"],
            "location": info["location"],
            "position": info["position"],
            "duty_summary": info["duty"].split("\n")[0] if info["duty"] else "",
            "matching_reason": ", ".join(dict.fromkeys(reasons)),
        })
    
    scored_depts.sort(key=lambda x: (-x["score"], x["dept_name"]))
    
    # 중복 팀 제거 후 Top 3 선택
    unique_depts = []
    seen = set()
    for d in scored_depts:
        # 협조부서는 일반어 한두 개가 아니라 최소한 기존 담당 근거,
        # 카테고리 일치 또는 부서 고유 문맥이 있을 때만 후보로 남긴다.
        if d["score"] < 40:
            continue
        if d["dept_name"] not in seen:
            seen.add(d["dept_name"])
            unique_depts.append(d)
        if len(unique_depts) >= 3:
            break
            
    rankings = []
    for i, d in enumerate(unique_depts):
        rankings.append({
            "rank": i + 1,
            "role_type": "주관부서" if i == 0 else f"협조부서 ({i+1}순위)",
            "dept_name": d["dept_name"],
            "full_dept": d["full_dept"],
            "phone": d["phone"],
            "location": d["location"],
            "duty_summary": d["duty_summary"],
            "matching_reason": d["matching_reason"],
            "score": d["score"],
        })
    return apply_department_override(proposal, rankings)

def apply_department_override(proposal, rankings):
    """Remove detailed-team matches that only look related by generic wording."""
    title_content = f"{proposal.get('title', '')} {proposal.get('content', '')}"
    title = proposal.get("title", "")
    has_disability_context = any(
        kw in title
        for kw in ["장애인", "장애아", "장애", "발달장애", "특수교육", "특수학교", "휠체어"]
    )
    family_support_context = any(
        kw in title_content
        for kw in [
            "육아휴직", "근로시간", "단축근무", "출산휴가", "돌봄휴가",
            "한부모", "미혼모", "미혼부", "양육비", "가족지원"
        ]
    )
    has_staff_context = any(
        kw in title_content
        for kw in ["서울시 직원", "시 공무원", "출산직원", "시청 직원", "구청 직원"]
    )
    has_elderly_context = any(
        kw in title
        for kw in ["노인", "어르신", "고령", "노약자", "경로"]
    )
    has_pregnancy_health_context = any(
        kw in title_content
        for kw in [
            "임신", "임산부", "난임", "가임", "생식", "산전", "산후우울",
            "검진", "시술", "배려석", "배려 뱃지", "배려뱃지"
        ]
    )
    has_multicultural_context = any(
        kw in title
        for kw in MULTICULTURAL_TERMS
    )
    blocked_departments = set()

    if not has_disability_context:
        blocked_departments.add("장애인가족지원팀")
    if not has_staff_context:
        blocked_departments.update(["건강팀", "후생노무팀"])
    if not has_elderly_context:
        blocked_departments.add("고령사회정책팀")
    if not has_pregnancy_health_context:
        blocked_departments.add("건강임신지원팀")
    # '문화·여성·지원·돌봄' 같은 일반 단어만으로 다문화지원팀이
    # 협조부서에 포함되지 않도록 명시적인 다문화 문맥을 요구한다.
    if not has_multicultural_context:
        blocked_departments.add("다문화지원팀")

    if blocked_departments:
        rankings = [
            ranking for ranking in rankings
            if ranking.get("dept_name") not in blocked_departments
        ]

    if family_support_context and not has_disability_context:
        family_index = next(
            (idx for idx, item in enumerate(rankings) if item.get("dept_name") == "가족지원팀"),
            None,
        )
        if family_index is not None:
            family = rankings.pop(family_index)
            rankings.insert(0, family)

    category_primary = CATEGORY_PRIMARY_DEPT.get(proposal.get("category"))
    if category_primary and category_primary not in blocked_departments:
        primary_index = next(
            (idx for idx, item in enumerate(rankings) if item.get("dept_name") == category_primary),
            None,
        )
        if primary_index is not None:
            primary = rankings.pop(primary_index)
        else:
            dept_info = next(
                (info for info in dept_info_list if info["short_dept"] == category_primary),
                None,
            )
            primary = {
                "rank": 1,
                "role_type": "주관부서",
                "dept_name": category_primary,
                "full_dept": dept_info["full_dept"] if dept_info else category_primary,
                "phone": dept_info["phone"] if dept_info else "",
                "location": dept_info["location"] if dept_info else "",
                "duty_summary": dept_info["duty"].split("\n")[0] if dept_info and dept_info["duty"] else "",
                "matching_reason": "대분류 담당군 기준 보정",
                "score": 100,
            }
        rankings.insert(0, primary)
        rankings = rankings[:3]

    for idx, item in enumerate(rankings, start=1):
        item["rank"] = idx
        item["role_type"] = "주관부서" if idx == 1 else f"협조부서 ({idx}순위)"

    return rankings

def match_policies(proposal):
    apply_quality_gate(proposal)
    if proposal.get("connection_status") != "reviewable":
        return []
    title_content = proposal["title"] + " " + proposal["content"]
    cat = proposal["category"]
    is_work_life_proposal = has_any(title_content, WORK_LIFE_TERMS)
    is_multi_child_proposal = has_any(title_content, MULTI_CHILD_PROPOSAL_TERMS)
    has_disability_context = has_any(title_content, DISABILITY_TERMS)
    is_housing_proposal = has_any(title_content, HOUSING_PROPOSAL_TERMS)
    is_pregnant_transport_proposal = (
        "임산부" in title_content
        and has_any(title_content, PREGNANT_TRANSPORT_TERMS)
    )
    
    matched = []
    for pol in classified_policies:
        pol_cat = pol.get("Category", "")
        pol_title = pol.get("사업명", "")
        pol_content = pol.get("사업내용", "") or ""
        full_policy_text = policy_text(pol)
        policy_major_category = classify_birth_policy_category(
            pol_title,
            full_policy_text,
        )[0]

        # 서로 다른 정책 대분류를 일반 단어 몇 개만으로 연결하지 않는다.
        # 예: 다둥이카드 개선 요구 ↔ 외국인 가사관리사.
        if policy_major_category != cat:
            continue

        # 다둥이·다자녀 제안은 본문에 '맞벌이' 같은 일반 생활어가 있어도
        # 돌봄사업보다 다자녀 정책을 직접 대조해야 한다.
        if (
            is_multi_child_proposal
            and not has_any(pol_title, MULTI_CHILD_POLICY_TERMS)
        ):
            continue
        if not has_disability_context and has_any(full_policy_text, DISABILITY_POLICY_TERMS):
            continue
        if has_any(full_policy_text, UTILITY_POLICY_TERMS) and not has_any(title_content, UTILITY_PROPOSAL_TERMS):
            continue
        if has_any(full_policy_text, VEHICLE_TAX_POLICY_TERMS) and not has_any(title_content, VEHICLE_TAX_PROPOSAL_TERMS):
            continue
        if (
            is_housing_proposal
            and has_any(full_policy_text, NON_HOUSING_BENEFIT_TERMS)
            and not has_any(full_policy_text, HOUSING_POLICY_TERMS)
        ):
            continue
        if (
            is_work_life_proposal
            and has_any(full_policy_text, HOUSING_POLICY_TERMS)
            and not has_any(full_policy_text, WORK_POLICY_TERMS)
        ):
            continue
        if is_pregnant_transport_proposal:
            if has_any(full_policy_text, CHILD_FRIENDLY_PLACE_TERMS):
                continue
            if not has_any(full_policy_text, PREGNANT_TRANSPORT_POLICY_TERMS):
                continue
        
        score = 0
        if policy_major_category == cat:
            score += 40
        
        for kw in GENERAL_POLICY_TERMS:
            if kw in title_content and kw in full_policy_text:
                score += 30

        for kw in WORK_LIFE_TERMS:
            if kw in title_content and kw in full_policy_text:
                score += 35

        if is_work_life_proposal and has_any(full_policy_text, WORK_POLICY_TERMS):
            score += 25
        if is_multi_child_proposal and has_any(pol_title, MULTI_CHILD_POLICY_TERMS):
            score += 80
            if "다둥이" in title_content and "다둥이" in pol_title:
                score += 50
            if "카드" in title_content and "카드" in pol_title:
                score += 40
        if is_pregnant_transport_proposal and has_any(full_policy_text, PREGNANT_TRANSPORT_POLICY_TERMS):
            score += 40
                
        safe_text_match = is_safe_policy_match(
            proposal["title"],
            proposal["content"],
            pol_title,
        )
        safe_domain_match = (
            is_multi_child_proposal
            and has_any(pol_title, MULTI_CHILD_POLICY_TERMS)
        )
        if score >= 40 and (safe_text_match or safe_domain_match):
            matched.append({
                "policy_id": pol.get("사업소분류명") or pol_title,
                "policy_name": pol_title,
                "summary": pol_content[:120] + ("..." if len(pol_content) > 120 else ""),
                "apply_url": pol.get("신청하기사이트주소") if (pol.get("신청하기사이트주소") and pol.get("신청하기사이트주소") != ".") else "https://umsa.seoul.go.kr/",
                "dept_name": pol.get("Department", "담당팀"),
                "score": score
            })
            
    matched.sort(key=lambda x: x["score"], reverse=True)
    return matched[:5]

# Proposals 갱신
curated_scope_exclusions = load_curated_scope_exclusions()
for p in proposals:
    exclusion_reason = curated_scope_exclusions.get(p.get("id"))
    if exclusion_reason:
        p["curated_scope_exclusion_reason"] = exclusion_reason
    else:
        p.pop("curated_scope_exclusion_reason", None)
    normalize_policy_tags(p)
    apply_quality_gate(p)
    p["department_rankings"] = match_department_rankings(p)
    p["matched_policies"] = match_policies(p)

validation_errors = validate_proposals(proposals)
if validation_errors:
    raise ValueError(
        "제안 연결 품질검증 실패:\n- " + "\n- ".join(validation_errors)
    )

serialized = json.dumps(proposals, ensure_ascii=False, indent=2) + "\n"
PROPOSALS_PATH.write_text(serialized, encoding="utf-8")
FRONTEND_PROPOSALS_PATH.write_text(serialized, encoding="utf-8")

print(f"제안 데이터 2개 경로 동기화 완료: {len(proposals)}건 (부서 랭킹 Top 3 및 몽땅정보 연관 혜택 포함)")
