"""Restore proposal bodies and keep frontend/final proposal data identical.

The frontend JSON is the canonical, curated dataset used by the application.
Long crawled bodies from processed CSV files are restored only when the
proposal ID and title both match, preventing a body from being attached to a
different proposal after an upstream ID/title mismatch.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
from pathlib import Path
from typing import Any


BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_PATH = BASE_DIR / "frontend" / "src" / "data" / "mongttang.json"
FINAL_PATH = BASE_DIR / "data" / "final" / "proposals.json"
CSV_ROOT = BASE_DIR / "data" / "processed"
PLACEHOLDER_PHRASES = (
    "접수된 시민 정책 제안입니다",
    "국민신문고를 통해 접수된",
)


def normalize(value: Any) -> str:
    return str(value or "").strip()


def is_placeholder(item: dict[str, Any]) -> bool:
    title = normalize(item.get("title") or item.get("TITLE"))
    content = normalize(item.get("content") or item.get("CONTENT"))
    return (
        not content
        or content == title
        or len(content) < 30
        or any(phrase in content for phrase in PLACEHOLDER_PHRASES)
    )


def proposal_id(row: dict[str, Any]) -> str:
    return normalize(row.get("제안ID") or row.get("id") or row.get("ID"))


def proposal_title(row: dict[str, Any]) -> str:
    return normalize(row.get("제안제목") or row.get("title") or row.get("TITLE"))


def detailed_body(row: dict[str, Any]) -> str:
    return normalize(row.get("웹크롤링_상세본문") or row.get("content_full"))


def load_best_local_bodies() -> dict[str, tuple[str, str, str]]:
    best: dict[str, tuple[str, str, str]] = {}
    for path in sorted(CSV_ROOT.rglob("*.csv")):
        try:
            with path.open(encoding="utf-8-sig", newline="") as handle:
                for row in csv.DictReader(handle):
                    item_id = proposal_id(row)
                    title = proposal_title(row)
                    body = detailed_body(row)
                    if not item_id or not title or len(body) < 30:
                        continue
                    current = best.get(item_id)
                    if current is None or len(body) > len(current[1]):
                        best[item_id] = (title, body, str(path.relative_to(BASE_DIR)))
        except (UnicodeDecodeError, csv.Error):
            continue
    return best


def normalize_department_rankings(item: dict[str, Any]) -> bool:
    original = item.get("department_rankings") or []
    by_rank: dict[int, dict[str, Any]] = {}

    for ranking in original:
        rank = ranking.get("rank")
        if not isinstance(rank, int) or rank not in (1, 2, 3):
            continue
        if rank in by_rank:
            continue
        normalized = dict(ranking)
        full_dept = normalize(normalized.get("full_dept"))
        if full_dept:
            normalized["dept_name"] = full_dept.split()[-1]
        normalized["role_type"] = (
            "주관부서" if rank == 1 else f"협조부서 ({rank}순위)"
        )
        by_rank[rank] = normalized

    rankings = [by_rank[rank] for rank in sorted(by_rank)]
    changed = rankings != original
    item["department_rankings"] = rankings

    primary = by_rank.get(1)
    if primary:
        normalized_department = [normalize(primary.get("dept_name"))]
        if item.get("department") != normalized_department:
            item["department"] = normalized_department
            changed = True
    return changed


def validate(items: list[dict[str, Any]]) -> list[str]:
    errors: list[str] = []
    ids = [normalize(item.get("id")) for item in items]
    if len(ids) != len(set(ids)):
        errors.append("duplicate proposal IDs")

    for item in items:
        item_id = normalize(item.get("id"))
        url = normalize(item.get("url"))
        url_match = re.search(r"[?&]sn=(\d+)", url)
        if url_match and item_id != f"PROP-{url_match.group(1)}":
            errors.append(f"{item_id}: URL sn mismatch ({url_match.group(1)})")
        rankings = item.get("department_rankings") or []
        if rankings:
            ranks = [ranking.get("rank") for ranking in rankings]
            valid_ranks = [rank for rank in ranks if isinstance(rank, int) and rank in (1, 2, 3)]
            if (
                len(valid_ranks) != len(ranks)
                or valid_ranks != sorted(set(valid_ranks))
            ):
                errors.append(f"{item_id}: invalid department ranks {ranks}")
            primary_count = sum(ranking.get("rank") == 1 for ranking in rankings)
            if primary_count != 1:
                errors.append(f"{item_id}: primary department count is {primary_count}")
            for ranking in rankings:
                rank = ranking.get("rank")
                expected_role = (
                    "주관부서" if rank == 1 else f"협조부서 ({rank}순위)"
                )
                if ranking.get("role_type") != expected_role:
                    errors.append(f"{item_id}: invalid role for rank {rank}")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--check",
        action="store_true",
        help="Validate without modifying files.",
    )
    args = parser.parse_args()

    items = json.loads(FRONTEND_PATH.read_text(encoding="utf-8"))
    local_bodies = load_best_local_bodies()
    restored = 0
    restored_titles = 0
    normalized_rankings = 0

    if not args.check:
        for item in items:
            if normalize_department_rankings(item):
                normalized_rankings += 1
            item_id = normalize(item.get("id"))
            title = normalize(item.get("title"))
            candidate = local_bodies.get(item_id)
            if not candidate:
                continue
            candidate_title, body, _source = candidate
            current = normalize(item.get("content"))
            if candidate_title != title:
                item["title"] = candidate_title
                item["content"] = body
                restored_titles += 1
                restored += 1
            elif len(body) > len(current):
                item["content"] = body
                restored += 1

    errors = validate(items)
    placeholder_count = sum(is_placeholder(item) for item in items)

    if args.check:
        final_items = json.loads(FINAL_PATH.read_text(encoding="utf-8"))
        if items != final_items:
            errors.append("frontend and final proposal datasets differ")
    elif not errors:
        serialized = json.dumps(items, ensure_ascii=False, indent=2) + "\n"
        FRONTEND_PATH.write_text(serialized, encoding="utf-8")
        FINAL_PATH.write_text(serialized, encoding="utf-8")

    print(
        json.dumps(
            {
                "total": len(items),
                "restored": restored,
                "restored_titles": restored_titles,
                "normalized_rankings": normalized_rankings,
                "placeholder_content": placeholder_count,
                "errors": errors,
            },
            ensure_ascii=False,
            indent=2,
        )
    )
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
