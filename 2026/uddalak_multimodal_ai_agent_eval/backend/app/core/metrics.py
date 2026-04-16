"""
Metrics engine — pure functions, no I/O, no side effects.
All functions are deterministic and testable in isolation.
"""
import numpy as np
from math import comb
from typing import List


def calculate_accuracy(predictions: List[str], ground_truth: List[str]) -> float:
    """Exact-match accuracy for MCQ benchmarks (MMLU-style).

    Comparison is case-insensitive and strips whitespace.
    Returns 0.0 for empty input.
    """
    if not predictions or not ground_truth:
        return 0.0
    correct = sum(
        p.strip().upper() == g.strip().upper()
        for p, g in zip(predictions, ground_truth)
    )
    return round(correct / len(predictions), 4)


def calculate_wer(reference: str, hypothesis: str) -> float:
    """Word Error Rate via dynamic programming — for ASR (audio) evaluation.

    WER = (Substitutions + Deletions + Insertions) / Words in reference.
    Returns 1.0 if reference is empty (undefined WER treated as max error).
    """
    r = reference.lower().split()
    h = hypothesis.lower().split()
    if not r:
        return 1.0
    d = np.zeros((len(r) + 1, len(h) + 1), dtype=np.uint16)
    for i in range(len(r) + 1):
        d[i][0] = i
    for j in range(len(h) + 1):
        d[0][j] = j
    for i in range(1, len(r) + 1):
        for j in range(1, len(h) + 1):
            if r[i - 1] == h[j - 1]:
                d[i][j] = d[i - 1][j - 1]
            else:
                d[i][j] = 1 + min(d[i - 1][j - 1], d[i][j - 1], d[i - 1][j])
    return round(int(d[len(r)][len(h)]) / len(r), 4)


def calculate_trajectory_fidelity_score(
    actual_trace: List[dict],
    gold_standard: List[str],
) -> float:
    """Trajectory Fidelity Score (TFS) — original metric from the GSoC proposal.

    Measures how well an agent's actual tool-call sequence matches the expected
    (gold-standard) sequence. Both order and validity matter.

    Args:
        actual_trace: List of dicts with keys 'name' (str) and 'arguments_valid' (bool).
        gold_standard: List of expected tool names in order.

    Returns:
        Float 0.0–1.0. Returns 1.0 if gold_standard is empty (vacuously correct).
    """
    if not gold_standard:
        return 1.0
    correct = sum(
        1
        for i, tool_name in enumerate(gold_standard)
        if i < len(actual_trace)
        and actual_trace[i].get("name") == tool_name
        and actual_trace[i].get("arguments_valid", True)
    )
    return round(correct / len(gold_standard), 4)


def calculate_pass_at_k(results: List[bool], k: int = 1) -> float:
    """pass@k metric for code generation tasks.

    Args:
        results: List of bools — True if the sample passed, False otherwise.
        k: Number of attempts to consider.

    Returns:
        Float 0.0–1.0.
    """
    if not results:
        return 0.0
    n = len(results)
    c = sum(results)
    if n - c < k:
        return 1.0
    return round(1 - comb(n - c, k) / comb(n, k), 4)


def summarize_latencies(latencies: List[float]) -> dict:
    """Compute mean, p50, p95, p99 latency statistics.

    Args:
        latencies: List of latency values in milliseconds.

    Returns:
        Dict with keys: mean_ms, p50_ms, p95_ms, p99_ms.
    """
    if not latencies:
        return {"mean_ms": 0.0, "p50_ms": 0.0, "p95_ms": 0.0, "p99_ms": 0.0}
    arr = np.array(latencies, dtype=float)
    return {
        "mean_ms": round(float(np.mean(arr)), 1),
        "p50_ms": round(float(np.percentile(arr, 50)), 1),
        "p95_ms": round(float(np.percentile(arr, 95)), 1),
        "p99_ms": round(float(np.percentile(arr, 99)), 1),
    }
