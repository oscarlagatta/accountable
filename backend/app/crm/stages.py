"""The six pipeline stages: the single source of stage rules. The frontend gets them from the API."""

from dataclasses import asdict, dataclass


@dataclass(frozen=True)
class Stage:
    key: str
    label: str
    probability: int
    open: bool


STAGES: list[Stage] = [
    Stage("new", "New", 5, True),
    Stage("qualified", "Qualified", 20, True),
    Stage("proposal", "Proposal", 40, True),
    Stage("negotiation", "Negotiation", 70, True),
    Stage("won", "Won", 100, False),
    Stage("lost", "Lost", 0, False),
]

BY_KEY: dict[str, Stage] = {s.key: s for s in STAGES}
KEYS: list[str] = [s.key for s in STAGES]
OPEN_KEYS: list[str] = [s.key for s in STAGES if s.open]
CLOSED_KEYS: list[str] = [s.key for s in STAGES if not s.open]
# The funnel runs New to Won; Lost is where deals drop out, not a step.
FUNNEL_KEYS: list[str] = ["new", "qualified", "proposal", "negotiation", "won"]


def label(key: str) -> str:
    return BY_KEY[key].label


def default_probability(key: str) -> int:
    return BY_KEY[key].probability


def is_open(key: str) -> bool:
    return BY_KEY[key].open


def as_dicts() -> list[dict]:
    return [asdict(s) for s in STAGES]
