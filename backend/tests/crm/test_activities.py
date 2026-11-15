def test_create_on_contact_and_on_deal(client, make):
    """[R19, C5] An activity can be logged on a contact or on a deal, with a follow-up date; when defaults to now."""
    person = make.contact()
    deal = make.deal()
    a = client.post("/api/activities", json={"kind": "call", "contact_id": person, "description": "Intro call", "follow_up_date": "2026-11-20"})
    assert a.status_code == 201
    body = a.json()
    assert (body["kind"], body["contact_id"], body["deal_id"], body["occurred_at"], body["follow_up_date"], body["done"]) == (
        "call", person, None, "2026-11-15T10:30:00", "2026-11-20", False)
    b = client.post("/api/activities", json={"kind": "email", "deal_id": deal, "description": "Sent pricing", "occurred_at": "2026-11-10T14:05:00"}).json()
    assert b["deal_id"] == deal and b["occurred_at"] == "2026-11-10T14:05:00" and b["follow_up_date"] is None


def test_needs_exactly_one_target_and_a_description(client, make):
    """[R19] The activity must be on a contact or a deal, and needs a description and a kind."""
    person, deal = make.contact(), make.deal()
    assert client.post("/api/activities", json={"description": "x"}).status_code == 422
    assert client.post("/api/activities", json={"description": "x", "contact_id": person, "deal_id": deal}).status_code == 422
    r = client.post("/api/activities", json={"description": " ", "contact_id": person, "kind": "fax"})
    assert r.json()["errors"] == {"description": "Required", "kind": "Choose one of the options"}
    assert client.post("/api/activities", json={"description": "x", "contact_id": 999}).json()["errors"] == {"contact_id": "That contact no longer exists"}


def test_update_delete_and_mark_done(client, make):
    """[R21, C5] Activities can be edited, marked done and deleted."""
    person = make.contact()
    a = client.post("/api/activities", json={"kind": "note", "contact_id": person, "description": "Draft", "follow_up_date": "2026-11-18"}).json()
    r = client.patch(f"/api/activities/{a['id']}", json={"description": "Agreed scope", "kind": "call", "occurred_at": "2026-11-14T09:00:00"})
    assert (r.json()["description"], r.json()["kind"], r.json()["occurred_at"]) == ("Agreed scope", "call", "2026-11-14T09:00:00")
    assert client.patch(f"/api/activities/{a['id']}", json={"done": True}).json()["done"] is True
    assert client.patch(f"/api/activities/{a['id']}", json={"follow_up_date": None}).json()["follow_up_date"] is None
    assert client.delete(f"/api/activities/{a['id']}").status_code == 204
    assert client.get(f"/api/contacts/{person}/timeline").json() == []


def test_stage_changes_are_locked(client, make):
    """[K10] Stage-change entries refuse edits, mark done and delete."""
    deal = make.deal("new")
    client.post(f"/api/deals/{deal}/move", json={"stage": "qualified", "index": 0})
    entry = client.get(f"/api/deals/{deal}/timeline").json()[0]
    assert entry["kind"] == "stage_change"
    for r in (
        client.patch(f"/api/activities/{entry['id']}", json={"description": "rewritten"}),
        client.patch(f"/api/activities/{entry['id']}", json={"done": True}),
        client.delete(f"/api/activities/{entry['id']}"),
    ):
        assert r.status_code == 409
        assert "can't be changed" in r.json()["detail"]
    assert client.get(f"/api/deals/{deal}/timeline").json()[0]["description"] == "Moved from New to Qualified"
    # A stage change can't be created by hand either.
    assert client.post("/api/activities", json={"kind": "stage_change", "deal_id": deal, "description": "x"}).status_code == 422
