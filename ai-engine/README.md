# CareOps AI — Intelligence Engine Backend

> **Autonomous Clinical Telephony Processing, NLU Intent Classification, and Actionable Intelligence Engine**  
> **Phase 4: Core AI Intelligence Engine** *(Phase 1, Phase 2 & Phase 3 Complete)*

---

## 1. Project Overview

**CareOps AI** transforms healthcare phone conversations into structured, verified hospital actions in real time. Designed as an operational intelligence engine for hospital command centers, nursing supervisors, and departmental leads, CareOps AI ensures zero dropped patient follow-ups, prompt insurance prior-authorizations, and SLA enforcement.

The pipeline architecture is structured into incremental stages:

```
Audio recording
    ↓
Speech-to-text transcription (Faster Whisper)       [PHASE 2 - COMPLETED]
    ↓
Transcript Processing Engine                        [PHASE 3 - COMPLETED]
  - Conservative whitespace normalization
  - Sentence segmentation with offsets
  - Deterministic metadata (char/word/sentence counts)
    ↓
Intent classification, Summary, Sentiment, Priority [PHASE 4 - COMPLETED]
  - Local Ollama runtime (Llama 3 8B)
  - Conservative emergency escalation safety rules
  - Single-pass structured JSON inference
    ↓
Action extraction & Department routing              [PHASE 5 - PLANNED]
    ↓
Staff commitment detection & Evidence grounding     [PHASE 6 - PLANNED]
    ↓
Multilingual processing & PHI privacy masking       [PHASE 7 - PLANNED]
    ↓
Frontend live service replacement & E2E testing     [PHASE 8 - PLANNED]
```

---

## 2. Current Scope: Phase 2 (Audio Transcription Engine)

### What IS implemented in Phase 2:
- **Local Faster Whisper Speech Recognition**:
  - Locally runnable, privacy-preserving speech-to-text without paid external cloud transcription APIs.
  - Configurable model size (default `base`, configurable to `tiny`, `small`, `medium`, `large-v3`).
  - Optimized for CPU execution by default with `int8` quantization (configurable to CUDA / GPU).
  - Lazy singleton model initialization: cached and reused across requests; never downloaded or loaded on import.
- **Audio Upload API (`POST /api/v1/transcribe`)**:
  - Accepts `multipart/form-data` with audio file (`file`) and optional language hint (`language`).
  - Supports common healthcare telephony formats: **WAV, MP3, M4A, FLAC, OGG**.
  - Chunked streaming upload size enforcement (default limit: 25 MB) preventing unbounded memory consumption.
  - Non-empty file validation and PyAV-based container decoding verification.
  - Safe temporary file lifecycle: files are deleted immediately after transcription in a `finally:` block.
- **Language Hints & Automatic Detection**:
  - Supported initial language hints: English (`en`), Hindi (`hi`), Kannada (`kn`).
  - Automatic language detection when no hint is supplied.
  - Unsupported language codes rejected with clear HTTP 422 error messages.
- **Structured Response Contract**:
  - Returns `success`, consolidated `transcript`, detected `language`, `language_probability`, `duration_seconds`, timestamped `segments` (`start`, `end`, `text`), and server `processing_time_seconds`.
- **Privacy & Healthcare Security**:
  - Zero external API transmission: all audio remains strictly on the local machine.
  - Telemetry logging records only file extension, size in bytes, duration, language, and processing latency; never logs raw audio or transcript contents.
- **Comprehensive Automated Test Suite**:
  - 27 automated tests covering health checks, file validation, boundary limits, corrupted audio, mock model testing, temporary file cleanup verification, and real Faster Whisper live transcription.

### What is explicitly NOT implemented in Phase 2 (Reserved for Future Phases):
- ❌ Intent classification, Clinical summary, Sentiment analysis, Priority classification (Phase 4)
- ❌ Action extraction and department routing (Phase 5)
- ❌ Staff commitment detection & evidence quote anchoring (Phase 6)
- ❌ PHI redaction & multilingual neural translation (Phase 7)
- ❌ Modifying frontend UI or removing hardcoded mock datasets (Phase 8)

---

## 3. Directory Structure

```
ai-engine/
├── .env.example              # Safe template environment variables
├── .env                      # Local environment configuration
├── .gitignore                # Python, virtualenv, and cache ignores
├── requirements.txt          # Phase 2 & 3 dependencies (fastapi, faster-whisper, av<19, etc.)
├── README.md                 # Backend documentation and testing guide
├── app/
│   ├── __init__.py           # Application package marker
│   ├── main.py               # FastAPI entry point, CORS, and exception handlers
│   ├── api/
│   │   ├── __init__.py       # API package marker
│   │   └── routes.py         # /health, /transcript/validate, /transcribe, /process-transcript
│   ├── core/
│   │   ├── __init__.py       # Core package marker
│   │   └── config.py         # Centralized Pydantic settings & Whisper configuration
│   ├── models/
│   │   ├── __init__.py       # Models package marker
│   │   └── schemas.py        # Pydantic models (Phase 1–3) + future AI intelligence stubs
│   └── services/
│       ├── __init__.py       # Services package marker
│       ├── transcription_service.py          # Faster Whisper engine, validation, PyAV decoding
│       └── transcript_processing_service.py  # Phase 3: normalization, segmentation, metadata
└── tests/
    ├── __init__.py                      # Tests package marker
    ├── conftest.py                      # Pytest TestClient fixture & path setup
    ├── test_health.py                   # Health-check endpoint tests
    ├── test_validation.py               # Transcript text validation tests
    ├── test_transcription.py            # Phase 2 audio upload, cleanup, and live model tests
    └── test_transcript_processing.py   # Phase 3 processing engine tests (48 tests)
```

---

## 4. Prerequisites & Environment Setup

- **Python**: 3.10 to 3.13 (Verified on Python 3.13)
- **pip**: 23.0+
- **OS**: Windows, macOS, or Linux (PowerShell commands below)

### Step 1: Open Terminal in `ai-engine` Directory
```powershell
cd ai-engine
```

### Step 2: Activate the Virtual Environment
**On Windows (PowerShell):**
```powershell
.\.venv\Scripts\Activate.ps1
```

### Step 3: Install Dependencies
```powershell
pip install -r requirements.txt
```

### Step 4: Configure Environment Variables
Copy the template configuration if not already configured:
```powershell
Copy-Item .env.example .env
```

Configuration variables in `.env`:
```env
WHISPER_MODEL_SIZE=base
WHISPER_DEVICE=cpu
WHISPER_COMPUTE_TYPE=int8
MAX_AUDIO_UPLOAD_SIZE_MB=25
ALLOWED_AUDIO_EXTENSIONS=[".wav", ".mp3", ".m4a", ".flac", ".ogg"]
SUPPORTED_AUDIO_LANGUAGES=["en", "hi", "kn"]
```

---

## 5. Running the Backend Server

Start the Uvicorn development server:

```powershell
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Interactive API documentation will be available at:
- **Swagger UI**: [http://127.0.0.1:8000/api/v1/docs](http://127.0.0.1:8000/api/v1/docs)
- **ReDoc**: [http://127.0.0.1:8000/api/v1/redoc](http://127.0.0.1:8000/api/v1/redoc)

---

## 6. Phase 3: Transcript Processing Engine

### Objective

Phase 3 accepts a plain-text transcript (from Phase 2 or submitted directly by a client) and prepares a normalized, segmented, and metadata-enriched representation suitable for downstream AI intelligence features (Phase 4+).

### What IS implemented in Phase 3:

- **Conservative Text Normalization** (`normalize_transcript`):  
  Strips leading/trailing whitespace, collapses internal runs of spaces and tabs, normalizes CRLF endings, and collapses excessive blank lines.  
  **Does NOT** change word meanings, remove negation words (`not`, `never`, `without`, `denies`), translate, transliterate, or perform PII masking.

- **Sentence Segmentation** (`segment_sentences`):  
  Splits on `.`, `!`, `?`, Hindi danda (`।`), double danda (`॥`). Handles common abbreviations (`Dr.`, `Mr.`, `mg`, etc.) to avoid false splits.

- **Deterministic Metadata**:  
  Unicode code-point character count, whitespace-token word count, sentence count, empty flag, and wall-clock processing time.

- **Evidence Traceability**:  
  `original_transcript` is preserved unmodified. Sentence `start_char`/`end_char` offsets reference `normalized_transcript`.

- **Privacy**:  
  Only counts (not content) are logged. No transcript text is written to logs.

### What is explicitly NOT implemented in Phase 3:
- ❌ Intent classification (Phase 4)
- ❌ Summary generation (Phase 4)
- ❌ Sentiment analysis (Phase 4)
- ❌ Priority classification (Phase 4)
- ❌ Action extraction (Phase 5)
- ❌ Staff commitment detection (Phase 6)
- ❌ Semantic evidence verification (Phase 6)
- ❌ Full PII / PHI masking (Phase 7)
- ❌ Speaker diarization (speaker labels are not assigned in Phase 3)

---

## 7. Transcript Processing API

### Endpoint: `POST /api/v1/process-transcript`

Accepts `application/json`.

#### Request fields:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `transcript` | string | ✅ | Raw transcript text. Non-empty after stripping. Max 50,000 chars. |
| `language` | string | ✗ | Language code: `en` (default), `hi`, `kn`. |
| `call_id` | string | ✗ | Optional session identifier. |

#### Example Request:
```json
{
  "transcript": "Hello, I need to book an appointment for tomorrow. Certainly, I will schedule it for you.",
  "language": "en"
}
```

#### Example Response (HTTP 200 OK):
```json
{
  "success": true,
  "language": "en",
  "original_transcript": "Hello, I need to book an appointment for tomorrow. Certainly, I will schedule it for you.",
  "normalized_transcript": "Hello, I need to book an appointment for tomorrow. Certainly, I will schedule it for you.",
  "sentences": [
    {
      "index": 0,
      "text": "Hello, I need to book an appointment for tomorrow.",
      "start_char": 0,
      "end_char": 50
    },
    {
      "index": 1,
      "text": "Certainly, I will schedule it for you.",
      "start_char": 51,
      "end_char": 89
    }
  ],
  "metadata": {
    "character_count": 89,
    "word_count": 16,
    "sentence_count": 2,
    "is_empty": false,
    "processing_time_seconds": 0.0003
  }
}
```

> **Note**: Values above are illustrative. The engine always calculates from actual input.

#### Integration with Phase 2 (`POST /api/v1/transcribe`):
Pass the `transcript` and `language` fields from a transcription response directly:
```json
{
  "transcript": "<value of transcription.transcript>",
  "language": "<value of transcription.language>"
}
```
No audio re-upload is required.

---

## 8. Audio Upload & Transcription API

### Endpoint: `POST /api/v1/transcribe`

Accepts `multipart/form-data`:
* `file` (Required): Audio recording file (`.wav`, `.mp3`, `.m4a`, `.flac`, `.ogg`, max 25MB).
* `language` (Optional): ISO language hint (`en`, `hi`, `kn`). If omitted, automatic language detection is performed.

#### Example Response (HTTP 200 OK):
```json
{
  "success": true,
  "transcript": "Hello, I am calling following my surgery with Dr. Thorne. I have developed a low-grade fever and need to confirm my follow-up appointment.",
  "language": "en",
  "language_probability": 0.9854,
  "duration_seconds": 7.42,
  "segments": [
    {
      "id": 0,
      "start": 0.0,
      "end": 3.8,
      "text": "Hello, I am calling following my surgery with Dr. Thorne."
    },
    {
      "id": 1,
      "start": 3.8,
      "end": 7.42,
      "text": "I have developed a low-grade fever and need to confirm my follow-up appointment."
    }
  ],
  "processing_time_seconds": 1.48
}
```


## 7. How to Test the Transcription Endpoint

### Method A: Interactive Browser (Swagger UI)
1. Navigate to [http://127.0.0.1:8000/api/v1/docs](http://127.0.0.1:8000/api/v1/docs)
2. Expand **`POST /api/v1/transcribe`** and click **"Try it out"**
3. Choose an audio file (e.g., `.wav`, `.mp3`)
4. Optionally enter `en`, `hi`, or `kn` in the `language` field
5. Click **"Execute"** and view the structured transcript and segments.

### Method B: PowerShell `curl` / `Invoke-RestMethod`
```powershell
$form = @{
    file = Get-Item "C:\path\to\recording.wav"
    language = "en"
}
$response = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/v1/transcribe" -Method Post -Form $form
$response | ConvertTo-Json -Depth 5
```

### Method C: Linux / macOS `curl`
```bash
curl -X POST "http://127.0.0.1:8000/api/v1/transcribe" \
     -F "file=@/path/to/recording.wav" \
     -F "language=en"
```

---

## 9. Phase 4: Core AI Intelligence Engine API

### Endpoint: `POST /api/v1/analyze-transcript`

Processes raw or pre-processed healthcare call transcripts and extracts structured intelligence using a locally hosted Ollama inference engine (`llama3:latest` 8B parameter model) paired with deterministic conservative clinical safety guardrails.

Accepts `application/json`.

#### Request Fields:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `transcript` | string | ✅ | Healthcare call transcript. Non-empty after stripping. Max 50,000 characters. |
| `language` | string | ✗ | Language code: `en` (default), `hi`, `kn`. |
| `call_id` | string | ✗ | Optional unique identifier for the call session. |

#### Example Request:
```json
{
  "transcript": "I have been charged twice for my appointment. Please ask billing to investigate.",
  "language": "en",
  "call_id": "call-101"
}
```

#### Example Response (HTTP 200 OK):
```json
{
  "success": true,
  "language": "en",
  "intent": {
    "label": "Billing Issue",
    "evidence": "I have been charged twice for my appointment."
  },
  "summary": "The patient reports a duplicate appointment charge and requests a billing investigation.",
  "sentiment": {
    "label": "Neutral",
    "explanation": "The patient's tone is objective and matter-of-fact, without expressing emotions or frustration."
  },
  "priority": {
    "level": "MEDIUM",
    "reason": "The issue is time-sensitive, but not life-threatening or urgent, and can be addressed through standard billing procedures."
  },
  "metadata": {
    "model_name": "llama3:latest",
    "processing_time_seconds": 1.25,
    "emergency_escalated": false
  }
}
```

### Core Capabilities

#### A. Intent Classification
Categorizes call intent into one of 9 recognized categories with direct supporting transcript evidence:
- **Appointment Request**: Booking a new or regular consultation without prior visit context.
- **Follow-up Request**: Post-procedure/post-discharge check-ins, reporting post-visit symptoms, or scheduled follow-ups.
- **Insurance Query**: Pre-authorization questions, coverage verification, claim inquiries.
- **Billing Issue**: Disputed charges, incorrect invoices, duplicate payments, financial questions.
- **Complaint**: Service grievances regarding staff conduct, wait times, or facility issues.
- **Medicine Refill**: Prescription renewal or pharmacy refill requests.
- **Emergency Concern**: Acute or potentially life-threatening medical symptoms.
- **General Inquiry**: Hospital directions, visiting hours, non-clinical facility questions.
- **Unknown**: Insufficient or ambiguous transcripts.

#### B. Healthcare-Call Summarization
- Generates concise 1–3 sentence summaries based strictly on the transcript.
- Preserves central reason for call, key requests, and staff commitments.
- **Strictly preserves medical negation** (`"no fever"`, `"denies chest pain"`, `"did not take medication"`).
- Does **not** invent medical diagnoses or clinical recommendations.

#### C. Sentiment Classification
- Labels patient emotional tone: `Satisfied`, `Neutral`, `Confused`, `Frustrated`, `Angry`, or `Uncertain`.
- Evaluates linguistic cues; distinguishes emotional frustration from call reason (e.g., a patient upset about a bill has a `Billing Issue` intent with `Frustrated` sentiment, rather than an automatic `Complaint`).
- Does not confuse medical conditions with patient sentiment.

#### D. Priority Classification & Conservative Safety Guardrails
- Assigns operational triage priority: `CRITICAL`, `HIGH`, `MEDIUM`, or `LOW`.
- **Mandatory Safety Rule**: Any transcript mentioning life-threatening symptoms (chest pain, respiratory distress, stroke, anaphylaxis, severe bleeding) or acute post-operative complications (fever >= 100.4°F with surgical redness) is **conservatively escalated** to `CRITICAL` or `HIGH` for urgent human clinical review.
- Language models cannot silently downgrade mandatory emergency escalations.
- Prototype disclaimer: Designed for administrative and operational triage support, not clinical triage or medical diagnosis.

---

## 10. Automated Test Suite

Run the full automated test suite using `pytest`:

```powershell
pytest -v
```

### Test Coverage (108 Tests, 100% Passing):

| File | Count | Coverage |
|------|-------|----------|
| `test_health.py` | 3 | Health check endpoints |
| `test_validation.py` | 12 | Phase 1 transcript validation & constraints |
| `test_transcription.py` | 12 | Phase 2 Faster Whisper audio transcription & container validation |
| `test_transcript_processing.py` | 45 | Phase 3 normalization, sentence segmentation & metadata engine |
| `test_intelligence.py` | 36 | Phase 4 Core AI: 9 intents, summarization, sentiment, priority, safety guardrails, bounded retries & live Ollama |
| **Total** | **108** | **All tests passing (100%)** |

---

## 11. Normalization Rules Reference

| Rule | Applied |
|------|---------||
| Strip leading/trailing whitespace | ✅ |
| Collapse internal multiple spaces to one | ✅ |
| Convert tabs to spaces | ✅ |
| Normalize CRLF/CR to LF | ✅ |
| Collapse 3+ blank lines to 1 | ✅ |
| Strip trailing whitespace per line | ✅ |
| Remove negation words (`not`, `never`, etc.) | ❌ Never |
| Change clinical meaning | ❌ Never |
| Translate or transliterate | ❌ Never |
| PII / PHI masking | ❌ Phase 7 |

---

## 12. Language Support & Limitations

| Language | Code | Normalization | Segmentation | Word Count |
|----------|------|---------------|--------------|------------|
| English | `en` | ✅ Full | ✅ Good (abbreviation-aware) | ✅ Accurate |
| Hindi | `hi` | ✅ Full | ✅ Good (danda-aware) | ✅ Approximate |
| Kannada | `kn` | ✅ Full | ⚠️ Period/danda only | ⚠️ Approximation |

- **Word count** for Kannada and other abugida scripts is a whitespace-token approximation.
- **Language code** is a caller-supplied hint validated against `[en, hi, kn]`; Phase 3 does NOT independently detect the language.
- **Translation** and **transliteration** are never performed.

---

## 13. Current Limitations & Roadmap

- **Sentence Segmentation**: Heuristic regex approach. Handles common medical abbreviations but may misfire on unusual ones.
- **Word Count**: Whitespace-based; not linguistically exact for Kannada/Japanese/Chinese.
- **Language Detection**: Phase 3 trusts the caller's `language` field; independent detection is a future feature.
- **Speaker Diarization**: Not implemented. Speaker labels are NOT assigned from sentence order.
- **PII Masking**: Not implemented. Planned for Phase 7.
- **Audio Length**: Default maximum file size is 25 MB (~25-30 minutes of compressed audio).
- **First-Run Model Download**: Faster Whisper downloads model weights automatically on first run.
