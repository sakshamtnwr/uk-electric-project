"""FastAPI application for the UK Wind Forecast Accuracy Dashboard."""

from __future__ import annotations

import asyncio
import time as clock
from datetime import date, datetime, time, timedelta, timezone
from typing import Any

import httpx
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .analysis import build_analysis
from .config import CACHE_TTL_SECONDS, SYSTEM_ZONE, allowed_frontend_origins
from .elexon import ElexonAPIError, fetch_actuals, fetch_forecasts

app = FastAPI(
    title="UK Wind Forecast Accuracy API",
    description=(
        "Compares Elexon national wind generation forecasts available by a configurable "
        "purchase-decision cutoff with actual wind generation for the following delivery day."
    ),
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_frontend_origins(),
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
)

# Small process-local cache to avoid duplicate BMRS calls when a user refreshes quickly.
_cache: dict[str, tuple[float, dict[str, Any]]] = {}
_cache_lock = asyncio.Lock()


class HealthResponse(BaseModel):
    status: str
    service: str


def _parse_cutoff(value: str) -> time:
    try:
        parsed = time.fromisoformat(value)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="cutoff_time must use HH:MM, for example 12:00.") from exc
    if parsed.second or parsed.microsecond or parsed.tzinfo is not None:
        raise HTTPException(status_code=422, detail="cutoff_time must use HH:MM, for example 12:00.")
    return parsed


def _validate_decision_date(value: date) -> None:
    if value.year != 2026 or value.month != 1:
        raise HTTPException(
            status_code=422,
            detail="decision_date must be within January 2026 for this assessment.",
        )


def _cache_key(decision_date: date, cutoff_time: time) -> str:
    return f"{decision_date.isoformat()}|{cutoff_time.strftime('%H:%M')}"


async def _get_cached(key: str) -> dict[str, Any] | None:
    async with _cache_lock:
        entry = _cache.get(key)
        if not entry:
            return None
        expires_at, value = entry
        if expires_at <= clock.monotonic():
            _cache.pop(key, None)
            return None
        return value


async def _put_cache(key: str, value: dict[str, Any]) -> None:
    async with _cache_lock:
        now = clock.monotonic()
        expired = [entry_key for entry_key, (expiry, _) in _cache.items() if expiry <= now]
        for entry_key in expired:
            _cache.pop(entry_key, None)
        # Keep the cache bounded if many different query combinations are requested.
        while len(_cache) >= 128:
            oldest_key = next(iter(_cache))
            _cache.pop(oldest_key, None)
        _cache[key] = (now + max(0, CACHE_TTL_SECONDS), value)


@app.get("/api/v1/health", response_model=HealthResponse, tags=["system"])
async def health() -> HealthResponse:
    return HealthResponse(status="ok", service="uk-wind-forecast-accuracy-api")


@app.get("/api/v1/analysis", tags=["analysis"])
async def get_analysis(
    decision_date: date = Query(
        ...,
        description="Purchase-decision date, restricted to January 2026; delivery is the next calendar day.",
    ),
    cutoff_time: str = Query(
        "12:00",
        description="Latest allowed forecast publication time on the decision date, in Europe/London local time (demo default).",
        pattern=r"^([01]\d|2[0-3]):[0-5]\d$",
    ),
) -> dict[str, Any]:
    _validate_decision_date(decision_date)
    parsed_cutoff = _parse_cutoff(cutoff_time)
    key = _cache_key(decision_date, parsed_cutoff)
    cached = await _get_cached(key)
    if cached is not None:
        # Return a copy, so caller serialization can't mutate the cached nested data.
        return cached.copy()

    delivery_date = decision_date + timedelta(days=1)
    try:
        async with httpx.AsyncClient(headers={"Accept": "application/json"}) as client:
            actual_task = fetch_actuals(client, delivery_date)
            forecast_task = fetch_forecasts(client, decision_date, parsed_cutoff)
            actuals, forecast_result = await asyncio.gather(actual_task, forecast_task)
        forecasts, cutoff_utc = forecast_result
        result = build_analysis(
            decision_date=decision_date,
            cutoff_time=parsed_cutoff,
            raw_actuals=actuals,
            raw_forecasts=forecasts,
            cutoff_utc=cutoff_utc,
        )
    except ElexonAPIError as exc:
        raise HTTPException(
            status_code=502,
            detail=(
                "Could not retrieve the required Elexon data. Please retry shortly. "
                f"(Upstream detail: {exc})"
            ),
        ) from exc

    await _put_cache(key, result)
    return result
