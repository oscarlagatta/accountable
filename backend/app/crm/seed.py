"""Sample data for a small B2B services and software business.

Generated from a fixed seed, with every date relative to today, so a reset always
gives the same data and there are always follow-ups due soon and deals running late.

    python -m backend.app.crm.seed            reset to the sample data
    python -m backend.app.crm.seed --scale    1,000 contacts, 500 deals, 5,000 activities (scale tests only)
"""

import argparse
import random
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta

from faker import Faker
from sqlalchemy import Connection, Engine, delete, insert

from backend.app.core import clock, db

from . import stages
from .tables import activities, contacts, deals, organizations

SEED = 20261115

INDUSTRIES = ["Healthcare", "Logistics", "Retail", "Financial services", "Manufacturing", "Education", "Hospitality"]

# Made-up company names, about 25, across the industries above.
COMPANIES: list[tuple[str, str]] = [
    ("Cedar Valley Clinics", "Healthcare"),
    ("Brightwater Health Partners", "Healthcare"),
    ("Kestrel Dental Group", "Healthcare"),
    ("Pinehurst Family Practice", "Healthcare"),
    ("Harbor Freight Lines", "Logistics"),
    ("Northbound Couriers", "Logistics"),
    ("Ironbridge Warehousing", "Logistics"),
    ("Tallgrass Shipping Co.", "Logistics"),
    ("Brightline Retail", "Retail"),
    ("Juniper & Oak Home", "Retail"),
    ("Saltmarsh Outfitters", "Retail"),
    ("Summit Mutual", "Financial services"),
    ("Larkspur Credit Union", "Financial services"),
    ("Granite Ledger Advisors", "Financial services"),
    ("Ostrow Manufacturing", "Manufacturing"),
    ("Redfern Precision Parts", "Manufacturing"),
    ("Copperline Fabrication", "Manufacturing"),
    ("Westbrook College", "Education"),
    ("Maplewood School District", "Education"),
    ("Riverside Learning Trust", "Education"),
    ("Northgate Hotels", "Hospitality"),
    ("Bluefin Resorts", "Hospitality"),
    ("Old Mill Inn Group", "Hospitality"),
    ("Fairhaven Senior Living", "Healthcare"),
    ("Quarry Lane Builders Supply", "Retail"),
]

NOTES = [
    "Prefers email over calls. Budget cycle starts in January.",
    "Long-standing customer. Renewal conversations go through finance.",
    "Introduced by a partner. Interested in a phased rollout.",
    "Two sites, planning a third next year.",
    "Procurement needs three quotes for anything over $50,000.",
    "Very responsive. Decisions are made by a small leadership team.",
    "",
]

JOB_TITLES = [
    "Operations Director", "IT Manager", "Chief Financial Officer", "Head of Procurement", "Practice Manager",
    "General Manager", "Project Lead", "Chief Operating Officer", "Office Manager", "Systems Administrator",
    "VP of Sales", "Facilities Manager", "Head of Digital", "Finance Manager", "Owner",
]

DEAL_NAMES = [
    "Fleet tracking pilot", "Patient intake portal", "Inventory sync add-on", "Staff training package",
    "Data warehouse scoping", "Claims workflow rebuild", "Campus booking system", "Route optimization",
    "Loyalty app refresh", "ERP integration", "Telehealth module", "Guest Wi-Fi analytics",
    "Student records migration", "Managed support renewal", "Warehouse scanners rollout", "Quality dashboard",
    "Booking engine upgrade", "Billing automation", "Security audit", "Mobile ordering app", "Fleet telematics",
    "Cloud backup plan", "Point of sale upgrade", "Scheduling assistant", "Compliance reporting",
    "Customer portal", "Network refresh", "Payroll integration", "Website rebuild", "Help desk outsourcing",
    "Document management", "Supplier portal", "Energy monitoring", "Visitor check-in kiosks",
    "Reporting workshop", "Annual support contract", "Pricing tool", "Shift planning module",
    "Field service app", "Data cleanup project",
]

NOTE_TEXTS = [
    "Agreed scope for phase one", "Shared the draft timeline", "Board meets on the 20th, decision after",
    "Wants references from a similar client", "Budget confirmed for next quarter", "Asked about data migration",
    "Raised concerns about rollout timing", "Internal champion is pushing for it", "Legal is reviewing the terms",
    "Prefers a fixed price over time and materials",
]
CALL_TEXTS = [
    "Intro call with the team", "Call about budget sign-off", "Walked through the proposal", "Discovery call",
    "Check-in on the pilot", "Call to discuss pricing", "Quick call about next steps", "Demo for the wider team",
]
EMAIL_TEXTS = [
    "Sent pricing for 3-year term", "Sent revised SOW", "Sent case studies", "Followed up on the proposal",
    "Sent meeting notes", "Shared the onboarding plan", "Sent the contract for review", "Replied to security questions",
]
FOLLOW_UP_TEXTS = [
    "Chase signed renewal", "Prep negotiation call", "Demo for clinical leads", "Check in after pilot",
    "Send revised SOW", "Call about budget sign-off", "Send case studies", "Book on-site visit",
    "Confirm start date", "Share updated quote", "Follow up on references", "Ask for decision timeline",
    "Send onboarding pack", "Review contract changes", "Schedule kickoff",
]


@dataclass(frozen=True)
class Volumes:
    organizations: int
    contacts: int
    deals: int
    activities: int  # regular activities (notes, calls, emails), excluding stage changes
    late: int
    upcoming_follow_ups: int
    overdue_follow_ups: int


SAMPLE = Volumes(organizations=25, contacts=120, deals=80, activities=120, late=5, upcoming_follow_ups=10, overdue_follow_ups=5)
SCALE = Volumes(organizations=150, contacts=1000, deals=500, activities=4200, late=20, upcoming_follow_ups=40, overdue_follow_ups=20)


def _iso_dt(d: date, rng: random.Random) -> str:
    minutes = rng.randint(8 * 60 + 30, 17 * 60 + 30)
    return datetime.combine(d, time(minutes // 60, minutes % 60)).isoformat()


def _domain(name: str) -> str:
    base = "".join(ch for ch in name.lower() if ch.isalnum() or ch == " ").split()
    return "".join(w for w in base if w not in {"co", "group", "the", "and"})[:20] + ".example.com"


def _value(rng: random.Random) -> int:
    # Skewed toward smaller deals, $5,000 to $150,000, in steps of $500.
    raw = 5000 + (rng.random() ** 2.2) * 145000
    return int(round(raw / 500) * 500)


def generate(today: date, now: datetime, volumes: Volumes = SAMPLE) -> dict[str, list[dict]]:
    """Build every row in memory. Ids are assigned here so rows can refer to each other."""
    rng = random.Random(SEED)
    fake = Faker("en_US")
    fake.seed_instance(SEED)

    def stamp(d: date) -> dict:
        s = _iso_dt(d, rng)
        return {"created_at": s, "updated_at": s}

    # Organizations
    orgs: list[dict] = []
    for i in range(volumes.organizations):
        if i < len(COMPANIES):
            name, industry = COMPANIES[i]
        else:
            name, industry = f"{fake.last_name()} {rng.choice(['Partners', 'Holdings', 'Services', 'Labs', 'Group'])}", rng.choice(INDUSTRIES)
        orgs.append({
            "id": i + 1, "name": name, "industry": industry, "website": f"https://www.{_domain(name)}",
            "notes": rng.choice(NOTES) or None, **stamp(today - timedelta(days=rng.randint(200, 400))),
        })

    # Contacts: most at organizations, a few with none; all three statuses
    people: list[dict] = []
    no_org = max(4, volumes.contacts // 15)
    for i in range(volumes.contacts):
        first, last = fake.first_name(), fake.last_name()
        org = None if i >= volumes.contacts - no_org else orgs[i % len(orgs)]
        roll = rng.random()
        status = "lead" if roll < 0.4 else "qualified" if roll < 0.65 else "customer"
        domain = _domain(org["name"]) if org else rng.choice(["mailbox.example.com", "inbox.example.com"])
        people.append({
            "id": i + 1, "first_name": first, "last_name": last,
            "email": f"{first.lower()}.{last.lower()}@{domain}".replace("'", ""),
            "phone": f"({rng.randint(201, 989)}) 555-{rng.randint(100, 199):03d}{rng.randint(0, 9)}",
            "job_title": rng.choice(JOB_TITLES), "organization_id": org["id"] if org else None, "status": status,
            **stamp(today - timedelta(days=rng.randint(30, 380))),
        })
    by_org: dict[int, list[dict]] = {}
    for p in people:
        if p["organization_id"]:
            by_org.setdefault(p["organization_id"], []).append(p)

    # Deals: won and lost over the past 12 months, open across the four open stages
    n = volumes.deals
    n_won, n_lost = round(n * 0.28), round(n * 0.17)
    n_open = n - n_won - n_lost
    open_stages = [stages.OPEN_KEYS[i % 4] for i in range(n_open)]
    plan = ["won"] * n_won + ["lost"] * n_lost + open_stages
    rng.shuffle(plan)
    late_left = volumes.late
    no_org_deals = max(2, n // 40)
    start_of_month = today.replace(day=1)
    won_this_month_needed = max(2, n // 40)

    used_names: set[str] = set()

    def deal_name(i: int) -> str:
        """The hand-written names first, then variations of them, never repeating."""
        if i < len(DEAL_NAMES):
            name = DEAL_NAMES[i]
        else:
            base = rng.choice(DEAL_NAMES)
            suffixes = ["phase two", "extension", "pilot", "renewal", "rollout", "phase three", "add-on", "expansion"]
            name = next((f"{base} {sfx}" for sfx in suffixes if f"{base} {sfx}" not in used_names), f"{base} {i}")
        used_names.add(name)
        return name

    deal_rows: list[dict] = []
    stage_changes: list[dict] = []  # (deal row, from, to, date)
    for i, stage in enumerate(plan):
        deal_id = i + 1
        org = None if i < no_org_deals else orgs[rng.randrange(len(orgs))]
        candidates = by_org.get(org["id"], []) if org else []
        contact = rng.choice(candidates) if candidates else rng.choice(people)
        value = _value(rng)

        if stage in ("won", "lost"):
            if stage == "won" and won_this_month_needed > 0:
                won_this_month_needed -= 1
                # One draw whatever the date, so the rest of the sequence doesn't shift.
                close = start_of_month + timedelta(days=int(rng.random() * ((today - start_of_month).days + 1)))
            else:
                close = today - timedelta(days=rng.randint(1, 360))
            # Where the deal got to before it closed
            if stage == "won":
                path = ["new", "qualified", "proposal", "negotiation", "won"]
            else:
                dropped_at = rng.choices(["new", "qualified", "proposal", "negotiation"], weights=[3, 3, 3, 2])[0]
                path = stages.FUNNEL_KEYS[: stages.FUNNEL_KEYS.index(dropped_at) + 1] + ["lost"]
            created = close - timedelta(days=rng.randint(20, 100))
            end = close
        else:
            if late_left > 0:
                late_left -= 1
                close = today - timedelta(days=rng.randint(2, 25))
            else:
                close = today + timedelta(days=rng.randint(3, 130))
            path = stages.FUNNEL_KEYS[: stages.FUNNEL_KEYS.index(stage) + 1]
            created = today - timedelta(days=rng.randint(len(path) * 6, 160))
            end = today - timedelta(days=1)

        # A few deals were created straight into a later stage.
        if len(path) > 2 and rng.random() < 0.15:
            path = path[1:]
        created = max(created, today - timedelta(days=364))
        end = max(end, created + timedelta(days=len(path)))

        # Dates of each stage change, spread between created and end (the last change lands on `end`).
        steps = len(path) - 1
        span = (end - created).days
        change_days = sorted(rng.sample(range(1, span + 1), steps)) if steps and span >= steps else list(range(1, steps + 1))
        if steps:
            change_days[-1] = span if stage in ("won", "lost") else change_days[-1]
        probability = stages.default_probability(stage)
        if stage in stages.OPEN_KEYS and rng.random() < 0.06:
            probability = min(95, probability + rng.choice([5, 10, 15]))

        row = {
            "id": deal_id, "name": deal_name(i),
            "organization_id": org["id"] if org else None, "contact_id": contact["id"], "stage": stage,
            "value": value, "probability": probability, "close_date": close.isoformat(), "position": 0,
            **stamp(created),
        }
        deal_rows.append(row)
        for k in range(steps):
            stage_changes.append({"deal": row, "from": path[k], "to": path[k + 1], "on": created + timedelta(days=change_days[k])})

    # Positions: open columns by close date, closed columns most recent first
    for key in stages.KEYS:
        column = [d for d in deal_rows if d["stage"] == key]
        column.sort(key=lambda d: d["close_date"], reverse=key in stages.CLOSED_KEYS)
        for pos, d in enumerate(column):
            d["position"] = pos

    # Activities
    acts: list[dict] = []

    def add_activity(**fields) -> dict:
        row = {"id": len(acts) + 1, "contact_id": None, "deal_id": None, "from_stage": None, "to_stage": None,
               "follow_up_date": None, "done": False, **fields}
        row.setdefault("created_at", row["occurred_at"])
        row.setdefault("updated_at", row["occurred_at"])
        acts.append(row)
        return row

    for sc in stage_changes:
        on = min(sc["on"], today)
        occurred = _iso_dt(on, rng)
        if occurred > now.isoformat():
            occurred = (now - timedelta(minutes=rng.randint(5, 120))).isoformat()
        add_activity(kind="stage_change", deal_id=sc["deal"]["id"], from_stage=sc["from"], to_stage=sc["to"],
                     description=f"Moved from {stages.label(sc['from'])} to {stages.label(sc['to'])}", occurred_at=occurred)

    texts = {"note": NOTE_TEXTS, "call": CALL_TEXTS, "email": EMAIL_TEXTS}
    open_deals = [d for d in deal_rows if d["stage"] in stages.OPEN_KEYS]
    follow_ups = ["upcoming"] * volumes.upcoming_follow_ups + ["overdue"] * volumes.overdue_follow_ups
    for k in range(volumes.activities):
        kind = rng.choices(["note", "call", "email"], weights=[3, 4, 4])[0]
        on_deal = rng.random() < 0.45
        fu_kind = follow_ups[k] if k < len(follow_ups) else None
        if fu_kind:
            # Open follow-ups sit on recent activities.
            occurred_day = today - timedelta(days=rng.randint(1, 10) if fu_kind == "upcoming" else rng.randint(14, 30))
            if fu_kind == "upcoming":
                # One due today, the rest over the next two weeks.
                due = today if k == 0 else today + timedelta(days=1 + (k * 13) // max(1, volumes.upcoming_follow_ups))
            else:
                due = today - timedelta(days=rng.randint(1, 12))
            target = rng.choice(open_deals) if on_deal and open_deals else None
            description = rng.choice(FOLLOW_UP_TEXTS)
            done = False
        else:
            occurred_day = today - timedelta(days=rng.randint(0, 360))
            target = rng.choice(deal_rows) if on_deal else None
            description = rng.choice(texts[kind])
            due, done = None, False
            # Some older activities had follow-ups that were done.
            if rng.random() < 0.15 and occurred_day < today - timedelta(days=7):
                due, done = occurred_day + timedelta(days=rng.randint(2, 7)), True
        occurred = _iso_dt(occurred_day, rng)
        if occurred > now.isoformat():
            occurred = (now - timedelta(minutes=rng.randint(5, 240))).replace(microsecond=0).isoformat()
        fields = {"deal_id": target["id"]} if target else {"contact_id": rng.choice(people)["id"]}
        add_activity(kind=kind, description=description, occurred_at=occurred,
                     follow_up_date=due.isoformat() if due else None, done=done, **fields)

    return {"organizations": orgs, "contacts": people, "deals": deal_rows, "activities": acts}


def reset(engine: Engine | None = None, volumes: Volumes = SAMPLE) -> dict[str, int]:
    """Delete every row and insert the sample data, in one transaction.

    It doesn't delete the file, so it works while the app is running.
    """
    engine = engine or db.get_engine()
    db.create_all(engine)
    data = generate(clock.today(), clock.now(), volumes)
    with engine.begin() as conn:
        _replace_all(conn, data)
    return {k: len(v) for k, v in data.items()}


def _replace_all(conn: Connection, data: dict[str, list[dict]]) -> None:
    for table in (activities, deals, contacts, organizations):
        conn.execute(delete(table))
    for table in (organizations, contacts, deals, activities):
        rows = data[table.name]
        for start in range(0, len(rows), 500):
            conn.execute(insert(table), rows[start : start + 500])


def main() -> None:
    parser = argparse.ArgumentParser(description="Reset the database to the sample data.")
    parser.add_argument("--scale", action="store_true", help="1,000 contacts, 500 deals and 5,000 activities")
    args = parser.parse_args()
    from backend.app.core import settings

    counts = reset(volumes=SCALE if args.scale else SAMPLE)
    print(f"Reset {settings.db_path()}")
    print(", ".join(f"{v} {k}" for k, v in counts.items()))


if __name__ == "__main__":
    main()
