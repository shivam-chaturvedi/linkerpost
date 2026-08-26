"""Cookie helpers compatible with cross-site (SameSite=None) on Python < 3.14."""

from __future__ import annotations

from fastapi import Response

from app.core.config import Settings


def set_session_cookie(
    response: Response,
    *,
    key: str,
    value: str,
    settings: Settings,
    httponly: bool = True,
) -> None:
    """Set an auth/CSRF cookie; add Partitioned for CHIPS without requiring Python 3.14."""
    kwargs = settings.cookie_kwargs(httponly=httponly)
    partitioned = bool(kwargs.pop("partitioned", False))
    response.set_cookie(key=key, value=value, **kwargs)
    if partitioned:
        ensure_partitioned_attribute(response, cookie_name=key)


def delete_session_cookie(response: Response, *, key: str, settings: Settings) -> None:
    response.delete_cookie(
        key=key,
        httponly=True,
        secure=settings.COOKIE_SECURE or settings.COOKIE_SAMESITE == "none",
        samesite=settings.COOKIE_SAMESITE,
        domain=settings.COOKIE_DOMAIN,
        path="/",
    )
    if settings.COOKIE_SAMESITE == "none":
        # Clearing a CHIPS cookie requires the Partitioned attribute as well.
        ensure_partitioned_attribute(response, cookie_name=key)


def ensure_partitioned_attribute(response: Response, *, cookie_name: str) -> None:
    """Append ``Partitioned`` to the matching Set-Cookie header.

    Starlette's ``set_cookie(..., partitioned=True)`` raises ValueError on Python < 3.14
    (Vercel). Writing the attribute onto the header works on all supported runtimes.
    """
    prefix = f"{cookie_name}=".encode("latin-1")
    raw_headers = response.raw_headers
    for index, (name, value) in enumerate(raw_headers):
        if name != b"set-cookie" or not value.startswith(prefix):
            continue
        if b"partitioned" in value.lower():
            return
        raw_headers[index] = (name, value + b"; Partitioned")
        return
