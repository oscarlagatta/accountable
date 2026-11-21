"""A fresh temporary database per test, a fixed today, a TestClient and small factories."""

from datetime import date, datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import insert

from backend.app.core import clock, db
from backend.app.crm import stages
from backend.app.crm.tables import activities, contacts, deals, organizations

FIXED_NOW = datetime(2026, 11, 15, 10, 30)


@pytest.fixture(autouse=True)
def temp_db(tmp_path, monkeypatch):
    path = tmp_path / "test.db"
    monkeypatch.setenv("ACCOUNTABLE_DB", str(path))
    yield path
    db.dispose_all()


@pytest.fixture(autouse=True)
def fixed_clock():
    clock.freeze(FIXED_NOW)
    yield FIXED_NOW
    clock.unfreeze()


@pytest.fixture
def engine(temp_db):
    eng = db.get_engine()
    db.create_all(eng)
    return eng


@pytest.fixture
def client(engine):
    from backend.app.main import create_app

    with TestClient(create_app()) as c:
        yield c


class Factory:
    """Inserts rows directly, with sensible defaults, and returns their ids."""

    def __init__(self, engine):
        self.engine = engine
        self._n = 0

    def _insert(self, table, values: dict) -> int:
        stamp = clock.now().isoformat()
        values = {"created_at": stamp, "updated_at": stamp, **values}
        with self.engine.begin() as conn:
            return conn.execute(insert(table).values(**values)).inserted_primary_key[0]

    def org(self, **kw) -> int:
        self._n += 1
        return self._insert(organizations, {"name": f"Org {self._n}", **kw})

    def contact(self, **kw) -> int:
        self._n += 1
        return self._insert(contacts, {"first_name": "Pat", "last_name": f"Person{self._n}", "status": "lead", **kw})

    def deal(self, stage: str = "new", **kw) -> int:
        self._n += 1
        values = {
            "name": f"Deal {self._n}",
            "stage": stage,
            "value": 10000,
            "probability": stages.default_probability(stage),
            "close_date": (clock.today()).isoformat(),
            "position": 0,
            **kw,
        }
        return self._insert(deals, values)

    def activity(self, **kw) -> int:
        values = {"kind": "note", "description": "Note", "occurred_at": clock.now().isoformat(), "done": False, **kw}
        return self._insert(activities, values)

    def stage_change(self, deal_id: int, frm: str, to: str, on: date | datetime, **kw) -> int:
        when = on if isinstance(on, datetime) else datetime(on.year, on.month, on.day, 9, 0)
        return self.activity(
            kind="stage_change",
            deal_id=deal_id,
            from_stage=frm,
            to_stage=to,
            description=f"Moved from {stages.label(frm)} to {stages.label(to)}",
            occurred_at=when.isoformat(),
            **kw,
        )


@pytest.fixture
def make(engine) -> Factory:
    return Factory(engine)
