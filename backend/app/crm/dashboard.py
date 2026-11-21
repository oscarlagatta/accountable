"""Everything the dashboard shows, worked out from the database on each request."""

from datetime import date
from typing import TypedDict

from fastapi import APIRouter
from sqlalchemy import Connection, select

from backend.app.core import clock
from backend.app.core.db import DbConn

from . import stages
from .activities.service import entries_query
from .deals.service import expected_revenue
from .tables import activities, deals

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


def last_12_months(today: date) -> list[tuple[int, int]]:
    """(year, month) for the last 12 months including this one, oldest first."""
    out = []
    y, m = today.year, today.month
    for _ in range(12):
        out.append((y, m))
        y, m = (y - 1, 12) if m == 1 else (y, m - 1)
    return out[::-1]


class Month(TypedDict):
    month: str
    label: str
    year: int
    won_value: int
    won_count: int
    lost_count: int


def _month_key(y: int, m: int) -> str:
    return f"{y:04d}-{m:02d}"


def summary_and_months(all_deals: list[dict], today: date) -> tuple[dict, list[Month]]:
    months: list[Month] = [
        {
            "month": _month_key(y, m),
            "label": MONTH_LABELS[m - 1],
            "year": y,
            "won_value": 0,
            "won_count": 0,
            "lost_count": 0,
        }
        for y, m in last_12_months(today)
    ]
    by_key = {mo["month"]: mo for mo in months}
    for d in all_deals:
        if d["stage"] not in stages.CLOSED_KEYS:
            continue
        mo = by_key.get(d["close_date"][:7])
        if mo is None:
            continue
        if d["stage"] == "won":
            mo["won_value"] += d["value"]
            mo["won_count"] += 1
        else:
            mo["lost_count"] += 1

    open_deals = [d for d in all_deals if stages.is_open(d["stage"])]
    won_12 = sum(mo["won_count"] for mo in months)
    lost_12 = sum(mo["lost_count"] for mo in months)
    summary = {
        "open_value": sum(d["value"] for d in open_deals),
        "open_expected": sum(expected_revenue(d["value"], d["probability"]) for d in open_deals),
        "open_count": len(open_deals),
        "won_this_month": months[-1]["won_value"],
        "won_count_12m": won_12,
        "lost_count_12m": lost_12,
        "win_rate": round(won_12 / (won_12 + lost_12) * 100) if won_12 + lost_12 else None,
    }
    return summary, months


def strip(all_deals: list[dict]) -> list[dict]:
    out = []
    for key in stages.OPEN_KEYS:
        ds = [d for d in all_deals if d["stage"] == key]
        out.append(
            {
                "stage": key,
                "label": stages.label(key),
                "count": len(ds),
                "value": sum(d["value"] for d in ds),
                "expected": sum(expected_revenue(d["value"], d["probability"]) for d in ds),
            }
        )
    return out


def funnel(all_deals: list[dict], history: list[dict]) -> list[dict]:
    """The value of deals that reached each stage from New to Won (Concerns 4).

    A deal has reached every stage up to the furthest one in its stage history or its current stage,
    so a deal created straight into a later stage counts at the stages before it.
    """
    order = {k: i for i, k in enumerate(stages.FUNNEL_KEYS)}
    furthest: dict[int, int] = {}
    for d in all_deals:
        if d["stage"] in order:
            furthest[d["id"]] = order[d["stage"]]
    for h in history:
        for key in (h["from_stage"], h["to_stage"]):
            if key in order:
                furthest[h["deal_id"]] = max(furthest.get(h["deal_id"], 0), order[key])
    out = []
    for i, key in enumerate(stages.FUNNEL_KEYS):
        reached = [d for d in all_deals if furthest.get(d["id"], 0) >= i]
        value = sum(d["value"] for d in reached)
        prev = out[-1]["value"] if out else None
        out.append(
            {
                "stage": key,
                "label": stages.label(key),
                "count": len(reached),
                "value": value,
                "share": (round(value / prev * 100) if prev else 0) if prev is not None else None,
            }
        )
    return out


def follow_ups(conn: Connection, today: date) -> list[dict]:
    """Open follow-ups: overdue first, then today, then upcoming, soonest first."""
    q = (
        entries_query()
        .where(activities.c.follow_up_date.is_not(None), activities.c.done.is_(False))
        .order_by(None)
        .order_by(activities.c.follow_up_date, activities.c.occurred_at, activities.c.id)
    )
    t = today.isoformat()
    out = []
    for r in conn.execute(q).mappings():
        due = r["follow_up_date"]
        out.append(dict(r) | {"status": "overdue" if due < t else "today" if due == t else "upcoming"})
    return out


def recent(conn: Connection, limit: int = 10) -> list[dict]:
    return [dict(r) for r in conn.execute(entries_query().limit(limit)).mappings()]


def dashboard(conn: Connection) -> dict:
    today = clock.today()
    all_deals = [
        dict(r)
        for r in conn.execute(
            select(deals.c.id, deals.c.stage, deals.c.value, deals.c.probability, deals.c.close_date)
        ).mappings()
    ]
    history = [
        dict(r)
        for r in conn.execute(
            select(activities.c.deal_id, activities.c.from_stage, activities.c.to_stage).where(
                activities.c.kind == "stage_change"
            )
        ).mappings()
    ]
    summary, months = summary_and_months(all_deals, today)
    fu = follow_ups(conn, today)
    summary["open_follow_ups"] = len(fu)
    summary["overdue_follow_ups"] = sum(1 for f in fu if f["status"] == "overdue")
    return {
        "today": today.isoformat(),
        "summary": summary,
        "months": months,
        "strip": strip(all_deals),
        "funnel": funnel(all_deals, history),
        "follow_ups": fu,
        "recent": recent(conn),
    }


@router.get("")
def get_dashboard(conn: DbConn):
    return dashboard(conn)
