"""The pipeline board: six columns with their deals in order, column and open totals, and the stage list."""

from fastapi import APIRouter
from sqlalchemy import Connection

from backend.app.core.db import DbConn

from . import stages
from .deals.service import deal_rows
from .tables import deals

router = APIRouter(prefix="/pipeline", tags=["pipeline"])


def board(conn: Connection) -> dict:
    rows = deal_rows(conn, order_by=[deals.c.position, deals.c.id])
    columns = []
    open_count = open_value = open_expected = 0
    for s in stages.STAGES:
        cards = [d for d in rows if d["stage"] == s.key]
        total = sum(d["value"] for d in cards)
        expected = sum(d["expected_revenue"] for d in cards)
        if s.open:
            open_count += len(cards)
            open_value += total
            open_expected += expected
        columns.append(
            {
                "stage": s.key,
                "label": s.label,
                "probability": s.probability,
                "open": s.open,
                "count": len(cards),
                "total": total,
                "expected": expected,
                "deals": cards,
            }
        )
    return {
        "stages": stages.as_dicts(),
        "columns": columns,
        "totals": {
            "open_count": open_count,
            "open_value": open_value,
            "open_expected": open_expected,
        },
    }


@router.get("")
def get_pipeline(conn: DbConn):
    return board(conn)
