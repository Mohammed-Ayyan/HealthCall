"""Comprehensive automated tests for CareOps AI Engine (Phase 4).

Covers:
1. Valid transcript analysis endpoint (/api/v1/analyze-transcript)
2. Every supported intent category (Appointment Request, Insurance Query, Billing Issue,
   Complaint, Medicine Refill, Emergency Concern, General Inquiry, Follow-up Request, Unknown)
3. Appointment Request vs Follow-up Request distinction
4. Frustrated sentiment vs Complaint intent distinction
5. Summary generation preserving negation
6. Every supported sentiment category (Satisfied, Neutral, Confused, Frustrated, Angry, Uncertain)
7. Every supported priority level (CRITICAL, HIGH, MEDIUM, LOW)
8. Empty transcript rejection (HTTP 422)
9. Whitespace-only transcript rejection (HTTP 422)
10. Unsupported language rejection (HTTP 422)
11. Malformed model output handling (bounded retry and HTTP 502)
12. Markdown-fenced JSON output parsing
13. Invalid / unknown classification labels normalized safely
14. Local model runtime unavailable (HTTP 503)
15. Inference timeout handling (HTTP 504)
16. Uncertain / greeting-only transcript handling (Unknown intent, Neutral sentiment, LOW priority)
17. Conservative emergency safety escalation (chest pain, can't breathe -> CRITICAL)
18. Conservative post-op fever escalation -> HIGH
19. Real Ollama live inference test (verifying actual local LLM execution)
"""

import json
import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app
from app.models.schemas import CallIntent, CallPriority, CallSentiment
from app.services.intelligence_service import (
    EmergencySafetyChecker,
    InferenceTimeoutError,
    IntelligenceService,
    MalformedModelOutputError,
    ModelUnavailableError,
    OllamaClient,
    intelligence_service,
)


# ============================================================================
# Mock LLM Client for Deterministic Unit Tests
# ============================================================================

class MockLLMClient:
    """Mock LLM client to simulate model responses without external network dependencies."""

    def __init__(
        self,
        responses=None,
        exception=None,
        model_name="mock-llama3",
    ):
        self.responses = list(responses) if responses else []
        self.exception = exception
        self.model_name = model_name
        self.call_count = 0
        self.prompts_received = []

    def generate(self, prompt: str, system=None) -> str:
        self.call_count += 1
        self.prompts_received.append(prompt)
        if self.exception:
            raise self.exception
        if self.responses:
            return self.responses.pop(0)
        # Default balanced mock response
        return json.dumps({
            "intent": {
                "label": "Billing Issue",
                "evidence": "I was charged twice.",
            },
            "summary": "Patient reports double billing and requests an investigation.",
            "sentiment": {
                "label": "Neutral",
                "explanation": "Matter-of-fact tone.",
            },
            "priority": {
                "level": "MEDIUM",
                "reason": "Routine billing discrepancy without clinical urgency.",
            },
        })


@pytest.fixture(autouse=True)
def restore_real_llm_client():
    """Ensure the singleton service is restored to OllamaClient after tests."""
    original_client = intelligence_service._llm_client
    yield
    intelligence_service._llm_client = original_client


# ============================================================================
# 1. Valid Transcript Analysis Endpoint Tests
# ============================================================================

def test_analyze_transcript_endpoint_success(client: TestClient):
    """POST /api/v1/analyze-transcript returns structured response conforming to schema."""
    mock_response = json.dumps({
        "intent": {
            "label": "Billing Issue",
            "evidence": "I have been charged twice for my appointment.",
        },
        "summary": "The patient reports a duplicate appointment charge and requests a billing investigation.",
        "sentiment": {
            "label": "Neutral",
            "explanation": "The transcript expresses a billing concern without emotional language.",
        },
        "priority": {
            "level": "MEDIUM",
            "reason": "The patient requests resolution of a billing issue, but no explicit emergency is described.",
        },
    })
    intelligence_service.set_llm_client(MockLLMClient([mock_response]))

    payload = {
        "transcript": "I have been charged twice for my appointment. Please ask billing to investigate.",
        "language": "en",
        "call_id": "call-101",
    }
    response = client.post(f"{settings.API_PREFIX}/analyze-transcript", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert data["success"] is True
    assert data["language"] == "en"
    assert data["intent"]["label"] == "Billing Issue"
    assert "charged twice" in data["intent"]["evidence"]
    assert "duplicate appointment charge" in data["summary"]
    assert data["sentiment"]["label"] == "Neutral"
    assert data["priority"]["level"] == "MEDIUM"
    assert "metadata" in data
    assert data["metadata"]["emergency_escalated"] is False


# ============================================================================
# 2. Intent Classification Categories
# ============================================================================

@pytest.mark.parametrize(
    "intent_label,sample_quote",
    [
        ("Appointment Request", "I'd like to book a new appointment with Dr. Thorne next week."),
        ("Insurance Query", "Does my BlueCross policy cover pre-authorization for an ultrasound?"),
        ("Billing Issue", "My invoice has an extra charge of $150 that I did not authorize."),
        ("Complaint", "The receptionist was extremely rude and kept me waiting for two hours."),
        ("Medicine Refill", "I have run out of my blood pressure medication and need a prescription refill."),
        ("Emergency Concern", "My father is having severe chest pain and cannot catch his breath."),
        ("General Inquiry", "What are the visiting hours for the surgical ward on weekends?"),
        ("Follow-up Request", "I had surgery 5 days ago and need my post-op check-in consultation."),
        ("Unknown", "I am not sure what department I need, someone told me to call here."),
    ],
)
def test_all_supported_intent_categories(client: TestClient, intent_label: str, sample_quote: str):
    """Verify that every supported intent category is correctly classified and validated."""
    mock_payload = json.dumps({
        "intent": {"label": intent_label, "evidence": sample_quote},
        "summary": f"Patient call regarding {intent_label.lower()}.",
        "sentiment": {"label": "Neutral", "explanation": "Standard inquiry."},
        "priority": {"level": "CRITICAL" if "Emergency" in intent_label else "MEDIUM", "reason": "Evaluated urgency."},
    })
    intelligence_service.set_llm_client(MockLLMClient([mock_payload]))

    res = client.post(
        f"{settings.API_PREFIX}/analyze-transcript",
        json={"transcript": sample_quote, "language": "en"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["intent"]["label"] == intent_label


def test_appointment_vs_followup_distinction():
    """Verify distinction: regular new appointment vs post-visit/post-op follow-up."""
    # 1. New appointment
    service = IntelligenceService(
        MockLLMClient([
            json.dumps({
                "intent": {"label": "Appointment Request", "evidence": "I need to schedule a consultation with a cardiologist."},
                "summary": "Patient wants to schedule a cardiologist appointment.",
                "sentiment": {"label": "Neutral", "explanation": "Direct request"},
                "priority": {"level": "MEDIUM", "reason": "Routine appointment scheduling"},
            })
        ])
    )
    res_appt = service.analyze("I need to schedule a consultation with a cardiologist.")
    assert res_appt.intent.label == CallIntent.APPOINTMENT_REQUEST.value

    # 2. Post-op follow-up
    service = IntelligenceService(
        MockLLMClient([
            json.dumps({
                "intent": {"label": "Follow-up Request", "evidence": "I had my surgery last Tuesday and Dr. Smith told me to call for a follow-up."},
                "summary": "Patient calling for post-surgical follow-up as directed by doctor.",
                "sentiment": {"label": "Neutral", "explanation": "Routine follow-up"},
                "priority": {"level": "MEDIUM", "reason": "Post-procedure follow-up"},
            })
        ])
    )
    res_followup = service.analyze("I had my surgery last Tuesday and Dr. Smith told me to call for a follow-up.")
    assert res_followup.intent.label == CallIntent.FOLLOW_UP_REQUEST.value


def test_frustrated_sentiment_vs_complaint_intent():
    """Verify that a frustrated patient calling about a bill has Billing Issue intent, NOT Complaint."""
    service = IntelligenceService(
        MockLLMClient([
            json.dumps({
                "intent": {"label": "Billing Issue", "evidence": "You charged me twice for my MRI and I am very upset."},
                "summary": "Patient is upset regarding a duplicate MRI charge and requests immediate credit.",
                "sentiment": {"label": "Frustrated", "explanation": "Patient expressed strong irritation over duplicate billing."},
                "priority": {"level": "MEDIUM", "reason": "Unresolved financial charge, no clinical emergency."},
            })
        ])
    )
    res = service.analyze("You charged me twice for my MRI and I am very upset. Fix this immediately!")
    assert res.intent.label == CallIntent.BILLING_ISSUE.value
    assert res.sentiment.label == CallSentiment.FRUSTRATED.value


# ============================================================================
# 3. Healthcare Summarization & Negation Preservation
# ============================================================================

def test_summary_preserves_negation():
    """Verify that summarization strictly preserves medical negation ('no fever', 'denies pain')."""
    transcript = "Patient Rahul Sharma called. He has a mild cough but denies chest pain and has no fever."
    mock_summary = "Patient reports mild cough. He has no fever and denies chest pain."

    service = IntelligenceService(
        MockLLMClient([
            json.dumps({
                "intent": {"label": "General Inquiry", "evidence": "mild cough"},
                "summary": mock_summary,
                "sentiment": {"label": "Neutral", "explanation": "Calm report"},
                "priority": {"level": "LOW", "reason": "Mild symptom, denies severe signs"},
            })
        ])
    )
    res = service.analyze(transcript)
    assert "no fever" in res.summary.lower()
    assert "denies chest pain" in res.summary.lower()


# ============================================================================
# 4. Sentiment Classification Categories
# ============================================================================

@pytest.mark.parametrize(
    "sentiment_label",
    ["Satisfied", "Neutral", "Confused", "Frustrated", "Angry", "Uncertain"],
)
def test_all_supported_sentiment_categories(sentiment_label: str):
    """Verify that all sentiment categories are supported and normalized."""
    service = IntelligenceService(
        MockLLMClient([
            json.dumps({
                "intent": {"label": "General Inquiry", "evidence": "Hello"},
                "summary": "General conversation.",
                "sentiment": {"label": sentiment_label, "explanation": f"Patient sounded {sentiment_label.lower()}."},
                "priority": {"level": "LOW", "reason": "Informational"},
            })
        ])
    )
    res = service.analyze("Patient conversation regarding appointment scheduling and hospital directions.")
    assert res.sentiment.label == sentiment_label


# ============================================================================
# 5. Priority Classification Levels
# ============================================================================

@pytest.mark.parametrize("priority_level", ["CRITICAL", "HIGH", "MEDIUM", "LOW"])
def test_all_supported_priority_levels(priority_level: str):
    """Verify valid priority levels (CRITICAL, HIGH, MEDIUM, LOW)."""
    service = IntelligenceService(
        MockLLMClient([
            json.dumps({
                "intent": {"label": "General Inquiry", "evidence": "Routine check"},
                "summary": "Summary of conversation.",
                "sentiment": {"label": "Neutral", "explanation": "Calm"},
                "priority": {"level": priority_level, "reason": f"Priority assessed as {priority_level}."},
            })
        ])
    )
    res = service.analyze("Patient calling for routine general hospital schedule information.")
    assert res.priority.level == priority_level


# ============================================================================
# 6. Rejection of Invalid Input (Phase 1 & Request Schemas)
# ============================================================================

def test_empty_transcript_rejected(client: TestClient):
    """Empty transcript is rejected with HTTP 422."""
    res = client.post(f"{settings.API_PREFIX}/analyze-transcript", json={"transcript": "", "language": "en"})
    assert res.status_code == 422
    assert "empty or contain only whitespace" in str(res.json())


def test_whitespace_only_transcript_rejected(client: TestClient):
    """Whitespace-only transcript is rejected with HTTP 422."""
    res = client.post(
        f"{settings.API_PREFIX}/analyze-transcript",
        json={"transcript": "   \n\t  \r\n  ", "language": "en"},
    )
    assert res.status_code == 422
    assert "empty or contain only whitespace" in str(res.json())


def test_unsupported_language_rejected(client: TestClient):
    """Unsupported language codes (e.g., 'es', 'fr') rejected with HTTP 422."""
    res = client.post(
        f"{settings.API_PREFIX}/analyze-transcript",
        json={"transcript": "I need to schedule an appointment.", "language": "es"},
    )
    assert res.status_code == 422
    assert "Unsupported language code" in str(res.json())


# ============================================================================
# 7. Model Output Robustness & Retries
# ============================================================================

def test_markdown_code_fenced_json_parsed_successfully():
    """Model returning markdown-wrapped json (```json ... ```) is cleanly parsed."""
    wrapped_json = """```json
{
  "intent": {"label": "Medicine Refill", "evidence": "I need my insulin prescription refilled."},
  "summary": "Patient requests insulin refill.",
  "sentiment": {"label": "Neutral", "explanation": "Direct refill request."},
  "priority": {"level": "MEDIUM", "reason": "Standard prescription refill."}
}
```"""
    service = IntelligenceService(MockLLMClient([wrapped_json]))
    res = service.analyze("I need my insulin prescription refilled as soon as possible.")
    assert res.intent.label == "Medicine Refill"
    assert res.priority.level == "MEDIUM"


def test_malformed_model_output_bounded_retry_failure(client: TestClient):
    """Model returning unparseable text exhausts retries and returns HTTP 502."""
    intelligence_service.set_llm_client(MockLLMClient(["Not a JSON at all", "Still corrupted text"]))
    res = client.post(
        f"{settings.API_PREFIX}/analyze-transcript",
        json={"transcript": "I need to see Dr. Thorne please.", "language": "en"},
    )
    assert res.status_code == 502
    assert "failed schema validation" in str(res.json())


def test_invalid_labels_normalized_safely():
    """Unsupported or non-standard labels from model are normalized safely."""
    odd_json = json.dumps({
        "intent": {"label": "some_unheard_intent", "evidence": "hello"},
        "summary": "Patient call.",
        "sentiment": {"label": "strange_sentiment", "explanation": "odd"},
        "priority": {"level": "UNKNOWN_PRIORITY", "reason": "unknown level"},
    })
    service = IntelligenceService(MockLLMClient([odd_json]))
    res = service.analyze("Patient called to ask a few questions about surgery.")
    assert res.intent.label == CallIntent.UNKNOWN.value
    assert res.sentiment.label == CallSentiment.NEUTRAL.value
    assert res.priority.level == CallPriority.MEDIUM.value


# ============================================================================
# 8. Model Unavailable & Timeout Error Handling
# ============================================================================

def test_model_unavailable_returns_503(client: TestClient):
    """When local LLM runtime (Ollama) is not running, API returns HTTP 503."""
    intelligence_service.set_llm_client(
        MockLLMClient(exception=ModelUnavailableError("Ollama service not running at http://localhost:11434"))
    )
    res = client.post(
        f"{settings.API_PREFIX}/analyze-transcript",
        json={"transcript": "I need my medication refilled today.", "language": "en"},
    )
    assert res.status_code == 503
    assert "Ollama service not running" in str(res.json())


def test_inference_timeout_returns_504(client: TestClient):
    """When local inference times out, API returns HTTP 504 Gateway Timeout."""
    intelligence_service.set_llm_client(
        MockLLMClient(exception=InferenceTimeoutError("Inference timed out after 60s"))
    )
    res = client.post(
        f"{settings.API_PREFIX}/analyze-transcript",
        json={"transcript": "I need my medication refilled today.", "language": "en"},
    )
    assert res.status_code == 504
    assert "Inference timed out" in str(res.json())


# ============================================================================
# 9. Insufficient / Greeting-Only Transcripts
# ============================================================================

def test_greeting_only_transcript_handled_without_llm_latency():
    """Greeting-only transcripts ('Hello? Anyone there?') are handled deterministically."""
    mock_client = MockLLMClient()
    service = IntelligenceService(mock_client)

    res = service.analyze("Hello? Is anyone there?")
    assert res.intent.label == CallIntent.UNKNOWN.value
    assert res.sentiment.label == CallSentiment.NEUTRAL.value
    assert res.priority.level == CallPriority.LOW.value
    assert mock_client.call_count == 0  # Bypassed LLM call for instant response!


# ============================================================================
# 10. Conservative Emergency Safety Escalations
# ============================================================================

def test_emergency_escalation_chest_pain_overrides_model_low_priority():
    """If transcript describes chest pain and model returned LOW, safety rule overrides to CRITICAL."""
    # Model incorrectly labeled chest pain as LOW priority General Inquiry
    bad_model_output = json.dumps({
        "intent": {"label": "General Inquiry", "evidence": "pressure in my chest"},
        "summary": "Caller mentions chest pressure.",
        "sentiment": {"label": "Neutral", "explanation": "Calm tone"},
        "priority": {"level": "LOW", "reason": "Patient sounded calm."},
    })
    service = IntelligenceService(MockLLMClient([bad_model_output]))

    transcript = "Hello, I am having sudden crushing pressure in my chest and pain radiating down my arm."
    res = service.analyze(transcript)

    assert res.priority.level == "CRITICAL"
    assert res.intent.label == CallIntent.EMERGENCY_CONCERN.value
    assert "[Safety Guardrail:" in res.priority.reason
    assert res.metadata.emergency_escalated is True


def test_emergency_escalation_respiratory_distress():
    """If transcript describes shortness of breath/can't breathe, priority must be CRITICAL."""
    bad_model_output = json.dumps({
        "intent": {"label": "Appointment Request", "evidence": "I cannot breathe"},
        "summary": "Caller wants appointment for breathing trouble.",
        "sentiment": {"label": "Neutral", "explanation": "Patient asked for appointment"},
        "priority": {"level": "MEDIUM", "reason": "Requested appointment"},
    })
    service = IntelligenceService(MockLLMClient([bad_model_output]))

    transcript = "My mother cannot breathe and is gasping for air. Please help."
    res = service.analyze(transcript)

    assert res.priority.level == "CRITICAL"
    assert res.metadata.emergency_escalated is True
    assert "urgent human review" in res.priority.reason


def test_post_operative_fever_escalates_to_high():
    """Post-operative fever (e.g. 100.8°F after appendectomy) escalates to at least HIGH."""
    bad_model_output = json.dumps({
        "intent": {"label": "Follow-up Request", "evidence": "fever of 100.8"},
        "summary": "Patient had appendectomy and reports fever.",
        "sentiment": {"label": "Neutral", "explanation": "Reported fever"},
        "priority": {"level": "LOW", "reason": "Scheduled follow-up inquiry"},
    })
    service = IntelligenceService(MockLLMClient([bad_model_output]))

    transcript = "I had an appendectomy 5 days ago and now have a fever of 100.8 with redness at incision."
    res = service.analyze(transcript)

    assert res.priority.level == "HIGH"
    assert res.metadata.emergency_escalated is True


# ============================================================================
# 11. Live Ollama Integration Test (Verifying Real Model)
# ============================================================================

def test_live_ollama_real_inference():
    """Verify live inference against local Ollama running llama3:latest.

    Tests actual local model, measures latency, and verifies structured schema.
    """
    import httpx
    # Check if Ollama is reachable before running live test
    try:
        ping = httpx.get(f"{settings.OLLAMA_BASE_URL}/api/tags", timeout=2.0)
        if ping.status_code != 200:
            pytest.skip("Local Ollama runtime is not running.")
        available_models = [m.get("name", "") for m in ping.json().get("models", [])]
        if not any(settings.LLM_MODEL in m or m in settings.LLM_MODEL for m in available_models):
            pytest.skip(f"Model '{settings.LLM_MODEL}' is not available in local Ollama.")
    except Exception:
        pytest.skip("Local Ollama runtime is not accessible.")

    real_service = IntelligenceService(OllamaClient())
    transcript = "I was charged twice for my blood test invoice. Please ask the billing office to refund the duplicate charge."
    result = real_service.analyze(transcript=transcript, language="en")

    assert result.success is True
    assert result.language == "en"
    assert result.intent.label == CallIntent.BILLING_ISSUE.value
    assert result.intent.evidence is not None
    assert len(result.summary) > 10
    assert result.sentiment.label in [s.value for s in CallSentiment]
    assert result.priority.level in ["CRITICAL", "HIGH", "MEDIUM", "LOW"]
    assert result.metadata.processing_time_seconds is not None
    assert result.metadata.processing_time_seconds > 0
