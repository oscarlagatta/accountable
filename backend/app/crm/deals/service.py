"""Deals: CRUD, `late`, expected revenue, the stage-change rule and column positions."""

from datetime import date

from sqlalchemy import ColumnElement, Connection, delete, func, insert, select, update

from backend.app.core import clock
from backend.app.core.errors import FieldError, NotFound

from .. import stages
from ..tables import activities, contacts, deals, organizations
from .schemas import DealIn, DealPatch, Move


def expected_revenue(value: int, probability: int) -> int:
    """Value times probability, in whole dollars (halves round up)."""
    return (value * probability + 50) // 100


def is_late(stage: str, close_date: str, today: date | None = None) -> bool:
    """Late means still open and past its close date."""
    today = today or clock.today()
    return stages.is_open(stage) and close_date < today.isoformat()


def deal_rows(conn: Connection, where: ColumnElement | None = None, order_by=None) -> list[dict]:
    """Deals with organization and contact names, expected revenue and `late`."""
    q = (
        select(
            deals.c.id, deals.c.name, deals.c.organization_id, organizations.c.name.label("organization_name"),
            deals.c.contact_id, (contacts.c.first_name + " " + contacts.c.last_name).label("contact_name"),
            deals.c.stage, deals.c.value, deals.c.probability, deals.c.close_date, deals.c.position,
        )
        .outerjoin(organizations, organizations.c.id == deals.c.organization_id)
        .outerjoin(contacts, contacts.c.id == deals.c.contact_id)
    )
    if where is not None:
        q = q.where(where)
    q = q.order_by(*(order_by if order_by is not None else [func.lower(deals.c.name), deals.c.id]))
    today = clock.today()
    return [
        dict(r)
        | {
            "expected_revenue": expected_revenue(r["value"], r["probability"]),
            "late": is_late(r["stage"], r["close_date"], today),
        }
        for r in conn.execute(q).mappings()
    ]


def _require(conn: Connection, deal_id: int) -> dict:
    row = conn.execute(select(deals).where(deals.c.id == deal_id)).mappings().first()
    if row is None:
        raise NotFound("Deal")
    return dict(row)


def _check_links(conn: Connection, values: dict) -> None:
    errors = {}
    if values.get("organization_id") is not None and not conn.execute(
        select(organizations.c.id).where(organizations.c.id == values["organization_id"])
    ).first():
        errors["organization_id"] = "That organization no longer exists"
    if values.get("contact_id") is not None and not conn.execute(
        select(contacts.c.id).where(contacts.c.id == values["contact_id"])
    ).first():
        errors["contact_id"] = "That contact no longer exists"
    if errors:
        raise FieldError(errors)


def list_deals(conn: Connection) -> list[dict]:
    return deal_rows(conn)


def get_deal(conn: Connection, deal_id: int) -> dict:
    rows = deal_rows(conn, deals.c.id == deal_id)
    if not rows:
        raise NotFound("Deal")
    return rows[0]


def _column_ids(conn: Connection, stage: str, exclude: int | None = None) -> list[int]:
    q = select(deals.c.id).where(deals.c.stage == stage).order_by(deals.c.position, deals.c.id)
    return [i for i in conn.execute(q).scalars() if i != exclude]


def _renumber(conn: Connection, ids: list[int]) -> None:
    for pos, deal_id in enumerate(ids):
        conn.execute(update(deals).where(deals.c.id == deal_id).values(position=pos))


def create_deal(conn: Connection, data: DealIn) -> dict:
    """A new deal takes its stage's probability unless one is given, and goes to the top of its column.

    Creating a deal isn't a stage change, so no entry is added.
    """
    values = data.model_dump()
    _check_links(conn, values)
    if values["probability"] is None:
        values["probability"] = stages.default_probability(values["stage"])
    values["close_date"] = values["close_date"].isoformat()
    stamp = clock.now().isoformat()
    column = _column_ids(conn, values["stage"])
    new_id = conn.execute(insert(deals).values(**values, position=0, created_at=stamp, updated_at=stamp)).inserted_primary_key[0]
    _renumber(conn, [new_id, *column])
    return get_deal(conn, new_id)


def _record_stage_change(conn: Connection, deal_id: int, frm: str, to: str) -> None:
    stamp = clock.now().isoformat()
    conn.execute(
        insert(activities).values(
            kind="stage_change", deal_id=deal_id, from_stage=frm, to_stage=to,
            description=f"Moved from {stages.label(frm)} to {stages.label(to)}",
            occurred_at=stamp, done=False, created_at=stamp, updated_at=stamp,
        )
    )


def change_stage(
    conn: Connection,
    deal: dict,
    to: str,
    index: int = 0,
    probability: int | None = None,
    close_date: str | None = None,
) -> dict:
    """The one stage-change rule, used by the edit form and the board. Runs inside the caller's transaction.

    - the probability becomes the new stage's (or the one the edit form gave)
    - Won or Lost sets the close date to today, unless the edit form gave a date
    - a "Moved from X to Y" entry is added
    - the deal is placed at `index` in its new column and both columns are renumbered
    """
    frm = deal["stage"]
    values: dict = {
        "stage": to,
        "probability": probability if probability is not None else stages.default_probability(to),
        "updated_at": clock.now().isoformat(),
    }
    if close_date is not None:
        values["close_date"] = close_date
    elif not stages.is_open(to):
        values["close_date"] = clock.today().isoformat()
    conn.execute(update(deals).where(deals.c.id == deal["id"]).values(**values))
    _record_stage_change(conn, deal["id"], frm, to)
    _renumber(conn, _column_ids(conn, frm, exclude=deal["id"]))
    target = _column_ids(conn, to, exclude=deal["id"])
    target.insert(min(index, len(target)), deal["id"])
    _renumber(conn, target)
    return values


def update_deal(conn: Connection, deal_id: int, data: DealPatch) -> dict:
    deal = _require(conn, deal_id)
    values = data.model_dump(exclude_unset=True)
    for field in ("name", "value", "close_date"):
        if field in values and values[field] is None:
            raise FieldError({field: "Required"})
    if "stage" in values and values["stage"] is None:
        raise FieldError({"stage": "Choose one of the options"})
    _check_links(conn, values)
    if "close_date" in values:
        values["close_date"] = values["close_date"].isoformat()

    new_stage = values.pop("stage", deal["stage"])
    if new_stage != deal["stage"]:
        probability = values.pop("probability", None)
        close_date = values.pop("close_date", None)
        change_stage(conn, deal, new_stage, index=0, probability=probability, close_date=close_date)
    if values:
        if values.get("probability", 0) is None:
            values.pop("probability")
        conn.execute(update(deals).where(deals.c.id == deal_id).values(**values, updated_at=clock.now().isoformat()))
    return get_deal(conn, deal_id)


def move_deal(conn: Connection, deal_id: int, move: Move) -> dict:
    """Drag on the board: to `index` in `stage`, changing the stage if it's another column."""
    deal = _require(conn, deal_id)
    if move.stage != deal["stage"]:
        change_stage(conn, deal, move.stage, index=move.index)
    else:
        column = _column_ids(conn, deal["stage"], exclude=deal_id)
        column.insert(min(move.index, len(column)), deal_id)
        _renumber(conn, column)
    return get_deal(conn, deal_id)


def delete_preview(conn: Connection, deal_id: int) -> dict:
    deal = _require(conn, deal_id)
    kinds = conn.execute(
        select(activities.c.kind, func.count()).where(activities.c.deal_id == deal_id).group_by(activities.c.kind)
    ).all()
    stage_changes = sum(n for k, n in kinds if k == "stage_change")
    return {"name": deal["name"], "activities": sum(n for _, n in kinds) - stage_changes, "stage_changes": stage_changes}


def delete_deal(conn: Connection, deal_id: int) -> None:
    """Its activities and stage-change entries go with it (ON DELETE CASCADE)."""
    deal = _require(conn, deal_id)
    conn.execute(delete(deals).where(deals.c.id == deal_id))
    _renumber(conn, _column_ids(conn, deal["stage"]))
