import pytest

STAGES = ["new", "qualified", "proposal", "negotiation", "won", "lost"]
LABELS = {"new": "New", "qualified": "Qualified", "proposal": "Proposal", "negotiation": "Negotiation", "won": "Won", "lost": "Lost"}
PROB = {"new": 5, "qualified": 20, "proposal": 40, "negotiation": 70, "won": 100, "lost": 0}


def stage_entries(client, deal_id):
    return [a for a in client.get(f"/api/deals/{deal_id}/timeline").json() if a["kind"] == "stage_change"]


@pytest.mark.parametrize("frm,to", [(a, b) for a in STAGES for b in STAGES if a != b])
def test_each_change_sets_probability_and_adds_entry(client, make, frm, to):
    """[R22, R24, R31] Every stage change sets the new stage's probability and adds a "Moved from X to Y" entry."""
    deal = make.deal(frm, probability=33, close_date="2026-12-20")
    body = client.post(f"/api/deals/{deal}/move", json={"stage": to, "index": 0}).json()
    assert body["stage"] == to
    assert body["probability"] == PROB[to]
    entries = stage_entries(client, deal)
    assert [(e["from_stage"], e["to_stage"], e["description"]) for e in entries] == [(frm, to, f"Moved from {LABELS[frm]} to {LABELS[to]}")]
    assert entries[0]["occurred_at"] == "2026-11-15T10:30:00"


@pytest.mark.parametrize("to", ["won", "lost"])
def test_won_or_lost_sets_close_date_to_today(client, make, to):
    """[R31, K7] Dragging to Won or Lost sets the close date to today."""
    deal = make.deal("negotiation", close_date="2027-01-31")
    assert client.post(f"/api/deals/{deal}/move", json={"stage": to, "index": 0}).json()["close_date"] == "2026-11-15"


def test_edit_form_keeps_its_date(client, make):
    """[K7] Moving to Won in the edit form keeps the date entered there."""
    deal = make.deal("negotiation", close_date="2027-01-31")
    body = client.patch(f"/api/deals/{deal}", json={"stage": "won", "close_date": "2026-11-02"}).json()
    assert body["close_date"] == "2026-11-02" and body["stage"] == "won" and body["probability"] == 100
    assert len(stage_entries(client, deal)) == 1


def test_edit_form_without_date_sets_today(client, make):
    """[K7] Moving to Lost in the edit form with no date given sets today."""
    deal = make.deal("proposal", close_date="2027-01-31")
    assert client.patch(f"/api/deals/{deal}", json={"stage": "lost"}).json()["close_date"] == "2026-11-15"


def test_edit_form_change_adds_entry_and_takes_its_probability(client, make):
    """[R22, R24] A stage change in the edit form adds an entry; a probability given with it is used."""
    deal = make.deal("new")
    assert client.patch(f"/api/deals/{deal}", json={"stage": "proposal"}).json()["probability"] == 40
    assert client.patch(f"/api/deals/{deal}", json={"stage": "negotiation", "probability": 80}).json()["probability"] == 80
    assert [e["description"] for e in stage_entries(client, deal)] == ["Moved from Proposal to Negotiation", "Moved from New to Proposal"]


def test_moving_back_to_open_keeps_the_date(client, make):
    """[K7] Moving a closed deal back to an open stage keeps its close date."""
    deal = make.deal("won", close_date="2026-10-03")
    assert client.post(f"/api/deals/{deal}/move", json={"stage": "proposal", "index": 0}).json()["close_date"] == "2026-10-03"


def test_same_stage_is_not_a_change(client, make):
    """[R22] Reordering within a column or saving the same stage adds no entry."""
    deal = make.deal("proposal")
    client.post(f"/api/deals/{deal}/move", json={"stage": "proposal", "index": 0})
    client.patch(f"/api/deals/{deal}", json={"stage": "proposal", "name": "Renamed"})
    assert stage_entries(client, deal) == []


def test_creating_a_deal_adds_no_entry(client):
    """[R22] Adding a deal into a column isn't a change."""
    d = client.post("/api/deals", json={"name": "x", "value": 1, "close_date": "2026-12-01", "stage": "negotiation"}).json()
    assert stage_entries(client, d["id"]) == []
