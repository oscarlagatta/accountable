import pytest
from sqlalchemy import delete, inspect, select
from sqlalchemy.exc import IntegrityError

from backend.app.core import db
from backend.app.crm.tables import activities, contacts, deals, organizations


def test_tables_and_indexes_exist(engine):
    """[K1] The four tables are on the shared MetaData, with indexes on foreign keys, stage order and follow-ups."""
    assert {"organizations", "contacts", "deals", "activities"} <= set(db.metadata.tables)
    insp = inspect(engine)
    assert {"organizations", "contacts", "deals", "activities"} <= set(insp.get_table_names())
    indexed = {tuple(ix["column_names"]) for t in ("contacts", "deals", "activities") for ix in insp.get_indexes(t)}
    for cols in [("organization_id",), ("contact_id",), ("deal_id",), ("stage", "position"), ("follow_up_date", "done")]:
        assert cols in indexed, cols


def test_foreign_keys_are_on(engine):
    """[K1] Foreign keys are enforced on every connection."""
    with engine.connect() as conn:
        assert conn.exec_driver_sql("PRAGMA foreign_keys").scalar() == 1
    with pytest.raises(IntegrityError), engine.begin() as conn:
        conn.execute(contacts.insert().values(first_name="A", last_name="B", status="lead", organization_id=999,
                                              created_at="x", updated_at="x"))


def test_delete_rules(engine, make):
    """[K1] Organization and contact deletes set links to null; activities cascade with their contact or deal."""
    org = make.org()
    person = make.contact(organization_id=org)
    deal = make.deal(organization_id=org, contact_id=person)
    on_person = make.activity(contact_id=person)
    on_deal = make.activity(deal_id=deal)

    with engine.begin() as conn:
        conn.execute(delete(organizations).where(organizations.c.id == org))
        assert conn.execute(select(contacts.c.organization_id).where(contacts.c.id == person)).scalar() is None
        assert conn.execute(select(deals.c.organization_id).where(deals.c.id == deal)).scalar() is None

        conn.execute(delete(contacts).where(contacts.c.id == person))
        assert conn.execute(select(deals.c.contact_id).where(deals.c.id == deal)).scalar() is None
        assert conn.execute(select(activities.c.id).where(activities.c.id == on_person)).first() is None

        conn.execute(delete(deals).where(deals.c.id == deal))
        assert conn.execute(select(activities.c.id).where(activities.c.id == on_deal)).first() is None


@pytest.mark.parametrize("parents", ["both", "neither"])
def test_activity_needs_exactly_one_parent(engine, make, parents):
    """[K1] An activity with both or neither of contact and deal is refused."""
    person = make.contact()
    deal = make.deal()
    links = {"both": {"contact_id": person, "deal_id": deal}, "neither": {}}[parents]
    with pytest.raises(IntegrityError):
        make.activity(**links)
