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


# ─── Multimodal evaluation system prompt ──────────────────────────────────────

MULTIMODAL_SYSTEM_PROMPT = (
    "You are a precise evaluation assistant analysing visual or document content. "
    "You must answer with the absolute shortest, most direct description possible. "
    "Give ONLY the concise, accurate description of what is shown. "
    "Do NOT add any conversational filler, explanations, markdown formatting, or extra words. "
    "Be very specific and relevant to what you observe."
)


async def run_multimodal_evaluation(run_id: str, session_factory) -> None:
    """Execute a multimodal evaluation run asynchronously.

    Each dataset item contains a media reference (URL or file path) and
    expected descriptions. The model receives the media with a prompt and
    must describe what it sees. The response is scored against expected
    output using the MUSE five-level taxonomy.
    """
    from app.services.media_service import resolve_media_item, MediaError

    async with session_factory() as session:
        run = await session.get(EvaluationRun, run_id)
        if not run:
            logger.error(f"Multimodal evaluation run {run_id} not found.")
            return

        dataset = await session.get(Dataset, run.dataset_id)
        model_config = await session.get(ModelConfig, run.model_config_id)

        if not dataset or not model_config:
            run.status = "failed"
            await session.commit()
            return

        run.status = "running"
        await session.commit()

        # Load dataset items
        try:
            items = load_dataset_items(dataset.file_path)
        except Exception as e:
            logger.error(f"Failed to load multimodal dataset: {e}")
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
            async def fetch_multimodal_item(index, item):
                prompt = item.get("input", "Describe this concisely and accurately")
                media_url_display = ""
                try:
                    # Resolve media (image bytes, video frames, PDF pages)
                    image_list, media_type, media_url_display = await resolve_media_item(item)

                    # Determine if we should pass URL directly for single images
                    direct_url = item.get("media_url", "") if (
                        media_type == "image" and len(image_list) == 1 and item.get("media_url")
                    ) else None

                    logger.info(
                        f"Task {index}: sending {media_type} "
                        f"({len(image_list)} image(s)) to model..."
                    )

                    actual, latency = await connector.send_multimodal_request(
                        text=prompt,
                        image_bytes=image_list[0] if image_list else b"",
                        image_media_type="image/jpeg",
                        system_prompt=MULTIMODAL_SYSTEM_PROMPT,
                        image_list=image_list if len(image_list) > 1 else None,
                        image_url=direct_url,
                    )
                    logger.info(f"Task {index} received response in {latency:.0f}ms.")
                    return index, actual, latency, media_url_display

                except MediaError as e:
                    logger.warning(f"Item {index} media error: {e}")
                    return index, f"[ERROR] {e}", 0.0, media_url_display
                except ConnectorError as e:
                    logger.warning(f"Item {index} connector error: {e}")
                    return index, f"[ERROR] {e}", 0.0, media_url_display
                except Exception as e:
                    logger.error(f"Item {index} unexpected error: {e}")
                    return index, f"[ERROR] {e}", 0.0, media_url_display

            logger.info(f"Run {run_id}: Dispatching {len(items)} multimodal tasks...")
            tasks = [fetch_multimodal_item(i, item) for i, item in enumerate(items)]
            api_results = [None] * len(items)
            completed_count = 0

            for f in asyncio.as_completed(tasks):
                idx, actual, latency, media_url_display = await f
                api_results[idx] = (actual, latency, media_url_display)
                completed_count += 1

                run.completed_items = completed_count
                await session.commit()

            # Score against expected outputs using existing MUSE taxonomy
            pairs = []
            latencies = []
            for i, (actual, latency, _) in enumerate(api_results):
                expected = items[i]["expected_output"]
                expected_list = [expected] if isinstance(expected, str) else expected
                pairs.append((expected_list, actual))
                latencies.append(latency)

            score_results = batch_score(pairs)
            metrics = calculate_metrics(score_results, latencies)

            # Store individual results
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
                    input=items[i].get("input", "Describe this concisely and accurately"),
                    expected_output=expected_str,
                    actual_output=actual,
                    media_url=api_results[i][2],  # media_url_display
                    score_level=int(score_result.level),
                    score_label=score_result.label,
                    hard_score=1.0 if score_result.is_hard_match else 0.0,
                    soft_score=1.0 if score_result.is_soft_match else 0.0,
                    latency_ms=latencies[i],
                )
                session.add(result)

            # Update run-level metrics
            run.completed_items = len(items)
            run.hard_score = float(metrics["hard_score"])
            run.soft_score = float(metrics["soft_score"])
            run.gray_zone_width = float(metrics["gray_zone_width"])
            run.avg_latency_ms = float(metrics["avg_latency_ms"])
            run.status = "completed"
            run.completed_at = datetime.now(timezone.utc).isoformat()

            logger.info(
                f"Multimodal run {run_id} completed — "
                f"Hard: {metrics['hard_score']:.1%}, "
                f"Soft: {metrics['soft_score']:.1%}, "
                f"GZW: {metrics['gray_zone_width']:.1%}"
            )

        except Exception as e:
            import traceback
            logger.error(f"Multimodal run {run_id} failed: {e}")
            logger.error(traceback.format_exc())
            run.status = "failed"
            run.completed_at = datetime.now(timezone.utc).isoformat()

        finally:
            await session.commit()
            if hasattr(connector, "close"):
                await connector.close()
