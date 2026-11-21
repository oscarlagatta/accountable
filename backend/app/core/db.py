"""The database engine, the one shared MetaData, and the connection helper for routers."""

from collections.abc import Iterator
from pathlib import Path
from typing import Annotated

from fastapi import Depends
from sqlalchemy import Connection, CursorResult, Engine, MetaData, create_engine, event

from . import settings

metadata = MetaData()

_engines: dict[Path, Engine] = {}


def _on_connect(dbapi_conn, _record) -> None:
    cur = dbapi_conn.cursor()
    cur.execute("PRAGMA foreign_keys=ON")
    cur.execute("PRAGMA journal_mode=WAL")
    cur.execute("PRAGMA busy_timeout=15000")
    cur.close()


def get_engine(path: Path | None = None) -> Engine:
    """The engine for the configured database file (or `path`), made once per file."""
    path = (path or settings.db_path()).resolve()
    engine = _engines.get(path)
    if engine is None:
        engine = create_engine(f"sqlite:///{path}", connect_args={"timeout": 15, "check_same_thread": False})
        event.listen(engine, "connect", _on_connect)
        _engines[path] = engine
    return engine


def dispose_all() -> None:
    for engine in _engines.values():
        engine.dispose()
    _engines.clear()


def create_all(engine: Engine | None = None) -> None:
    # Importing the tables registers them on the shared MetaData.
    from backend.app.crm import tables  # noqa: F401

    metadata.create_all(engine or get_engine())


def get_conn() -> Iterator[Connection]:
    """FastAPI dependency: one connection and one transaction per request."""
    with get_engine().begin() as conn:
        yield conn


DbConn = Annotated[Connection, Depends(get_conn)]
"""Router parameter type for the request's connection."""


def inserted_id(result: CursorResult) -> int:
    """The primary key of the row a single-row insert just added."""
    key = result.inserted_primary_key
    if key is None:
        raise RuntimeError("The insert did not return a primary key")
    return key[0]
