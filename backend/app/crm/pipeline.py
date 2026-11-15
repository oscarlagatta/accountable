"""The pipeline board: six columns with their deals in order, column and open totals, and the stage list."""

from fastapi import APIRouter, Depends
from sqlalchemy import Connection

from backend.app.core.db import get_conn

from . import stages
from .deals.service import deal_rows
from .tables import deals

router = APIRouter(prefix="/pipeline", tags=["pipeline"])


def board(conn: Connection) -> dict:
    rows = deal_rows(conn, order_by=[deals.c.position, deals.c.id])
    columns = []
    for s in stages.STAGES:
        cards = [d for d in rows if d["stage"] == s.key]
        columns.append({
            "stage": s.key,
            "label": s.label,
            "probability": s.probability,
            "open": s.open,
            "count": len(cards),
            "total": sum(d["value"] for d in cards),
            "expected": sum(d["expected_revenue"] for d in cards),
            "deals": cards,
        })
    open_columns = [c for c in columns if c["open"]]
    return {
        "stages": stages.as_dicts(),
        "columns": columns,
        "totals": {
            "open_count": sum(c["count"] for c in open_columns),
            "open_value": sum(c["total"] for c in open_columns),
            "open_expected": sum(c["expected"] for c in open_columns),
        },
    }


@router.get("")
def get_pipeline(conn: Connection = Depends(get_conn)):
    return board(conn)
