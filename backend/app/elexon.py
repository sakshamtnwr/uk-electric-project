"""Small client for the Elexon BMRS datasets used in this assessment."""

from __future__ import annotations

from datetime import date, datetime, time, timezone
from typing import Any
from zoneinfo import ZoneInfo

import httpx

from .config import ELEXON_API_BASE, REQUEST_TIMEOUT_SECONDS, SYSTEM_ZONE

UK = ZoneInfo(SYSTEM_ZONE)


class ElexonAPIError(RuntimeError):
    """Raised when Elexon cannot provide a usable dataset response."""


def to_utc_iso(value: datetime) -> str:
    """Return an aware datetime as a compact UTC ISO string accepted by BMRS."""
    if value.tzinfo is None:
        value = value.replace(tzinfo=UK)
    return value.astimezone(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def decision_window(decision_date: date, cutoff_time: time) -> tuple[str, str, datetime]:
    """Return publication query bounds and the cutoff instant for a UK decision date."""
    start_local = datetime.combine(decision_date, time.min, tzinfo=UK)
    cutoff_local = datetime.combine(decision_date, cutoff_time, tzinfo=UK)
    return to_utc_iso(start_local), to_utc_iso(cutoff_local), cutoff_local.astimezone(timezone.utc)


def _extract_records(payload: Any, dataset: str) -> list[dict[str, Any]]:
    """Accept the usual stream list and a wrapped {data: [...]} response."""
    if isinstance(payload, dict) and isinstance(payload.get("data"), list):
        payload = payload["data"]
    if not isinstance(payload, list):
        raise ElexonAPIError(f"Elexon {dataset} response was not a JSON list.")
    return [item for item in payload if isinstance(item, dict)]


async def _get_records(
    client: httpx.AsyncClient,
    dataset: str,
    params: dict[str, str],
) -> list[dict[str, Any]]:
    url = f"{ELEXON_API_BASE}/datasets/{dataset}/stream"
    try:
        response = await client.get(url, params=params, timeout=REQUEST_TIMEOUT_SECONDS)
        response.raise_for_status()
        payload = response.json()
    except httpx.TimeoutException as exc:
        raise ElexonAPIError(f"Elexon {dataset} request timed out.") from exc
    except httpx.HTTPStatusError as exc:
        code = exc.response.status_code
        raise ElexonAPIError(f"Elexon {dataset} returned HTTP {code}.") from exc
    except httpx.RequestError as exc:
        raise ElexonAPIError(f"Could not reach the Elexon {dataset} endpoint.") from exc
    except ValueError as exc:
        raise ElexonAPIError(f"Elexon {dataset} returned invalid JSON.") from exc

    return _extract_records(payload, dataset)


async def fetch_actuals(
    client: httpx.AsyncClient,
    delivery_date: date,
) -> list[dict[str, Any]]:
    """Fetch national WIND half-hourly outturn for one delivery day."""
    return await _get_records(
        client,
        "FUELHH",
        {
            "settlementDateFrom": delivery_date.isoformat(),
            "settlementDateTo": delivery_date.isoformat(),
            "fuelType": "WIND",
        },
    )


async def fetch_forecasts(
    client: httpx.AsyncClient,
    decision_date: date,
    cutoff_time: time,
) -> tuple[list[dict[str, Any]], datetime]:
    """Fetch WINDFOR records published during the decision day up to its cutoff."""
    start_iso, cutoff_iso, cutoff_utc = decision_window(decision_date, cutoff_time)
    records = await _get_records(
        client,
        "WINDFOR",
        {
            "publishDateTimeFrom": start_iso,
            "publishDateTimeTo": cutoff_iso,
        },
    )
    return records, cutoff_utc
