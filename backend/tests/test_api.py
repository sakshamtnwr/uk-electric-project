from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_analysis_rejects_dates_outside_january_2026_before_network_call():
    response = client.get(
        "/api/v1/analysis",
        params={"decision_date": "2026-02-01", "cutoff_time": "12:00"},
    )
    assert response.status_code == 422
    assert "January 2026" in response.json()["detail"]


def test_analysis_rejects_invalid_cutoff():
    response = client.get(
        "/api/v1/analysis",
        params={"decision_date": "2026-01-15", "cutoff_time": "25:90"},
    )
    assert response.status_code == 422
