"""The four CRM tables. They're linked to each other, so they stay in one file.

Dates are ISO strings (YYYY-MM-DD) and times are ISO date-times in local time.
"""

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    ForeignKey,
    Index,
    Integer,
    String,
    Table,
    Text,
    and_,
    false,
    or_,
)

from backend.app.core.db import metadata

from .stages import KEYS as STAGE_KEYS

CONTACT_STATUSES = ["lead", "qualified", "customer"]
ACTIVITY_KINDS = ["note", "call", "email"]
ALL_ACTIVITY_KINDS = [*ACTIVITY_KINDS, "stage_change"]


def _stamps() -> list[Column]:
    return [
        Column("created_at", String(19), nullable=False),
        Column("updated_at", String(19), nullable=False),
    ]


organizations = Table(
    "organizations",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("name", String(200), nullable=False),
    Column("website", String(300)),
    Column("industry", String(100)),
    Column("notes", Text),
    *_stamps(),
)

contacts = Table(
    "contacts",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("first_name", String(100), nullable=False),
    Column("last_name", String(100), nullable=False),
    Column("email", String(254)),
    Column("phone", String(50)),
    Column("job_title", String(150)),
    Column("organization_id", Integer, ForeignKey("organizations.id", ondelete="SET NULL"), index=True),
    Column("status", String(20), nullable=False),
    *_stamps(),
)
contacts.append_constraint(CheckConstraint(contacts.c.status.in_(CONTACT_STATUSES), name="contact_status"))

deals = Table(
    "deals",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("name", String(200), nullable=False),
    Column("organization_id", Integer, ForeignKey("organizations.id", ondelete="SET NULL"), index=True),
    Column("contact_id", Integer, ForeignKey("contacts.id", ondelete="SET NULL"), index=True),
    Column("stage", String(20), nullable=False),
    Column("value", Integer, nullable=False),
    Column("probability", Integer, nullable=False),
    Column("close_date", String(10), nullable=False),
    Column("position", Integer, nullable=False, default=0),
    *_stamps(),
)
deals.append_constraint(CheckConstraint(deals.c.stage.in_(STAGE_KEYS), name="deal_stage"))
deals.append_constraint(CheckConstraint(deals.c.value >= 0, name="deal_value"))
deals.append_constraint(
    CheckConstraint(and_(deals.c.probability >= 0, deals.c.probability <= 100), name="deal_probability")
)
Index("ix_deals_stage_position", deals.c.stage, deals.c.position)

activities = Table(
    "activities",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("kind", String(20), nullable=False),
    Column("contact_id", Integer, ForeignKey("contacts.id", ondelete="CASCADE"), index=True),
    Column("deal_id", Integer, ForeignKey("deals.id", ondelete="CASCADE"), index=True),
    Column("description", Text, nullable=False, default=""),
    Column("from_stage", String(20)),
    Column("to_stage", String(20)),
    Column("occurred_at", String(19), nullable=False),
    Column("follow_up_date", String(10)),
    Column("done", Boolean, nullable=False, default=False, server_default=false()),
    *_stamps(),
)
activities.append_constraint(CheckConstraint(activities.c.kind.in_(ALL_ACTIVITY_KINDS), name="activity_kind"))
# Exactly one of contact or deal.
activities.append_constraint(
    CheckConstraint(
        or_(
            and_(activities.c.contact_id.is_not(None), activities.c.deal_id.is_(None)),
            and_(activities.c.contact_id.is_(None), activities.c.deal_id.is_not(None)),
        ),
        name="activity_one_parent",
    )
)
Index("ix_activities_follow_up", activities.c.follow_up_date, activities.c.done)
Index("ix_activities_occurred_at", activities.c.occurred_at)
