"""Shared post-ingestion hooks for proposal data.

Every collector that changes proposal title/body data must call
``rebuild_proposal_connections`` after saving. This keeps taxonomy, R&R,
policy candidates, quality gates, and the frontend/final JSON pair aligned.
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent.parent
CONNECTION_SCRIPT = BASE_DIR / "scripts" / "06_build_department_ranking.py"


def rebuild_proposal_connections() -> None:
    """Run the canonical classification/R&R/policy rebuild and validation."""
    subprocess.run(
        [sys.executable, str(CONNECTION_SCRIPT)],
        cwd=BASE_DIR,
        check=True,
    )
