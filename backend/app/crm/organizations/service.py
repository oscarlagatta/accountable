"""Organizations: list with counts and open value, get, create, update, delete and delete preview."""

from sqlalchemy import Connection, delete, func, insert, select, update

from backend.app.core import clock
from backend.app.core.errors import FieldError, NotFound

from .. import stages
from ..deals.service import deal_rows
from ..tables import contacts, deals, organizations
from .schemas import OrganizationIn, OrganizationPatch


def _require(conn: Connection, org_id: int) -> dict:
    row = conn.execute(select(organizations).where(organizations.c.id == org_id)).mappings().first()
    if row is None:
        raise NotFound("Organization")
    return dict(row)


def list_organizations(conn: Connection) -> list[dict]:
    contact_counts = (
        select(contacts.c.organization_id, func.count().label("n")).group_by(contacts.c.organization_id).subquery()
    )
    open_deals = (
        select(
            deals.c.organization_id,
            func.count().label("n"),
            func.coalesce(func.sum(deals.c.value), 0).label("value"),
        )
        .where(deals.c.stage.in_(stages.OPEN_KEYS))
        .group_by(deals.c.organization_id)
        .subquery()
    )
    q = (
        select(
            organizations.c.id,
            organizations.c.name,
            organizations.c.industry,
            organizations.c.website,
            func.coalesce(contact_counts.c.n, 0).label("contact_count"),
            func.coalesce(open_deals.c.n, 0).label("open_deal_count"),
            func.coalesce(open_deals.c.value, 0).label("open_value"),
        )
        .outerjoin(contact_counts, contact_counts.c.organization_id == organizations.c.id)
        .outerjoin(open_deals, open_deals.c.organization_id == organizations.c.id)
        .order_by(func.lower(organizations.c.name))
    )
    return [dict(r) for r in conn.execute(q).mappings()]


def get_organization(conn: Connection, org_id: int) -> dict:
    org = _require(conn, org_id)
    people = conn.execute(
        select(
            contacts.c.id, contacts.c.first_name, contacts.c.last_name, contacts.c.email, contacts.c.phone,
            contacts.c.job_title, contacts.c.status,
        )
        .where(contacts.c.organization_id == org_id)
        .order_by(func.lower(contacts.c.first_name), func.lower(contacts.c.last_name))
    ).mappings()
    org["contacts"] = [dict(p) | {"name": f"{p['first_name']} {p['last_name']}"} for p in people]
    org["deals"] = deal_rows(conn, deals.c.organization_id == org_id)
    return org


def create_organization(conn: Connection, data: OrganizationIn) -> dict:
    stamp = clock.now().isoformat()
    new_id = conn.execute(
        insert(organizations).values(**data.model_dump(), created_at=stamp, updated_at=stamp)
    ).inserted_primary_key[0]
    return get_organization(conn, new_id)


def update_organization(conn: Connection, org_id: int, data: OrganizationPatch) -> dict:
    _require(conn, org_id)
    values = data.model_dump(exclude_unset=True)
    if "name" in values and values["name"] is None:
        raise FieldError({"name": "Required"})
    if values:
        conn.execute(
            update(organizations).where(organizations.c.id == org_id).values(**values, updated_at=clock.now().isoformat())
        )
    return get_organization(conn, org_id)


def delete_preview(conn: Connection, org_id: int) -> dict:
    org = _require(conn, org_id)
    n_contacts = conn.execute(select(func.count()).where(contacts.c.organization_id == org_id)).scalar()
    n_deals = conn.execute(select(func.count()).where(deals.c.organization_id == org_id)).scalar()
    return {"name": org["name"], "contacts": n_contacts, "deals": n_deals}


def delete_organization(conn: Connection, org_id: int) -> None:
    """Its contacts and deals stay, with no organization (ON DELETE SET NULL)."""
    _require(conn, org_id)
    conn.execute(delete(organizations).where(organizations.c.id == org_id))
