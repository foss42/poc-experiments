"""VLM-as-a-Judge pipeline for multimodal generation evaluation.

This module implements Pipeline B of the dual-pipeline evaluation architecture:
Generation Evaluation (Text-In → Image/Audio-Out).

Unlike Pipeline A (Understanding Evaluation via lmms-eval / lm-harness), which
grades model comprehension of multimodal inputs, this pipeline grades the
*quality of generated artifacts* — images produced by DALL-E, Stable Diffusion
APIs, etc. — by delegating judgment to a strong Vision-Language Model (VLM).

Inspired by MUSE (arXiv:2603.02482): just as MUSE uses an LLM judge with a
five-level taxonomy to score model safety responses, this pipeline applies the
same five-level quality taxonomy (ScoreLevel) to generated media, scoring on
prompt alignment, subject fidelity, and completeness.

Flow (Image Generation evaluation):
    1. Flutter UI sends prompt → backend calls image generation API → gets bytes
    2. vlm_judge.grade_generated_image(prompt, image_bytes, judge_connector)
    3. VLM judge receives [prompt text] + [image bytes] and returns structured JSON
    4. JSON is mapped to ScoreLevel → ScoreResult → stored in EvaluationResult

Supported judges (via UniversalConnector): GPT-4o, Claude 3.5 Sonnet, or any
local Ollama vision model (e.g. llava, llava-phi3).
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass

from app.services.comparison import ScoreLevel, ScoreResult, SCORE_LABELS

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# VLM Judge grading prompts
# ---------------------------------------------------------------------------

_IMAGE_GRADING_PROMPT = """\
You are a strict multimodal evaluation judge scoring an AI-generated image.

Original prompt given to the image generation model:
"{prompt}"

Evaluate the generated image on the following five-level scale:
  5 (Full Match)     - Image fully and accurately realizes the prompt. All key subjects, actions, and style elements are present.
  4 (Partial Match)  - Main subject is correct but secondary details or style elements are missing or inaccurate.
  3 (Indirect Match) - Image is loosely related to the prompt topic but does not directly depict what was requested.
  2 (Mismatch)       - Image is completely wrong subject, or the correct subject is depicted in a completely wrong style/context.
  1 (Non-Responsive) - Image is blank, corrupted, filtered, or shows an error.

You MUST return valid JSON only. No explanation outside the JSON.
Return exactly: {{"score_level": <1-5>, "score_label": "<label>", "rationale": "<one sentence>"}}
"""

_AUDIO_GRADING_PROMPT = """\
You are a strict evaluation judge scoring an AI-generated audio transcription or TTS output.

Original prompt / expected text:
"{expected}"

Actual transcription / content of the generated audio:
"{actual_transcript}"

Evaluate using the following five-level scale:
  5 (Full Match)     - Transcription is essentially perfect (≤1 minor word error).
  4 (Partial Match)  - Transcription is mostly correct with a few word substitutions or insertions.
  3 (Indirect Match) - Audio is intelligible but conveys different content from the prompt.
  2 (Mismatch)       - Transcription is mostly wrong or incoherent relative to prompt.
  1 (Non-Responsive) - Audio is silent, unintelligible, or completely off-topic.

You MUST return valid JSON only. No explanation outside the JSON.
Return exactly: {{"score_level": <1-5>, "score_label": "<label>", "rationale": "<one sentence>"}}
"""


# ---------------------------------------------------------------------------
# Core grading functions
# ---------------------------------------------------------------------------

async def grade_generated_image(
    prompt: str,
    image_bytes: bytes,
    judge_connector,
) -> ScoreResult:
    """Grade a generated image using a VLM judge.

    Args:
        prompt:          The original text prompt sent to the image generation API.
        image_bytes:     Raw bytes of the generated image (JPEG or PNG).
        judge_connector: A connector instance with multimodal vision support
                         (e.g. OpenAIConnector pointed at gpt-4o, or llava via Ollama).

    Returns:
        A ScoreResult from the five-level taxonomy.
    """
    grading_prompt = _IMAGE_GRADING_PROMPT.format(prompt=prompt)

    try:
        # The connector must support multimodal inputs.
        # We send the grading text + raw image bytes as a multimodal message.
        response_text, _ = await judge_connector.send_multimodal_request(
            text=grading_prompt,
            image_bytes=image_bytes,
            image_media_type="image/jpeg",
        )
        return _parse_judge_response(response_text)

    except Exception as e:
        logger.warning(f"VLM judge failed for image grading: {e}. Defaulting to NON_RESPONSIVE.")
        lv = ScoreLevel.NON_RESPONSIVE
        return ScoreResult(lv, SCORE_LABELS[lv], False, False)


async def grade_generated_audio(
    expected_text: str,
    actual_transcript: str,
    judge_connector,
) -> ScoreResult:
    """Grade a TTS/audio generation result using a text-based LLM judge.

    For audio generation tasks, we first transcribe the audio (via Whisper or
    similar ASR) and then compare the transcript against the original prompt
    using the VLM judge. This function receives the already-transcribed text.

    Args:
        expected_text:      The original prompt or expected spoken content.
        actual_transcript:  The ASR-transcribed text from the generated audio.
        judge_connector:    A connector instance (text-only judge is sufficient here).

    Returns:
        A ScoreResult from the five-level taxonomy.
    """
    grading_prompt = _AUDIO_GRADING_PROMPT.format(
        expected=expected_text,
        actual_transcript=actual_transcript,
    )

    try:
        response_text, _ = await judge_connector.send_request(grading_prompt)
        return _parse_judge_response(response_text)

    except Exception as e:
        logger.warning(f"VLM judge failed for audio grading: {e}. Defaulting to NON_RESPONSIVE.")
        lv = ScoreLevel.NON_RESPONSIVE
        return ScoreResult(lv, SCORE_LABELS[lv], False, False)


# ---------------------------------------------------------------------------
# Response parsing
# ---------------------------------------------------------------------------

def _parse_judge_response(response_text: str) -> ScoreResult:
    """Parse the structured JSON response from the VLM judge into a ScoreResult.

    Handles cases where the model wraps JSON in markdown code fences.
    Falls back to NON_RESPONSIVE on any parse error.
    """
    # Strip markdown fences if present (```json ... ```)
    cleaned = response_text.strip()
    if cleaned.startswith("```"):
        lines = cleaned.splitlines()
        cleaned = "\n".join(lines[1:-1]) if len(lines) > 2 else cleaned

    try:
        data = json.loads(cleaned)
        level_int = int(data.get("score_level", 1))
        # Clamp to valid range
        level_int = max(1, min(5, level_int))
        lv = ScoreLevel(level_int)
        label = SCORE_LABELS[lv]
        is_hard = lv == ScoreLevel.FULL_MATCH
        is_soft = lv >= ScoreLevel.PARTIAL_MATCH
        return ScoreResult(lv, label, is_hard, is_soft)

    except (json.JSONDecodeError, KeyError, ValueError) as e:
        logger.warning(f"Failed to parse VLM judge JSON response: {e!r}. Raw: {response_text!r}")
        lv = ScoreLevel.NON_RESPONSIVE
        return ScoreResult(lv, SCORE_LABELS[lv], False, False)
