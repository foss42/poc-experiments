import asyncio
import logging
import json
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models import EvaluationRun, EvaluationResult, Dataset, ModelConfig
from app.services.connector import create_connector, ConnectorError
from app.services.dataset_service import load_dataset_items
from app.services.comparison import batch_score, calculate_metrics

logger = logging.getLogger(__name__)


async def run_evaluation(run_id: str, session_factory) -> None:
    """Execute an evaluation run asynchronously.

    Implements a MUSE-inspired (arXiv:2603.02482) run-centric workflow:
    every step is persisted to the run entity, and scoring uses the
    five-level quality taxonomy with dual-metric output (Hard Score /
    Soft Score / Gray Zone Width) instead of a binary pass/fail flag.
    """
    async with session_factory() as session:
        # Load the run with associated dataset and model config
        run = await session.get(EvaluationRun, run_id)
        if not run:
            logger.error(f"Evaluation run {run_id} not found.")
            return

        dataset = await session.get(Dataset, run.dataset_id)
        model_config = await session.get(ModelConfig, run.model_config_id)

        if not dataset or not model_config:
            run.status = "failed"
            await session.commit()
            return

        # Update status to running
        run.status = "running"
        await session.commit()

        # Load dataset items
        try:
            items = load_dataset_items(dataset.file_path)
        except Exception as e:
            logger.error(f"Failed to load dataset: {e}")
            run.status = "failed"
            await session.commit()
            return

        run.total_items = len(items)
        await session.commit()

        # Create connector
        connector = create_connector(
            provider=model_config.provider,
            base_url=model_config.base_url,
            api_key=model_config.api_key,
            model_name=model_config.model_name,
            temperature=model_config.temperature,
            max_tokens=model_config.max_tokens,
        )

        try:
            # 1. Fetch AI model responses concurrently
            async def fetch_item(index, item):
                prompt = item["input"]
                logger.info(f"Task {index} preparing to send request to LM Studio...")
                try:
                    actual, latency = await connector.send_request(prompt)
                    logger.info(f"Task {index} received response in {latency}ms.")
                    return index, actual, latency
                except ConnectorError as e:
                    logger.warning(f"Item {index} failed with ConnectorError: {e}")
                    return index, f"[ERROR] {e}", 0.0
                except Exception as e:
                    logger.error(f"Item {index} failed with unexpected exception: {e}")
                    return index, f"[ERROR] {e}", 0.0

            logger.info(f"Run {run_id}: Dispatching {len(items)} tasks incrementally...")
            tasks = [fetch_item(i, item) for i, item in enumerate(items)]
            api_results = [None] * len(items)
            completed_count = 0

            for f in asyncio.as_completed(tasks):
                idx, actual, latency = await f
                logger.info(f"Run {run_id}: Task {idx} yielded from as_completed.")
                api_results[idx] = (actual, latency)
                completed_count += 1
                
                # Incrementally update database progress for SSE streaming
                logger.info(f"Run {run_id}: Committing progress {completed_count}/{len(items)} to DB...")
                run.completed_items = completed_count
                await session.commit()
                logger.info(f"Run {run_id}: DB commit successful.")
            # 2. Extract (expected_list, actual) pairs and latencies
            pairs = []
            latencies = []
            for i, (actual, latency) in enumerate(api_results):
                expected = items[i]["expected_output"]
                expected_list = [expected] if isinstance(expected, str) else expected
                pairs.append((expected_list, actual))
                latencies.append(latency)

            # 3. Five-level batch scoring (MUSE taxonomy)
            score_results = batch_score(pairs)

            # 4. Dual-metric aggregation: Hard Score / Soft Score / GZW
            metrics = calculate_metrics(score_results, latencies)

            # 5. Store individual EvaluationResult rows with full taxonomy data
            for i, (score_result, (expected_list, actual)) in enumerate(
                zip(score_results, pairs)
            ):
                original_expected = items[i]["expected_output"]
                expected_str = (
                    json.dumps(original_expected)
                    if isinstance(original_expected, list)
                    else original_expected
                )

                result = EvaluationResult(
                    run_id=run_id,
                    input=items[i]["input"],
                    expected_output=expected_str,
                    actual_output=actual,
                    # Five-level taxonomy fields
                    score_level=int(score_result.level),
                    score_label=score_result.label,
                    hard_score=1.0 if score_result.is_hard_match else 0.0,
                    soft_score=1.0 if score_result.is_soft_match else 0.0,
                    latency_ms=latencies[i],
                )
                session.add(result)

            # 6. Update run-level dual metrics
            run.completed_items = len(items)
            run.hard_score = float(metrics["hard_score"])
            run.soft_score = float(metrics["soft_score"])
            run.gray_zone_width = float(metrics["gray_zone_width"])
            run.avg_latency_ms = float(metrics["avg_latency_ms"])
            run.status = "completed"
            run.completed_at = datetime.now(timezone.utc).isoformat()

            logger.info(
                f"Run {run_id} completed — "
                f"Hard: {metrics['hard_score']:.1%}, "
                f"Soft: {metrics['soft_score']:.1%}, "
                f"GZW: {metrics['gray_zone_width']:.1%}"
            )

        except Exception as e:
            import traceback
            logger.error(f"Evaluation run {run_id} completely failed with exception: {e}")
            logger.error(traceback.format_exc())
            run.status = "failed"
            run.completed_at = datetime.now(timezone.utc).isoformat()

        finally:
            logger.info(f"Run {run_id}: Entering finally block, executing final commit.")
            await session.commit()
            if hasattr(connector, "close"):
                await connector.close()
