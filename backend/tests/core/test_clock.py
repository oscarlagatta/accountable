from datetime import date, datetime

from backend.app.core import clock


def test_uses_local_time():
    """[K9] today() and now() follow the computer's local clock when not fixed."""
    clock.unfreeze()
    before = datetime.now().replace(microsecond=0)
    got = clock.now()
    after = datetime.now()
    assert before <= got <= after
    assert got.tzinfo is None
    assert clock.today() == date.today() or clock.today() == after.date()


def test_tests_can_fix_the_clock():
    """[K9] Tests can fix the clock to any moment, and release it."""
    clock.freeze(datetime(2025, 12, 31, 23, 59, 30))
    assert clock.today() == date(2025, 12, 31)
    assert clock.now() == datetime(2025, 12, 31, 23, 59, 30)
    clock.freeze(date(2026, 1, 1))
    assert clock.today() == date(2026, 1, 1)
    clock.unfreeze()
    assert clock.today() == date.today()
