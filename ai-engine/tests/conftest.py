"""Pytest fixtures for CareOps AI Engine test suite."""

import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

# Ensure ai-engine directory is at the front of sys.path
ai_engine_dir = Path(__file__).resolve().parent.parent
if str(ai_engine_dir) not in sys.path:
    sys.path.insert(0, str(ai_engine_dir))

from app.main import app  # noqa: E402


@pytest.fixture
def client() -> TestClient:
    """FastAPI TestClient fixture."""
    return TestClient(app)
