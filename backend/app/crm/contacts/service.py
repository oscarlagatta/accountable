"""Contacts: CRUD (status changes only when edited), the contact's deals, delete preview."""

from sqlalchemy import Connection, delete, func, insert, select, update

from backend.app.core import clock
from backend.app.core.errors import FieldError, NotFound

from ..deals.service import deal_rows
from ..tables import activities, contacts, deals, organizations
from .schemas import ContactIn, ContactPatch

_FIELDS = [
    contacts.c.id, contacts.c.first_name, contacts.c.last_name, contacts.c.email, contacts.c.phone,
    contacts.c.job_title, contacts.c.organization_id, organizations.c.name.label("organization_name"),
    contacts.c.status,
]


def _with_name(row) -> dict:
    return dict(row) | {"name": f"{row['first_name']} {row['last_name']}"}


def _require(conn: Connection, contact_id: int) -> dict:
    row = conn.execute(select(contacts).where(contacts.c.id == contact_id)).mappings().first()
    if row is None:
        raise NotFound("Contact")
    return dict(row)


def _check_org(conn: Connection, values: dict) -> None:
    org_id = values.get("organization_id")
    if org_id is not None and not conn.execute(select(organizations.c.id).where(organizations.c.id == org_id)).first():
        raise FieldError({"organization_id": "That organization no longer exists"})


def list_contacts(conn: Connection) -> list[dict]:
    q = (
        select(*_FIELDS)
        .outerjoin(organizations, organizations.c.id == contacts.c.organization_id)
        .order_by(func.lower(contacts.c.first_name), func.lower(contacts.c.last_name), contacts.c.id)
    )
    return [_with_name(r) for r in conn.execute(q).mappings()]


def get_contact(conn: Connection, contact_id: int) -> dict:
    row = conn.execute(
        select(*_FIELDS)
        .outerjoin(organizations, organizations.c.id == contacts.c.organization_id)
        .where(contacts.c.id == contact_id)
    ).mappings().first()
    if row is None:
        raise NotFound("Contact")
    contact = _with_name(row)
    contact["deals"] = deal_rows(conn, deals.c.contact_id == contact_id)
    return contact


def create_contact(conn: Connection, data: ContactIn) -> dict:
    values = data.model_dump()
    _check_org(conn, values)
    stamp = clock.now().isoformat()
    new_id = conn.execute(insert(contacts).values(**values, created_at=stamp, updated_at=stamp)).inserted_primary_key[0]
    return get_contact(conn, new_id)


def update_contact(conn: Connection, contact_id: int, data: ContactPatch) -> dict:
    _require(conn, contact_id)
    values = data.model_dump(exclude_unset=True)
    for field in ("first_name", "last_name", "status"):
        if field in values and values[field] is None:
            raise FieldError({field: "Required"})
    _check_org(conn, values)
    if values:
        conn.execute(update(contacts).where(contacts.c.id == contact_id).values(**values, updated_at=clock.now().isoformat()))
    return get_contact(conn, contact_id)


def delete_preview(conn: Connection, contact_id: int) -> dict:
    c = _require(conn, contact_id)
    n_deals = conn.execute(select(func.count()).where(deals.c.contact_id == contact_id)).scalar()
    n_acts = conn.execute(select(func.count()).where(activities.c.contact_id == contact_id)).scalar()
    return {"name": f"{c['first_name']} {c['last_name']}", "deals": n_deals, "activities": n_acts}


def delete_contact(conn: Connection, contact_id: int) -> None:
    """Its deals stay with no main contact; the activities logged on it are deleted."""
    _require(conn, contact_id)
    conn.execute(delete(contacts).where(contacts.c.id == contact_id))
