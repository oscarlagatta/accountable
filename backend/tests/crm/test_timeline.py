def log(client, **kw):
    return client.post("/api/activities", json={"kind": "note", "description": "x", **kw}).json()


def test_newest_first(client, make):
    """[R20, C5] A timeline lists entries newest first, by when they happened."""
    person = make.contact()
    log(client, contact_id=person, description="middle", occurred_at="2026-11-10T09:00:00")
    log(client, contact_id=person, description="newest", occurred_at="2026-11-14T09:00:00")
    log(client, contact_id=person, description="oldest", occurred_at="2026-10-01T09:00:00")
    assert [a["description"] for a in client.get(f"/api/contacts/{person}/timeline").json()] == [
        "newest",
        "middle",
        "oldest",
    ]


def test_contact_timeline_includes_its_deals(client, make):
    """[R20, R22, K6, C5] A contact's timeline includes its deals' activities and stage changes, with the deal's name and id."""
    person = make.contact()
    deal = make.deal("new", contact_id=person, name="Fleet pilot")
    other = make.deal("new", name="Someone else's")
    log(client, contact_id=person, description="on contact", occurred_at="2026-11-01T09:00:00")
    log(client, deal_id=deal, description="on deal", occurred_at="2026-11-02T09:00:00")
    log(client, deal_id=other, description="elsewhere")
    client.post(f"/api/deals/{deal}/move", json={"stage": "qualified", "index": 0})
    entries = client.get(f"/api/contacts/{person}/timeline").json()
    assert [e["description"] for e in entries] == ["Moved from New to Qualified", "on deal", "on contact"]
    assert entries[1]["deal_id"] == deal and entries[1]["deal_name"] == "Fleet pilot"
    assert entries[2]["deal_id"] is None


def test_deal_activities_follow_the_main_contact(client, make):
    """[K6] When a deal's main contact changes, its activities move to the new contact's timeline."""
    first, second = make.contact(), make.contact()
    deal = make.deal(contact_id=first)
    log(client, deal_id=deal, description="on deal")
    log(client, contact_id=first, description="first's own")
    client.patch(f"/api/deals/{deal}", json={"contact_id": second})
    assert [e["description"] for e in client.get(f"/api/contacts/{first}/timeline").json()] == ["first's own"]
    assert [e["description"] for e in client.get(f"/api/contacts/{second}/timeline").json()] == ["on deal"]


def test_contact_activity_not_on_deal(client, make):
    """[R20] An activity logged on a contact shows only in the contact's timeline."""
    person = make.contact()
    deal = make.deal(contact_id=person)
    log(client, contact_id=person, description="contact only")
    assert client.get(f"/api/deals/{deal}/timeline").json() == []


def test_deal_timeline_includes_stage_changes(client, make):
    """[R20, R22] A deal's timeline shows its activities and its stage changes."""
    deal = make.deal("new")
    log(client, deal_id=deal, description="call notes", occurred_at="2026-11-01T09:00:00")
    client.post(f"/api/deals/{deal}/move", json={"stage": "proposal", "index": 0})
    client.patch(f"/api/deals/{deal}", json={"stage": "won"})
    assert [e["description"] for e in client.get(f"/api/deals/{deal}/timeline").json()] == [
        "Moved from Proposal to Won",
        "Moved from New to Proposal",
        "call notes",
    ]
    assert client.get("/api/deals/999/timeline").status_code == 404
