"""The only place the app reads the clock. "Today" is the computer's local date.

Tests fix the clock with `freeze(...)` and release it with `unfreeze()`.
"""

from datetime import date, datetime

_frozen: datetime | None = None


def now() -> datetime:
    """Local date and time, to the second, without a time zone."""
    if _frozen is not None:
        return _frozen
    return datetime.now().replace(microsecond=0)


def today() -> date:
    return now().date()


def freeze(moment: datetime | date) -> None:
    global _frozen
    if not isinstance(moment, datetime):
        moment = datetime(moment.year, moment.month, moment.day, 9, 0)
    _frozen = moment.replace(microsecond=0)


def unfreeze() -> None:
    global _frozen
    _frozen = None
