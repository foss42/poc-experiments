import asyncio
from typing import List, Dict, Any
from ..adapters.base import AIProviderAdapter
from .metrics import (
    calculate_accuracy,
    calculate_trajectory_fidelity_score,
    summarize_latencies,
)


class EvalOrchestrator:
    """Routes eval jobs to the correct runner and aggregates results.

    Concurrent execution across providers via asyncio.gather.
    One provider failure does NOT kill other providers (return_exceptions=True).
    """

    async def run_text_eval(
        self,
        provider: AIProviderAdapter,
        dataset: List[Dict],  # [{prompt, ground_truth}, ...]
    ) -> Dict[str, Any]:
        """Run MMLU-style text eval against a single provider."""
        tasks = [
            provider.generate_response(item["prompt"])
            for item in dataset
        ]
        responses = await asyncio.gather(*tasks, return_exceptions=True)

        predictions, latencies, costs, tokens = [], [], [], []
        for resp in responses:
            if isinstance(resp, Exception):
                predictions.append("ERROR")
                latencies.append(0.0)
                costs.append(0.0)
                tokens.append(0)
            else:
                predictions.append(resp.get("content", ""))
                latencies.append(resp.get("latency_ms", 0.0))
                costs.append(resp.get("cost_usd", 0.0))
                tokens.append(resp.get("tokens_used", 0))

        ground_truth = [item.get("ground_truth", "") for item in dataset]

        return {
            "provider": provider.get_provider_name(),
            "modality": "text",
            "num_samples": len(dataset),
            "accuracy": calculate_accuracy(predictions, ground_truth),
            "latency": summarize_latencies([l for l in latencies if l > 0]),
            "total_cost_usd": round(sum(costs), 6),
            "total_tokens": sum(tokens),
            "per_sample_results": [
                {
                    "prompt": dataset[i]["prompt"],
                    "prediction": predictions[i],
                    "ground_truth": ground_truth[i],
                    "correct": predictions[i].strip().upper() == ground_truth[i].strip().upper(),
                    "latency_ms": latencies[i],
                }
                for i in range(len(dataset))
            ],
        }

    async def run_agent_eval(
        self,
        provider: AIProviderAdapter,
        tasks: List[Dict],  # [{prompt, expected_tool_sequence, tools_spec}, ...]
    ) -> Dict[str, Any]:
        """Run multi-turn tool-call agent eval against a single provider."""
        all_results = []

        for task in tasks:
            try:
                response = await provider.generate_response(
                    prompt=task["prompt"],
                    tools=task.get("tools_spec", []),
                )
                actual_trace = [
                    {
                        "name": tc["name"],
                        "arguments_valid": True,  # schema validation future work
                        "arguments": tc.get("arguments", "{}"),
                    }
                    for tc in (response.get("tool_calls") or [])
                ]
                tfs = calculate_trajectory_fidelity_score(
                    actual_trace=actual_trace,
                    gold_standard=task.get("expected_tool_sequence", []),
                )
                all_results.append({
                    "task": task["prompt"][:80],
                    "trajectory_fidelity_score": tfs,
                    "actual_trace": actual_trace,
                    "expected_sequence": task.get("expected_tool_sequence", []),
                    "latency_ms": response.get("latency_ms", 0.0),
                    "passed": tfs >= 0.8,
                })
            except Exception as e:
                all_results.append({
                    "task": task["prompt"][:80],
                    "trajectory_fidelity_score": 0.0,
                    "actual_trace": [],
                    "expected_sequence": task.get("expected_tool_sequence", []),
                    "latency_ms": 0.0,
                    "passed": False,
                    "error": str(e),
                })

        n = max(len(all_results), 1)
        avg_tfs = round(sum(r["trajectory_fidelity_score"] for r in all_results) / n, 4)
        completion_rate = round(sum(1 for r in all_results if r["passed"]) / n, 4)

        return {
            "provider": provider.get_provider_name(),
            "modality": "agent",
            "num_tasks": len(tasks),
            "mean_trajectory_fidelity_score": avg_tfs,
            "task_completion_rate": completion_rate,
            "latency": summarize_latencies([r["latency_ms"] for r in all_results if r["latency_ms"] > 0]),
            "total_cost_usd": 0.0,
            "total_tokens": 0,
            "per_task_results": all_results,
        }

    async def run_providers_concurrently(
        self,
        providers: List[AIProviderAdapter],
        dataset: List[Dict],
        modality: str = "text",
    ) -> List[Dict]:
        """Run eval across multiple providers concurrently.

        Uses asyncio.gather with return_exceptions=True — one provider failure
        does NOT kill results from other providers.
        """
        if modality == "agent":
            runner_tasks = [self.run_agent_eval(p, dataset) for p in providers]
        else:
            runner_tasks = [self.run_text_eval(p, dataset) for p in providers]

        results = await asyncio.gather(*runner_tasks, return_exceptions=True)

        output = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                output.append({
                    "provider": providers[i].get_provider_name(),
                    "error": str(result),
                    "modality": modality,
                })
            else:
                output.append(result)
        return output
