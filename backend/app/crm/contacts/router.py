from fastapi import APIRouter, Depends, Response
from sqlalchemy import Connection

from backend.app.core.db import get_conn

from ..activities import service as activities
from . import service
from .schemas import ContactIn, ContactPatch

router = APIRouter(prefix="/contacts", tags=["contacts"])


@router.get("")
def list_contacts(conn: Connection = Depends(get_conn)):
    return service.list_contacts(conn)


@router.post("", status_code=201)
def create_contact(data: ContactIn, conn: Connection = Depends(get_conn)):
    return service.create_contact(conn, data)


@router.get("/{contact_id}")
def get_contact(contact_id: int, conn: Connection = Depends(get_conn)):
    return service.get_contact(conn, contact_id)


@router.patch("/{contact_id}")
def update_contact(contact_id: int, data: ContactPatch, conn: Connection = Depends(get_conn)):
    return service.update_contact(conn, contact_id, data)


@router.get("/{contact_id}/timeline")
def timeline(contact_id: int, conn: Connection = Depends(get_conn)):
    return activities.contact_timeline(conn, contact_id)


@router.get("/{contact_id}/delete-preview")
def delete_preview(contact_id: int, conn: Connection = Depends(get_conn)):
    return service.delete_preview(conn, contact_id)


@router.delete("/{contact_id}", status_code=204)
def delete_contact(contact_id: int, conn: Connection = Depends(get_conn)):
    service.delete_contact(conn, contact_id)
    return Response(status_code=204)
