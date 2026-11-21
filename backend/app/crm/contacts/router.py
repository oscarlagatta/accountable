from fastapi import APIRouter, Response

from backend.app.core.db import DbConn

from ..activities import service as activities
from . import service
from .schemas import ContactIn, ContactPatch

router = APIRouter(prefix="/contacts", tags=["contacts"])


@router.get("")
def list_contacts(conn: DbConn):
    return service.list_contacts(conn)


@router.post("", status_code=201)
def create_contact(data: ContactIn, conn: DbConn):
    return service.create_contact(conn, data)


@router.get("/{contact_id}")
def get_contact(contact_id: int, conn: DbConn):
    return service.get_contact(conn, contact_id)


@router.patch("/{contact_id}")
def update_contact(contact_id: int, data: ContactPatch, conn: DbConn):
    return service.update_contact(conn, contact_id, data)


@router.get("/{contact_id}/timeline")
def timeline(contact_id: int, conn: DbConn):
    return activities.contact_timeline(conn, contact_id)


@router.get("/{contact_id}/delete-preview")
def delete_preview(contact_id: int, conn: DbConn):
    return service.delete_preview(conn, contact_id)


@router.delete("/{contact_id}", status_code=204)
def delete_contact(contact_id: int, conn: DbConn):
    service.delete_contact(conn, contact_id)
    return Response(status_code=204)
