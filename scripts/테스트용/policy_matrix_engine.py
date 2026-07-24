#!/usr/bin/env python3
"""정책 제안 데이터를 문제 단위로 진단하는 표준 라이브러리 기반 엔진.

입력 CSV 예시 헤더:
id,category,title,content,source,created_at,unresolved,urgency,feasibility,policy_coverage

점수형 필드는 0~100이며 비어 있으면 텍스트와 데이터 분포로 추정한다.
외부 패키지 없이 실행할 수 있다.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import math
import re
from collections import Counter, defaultdict
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path
from statistics import mean
from typing import Iterable


CLUSTER_RULES = {
    "임신·출산 이용기준": ("임산부", "임신", "출산", "산후", "난임", "배려석"),
    "돌봄·보육 접근성": ("돌봄", "보육", "어린이집", "아이돌봄", "대기"),
    "정신건강·상담": ("심리", "상담", "정신건강", "우울", "불안", "마음건강"),
    "의료비·경제 부담": ("의료비", "진료비", "비용", "부담", "지원금", "보험"),
    "의료 접근성": ("병원", "의료", "진료", "예약", "야간", "응급"),
    "주거·이동 환경": ("주거", "교통", "버스", "지하철", "보행", "주차"),
    "정보·신청 접근성": ("신청", "서류", "온라인", "정보", "안내", "절차"),
}

URGENT_WORDS = ("긴급", "위험", "안전", "응급", "폭력", "자살", "생명", "즉시")
EASY_WORDS = ("안내", "홍보", "기준", "절차", "신청", "정보", "개선")


@dataclass
class Item:
    id: str
    category: str
    title: str
    content: str
    source: str
    created_at: str
    unresolved: float | None
    urgency: float | None
    feasibility: float | None
    policy_coverage: float | None

    @property
    def text(self) -> str:
        return f"{self.title} {self.content}".strip()


@dataclass
class Diagnosis:
    category: str
    cluster: str
    item_count: int
    source_count: int
    demand: int
    policy_gap: int
    urgency: int
    feasibility: int
    evidence_confidence: int
    priority_score: int
    status: str
    recommended_action: str
    representative_titles: list[str]


def optional_score(value: str | None) -> float | None:
    if value is None or not value.strip():
        return None
    return max(0.0, min(100.0, float(value)))


def load_items(path: Path) -> list[Item]:
    with path.open(encoding="utf-8-sig", newline="") as f:
        rows = list(csv.DictReader(f))
    required = {"id", "category", "title", "content", "source", "created_at"}
    missing = required - set(rows[0] if rows else [])
    if missing:
        raise ValueError(f"필수 컬럼이 없습니다: {', '.join(sorted(missing))}")
    return [Item(
        id=r["id"], category=r["category"], title=r["title"], content=r["content"],
        source=r["source"], created_at=r["created_at"],
        unresolved=optional_score(r.get("unresolved")),
        urgency=optional_score(r.get("urgency")),
        feasibility=optional_score(r.get("feasibility")),
        policy_coverage=optional_score(r.get("policy_coverage")),
    ) for r in rows]


def normalize(text: str) -> str:
    return re.sub(r"[^가-힣a-z0-9 ]+", " ", text.lower()).strip()


def deduplicate(items: Iterable[Item]) -> list[Item]:
    """완전히 같거나 거의 같은 제목·본문의 단순 중복을 제거한다."""
    unique: dict[str, Item] = {}
    for item in items:
        tokens = normalize(item.text).split()
        signature = " ".join(tokens[:80])
        key = hashlib.sha1(signature.encode()).hexdigest()
        unique.setdefault(key, item)
    return list(unique.values())


def classify(text: str) -> str:
    normalized = normalize(text)
    ranked = []
    for cluster, words in CLUSTER_RULES.items():
        hits = sum(normalized.count(word) for word in words)
        ranked.append((hits, cluster))
    hits, cluster = max(ranked)
    return cluster if hits else "기타·추가 검토"


def bounded(value: float) -> int:
    return round(max(0.0, min(100.0, value)))


def avg(values: Iterable[float | None], fallback: float) -> float:
    present = [v for v in values if v is not None]
    return mean(present) if present else fallback


def action_for(gap: int, urgency: int, feasibility: int) -> tuple[str, str]:
    if urgency >= 75 and gap >= 65:
        return "즉시 검토", "담당 부서 지정 후 현행 기준·예산·대상 범위를 즉시 점검"
    if gap >= 65 and feasibility >= 60:
        return "제도 개선", "신청·이용 기준을 조정하고 시범사업 또는 조례 개정 검토"
    if feasibility >= 70 and gap >= 40:
        return "빠른 개선", "안내·절차·접근 채널을 단기 개선하고 효과 측정"
    return "모니터링", "추가 근거를 수집하고 반복 발생 여부를 다음 분석 주기에 재평가"


def diagnose(items: list[Item]) -> list[Diagnosis]:
    clean = deduplicate(items)
    groups: dict[tuple[str, str], list[Item]] = defaultdict(list)
    for item in clean:
        groups[(item.category, classify(item.text))].append(item)

    max_count = max((len(v) for v in groups.values()), default=1)
    results = []
    for (category, cluster), group in groups.items():
        count = len(group)
        sources = len({x.source for x in group if x.source})
        demand = bounded(25 + 75 * math.log1p(count) / math.log1p(max_count))
        inferred_urgency = 45 + 10 * any(w in normalize(x.text) for x in group for w in URGENT_WORDS)
        inferred_feasibility = 45 + 15 * any(w in normalize(x.text) for x in group for w in EASY_WORDS)
        urgency = bounded(avg((x.urgency for x in group), inferred_urgency))
        feasibility = bounded(avg((x.feasibility for x in group), inferred_feasibility))
        unresolved = avg((x.unresolved for x in group), 55)
        coverage = avg((x.policy_coverage for x in group), 45)
        gap = bounded(0.6 * unresolved + 0.4 * (100 - coverage))
        diversity = min(100, sources * 20)
        completeness = mean(sum(v is not None for v in
            (x.unresolved, x.urgency, x.feasibility, x.policy_coverage)) / 4 for x in group)
        confidence = bounded(35 + 0.35 * diversity + 30 * completeness)
        priority = bounded(
            0.30 * demand + 0.25 * gap + 0.25 * urgency
            + 0.10 * feasibility + 0.10 * confidence
        )
        status, action = action_for(gap, urgency, feasibility)
        results.append(Diagnosis(
            category=category, cluster=cluster, item_count=count, source_count=sources,
            demand=demand, policy_gap=gap, urgency=urgency, feasibility=feasibility,
            evidence_confidence=confidence, priority_score=priority, status=status,
            recommended_action=action,
            representative_titles=[x.title for x in group[:3]],
        ))
    return sorted(results, key=lambda x: (-x.priority_score, -x.urgency, x.cluster))


def save_json(results: list[Diagnosis], path: Path) -> None:
    payload = {
        "generated_at": datetime.now().astimezone().isoformat(timespec="seconds"),
        "scoring_version": "problem-cluster-v1",
        "diagnoses": [asdict(x) for x in results],
    }
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def save_csv(results: list[Diagnosis], path: Path) -> None:
    rows = [asdict(x) for x in results]
    if not rows:
        path.write_text("", encoding="utf-8")
        return
    rows = [{**r, "representative_titles": " | ".join(r["representative_titles"])} for r in rows]
    with path.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    parser = argparse.ArgumentParser(description="정책 제안을 문제 클러스터 단위로 진단")
    parser.add_argument("input", type=Path, help="입력 CSV")
    parser.add_argument("--json", type=Path, default=Path("policy_diagnosis.json"))
    parser.add_argument("--csv", type=Path, default=Path("policy_diagnosis.csv"))
    args = parser.parse_args()
    results = diagnose(load_items(args.input))
    save_json(results, args.json)
    save_csv(results, args.csv)
    print(f"{len(results)}개 문제 클러스터 저장: {args.json}, {args.csv}")


if __name__ == "__main__":
    main()
