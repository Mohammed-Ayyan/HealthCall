"""Audio transcription service using Faster Whisper for CareOps AI Engine (Phase 2).

Provides:
- Lazy singleton Faster Whisper model initialization and caching
- Streaming chunk-based file validation (size boundaries, non-empty)
- Audio format verification & container decoding via PyAV
- Language hint validation (en, hi, kn) and automatic detection fallback
- Safe temporary file lifecycle and cleanup
- Structured transcription results with segment timestamps
- Privacy-aware telemetry logging
"""

import logging
import os
import tempfile
import time
from pathlib import Path
from typing import Any, List, Optional, Tuple

import av
from fastapi import UploadFile

from app.core.config import settings
from app.models.schemas import TranscriptionResponse, TranscriptionSegment

# Compatibility wrapper for PyAV versions where metadata_errors was removed
_orig_av_open = av.open


def _safe_av_open(*args: Any, **kwargs: Any) -> Any:
    try:
        return _orig_av_open(*args, **kwargs)
    except TypeError as err:
        if "metadata_errors" in str(err) and "metadata_errors" in kwargs:
            kwargs_copy = dict(kwargs)
            kwargs_copy.pop("metadata_errors", None)
            return _orig_av_open(*args, **kwargs_copy)
        raise


av.open = _safe_av_open

logger = logging.getLogger("careops.transcription")


# ============================================================================
# Service Custom Exceptions
# ============================================================================

class TranscriptionError(Exception):
    """Base exception for transcription pipeline failures."""
    pass


class AudioFileTooLargeError(TranscriptionError):
    """Uploaded audio exceeds configured maximum size boundary."""
    pass


class EmptyAudioFileError(TranscriptionError):
    """Uploaded audio file contains zero bytes."""
    pass


class UnsupportedAudioFormatError(TranscriptionError):
    """Uploaded file extension or format is not supported."""
    pass


class CorruptedAudioError(TranscriptionError):
    """Uploaded audio stream is malformed, truncated, or undecodable."""
    pass


class UnsupportedLanguageError(TranscriptionError):
    """Provided language code is not in the supported language list."""
    pass


class TranscriptionModelInitError(TranscriptionError):
    """Faster Whisper model failed to load or initialize."""
    pass


# ============================================================================
# Transcription Service Implementation
# ============================================================================

class TranscriptionService:
    """Manages audio validation, Faster Whisper lifecycle, and speech-to-text execution."""

    def __init__(self) -> None:
        self._model: Optional[Any] = None

    def get_model(self) -> Any:
        """Lazily initialize or return cached Faster Whisper model instance."""
        if self._model is not None:
            return self._model

        logger.info(
            "Initializing Faster Whisper model: size=%s, device=%s, compute=%s",
            settings.WHISPER_MODEL_SIZE,
            settings.WHISPER_DEVICE,
            settings.WHISPER_COMPUTE_TYPE,
        )
        try:
            from faster_whisper import WhisperModel

            self._model = WhisperModel(
                model_size_or_path=settings.WHISPER_MODEL_SIZE,
                device=settings.WHISPER_DEVICE,
                compute_type=settings.WHISPER_COMPUTE_TYPE,
                download_root=settings.WHISPER_DOWNLOAD_ROOT,
            )
            logger.info("Faster Whisper model initialized successfully.")
            return self._model
        except Exception as exc:
            logger.exception("Failed to initialize Faster Whisper model.")
            raise TranscriptionModelInitError(
                f"Failed to initialize transcription model '{settings.WHISPER_MODEL_SIZE}': {str(exc)}"
            ) from exc

    def set_model(self, model: Any) -> None:
        """Inject a custom or mock model instance (primarily for automated testing)."""
        self._model = model

    def validate_language_hint(self, language: Optional[str]) -> Optional[str]:
        """Validate and normalize language hint against supported codes."""
        if not language:
            return None
        normalized = language.strip().lower()
        if normalized not in settings.SUPPORTED_AUDIO_LANGUAGES:
            supported = ", ".join(settings.SUPPORTED_AUDIO_LANGUAGES)
            raise UnsupportedLanguageError(
                f"Unsupported language code '{language}'. Supported language codes are: {supported}."
            )
        return normalized

    def validate_file_extension(self, filename: Optional[str]) -> str:
        """Verify filename has an allowed audio extension."""
        if not filename:
            raise UnsupportedAudioFormatError("Uploaded file is missing a filename.")

        ext = Path(filename).suffix.lower()
        if ext not in settings.ALLOWED_AUDIO_EXTENSIONS:
            allowed = ", ".join(settings.ALLOWED_AUDIO_EXTENSIONS)
            raise UnsupportedAudioFormatError(
                f"Unsupported audio format '{ext}'. Allowed extensions are: {allowed}."
            )
        return ext

    def verify_audio_content(self, file_path: str) -> float:
        """Verify audio decodability and extract duration using PyAV without full memory load.

        Returns audio duration in seconds.
        """
        try:
            container = av.open(file_path)
            if not container.streams.audio:
                container.close()
                raise CorruptedAudioError("Uploaded file contains no valid audio streams.")

            audio_stream = container.streams.audio[0]
            duration_sec = 0.0
            if container.duration is not None:
                duration_sec = float(container.duration) / float(av.time_base)
            elif audio_stream.duration and audio_stream.time_base:
                duration_sec = float(audio_stream.duration * audio_stream.time_base)

            container.close()
            return round(duration_sec, 2)
        except CorruptedAudioError:
            raise
        except Exception as exc:
            logger.warning("Audio decoding verification failed for %s: %s", Path(file_path).name, str(exc))
            raise CorruptedAudioError("Uploaded audio file is corrupted or cannot be decoded.") from exc

    async def save_and_validate_upload(
        self, upload_file: UploadFile, ext: str
    ) -> Tuple[str, int]:
        """Stream upload into a temporary file while enforcing max upload size boundaries."""
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=ext)
        temp_path = temp_file.name
        total_bytes = 0
        chunk_size = 64 * 1024  # 64 KB chunks

        try:
            while True:
                chunk = await upload_file.read(chunk_size)
                if not chunk:
                    break
                total_bytes += len(chunk)
                if total_bytes > settings.max_upload_size_bytes:
                    temp_file.close()
                    raise AudioFileTooLargeError(
                        f"Uploaded audio exceeds maximum allowed limit of {settings.MAX_AUDIO_UPLOAD_SIZE_MB} MB."
                    )
                temp_file.write(chunk)
            temp_file.close()

            if total_bytes == 0:
                raise EmptyAudioFileError("Uploaded audio file is empty (0 bytes).")

            return temp_path, total_bytes
        except Exception:
            temp_file.close()
            if os.path.exists(temp_path):
                try:
                    os.remove(temp_path)
                except OSError:
                    pass
            raise

    async def transcribe_audio(
        self,
        upload_file: UploadFile,
        language_hint: Optional[str] = None,
    ) -> TranscriptionResponse:
        """End-to-end audio ingestion, validation, and local speech-to-text transcription."""
        start_time = time.perf_counter()

        # 1. Validate extension and language hint
        ext = self.validate_file_extension(upload_file.filename)
        valid_lang = self.validate_language_hint(language_hint)

        # 2. Stream to temporary file with size check
        temp_path, size_bytes = await self.save_and_validate_upload(upload_file, ext)

        try:
            # 3. Verify decodability & extract audio duration
            extracted_duration = self.verify_audio_content(temp_path)

            # 4. Access transcription model
            model = self.get_model()

            # 5. Execute speech recognition
            segments_gen, info = model.transcribe(
                temp_path,
                language=valid_lang,
                beam_size=5,
            )

            # 6. Collect segments and timestamps
            segments: List[TranscriptionSegment] = []
            transcript_parts: List[str] = []

            for idx, seg in enumerate(segments_gen):
                clean_text = seg.text.strip()
                if clean_text:
                    transcript_parts.append(clean_text)
                    segments.append(
                        TranscriptionSegment(
                            id=idx,
                            start=round(seg.start, 2),
                            end=round(seg.end, 2),
                            text=clean_text,
                        )
                    )

            full_transcript = " ".join(transcript_parts).strip()
            detected_lang = getattr(info, "language", valid_lang or "unknown")
            lang_prob = getattr(info, "language_probability", None)
            if lang_prob is not None:
                lang_prob = round(float(lang_prob), 4)

            audio_duration = getattr(info, "duration", extracted_duration)
            if audio_duration is not None:
                audio_duration = round(float(audio_duration), 2)

            processing_time = round(time.perf_counter() - start_time, 2)

            # 7. Privacy-safe telemetry logging (no transcript content logged)
            logger.info(
                "Audio transcription completed: size_bytes=%d, duration=%.2fs, lang=%s, segments=%d, latency=%.2fs",
                size_bytes,
                audio_duration or 0.0,
                detected_lang,
                len(segments),
                processing_time,
            )

            return TranscriptionResponse(
                success=True,
                transcript=full_transcript,
                language=detected_lang,
                language_probability=lang_prob,
                duration_seconds=audio_duration,
                segments=segments,
                processing_time_seconds=processing_time,
            )
        finally:
            # 8. Guaranteed temporary file cleanup
            if os.path.exists(temp_path):
                try:
                    os.remove(temp_path)
                except OSError as err:
                    logger.warning("Failed to remove temporary audio file %s: %s", temp_path, str(err))


# Global service instance
transcription_service = TranscriptionService()
