import os
import sys
import json
import logging
import argparse
import traceback
import asyncio
from datetime import datetime
from typing import Dict, Any, Optional

# Import modules from previous phases
from pipeline.enricher import EnrichedAPI, run_enrichment
from pipeline.template_generator import generate
from pipeline.validator import ValidationResult, validate

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

# --- Publisher Logic ---

class APIPublisher:
    """Manages the publication of validated API templates to the marketplace."""

    def __init__(self, base_path: str):
        self.base_path = base_path
        self.marketplace_path = os.path.join(base_path, "marketplace")
        self.index_path = os.path.join(self.marketplace_path, "index.json")
        self.snapshot_path = os.path.join(self.marketplace_path, "snapshot.json")

    def _atomic_write_json(self, path: str, data: Any):
        """Writes JSON data to a file atomically using a temporary file."""
        temp_path = f"{path}.tmp"
        try:
            os.makedirs(os.path.dirname(path), exist_ok=True)
            with open(temp_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
            # Replace the original file with the temp file
            if os.path.exists(path):
                os.remove(path)
            os.rename(temp_path, path)
        except Exception as e:
            if os.path.exists(temp_path):
                os.remove(temp_path)
            raise e

    def publish(self, validation_result: ValidationResult, enriched_api: EnrichedAPI) -> bool:
        """
        Publishes the validated API data to the marketplace.
        """
        if not validation_result.valid_templates:
            logger.warning("No valid templates for %s. Skipping publication.", validation_result.api_id)
            return False

        try:
            # 1. Write per-API Template File
            from pipeline.fetcher import make_safe_id
            safe_id = make_safe_id(enriched_api.api_id)
            api_folder = os.path.join(self.marketplace_path, "apis", safe_id)
            template_file = os.path.join(api_folder, "templates.json")
            
            template_data = {
                "api_id": enriched_api.api_id,
                "endpoint_count": len(validation_result.valid_templates),
                "endpoints": [t.model_dump() for t in validation_result.valid_templates]
            }
            self._atomic_write_json(template_file, template_data)

            # 2. Update Master Catalog (index.json)
            index_data = {"version": "v1", "last_updated": "", "total_apis": 0, "apis": []}
            if os.path.exists(self.index_path):
                try:
                    with open(self.index_path, "r", encoding="utf-8") as f:
                        index_data = json.load(f)
                except Exception as e:
                    logger.warning("Failed to read existing index.json: %s", e)

            # Prepare new entry
            new_entry = {
                "id": enriched_api.api_id,
                "name": enriched_api.name,
                "provider": enriched_api.provider,
                "description": enriched_api.description,
                "categories": enriched_api.categories,
                "auth_type": enriched_api.auth_type,
                "auth_placeholders": enriched_api.auth_placeholders,
                "base_url": enriched_api.base_url,
                "logo_url": enriched_api.logo_url,
                "docs_url": enriched_api.docs_url,
                "template_count": len(validation_result.valid_templates),
                "template_file": f"apis/{make_safe_id(enriched_api.api_id)}/templates.json",
                "rating": 0.0,
                "review_count": 0,
                "verified": enriched_api.verified,
                "featured": False,
                "source": enriched_api.source
            }

            # Update if already exists, preserve rating/reviews
            apis = index_data.get("apis", [])
            existing_idx = next((i for i, a in enumerate(apis) if a.get("id") == enriched_api.api_id), None)
            
            if existing_idx is not None:
                new_entry["rating"] = apis[existing_idx].get("rating", 0.0)
                new_entry["review_count"] = apis[existing_idx].get("review_count", 0)
                new_entry["featured"] = apis[existing_idx].get("featured", False)
                apis[existing_idx] = new_entry
            else:
                apis.append(new_entry)

            # Sort and finalize index
            apis.sort(key=lambda x: x.get("name", "").lower())
            index_data["apis"] = apis
            index_data["total_apis"] = len(apis)
            index_data["last_updated"] = datetime.now().strftime("%Y-%m-%d")
            index_data["version"] = index_data.get("version", "v1")
            
            self._atomic_write_json(self.index_path, index_data)

            # 3. Update Snapshot
            snapshot_data = {}
            if os.path.exists(self.snapshot_path):
                try:
                    with open(self.snapshot_path, "r", encoding="utf-8") as f:
                        snapshot_data = json.load(f)
                except Exception:
                    pass
            
            snapshot_data[enriched_api.api_id] = datetime.now().isoformat()
            self._atomic_write_json(self.snapshot_path, snapshot_data)

            logger.info("Successfully published %s to marketplace.", enriched_api.api_id)
            return True

        except Exception as e:
            logger.error("Failed to publish %s: %s", enriched_api.api_id, e)
            logger.debug(traceback.format_exc())
            return False

# --- Entry Point ---

def publish(validation_result: ValidationResult, enriched_api: EnrichedAPI) -> bool:
    """
    Publishes a validated API.
    
    Args:
        validation_result: The result from Phase 5 Validator.
        enriched_api: The enriched API metadata from Phase 3.
        
    Returns:
        True if successfully published.
    """
    base_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    publisher = APIPublisher(base_path)
    return publisher.publish(validation_result, enriched_api)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run Phase 5 Pipeline and publish an API.")
    parser.add_argument("--api-id", required=True, help="API ID to process and publish")
    
    args = parser.parse_args()

    # Windows async policy
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

    async def main():
        try:
            logger.info("Starting pipeline for %s...", args.api_id)
            
            # Phase 2 + 3 (Enrichment)
            enriched = await run_enrichment(args.api_id)
            
            # Phase 4 (Template Generation)
            generated = generate(enriched)
            
            # Phase 5a (Validation)
            validation_result = validate(generated, enriched)
            
            # Phase 5b (Publication)
            success = publish(validation_result, enriched)
            
            if success:
                logger.info("Pipeline completed successfully.")
            else:
                logger.warning("Pipeline completed but publication was skipped or failed.")
                sys.exit(1)
                
        except Exception as e:
            print(json.dumps({
                "api_id": args.api_id,
                "error": str(e),
                "traceback": traceback.format_exc()
            }, indent=2))
            sys.exit(1)

    asyncio.run(main())
