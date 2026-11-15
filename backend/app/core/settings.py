"""Where the database lives. ACCOUNTABLE_DB names another file, for tests."""

import os
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_DB = REPO_ROOT / "backend" / "data" / "accountable.db"


def db_path() -> Path:
    """The database file, read from the environment each time. Its folder is created."""
    path = Path(os.environ.get("ACCOUNTABLE_DB") or DEFAULT_DB).resolve()
    path.parent.mkdir(parents=True, exist_ok=True)
    return path
