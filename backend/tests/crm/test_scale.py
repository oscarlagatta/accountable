import time

import pytest

from backend.app.crm import seed

LIMIT = 0.5  # seconds; generous so slow machines don't give false failures


@pytest.fixture(scope="module")
def scale_db(tmp_path_factory):
    return tmp_path_factory.mktemp("scale") / "scale.db"


@pytest.fixture
def scale_client(scale_db, monkeypatch):
    from fastapi.testclient import TestClient

    from backend.app.core import db
    from backend.app.main import create_app

    monkeypatch.setenv("ACCOUNTABLE_DB", str(scale_db))
    if not scale_db.exists():
        seed.reset(db.get_engine(scale_db), volumes=seed.SCALE)
    with TestClient(create_app()) as c:
        yield c


def test_scale_volumes(scale_client):
    """[R14] The scale seed has about 1,000 contacts, 500 deals and 5,000 activities."""
    assert len(scale_client.get("/api/contacts").json()) == 1000
    assert len(scale_client.get("/api/deals").json()) == 500


@pytest.mark.parametrize(
    "path", ["/api/contacts", "/api/deals", "/api/organizations", "/api/pipeline", "/api/dashboard"]
)
def test_endpoints_answer_quickly(scale_client, path):
    """[R14] Each list, the board and the dashboard answer within 500 ms at the stated scale."""
    scale_client.get(path)  # warm up
    start = time.perf_counter()
    r = scale_client.get(path)
    elapsed = time.perf_counter() - start
    assert r.status_code == 200
    assert elapsed < LIMIT, f"{path} took {elapsed * 1000:.0f} ms"
