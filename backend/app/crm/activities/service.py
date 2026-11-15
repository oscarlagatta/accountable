"""Activities and timelines. Stage-change entries are a record of what happened, so they can't be edited or deleted."""

from datetime import datetime

from sqlalchemy import Connection, Select, delete, insert, or_, select, update

from backend.app.core import clock
from backend.app.core.errors import FieldError, NotFound, Refused

from ..tables import activities, contacts, deals
from .schemas import ActivityIn, ActivityPatch

# The deal's main contact, looked up when the timeline is read (Concerns 6).
deal_contacts = contacts.alias("deal_contact")


def entries_query() -> Select:
    """Activities with the names of what they're on: the contact, or the deal and its main contact."""
    return (
        select(
            activities.c.id, activities.c.kind, activities.c.description, activities.c.occurred_at,
            activities.c.follow_up_date, activities.c.done, activities.c.from_stage, activities.c.to_stage,
            activities.c.contact_id, (contacts.c.first_name + " " + contacts.c.last_name).label("contact_name"),
            activities.c.deal_id, deals.c.name.label("deal_name"),
        )
        .outerjoin(contacts, contacts.c.id == activities.c.contact_id)
        .outerjoin(deals, deals.c.id == activities.c.deal_id)
        .order_by(activities.c.occurred_at.desc(), activities.c.id.desc())
    )


def _entries(conn: Connection, q: Select) -> list[dict]:
    return [dict(r) for r in conn.execute(q).mappings()]


def contact_timeline(conn: Connection, contact_id: int) -> list[dict]:
    """Its own activities, plus those of deals where it's the main contact now."""
    if not conn.execute(select(contacts.c.id).where(contacts.c.id == contact_id)).first():
        raise NotFound("Contact")
    its_deals = select(deals.c.id).where(deals.c.contact_id == contact_id)
    q = entries_query().where(or_(activities.c.contact_id == contact_id, activities.c.deal_id.in_(its_deals)))
    return _entries(conn, q)


def deal_timeline(conn: Connection, deal_id: int) -> list[dict]:
    if not conn.execute(select(deals.c.id).where(deals.c.id == deal_id)).first():
        raise NotFound("Deal")
    return _entries(conn, entries_query().where(activities.c.deal_id == deal_id))


def get_activity(conn: Connection, activity_id: int) -> dict:
    row = conn.execute(entries_query().where(activities.c.id == activity_id)).mappings().first()
    if row is None:
        raise NotFound("Activity")
    return dict(row)


def _iso(dt: datetime) -> str:
    return dt.replace(tzinfo=None, microsecond=0).isoformat()


def create_activity(conn: Connection, data: ActivityIn) -> dict:
    if data.contact_id is not None and not conn.execute(select(contacts.c.id).where(contacts.c.id == data.contact_id)).first():
        raise FieldError({"contact_id": "That contact no longer exists"})
    if data.deal_id is not None and not conn.execute(select(deals.c.id).where(deals.c.id == data.deal_id)).first():
        raise FieldError({"deal_id": "That deal no longer exists"})
    stamp = clock.now().isoformat()
    new_id = conn.execute(
        insert(activities).values(
            kind=data.kind, contact_id=data.contact_id, deal_id=data.deal_id, description=data.description,
            occurred_at=_iso(data.occurred_at) if data.occurred_at else stamp,
            follow_up_date=data.follow_up_date.isoformat() if data.follow_up_date else None,
            done=False, created_at=stamp, updated_at=stamp,
        )
    ).inserted_primary_key[0]
    return get_activity(conn, new_id)


def _require_editable(conn: Connection, activity_id: int) -> dict:
    row = conn.execute(select(activities).where(activities.c.id == activity_id)).mappings().first()
    if row is None:
        raise NotFound("Activity")
    if row["kind"] == "stage_change":
        raise Refused("Stage changes are a record of what happened and can't be changed")
    return dict(row)


def update_activity(conn: Connection, activity_id: int, data: ActivityPatch) -> dict:
    _require_editable(conn, activity_id)
    values = data.model_dump(exclude_unset=True)
    for field in ("kind", "description", "occurred_at", "done"):
        if field in values and values[field] is None:
            raise FieldError({field: "Required"})
    if "occurred_at" in values:
        values["occurred_at"] = _iso(values["occurred_at"])
    if "follow_up_date" in values:
        values["follow_up_date"] = values["follow_up_date"].isoformat() if values["follow_up_date"] else None
        if values["follow_up_date"] is None:
            values["done"] = False
    if values:
        conn.execute(update(activities).where(activities.c.id == activity_id).values(**values, updated_at=clock.now().isoformat()))
    return get_activity(conn, activity_id)


def delete_activity(conn: Connection, activity_id: int) -> None:
    _require_editable(conn, activity_id)
    conn.execute(delete(activities).where(activities.c.id == activity_id))
