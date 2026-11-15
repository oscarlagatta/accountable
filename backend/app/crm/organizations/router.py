from fastapi import APIRouter, Depends, Response
from sqlalchemy import Connection

from backend.app.core.db import get_conn

from . import service
from .schemas import OrganizationIn, OrganizationPatch

router = APIRouter(prefix="/organizations", tags=["organizations"])


@router.get("")
def list_organizations(conn: Connection = Depends(get_conn)):
    return service.list_organizations(conn)


@router.post("", status_code=201)
def create_organization(data: OrganizationIn, conn: Connection = Depends(get_conn)):
    return service.create_organization(conn, data)


@router.get("/{org_id}")
def get_organization(org_id: int, conn: Connection = Depends(get_conn)):
    return service.get_organization(conn, org_id)


@router.patch("/{org_id}")
def update_organization(org_id: int, data: OrganizationPatch, conn: Connection = Depends(get_conn)):
    return service.update_organization(conn, org_id, data)


@router.get("/{org_id}/delete-preview")
def delete_preview(org_id: int, conn: Connection = Depends(get_conn)):
    return service.delete_preview(conn, org_id)


@router.delete("/{org_id}", status_code=204)
def delete_organization(org_id: int, conn: Connection = Depends(get_conn)):
    service.delete_organization(conn, org_id)
    return Response(status_code=204)
