from typing import Literal

from pydantic import BaseModel

from backend.app.core.schemas import OptionalEmail, OptionalId, OptionalText, RequiredText

Status = Literal["lead", "qualified", "customer"]


class ContactIn(BaseModel):
    first_name: RequiredText
    last_name: RequiredText
    email: OptionalEmail = None
    phone: OptionalText = None
    job_title: OptionalText = None
    organization_id: OptionalId = None
    status: Status = "lead"


class ContactPatch(BaseModel):
    first_name: RequiredText | None = None
    last_name: RequiredText | None = None
    email: OptionalEmail = None
    phone: OptionalText = None
    job_title: OptionalText = None
    organization_id: OptionalId = None
    status: Status | None = None
