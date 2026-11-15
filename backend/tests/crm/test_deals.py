from datetime import date

import pytest


def new_deal(client, **kw):
    body = {"name": "Deal", "value": 10000, "close_date": "2026-12-31", **kw}
    r = client.post("/api/deals", json=body)
    assert r.status_code == 201, r.json()
    return r.json()


def test_crud(client, make):
    """[C2] Deals can be created, listed with names, edited and deleted."""
    org = make.org(name="Acme")
    person = make.contact(first_name="Ada", last_name="Lane", organization_id=org)
    d = new_deal(client, name="Fleet pilot", organization_id=org, contact_id=person, stage="proposal", value=45000)
    assert (d["organization_name"], d["contact_name"], d["stage"]) == ("Acme", "Ada Lane", "proposal")
    row = client.get("/api/deals").json()[0]
    assert row["name"] == "Fleet pilot" and row["expected_revenue"] == 18000

    r = client.patch(f"/api/deals/{d['id']}", json={"value": 50000, "name": "Fleet rollout"})
    assert r.json()["value"] == 50000 and r.json()["name"] == "Fleet rollout"
    assert client.delete(f"/api/deals/{d['id']}").status_code == 204
    assert client.get(f"/api/deals/{d['id']}").status_code == 404


@pytest.mark.parametrize("stage,expected", [("new", 5), ("qualified", 20), ("proposal", 40), ("negotiation", 70), ("won", 100), ("lost", 0)])
def test_new_deal_gets_stage_probability(client, stage, expected):
    """[R23] A new deal gets its stage's probability."""
    assert new_deal(client, stage=stage)["probability"] == expected


def test_new_deal_goes_to_top_of_column(client, make):
    """[R33] A new deal goes to position 0 and the others move down."""
    first = new_deal(client, stage="qualified", name="First")
    second = new_deal(client, stage="qualified", name="Second")
    col = next(c for c in client.get("/api/pipeline").json()["columns"] if c["stage"] == "qualified")
    assert [d["id"] for d in col["deals"]] == [second["id"], first["id"]]
    assert [d["position"] for d in col["deals"]] == [0, 1]


def test_expected_revenue_and_late(client, make):
    """[R25] Expected revenue is value times probability; late means open and past the close date."""
    today = date(2026, 11, 15)
    rows = {
        "open past": make.deal("proposal", value=12345, close_date="2026-11-14"),
        "open today": make.deal("proposal", value=12345, close_date=today.isoformat()),
        "won past": make.deal("won", value=1000, close_date="2026-01-01"),
        "lost past": make.deal("lost", value=1000, close_date="2026-01-01"),
    }
    by_id = {d["id"]: d for d in client.get("/api/deals").json()}
    assert by_id[rows["open past"]]["late"] is True
    assert by_id[rows["open today"]]["late"] is False
    assert by_id[rows["won past"]]["late"] is False
    assert by_id[rows["lost past"]]["late"] is False
    assert by_id[rows["open past"]]["expected_revenue"] == 4938  # 12,345 x 40% = 4,938
    assert by_id[rows["won past"]]["expected_revenue"] == 1000
    assert by_id[rows["lost past"]]["expected_revenue"] == 0


def test_hand_set_probability_kept_until_stage_changes(client):
    """[R24] A hand-set probability is kept through other edits, and replaced when the stage changes."""
    d = new_deal(client, stage="proposal")
    assert client.patch(f"/api/deals/{d['id']}", json={"probability": 55}).json()["probability"] == 55
    assert client.patch(f"/api/deals/{d['id']}", json={"value": 20000}).json()["probability"] == 55
    assert client.post(f"/api/deals/{d['id']}/move", json={"stage": "proposal", "index": 0}).json()["probability"] == 55
    assert client.post(f"/api/deals/{d['id']}/move", json={"stage": "negotiation", "index": 0}).json()["probability"] == 70


def test_create_with_hand_set_probability(client):
    """[R24] A probability given when the deal is created is kept."""
    assert new_deal(client, stage="new", probability=15)["probability"] == 15


def test_delete_removes_activities(client, make):
    """[K1] Deleting a deal deletes its activities and stage changes; the preview counts them."""
    person = make.contact()
    d = new_deal(client, contact_id=person, stage="new", name="Doomed")
    client.post(f"/api/deals/{d['id']}/move", json={"stage": "qualified", "index": 0})
    for _ in range(3):
        make.activity(deal_id=d["id"])
    assert client.get(f"/api/deals/{d['id']}/delete-preview").json() == {"name": "Doomed", "activities": 3, "stage_changes": 1}
    client.delete(f"/api/deals/{d['id']}")
    assert client.get(f"/api/contacts/{person}/timeline").json() == []


def test_validation(client):
    """[R24] Value is a whole number from 0, probability 0 to 100, and name and close date are required."""
    r = client.post("/api/deals", json={"name": "", "value": -1, "probability": 101, "stage": "won-ish"})
    errors = r.json()["errors"]
    assert errors["name"] == "Required"
    assert errors["value"] == "Must be 0 or more"
    assert errors["probability"] == "Must be 100 or less"
    assert errors["close_date"] == "Required"
    assert errors["stage"] == "Choose one of the options"
    assert client.post("/api/deals", json={"name": "x", "value": 10.5, "close_date": "2026-12-01"}).json()["errors"] == {"value": "Enter a whole number"}
