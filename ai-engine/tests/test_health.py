import sys
from pathlib import Path

# Ensure ai-engine root directory is in sys.path
ai_engine_dir = Path(__file__).resolve().parent.parent
if str(ai_engine_dir) not in sys.path:
    sys.path.insert(0, str(ai_engine_dir))

from fastapi.testclient import TestClient
from app.core.config import settings


def test_health_check_returns_200(client: TestClient) -> None:
    """Requirement: Health endpoint returns HTTP 200."""
    response = client.get(f"{settings.API_PREFIX}/health")
    assert response.status_code == 200


def test_health_check_response_structure(client: TestClient) -> None:
    """Requirement: Health endpoint returns the expected response structure."""
    response = client.get(f"{settings.API_PREFIX}/health")
    data = response.json()

    assert data["status"] == "ok"
    assert data["service"] == settings.APP_NAME
    assert data["version"] == settings.APP_VERSION
    # Verify expected keys
    assert set(data.keys()) == {"status", "service", "version"}


def test_root_endpoint_returns_200(client: TestClient) -> None:
    """Verify root endpoint returns operational metadata."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "operational"
    assert data["service"] == settings.APP_NAME
    assert "health_check" in data


if __name__ == "__main__":
    import pytest
    pytest.main([__file__, "-v"])

