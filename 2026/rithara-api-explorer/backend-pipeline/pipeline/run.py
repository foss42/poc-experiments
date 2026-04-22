import asyncio
import argparse
import time
import sys
import os
import logging
import httpx
from httpx import AsyncClient
from typing import List, Dict, Any, Tuple
from datetime import datetime

# Import previous phases
from pipeline.fetcher import main as run_fetcher
from pipeline.parser import parse as run_parser
from pipeline.enricher import APIEnricher
from pipeline.template_generator import TemplateGenerator
from pipeline.validator import validate as run_validation
from pipeline.publisher import publish as run_publication

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

class Orchestrator:
    """Orchestrates the 6-phase API Marketplace pipeline."""

    def __init__(self, dry_run: bool = False):
        self.dry_run = dry_run
        self.stats = {
            "total_found": 0,
            "processed": 0,
            "published": 0,
            "failed": 0,
            "warnings": 0,
            "skipped": 0
        }
        self.failed_details = []
        self.start_time = time.time()

    async def process_api(self, api_id: str, source: str, semaphore: asyncio.Semaphore, client: AsyncClient):
        """
        Runs an API through Phases 2-5.
        
        Phase 1 (Fetcher) is handled before this in bulk.
        """
        async with semaphore:
            self.stats["processed"] += 1
            logger.info(f"--- Processing API: {api_id} ({source}) ---")
            
            try:
                # Phase 2: Parse
                base_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
                raw_path = os.path.join(base_path, "raw")
                
                # Detect the type based on whether the Fetcher saved it as .html or .json
                actual_source_type = "openapi"
                from pipeline.fetcher import make_safe_id
                safe_id = make_safe_id(api_id)
                if os.path.exists(os.path.join(raw_path, f"{safe_id}.html")):
                    actual_source_type = "html"
                
                parsed_api = run_parser(api_id, actual_source_type)
                if parsed_api.parse_errors:
                    raise Exception(f"Phase 2 (Parser) errors: {'; '.join(parsed_api.parse_errors)}")

                # Phase 3: Enrich
                from pipeline.enricher import run_enrichment
                enriched_api = await run_enrichment(api_id, parsed_api=parsed_api, client=client)
                
                if enriched_api.enrich_warnings:
                    self.stats["warnings"] += 1
                    for w in enriched_api.enrich_warnings:
                        logger.warning(f"[{api_id}] Enrichment Warning: {w}")

                # Phase 4: Template Generation
                templates_generated = TemplateGenerator.generate(enriched_api)
                if not templates_generated.templates:
                    raise Exception("Phase 4 (Generator) produced 0 templates")

                # Phase 5a: Validation
                validation_result = run_validation(templates_generated, enriched_api)
                if not validation_result.passed:
                    raise Exception(f"Phase 5a (Validator) rejected all templates: {', '.join(validation_result.rejected_templates)}")
                
                if validation_result.warnings:
                    self.stats["warnings"] += 1
                    for w in validation_result.warnings:
                        logger.warning(f"[{api_id}] Validation Warning: {w}")

                # Phase 5b: Publication
                if self.dry_run:
                    logger.info(f"[DRY-RUN] Would have published {len(validation_result.valid_templates)} templates for {api_id}")
                    self.stats["published"] += 1
                else:
                    success = run_publication(validation_result, enriched_api)
                    if success:
                        self.stats["published"] += 1
                    else:
                        raise Exception("Phase 5b (Publisher) failed to write files")

            except Exception as e:
                self.stats["failed"] += 1
                error_msg = str(e)
                self.failed_details.append(f"{api_id} ({error_msg})")
                logger.error(f"Failed to process {api_id}: {error_msg}")

    def print_summary(self):
        """Prints a human-readable summary of the pipeline run."""
        duration = time.time() - self.start_time
        mins, secs = divmod(int(duration), 60)
        
        print("\n" + "=" * 40)
        print("   API Dash Marketplace Sync Complete".center(40))
        print("=" * 40)
        print(f"  Total APIs found:     {self.stats['total_found']:,}")
        print(f"  Processed:            {self.stats['processed']:,}")
        print(f"    \u2713 Published:          {self.stats['published']:,}")
        print(f"    \u2717 Failed:             {self.stats['failed']:,}")
        print(f"    \u26A0 Warnings:           {self.stats['warnings']:,}")
        print(f"  Skipped (unchanged):  {self.stats['skipped']:,}")
        print(f"  Duration:             {mins}m {secs}s")
        print("=" * 40)
        
        if self.failed_details:
            print("Failed APIs:")
            for detail in self.failed_details:
                print(f"  - {detail}")
            print("=" * 40)

async def main():
    # Phase 0: Setup command-line "missions" using argparse.
    # This turns the script into a professional tool with different modes.
    parser = argparse.ArgumentParser(description="API Dash Marketplace Orchestrator")
    
    # 1. The Safety Switch: Runs logic but skips the final save-to-disk step. Useful for testing.
    parser.add_argument("--dry-run", action="store_true", help="Run phases but skip publication write step")
    
    # 2. The Sniper: Directs the engine to process only one specific API instead of thousands.
    parser.add_argument("--api-id", help="Process a single specific API ID")
    
    # 3. The Reset Button: Ignores snapshot memory and re-processes every API from scratch.
    parser.add_argument("--force-all", action="store_true", help="Force reprocess all APIs regardless of snapshot")
    
    # 4. The Filter: Limits the run to just public APIs (apis_guru) or your own (manual).
    parser.add_argument("--source", choices=["apis_guru", "manual"], help="Only process APIs from specific source")
    
    args = parser.parse_args()

    # Windows Compatibility Patch: 
    # Python's modern async manager on Windows has a bug that causes random connection crashes. 
    # This force-switches to the stable 'Selector' manager to ensure 4,000+ downloads don't hang.
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

    orchestrator = Orchestrator(dry_run=args.dry_run)
    
    try:
        logger.info("Starting Phase 1: Fetcher...")
        # Step 1: Run Fetcher (Phase 1)
        # to_process: APIs that were downloaded/updated
        # unchanged: APIs that matched snapshot
        # removed: APIs no longer in upstream (already cleaned up by fetcher)
        to_process, unchanged, removed = await run_fetcher()
        
        orchestrator.stats["total_found"] = len(to_process) + len(unchanged)
        
        # Filtering logic
        target_jobs = []
        
        if args.api_id:
            # If specific ID, we try to find it in to_process or unchanged
            # Note: fetcher results include IDs with versions (e.g. stripe:1.0)
            target_ids = [tid for tid in (to_process + unchanged) if tid == args.api_id or tid.startswith(f"{args.api_id}:")]
            if not target_ids:
                logger.error(f"API ID '{args.api_id}' not found in current catalog.")
                sys.exit(1)
            target_jobs = [(tid, "single") for tid in target_ids]
            orchestrator.stats["skipped"] = orchestrator.stats["total_found"] - len(target_jobs)
        elif args.force_all:
            target_jobs = [(tid, "all") for tid in (to_process + unchanged)]
            orchestrator.stats["skipped"] = 0
        else:
            # Smart Processing: Process new items AND items missing from the marketplace
            target_jobs = [(tid, "update") for tid in to_process]
            
            base_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            marketplace_path = os.path.join(base_path, "marketplace", "apis")

            missing_checked = 0
            for tid in unchanged:
                # Resolve the safe ID for the folder check
                from pipeline.fetcher import make_safe_id
                safe_id = make_safe_id(tid)
                templates_file = os.path.join(marketplace_path, safe_id, "templates.json")
                
                if not os.path.exists(templates_file):
                    target_jobs.append((tid, "missing-recovery"))
                    missing_checked += 1
            
            if missing_checked > 0:
                logger.info(f"Recovery: Found {missing_checked} APIs in snapshot with missing marketplace files. Re-queueing.")
            
            orchestrator.stats["skipped"] = len(unchanged) - missing_checked

        # Semaphore to limit concurrency (max 5 APIs at a time per requirements)
        sem = asyncio.Semaphore(5)
        
        async with AsyncClient(timeout=30.0) as client:
            tasks = [orchestrator.process_api(tid, src, sem, client) for tid, src in target_jobs]
            
            if tasks:
                logger.info(f"Orchestrating Phase 2-5 for {len(tasks)} APIs...")
                await asyncio.gather(*tasks)
            else:
                logger.info("No APIs require processing.")

        orchestrator.print_summary()
        sys.exit(0)

    except Exception as e:
        logger.fatal(f"Fatal error in pipeline: {e}")
        import traceback
        logger.debug(traceback.format_exc())
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
