from fastapi import APIRouter, Response

from backend.app.core.db import DbConn

from . import service
from .schemas import OrganizationIn, OrganizationPatch

router = APIRouter(prefix="/organizations", tags=["organizations"])


@router.get("")
def list_organizations(conn: DbConn):
    return service.list_organizations(conn)


@router.post("", status_code=201)
def create_organization(data: OrganizationIn, conn: DbConn):
    return service.create_organization(conn, data)


@router.get("/{org_id}")
def get_organization(org_id: int, conn: DbConn):
    return service.get_organization(conn, org_id)


@router.patch("/{org_id}")
def update_organization(org_id: int, data: OrganizationPatch, conn: DbConn):
    return service.update_organization(conn, org_id, data)


@router.get("/{org_id}/delete-preview")
def delete_preview(org_id: int, conn: DbConn):
    return service.delete_preview(conn, org_id)


@router.delete("/{org_id}", status_code=204)
def delete_organization(org_id: int, conn: DbConn):
    service.delete_organization(conn, org_id)
    return Response(status_code=204)
