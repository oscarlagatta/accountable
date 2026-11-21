"""Builds the FastAPI app. Each business area's routers are included under /api."""

from contextlib import asynccontextmanager

from fastapi import FastAPI

from backend.app.core import db, errors, settings


def prepare_database() -> None:
    """Create and seed the database if the file doesn't exist; leave an existing one alone."""
    path = settings.db_path()
    is_new = not path.exists()
    engine = db.get_engine(path)
    db.create_all(engine)
    if is_new:
        from backend.app.crm import seed

        seed.reset(engine)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    prepare_database()
    yield


def create_app() -> FastAPI:
    app = FastAPI(title="Accountable", lifespan=lifespan)
    errors.install(app)

    from backend.app.crm import dashboard, pipeline
    from backend.app.crm.activities.router import router as activities_router
    from backend.app.crm.contacts.router import router as contacts_router
    from backend.app.crm.deals.router import router as deals_router
    from backend.app.crm.organizations.router import router as organizations_router

    for router in (
        organizations_router,
        contacts_router,
        deals_router,
        activities_router,
        pipeline.router,
        dashboard.router,
    ):
        app.include_router(router, prefix="/api")

    @app.get("/api/health")
    def health() -> dict:
        return {"ok": True}

    return app


app = create_app()
