def test_columns_counts_totals(client, make):
    """[R27, C4] Six columns in order, each with its deals, count, total value and expected revenue."""
    make.deal("new", value=10000)
    make.deal("new", value=20000)
    make.deal("negotiation", value=12345)
    make.deal("won", value=50000)
    make.deal("lost", value=7000)
    body = client.get("/api/pipeline").json()
    cols = {c["stage"]: c for c in body["columns"]}
    assert [c["stage"] for c in body["columns"]] == ["new", "qualified", "proposal", "negotiation", "won", "lost"]
    assert (cols["new"]["count"], cols["new"]["total"], cols["new"]["expected"]) == (2, 30000, 1500)
    assert (cols["qualified"]["count"], cols["qualified"]["total"]) == (0, 0)
    assert cols["negotiation"]["expected"] == 8642  # 12,345 x 70% = 8,641.5, rounded
    assert (cols["won"]["total"], cols["won"]["expected"]) == (50000, 50000)
    assert (cols["lost"]["total"], cols["lost"]["expected"]) == (7000, 0)
    card = cols["new"]["deals"][0]
    assert {"name", "organization_name", "contact_name", "value", "close_date", "late"} <= set(card)


def test_open_totals_leave_out_won_and_lost(client, make):
    """[R28, C4] The open totals leave out Won and Lost."""
    make.deal("new", value=10000)
    make.deal("proposal", value=20000)
    make.deal("won", value=50000)
    make.deal("lost", value=7000)
    assert client.get("/api/pipeline").json()["totals"] == {"open_count": 2, "open_value": 30000, "open_expected": 500 + 8000}


def test_stage_list(client):
    """[R23] The stage list carries each stage's key, label, probability and whether it's open."""
    assert client.get("/api/pipeline").json()["stages"] == [
        {"key": "new", "label": "New", "probability": 5, "open": True},
        {"key": "qualified", "label": "Qualified", "probability": 20, "open": True},
        {"key": "proposal", "label": "Proposal", "probability": 40, "open": True},
        {"key": "negotiation", "label": "Negotiation", "probability": 70, "open": True},
        {"key": "won", "label": "Won", "probability": 100, "open": False},
        {"key": "lost", "label": "Lost", "probability": 0, "open": False},
    ]
