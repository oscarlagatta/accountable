from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, model_validator

from backend.app.core.schemas import OptionalId, RequiredText

Kind = Literal["note", "call", "email"]


class ActivityIn(BaseModel):
    kind: Kind = "note"
    contact_id: OptionalId = None
    deal_id: OptionalId = None
    description: RequiredText
    occurred_at: datetime | None = None
    follow_up_date: date | None = None

    @model_validator(mode="after")
    def _one_target(self):
        if (self.contact_id is None) == (self.deal_id is None):
            raise ValueError("Choose a contact or a deal")
        return self


class ActivityPatch(BaseModel):
    kind: Kind | None = None
    description: RequiredText | None = None
    occurred_at: datetime | None = None
    follow_up_date: date | None = None
    done: bool | None = None
