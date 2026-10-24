from datetime import date, datetime, time, timezone

from app.analysis import aggregate_actuals_hourly, build_analysis, calculate_metrics, select_forecasts_hourly

UTC = timezone.utc


def actual(start: str, generation: float, publish: str | None = None):
    return {
        "startTime": start,
        "publishTime": publish or "2026-01-16T00:00:00Z",
        "generation": generation,
        "fuelType": "WIND",
    }


def forecast(target: str, generation: float, publish: str):
    return {"startTime": target, "publishTime": publish, "generation": generation, "dataset": "WINDFOR"}


def test_actuals_are_hourly_mean_not_sum_and_require_both_half_hours():
    rows = [
        actual("2026-01-16T00:00:00Z", 100),
        actual("2026-01-16T00:30:00Z", 200),
        actual("2026-01-16T01:00:00Z", 300),  # 01:30 missing: don't call this a complete hour
    ]
    out = aggregate_actuals_hourly(rows, date(2026, 1, 16))
    assert out[datetime(2026, 1, 16, 0, tzinfo=UTC)] == 150
    assert datetime(2026, 1, 16, 1, tzinfo=UTC) not in out


def test_latest_forecast_before_cutoff_wins_and_future_publication_is_ignored():
    rows = [
        forecast("2026-01-16T00:00:00Z", 100, "2026-01-15T07:30:00Z"),
        forecast("2026-01-16T00:00:00Z", 120, "2026-01-15T11:30:00Z"),
        forecast("2026-01-16T00:00:00Z", 999, "2026-01-15T15:30:00Z"),
    ]
    hourly, publication = select_forecasts_hourly(
        rows,
        date(2026, 1, 16),
        datetime(2026, 1, 15, 12, 0, tzinfo=UTC),
    )
    hour = datetime(2026, 1, 16, 0, tzinfo=UTC)
    assert hourly[hour] == 120
    assert publication[hour] == datetime(2026, 1, 15, 11, 30, tzinfo=UTC)


def test_metrics_ignore_unmatched_records():
    rows = [
        {"forecastMW": 110.0, "actualMW": 100.0, "errorMW": 10.0},
        {"forecastMW": 80.0, "actualMW": 100.0, "errorMW": -20.0},
        {"forecastMW": None, "actualMW": 100.0, "errorMW": None},
    ]
    metrics = calculate_metrics(rows)
    assert metrics["matchedRecordsCount"] == 2
    assert metrics["mae"] == 15.0
    assert metrics["rmse"] == round((250 ** 0.5), 1)
    assert metrics["meanBias"] == -5.0
    assert metrics["completeness"] == round(2 / 24 * 100, 1)


def test_build_analysis_has_24_rows_and_d_plus_one_delivery_date():
    decision_date = date(2026, 1, 15)
    delivery_date = date(2026, 1, 16)
    actuals = []
    forecasts = []
    for hour in range(24):
        start = f"{delivery_date.isoformat()}T{hour:02d}:00:00Z"
        next_half = f"{delivery_date.isoformat()}T{hour:02d}:30:00Z"
        actuals.extend([actual(start, 1000 + hour), actual(next_half, 1100 + hour)])
        forecasts.append(forecast(start, 1050 + hour, "2026-01-15T11:30:00Z"))
    result = build_analysis(
        decision_date,
        time(12, 0),
        actuals,
        forecasts,
        datetime(2026, 1, 15, 12, 0, tzinfo=UTC),
        generated_at=datetime(2026, 1, 17, tzinfo=UTC),
    )
    assert result["deliveryDate"] == "2026-01-16"
    assert result["status"] == "success"
    assert len(result["records"]) == 24
    assert result["records"][0]["actualMW"] == 1050
    assert result["records"][0]["forecastMW"] == 1050
    assert result["metrics"]["mae"] == 0.0
    assert result["metrics"]["completeness"] == 100.0
