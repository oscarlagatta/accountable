def test_crud_with_status(client, make):
    """[R12, C2] Contacts can be created with a status, listed with their organization, edited and deleted."""
    org = make.org(name="Acme")
    r = client.post("/api/contacts", json={
        "first_name": "Ada", "last_name": "Lane", "email": "ada@acme.example.com", "phone": "555 0100",
        "job_title": "CFO", "organization_id": org, "status": "qualified",
    })
    assert r.status_code == 201
    c = r.json()
    assert c["name"] == "Ada Lane" and c["status"] == "qualified" and c["organization_name"] == "Acme"

    row = client.get("/api/contacts").json()[0]
    assert (row["name"], row["organization_name"], row["status"]) == ("Ada Lane", "Acme", "qualified")

    r = client.patch(f"/api/contacts/{c['id']}", json={"status": "customer", "organization_id": None})
    assert r.json()["status"] == "customer" and r.json()["organization_id"] is None

    assert client.delete(f"/api/contacts/{c['id']}").status_code == 204
    assert client.get(f"/api/contacts/{c['id']}").status_code == 404


def test_status_only_changes_when_edited(client, make):
    """[C2] Winning a deal doesn't change its contact's status."""
    person = make.contact(status="lead")
    deal = make.deal("negotiation", contact_id=person)
    client.post(f"/api/deals/{deal}/move", json={"stage": "won", "index": 0})
    assert client.get(f"/api/contacts/{person}").json()["status"] == "lead"


def test_contact_lists_its_deals(client, make):
    """[C2] A contact's record lists the deals where it's the main contact."""
    person = make.contact()
    make.deal(contact_id=person, name="Mine")
    make.deal(name="Not mine")
    assert [d["name"] for d in client.get(f"/api/contacts/{person}").json()["deals"]] == ["Mine"]


def test_delete_unlinks_deals_and_deletes_activities(client, make):
    """[R12, K1, C2] Deleting a contact leaves its deals with no main contact and deletes its activities; the preview counts match."""
    person = make.contact(first_name="Ada", last_name="Lane")
    deals = [make.deal(contact_id=person) for _ in range(2)]
    for _ in range(5):
        make.activity(contact_id=person)
    deal_note = make.activity(deal_id=deals[0])

    assert client.get(f"/api/contacts/{person}/delete-preview").json() == {"name": "Ada Lane", "deals": 2, "activities": 5}
    client.delete(f"/api/contacts/{person}")
    for d in deals:
        assert client.get(f"/api/deals/{d}").json()["contact_id"] is None
    timeline = client.get(f"/api/deals/{deals[0]}/timeline").json()
    assert [a["id"] for a in timeline] == [deal_note]


def test_validation(client):
    """[C2] Names are required, the email must look right, and the status must be one of the three."""
    r = client.post("/api/contacts", json={"first_name": "", "last_name": "Lane", "email": "ada@", "status": "vip"})
    assert r.status_code == 422
    assert r.json()["errors"] == {"first_name": "Required", "email": "Enter a valid email address", "status": "Choose one of the options"}
    r = client.post("/api/contacts", json={"first_name": "A", "last_name": "B", "organization_id": 999})
    assert r.json()["errors"] == {"organization_id": "That organization no longer exists"}
