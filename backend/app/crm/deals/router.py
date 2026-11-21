from fastapi import APIRouter, Response

from backend.app.core.db import DbConn

from ..activities import service as activities
from . import service
from .schemas import DealIn, DealPatch, Move

router = APIRouter(prefix="/deals", tags=["deals"])


@router.get("")
def list_deals(conn: DbConn):
    return service.list_deals(conn)


@router.post("", status_code=201)
def create_deal(data: DealIn, conn: DbConn):
    return service.create_deal(conn, data)


@router.get("/{deal_id}")
def get_deal(deal_id: int, conn: DbConn):
    return service.get_deal(conn, deal_id)


@router.patch("/{deal_id}")
def update_deal(deal_id: int, data: DealPatch, conn: DbConn):
    return service.update_deal(conn, deal_id, data)


@router.post("/{deal_id}/move")
def move_deal(deal_id: int, move: Move, conn: DbConn):
    return service.move_deal(conn, deal_id, move)


@router.get("/{deal_id}/timeline")
def timeline(deal_id: int, conn: DbConn):
    return activities.deal_timeline(conn, deal_id)


@router.get("/{deal_id}/delete-preview")
def delete_preview(deal_id: int, conn: DbConn):
    return service.delete_preview(conn, deal_id)


@router.delete("/{deal_id}", status_code=204)
def delete_deal(deal_id: int, conn: DbConn):
    service.delete_deal(conn, deal_id)
    return Response(status_code=204)
