from fastapi import APIRouter, Depends, Response
from sqlalchemy import Connection

from backend.app.core.db import get_conn

from ..activities import service as activities
from . import service
from .schemas import DealIn, DealPatch, Move

router = APIRouter(prefix="/deals", tags=["deals"])


@router.get("")
def list_deals(conn: Connection = Depends(get_conn)):
    return service.list_deals(conn)


@router.post("", status_code=201)
def create_deal(data: DealIn, conn: Connection = Depends(get_conn)):
    return service.create_deal(conn, data)


@router.get("/{deal_id}")
def get_deal(deal_id: int, conn: Connection = Depends(get_conn)):
    return service.get_deal(conn, deal_id)


@router.patch("/{deal_id}")
def update_deal(deal_id: int, data: DealPatch, conn: Connection = Depends(get_conn)):
    return service.update_deal(conn, deal_id, data)


@router.post("/{deal_id}/move")
def move_deal(deal_id: int, move: Move, conn: Connection = Depends(get_conn)):
    return service.move_deal(conn, deal_id, move)


@router.get("/{deal_id}/timeline")
def timeline(deal_id: int, conn: Connection = Depends(get_conn)):
    return activities.deal_timeline(conn, deal_id)


@router.get("/{deal_id}/delete-preview")
def delete_preview(deal_id: int, conn: Connection = Depends(get_conn)):
    return service.delete_preview(conn, deal_id)


@router.delete("/{deal_id}", status_code=204)
def delete_deal(deal_id: int, conn: Connection = Depends(get_conn)):
    service.delete_deal(conn, deal_id)
    return Response(status_code=204)
