from fastapi import APIRouter, Depends, Response
from sqlalchemy import Connection

from backend.app.core.db import get_conn

from . import service
from .schemas import ActivityIn, ActivityPatch

router = APIRouter(prefix="/activities", tags=["activities"])


@router.post("", status_code=201)
def create_activity(data: ActivityIn, conn: Connection = Depends(get_conn)):
    return service.create_activity(conn, data)


@router.patch("/{activity_id}")
def update_activity(activity_id: int, data: ActivityPatch, conn: Connection = Depends(get_conn)):
    return service.update_activity(conn, activity_id, data)


@router.delete("/{activity_id}", status_code=204)
def delete_activity(activity_id: int, conn: Connection = Depends(get_conn)):
    service.delete_activity(conn, activity_id)
    return Response(status_code=204)
