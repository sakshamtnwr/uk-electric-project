"""Configuration for the FastAPI service."""

import os

ELEXON_API_BASE = os.getenv(
    "ELEXON_API_BASE",
    "https://data.elexon.co.uk/bmrs/api/v1",
).rstrip("/")
REQUEST_TIMEOUT_SECONDS = float(os.getenv("ELEXON_TIMEOUT_SECONDS", "20"))
CACHE_TTL_SECONDS = int(os.getenv("ANALYSIS_CACHE_TTL_SECONDS", "900"))
SYSTEM_ZONE = "Europe/London"


def allowed_frontend_origins() -> list[str]:
    """Read comma-separated origins; keep local Vite origins convenient by default."""
    raw = os.getenv("FRONTEND_ORIGINS", "http://localhost:3000,http://localhost:5173")
    return [origin.strip() for origin in raw.split(",") if origin.strip()]
