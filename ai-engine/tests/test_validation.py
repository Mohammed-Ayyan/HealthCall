import sys
from pathlib import Path

# Ensure ai-engine root directory is in sys.path
ai_engine_dir = Path(__file__).resolve().parent.parent
if str(ai_engine_dir) not in sys.path:
    sys.path.insert(0, str(ai_engine_dir))
from fastapi.testclient import TestClient
from app.core.config import settings


VALIDATE_URL = f"{settings.API_PREFIX}/transcript/validate"


def test_valid_transcript_passes_validation(client: TestClient) -> None:
    """Requirement: A valid transcript request passes validation."""
    payload = {
        "transcript": "Patient reported fever and requested follow-up appointment.",
        "language": "en",
    }
    response = client.post(VALIDATE_URL, json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "valid"
    assert data["language"] == "en"
    assert data["character_count"] == len(payload["transcript"])
    assert data["max_allowed_characters"] == settings.MAX_TRANSCRIPT_LENGTH


def test_empty_transcript_is_rejected(client: TestClient) -> None:
    """Requirement: Empty transcript is rejected with HTTP 422."""
    payload = {
        "transcript": "",
        "language": "en",
    }
    response = client.post(VALIDATE_URL, json=payload)
    assert response.status_code == 422
    data = response.json()
    assert data["error"] == "Validation Error"
    assert "transcript" in [d["field"] for d in data.get("details", [])]


def test_whitespace_only_transcript_is_rejected(client: TestClient) -> None:
    """Requirement: Whitespace-only transcript is rejected."""
    payload = {
        "transcript": "     \n\t   ",
        "language": "en",
    }
    response = client.post(VALIDATE_URL, json=payload)
    assert response.status_code == 422
    data = response.json()
    assert data["error"] == "Validation Error"
    messages = [d["message"] for d in data.get("details", [])]
    assert any("whitespace" in m.lower() for m in messages)


def test_unsupported_language_is_rejected(client: TestClient) -> None:
    """Requirement: Unsupported language is rejected with clear validation error."""
    payload = {
        "transcript": "Patient needs medication refill.",
        "language": "fr",
    }
    response = client.post(VALIDATE_URL, json=payload)
    assert response.status_code == 422
    data = response.json()
    assert data["error"] == "Validation Error"
    messages = [d["message"] for d in data.get("details", [])]
    assert any("unsupported language" in m.lower() for m in messages)


def test_oversized_transcript_is_rejected(client: TestClient) -> None:
    """Requirement: Oversized transcript (> max length) is rejected without silent truncation."""
    # Create transcript that exceeds max length (50,000 + 10 chars)
    oversized_text = "a" * (settings.MAX_TRANSCRIPT_LENGTH + 10)
    payload = {
        "transcript": oversized_text,
        "language": "en",
    }
    response = client.post(VALIDATE_URL, json=payload)
    assert response.status_code == 422
    data = response.json()
    assert data["error"] == "Validation Error"
    messages = [d["message"] for d in data.get("details", [])]
    assert any("maximum allowed length" in m.lower() for m in messages)


def test_error_response_structure(client: TestClient) -> None:
    """Requirement: Error responses have the expected standardized structure."""
    payload = {"transcript": ""}  # Intentionally invalid
    response = client.post(VALIDATE_URL, json=payload)
    assert response.status_code == 422
    data = response.json()

    # Verify standard error fields
    assert "error" in data
    assert "message" in data
    assert "details" in data
    assert "status_code" in data
    assert data["status_code"] == 422
    assert isinstance(data["details"], list)
    for detail in data["details"]:
        assert "field" in detail
        assert "message" in detail


def test_supported_language_en_accepted(client: TestClient) -> None:
    """Requirement: English language (en) is accepted."""
    payload = {
        "transcript": "Patient reported fever and requested follow-up appointment.",
        "language": "en",
    }
    response = client.post(VALIDATE_URL, json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["language"] == "en"


def test_supported_language_hi_accepted(client: TestClient) -> None:
    """Requirement: Hindi language (hi) is accepted."""
    payload = {
        "transcript": "मरीज को डॉक्टर से परामर्श की आवश्यकता है।",
        "language": "hi",
    }
    response = client.post(VALIDATE_URL, json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["language"] == "hi"


def test_supported_language_kn_accepted(client: TestClient) -> None:
    """Requirement: Kannada language (kn) is accepted."""
    payload = {
        "transcript": "ರೋಗಿಗೆ ವೈದ್ಯರ ಭೇಟಿಯ ಅಗತ್ಯವಿದೆ.",
        "language": "kn",
    }
    response = client.post(VALIDATE_URL, json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["language"] == "kn"


def test_transcript_whitespace_trimming(client: TestClient) -> None:
    """Requirement: Leading and trailing whitespace is trimmed properly."""
    raw_text = "   Patient needs assistance with insurance claims.   \n"
    payload = {
        "transcript": raw_text,
        "language": "en",
    }
    response = client.post(VALIDATE_URL, json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["character_count"] == len(raw_text.strip())


def test_missing_transcript_field_rejected(client: TestClient) -> None:
    """Requirement: Missing required transcript field is rejected."""
    payload = {"language": "en"}
    response = client.post(VALIDATE_URL, json=payload)
    assert response.status_code == 422
    data = response.json()
    assert data["error"] == "Validation Error"
    fields = [d["field"] for d in data.get("details", [])]
    assert "transcript" in fields


def test_non_string_transcript_rejected(client: TestClient) -> None:
    """Requirement: Non-string transcript is rejected."""
    payload = {"transcript": 12345, "language": "en"}
    response = client.post(VALIDATE_URL, json=payload)
    assert response.status_code == 422
    data = response.json()
    assert data["error"] == "Validation Error"


if __name__ == "__main__":
    # pyrefly: ignore [missing-import]
    import pytest
    pytest.main([__file__, "-v"])

