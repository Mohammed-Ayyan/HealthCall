"""Pydantic schemas and domain models for CareOps AI Engine.

Establishes:
1. Health check response schema
2. Request validation schema for future transcript processing
3. Extensible future response schemas (Summary, Intent, Sentiment, Priority, Actions, Commitments, Privacy)
4. Standard error responses
"""

from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator
from app.core.config import settings


# ============================================================================
# Enums for Future AI Intelligence Processing
# ============================================================================

class SupportedLanguage(str, Enum):
    """Supported transcript language codes."""
    EN = "en"
    HI = "hi"
    KN = "kn"


class CallIntent(str, Enum):
    """Possible clinical and administrative intent categories."""
    APPOINTMENT_REQUEST = "Appointment Request"
    INSURANCE_QUERY = "Insurance Query"
    BILLING_ISSUE = "Billing Issue"
    COMPLAINT = "Complaint"
    MEDICINE_REFILL = "Medicine Refill"
    EMERGENCY_CONCERN = "Emergency Concern"
    GENERAL_INQUIRY = "General Inquiry"
    FOLLOW_UP_REQUEST = "Follow-up Request"
    UNKNOWN = "Unknown"
    UNCERTAIN = "Uncertain"


class CallSentiment(str, Enum):
    """Patient emotional sentiment categories."""
    SATISFIED = "Satisfied"
    NEUTRAL = "Neutral"
    CONFUSED = "Confused"
    FRUSTRATED = "Frustrated"
    ANGRY = "Angry"
    UNCERTAIN = "Uncertain"
    # Frontend alignment aliases
    POSITIVE = "positive"
    CONCERNED = "concerned"


class CallPriority(str, Enum):
    """Call and action urgency levels."""
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    # Lowercase aliases for frontend contract compatibility
    CRITICAL_LOWER = "critical"
    HIGH_LOWER = "high"
    MEDIUM_LOWER = "medium"
    LOW_LOWER = "low"


class DepartmentName(str, Enum):
    """Hospital departments for action routing."""
    RECEPTION = "Reception"
    INSURANCE = "Insurance"
    CUSTOMER_SUPPORT = "Customer Support"
    BILLING = "Billing"
    PHARMACY = "Pharmacy"
    EMERGENCY_TRIAGE = "Emergency Triage"
    CLINICAL_TEAM = "Clinical Team"


# ============================================================================
# Health Check Schema
# ============================================================================

class HealthResponse(BaseModel):
    """Health check status response."""
    status: str = "ok"
    service: str = "careops-ai-engine"
    version: str = "1.0.0"


# ============================================================================
# Request Schemas
# ============================================================================

class TranscriptProcessRequest(BaseModel):
    """Request schema for transcript processing.

    Validates:
    - transcript must be non-empty string
    - rejects whitespace-only transcripts
    - trims leading/trailing whitespace
    - enforces configurable max length without silent truncation
    - supports validated language codes (en, hi, kn)
    - extensible for future metadata
    """
    model_config = ConfigDict(extra="ignore")

    transcript: str = Field(
        ...,
        description="Raw or diarized transcript text from healthcare phone call.",
        examples=["I need to schedule a follow-up appointment with Dr. Thorne."],
    )
    language: str = Field(
        default="en",
        description="ISO language code of the transcript. Initial support: en, hi, kn.",
        examples=["en"],
    )
    # Extensible future fields (optional)
    call_id: Optional[str] = Field(default=None, description="Unique identifier for the call session.")
    patient_mrn: Optional[str] = Field(default=None, description="Patient Medical Record Number if known.")
    audio_url: Optional[str] = Field(default=None, description="Audio source URL for dual-channel validation.")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Auxiliary telephony metadata.")

    @field_validator("transcript", mode="before")
    @classmethod
    def validate_and_strip_transcript(cls, v: Any) -> str:
        if not isinstance(v, str):
            raise ValueError("Transcript must be a string.")
        stripped = v.strip()
        if not stripped:
            raise ValueError("Transcript must not be empty or contain only whitespace.")
        if len(stripped) > settings.MAX_TRANSCRIPT_LENGTH:
            raise ValueError(
                f"Transcript exceeds maximum allowed length of {settings.MAX_TRANSCRIPT_LENGTH} characters "
                f"(received {len(stripped)} characters). Oversized transcripts are rejected without truncation."
            )
        return stripped

    @field_validator("language")
    @classmethod
    def validate_language(cls, v: str) -> str:
        if not isinstance(v, str):
            raise ValueError("Language must be a string.")
        normalized = v.strip().lower()
        if normalized == "auto":
            return "auto"
        if normalized not in settings.ALLOWED_LANGUAGES:
            supported = ", ".join(settings.ALLOWED_LANGUAGES)
            raise ValueError(
                f"Unsupported language code '{v}'. Supported language codes are: {supported}."
            )
        return normalized


class TranscriptValidationResponse(BaseModel):
    """Response confirming successful transcript request validation."""
    status: str = "valid"
    message: str = "Transcript accepted for future processing pipeline."
    character_count: int
    language: str
    max_allowed_characters: int


# ============================================================================
# Phase 7: Multilingual and Privacy Masking Schemas
# ============================================================================

class LanguageDetectionResponse(BaseModel):
    """Response schema for language identification."""
    success: bool = True
    language: str = Field(..., description="Detected ISO language code ('en', 'hi', 'kn').")
    confidence: float = Field(..., description="Detection confidence score (0.0 to 1.0).")
    script: str = Field(..., description="Detected script name ('Latin', 'Devanagari', 'Kannada').")


class PrivacyMaskRequest(BaseModel):
    """Request schema for PII detection and masking."""
    transcript: str = Field(..., description="Input healthcare conversation transcript.")
    language: Optional[str] = Field(default="auto", description="Optional language hint or 'auto'.")


class PrivacyMaskResponse(BaseModel):
    """Structured privacy and PII masking result."""
    success: bool = True
    original_transcript: str = Field(..., description="Unmodified original transcript.")
    masked_transcript: str = Field(..., description="Transcript with sensitive PII replaced with standard tokens.")
    is_masked: bool = Field(..., description="True if any sensitive information was detected and masked.")
    detected_entity_types: List[str] = Field(default_factory=list, description="Unique PII entity categories detected.")
    masked_entities_count: int = Field(default=0, description="Total count of masked entities.")
    entities: List[Dict[str, Any]] = Field(default_factory=list, description="Masked entity spans with offsets.")


# ============================================================================
# Phase 2: Audio Transcription Schemas
# ============================================================================

class TranscriptionSegment(BaseModel):
    """Single segment of transcribed speech with timestamps."""
    id: Optional[int] = None
    start: float = Field(..., description="Start timestamp in seconds.")
    end: float = Field(..., description="End timestamp in seconds.")
    text: str = Field(..., description="Recognized speech segment text.")


class TranscriptionResponse(BaseModel):
    """Structured audio transcription result."""
    success: bool = Field(default=True, description="Indicates whether transcription succeeded.")
    transcript: str = Field(..., description="Full consolidated transcript text.")
    language: str = Field(..., description="Detected or specified ISO language code.")
    language_probability: Optional[float] = Field(
        default=None,
        description="Confidence score for language detection (0.0 to 1.0).",
    )
    duration_seconds: Optional[float] = Field(
        default=None,
        description="Total audio duration in seconds.",
    )
    segments: List[TranscriptionSegment] = Field(
        default_factory=list,
        description="Timestamped diarized or speech segments.",
    )
    processing_time_seconds: float = Field(
        ...,
        description="Total server processing latency in seconds.",
    )


# ============================================================================
# Phase 3: Transcript Processing Engine Schemas
# ============================================================================

class TranscriptSentence(BaseModel):
    """A single sentence extracted from a transcript with traceability metadata.

    Offset convention: ``start_char`` and ``end_char`` are byte-level character
    positions measured against ``normalized_transcript`` (not the original).  They
    are provided to assist future phases when they need to link evidence quotes back
    to the processed text.  Do NOT assume they point into the original transcript.
    """

    index: int = Field(..., description="Zero-based sentence position in the transcript.")
    text: str = Field(..., description="Sentence text as extracted from the normalized transcript.")
    start_char: Optional[int] = Field(
        default=None,
        description="Start character offset in the normalized_transcript string (inclusive).",
    )
    end_char: Optional[int] = Field(
        default=None,
        description="End character offset in the normalized_transcript string (exclusive).",
    )


class TranscriptMetadata(BaseModel):
    """Deterministic, counting-based metadata for a processed transcript.

    Limitations:
    - ``word_count`` uses whitespace splitting and is only accurate for languages that
      separate words with spaces (e.g. English, Hindi with spaces).  For scripts such
      as Kannada, Japanese, or Chinese where words may not be delimited by spaces,
      ``word_count`` is a whitespace-token approximation and may be null or misleading.
    - ``character_count`` is the Unicode code-point length of the *normalized* transcript.
    - ``sentence_count`` reflects the number of segments returned by the segmenter.
    - ``processing_time_seconds`` measures wall-clock time inside the service only.
    """

    character_count: int = Field(..., description="Unicode code-point length of normalized_transcript.")
    word_count: Optional[int] = Field(
        default=None,
        description=(
            "Whitespace-token word count. Approximation only; may be null for "
            "scripts where whitespace does not reliably delimit words."
        ),
    )
    sentence_count: int = Field(..., description="Number of sentences returned by the segmenter.")
    is_empty: bool = Field(default=False, description="True when the normalized transcript contains no text.")
    processing_time_seconds: Optional[float] = Field(
        default=None,
        description="Wall-clock seconds spent inside the processing service.",
    )


class TranscriptProcessingResponse(BaseModel):
    """Structured Phase 3 transcript processing result.

    Contract:
    - ``original_transcript`` is preserved unchanged for evidence traceability.
    - ``normalized_transcript`` is the conservative-normalization output used for
      downstream processing.  It differs from the original only in whitespace.
    - ``sentences`` are segmented from ``normalized_transcript``.
    - Sentence offsets (``start_char`` / ``end_char``) reference ``normalized_transcript``.
    - ``language`` is the caller-supplied language hint validated against supported codes;
      it is NOT independently detected in Phase 3.

    Not implemented in Phase 3 (planned for later phases):
    - Intent classification
    - Summary generation
    - Sentiment analysis
    - Priority classification
    - Action extraction
    - Staff commitment detection
    - Semantic evidence verification
    - Full PII masking
    - Speaker diarization
    """

    success: bool = Field(default=True, description="True when processing completed without errors.")
    language: str = Field(
        ...,
        description=(
            "Caller-supplied and validated language code (en, hi, kn). "
            "This is a language *hint*, not an independently detected language."
        ),
    )
    original_transcript: str = Field(
        ...,
        description="Unmodified input transcript preserved for evidence traceability.",
    )
    normalized_transcript: str = Field(
        ...,
        description="Conservatively normalized transcript (whitespace only; meaning preserved).",
    )
    sentences: List[TranscriptSentence] = Field(
        default_factory=list,
        description="Ordered list of sentences segmented from normalized_transcript.",
    )
    metadata: TranscriptMetadata = Field(
        ...,
        description="Deterministic transcript statistics calculated from actual input.",
    )


# ============================================================================
# Phase 4: Core AI Intelligence Engine Schemas
# ============================================================================

class IntentAnalysisResult(BaseModel):
    """Categorized call intent with supporting evidence quote."""
    label: str = Field(..., description="Primary categorized intent label.")
    evidence: Optional[str] = Field(
        default=None,
        description="Direct snippet or quote from transcript supporting the classified intent.",
    )


class SentimentAnalysisResult(BaseModel):
    """Categorized patient sentiment with rationale."""
    label: str = Field(..., description="Classified patient sentiment label.")
    explanation: Optional[str] = Field(
        default=None,
        description="Concise rationale explaining the sentiment classification.",
    )


class PriorityAnalysisResult(BaseModel):
    """Categorized operational triage priority with rationale."""
    level: str = Field(..., description="Operational triage urgency level: CRITICAL, HIGH, MEDIUM, LOW.")
    reason: str = Field(..., description="Concise rationale explaining the priority level assignment.")


class IntelligenceMetadata(BaseModel):
    """Execution telemetry and safety provenance."""
    model_name: Optional[str] = Field(default=None, description="Underlying inference model identifier.")
    processing_time_seconds: Optional[float] = Field(default=None, description="Inference latency in seconds.")
    emergency_escalated: bool = Field(default=False, description="True if conservative safety rule escalated priority.")


class TranscriptAnalysisRequest(TranscriptProcessRequest):
    """Request payload for Phase 4+ transcript intelligence analysis."""
    mask_pii: bool = Field(default=True, description="Whether to mask PII prior to analysis.")


# ============================================================================
# Action, Commitment, and Privacy Masking Schemas (Phase 5, 6, 7)
# ============================================================================

class AISummaryResponse(BaseModel):
    """Clinical summary extracted from transcript."""
    overview: str
    key_points: List[str] = Field(default_factory=list)
    clinical_flags: List[str] = Field(default_factory=list)
    insurance_pending: bool = False
    confidence_score: float = Field(default=0.0, ge=0.0, le=1.0)


class ActionExtractionResponse(BaseModel):
    """Action item extracted from conversation with grounding evidence."""
    id: str
    task: str
    department: str
    priority: str
    deadline: Optional[str] = None
    evidence_quote: str
    suggested_assignee: Optional[str] = None
    status: Optional[str] = "pending"


class CommitmentResponse(BaseModel):
    """Verbal promise or commitment detected during staff-patient call."""
    id: str
    commitment: str
    owner: Optional[str] = None
    deadline: Optional[str] = None
    timestamp: Optional[str] = None
    status: Optional[str] = "pending"
    evidence_quote: str


class PrivacyMaskingInfo(BaseModel):
    """Redaction and HIPAA/privacy-masking metadata."""
    is_masked: bool = False
    masked_entities_count: int = 0
    detected_entity_types: List[str] = Field(default_factory=list)
    redacted_transcript: Optional[str] = None


class TranscriptAnalysisResponse(BaseModel):
    """Structured Phase 4-7 AI Intelligence analysis response contract."""
    success: bool = Field(default=True, description="True when intelligence analysis completed successfully.")
    language: str = Field(default="en", description="Validated or detected language code of the transcript.")
    intent: IntentAnalysisResult = Field(..., description="Primary classified intent and evidence.")
    summary: str = Field(..., description="Factual concise call summary.")
    sentiment: SentimentAnalysisResult = Field(..., description="Classified patient sentiment and explanation.")
    priority: PriorityAnalysisResult = Field(..., description="Operational triage urgency level and reason.")
    actions: List[ActionExtractionResponse] = Field(default_factory=list, description="Action items extracted from call.")
    commitments: List[CommitmentResponse] = Field(default_factory=list, description="Staff commitments detected in call.")
    privacy_masking: Optional[PrivacyMaskingInfo] = Field(default=None, description="Privacy masking telemetry.")
    original_transcript: Optional[str] = Field(default=None, description="Original unmasked transcript if privacy masking was applied.")
    masked_transcript: Optional[str] = Field(default=None, description="PII-masked transcript representation.")
    metadata: Optional[IntelligenceMetadata] = Field(default=None, description="Execution telemetry and safety metadata.")


class ProcessingMetadata(BaseModel):
    """Execution telemetry and pipeline provenance."""
    processing_time_ms: Optional[float] = None
    model_version: Optional[str] = None
    pipeline_stage: str = "foundation"
    created_at: Optional[str] = None


class AIIntelligenceResponse(BaseModel):
    """Unified AI intelligence contract for downstream frontend integration."""
    call_id: Optional[str] = None
    transcript: str
    detected_language: str
    summary: Optional[AISummaryResponse] = None
    intent: Optional[CallIntent] = None
    secondary_intents: List[CallIntent] = Field(default_factory=list)
    sentiment: Optional[CallSentiment] = None
    sentiment_score: Optional[float] = Field(default=None, ge=-1.0, le=1.0)
    priority: Optional[CallPriority] = None
    actions: List[ActionExtractionResponse] = Field(default_factory=list)
    commitments: List[CommitmentResponse] = Field(default_factory=list)
    privacy_masking: Optional[PrivacyMaskingInfo] = None
    metadata: Optional[ProcessingMetadata] = None
    notes: Optional[str] = "Phase 1 schema definition only - AI model processing deferred to future phases."


class LanguageDetectionRequest(BaseModel):
    """Request payload for language identification."""
    transcript: str = Field(..., min_length=1, max_length=50000, description="Healthcare transcript text.")


class LanguageDetectionResponse(BaseModel):
    """Deterministic language identification response for English, Hindi, and Kannada."""
    language: str = Field(..., description="Detected language code ('en', 'hi', or 'kn').")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Detection confidence score.")
    script: str = Field(..., description="Script classification ('Latin', 'Devanagari', 'Kannada').")


class MaskedEntityItem(BaseModel):
    """Details of a single detected and masked PII entity."""
    entity_type: str = Field(..., description="Entity category (PATIENT_NAME, PHONE_NUMBER, EMAIL, etc.).")
    token: str = Field(..., description="Masking token used, e.g. [PATIENT_NAME].")
    start_char: int = Field(..., description="Start character offset in original text.")
    end_char: int = Field(..., description="End character offset in original text.")


class PrivacyMaskRequest(BaseModel):
    """Request payload for privacy and PII masking."""
    transcript: str = Field(..., min_length=1, max_length=50000, description="Healthcare transcript text.")
    language: Optional[str] = Field(default=None, description="Optional language hint ('en', 'hi', 'kn').")


class PrivacyMaskResponse(BaseModel):
    """Privacy masking result with masked text and redacted entity counts."""
    success: bool = Field(default=True, description="True when masking completed successfully.")
    is_masked: bool = Field(..., description="True if one or more sensitive PII entities were redacted.")
    masked_entities_count: int = Field(..., description="Total count of masked entities.")
    detected_entity_types: List[str] = Field(default_factory=list, description="Unique PII entity categories detected.")
    original_transcript: str = Field(..., description="Original unmasked input transcript.")
    masked_transcript: str = Field(..., description="Sanitized transcript with PII replaced by standardized tokens.")
    entities: List[MaskedEntityItem] = Field(default_factory=list, description="Metadata of detected entity spans.")


# ============================================================================
# Standardized Error Schemas
# ============================================================================

class ErrorDetail(BaseModel):
    """Individual field validation error detail."""
    field: Optional[str] = None
    message: str


class ErrorResponse(BaseModel):
    """Standardized API error response format."""
    error: str
    message: str
    details: Optional[List[ErrorDetail]] = None
    status_code: int
