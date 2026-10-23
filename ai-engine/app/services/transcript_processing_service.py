"""Transcript Processing Engine for CareOps AI Engine (Phase 3).

Provides a self-contained, deterministic pipeline that accepts a raw healthcare
call transcript and returns:
  - Conservative whitespace normalization (meaning-safe)
  - Sentence segmentation with character offsets into the normalized transcript
  - Basic deterministic metadata (character count, word count, sentence count)

Design principles:
  - Uses Python stdlib only (re, unicodedata, time) — no LLM, no external API.
  - Normalization NEVER changes the semantic content of the transcript.
    In particular, negations such as "not", "never", "without", and "denies"
    are preserved exactly.
  - Offsets always reference the normalized_transcript string, not the original.
  - Healthcare transcripts are not logged to avoid leaking PHI.
  - Speaker identity is NOT inferred from sentence order (no diarization).

Known limitations:
  - Sentence segmentation uses a regex heuristic tuned for English.  It handles
    common abbreviations (Mr., Dr., etc.) but will not be perfect for every
    real-world transcript.
  - Hindi sentence boundaries (|, ।) are recognised, but segmentation quality
    for long mixed-script passages may be imperfect.
  - Kannada and other abugida scripts do not use space-delimited words, so
    word_count is a whitespace-token approximation for those languages.
  - Speaker diarization is not implemented in Phase 3.
  - Full PII masking is not implemented in Phase 3.
"""

import logging
import re
import time
import unicodedata
from typing import List, Optional, Tuple

from app.models.schemas import (
    TranscriptMetadata,
    TranscriptProcessingResponse,
    TranscriptSentence,
)

logger = logging.getLogger("careops.transcript_processing")


# ============================================================================
# Normalisation
# ============================================================================

# Common English and medical abbreviations that should NOT trigger a sentence
# split even when followed by a period.
_ABBREVIATIONS: frozenset = frozenset(
    [
        # Titles / honorifics
        "mr", "mrs", "ms", "dr", "prof", "sr", "jr", "rev", "gen", "sgt",
        "cpl", "pvt", "capt", "col", "lt", "maj",
        # Medical / clinical
        "approx", "dept", "hosp", "no", "vol", "vs", "fig", "ref", "max",
        "min", "avg", "std", "ext", "cont", "div", "corp", "inc", "ltd",
        "est", "etc", "govt", "assoc", "mgr", "appt",
        # Units of measurement
        "mg", "ml", "kg", "km", "lbs", "oz", "ft", "in",
        # Month abbreviations
        "jan", "feb", "mar", "apr", "jun", "jul", "aug", "sep", "oct",
        "nov", "dec",
        # Misc
        "e.g", "i.e", "vs", "st", "ave",
    ]
)


def normalize_transcript(raw: str) -> str:
    """Apply conservative, meaning-safe whitespace normalization.

    Rules applied (in order):
    1. Remove leading / trailing whitespace.
    2. Normalize tab characters to a single space.
    3. Collapse runs of two or more spaces into a single space.
    4. Normalize CRLF and bare CR line endings to LF.
    5. Collapse runs of three or more blank lines into a single blank line.
    6. Strip trailing whitespace from each line.

    NOT applied:
    - Spelling corrections
    - Punctuation replacement
    - Translation or transliteration
    - PII masking
    - Removal of negation words
    """
    # Step 1: Replace tabs with spaces
    text = raw.replace("\t", " ")

    # Step 2: Normalize CRLF / CR to LF
    text = text.replace("\r\n", "\n").replace("\r", "\n")

    # Step 3: Strip trailing whitespace from every line
    lines = [line.rstrip() for line in text.split("\n")]
    text = "\n".join(lines)

    # Step 4: Collapse internal runs of multiple spaces into one
    #         (Use a line-by-line pass to preserve intentional line breaks)
    processed_lines = []
    for line in text.split("\n"):
        processed_lines.append(re.sub(r" {2,}", " ", line))
    text = "\n".join(processed_lines)

    # Step 5: Collapse 3+ consecutive blank lines into a single blank line
    text = re.sub(r"\n{3,}", "\n\n", text)

    # Step 6: Strip leading/trailing whitespace from the whole string
    text = text.strip()

    return text


# ============================================================================
# Sentence Segmentation
# ============================================================================

def _is_abbreviation(word: str) -> bool:
    """Return True if the token (lowercase, no trailing period) is a known abbreviation."""
    return word.lower().rstrip(".") in _ABBREVIATIONS


def segment_sentences(text: str) -> List[Tuple[str, int, int]]:
    """Split *text* into sentences, returning (sentence_text, start_char, end_char).

    Algorithm:
    - Splits on sentence-terminating punctuation: period, exclamation mark,
      question mark, Hindi danda (।), and double danda (॥).
    - Skips known abbreviations before a period so that "Dr. Smith" is not split.
    - Handles sequences of terminators (e.g. "Really?!" counts as one boundary).
    - start_char and end_char are offsets into *text* (the normalized transcript).

    Limitations:
    - The abbreviation list covers common English medical terms; it is not
      exhaustive.  Unusual abbreviations may trigger false splits.
    - Hindi / Kannada sentence detection relies on danda characters and falls
      back to the same period logic.  Quality may be lower for complex passages.
    - The segmenter does not perform coreference resolution or deep parsing.
    """
    if not text or not text.strip():
        return []

    # Regex that matches one or more sentence terminators
    # Terminators: . ! ? ।  ॥
    TERMINATORS = r"[.!?।॥]+"

    sentences: List[Tuple[str, int, int]] = []
    start = 0
    length = len(text)

    for match in re.finditer(TERMINATORS, text):
        end = match.end()
        candidate = text[start:end].strip()

        if not candidate:
            start = end
            continue

        # --- Abbreviation guard for lone period (.) ---
        # Only suppress split if the terminator is a single period (not ?!/।)
        terminator_text = match.group()
        if terminator_text == ".":
            # Extract the word immediately before the period
            prefix_text = text[start : match.start()].rstrip()
            last_token = prefix_text.split()[-1] if prefix_text.split() else ""
            # Suppress split if:
            # (a) it is a known abbreviation, or
            # (b) the token itself looks like an abbreviation: single char or all caps initialism
            if _is_abbreviation(last_token) or (
                len(last_token) <= 2 and last_token.isalpha()
            ):
                continue  # Do not split here; keep accumulating

        # Accept the sentence
        sent_text = candidate
        # Locate the sentence in the original text for accurate offsets
        sent_start = text.index(sent_text, start) if sent_text in text[start:] else start
        sent_end = sent_start + len(sent_text)

        sentences.append((sent_text, sent_start, sent_end))
        start = end

    # Remainder: text after the last terminator (may not have a terminator)
    remainder = text[start:].strip()
    if remainder:
        rem_start = text.index(remainder, start) if remainder in text[start:] else start
        rem_end = rem_start + len(remainder)
        sentences.append((remainder, rem_start, rem_end))

    return sentences


# ============================================================================
# Metadata Calculation
# ============================================================================

# Languages where whitespace-based word-count is a reasonable approximation.
# For other scripts (e.g. Kannada/kn), we still produce a count but mark the
# field as approximate via the metadata docstring.
_SPACE_DELIMITED_LANGS = frozenset(["en", "hi"])


def compute_word_count(text: str, language: str) -> Optional[int]:
    """Return whitespace-based word count.

    For all supported languages, a whitespace split is returned.  The docstring
    on TranscriptMetadata clearly documents that this is an approximation for
    non-space-delimited scripts.  Returning None would require the caller to
    handle a nullable field; returning the approximate count with documentation
    is preferable for Phase 3.
    """
    if not text.strip():
        return 0
    return len(text.split())


def compute_character_count(text: str) -> int:
    """Return Unicode code-point count of *text* (not byte length)."""
    return len(text)


# ============================================================================
# Main Processing Service
# ============================================================================

class TranscriptProcessingError(Exception):
    """Base exception for transcript processing failures."""


class TranscriptProcessingService:
    """Normalise, segment, and compute metadata for a healthcare call transcript.

    This service is independently testable: it requires no AI model, no network
    access, and no disk I/O.  It operates entirely in memory using the Python
    standard library.

    Integration with Phase 2:
    Pass the ``transcript`` field from a ``TranscriptionResponse`` directly into
    ``process()``.  Example::

        transcription = await transcription_service.transcribe_audio(file)
        result = transcript_processing_service.process(
            transcript=transcription.transcript,
            language=transcription.language,
        )
    """

    def process(
        self,
        transcript: str,
        language: str = "en",
    ) -> TranscriptProcessingResponse:
        """Run the full Phase 3 processing pipeline.

        Args:
            transcript: The raw transcript text. Must be non-empty after stripping.
            language:   Validated language code (en | hi | kn).

        Returns:
            TranscriptProcessingResponse with normalization, segmentation, and
            metadata populated from the actual input.

        Raises:
            TranscriptProcessingError: If the transcript is empty or whitespace-only
                after the caller-side validation.  (The API layer validates first;
                this guard defends against direct service calls.)
        """
        t_start = time.perf_counter()

        # Guard: should already be validated by the request schema, but defend
        # against direct service usage.
        if not transcript or not transcript.strip():
            raise TranscriptProcessingError(
                "Transcript must not be empty or whitespace-only."
            )

        # ------------------------------------------------------------------ #
        # Step 1 – Preserve original
        # ------------------------------------------------------------------ #
        original_transcript = transcript  # Never mutated

        # ------------------------------------------------------------------ #
        # Step 2 – Conservative normalization
        # ------------------------------------------------------------------ #
        normalized = normalize_transcript(original_transcript)

        # ------------------------------------------------------------------ #
        # Step 3 – Sentence segmentation (on normalized text)
        # ------------------------------------------------------------------ #
        raw_sentences = segment_sentences(normalized)

        sentences: List[TranscriptSentence] = [
            TranscriptSentence(
                index=idx,
                text=sent_text,
                start_char=sent_start,
                end_char=sent_end,
            )
            for idx, (sent_text, sent_start, sent_end) in enumerate(raw_sentences)
        ]

        # ------------------------------------------------------------------ #
        # Step 4 – Metadata
        # ------------------------------------------------------------------ #
        char_count = compute_character_count(normalized)
        word_count = compute_word_count(normalized, language)
        sentence_count = len(sentences)
        is_empty = char_count == 0

        # Privacy-safe telemetry: log only counts, not content
        t_end = time.perf_counter()
        processing_time = round(t_end - t_start, 4)

        logger.info(
            "Transcript processing complete: lang=%s, chars=%d, words=%s, sentences=%d, time=%.4fs",
            language,
            char_count,
            word_count,
            sentence_count,
            processing_time,
        )

        metadata = TranscriptMetadata(
            character_count=char_count,
            word_count=word_count,
            sentence_count=sentence_count,
            is_empty=is_empty,
            processing_time_seconds=processing_time,
        )

        return TranscriptProcessingResponse(
            success=True,
            language=language,
            original_transcript=original_transcript,
            normalized_transcript=normalized,
            sentences=sentences,
            metadata=metadata,
        )


# Global service singleton (mirrors the transcription_service pattern)
transcript_processing_service = TranscriptProcessingService()
