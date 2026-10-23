"""Automated tests for Phase 2 Audio Transcription Engine.

Covers:
1. Health endpoint stability
2. Missing audio file rejection
3. Empty audio upload rejection
4. Unsupported audio format rejection
5. Oversized upload rejection
6. Unsupported language hint rejection
7. Corrupted audio detection & safe error handling
8. Successful transcription response schema validation (using mock model injection)
9. Temporary audio file lifecycle and guaranteed cleanup
10. Model initialization failure handling
11. Real-model transcription integration test
"""

import io
import math
import os
import struct
import sys
import wave
from pathlib import Path
from typing import Any, List, NamedTuple
from unittest.mock import MagicMock, patch

# Ensure ai-engine root directory is in sys.path
ai_engine_dir = Path(__file__).resolve().parent.parent
if str(ai_engine_dir) not in sys.path:
    sys.path.insert(0, str(ai_engine_dir))

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.services.transcription_service import (
    TranscriptionModelInitError,
    transcription_service,
)

TRANSCRIBE_URL = f"{settings.API_PREFIX}/transcribe"
HEALTH_URL = f"{settings.API_PREFIX}/health"


# ============================================================================
# Audio Generation Fixtures & Helpers
# ============================================================================

def create_synthetic_wav(duration_seconds: float = 1.0, sample_rate: int = 16000) -> bytes:
    """Generate a valid, decodable 16kHz mono PCM WAV file in memory."""
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)  # Mono
        wf.setsampwidth(2)  # 16-bit
        wf.setframerate(sample_rate)
        num_samples = int(duration_seconds * sample_rate)
        # Generate a clean 440Hz sine wave
        samples = [
            int(32767.0 * 0.5 * math.sin(2.0 * math.pi * 440.0 * i / sample_rate))
            for i in range(num_samples)
        ]
        raw_data = struct.pack(f"<{len(samples)}h", *samples)
        wf.writeframes(raw_data)
    return buf.getvalue()


class MockSegment(NamedTuple):
    start: float
    end: float
    text: str


class MockTranscriptionInfo(NamedTuple):
    language: str
    language_probability: float
    duration: float


class MockWhisperModel:
    """Mock Faster Whisper model for deterministic unit testing."""

    def __init__(
        self,
        text: str = "Patient Rahul Sharma called regarding post-op fever.",
        language: str = "en",
        language_probability: float = 0.985,
        duration: float = 2.5,
    ) -> None:
        self.text = text
        self.language = language
        self.language_probability = language_probability
        self.duration = duration

    def transcribe(self, audio_path: str, **kwargs: Any) -> Any:
        segments = [
            MockSegment(start=0.0, end=self.duration, text=self.text)
        ]
        info = MockTranscriptionInfo(
            language=kwargs.get("language") or self.language,
            language_probability=self.language_probability,
            duration=self.duration,
        )
        return segments, info


# ============================================================================
# Unit Tests
# ============================================================================

def test_health_check_still_works(client: TestClient) -> None:
    """Requirement: Existing health endpoint still works after adding Phase 2."""
    response = client.get(HEALTH_URL)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == settings.APP_NAME


def test_missing_audio_file_rejected(client: TestClient) -> None:
    """Requirement: Missing audio file is rejected with HTTP 422."""
    response = client.post(TRANSCRIBE_URL)
    assert response.status_code == 422
    data = response.json()
    assert data["error"] == "Validation Error"


def test_empty_upload_rejected(client: TestClient) -> None:
    """Requirement: Empty upload (0 bytes) is rejected with HTTP 400."""
    files = {"file": ("empty.wav", b"", "audio/wav")}
    response = client.post(TRANSCRIBE_URL, files=files)
    assert response.status_code == 400
    data = response.json()
    assert "empty" in data["message"].lower()


def test_unsupported_audio_extension_rejected(client: TestClient) -> None:
    """Requirement: Unsupported extension is rejected with HTTP 400."""
    files = {"file": ("document.pdf", b"fake pdf content", "application/pdf")}
    response = client.post(TRANSCRIBE_URL, files=files)
    assert response.status_code == 400
    data = response.json()
    assert "unsupported audio format" in data["message"].lower()


def test_oversized_upload_rejected(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    """Requirement: Oversized upload (> max size limit) is rejected with HTTP 413."""
    # Temporarily set max upload limit to 1 KB for test
    monkeypatch.setattr(settings, "MAX_AUDIO_UPLOAD_SIZE_MB", 0.001)  # ~1KB

    oversized_data = b"0" * 4096  # 4 KB > 1 KB
    files = {"file": ("oversized.wav", oversized_data, "audio/wav")}
    response = client.post(TRANSCRIBE_URL, files=files)
    assert response.status_code == 413
    data = response.json()
    assert "maximum allowed limit" in data["message"].lower()


def test_unsupported_language_hint_rejected(client: TestClient) -> None:
    """Requirement: Invalid language hint is rejected with HTTP 422."""
    wav_bytes = create_synthetic_wav(0.5)
    files = {"file": ("test.wav", wav_bytes, "audio/wav")}
    data = {"language": "fr"}  # French is unsupported in Phase 2
    response = client.post(TRANSCRIBE_URL, files=files, data=data)
    assert response.status_code == 422
    res_data = response.json()
    assert "unsupported language code" in res_data["message"].lower()


def test_corrupted_audio_handled_safely(client: TestClient) -> None:
    """Requirement: Corrupted or non-audio content named as audio is rejected with HTTP 400."""
    corrupted_bytes = b"RIFF\x00\x00\x00\x00WAVEfmt corrupted fake header content"
    files = {"file": ("corrupted.wav", corrupted_bytes, "audio/wav")}
    response = client.post(TRANSCRIBE_URL, files=files)
    assert response.status_code == 400
    data = response.json()
    assert "corrupted" in data["message"].lower() or "cannot be decoded" in data["message"].lower()


def test_successful_transcription_response_schema(client: TestClient) -> None:
    """Requirement: Successful transcription response has expected schema and values."""
    mock_model = MockWhisperModel(
        text="Patient requests urgent follow-up appointment.",
        language="en",
        language_probability=0.992,
        duration=1.0,
    )
    # Inject mock model for unit test
    original_model = transcription_service._model
    transcription_service.set_model(mock_model)

    try:
        wav_bytes = create_synthetic_wav(1.0)
        files = {"file": ("patient_call.wav", wav_bytes, "audio/wav")}
        data = {"language": "en"}
        response = client.post(TRANSCRIBE_URL, files=files, data=data)

        assert response.status_code == 200
        res = response.json()

        # Validate schema contract
        assert res["success"] is True
        assert res["transcript"] == "Patient requests urgent follow-up appointment."
        assert res["language"] == "en"
        assert res["language_probability"] == 0.992
        assert res["duration_seconds"] == 1.0
        assert isinstance(res["segments"], list)
        assert len(res["segments"]) == 1
        assert res["segments"][0]["text"] == "Patient requests urgent follow-up appointment."
        assert res["segments"][0]["start"] == 0.0
        assert res["segments"][0]["end"] == 1.0
        assert "processing_time_seconds" in res
        assert res["processing_time_seconds"] >= 0.0
    finally:
        transcription_service.set_model(original_model)


def test_temporary_files_are_cleaned_up(client: TestClient) -> None:
    """Requirement: Temporary files created during upload/processing are deleted."""
    mock_model = MockWhisperModel()
    original_model = transcription_service._model
    transcription_service.set_model(mock_model)

    tracked_temp_files: List[str] = []
    original_save = transcription_service.save_and_validate_upload

    async def tracking_save(upload_file: Any, ext: str) -> Any:
        path, size = await original_save(upload_file, ext)
        tracked_temp_files.append(path)
        return path, size

    transcription_service.save_and_validate_upload = tracking_save  # type: ignore

    try:
        wav_bytes = create_synthetic_wav(0.5)
        files = {"file": ("cleanup_test.wav", wav_bytes, "audio/wav")}
        response = client.post(TRANSCRIBE_URL, files=files)
        assert response.status_code == 200

        # Verify that all tracked temporary files no longer exist on disk
        assert len(tracked_temp_files) == 1
        assert not os.path.exists(tracked_temp_files[0]), "Temporary file was not cleaned up!"
    finally:
        transcription_service.save_and_validate_upload = original_save  # type: ignore
        transcription_service.set_model(original_model)


def test_model_initialization_failure_handling(client: TestClient) -> None:
    """Requirement: Model initialization failures are handled safely with HTTP 503."""
    original_model = transcription_service._model
    transcription_service._model = None

    with patch.object(
        transcription_service,
        "get_model",
        side_effect=TranscriptionModelInitError("Model weights could not be loaded."),
    ):
        wav_bytes = create_synthetic_wav(0.5)
        files = {"file": ("init_fail.wav", wav_bytes, "audio/wav")}
        response = client.post(TRANSCRIBE_URL, files=files)
        assert response.status_code == 503
        data = response.json()
        assert "could not be loaded" in data["message"].lower()

    transcription_service.set_model(original_model)


def test_automatic_language_detection(client: TestClient) -> None:
    """Requirement: When no language hint is provided, automatic language detection is used."""
    mock_model = MockWhisperModel(language="hi")
    original_model = transcription_service._model
    transcription_service.set_model(mock_model)

    try:
        wav_bytes = create_synthetic_wav(0.5)
        # Note: no language parameter in form data
        files = {"file": ("hindi_call.wav", wav_bytes, "audio/wav")}
        response = client.post(TRANSCRIBE_URL, files=files)
        assert response.status_code == 200
        data = response.json()
        assert data["language"] == "hi"
    finally:
        transcription_service.set_model(original_model)


# ============================================================================
# Real Model Integration Test
# ============================================================================

def test_real_faster_whisper_transcription_live(client: TestClient) -> None:
    """Integration Test: Transcribe a real synthetic audio file using live Faster Whisper 'tiny' model."""
    from faster_whisper import WhisperModel

    # Use 'tiny' model for fast CPU integration test
    real_model = WhisperModel("tiny", device="cpu", compute_type="int8")
    original_model = transcription_service._model
    transcription_service.set_model(real_model)

    try:
        wav_bytes = create_synthetic_wav(duration_seconds=1.0)
        files = {"file": ("real_audio.wav", wav_bytes, "audio/wav")}
        data = {"language": "en"}
        response = client.post(TRANSCRIBE_URL, files=files, data=data)

        assert response.status_code == 200
        res = response.json()
        assert res["success"] is True
        assert res["language"] == "en"
        assert res["duration_seconds"] is not None
        assert res["processing_time_seconds"] > 0.0
        assert isinstance(res["segments"], list)
    finally:
        transcription_service.set_model(original_model)


if __name__ == "__main__":
    import pytest
    pytest.main([__file__, "-v"])
