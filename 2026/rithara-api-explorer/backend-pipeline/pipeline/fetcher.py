# to download dozens of files simultaneously rather than one by one
import asyncio
import json
# to print timestamps and status msgs
import logging
import sys
from pathlib import Path
from typing import Any, Dict, List, Tuple
# httpx is much faster than older requests library
import httpx
import yaml

# Changes: Reduced default noise and ensured real-time flushing
if not sys.stdout.isatty():
    # Forcing line buffering for pipes (like logdy)
    if hasattr(sys.stdout, "reconfigure"):
        # Use getattr to satisfy type checkers that don't recognize .reconfigure on TextIO
        getattr(sys.stdout, "reconfigure")(line_buffering=True)

class RealTimeHandler(logging.StreamHandler):
    def emit(self, record):
        super().emit(record)
        self.flush()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[RealTimeHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)

# Specifically limit noise from external libraries
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)

# Force an immediate flush for the startup message
# print("Fetcher starting up...", flush=True) moved to __main__ block below


# Core Directories and Files
BASE_DIR = Path(__file__).parent.parent 
RAW_DIR = BASE_DIR / "raw"
MARKETPLACE_DIR = BASE_DIR / "marketplace"
SNAPSHOT_FILE = MARKETPLACE_DIR / "snapshot.json"
SOURCES_FILE = BASE_DIR / "sources.yaml"
RAW_CATEGORIES_FILE = MARKETPLACE_DIR / "raw_categories.json"

APIS_GURU_URL = "https://api.apis.guru/v2/list.json"
if __name__ == "__main__":
    print(f"Fetcher starting up...")
    print(f"BASE_DIR: {BASE_DIR}")
    print(f"RAW_DIR: {RAW_DIR}")
    print(f"MARKETPLACE_DIR: {MARKETPLACE_DIR}")
    print(f"SNAPSHOT_FILE: {SNAPSHOT_FILE}")
    print(f"SOURCES_FILE: {SOURCES_FILE}")
    print(f"APIS_GURU_URL: {APIS_GURU_URL}")

async def fetch_apis_guru_catalog() -> Dict[str, Any]:
    """
    Fetches the full API catalog from the apis.guru API list.
    
    Returns:
        Dict[str, Any]: A dictionary representing the APIs Guru JSON catalog.
                        Returns an empty dict if the fetch fails.
    """
    logger.info("Fetching apis.guru catalog from %s", APIS_GURU_URL)
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    }
    async with httpx.AsyncClient(headers=headers) as client:
        # Instead of waiting for the response before doing anything else, Python can go do other work while waiting. Like placing a food order and going to sit down instead of standing at the counter
        try:
            response = await client.get(APIS_GURU_URL, timeout=15.0)
            response.raise_for_status()
            # if the server returns a 404 or 500, throw an error instead of silently returning broken data.
            logger.info("Successfully fetched apis.guru catalog.")
            return response.json()
        except httpx.HTTPError as e:
            logger.warning("Failed to fetch apis.guru catalog: %s", e)
            return {}
        except Exception as e:
            logger.warning("Unexpected error fetching apis.guru catalog: %s", e)
            return {}

def load_local_sources() -> List[Dict[str, str]]:
    """
    Loads manually tracked APIs from the local sources.yaml file.
    
    Returns:
        List[Dict[str, str]]: A list of dictionaries, each representing a manually configured API source.
    """
    if not SOURCES_FILE.exists():
        logger.warning("Local sources file '%s' not found. Skipping manual sources.", SOURCES_FILE)
        return []
        
    try:
        with open(SOURCES_FILE, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
            return data.get("sources", []) if data else []
    except Exception as e:
        logger.warning("Error reading '%s': %s", SOURCES_FILE, e)
        return []

def load_snapshot() -> Dict[str, str]:
    """
    Loads the marketplace/snapshot.json file containing last-known updated timestamps.
    
    Returns:
        Dict[str, str]: A dictionary mapping API IDs to their 'updated' timestamps.
    """
    if not SNAPSHOT_FILE.exists():
        logger.info("No snapshot found at '%s', starting fresh.", SNAPSHOT_FILE)
        return {}
        
    try:
        with open(SNAPSHOT_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.warning("Error reading snapshot file '%s': %s. Starting fresh.", SNAPSHOT_FILE, e)
        return {}

def save_snapshot(snapshot: Dict[str, str]) -> None:
    """
    Saves the API update timestamps to marketplace/snapshot.json.
    
    Args:
        snapshot (Dict[str, str]): The mapping of API IDs to timestamps to save.
    """
    MARKETPLACE_DIR.mkdir(parents=True, exist_ok=True)
    try:
        with open(SNAPSHOT_FILE, "w", encoding="utf-8") as f:
            json.dump(snapshot, f, indent=2)
        logger.info("Successfully saved snapshot.")
    except Exception as e:
        logger.warning("Error saving snapshot file '%s': %s", SNAPSHOT_FILE, e)

def make_safe_id(api_id: str) -> str:
    """Converts an API ID into a filesystem-safe string.
    
    Example:
    stripe.com:2022-11-15  →  stripe.com_2022-11-15.json.
    twilio.com/2010-04-01  →  twilio.com_2010-04-01.json"""
    return api_id.replace(":", "_").replace("/", "_").replace("\\", "_")

def get_safe_filepath(api_id: str, api_type: str) -> Path:
    """
    Generates a Windows-safe path for storing the raw API specification file.
    
    Args:
        api_id (str): The unique API identifier.
        api_type (str): The type of API ('openapi' or 'html').
        
    Returns:
        Path: The absolute path targeting the raw output directory.
    """
    ext = "html" if api_type.lower() == "html" else "json"
    safe_name = make_safe_id(api_id)
    return RAW_DIR / f"{safe_name}.{ext}"

async def download_spec(client: httpx.AsyncClient, api_id: str, url: str, api_type: str) -> bool:
    """
    Downloads an API spec document asynchronously and saves it to the raw folder.
    
    Args:
        client (httpx.AsyncClient): The HTTP client handling the connection.
        api_id (str): The unique API identifier.
        url (str): The URL from which to download the spec.
        api_type (str): The type of spec ('openapi' or 'html').
        
    Returns:
        bool: True if the file successfully downloaded and saved, False otherwise.
    """
    file_path = get_safe_filepath(api_id, api_type)
    
    try:
        response = await client.get(url, timeout=20.0, follow_redirects=True)
        response.raise_for_status()
        
        content = response.content
        if not content:
            logger.warning("Fetched empty content for %s from %s", api_id, url)
            return False
            
        if len(content) < 50:
            logger.warning("Fetched very small content (%d bytes) for %s. Might be an error or redirect: %s", 
                        len(content), api_id, content.decode('utf-8', errors='ignore'))

        with open(file_path, "wb") as f:
            f.write(content)
            
        logger.info("Downloaded %s", api_id)
        return True
    except httpx.HTTPError as e:
        logger.warning("HTTP error cleanly fetching %s from %s: %s", api_id, url, e)
        return False
    except Exception as e:
        logger.warning("Unexpected error when saving %s: %s", api_id, e)
        return False

def update_category_registry(apis_guru_data: Dict[str, Any]) -> None:
    """
    Extracts unique categories from the fresh catalog, compares with the registry,
    and alerts about new or deleted categories.
    """
    if not apis_guru_data:
        return

    # Extract all current categories
    current_categories = set()
    for api_info in apis_guru_data.values():
        versions = api_info.get("versions", {})
        for ver_data in versions.values():
            info = ver_data.get("info", {})
            cats = info.get("x-apisguru-categories", [])
            for c in cats:
                current_categories.add(c)

    # Load existing registry
    existing_categories = set()
    if RAW_CATEGORIES_FILE.exists():
        try:
            with open(RAW_CATEGORIES_FILE, "r", encoding="utf-8") as f:
                existing_categories = set(json.load(f))
        except Exception as e:
            logger.warning("Error reading registry '%s': %s", RAW_CATEGORIES_FILE, e)

    # Detection
    new_cats = current_categories - existing_categories
    deleted_cats = existing_categories - current_categories

    if new_cats:
        print("\n" + "!" * 50)
        print(" NEW CATEGORIES DETECTED UPSTREAM ".center(50, "!"))
        print("!" * 50)
        for nc in sorted(new_cats):
            print(f" - {nc} (You may want to map this in category_map.yaml)")
        print("!" * 50 + "\n")

    if deleted_cats:
        logger.info("The following categories were removed from upstream: %s", ", ".join(sorted(deleted_cats)))

    # Save updated registry
    try:
        with open(RAW_CATEGORIES_FILE, "w", encoding="utf-8") as f:
            json.dump(sorted(list(current_categories)), f, indent=2)
        logger.info("Category registry updated.")
    except Exception as e:
        logger.warning("Error saving registry '%s': %s", RAW_CATEGORIES_FILE, e)

async def main() -> Tuple[List[str], List[str], List[str]]:
    """
    The central workflow for Phase 1: The Fetcher.
    Coordinates fetching APIs from apis.guru and manually entered API specs in local_sources,
    diffing them against the snapshot, downloading updated specs dynamically, and evaluating results.
    Also detects APIs that have been removed from the upstream catalog and cleans up their
    stale snapshot entries and orphaned raw files.

    Returns:
        Tuple[List[str], List[str], List[str]]: Returns a tuple of (to_process, unchanged, removed).
            - to_process tracks the APIs safely stored in 'raw/' this run.
            - unchanged tracks APIs skipped cleanly because they matched 'snapshot.json'.
            - removed tracks APIs that were in the snapshot but are no longer in the upstream
              catalog; their snapshot entries and raw files are cleaned up automatically.

    Python is doing this automatically:
    ```
    1st iteration:
        api_id   = "stripe.com"          ← the KEY
        api_info = { "preferred": "2022-11-15", "versions": ... }  ← the VALUE

    2nd iteration:
        api_id   = "openweathermap.org"  ← the KEY
        api_info = { "preferred": "2022-11-15", "versions": ... }  ← the VALUE
    ```
    """
    # Create required directories dynamically
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    MARKETPLACE_DIR.mkdir(parents=True, exist_ok=True)

    apis_guru_data = await fetch_apis_guru_catalog()
    local_sources = load_local_sources()
    snapshot = load_snapshot()

    # Update the category registry based on fresh data
    update_category_registry(apis_guru_data)

    to_process: List[str] = []
    unchanged: List[str] = []
    removed: List[str] = []
    new_snapshot: Dict[str, str] = snapshot.copy()

    # Tracks every versioned ID present in the CURRENT catalog run.
    # Used after downloads to detect deletions (anything in the old snapshot
    # but absent from seen_ids was removed upstream).
    seen_ids: set = set()

    jobs: List[Dict[str, Any]] = []

    # 1. Parse apis.guru Data
    # For each API, evaluate all available versions.
    for api_id, api_info in apis_guru_data.items():
        versions = api_info.get("versions", {})
        preferred_ver = api_info.get("preferred")
        
        for version_name, version_data in versions.items():
            # Create a unique ID for this specific version
            # e.g., "stripe.com:2022-11-15"
            versioned_id = f"{api_id}:{version_name}"

            # Mark as seen so deletion detection works correctly after downloads.
            seen_ids.add(versioned_id)

            updated_timestamp = version_data.get("updated", "")
            spec_url = version_data.get("swaggerUrl") or version_data.get("openapiUrl")
            # TODO: there is another URL called swaggerYamlUrl. For now only swaggerUrl/openapiUrl are used. Check if swaggerYamlUrl also needs to be fetched.
            if not spec_url:
                continue

            # Check snapshot against versioned ID AND check if local file actually exists
            file_path = get_safe_filepath(versioned_id, "openapi") # Default check
            # Also check .html if it might be that
            html_path = get_safe_filepath(versioned_id, "html")
            
            file_missing = not file_path.exists() and not html_path.exists()

            if snapshot.get(versioned_id) != updated_timestamp or file_missing:
                jobs.append({
                    "id": versioned_id,
                    "url": spec_url,
                    "type": "openapi",
                    "updated": updated_timestamp,
                    "source": "apis_guru",
                    "is_preferred": version_name == preferred_ver
                })
            else:
                unchanged.append(versioned_id)

    # 2. Append Manual Configured sources
    # Manual configured local APIs skip diffing entirely and are continually fetched.
    for source in local_sources:
        api_id = source.get("id")
        url = source.get("spec_url")
        api_type = source.get("type", "openapi")

        if not api_id or not url:
            continue

        # Manual sources are always considered active — never treat them as deleted.
        seen_ids.add(api_id)

        jobs.append({
            "id": api_id,
            "url": url,
            "type": api_type,
            "updated": None,  # Force manual processing, no diffing
            "source": "manual"
        })
        
    # 3. Asynchronously download all jobs
    logger.info("Prepared %d total jobs to fetch.", len(jobs))
    
    # Restrict concurrent jobs running dynamically to avoid hitting networking resource bounds softly
    sem = asyncio.Semaphore(15)
    
    async def process_job(client: httpx.AsyncClient, job: Dict[str, Any]) -> Tuple[Dict[str, Any], bool]:
        async with sem:
            success = await download_spec(client, job["id"], job["url"], job["type"])
            return job, success

    fetched_count = 0
    failed_count = 0

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
    }

    async with httpx.AsyncClient(headers=headers) as client:
        # Create coroutines for async IO bound dispatch wrapper tracking execution safely per-thread boundary context
        tasks = [process_job(client, job) for job in jobs]
        
        # We process them completely dynamically
        for coro in asyncio.as_completed(tasks):
            job, success = await coro
            api_id = job["id"]
            
            if success:
                to_process.append(api_id)
                fetched_count += 1
                if job["source"] == "apis_guru" and job["updated"]:
                    new_snapshot[api_id] = job["updated"]
            else:
                failed_count += 1
            
            # Print a progress "pulse" every 10 downloads
            if (fetched_count + failed_count) % 10 == 0:
                logger.info("Progress: %d/%d processed...", (fetched_count + failed_count), len(jobs))

    # 4. Detect and clean up deleted APIs
    # Any ID that was in the old snapshot but is NOT in the current catalog has been
    # removed upstream. Purge its snapshot entry and delete the orphaned raw file.
    deleted_ids = set(snapshot.keys()) - seen_ids
    for deleted_id in deleted_ids:
        logger.info("API removed from upstream catalog, cleaning up: %s", deleted_id)

        # Remove from snapshot so it doesn't linger as a ghost entry
        new_snapshot.pop(deleted_id, None)

        # Delete the orphaned raw file for both possible extensions
        for ext in ("json", "html"):
            orphan_file = RAW_DIR / f"{make_safe_id(deleted_id)}.{ext}"
            if orphan_file.exists():
                try:
                    orphan_file.unlink()
                    logger.info("Deleted orphaned raw file: %s", orphan_file)
                except Exception as e:
                    logger.warning("Could not delete orphaned file '%s': %s", orphan_file, e)

        removed.append(deleted_id)

    # Overwrite prior snapshot cleanly
    save_snapshot(new_snapshot)

    logger.info("--- Fetcher Pipeline Summary ---")
    logger.info("Total APIs found remotely : %d", len(apis_guru_data))
    logger.info("Total Local Sources       : %d", len(local_sources))
    logger.info("Fetched / Processed       : %d", fetched_count)
    logger.info("Unchanged / Skipped       : %d", len(unchanged))
    logger.info("Failed Fetch Streams      : %d", failed_count)
    logger.info("Removed / Cleaned Up      : %d", len(removed))

    return to_process, unchanged, removed

if __name__ == "__main__":
    if sys.platform == "win32":
        # Windows-specific async policies for httpx connection drops
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
        
    try:
        to_process, unchanged, removed = asyncio.run(main())
        sys.exit(0)
    except KeyboardInterrupt:
        logger.info("Process interrupted by user.")
        sys.exit(1)
    except Exception as e:
        logger.error("Fatal unhandled exception running pipeline: %s", e)
        sys.exit(1)
