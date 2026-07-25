"""Audit proposal source, taxonomy, policy, and department connections.

This script is read-only with respect to source datasets. It writes a CSV and
JSON report under data/audit/ so corrections can be reviewed before any source
or frontend data is changed.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

from proposal_quality import (
    classify_birth_policy_category,
    is_safe_policy_match,
)

BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_PATH = BASE_DIR / "frontend" / "src" / "data" / "mongttang.json"
FINAL_PATH = BASE_DIR / "data" / "final" / "proposals.json"
POLICY_PATH = BASE_DIR / "frontend" / "src" / "data" / "classified_policy.json"
PROCESSED_ROOT = BASE_DIR / "data" / "processed"
OUTPUT_DIR = BASE_DIR / "data" / "audit"

PLACEHOLDER_PHRASES = (
    "접수된 시민 정책 제안입니다",
    "국민신문고를 통해 접수된",
)

POLICY_STOP_WORDS = {
    "서울", "서울시", "서울형", "사업", "정책", "지원", "시행", "관련",
    "이상", "이하", "대상", "시민", "서비스", "제공", "신청",
}

BIRTH_TERMS = (
    "임신", "임산부", "임신부", "출산", "산모", "신생아", "난임", "육아",
    "양육", "보육", "어린이집", "유치원", "다자녀", "아이돌봄", "산후",
    "가임", "영유아", "유모차", "유아차", "신혼부부",
)

PUBLIC_HEALTH_NON_BIRTH = (
    "흡연", "담배", "담배꽁초", "간접흡연", "금연", "폐암",
)

BIRTH_ACTION_TERMS = (
    "임신 지원", "임산부 지원", "출산 지원", "산모 지원", "신생아 지원",
    "육아 지원", "양육 지원", "보육 지원", "아이돌봄", "어린이집",
    "난임 지원", "다자녀 지원", "산후조리", "가임력",
)

NON_BIRTH_DOMAINS = {
    "교통_노인": ("버스", "지하철", "승차", "하차", "교통카드", "시니어패스", "노인", "어르신", "고령자"),
    "흡연_공중보건": PUBLIC_HEALTH_NON_BIRTH,
    "동물": ("반려동물", "유기동물", "강아지", "고양이"),
    "상권_사업자": ("소상공인", "상권", "자영업자", "전통시장"),
}

EXPECTED_TAXONOMY_HINTS = (
    (("주차", "주차비", "교통", "유모차", "유아차"), "주거·교통·도시생활환경"),
    (("실내놀이", "놀이공간", "키즈카페", "놀이터"), "보육·돌봄 인프라"),
    (("난임", "가임력", "임신"), "임신·난임·생식건강"),
    (("산후", "출산", "신생아"), "출산·산후 초기지원"),
    (("어린이집", "유치원", "돌봄", "보육"), "보육·돌봄 인프라"),
    (("다자녀", "양육비", "아동수당", "부모급여"), "다자녀·양육비·생활지원"),
)

SPECIALIZED_DEPARTMENT_TERMS = {
    "다문화지원팀": (
        "다문화", "다문화가족", "결혼이민", "결혼이주", "이주여성",
        "외국인주민", "외국인가족", "중도입국", "통번역", "다누리",
    ),
    "장애인가족지원팀": (
        "장애인", "장애아", "장애", "발달장애", "특수교육", "특수학교", "휠체어",
    ),
    "고령사회정책팀": (
        "노인", "어르신", "고령", "노약자", "경로",
    ),
}


def normalize(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def proposal_id(value: Any) -> str:
    raw = normalize(value)
    if not raw:
        return ""
    if raw.startswith("PROP-"):
        return raw
    match = re.search(r"(\d+)", raw)
    return f"PROP-{match.group(1)}" if match else ""


def is_placeholder(title: str, content: str) -> bool:
    return (
        not content
        or content == title
        or len(content) < 30
        or any(phrase in content for phrase in PLACEHOLDER_PHRASES)
    )


def tokenize(text: str) -> set[str]:
    tokens = re.split(r"""[\s,·()[\]{}<>"'“”‘’/|:+\-]+""", text.lower())
    return {
        re.sub(r"^[^0-9a-z가-힣]+|[^0-9a-z가-힣]+$", "", token)
        for token in tokens
        if len(token) >= 2
    } - POLICY_STOP_WORDS - {""}


def is_outside_scope(title: str, content: str) -> tuple[bool, str]:
    text = f"{title} {content}".lower()
    has_birth = any(term in text for term in BIRTH_TERMS)
    has_birth_action = any(term in text for term in BIRTH_ACTION_TERMS)
    if any(term in text for term in PUBLIC_HEALTH_NON_BIRTH) and not has_birth_action:
        return True, "흡연·공중보건 중심"

    for label, terms in NON_BIRTH_DOMAINS.items():
        hits = [term for term in terms if term in text]
        if len(hits) >= 2 and not has_birth:
            return True, f"{label}: {', '.join(hits[:4])}"
    return False, ""


def taxonomy_hint(title: str, content: str) -> str:
    text = f"{title} {content}".replace(" ", "")
    for terms, category in EXPECTED_TAXONOMY_HINTS:
        if any(term.replace(" ", "") in text for term in terms):
            return category
    return ""


def load_json(path: Path) -> list[dict[str, Any]]:
    return json.loads(path.read_text(encoding="utf-8"))


def load_corrected_exclusions() -> dict[str, str]:
    results: dict[str, str] = {}
    # 과거 ver1/ver2 제외로그는 뒤 단계에서 다시 포함됐을 수 있으므로,
    # 최종 보정 판정이 기록된 ver3 파일만 authoritative하게 사용한다.
    for path in PROCESSED_ROOT.rglob("*보정제외로그_ver3.csv"):
        try:
            with path.open(encoding="utf-8-sig", newline="") as handle:
                for row in csv.DictReader(handle):
                    item_id = proposal_id(
                        row.get("제안ID") or row.get("id") or row.get("SN")
                    )
                    if not item_id:
                        continue
                    reason = normalize(row.get("제외사유"))
                    status = normalize(
                        row.get("출산양육관련여부")
                        or row.get("보정판정")
                        or row.get("판정")
                    )
                    if reason or status == "제외":
                        results[item_id] = (
                            f"{reason or '보정 제외목록 수록'} "
                            f"(근거: {path.relative_to(BASE_DIR)})"
                        )
        except (UnicodeDecodeError, csv.Error):
            continue
    return results


def load_best_local_bodies() -> dict[str, tuple[str, str, str]]:
    best: dict[str, tuple[str, str, str]] = {}
    body_columns = (
        "웹크롤링_상세본문", "content_full", "제안본문내용", "CONTENT", "content",
    )
    for path in PROCESSED_ROOT.rglob("*.csv"):
        try:
            with path.open(encoding="utf-8-sig", newline="") as handle:
                for row in csv.DictReader(handle):
                    item_id = proposal_id(
                        row.get("제안ID") or row.get("id") or row.get("SN")
                    )
                    title = normalize(
                        row.get("제안제목") or row.get("title") or row.get("TITLE")
                    )
                    bodies = [
                        normalize(row.get(col))
                        for col in body_columns
                        if normalize(row.get(col))
                        and not normalize(row.get(col)).startswith(("http://", "https://"))
                    ]
                    body = max(bodies, key=len, default="")
                    if not item_id or not title or is_placeholder(title, body):
                        continue
                    current = best.get(item_id)
                    if current is None or len(body) > len(current[1]):
                        best[item_id] = (
                            title,
                            body,
                            str(path.relative_to(BASE_DIR)),
                        )
        except (UnicodeDecodeError, csv.Error):
            continue
    return best


def load_policies() -> list[dict[str, str]]:
    rows = load_json(POLICY_PATH)
    policies = []
    for row in rows:
        name = normalize(row.get("biz_nm") or row.get("사업명"))
        if name:
            content = " ".join(
                normalize(row.get(field))
                for field in (
                    "사업내용", "지원대상", "이용대상", "사업대상",
                    "사업대분류명", "사업중분류명", "사업소분류명",
                    "Category", "Department",
                )
            )
            policies.append(
                {
                    "name": name,
                    "department": normalize(row.get("Department")),
                    "content": content,
                    "major_category": classify_birth_policy_category(
                        name,
                        content,
                    )[0],
                }
            )
    return policies


def best_policy_match(title: str, content: str, policies: list[dict[str, str]]) -> tuple[str, int]:
    proposal_tokens = tokenize(f"{title} {content}")
    best_name = ""
    best_count = 0
    for policy in policies:
        shared_count = len(proposal_tokens & tokenize(policy["name"]))
        if shared_count > best_count:
            best_name = policy["name"]
            best_count = shared_count
    return (best_name, best_count) if best_count >= 2 else ("", best_count)


def add_issue(
    issues: list[dict[str, Any]],
    item: dict[str, Any],
    issue_type: str,
    severity: str,
    detail: str,
    recommendation: str,
) -> None:
    issues.append(
        {
            "proposal_id": normalize(item.get("id")),
            "title": normalize(item.get("title")),
            "issue_type": issue_type,
            "severity": severity,
            "detail": detail,
            "recommendation": recommendation,
            "category": normalize(item.get("category")),
            "sub_category": normalize(item.get("sub_category")),
            "micro_category": normalize(item.get("micro_category")),
            "department": "; ".join(item.get("department") or []),
            "source_url": normalize(item.get("url")),
        }
    )


def audit() -> tuple[list[dict[str, Any]], dict[str, Any]]:
    frontend = load_json(FRONTEND_PATH)
    final = load_json(FINAL_PATH)
    exclusions = load_corrected_exclusions()
    bodies = load_best_local_bodies()
    policies = load_policies()
    issues: list[dict[str, Any]] = []

    final_by_id = {normalize(item.get("id")): item for item in final}
    frontend_ids = [normalize(item.get("id")) for item in frontend]
    duplicate_ids = {item_id for item_id, count in Counter(frontend_ids).items() if count > 1}

    for item in frontend:
        item_id = normalize(item.get("id"))
        title = normalize(item.get("title"))
        content = normalize(item.get("content"))
        legacy_content = normalize(item.get("CONTENT"))
        url = normalize(item.get("url"))

        if item_id in duplicate_ids:
            add_issue(issues, item, "ID_DUPLICATE", "critical", "최종 화면 데이터에 같은 제안 ID가 중복됨", "중복 행 병합·제거")

        url_match = re.search(r"[?&]sn=(\d+)", url)
        if url_match and item_id != f"PROP-{url_match.group(1)}":
            add_issue(issues, item, "ID_URL_MISMATCH", "critical", f"ID와 URL sn={url_match.group(1)} 불일치", "원본 ID·URL 재동기화")

        final_item = final_by_id.get(item_id)
        if final_item is None:
            add_issue(issues, item, "FINAL_MISSING", "critical", "data/final에는 동일 ID가 없음", "frontend/final 동기화")
        elif item != final_item:
            add_issue(issues, item, "FINAL_FRONTEND_DIFF", "high", "frontend와 final 레코드 내용이 다름", "단일 정본에서 재생성")

        placeholder = is_placeholder(title, content)
        if placeholder:
            add_issue(issues, item, "CONTENT_MISSING", "high", "본문이 없거나 제목 반복형", "원문 재수집 전 정책·부서 판정 보류")

        if legacy_content and len(legacy_content) > len(content) and not is_placeholder(title, legacy_content):
            add_issue(issues, item, "CONTENT_FIELD_STALE", "high", f"CONTENT 필드에 더 긴 본문 존재({len(legacy_content)}자)", "검증 후 content로 승격")

        local_body = bodies.get(item_id)
        if placeholder and local_body and local_body[0] == title:
            add_issue(issues, item, "CONTENT_RECOVERABLE", "high", f"{local_body[2]}에서 {len(local_body[1])}자 본문 복구 가능", "제목·ID 검증 후 본문 복원")

        if (
            item_id in exclusions
            and item.get("connection_status") != "out_of_scope"
        ):
            add_issue(issues, item, "CORRECTED_EXCLUSION_STALE", "high", exclusions[item_id], "최종 데이터에서 제외 또는 별도 범위 밖 보관")

        outside, outside_reason = is_outside_scope(title, content)
        if outside:
            add_issue(issues, item, "OUT_OF_SCOPE", "high", outside_reason, "출산·양육 분석 및 공백 집계에서 제외")

        expected_category = classify_birth_policy_category(title, content)[0]
        actual_category = normalize(item.get("category"))
        if expected_category and expected_category != actual_category:
            add_issue(
                issues,
                item,
                "TAXONOMY_MISMATCH",
                "medium",
                f"내용 기반 후보={expected_category}, 현재={actual_category}",
                "본문 확인 후 대·중·소분류 재분류",
            )

        departments = item.get("department_rankings") or []
        if placeholder and departments:
            add_issue(issues, item, "DEPARTMENT_UNVERIFIABLE", "high", "본문 없이 주관·협조부서가 지정됨", "원문 복구 전 부서 판정 보류")
        if outside and (item.get("department") or departments):
            add_issue(issues, item, "DEPARTMENT_OUT_OF_SCOPE", "high", "범위 밖 제안에 출산 관련 부서가 연결됨", "소관 분야 재분류")
        for ranking in departments:
            if ranking.get("rank", 0) > 1 and int(ranking.get("score") or 0) < 40:
                add_issue(
                    issues,
                    item,
                    "DEPARTMENT_WEAK_EVIDENCE",
                    "medium",
                    (
                        f"{ranking.get('dept_name')} 협조후보 점수 "
                        f"{ranking.get('score')}"
                    ),
                    "일반어 기반 협조후보 제거",
                )
            department_name = normalize(ranking.get("dept_name"))
            required_terms = SPECIALIZED_DEPARTMENT_TERMS.get(department_name)
            if (
                ranking.get("rank", 0) > 1
                and required_terms
                and not any(term in title for term in required_terms)
            ):
                add_issue(
                    issues,
                    item,
                    "DEPARTMENT_CONTEXT_MISMATCH",
                    "high",
                    f"제목에 고유 문맥 없이 {department_name} 협조후보가 연결됨",
                    "제목의 명시적 소관 문맥이 없으면 특수 협조후보 제거",
                )

        stored_policies = item.get("matched_policies") or []
        if placeholder and stored_policies:
            add_issue(issues, item, "POLICY_UNVERIFIABLE", "high", "본문 없이 현행 정책이 저장 연결됨", "정책 연결 제거·보류")

        if not placeholder and not outside and stored_policies:
            policies_by_name = {policy["name"]: policy for policy in policies}
            proposal_is_multi_child = any(
                term in f"{title} {content}"
                for term in ("다둥이", "다자녀", "자녀의 수", "자녀 수")
            )
            for stored_policy in stored_policies:
                stored_name = normalize(stored_policy.get("policy_name"))
                reference = policies_by_name.get(stored_name)
                if reference is None:
                    add_issue(
                        issues,
                        item,
                        "POLICY_REFERENCE_MISSING",
                        "high",
                        f"저장 정책이 공식 정책 원본에 없음: {stored_name}",
                        "정책 원본 ID·이름 재동기화",
                    )
                    continue
                if reference["major_category"] != actual_category:
                    add_issue(
                        issues,
                        item,
                        "POLICY_CATEGORY_MISMATCH",
                        "high",
                        (
                            f"제안={actual_category}, 정책="
                            f"{reference['major_category']}: {stored_name}"
                        ),
                        "서로 다른 정책 대분류 연결 제거",
                    )
                    continue
                multi_child_domain_match = (
                    proposal_is_multi_child
                    and any(
                        term in stored_name
                        for term in ("다둥이", "다자녀", "세자녀", "자녀 2명", "자녀 3명")
                    )
                )
                if not (
                    is_safe_policy_match(title, content, stored_name)
                    or multi_child_domain_match
                ):
                    add_issue(
                        issues,
                        item,
                        "POLICY_WEAK_EVIDENCE",
                        "medium",
                        f"정책명 직접 근거가 약함: {stored_name}",
                        "직접 핵심어 또는 영역별 강한 근거가 없으면 연결 보류",
                    )

    type_counts = Counter(issue["issue_type"] for issue in issues)
    severity_counts = Counter(issue["severity"] for issue in issues)
    affected_ids = {issue["proposal_id"] for issue in issues}
    summary = {
        "frontend_records": len(frontend),
        "final_records": len(final),
        "frontend_final_identical": frontend == final,
        "affected_proposals": len(affected_ids),
        "total_issue_flags": len(issues),
        "issue_type_counts": dict(type_counts.most_common()),
        "severity_counts": dict(severity_counts.most_common()),
        "corrected_exclusion_ids": len(exclusions),
        "recoverable_body_ids": sum(
            1 for item in frontend
            if is_placeholder(normalize(item.get("title")), normalize(item.get("content")))
            and normalize(item.get("id")) in bodies
            and bodies[normalize(item.get("id"))][0] == normalize(item.get("title"))
        ),
    }
    return issues, summary


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-dir", type=Path, default=OUTPUT_DIR)
    args = parser.parse_args()
    issues, summary = audit()
    args.output_dir.mkdir(parents=True, exist_ok=True)

    csv_path = args.output_dir / "proposal_connection_audit.csv"
    json_path = args.output_dir / "proposal_connection_audit_summary.json"
    columns = [
        "proposal_id", "title", "issue_type", "severity", "detail",
        "recommendation", "category", "sub_category", "micro_category",
        "department", "source_url",
    ]
    with csv_path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=columns)
        writer.writeheader()
        writer.writerows(issues)
    json_path.write_text(
        json.dumps(summary, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
