from fastapi.testclient import TestClient
from sqlalchemy import func, select

from backend.app.core import db
from backend.app.crm.tables import deals, organizations
from backend.app.main import create_app


def test_missing_database_is_created_and_seeded(temp_db):
    """[R2, C1] With no database file, start-up creates it and fills it with sample data."""
    assert not temp_db.exists()
    with TestClient(create_app()) as client:
        assert client.get("/api/health").json() == {"ok": True}
    assert temp_db.exists()
    with db.get_engine().connect() as conn:
        assert conn.execute(select(func.count()).select_from(organizations)).scalar() > 0
        assert conn.execute(select(func.count()).select_from(deals)).scalar() > 0


def test_existing_database_is_left_alone(engine, make):
    """[R2] An existing database is not reseeded on start."""
    make.org(name="Only one")
    with TestClient(create_app()):
        pass
    with engine.connect() as conn:
        names = conn.execute(select(organizations.c.name)).scalars().all()
    assert names == ["Only one"]
