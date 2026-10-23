"""API route definitions for CareOps AI Engine (Phase 1 Foundation & Phase 2 Audio Transcription)."""

import logging
from typing import Optional
from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from app.core.config import settings
from app.models.schemas import (
    HealthResponse,
    LanguageDetectionRequest,
    LanguageDetectionResponse,
    MaskedEntityItem,
    PrivacyMaskRequest,
    PrivacyMaskResponse,
    TranscriptAnalysisRequest,
    TranscriptAnalysisResponse,
    TranscriptProcessRequest,
    TranscriptProcessingResponse,
    TranscriptValidationResponse,
    TranscriptionResponse,
)
from app.services.intelligence_service import (
    InferenceError,
    InferenceTimeoutError,
    MalformedModelOutputError,
    ModelUnavailableError,
    intelligence_service,
)
from app.services.multilingual_service import detect_language
from app.services.privacy_service import privacy_service
from app.services.transcript_processing_service import (
    TranscriptProcessingError,
    transcript_processing_service,
)
from app.services.transcription_service import (
    AudioFileTooLargeError,
    CorruptedAudioError,
    EmptyAudioFileError,
    TranscriptionModelInitError,
    UnsupportedAudioFormatError,
    UnsupportedLanguageError,
    transcription_service,
)

logger = logging.getLogger("careops.api")

router = APIRouter()


@router.get(
    "/health",
    response_model=HealthResponse,
    status_code=status.HTTP_200_OK,
    summary="Health Check",
    description="Verifies backend application status without claiming AI models are active.",
)
async def health_check() -> HealthResponse:
    """Return operational health status of the AI Engine backend."""
    return HealthResponse(
        status="ok",
        service=settings.APP_NAME,
        version=settings.APP_VERSION,
    )


@router.post(
    "/transcript/validate",
    response_model=TranscriptValidationResponse,
    status_code=status.HTTP_200_OK,
    summary="Validate Transcript Request",
    description="Validates incoming transcript payload against schema constraints without triggering AI analysis.",
)
async def validate_transcript(
    payload: TranscriptProcessRequest,
) -> TranscriptValidationResponse:
    """Validate transcript format, length, and language code for future pipeline stages.

    Note: Privacy-preserving logging records only length and language, not transcript content.
    """
    logger.info(
        "Transcript validation passed: lang=%s, length=%d, call_id=%s",
        payload.language,
        len(payload.transcript),
        payload.call_id or "unspecified",
    )

    return TranscriptValidationResponse(
        status="valid",
        message="Transcript accepted for future processing pipeline.",
        character_count=len(payload.transcript),
        language=payload.language,
        max_allowed_characters=settings.MAX_TRANSCRIPT_LENGTH,
    )


@router.post(
    "/transcribe",
    response_model=TranscriptionResponse,
    status_code=status.HTTP_200_OK,
    summary="Transcribe Healthcare Audio",
    description="Upload a healthcare call audio file (WAV, MP3, M4A, FLAC, OGG) to transcribe locally using Faster Whisper.",
)
async def transcribe_audio_endpoint(
    file: UploadFile = File(..., description="Audio recording file (WAV, MP3, M4A, FLAC, OGG, max 25MB)."),
    language: Optional[str] = Form(
        default=None,
        description="Optional language hint ('en', 'hi', 'kn'). Auto-detected if omitted.",
    ),
) -> TranscriptionResponse:
    """Accept and transcribe an uploaded audio recording with timestamped segments."""
    try:
        return await transcription_service.transcribe_audio(
            upload_file=file,
            language_hint=language,
        )
    except EmptyAudioFileError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except UnsupportedAudioFormatError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except AudioFileTooLargeError as exc:
        raise HTTPException(
            status_code=getattr(status, "HTTP_413_CONTENT_TOO_LARGE", 413),
            detail=str(exc),
        ) from exc
    except CorruptedAudioError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except UnsupportedLanguageError as exc:
        raise HTTPException(
            status_code=getattr(status, "HTTP_422_UNPROCESSABLE_CONTENT", 422),
            detail=str(exc),
        ) from exc
    except TranscriptionModelInitError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        logger.exception("Unexpected error during audio transcription.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during audio transcription.",
        ) from exc


# ============================================================================
# Phase 3: Transcript Processing Engine
# ============================================================================

@router.post(
    "/process-transcript",
    response_model=TranscriptProcessingResponse,
    status_code=status.HTTP_200_OK,
    summary="Process Healthcare Transcript",
    description=(
        "Accepts a raw healthcare call transcript and returns a normalized, "
        "sentence-segmented, and metadata-enriched representation suitable for "
        "downstream AI analysis (Phase 4+). "
        "Does NOT perform intent classification, summarisation, sentiment analysis, "
        "priority classification, action extraction, or PII masking."
    ),
)
async def process_transcript_endpoint(
    payload: TranscriptProcessRequest,
) -> TranscriptProcessingResponse:
    """Normalize and segment a healthcare call transcript.

    The request uses the same schema as the Phase 1 validation endpoint so that
    the Phase 2 transcription result can be forwarded without client-side changes.

    Privacy: only statistical metadata (length, language, sentence count) is
    logged.  The transcript content is never written to application logs.

    Integration with Phase 2::

        # After calling POST /api/v1/transcribe, pass its output here:
        POST /api/v1/process-transcript
        {
            "transcript": "<value of transcription.transcript>",
            "language":   "<value of transcription.language>"
        }
    """
    logger.info(
        "Transcript processing request: lang=%s, length=%d, call_id=%s",
        payload.language,
        len(payload.transcript),
        payload.call_id or "unspecified",
    )

    try:
        return transcript_processing_service.process(
            transcript=payload.transcript,
            language=payload.language,
        )
    except TranscriptProcessingError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        logger.exception("Unexpected error during transcript processing.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during transcript processing.",
        ) from exc


# ============================================================================
# Phase 4: Core AI Intelligence Engine
# ============================================================================

@router.post(
    "/analyze-transcript",
    response_model=TranscriptAnalysisResponse,
    status_code=status.HTTP_200_OK,
    summary="Analyze Healthcare Transcript",
    description=(
        "Analyzes a healthcare call transcript to extract Intent Classification, "
        "Factual Summarization (negation-preserving), Sentiment Classification, "
        "and Operational Priority (with conservative clinical emergency guardrails). "
        "Processed strictly locally with zero external API transmission."
    ),
)
async def analyze_transcript_endpoint(
    payload: TranscriptAnalysisRequest,
) -> TranscriptAnalysisResponse:
    """Analyze a healthcare call transcript using local AI intelligence.

    Privacy: Only statistical metadata (language, length, call_id) is logged.
    The transcript content is never written to application logs to protect PHI.
    """
    logger.info(
        "Transcript analysis request: lang=%s, length=%d, call_id=%s",
        payload.language,
        len(payload.transcript),
        payload.call_id or "unspecified",
    )

    try:
        return intelligence_service.analyze(
            transcript=payload.transcript,
            language=payload.language,
            call_id=payload.call_id,
            mask_pii=payload.mask_pii,
        )
    except ModelUnavailableError as exc:
        logger.error("Local LLM runtime unavailable during transcript analysis: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except InferenceTimeoutError as exc:
        logger.error("Inference timed out during transcript analysis: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail=str(exc),
        ) from exc
    except MalformedModelOutputError as exc:
        logger.error("Malformed LLM output during transcript analysis: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc
    except InferenceError as exc:
        logger.error("Inference error during transcript analysis: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        logger.exception("Unexpected error during transcript intelligence analysis.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during transcript analysis.",
        ) from exc


# ============================================================================
# Phase 7: Multilingual Identification & Privacy / PII Masking
# ============================================================================

@router.post(
    "/detect-language",
    response_model=LanguageDetectionResponse,
    status_code=status.HTTP_200_OK,
    summary="Detect Transcript Language",
    description="Identifies language deterministically across English ('en'), Hindi ('hi'), and Kannada ('kn').",
)
async def detect_language_endpoint(
    payload: LanguageDetectionRequest,
) -> LanguageDetectionResponse:
    """Identify the primary language and script of a healthcare transcript."""
    lang, conf, script = detect_language(payload.transcript)
    logger.info("Language detected: lang=%s, confidence=%.2f, script=%s", lang, conf, script)
    return LanguageDetectionResponse(
        language=lang,
        confidence=conf,
        script=script,
    )


@router.post(
    "/privacy/mask",
    response_model=PrivacyMaskResponse,
    status_code=status.HTTP_200_OK,
    summary="Mask PII in Healthcare Transcript",
    description=(
        "Detects and redacts sensitive personal identifiers (patient names, phone numbers, "
        "emails, MRNs, addresses, government IDs) across English, Hindi, and Kannada. "
        "Preserves original transcript separate from the masked output."
    ),
)
async def privacy_mask_endpoint(
    payload: PrivacyMaskRequest,
) -> PrivacyMaskResponse:
    """Detect and sanitize sensitive PII/PHI in a healthcare transcript."""
    mask_result = privacy_service.mask_pii(
        transcript=payload.transcript,
        language=payload.language,
    )
    entity_items = [
        MaskedEntityItem(
            entity_type=e["entity_type"],
            token=e["token"],
            start_char=e["start_char"],
            end_char=e["end_char"],
        )
        for e in mask_result.entities
    ]
    return PrivacyMaskResponse(
        success=True,
        is_masked=mask_result.is_masked,
        masked_entities_count=mask_result.masked_entities_count,
        detected_entity_types=mask_result.detected_entity_types,
        original_transcript=mask_result.original_transcript,
        masked_transcript=mask_result.masked_transcript,
        entities=entity_items,
    )

