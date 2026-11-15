from pydantic import BaseModel

from backend.app.core.schemas import OptionalText, OptionalWebsite, RequiredText


class OrganizationIn(BaseModel):
    name: RequiredText
    website: OptionalWebsite = None
    industry: OptionalText = None
    notes: OptionalText = None


class OrganizationPatch(BaseModel):
    name: RequiredText | None = None
    website: OptionalWebsite = None
    industry: OptionalText = None
    notes: OptionalText = None
