"""Errors the services raise, and how they reach the client.

Validation problems are 422s with one plain message per field:
    {"detail": "Some fields need attention", "errors": {"email": "Enter a valid email address"}}
"""

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


class NotFound(Exception):
    def __init__(self, what: str):
        super().__init__(f"{what} not found")
        self.message = f"{what} not found"


class FieldError(Exception):
    def __init__(self, errors: dict[str, str]):
        super().__init__(str(errors))
        self.errors = errors


class Refused(Exception):
    """A request that breaks a rule, such as editing a stage-change entry."""

    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


_PLAIN = {
    "missing": "Required",
    "string_too_short": "Required",
    "int_parsing": "Enter a whole number",
    "int_from_float": "Enter a whole number",
    "int_type": "Enter a whole number",
    "greater_than_equal": "Must be {ge} or more",
    "less_than_equal": "Must be {le} or less",
    "date_from_datetime_parsing": "Enter a date",
    "date_parsing": "Enter a date",
    "date_type": "Enter a date",
    "datetime_parsing": "Enter a date and time",
    "datetime_from_date_parsing": "Enter a date and time",
    "literal_error": "Choose one of the options",
    "enum": "Choose one of the options",
}


def _message(err: dict) -> str:
    kind = err.get("type", "")
    if kind == "value_error":
        return str(err.get("ctx", {}).get("error", err["msg"]))
    template = _PLAIN.get(kind)
    if template:
        try:
            return template.format(**err.get("ctx", {}))
        except (KeyError, IndexError):
            return template
    return err.get("msg", "Invalid value")


def _validation_response(errors: dict[str, str]) -> JSONResponse:
    return JSONResponse(status_code=422, content={"detail": "Some fields need attention", "errors": errors})


def install(app: FastAPI) -> None:
    @app.exception_handler(RequestValidationError)
    async def _on_validation(_req: Request, exc: RequestValidationError):
        errors: dict[str, str] = {}
        for err in exc.errors():
            loc = [str(p) for p in err.get("loc", []) if p not in ("body", "query", "path")]
            field = loc[-1] if loc else "form"
            errors.setdefault(field, _message(err))
        return _validation_response(errors)

    @app.exception_handler(FieldError)
    async def _on_field(_req: Request, exc: FieldError):
        return _validation_response(exc.errors)

    @app.exception_handler(NotFound)
    async def _on_not_found(_req: Request, exc: NotFound):
        return JSONResponse(status_code=404, content={"detail": exc.message})

    @app.exception_handler(Refused)
    async def _on_refused(_req: Request, exc: Refused):
        return JSONResponse(status_code=409, content={"detail": exc.message})
