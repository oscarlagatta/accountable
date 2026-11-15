from pathlib import Path

from backend.app.core import settings


def test_env_var_picks_the_file(tmp_path, monkeypatch):
    """[R4] ACCOUNTABLE_DB picks the database file, and its folder is created."""
    target = tmp_path / "nested" / "other.db"
    monkeypatch.setenv("ACCOUNTABLE_DB", str(target))
    assert settings.db_path() == target.resolve()
    assert target.parent.is_dir()


def test_default_is_backend_data(monkeypatch):
    """[R4] With no ACCOUNTABLE_DB, the database is backend/data/accountable.db."""
    monkeypatch.delenv("ACCOUNTABLE_DB", raising=False)
    expected = Path(__file__).resolve().parents[3] / "backend" / "data" / "accountable.db"
    assert settings.db_path() == expected
