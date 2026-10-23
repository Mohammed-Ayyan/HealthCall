/**
 * CareOps AI - Direct API client for AI Intelligence Engine (Phases 1–4).
 * 
 * Communicates with FastAPI backend running on http://127.0.0.1:8000/api/v1:
 * - Phase 1: Health & Validation (/health, /transcript/validate)
 * - Phase 2: Speech-to-Text Transcription via Faster Whisper (/transcribe)
 * - Phase 3: Sentence Normalization, Segmentation & Metadata (/process-transcript)
 * - Phase 4: Core AI Analysis: Intent, Summary, Sentiment, Priority (/analyze-transcript)
 */

const AI_ENGINE_BASE_URL =
  process.env.NEXT_PUBLIC_AI_ENGINE_URL || "http://127.0.0.1:8000/api/v1";

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
}

export interface TranscriptionSegment {
  id: number;
  start: number;
  end: number;
  text: string;
}

export interface TranscriptionResponse {
  success: boolean;
  transcript: string;
  language: string;
  language_probability: number;
  duration_seconds: number;
  segments: TranscriptionSegment[];
  processing_time_seconds: number;
}

export interface TranscriptSentence {
  index: number;
  text: string;
  start_char?: number;
  end_char?: number;
}

export interface TranscriptProcessingResponse {
  success: boolean;
  language: string;
  original_transcript: string;
  normalized_transcript: string;
  sentences: TranscriptSentence[];
  metadata: {
    character_count: number;
    word_count?: number;
    sentence_count: number;
    is_empty: boolean;
    processing_time_seconds?: number;
  };
}

export interface IntentResult {
  label: string;
  evidence?: string;
}

export interface SentimentResult {
  label: string;
  explanation?: string;
}

export interface PriorityResult {
  level: string;
  reason: string;
}

export interface AnalysisMetadata {
  model_name?: string;
  processing_time_seconds?: number;
  emergency_escalated?: boolean;
}

export interface TranscriptAnalysisResponse {
  success: boolean;
  language: string;
  intent: IntentResult;
  summary: string;
  sentiment: SentimentResult;
  priority: PriorityResult;
  metadata?: AnalysisMetadata;
}

export interface FullPipelineResult {
  transcription: TranscriptionResponse;
  processing: TranscriptProcessingResponse;
  analysis: TranscriptAnalysisResponse;
}

export const apiAiService = {
  /**
   * Phase 1: Check operational health of AI Engine backend.
   */
  async checkHealth(): Promise<HealthResponse> {
    const res = await fetch(`${AI_ENGINE_BASE_URL}/health`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      throw new Error(`AI Engine health check failed (HTTP ${res.status})`);
    }
    return res.json();
  },

  /**
   * Phase 2: Transcribe uploaded audio file using Faster Whisper.
   */
  async transcribeAudio(file: File | Blob, language?: string): Promise<TranscriptionResponse> {
    const formData = new FormData();
    const filename = file instanceof File ? file.name : "recording.wav";
    formData.append("file", file, filename);
    if (language) {
      formData.append("language", language);
    }

    const res = await fetch(`${AI_ENGINE_BASE_URL}/transcribe`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.message || `Audio transcription failed (HTTP ${res.status})`);
    }

    return res.json();
  },

  /**
   * Phase 3: Normalize whitespace, segment sentences, and extract deterministic metadata.
   */
  async processTranscript(transcript: string, language: string = "en", callId?: string): Promise<TranscriptProcessingResponse> {
    const res = await fetch(`${AI_ENGINE_BASE_URL}/process-transcript`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transcript,
        language,
        call_id: callId,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.message || `Transcript processing failed (HTTP ${res.status})`);
    }

    return res.json();
  },

  /**
   * Phase 4: Intent classification, factual summarization, sentiment, and priority triage.
   */
  async analyzeTranscript(transcript: string, language: string = "en", callId?: string): Promise<TranscriptAnalysisResponse> {
    const res = await fetch(`${AI_ENGINE_BASE_URL}/analyze-transcript`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transcript,
        language,
        call_id: callId,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.message || `AI Intelligence analysis failed (HTTP ${res.status})`);
    }

    return res.json();
  },

  /**
   * End-to-end pipeline: Audio -> Transcription (P2) -> Segmentation (P3) -> AI Analysis (P4).
   */
  async processFullCallPipeline(file: File | Blob, language: string = "en"): Promise<FullPipelineResult> {
    // 1. Phase 2: Transcribe
    const transcription = await this.transcribeAudio(file, language);

    // 2. Phase 3: Process & Segment
    const processing = await this.processTranscript(transcription.transcript, transcription.language || language);

    // 3. Phase 4: Intelligence Analysis
    const analysis = await this.analyzeTranscript(processing.normalized_transcript, processing.language);

    return {
      transcription,
      processing,
      analysis,
    };
  },
};
