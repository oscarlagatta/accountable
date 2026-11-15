"""Small building blocks for the areas' Pydantic models."""

import re
from typing import Annotated

from pydantic import AfterValidator, BeforeValidator


def _blank_to_none(v):
    if isinstance(v, str):
        v = v.strip()
        return v or None
    return v


def _strip(v):
    return v.strip() if isinstance(v, str) else v


def _required(v: str) -> str:
    if not v:
        raise ValueError("Required")
    return v


EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
WEBSITE = re.compile(r"^(https?://)?([a-z0-9-]+\.)+[a-z]{2,}(:\d+)?(/\S*)?$", re.IGNORECASE)


def _email(v: str | None) -> str | None:
    if v is not None and not EMAIL.match(v):
        raise ValueError("Enter a valid email address")
    return v


def _website(v: str | None) -> str | None:
    if v is not None and not WEBSITE.match(v):
        raise ValueError("Enter a valid website, such as example.com")
    return v


RequiredText = Annotated[str, BeforeValidator(_strip), AfterValidator(_required)]
OptionalText = Annotated[str | None, BeforeValidator(_blank_to_none)]
OptionalEmail = Annotated[str | None, BeforeValidator(_blank_to_none), AfterValidator(_email)]
OptionalWebsite = Annotated[str | None, BeforeValidator(_blank_to_none), AfterValidator(_website)]
OptionalId = Annotated[int | None, BeforeValidator(_blank_to_none)]
