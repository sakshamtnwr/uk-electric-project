"""Transform Elexon records into hourly comparisons and accuracy metrics."""

from __future__ import annotations

import math
from collections import defaultdict
from datetime import date, datetime, time, timedelta, timezone
from typing import Any
from zoneinfo import ZoneInfo

from .config import SYSTEM_ZONE

UK = ZoneInfo(SYSTEM_ZONE)
UTC = timezone.utc
EXPECTED_HOURS = 24


def parse_timestamp(value: Any) -> datetime | None:
    """Parse Elexon ISO timestamps; treat naive values as UTC rather than local time."""
    if not isinstance(value, str) or not value.strip():
        return None
    try:
        parsed = datetime.fromisoformat(value.strip().replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=UTC)
    return parsed.astimezone(UTC)


def finite_number(value: Any) -> float | None:
    """Parse finite numeric fields safely; null, invalid and infinite values stay missing."""
    if value is None or isinstance(value, bool):
        return None
    try:
        result = float(value)
    except (TypeError, ValueError):
        return None
    return result if math.isfinite(result) else None


def _hour_key(timestamp: datetime) -> datetime:
    local = timestamp.astimezone(UK)
    return local.replace(minute=0, second=0, microsecond=0)


def _interval_key(timestamp: datetime) -> datetime:
    return timestamp.astimezone(UTC).replace(second=0, microsecond=0)


def _latest_by_start_time(records: list[dict[str, Any]]) -> dict[datetime, dict[str, Any]]:
    """Deduplicate records for the same target interval, retaining the latest revision."""
    latest: dict[datetime, dict[str, Any]] = {}
    latest_publish: dict[datetime, datetime] = {}
    for record in records:
        target = parse_timestamp(record.get("startTime"))
        if target is None:
            continue
        key = _interval_key(target)
        published = parse_timestamp(record.get("publishTime")) or datetime.min.replace(tzinfo=UTC)
        if key not in latest or published >= latest_publish[key]:
            latest[key] = record
            latest_publish[key] = published
    return latest


def aggregate_actuals_hourly(
    raw_actuals: list[dict[str, Any]], delivery_date: date
) -> dict[datetime, float]:
    """Average the two valid half-hourly MW outturn readings per hour.

    An hour is left missing unless both expected half-hour settlement readings exist.
    This avoids quietly presenting a single half-hour reading as a full-hour average.
    """
    latest = _latest_by_start_time(raw_actuals)
    values_by_hour: dict[datetime, dict[datetime, float]] = defaultdict(dict)
    for interval_start, record in latest.items():
        local = interval_start.astimezone(UK)
        if local.date() != delivery_date:
            continue
        value = finite_number(record.get("generation"))
        if value is None:
            continue
        hour = _hour_key(interval_start)
        values_by_hour[hour][interval_start] = value

    result: dict[datetime, float] = {}
    for hour, interval_values in values_by_hour.items():
        # For the dashboard's January 2026 scope, each UK delivery hour has two
        # half-hour periods. The two keys must be :00 and :30 respectively.
        expected_starts = {
            hour.astimezone(UTC).replace(minute=0, second=0, microsecond=0),
            hour.astimezone(UTC).replace(minute=30, second=0, microsecond=0),
        }
        if expected_starts.issubset(interval_values.keys()):
            result[hour] = sum(interval_values[key] for key in expected_starts) / 2
    return result


def select_forecasts_hourly(
    raw_forecasts: list[dict[str, Any]],
    delivery_date: date,
    cutoff_utc: datetime,
) -> tuple[dict[datetime, float], dict[datetime, datetime]]:
    """Select eligible forecast revisions, then normalize them to hourly MW values.

    WINDFOR records are a history of publication batches. For every exact target
    interval, select the newest record published no later than the decision cutoff.
    Current sampled WINDFOR data is hourly; the aggregation also handles two
    half-hourly forecast targets should a source sample use that cadence.
    """
    eligible: list[dict[str, Any]] = []
    for record in raw_forecasts:
        target = parse_timestamp(record.get("startTime"))
        published = parse_timestamp(record.get("publishTime"))
        if target is None or published is None or published > cutoff_utc:
            continue
        if target.astimezone(UK).date() == delivery_date:
            eligible.append(record)

    latest = _latest_by_start_time(eligible)
    selected_values: dict[datetime, float] = {}
    selected_publish: dict[datetime, datetime] = {}
    for interval_start, record in latest.items():
        value = finite_number(record.get("generation"))
        published = parse_timestamp(record.get("publishTime"))
        if value is None or published is None or published > cutoff_utc:
            continue
        selected_values[interval_start] = value
        selected_publish[interval_start] = published

    interval_minutes = {timestamp.astimezone(UK).minute for timestamp in selected_values}
    half_hourly = 30 in interval_minutes
    by_hour: dict[datetime, list[tuple[datetime, float, datetime]]] = defaultdict(list)
    for interval_start, value in selected_values.items():
        hour = _hour_key(interval_start)
        by_hour[hour].append((interval_start, value, selected_publish[interval_start]))

    hourly: dict[datetime, float] = {}
    publish_times: dict[datetime, datetime] = {}
    for hour, points in by_hour.items():
        if half_hourly:
            values_by_start = {point[0]: point for point in points}
            expected_starts = {
                hour.astimezone(UTC).replace(minute=0, second=0, microsecond=0),
                hour.astimezone(UTC).replace(minute=30, second=0, microsecond=0),
            }
            if not expected_starts.issubset(values_by_start.keys()):
                continue
            chosen = [values_by_start[key] for key in expected_starts]
        else:
            chosen = points
        hourly[hour] = sum(point[1] for point in chosen) / len(chosen)
        publish_times[hour] = max(point[2] for point in chosen)

    return hourly, publish_times


def _round_or_none(value: float | None, digits: int = 1) -> float | None:
    return None if value is None else round(value, digits)


def calculate_metrics(records: list[dict[str, Any]]) -> dict[str, Any]:
    matched = [r for r in records if r["forecastMW"] is not None and r["actualMW"] is not None]
    expected = EXPECTED_HOURS
    count = len(matched)
    errors = [float(r["forecastMW"]) - float(r["actualMW"]) for r in matched]

    if not matched:
        mae = rmse = bias = None
    else:
        mae = sum(abs(error) for error in errors) / count
        rmse = math.sqrt(sum(error * error for error in errors) / count)
        bias = sum(errors) / count

    actual_values = [r["actualMW"] for r in records if r["actualMW"] is not None]
    forecast_values = [r["forecastMW"] for r in records if r["forecastMW"] is not None]
    positive_errors = [error for error in errors if error > 0]
    negative_errors = [abs(error) for error in errors if error < 0]

    return {
        "mae": _round_or_none(mae),
        "rmse": _round_or_none(rmse),
        "meanBias": _round_or_none(bias),
        "completeness": round((count / expected) * 100, 1),
        "matchedRecordsCount": count,
        "totalExpectedRecords": expected,
        "missingRecordsCount": max(0, expected - count),
        "peakActualMW": _round_or_none(max(actual_values), 1) if actual_values else None,
        "peakForecastMW": _round_or_none(max(forecast_values), 1) if forecast_values else None,
        "maxOverforecastMW": _round_or_none(max(positive_errors), 1) if positive_errors else None,
        "maxUnderforecastMW": _round_or_none(max(negative_errors), 1) if negative_errors else None,
    }


def build_analysis(
    decision_date: date,
    cutoff_time: time,
    raw_actuals: list[dict[str, Any]],
    raw_forecasts: list[dict[str, Any]],
    cutoff_utc: datetime,
    generated_at: datetime | None = None,
) -> dict[str, Any]:
    """Return an AnalysisResponse-compatible object for the React dashboard."""
    delivery_date = decision_date + timedelta(days=1)
    actual_by_hour = aggregate_actuals_hourly(raw_actuals, delivery_date)
    forecast_by_hour, publish_by_hour = select_forecasts_hourly(
        raw_forecasts, delivery_date, cutoff_utc
    )

    # If neither source returned usable rows, preserve the frontend's empty state.
    if not raw_actuals and not raw_forecasts:
        return {
            "deliveryDate": delivery_date.isoformat(),
            "cutoffTime": cutoff_time.strftime("%H:%M"),
            "scenario": "standard",
            "status": "empty",
            "records": [],
            "metrics": calculate_metrics([]),
            "metadata": _metadata(generated_at, empty=True),
        }

    rows: list[dict[str, Any]] = []
    for hour_index in range(EXPECTED_HOURS):
        local_hour = datetime.combine(delivery_date, time(hour_index), tzinfo=UK)
        actual = actual_by_hour.get(local_hour)
        forecast = forecast_by_hour.get(local_hour)
        error = None if actual is None or forecast is None else round(forecast - actual, 2)
        publication = publish_by_hour.get(local_hour)
        # Frontend table labels the two half-hour settlement periods per hour.
        rows.append(
            {
                "startTime": local_hour.astimezone(UTC).isoformat(timespec="seconds").replace("+00:00", "Z"),
                "hourLabel": local_hour.strftime("%H:%M"),
                "forecastMW": _round_or_none(forecast, 2),
                "actualMW": _round_or_none(actual, 2),
                "publishTime": publication.isoformat(timespec="seconds").replace("+00:00", "Z") if publication else None,
                "errorMW": error,
                "settlementPeriod": (hour_index * 2) + 1,
            }
        )

    metrics = calculate_metrics(rows)
    any_measurement = any(r["forecastMW"] is not None or r["actualMW"] is not None for r in rows)
    status = "success" if metrics["matchedRecordsCount"] == EXPECTED_HOURS else ("partial" if any_measurement else "empty")
    response_rows = rows if any_measurement else []
    if not any_measurement:
        metrics = calculate_metrics([])

    return {
        "deliveryDate": delivery_date.isoformat(),
        "cutoffTime": cutoff_time.strftime("%H:%M"),
        "scenario": "standard",
        "status": status,
        "records": response_rows,
        "metrics": metrics,
        "metadata": _metadata(generated_at, empty=not any_measurement),
    }


def _metadata(generated_at: datetime | None, empty: bool) -> dict[str, Any]:
    current = generated_at or datetime.now(UTC)
    notes = (
        "No usable data was returned for the selected delivery day."
        if empty
        else (
            "Decision date is in January 2026; delivery is the following calendar day. "
            "Forecasts published after the configured cutoff are excluded. "
            "Actual half-hourly MW values are averaged to hourly MW only when both "
            "half-hour periods are present. Forecast records are matched by target time; "
            "the latest eligible publication for each target interval is used. "
            "The 12:00 default is a demo assumption, not a confirmed client requirement."
        )
    )
    return {
        "targetFuel": "WIND",
        "systemZone": SYSTEM_ZONE,
        "sourceActuals": "Elexon BMRS FUELHH stream",
        "sourceForecast": "Elexon BMRS WINDFOR stream",
        "generatedAt": current.astimezone(UTC).isoformat(timespec="seconds").replace("+00:00", "Z"),
        "isDemoData": False,
        "notes": notes,
    }
