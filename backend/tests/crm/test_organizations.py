def test_crud(client):
    """[R7, C2] Organizations can be created, listed, read, updated and deleted."""
    r = client.post(
        "/api/organizations",
        json={"name": "  Northwind Logistics ", "website": "northwind.example.com", "industry": "Logistics"},
    )
    assert r.status_code == 201
    org = r.json()
    assert org["name"] == "Northwind Logistics"
    assert org["contacts"] == [] and org["deals"] == []

    assert [o["name"] for o in client.get("/api/organizations").json()] == ["Northwind Logistics"]

    r = client.patch(f"/api/organizations/{org['id']}", json={"notes": "Two sites", "industry": ""})
    assert r.status_code == 200
    assert r.json()["notes"] == "Two sites"
    assert r.json()["industry"] is None
    assert client.get(f"/api/organizations/{org['id']}").json()["notes"] == "Two sites"

    assert client.delete(f"/api/organizations/{org['id']}").status_code == 204
    assert client.get(f"/api/organizations/{org['id']}").status_code == 404
    assert client.get("/api/organizations").json() == []


def test_list_counts_and_open_value(client, make):
    """[R7, C2] The list carries contact count, open deal count and open value, sorted by name."""
    acme = make.org(name="acme")
    make.org(name="Zeta")
    make.contact(organization_id=acme)
    make.contact(organization_id=acme)
    make.deal("new", organization_id=acme, value=1000)
    make.deal("negotiation", organization_id=acme, value=2500)
    make.deal("won", organization_id=acme, value=99999)
    make.deal("lost", organization_id=acme, value=5000)
    rows = client.get("/api/organizations").json()
    assert [r["name"] for r in rows] == ["acme", "Zeta"]
    assert (rows[0]["contact_count"], rows[0]["open_deal_count"], rows[0]["open_value"]) == (2, 2, 3500)
    assert (rows[1]["contact_count"], rows[1]["open_deal_count"], rows[1]["open_value"]) == (0, 0, 0)


def test_organization_page_lists_contacts_and_deals(client, make):
    """[R7] The organization's record lists its contacts and deals."""
    org = make.org(name="Acme")
    person = make.contact(organization_id=org, first_name="Ada", last_name="Lane")
    make.deal("proposal", organization_id=org, contact_id=person, name="Big deal")
    body = client.get(f"/api/organizations/{org}").json()
    assert [c["name"] for c in body["contacts"]] == ["Ada Lane"]
    assert [d["name"] for d in body["deals"]] == ["Big deal"]
    assert body["deals"][0]["contact_name"] == "Ada Lane"


def test_delete_unlinks_and_preview_counts(client, make):
    """[R12, K1, C2] Deleting an organization keeps its contacts and deals with no organization; the preview counts match."""
    org = make.org(name="Northwind")
    people = [make.contact(organization_id=org) for _ in range(2)]
    ds = [make.deal(organization_id=org) for _ in range(3)]
    make.contact()  # elsewhere

    assert client.get(f"/api/organizations/{org}/delete-preview").json() == {
        "name": "Northwind",
        "contacts": 2,
        "deals": 3,
    }
    assert client.delete(f"/api/organizations/{org}").status_code == 204
    for pid in people:
        assert client.get(f"/api/contacts/{pid}").json()["organization_id"] is None
    for did in ds:
        assert client.get(f"/api/deals/{did}").json()["organization_id"] is None


def test_validation_messages(client):
    """[C2] Bad input gives a 422 with a plain message per field."""
    r = client.post("/api/organizations", json={"name": "  ", "website": "not a site"})
    assert r.status_code == 422
    assert r.json()["errors"] == {"name": "Required", "website": "Enter a valid website, such as example.com"}
    r = client.post("/api/organizations", json={})
    assert r.json()["errors"] == {"name": "Required"}
    org = client.post("/api/organizations", json={"name": "A"}).json()
    assert client.patch(f"/api/organizations/{org['id']}", json={"name": None}).json()["errors"] == {"name": "Required"}
    assert client.get("/api/organizations/999").status_code == 404
