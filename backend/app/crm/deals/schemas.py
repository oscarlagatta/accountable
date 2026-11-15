from datetime import date
from typing import Annotated, Literal

from pydantic import BaseModel, Field

from backend.app.core.schemas import OptionalId, RequiredText

StageKey = Literal["new", "qualified", "proposal", "negotiation", "won", "lost"]
Value = Annotated[int, Field(ge=0, strict=False)]
Probability = Annotated[int, Field(ge=0, le=100)]


class DealIn(BaseModel):
    name: RequiredText
    organization_id: OptionalId = None
    contact_id: OptionalId = None
    stage: StageKey = "new"
    value: Value
    probability: Probability | None = None
    close_date: date


class DealPatch(BaseModel):
    name: RequiredText | None = None
    organization_id: OptionalId = None
    contact_id: OptionalId = None
    stage: StageKey | None = None
    value: Value | None = None
    probability: Probability | None = None
    close_date: date | None = None


class Move(BaseModel):
    stage: StageKey
    index: Annotated[int, Field(ge=0)]
