from datetime import datetime

from backend.app.core import clock


def dash(client):
    r = client.get("/api/dashboard")
    assert r.status_code == 200
    return r.json()


def build(make):
    """A small dataset. Today is Sunday 2026-11-15."""
    org = make.org(name="Acme")
    ada = make.contact(first_name="Ada", last_name="Lane", organization_id=org)
    ids = {
        "n1": make.deal("new", value=10000, close_date="2026-12-01", contact_id=ada),
        "q1": make.deal("qualified", value=20000, close_date="2026-12-01"),
        "p1": make.deal("proposal", value=30000, close_date="2026-11-01"),  # late
        "g1": make.deal("negotiation", value=40000, probability=80, close_date="2027-01-15"),
        "w_now": make.deal("won", value=15000, close_date="2026-11-03"),
        "w_oct": make.deal("won", value=25000, close_date="2026-10-20"),
        "w_dec": make.deal("won", value=5000, close_date="2025-12-01"),
        "w_old": make.deal("won", value=99000, close_date="2025-11-30"),  # 13 months ago: outside
        "l_oct": make.deal("lost", value=8000, close_date="2026-10-02"),
    }
    # Stage history: the funnel's source.
    make.stage_change(ids["q1"], "new", "qualified", datetime(2026, 10, 1, 9))
    make.stage_change(ids["p1"], "new", "qualified", datetime(2026, 9, 1, 9))
    make.stage_change(ids["p1"], "qualified", "proposal", datetime(2026, 9, 20, 9))
    # g1 was created straight into Negotiation: no history, but it reached the stages before.
    for d in ("w_now", "w_oct", "w_dec", "w_old"):
        make.stage_change(ids[d], "new", "qualified", datetime(2025, 9, 1, 9))
        make.stage_change(ids[d], "qualified", "proposal", datetime(2025, 9, 2, 9))
        make.stage_change(ids[d], "proposal", "negotiation", datetime(2025, 9, 3, 9))
        make.stage_change(ids[d], "negotiation", "won", datetime(2025, 9, 4, 9))
    make.stage_change(ids["l_oct"], "new", "qualified", datetime(2026, 9, 1, 9))
    make.stage_change(ids["l_oct"], "qualified", "lost", datetime(2026, 10, 2, 9))
    # Follow-ups
    make.activity(contact_id=ada, description="upcoming", follow_up_date="2026-11-20", occurred_at="2026-11-10T09:00:00")
    make.activity(deal_id=ids["n1"], description="due today", follow_up_date="2026-11-15", occurred_at="2026-11-09T09:00:00")
    make.activity(contact_id=ada, description="overdue late", follow_up_date="2026-11-12", occurred_at="2026-11-08T09:00:00")
    make.activity(deal_id=ids["g1"], description="overdue early", follow_up_date="2026-11-02", occurred_at="2026-11-01T09:00:00")
    make.activity(contact_id=ada, description="done one", follow_up_date="2026-11-01", done=True, occurred_at="2026-10-30T09:00:00")
    return ids


def test_summary_figures(client, make):
    """[R36, C6] Open value, expected revenue, won this month, 12-month win rate and follow-up counts."""
    build(make)
    s = dash(client)["summary"]
    assert s["open_value"] == 100000
    assert s["open_expected"] == 500 + 4000 + 12000 + 32000
    assert s["won_this_month"] == 15000
    assert (s["won_count_12m"], s["lost_count_12m"], s["win_rate"]) == (3, 1, 75)
    assert (s["open_follow_ups"], s["overdue_follow_ups"]) == (4, 2)


def test_months(client, make):
    """[R37, R38, K9] Twelve months up to this one, with revenue won and counts won and lost."""
    build(make)
    months = dash(client)["months"]
    assert [m["month"] for m in months][:2] == ["2025-12", "2026-01"]
    assert months[-1]["month"] == "2026-11" and months[-1]["label"] == "Nov"
    assert len(months) == 12
    by = {m["month"]: m for m in months}
    assert (by["2026-11"]["won_value"], by["2026-11"]["won_count"]) == (15000, 1)
    assert (by["2026-10"]["won_value"], by["2026-10"]["won_count"], by["2026-10"]["lost_count"]) == (25000, 1, 1)
    assert by["2025-12"]["won_value"] == 5000
    assert sum(m["won_value"] for m in months) == 45000  # Nov 2025 is outside


def test_months_across_a_year_change_and_month_end(client, make):
    """[R37, R38, K9] Month buckets are right on a month-end day and across the year change."""
    clock.freeze(datetime(2026, 1, 31, 23, 30))
    make.deal("won", value=1000, close_date="2025-02-01")
    make.deal("won", value=2000, close_date="2025-01-31")  # outside
    make.deal("won", value=3000, close_date="2026-01-31")
    make.deal("lost", value=3000, close_date="2025-12-31")
    d = dash(client)
    months = d["months"]
    assert [m["month"] for m in months] == ["2025-02", "2025-03", "2025-04", "2025-05", "2025-06", "2025-07", "2025-08",
                                            "2025-09", "2025-10", "2025-11", "2025-12", "2026-01"]
    assert [m["label"] for m in months][-2:] == ["Dec", "Jan"]
    assert months[0]["won_value"] == 1000
    assert months[-1]["won_value"] == 3000
    assert months[-2]["lost_count"] == 1
    assert d["summary"]["won_this_month"] == 3000


def test_strip(client, make):
    """[R39] The strip has the four open stages, each with count, value and expected revenue."""
    build(make)
    assert dash(client)["strip"] == [
        {"stage": "new", "label": "New", "count": 1, "value": 10000, "expected": 500},
        {"stage": "qualified", "label": "Qualified", "count": 1, "value": 20000, "expected": 4000},
        {"stage": "proposal", "label": "Proposal", "count": 1, "value": 30000, "expected": 12000},
        {"stage": "negotiation", "label": "Negotiation", "count": 1, "value": 40000, "expected": 32000},
    ]


def test_funnel(client, make):
    """[R40, K4] The funnel counts each deal at every stage it reached, from its history; it never increases."""
    build(make)
    funnel = dash(client)["funnel"]
    assert [f["stage"] for f in funnel] == ["new", "qualified", "proposal", "negotiation", "won"]
    total_won = 15000 + 25000 + 5000 + 99000
    # New: every deal. Qualified: all but n1. Proposal: p1, g1 and the won deals. Negotiation: g1 and won. Won: won.
    assert [f["value"] for f in funnel] == [
        10000 + 20000 + 30000 + 40000 + total_won + 8000,
        20000 + 30000 + 40000 + total_won + 8000,
        30000 + 40000 + total_won,
        40000 + total_won,
        total_won,
    ]
    assert funnel[0]["share"] is None
    assert funnel[1]["share"] == round(funnel[1]["value"] / funnel[0]["value"] * 100)
    assert all(a["value"] >= b["value"] for a, b in zip(funnel, funnel[1:]))


def test_follow_up_order(client, make):
    """[R41, C6] Open follow-ups: overdue first, then today, then upcoming, soonest first; done ones are left out."""
    build(make)
    fu = dash(client)["follow_ups"]
    assert [(f["description"], f["status"]) for f in fu] == [
        ("overdue early", "overdue"), ("overdue late", "overdue"), ("due today", "today"), ("upcoming", "upcoming")]
    assert fu[1]["contact_name"] == "Ada Lane"
    assert fu[0]["deal_id"] is not None and fu[0]["deal_name"]


def test_recent_activity(client, make):
    """[R42] The 10 latest activities and stage changes, newest first, with what they're on."""
    ids = build(make)
    client.post(f"/api/deals/{ids['n1']}/move", json={"stage": "qualified", "index": 0})
    recent = dash(client)["recent"]
    assert len(recent) == 10
    assert recent[0]["description"] == "Moved from New to Qualified" and recent[0]["to_stage"] == "qualified"
    assert recent[0]["deal_id"] == ids["n1"]
    assert [r["occurred_at"] for r in recent] == sorted((r["occurred_at"] for r in recent), reverse=True)


def test_figures_change_straight_away(client, make):
    """[R43, C6] A deal marked won and a new follow-up show up on the next load."""
    ids = build(make)
    before = dash(client)["summary"]
    client.post(f"/api/deals/{ids['g1']}/move", json={"stage": "won", "index": 0})
    client.post("/api/activities", json={"kind": "call", "deal_id": ids["n1"], "description": "Call back", "follow_up_date": "2026-11-18"})
    after = dash(client)
    s = after["summary"]
    assert s["won_this_month"] == before["won_this_month"] + 40000
    assert s["open_value"] == before["open_value"] - 40000
    assert (s["won_count_12m"], s["win_rate"]) == (4, 80)
    assert s["open_follow_ups"] == before["open_follow_ups"] + 1
    assert "Call back" in [f["description"] for f in after["follow_ups"]]
    assert after["months"][-1]["won_value"] == 55000
