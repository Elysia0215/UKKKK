#!/usr/bin/env python3
"""AI/Codex 작업 결과를 개발 로그 상태에 반영한다."""

from __future__ import annotations

import argparse
import json
import os
import tempfile
from datetime import datetime, timezone
from pathlib import Path


ALLOWED_STATUSES = {
    "team_suggestion",
    "ai_in_progress",
    "ai_applied_data",
    "ai_applied_rule",
    "github_pushed",
}

STATUS_ORDER = {
    "team_suggestion": 0,
    "ai_in_progress": 1,
    "ai_applied_data": 2,
    "ai_applied_rule": 3,
    "github_pushed": 4,
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--id", required=True, dest="log_id")
    parser.add_argument("--status", required=True, choices=sorted(ALLOWED_STATUSES))
    parser.add_argument("--memo", required=True)
    parser.add_argument(
        "--repo-root",
        type=Path,
        default=Path(__file__).resolve().parents[1],
    )
    return parser.parse_args()


def find_log(logs_root: Path, log_id: str) -> Path:
    matches = list(logs_root.glob(f"*/{log_id}.json"))
    if not matches:
        raise SystemExit(f"개발 로그를 찾을 수 없습니다: {log_id}")
    if len(matches) > 1:
        raise SystemExit(f"동일 ID 로그가 여러 개입니다: {log_id}")
    return matches[0]


def atomic_write(path: Path, payload: dict) -> None:
    fd, temporary = tempfile.mkstemp(prefix=f".{path.stem}-", suffix=".json", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as stream:
            json.dump(payload, stream, ensure_ascii=False, indent=2)
            stream.write("\n")
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def main() -> None:
    args = parse_args()
    logs_root = args.repo_root / "data" / "developer_logs"
    path = find_log(logs_root, args.log_id)
    log = json.loads(path.read_text(encoding="utf-8"))
    previous = log.get("status", "team_suggestion")
    if STATUS_ORDER[args.status] < STATUS_ORDER.get(previous, 0):
        raise SystemExit(f"상태를 역행할 수 없습니다: {previous} → {args.status}")
    if args.status == "github_pushed" and "push" not in args.memo.lower():
        raise SystemExit("GitHub Push 완료는 성공한 push 근거를 memo에 포함해야 합니다.")

    now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    log["status"] = args.status
    log["updatedAt"] = now
    log.setdefault("history", []).append(
        {
            "status": args.status,
            "at": now,
            "actor": "ai" if args.status != "github_pushed" else "developer",
            "memo": args.memo,
        }
    )
    atomic_write(path, log)
    print(f"{args.log_id}: {previous} → {args.status}")


if __name__ == "__main__":
    main()
