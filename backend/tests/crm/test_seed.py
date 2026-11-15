from collections import Counter
from datetime import date, datetime, timedelta

from sqlalchemy import func, select

from backend.app.core import clock
from backend.app.crm import seed, stages
from backend.app.crm.tables import activities, contacts, deals, organizations

TODAY = date(2026, 11, 15)


def rows(engine, table):
    with engine.connect() as conn:
        return [dict(r._mapping) for r in conn.execute(select(table))]


def test_volumes(engine):
    """[R46, R47, R48, R49] About 25 organizations, 120 contacts, 80 deals and 300 activities."""
    seed.reset(engine)
    orgs, people, ds, acts = (rows(engine, t) for t in (organizations, contacts, deals, activities))
    assert 22 <= len(orgs) <= 28
    assert 6 <= len({o["industry"] for o in orgs}) <= 8
    assert 110 <= len(people) <= 130
    assert 72 <= len(ds) <= 88
    assert 270 <= len(acts) <= 330


def test_contacts_spread(engine):
    """[R47] Contacts at every status, mostly at organizations, a few with none."""
    seed.reset(engine)
    people = rows(engine, contacts)
    assert set(Counter(p["status"] for p in people)) == {"lead", "qualified", "customer"}
    no_org = [p for p in people if p["organization_id"] is None]
    assert 2 <= len(no_org) <= 15


def test_deals_spread(engine):
    """[R48, R45] Every stage has deals, values $5,000 to $150,000, a few late, a couple with no organization."""
    seed.reset(engine)
    ds = rows(engine, deals)
    assert set(d["stage"] for d in ds) == set(stages.KEYS)
    assert all(5000 <= d["value"] <= 150000 for d in ds)
    today = TODAY.isoformat()
    late = [d for d in ds if d["stage"] in stages.OPEN_KEYS and d["close_date"] < today]
    assert 4 <= len(late) <= 6
    assert 2 <= sum(1 for d in ds if d["organization_id"] is None) <= 4
    # Open deals close over the next few months; closed ones over the past 12.
    future = [d for d in ds if d["stage"] in stages.OPEN_KEYS and d["close_date"] >= today]
    assert max(d["close_date"] for d in future) > (TODAY + timedelta(days=60)).isoformat()
    closed = [d for d in ds if d["stage"] in stages.CLOSED_KEYS]
    assert all((TODAY - timedelta(days=366)).isoformat() <= d["close_date"] <= today for d in closed)
    won_months = {d["close_date"][:7] for d in ds if d["stage"] == "won"}
    assert len(won_months) >= 8, won_months
    assert TODAY.isoformat()[:7] in won_months


def test_follow_ups(engine):
    """[R49] About 10 open follow-ups due in the next two weeks, and 4 to 6 overdue."""
    seed.reset(engine)
    open_fu = [a for a in rows(engine, activities) if a["follow_up_date"] and not a["done"]]
    today, horizon = TODAY.isoformat(), (TODAY + timedelta(days=14)).isoformat()
    overdue = [a for a in open_fu if a["follow_up_date"] < today]
    upcoming = [a for a in open_fu if today <= a["follow_up_date"] <= horizon]
    assert 4 <= len(overdue) <= 6
    assert 8 <= len(upcoming) <= 12


def test_every_deal_has_a_stage_history(engine):
    """[R40, R49, K4] Every deal past New has stage-change entries that end at its current stage."""
    seed.reset(engine)
    acts = [a for a in rows(engine, activities) if a["kind"] == "stage_change"]
    by_deal: dict[int, list[dict]] = {}
    for a in sorted(acts, key=lambda a: a["occurred_at"]):
        by_deal.setdefault(a["deal_id"], []).append(a)
    for d in rows(engine, deals):
        history = by_deal.get(d["id"], [])
        if d["stage"] == "new":
            assert history == []
            continue
        assert history, d
        assert history[-1]["to_stage"] == d["stage"]
        for prev, nxt in zip(history, history[1:]):
            assert prev["to_stage"] == nxt["from_stage"]
        assert history[0]["description"] == f"Moved from {stages.label(history[0]['from_stage'])} to {stages.label(history[0]['to_stage'])}"
    # Lost deals drop out at several different stages.
    dropped = {by_deal[d["id"]][-1]["from_stage"] for d in rows(engine, deals) if d["stage"] == "lost"}
    assert len(dropped) >= 3


def test_dates_are_relative_to_today(engine):
    """[R45, K8] Moving today moves every sample date by the same amount, and nothing happens in the future."""
    first = seed.generate(TODAY, datetime(2026, 11, 15, 10, 30))
    later = seed.generate(TODAY + timedelta(days=100), datetime(2027, 2, 23, 10, 30))
    shift = lambda s: (date.fromisoformat(s) + timedelta(days=100)).isoformat()  # noqa: E731
    # Deals won this month are placed within the current calendar month, so they're left out here.
    pairs = [(a, b) for a, b in zip(first["deals"], later["deals"]) if not a["close_date"].startswith("2026-11")]
    assert len(pairs) > 60
    assert [shift(a["close_date"]) for a, _ in pairs] == [b["close_date"] for _, b in pairs]
    assert all(a["occurred_at"] <= "2026-11-15T10:30:00" for a in first["activities"])
    assert min(a["occurred_at"] for a in first["activities"]) >= "2025-11-15"


def test_same_seed_same_data():
    """[R45] Every reset gives the same data."""
    a = seed.generate(TODAY, datetime(2026, 11, 15, 10, 30))
    b = seed.generate(TODAY, datetime(2026, 11, 15, 10, 30))
    assert a == b


def test_reset_with_another_connection_open(engine, make):
    """[R3] The reset replaces the data even while another connection is open, and ids start again from 1."""
    make.org(name="Mine")
    reader = engine.connect()
    try:
        reader.execute(select(func.count()).select_from(organizations)).scalar()
        seed.reset(engine)
        names = [r.name for r in reader.execute(select(organizations.c.name))]
    finally:
        reader.close()
    assert "Mine" not in names
    with engine.connect() as conn:
        assert conn.execute(select(func.min(organizations.c.id))).scalar() == 1
    # A second reset gives the same rows again.
    before = rows(engine, deals)
    seed.reset(engine)
    assert rows(engine, deals) == before


def test_reset_uses_the_clock(engine):
    """[K8] The sample data is dated from clock.today()."""
    clock.freeze(datetime(2027, 3, 1, 12, 0))
    seed.reset(engine)
    acts = rows(engine, activities)
    assert max(a["occurred_at"] for a in acts) <= "2027-03-01T12:00:00"
    assert max(a["follow_up_date"] for a in acts if a["follow_up_date"]) >= "2027-03-08"
