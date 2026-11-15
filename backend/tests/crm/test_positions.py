from sqlalchemy import select

from backend.app.core import db
from backend.app.crm.tables import deals


def column(client, stage):
    col = next(c for c in client.get("/api/pipeline").json()["columns"] if c["stage"] == stage)
    return col["deals"]


def setup_column(client, stage, names):
    ids = []
    for name in reversed(names):  # each new deal goes to the top
        ids.insert(0, client.post("/api/deals", json={"name": name, "value": 1000, "close_date": "2026-12-01", "stage": stage}).json()["id"])
    return ids


def names(client, stage):
    return [d["name"] for d in column(client, stage)]


def assert_contiguous(client, stage):
    assert [d["position"] for d in column(client, stage)] == list(range(len(column(client, stage))))


def test_within_a_column(client):
    """[R30, C4] Moving within a column puts the card exactly where it was dropped, higher or lower."""
    ids = setup_column(client, "new", ["A", "B", "C", "D"])
    client.post(f"/api/deals/{ids[3]}/move", json={"stage": "new", "index": 1})
    assert names(client, "new") == ["A", "D", "B", "C"]
    client.post(f"/api/deals/{ids[0]}/move", json={"stage": "new", "index": 2})
    assert names(client, "new") == ["D", "B", "A", "C"]
    assert_contiguous(client, "new")


def test_to_top_and_bottom(client):
    """[R30] Moving to the top and to the bottom of a column."""
    ids = setup_column(client, "new", ["A", "B", "C"])
    client.post(f"/api/deals/{ids[2]}/move", json={"stage": "new", "index": 0})
    assert names(client, "new") == ["C", "A", "B"]
    client.post(f"/api/deals/{ids[2]}/move", json={"stage": "new", "index": 99})
    assert names(client, "new") == ["A", "B", "C"]
    assert_contiguous(client, "new")


def test_between_columns(client):
    """[R30, C4] Moving to another column inserts at the index and closes the gap left behind."""
    a = setup_column(client, "new", ["A1", "A2", "A3"])
    setup_column(client, "proposal", ["P1", "P2"])
    client.post(f"/api/deals/{a[1]}/move", json={"stage": "proposal", "index": 1})
    assert names(client, "new") == ["A1", "A3"]
    assert names(client, "proposal") == ["P1", "A2", "P2"]
    assert_contiguous(client, "new")
    assert_contiguous(client, "proposal")


def test_into_an_empty_column(client):
    """[R30] Moving into an empty column."""
    a = setup_column(client, "new", ["A"])
    client.post(f"/api/deals/{a[0]}/move", json={"stage": "lost", "index": 3})
    assert names(client, "lost") == ["A"]
    assert column(client, "lost")[0]["position"] == 0
    assert names(client, "new") == []


def test_new_deal_and_edit_form_go_to_top(client):
    """[R33] A new deal starts at the top; a stage change from the edit form puts it at the top of its new column."""
    setup_column(client, "qualified", ["Q1", "Q2"])
    p = setup_column(client, "proposal", ["P1"])
    client.post("/api/deals", json={"name": "Fresh", "value": 1, "close_date": "2026-12-01", "stage": "qualified"})
    assert names(client, "qualified") == ["Fresh", "Q1", "Q2"]
    client.patch(f"/api/deals/{p[0]}", json={"stage": "qualified"})
    assert names(client, "qualified") == ["P1", "Fresh", "Q1", "Q2"]
    assert_contiguous(client, "qualified")


def test_order_survives_a_new_connection(client):
    """[R30, C4] The order is stored, so a new connection reads it back the same."""
    ids = setup_column(client, "negotiation", ["A", "B", "C"])
    client.post(f"/api/deals/{ids[0]}/move", json={"stage": "negotiation", "index": 2})
    db.dispose_all()
    with db.get_engine().connect() as conn:
        stored = conn.execute(select(deals.c.name).where(deals.c.stage == "negotiation").order_by(deals.c.position)).scalars().all()
    assert stored == ["B", "C", "A"]


def test_delete_closes_the_gap(client):
    """[R30] Deleting a deal renumbers its column."""
    ids = setup_column(client, "new", ["A", "B", "C"])
    client.delete(f"/api/deals/{ids[1]}")
    assert names(client, "new") == ["A", "C"]
    assert_contiguous(client, "new")
