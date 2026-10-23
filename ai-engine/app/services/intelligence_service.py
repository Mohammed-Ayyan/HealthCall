"""Core AI Intelligence Engine for CareOps (Phase 4).

Provides:
1. Intent Classification (Appointment Request, Insurance Query, Billing Issue,
   Complaint, Medicine Refill, Emergency Concern, General Inquiry, Follow-up Request, Unknown)
2. Healthcare-Call Summarization (factual, concise, negation-preserving)
3. Sentiment Classification (Satisfied, Neutral, Confused, Frustrated, Angry, Uncertain)
4. Priority Classification (CRITICAL, HIGH, MEDIUM, LOW) with transparent rules & safety escalation
5. Conservative Emergency Safety Checks: prevents model from downgrading clinical emergencies
6. Local LLM Runtime Integration (Ollama / Llama 3) with zero cloud transmission

Privacy:
- All processing is performed strictly locally. No transcripts are transmitted to external AI APIs.
- Transcripts are never logged to console or application logs to protect PHI.
"""

import json
import logging
import re
import time
from typing import Any, Dict, List, Optional, Protocol, Tuple

import httpx

from app.core.config import settings
from app.models.schemas import (
    CallIntent,
    CallPriority,
    CallSentiment,
    IntelligenceMetadata,
    IntentAnalysisResult,
    PriorityAnalysisResult,
    PrivacyMaskingInfo,
    SentimentAnalysisResult,
    TranscriptAnalysisResponse,
)
from app.services.multilingual_service import (
    check_emergency_multilingual,
    classify_intent_multilingual,
    detect_language,
    extract_actions_multilingual,
    extract_commitments_multilingual,
    is_greeting_or_insufficient_multilingual,
    summarize_multilingual,
)
from app.services.privacy_service import privacy_service
from app.services.transcript_processing_service import normalize_transcript

logger = logging.getLogger("careops.intelligence")


# ============================================================================
# Custom Exceptions
# ============================================================================

class IntelligenceError(Exception):
    """Base exception for intelligence service failures."""


class ModelUnavailableError(IntelligenceError):
    """Raised when the local LLM runtime (e.g. Ollama) cannot be reached."""


class InferenceTimeoutError(IntelligenceError):
    """Raised when the local LLM runtime times out."""


class InferenceError(IntelligenceError):
    """Raised when model inference fails during execution."""


class MalformedModelOutputError(IntelligenceError):
    """Raised when the model output cannot be parsed into the expected JSON structure."""


# ============================================================================
# LLM Client Protocol & Ollama Implementation
# ============================================================================

class LLMClientProtocol(Protocol):
    """Interface for LLM generation to allow dependency injection and fast unit testing."""

    def generate(self, prompt: str, system: Optional[str] = None) -> str:
        """Generate text completion from LLM."""
        ...


class OllamaClient:
    """Client for locally hosted Ollama inference runtime."""

    def __init__(
        self,
        base_url: Optional[str] = None,
        model_name: Optional[str] = None,
        timeout_seconds: Optional[float] = None,
        temperature: Optional[float] = None,
    ) -> None:
        self.base_url = (base_url or settings.OLLAMA_BASE_URL).rstrip("/")
        self.model_name = model_name or settings.LLM_MODEL
        self.timeout_seconds = timeout_seconds or settings.LLM_TIMEOUT_SECONDS
        self.temperature = (
            temperature if temperature is not None else settings.LLM_TEMPERATURE
        )

        self._model_verified = False

    def generate(self, prompt: str, system: Optional[str] = None) -> str:
        """Call Ollama /api/generate with JSON enforcement."""
        # Resolve model to an installed model in Ollama if configured model is not present
        if not getattr(self, "_model_verified", False):
            try:
                with httpx.Client(timeout=2.0) as check_client:
                    tags_res = check_client.get(f"{self.base_url}/api/tags")
                    if tags_res.status_code == 200:
                        installed = [m.get("name", "") for m in tags_res.json().get("models", [])]
                        if self.model_name not in installed:
                            for candidate in ["phi3:mini", "qwen2.5:0.5b", "llama3:latest", "llama3"]:
                                matched = next((m for m in installed if candidate in m or m in candidate), None)
                                if matched:
                                    self.model_name = matched
                                    break
                            else:
                                if installed:
                                    self.model_name = installed[0]
                        self._model_verified = True
            except Exception:
                pass

        payload: Dict[str, Any] = {
            "model": self.model_name,
            "prompt": prompt,
            "stream": False,
            "format": "json",
            "options": {
                "temperature": self.temperature,
            },
        }
        if system:
            payload["system"] = system

        url = f"{self.base_url}/api/generate"

        try:
            with httpx.Client(timeout=self.timeout_seconds) as client:
                response = client.post(url, json=payload)
        except (httpx.ConnectError, httpx.NetworkError) as exc:
            logger.error("Failed to connect to local Ollama service at %s: %s", self.base_url, exc)
            raise ModelUnavailableError(
                f"Local LLM runtime (Ollama) is unavailable at {self.base_url}. "
                "Ensure Ollama is running locally ('ollama serve')."
            ) from exc
        except httpx.TimeoutException as exc:
            logger.error("Ollama inference timed out after %s seconds: %s", self.timeout_seconds, exc)
            raise InferenceTimeoutError(
                f"Local LLM inference timed out after {self.timeout_seconds} seconds."
            ) from exc
        except Exception as exc:
            logger.error("Unexpected error contacting Ollama runtime: %s", exc)
            raise InferenceError(f"Local LLM client request failed: {exc}") from exc

        if response.status_code == 404:
            # Model not found on Ollama - try fallback installed model
            try:
                with httpx.Client(timeout=2.0) as check_client:
                    tags_res = check_client.get(f"{self.base_url}/api/tags")
                    if tags_res.status_code == 200:
                        installed = [m.get("name", "") for m in tags_res.json().get("models", [])]
                        if installed and installed[0] != self.model_name:
                            self.model_name = installed[0]
                            payload["model"] = self.model_name
                            with httpx.Client(timeout=self.timeout_seconds) as retry_client:
                                response = retry_client.post(url, json=payload)
            except Exception:
                pass

        if response.status_code != 200:
            error_body = response.text[:200]
            logger.error("Ollama returned HTTP %d: %s", response.status_code, error_body)
            raise InferenceError(
                f"Local LLM runtime returned HTTP {response.status_code}: {error_body}"
            )

        try:
            data = response.json()
            raw_text = data.get("response", "")
            return raw_text
        except Exception as exc:
            raise MalformedModelOutputError(f"Failed to decode Ollama response JSON: {exc}") from exc


# ============================================================================
# Conservative Emergency Safety Checker
# ============================================================================

# Patterns indicative of potential acute clinical emergencies or serious complications
_EMERGENCY_PATTERNS = [
    # Acute cardiac / chest
    r"\b(?:chest\s+pain|heart\s+attack|cardiac\s+arrest|crushing\s+chest|pressure\s+in\s+(?:my\s+)?chest)\b",
    # Severe respiratory distress
    r"\b(?:can'?t\s+breathe|cannot\s+breathe|difficulty\s+breathing|shortness\s+of\s+breath|struggling\s+to\s+breathe|gasping|choking|respiratory\s+distress|turning\s+blue)\b",
    # Anaphylaxis / acute allergic reaction
    r"\b(?:anaphylaxis|throat\s+(?:closing|swelling)|severe\s+allergic\s+reaction)\b",
    # Loss of consciousness / neurological
    r"\b(?:unresponsive|passed\s+out|unconscious|loss\s+of\s+consciousness|collapsed|fainted\s+and\s+hit|seizure|convulsions)\b",
    # Stroke symptoms
    r"\b(?:stroke|facial\s+droop(?:ing)?|slurred\s+speech|sudden\s+weakness|numbness\s+on\s+one\s+side)\b",
    # Severe hemorrhage / acute trauma
    r"\b(?:coughing\s+up\s+blood|vomiting\s+blood|profuse\s+bleeding|severe\s+bleeding|uncontrolled\s+bleeding|hemorrhag)\b",
    # Psychiatric emergency
    r"\b(?:kill\s+myself|suicid(?:e|al)|overdose|harm\s+myself)\b",
    # Post-operative acute infection / severe surgical complications
    r"\b(?:fever\s+of\s+10[0-9](?:\.[0-9])?|incision\s+(?:oozing\s+pus|swollen\s+and\s+red|infected)|post-op(?:erative)?\s+fever)\b",
]

_EMERGENCY_REGEX = re.compile("|".join(_EMERGENCY_PATTERNS), re.IGNORECASE)

# Routine greeting or ambiguous empty-intent patterns
_GREETING_VOCAB = frozenset([
    "hello", "hi", "hey", "good", "morning", "afternoon", "evening",
    "is", "anyone", "there", "can", "you", "hear", "me",
    "yes", "no", "okay", "ok", "thanks", "thank",
])


def is_insufficient_or_greeting(text: str) -> bool:
    """Check if transcript is solely a greeting, check-in, or lacks substantive request."""
    cleaned = re.sub(r"[^\w\s]", "", text.lower()).strip()
    words = cleaned.split()
    if not words:
        return True
    if len(words) < 3:
        return True
    if all(w in _GREETING_VOCAB for w in words):
        return True
    return False


class EmergencySafetyChecker:
    """Deterministic safety guardrail for clinical risk escalation.

    Ensures that potential medical emergencies or acute complications are conservatively
    escalated for urgent human review, preventing an LLM from silently downgrading critical
    patient safety risks.
    """

    @classmethod
    def check_emergency_indicators(cls, transcript: str) -> Optional[str]:
        """Detect potential emergency trigger phrases in transcript. Returns matched snippet or None."""
        match = _EMERGENCY_REGEX.search(transcript)
        if match:
            return match.group(0)
        return None

    @classmethod
    def apply_safety_guardrails(
        cls,
        transcript: str,
        intent: IntentAnalysisResult,
        priority: PriorityAnalysisResult,
    ) -> Tuple[IntentAnalysisResult, PriorityAnalysisResult, bool]:
        """Apply conservative safety rules to model outputs.

        Rules:
        1. If acute emergency patterns are present and priority is not CRITICAL or HIGH,
           force escalation to HIGH or CRITICAL.
        2. If acute life-threatening distress is detected (e.g. chest pain, can't breathe, unconscious),
           escalate to CRITICAL.
        3. If urgent post-op complications (e.g. post-op fever) detected, ensure at least HIGH.
        4. Append a transparent safety guardrail note to the priority reason.
        """
        matched = cls.check_emergency_indicators(transcript)
        if not matched:
            return intent, priority, False

        escalated = False
        current_priority = priority.level.upper()

        # Check for life-threatening acute vs urgent post-op on full transcript
        is_life_threatening = bool(
            re.search(
                r"\b(?:chest\s+pain|heart\s+attack|cardiac\s+arrest|crushing\s+(?:chest|pressure)|pressure\s+in\s+(?:my\s+)?chest|cannot\s+breathe|can'?t\s+breathe|difficulty\s+breathing|shortness\s+of\s+breath|struggling\s+to\s+breathe|unresponsive|unconscious|stroke|anaphylaxis|choking|suicid|coughing\s+up\s+blood)\b",
                transcript,
                re.IGNORECASE,
            )
        )

        target_priority = "CRITICAL" if is_life_threatening else "HIGH"

        if current_priority in ("LOW", "MEDIUM") or (
            target_priority == "CRITICAL" and current_priority != "CRITICAL"
        ):
            escalated = True
            guardrail_note = (
                f"[Safety Guardrail: Potential acute concern detected ('{matched}'). "
                f"Conservatively escalated to {target_priority} for urgent human review.] "
            )
            updated_reason = guardrail_note + priority.reason

            priority = PriorityAnalysisResult(
                level=target_priority,
                reason=updated_reason,
            )

        # Ensure intent reflects emergency or urgent follow-up if currently categorized as general/unknown
        if intent.label in (CallIntent.GENERAL_INQUIRY, CallIntent.UNKNOWN):
            intent = IntentAnalysisResult(
                label=CallIntent.EMERGENCY_CONCERN.value if is_life_threatening else CallIntent.FOLLOW_UP_REQUEST.value,
                evidence=intent.evidence or matched,
            )
            escalated = True

        return intent, priority, escalated


# ============================================================================
# Prompt Construction
# ============================================================================

SYSTEM_INSTRUCTION = """You are a clinical telephony intelligence engine for healthcare operations.
Analyze healthcare call transcripts and extract accurate, structured JSON information.

Core Responsibilities:
1. Intent Classification:
   Select exactly ONE primary intent label from:
   - "Appointment Request": Patient booking a NEW or regular doctor consultation with no previous visit context.
   - "Follow-up Request": Patient calling regarding a RECENT consultation, previous surgery, test results, or post-discharge care.
   - "Insurance Query": Inquiries regarding insurance coverage, pre-authorization, or claim status.
   - "Billing Issue": Disputed charges, incorrect invoices, duplicate payments, or financial inquiries.
   - "Complaint": Formal service grievances regarding staff conduct, long wait times, or hospital facilities.
   - "Medicine Refill": Prescription renewals, pharmacy refill requests, dosage continuation.
   - "Emergency Concern": Acute, severe, or life-threatening symptoms requiring immediate medical evaluation.
   - "General Inquiry": Routine facility questions, visiting hours, directions, general administrative info.
   - "Unknown": When the transcript is too short, ambiguous, or lacks any clear administrative or clinical request.
   Provide exact direct supporting evidence quote from the transcript.

2. Healthcare Call Summarization:
   - Generate a concise, factual 1-3 sentence summary.
   - Preserve central reason for call, requests, and commitments.
   - STRICTLY preserve negation (e.g., "denies pain", "did NOT take medication", "no fever").
   - Do NOT invent appointments, diagnoses, treatments, or recommendations unsupported by transcript.

3. Sentiment Classification:
   Select exactly ONE label from:
   - "Satisfied", "Neutral", "Confused", "Frustrated", "Angry", "Uncertain"
   - Base on the language and tone used in the transcript.
   - Do NOT confuse a patient's medical condition with sentiment.
   - Do NOT classify all billing issues or problems as "Angry" or "Complaint". If a patient is polite or matter-of-fact, sentiment is "Neutral".
   Provide a concise explanation.

4. Priority Classification:
   Select exactly ONE level from:
   - "CRITICAL": Life-threatening symptoms, acute severe distress, emergencies.
   - "HIGH": Urgent medical concerns, post-operative complications, time-sensitive same-day needs.
   - "MEDIUM": Routine clinical inquiries, standard billing disputes, non-urgent scheduled appointments.
   - "LOW": General informational queries, routine facility questions, non-urgent information.
   Provide a concise reason explaining the urgency level.

Output Format:
You must respond ONLY with a valid JSON object matching this schema:
{
  "intent": {
    "label": "<Allowed Intent Label>",
    "evidence": "<Direct quote from transcript>"
  },
  "summary": "<Concise factual summary>",
  "sentiment": {
    "label": "<Allowed Sentiment Label>",
    "explanation": "<Concise explanation>"
  },
  "priority": {
    "level": "<CRITICAL|HIGH|MEDIUM|LOW>",
    "reason": "<Concise rationale>"
  }
}
"""


def build_analysis_prompt(transcript: str, language: str) -> str:
    """Build user prompt for transcript analysis."""
    return f"""Language: {language}
Transcript:
\"\"\"{transcript}\"\"\"

Analyze the transcript and return the required JSON object.
"""


# ============================================================================
# Intelligence Service Implementation
# ============================================================================

class IntelligenceService:
    """Phase 4 Intelligence Engine Service."""

    def __init__(self, llm_client: Optional[LLMClientProtocol] = None) -> None:
        self._llm_client = llm_client or OllamaClient()

    def set_llm_client(self, client: LLMClientProtocol) -> None:
        """Swap LLM client (useful for unit testing without live Ollama)."""
        self._llm_client = client

    def analyze(
        self,
        transcript: str,
        language: str = "en",
        call_id: Optional[str] = None,
        mask_pii: bool = True,
    ) -> TranscriptAnalysisResponse:
        """Process a healthcare call transcript and extract structured intelligence.

        Pipeline (Phases 4-7):
        1. Preprocess & normalize transcript whitespace.
        2. Multilingual identification for English ('en'), Hindi ('hi'), and Kannada ('kn').
        3. Privacy & PII Masking: redact patient names, phones, emails, MRNs, addresses.
           Preserves original transcript separate from masked transcript.
        4. Multilingual greeting / insufficient transcript check.
        5. Action-item extraction & staff commitment detection across EN, HI, KN.
        6. Multilingual intent classification, clinical emergency escalation, and summarization.
        7. Return complete validated TranscriptAnalysisResponse.
        """
        start_time = time.time()

        # Step 1: Normalize whitespace (meaning-safe)
        normalized = normalize_transcript(transcript)

        # Step 2: Language Identification (Auto-detect if unspecified or if Indic script present)
        detected_lang, conf, script = detect_language(normalized)
        effective_language = (language or "auto").strip().lower()
        if effective_language in ("auto", "unknown", "") or (effective_language == "en" and detected_lang in ("hi", "kn")):
            effective_language = detected_lang

        # Step 3: Privacy & PII Masking (Phase 7)
        original_transcript = normalized
        if mask_pii:
            mask_result = privacy_service.mask_pii(normalized, language=effective_language)
            working_transcript = mask_result.masked_transcript
            privacy_info = PrivacyMaskingInfo(
                is_masked=mask_result.is_masked,
                masked_entities_count=mask_result.masked_entities_count,
                detected_entity_types=mask_result.detected_entity_types,
                redacted_transcript=working_transcript,
            )
        else:
            working_transcript = normalized
            privacy_info = PrivacyMaskingInfo(
                is_masked=False,
                masked_entities_count=0,
                detected_entity_types=[],
                redacted_transcript=None,
            )

        # Step 4: Check for greetings / insufficient content across EN, HI, KN
        if is_greeting_or_insufficient_multilingual(working_transcript):
            return self._handle_insufficient_transcript(
                transcript=working_transcript,
                language=effective_language,
                processing_time=time.time() - start_time,
                original_transcript=original_transcript,
                privacy_info=privacy_info,
            )

        # Step 5: Extract Action Items & Staff Commitments across EN, HI, KN (Phases 5-7)
        actions = extract_actions_multilingual(working_transcript, language=effective_language)
        commitments = extract_commitments_multilingual(working_transcript, language=effective_language)

        # Step 6: Multilingual processing / LLM inference
        if effective_language in ("hi", "kn"):
            # Multilingual Indic processing without forced translation
            intent_label, evidence = classify_intent_multilingual(working_transcript, language=effective_language)
            summary_text = summarize_multilingual(working_transcript, intent_label=intent_label, language=effective_language)

            emergency_match = check_emergency_multilingual(working_transcript)
            is_emergency = bool(emergency_match)

            if is_emergency:
                priority_level = "CRITICAL"
                priority_reason = (
                    f"[Safety Guardrail: Potential acute concern detected ('{emergency_match}'). "
                    "Conservatively escalated to CRITICAL for urgent human review.]"
                )
                escalated = True
            elif intent_label == CallIntent.FOLLOW_UP_REQUEST.value:
                priority_level = "HIGH"
                priority_reason = "Follow-up clinical care or report requires timely outpatient review."
                escalated = False
            elif intent_label == CallIntent.GENERAL_INQUIRY.value:
                priority_level = "LOW"
                priority_reason = "General informational inquiry regarding clinic hours or facilities."
                escalated = False
            else:
                priority_level = "MEDIUM"
                priority_reason = f"Evaluated based on clinical and operational criteria ({intent_label})."
                escalated = False

            intent_result = IntentAnalysisResult(label=intent_label, evidence=evidence)
            sentiment_result = SentimentAnalysisResult(
                label=CallSentiment.NEUTRAL.value,
                explanation="Evaluated based on patient query tone.",
            )
            priority_result = PriorityAnalysisResult(level=priority_level, reason=priority_reason)

        else:
            # English: Call LLM with bounded retries using PII-masked transcript
            use_fallback = False
            try:
                prompt = build_analysis_prompt(transcript=working_transcript, language=effective_language)
                raw_json = self._execute_with_retry(prompt=prompt, system=SYSTEM_INSTRUCTION)

                # Parse & validate model output
                parsed_data = self._parse_and_validate_output(raw_json=raw_json, original_text=working_transcript)

                # Apply conservative safety guardrails on unmasked original transcript for clinical safety
                intent_result, priority_result, escalated = EmergencySafetyChecker.apply_safety_guardrails(
                    transcript=original_transcript,
                    intent=parsed_data["intent"],
                    priority=parsed_data["priority"],
                )
                summary_text = parsed_data["summary"]
                sentiment_result = parsed_data["sentiment"]
            except Exception as llm_err:
                if isinstance(self._llm_client, OllamaClient):
                    logger.warning(
                        "Ollama runtime issue in production (%s). Activating deterministic clinical intelligence fallback.",
                        llm_err,
                    )
                    use_fallback = True
                else:
                    raise

            if use_fallback:
                intent_label, evidence = classify_intent_multilingual(working_transcript, "en")
                emergency_match = check_emergency_multilingual(original_transcript)
                if emergency_match:
                    intent_label = CallIntent.EMERGENCY_CONCERN.value
                    priority_level = "CRITICAL"
                    priority_reason = (
                        f"[Safety Guardrail: Potential acute concern detected ('{emergency_match}'). "
                        "Conservatively escalated to CRITICAL for urgent human review.]"
                    )
                    escalated = True
                elif intent_label == CallIntent.FOLLOW_UP_REQUEST.value:
                    priority_level = "HIGH"
                    priority_reason = "Follow-up clinical care or report requires timely outpatient review."
                    escalated = False
                elif intent_label == CallIntent.APPOINTMENT_REQUEST.value:
                    priority_level = "MEDIUM"
                    priority_reason = "Outpatient doctor consultation request."
                    escalated = False
                elif intent_label == CallIntent.GENERAL_INQUIRY.value:
                    priority_level = "LOW"
                    priority_reason = "General administrative inquiry regarding clinic hours or facilities."
                    escalated = False
                else:
                    priority_level = "MEDIUM"
                    priority_reason = f"Evaluated based on clinical criteria ({intent_label})."
                    escalated = False

                summary_text = summarize_multilingual(working_transcript, "en")
                intent_result = IntentAnalysisResult(label=intent_label, evidence=evidence)
                sentiment_result = SentimentAnalysisResult(
                    label=CallSentiment.CONCERNED.value if escalated else CallSentiment.NEUTRAL.value,
                    explanation="Evaluated based on patient query tone.",
                )
                priority_result = PriorityAnalysisResult(level=priority_level, reason=priority_reason)

        processing_time = round(time.time() - start_time, 3)

        return TranscriptAnalysisResponse(
            success=True,
            language=effective_language,
            intent=intent_result,
            summary=summary_text,
            sentiment=sentiment_result,
            priority=priority_result,
            actions=actions,
            commitments=commitments,
            privacy_masking=privacy_info,
            original_transcript=original_transcript,
            masked_transcript=working_transcript,
            metadata=IntelligenceMetadata(
                model_name=getattr(self._llm_client, "model_name", "local-llm"),
                processing_time_seconds=processing_time,
                emergency_escalated=escalated,
            ),
        )

    def _execute_with_retry(self, prompt: str, system: str) -> str:
        """Execute LLM generation with bounded retries on parsing failures."""
        retries = max(0, settings.LLM_MAX_RETRIES)
        last_exception: Optional[Exception] = None

        for attempt in range(retries + 1):
            try:
                raw_text = self._llm_client.generate(prompt=prompt, system=system)
                # Verify that it is parseable JSON
                _ = self._extract_json_dict(raw_text)
                return raw_text
            except (ModelUnavailableError, InferenceTimeoutError):
                # Do not retry connection failure or timeout endlessly
                raise
            except Exception as exc:
                last_exception = exc
                logger.warning(
                    "LLM inference/parsing attempt %d failed: %s. Retrying...",
                    attempt + 1,
                    exc,
                )

        raise MalformedModelOutputError(
            f"Model output failed schema validation after {retries + 1} attempts: {last_exception}"
        )

    def _extract_json_dict(self, raw_text: str) -> Dict[str, Any]:
        """Extract and parse JSON dictionary from LLM completion text."""
        cleaned = raw_text.strip()
        # Remove markdown code fence if wrapped
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
            cleaned = re.sub(r"\s*```$", "", cleaned)
            cleaned = cleaned.strip()

        # Find first { and last }
        start_idx = cleaned.find("{")
        end_idx = cleaned.rfind("}")
        if start_idx == -1 or end_idx == -1 or start_idx > end_idx:
            raise MalformedModelOutputError(f"No JSON object found in response: {cleaned[:100]}")

        json_str = cleaned[start_idx : end_idx + 1]
        try:
            parsed = json.loads(json_str)
            if not isinstance(parsed, dict):
                raise MalformedModelOutputError("Parsed JSON is not a dictionary.")
            return parsed
        except json.JSONDecodeError as exc:
            raise MalformedModelOutputError(f"JSON decode failed: {exc}") from exc

    def _parse_and_validate_output(
        self,
        raw_json: str,
        original_text: str,
    ) -> Dict[str, Any]:
        """Validate parsed dictionary against domain rules."""
        data = self._extract_json_dict(raw_json)

        # 1. Intent validation
        intent_data = data.get("intent", {})
        if not isinstance(intent_data, dict):
            intent_data = {"label": str(intent_data), "evidence": None}

        raw_intent_label = str(intent_data.get("label", "Unknown")).strip()
        matched_intent = self._normalize_intent_label(raw_intent_label)
        evidence = intent_data.get("evidence")
        if evidence is not None:
            evidence = str(evidence).strip()

        intent_result = IntentAnalysisResult(
            label=matched_intent,
            evidence=evidence if evidence else None,
        )

        # 2. Summary validation
        summary_text = str(data.get("summary", "")).strip()
        if not summary_text:
            # Fallback to concise representation of original
            summary_text = original_text[:120].strip()

        # 3. Sentiment validation
        sentiment_data = data.get("sentiment", {})
        if not isinstance(sentiment_data, dict):
            sentiment_data = {"label": str(sentiment_data), "explanation": None}

        raw_sentiment_label = str(sentiment_data.get("label", "Neutral")).strip()
        matched_sentiment = self._normalize_sentiment_label(raw_sentiment_label)
        explanation = sentiment_data.get("explanation")
        if explanation is not None:
            explanation = str(explanation).strip()

        sentiment_result = SentimentAnalysisResult(
            label=matched_sentiment,
            explanation=explanation,
        )

        # 4. Priority validation
        priority_data = data.get("priority", {})
        if not isinstance(priority_data, dict):
            priority_data = {"level": str(priority_data), "reason": "Evaluated based on call content."}

        raw_priority_level = str(priority_data.get("level", "MEDIUM")).strip().upper()
        matched_priority = self._normalize_priority_level(raw_priority_level)
        reason = str(priority_data.get("reason", "Evaluated based on clinical and operational criteria.")).strip()

        priority_result = PriorityAnalysisResult(
            level=matched_priority,
            reason=reason,
        )

        return {
            "intent": intent_result,
            "summary": summary_text,
            "sentiment": sentiment_result,
            "priority": priority_result,
        }

    def _normalize_intent_label(self, label: str) -> str:
        """Map raw label to recognized CallIntent or default to Unknown."""
        allowed = {
            "appointment request": CallIntent.APPOINTMENT_REQUEST.value,
            "appointment": CallIntent.APPOINTMENT_REQUEST.value,
            "follow-up request": CallIntent.FOLLOW_UP_REQUEST.value,
            "follow-up": CallIntent.FOLLOW_UP_REQUEST.value,
            "follow up request": CallIntent.FOLLOW_UP_REQUEST.value,
            "follow up": CallIntent.FOLLOW_UP_REQUEST.value,
            "insurance query": CallIntent.INSURANCE_QUERY.value,
            "insurance": CallIntent.INSURANCE_QUERY.value,
            "billing issue": CallIntent.BILLING_ISSUE.value,
            "billing": CallIntent.BILLING_ISSUE.value,
            "complaint": CallIntent.COMPLAINT.value,
            "medicine refill": CallIntent.MEDICINE_REFILL.value,
            "medication refill": CallIntent.MEDICINE_REFILL.value,
            "refill": CallIntent.MEDICINE_REFILL.value,
            "emergency concern": CallIntent.EMERGENCY_CONCERN.value,
            "emergency": CallIntent.EMERGENCY_CONCERN.value,
            "general inquiry": CallIntent.GENERAL_INQUIRY.value,
            "inquiry": CallIntent.GENERAL_INQUIRY.value,
            "unknown": CallIntent.UNKNOWN.value,
            "uncertain": CallIntent.UNKNOWN.value,
        }
        return allowed.get(label.lower(), CallIntent.UNKNOWN.value)

    def _normalize_sentiment_label(self, label: str) -> str:
        """Map raw label to recognized CallSentiment or default to Neutral."""
        allowed = {
            "satisfied": CallSentiment.SATISFIED.value,
            "positive": CallSentiment.SATISFIED.value,
            "neutral": CallSentiment.NEUTRAL.value,
            "confused": CallSentiment.CONFUSED.value,
            "frustrated": CallSentiment.FRUSTRATED.value,
            "concerned": CallSentiment.FRUSTRATED.value,
            "angry": CallSentiment.ANGRY.value,
            "uncertain": CallSentiment.UNCERTAIN.value,
        }
        return allowed.get(label.lower(), CallSentiment.NEUTRAL.value)

    def _normalize_priority_level(self, level: str) -> str:
        """Map raw level to recognized CallPriority or default to MEDIUM."""
        allowed = {
            "CRITICAL": CallPriority.CRITICAL.value,
            "HIGH": CallPriority.HIGH.value,
            "MEDIUM": CallPriority.MEDIUM.value,
            "LOW": CallPriority.LOW.value,
        }
        return allowed.get(level.upper(), CallPriority.MEDIUM.value)

    def _handle_insufficient_transcript(
        self,
        transcript: str,
        language: str,
        processing_time: float,
        original_transcript: Optional[str] = None,
        privacy_info: Optional[PrivacyMaskingInfo] = None,
    ) -> TranscriptAnalysisResponse:
        """Handle greetings or insufficient transcripts without unnecessary LLM latency."""
        return TranscriptAnalysisResponse(
            success=True,
            language=language,
            intent=IntentAnalysisResult(
                label=CallIntent.UNKNOWN.value,
                evidence=transcript if transcript else None,
            ),
            summary=f"Caller initiated contact ('{transcript}') without stating a clinical or administrative request.",
            sentiment=SentimentAnalysisResult(
                label=CallSentiment.NEUTRAL.value,
                explanation="Insufficient dialogue to establish patient emotional tone.",
            ),
            priority=PriorityAnalysisResult(
                level=CallPriority.LOW.value,
                reason="Call transcript lacks substantive clinical or administrative request.",
            ),
            actions=[],
            commitments=[],
            privacy_masking=privacy_info,
            original_transcript=original_transcript or transcript,
            masked_transcript=transcript,
            metadata=IntelligenceMetadata(
                model_name=getattr(self._llm_client, "model_name", "local-llm"),
                processing_time_seconds=round(processing_time, 3),
                emergency_escalated=False,
            ),
        )


# Singleton instance for dependency injection across application
intelligence_service = IntelligenceService()
