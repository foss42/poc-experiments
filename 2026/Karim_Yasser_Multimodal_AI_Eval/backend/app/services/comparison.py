"""Response comparison and metric calculation for AI evaluation.

Implements a MUSE-inspired five-level response quality taxonomy replacing
the naive binary pass/fail approach. Produces dual metrics (Hard Score /
Soft Score) and a Gray Zone Width (GZW) that quantifies near-misses.

Score Levels (inspired by MUSE arXiv:2603.02482):
    5 - FULL_MATCH       : exact or semantic match with expected output
    4 - PARTIAL_MATCH    : expected answer found within a longer response
    3 - INDIRECT_MATCH   : topically relevant but doesn't directly answer
    2 - MISMATCH         : on-topic but factually wrong
    1 - NON_RESPONSIVE   : irrelevant, error, or empty output

Dual Metrics:
    hard_score  = % of items at level 5 (Full Match only)
    soft_score  = % of items at level 4 or 5 (Full + Partial Match)
    gray_zone_width (GZW) = soft_score - hard_score
        A high GZW means the model understands the domain but lacks
        precision—far more actionable than a single accuracy number.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from enum import IntEnum


# ---------------------------------------------------------------------------
# Five-Level Response Quality Taxonomy
# ---------------------------------------------------------------------------

class ScoreLevel(IntEnum):
    NON_RESPONSIVE  = 1  # irrelevant, error, or empty
    MISMATCH        = 2  # on-topic but wrong
    INDIRECT_MATCH  = 3  # relevant but doesn't directly answer
    PARTIAL_MATCH   = 4  # correct answer buried in a longer response
    FULL_MATCH      = 5  # exact or semantic match


SCORE_LABELS: dict[ScoreLevel, str] = {
    ScoreLevel.NON_RESPONSIVE : "Non-Responsive",
    ScoreLevel.MISMATCH       : "Mismatch",
    ScoreLevel.INDIRECT_MATCH : "Indirect Match",
    ScoreLevel.PARTIAL_MATCH  : "Partial Match",
    ScoreLevel.FULL_MATCH     : "Full Match",
}


@dataclass
class ScoreResult:
    """Result of scoring a single evaluation item."""
    level: ScoreLevel
    label: str
    is_hard_match: bool   # True only at FULL_MATCH (level 5)
    is_soft_match: bool   # True at PARTIAL_MATCH or FULL_MATCH (level 4-5)


# ---------------------------------------------------------------------------
# Text normalisation helpers
# ---------------------------------------------------------------------------

def _normalize(text: str) -> str:
    """Normalize a string: lowercase, strip whitespace and trailing punctuation."""
    result = text.strip().lower()
    result = re.sub(r'[.,!?;:]+$', '', result)
    return result


def _is_non_responsive(actual: str) -> bool:
    """Detect error outputs, empty strings, or refusals."""
    if not actual or not actual.strip():
        return True
    lower = actual.lower()
    if lower.startswith("[error]"):
        return True
    non_responsive_signals = [
        "i cannot", "i can't", "i'm unable", "i am unable",
        "as an ai", "i don't have information",
    ]
    return any(signal in lower for signal in non_responsive_signals)


# ---------------------------------------------------------------------------
# Core scorer
# ---------------------------------------------------------------------------

def score_item(
    expected_list: list[str],
    actual: str,
) -> ScoreResult:
    """Score a single (expected_list, actual) pair using the five-level taxonomy.

    Args:
        expected_list: One or more acceptable expected answers.
        actual:        The model's actual response.

    Returns:
        A ScoreResult with level, label, and dual-metric booleans.
    """
    # Level 1: Non-Responsive
    if _is_non_responsive(actual):
        lv = ScoreLevel.NON_RESPONSIVE
        return ScoreResult(lv, SCORE_LABELS[lv], False, False)

    norm_actual = _normalize(actual)

    for expected in expected_list:
        norm_expected = _normalize(expected)

        # Level 5: Full Match — exact normalized equality
        if norm_expected == norm_actual:
            lv = ScoreLevel.FULL_MATCH
            return ScoreResult(lv, SCORE_LABELS[lv], True, True)

    # Level 4: Partial Match — expected answer substring of actual response
    # (the model gave the right answer but with extra verbiage)
    for expected in expected_list:
        norm_expected = _normalize(expected)
        if norm_expected in norm_actual:
            lv = ScoreLevel.PARTIAL_MATCH
            return ScoreResult(lv, SCORE_LABELS[lv], False, True)

    # Level 3: Indirect Match — actual is a substring of expected
    # (the model gave a partial fragment that is part of the correct answer)
    for expected in expected_list:
        norm_expected = _normalize(expected)
        if norm_actual in norm_expected and len(norm_actual) > 2:
            lv = ScoreLevel.INDIRECT_MATCH
            return ScoreResult(lv, SCORE_LABELS[lv], False, False)

    # Levels 1-2 require semantic understanding beyond string matching.
    # We default to MISMATCH (level 2) when the response is on-topic but wrong.
    lv = ScoreLevel.MISMATCH
    return ScoreResult(lv, SCORE_LABELS[lv], False, False)


# ---------------------------------------------------------------------------
# Batch scoring
# ---------------------------------------------------------------------------

def batch_score(
    pairs: list[tuple[list[str], str]],
) -> list[ScoreResult]:
    """Score a batch of (expected_list, actual) pairs.

    Returns a list of ScoreResult objects, one per pair.
    """
    return [score_item(expected_list, actual) for expected_list, actual in pairs]


# ---------------------------------------------------------------------------
# Dual-metric aggregation  (Hard Score / Soft Score / GZW)
# ---------------------------------------------------------------------------

def calculate_metrics(
    score_results: list[ScoreResult],
    latencies: list[float],
) -> dict:
    """Calculate dual-metric evaluation statistics.

    Returns:
        hard_score       – % of items at FULL_MATCH (level 5)
        soft_score       – % of items at PARTIAL_MATCH or FULL_MATCH (4-5)
        gray_zone_width  – soft_score - hard_score (quantifies near-misses)
        avg_latency_ms   – mean response latency
        total_items      – total number of evaluated items
        hard_count       – raw count of Full Match items
        soft_count        – raw count of Full + Partial Match items
        level_distribution – count per score level (1-5)
    """
    n = len(score_results)
    if n == 0:
        return {
            "hard_score": 0.0,
            "soft_score": 0.0,
            "gray_zone_width": 0.0,
            "avg_latency_ms": 0.0,
            "total_items": 0,
            "hard_count": 0,
            "soft_count": 0,
            "level_distribution": {str(lv.value): 0 for lv in ScoreLevel},
        }

    hard_count = sum(1 for r in score_results if r.is_hard_match)
    soft_count = sum(1 for r in score_results if r.is_soft_match)
    hard_score = hard_count / n
    soft_score = soft_count / n
    gray_zone_width = soft_score - hard_score

    avg_latency = sum(latencies) / len(latencies) if latencies else 0.0

    level_distribution = {str(lv.value): 0 for lv in ScoreLevel}
    for r in score_results:
        level_distribution[str(r.level.value)] += 1

    return {
        "hard_score": hard_score,
        "soft_score": soft_score,
        "gray_zone_width": gray_zone_width,
        "avg_latency_ms": avg_latency,
        "total_items": n,
        "hard_count": hard_count,
        "soft_count": soft_count,
        "level_distribution": level_distribution,
    }


# ---------------------------------------------------------------------------
# Legacy compatibility shim
# ---------------------------------------------------------------------------

def compare_response(expected: str, actual: str, mode: str = "normalized") -> bool:
    """Legacy binary comparison. Prefer score_item() for new code."""
    result = score_item([expected], actual)
    if mode == "exact":
        return result.level == ScoreLevel.FULL_MATCH and _normalize(expected) == _normalize(actual)
    return result.is_soft_match


def batch_compare(pairs: list[tuple[list[str], str]], mode: str = "normalized") -> list[bool]:
    """Legacy binary batch comparison. Prefer batch_score() for new code."""
    return [compare_response(exp_list[0] if exp_list else "", actual, mode)
            for exp_list, actual in pairs]
