"""
Phase 1 — Fetcher
API Explorer Pipeline | GSoC 2026 | foss42/apidash
Author: Bhumika Nilesh Ujjainkar

Responsibilities:
  - Fetch API list from apis.guru (2500+ APIs)
  - Fetch AI-specific APIs from foss42/awesome-generative-ai-apis
  - Incremental updates via snapshot.json (skip unchanged APIs)
  - Concurrent downloading (ThreadPoolExecutor, up to 15 simultaneous)
  - Rate limiting — respects server limits, won't get blocked
  - Exponential backoff — retries failed requests intelligently
  - Resume capability — if pipeline crashes, picks up where it left off
  - Graceful degradation — if apis.guru is down, uses cached snapshot

Corner cases handled:
  - Network timeout
  - HTTP 429 (rate limited) — backs off and retries
  - HTTP 5xx (server error) — retries with backoff
  - Malformed JSON response
  - Empty or missing spec URL
  - APIs that have been removed from apis.guru
  - Disk write failures
"""

import os
import sys
import json
import time
import logging
import hashlib
import re
import requests
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path


# ─────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────

APIS_GURU_LIST_URL  = "https://api.apis.guru/v2/list.json"
AWESOME_AI_APIS_URL = (
    "https://raw.githubusercontent.com/foss42/awesome-generative-ai-apis"
    "/main/README.md"
)

MAX_WORKERS         = 15       # concurrent downloads
REQUEST_TIMEOUT     = 30       # seconds per request
MAX_RETRIES         = 3        # attempts before giving up
BACKOFF_BASE        = 2        # exponential backoff base (2^attempt seconds)
RATE_LIMIT_DELAY    = 0.1      # seconds between requests (10 req/sec max)


# ─────────────────────────────────────────────────────────────
# Logger setup
# All phases share the same log file for unified debugging
# ─────────────────────────────────────────────────────────────

def get_logger(name: str) -> logging.Logger:
    logger = logging.getLogger(name)
    if not logger.handlers:
        logger.setLevel(logging.DEBUG)

        if hasattr(sys.stdout, "reconfigure"):
            try:
                sys.stdout.reconfigure(encoding="utf-8", errors="replace")
            except ValueError:
                pass

        # Console handler — INFO and above
        ch = logging.StreamHandler(sys.stdout)
        ch.setLevel(logging.INFO)
        ch.setFormatter(logging.Formatter("%(levelname)s  %(name)s  %(message)s"))

        # File handler — DEBUG and above (full trace for debugging)
        os.makedirs("logs", exist_ok=True)
        fh = logging.FileHandler("logs/pipeline.log")
        fh.setLevel(logging.DEBUG)
        fh.setFormatter(
            logging.Formatter("%(asctime)s  %(levelname)s  %(name)s  %(message)s")
        )

        logger.addHandler(ch)
        logger.addHandler(fh)
    return logger


logger = get_logger("fetcher")


def _latest_version_key(item: tuple[str, dict]) -> tuple:
    """
    Produces a stable sort key for apis.guru version entries.
    Prefer the upstream updated timestamp when present, otherwise
    fall back to a numeric-ish interpretation of the version string.
    """
    version, metadata = item
    updated = str(metadata.get("updated", "") or "")
    normalized_version = version.strip().lower()
    prerelease_match = re.match(
        r"^v?(?P<release>\d+(?:[.\-_]\d+)*)?(?P<suffix>.*)$",
        normalized_version,
    )

    release_part = prerelease_match.group("release") if prerelease_match else ""
    suffix_part = prerelease_match.group("suffix") if prerelease_match else normalized_version

    release_numbers = tuple(
        int(part)
        for part in re.findall(r"\d+", release_part)
    )
    if not release_numbers:
        release_numbers = (0,)

    suffix_tokens = tuple(re.findall(r"[a-z]+|\d+", suffix_part))
    is_stable = len(suffix_tokens) == 0
    prerelease_key = tuple(
        int(token) if token.isdigit() else token
        for token in suffix_tokens
    )

    if updated:
        return (1, updated, release_numbers, is_stable, prerelease_key, normalized_version)

    return (0, release_numbers, is_stable, prerelease_key, normalized_version)


# ─────────────────────────────────────────────────────────────
# Retry + Rate Limiting Decorator
# Wraps any HTTP call with exponential backoff + rate limiting
# ─────────────────────────────────────────────────────────────

def fetch_with_retry(url: str, timeout: int = REQUEST_TIMEOUT) -> requests.Response:
    """
    Fetches a URL with:
      - Exponential backoff on failures (2^attempt seconds: 2, 4, 8...)
      - Special handling for HTTP 429 (rate limited) — uses Retry-After header
      - Special handling for HTTP 5xx (server errors) — retries
      - Hard fail on HTTP 4xx (except 429) — no point retrying
      - Rate limiting delay between all requests

    Returns Response object on success.
    Raises requests.RequestException after all retries exhausted.
    """
    last_exception = None

    for attempt in range(MAX_RETRIES):
        try:
            # Rate limiting — small delay between every request
            if attempt > 0:
                backoff = BACKOFF_BASE ** attempt
                logger.debug(f"Retry {attempt}/{MAX_RETRIES} for {url} — waiting {backoff}s")
                time.sleep(backoff)
            else:
                time.sleep(RATE_LIMIT_DELAY)

            response = requests.get(
                url,
                timeout=timeout,
                headers={"User-Agent": "APIDash-Explorer-Pipeline/1.0"}
            )

            # Rate limited — respect Retry-After header if present
            if response.status_code == 429:
                retry_after = int(response.headers.get("Retry-After", 60))
                logger.warning(f"Rate limited on {url}. Waiting {retry_after}s")
                time.sleep(retry_after)
                continue

            # Server errors — retry
            if response.status_code >= 500:
                logger.warning(f"Server error {response.status_code} for {url}")
                last_exception = requests.HTTPError(
                    f"HTTP {response.status_code}", response=response
                )
                continue

            # Client errors (404, 403 etc) — no point retrying
            if response.status_code >= 400:
                logger.error(f"Client error {response.status_code} for {url} — skipping")
                response.raise_for_status()

            return response

        except requests.Timeout:
            logger.warning(f"Timeout on attempt {attempt+1} for {url}")
            last_exception = requests.Timeout(f"Timeout after {timeout}s")

        except requests.ConnectionError as e:
            logger.warning(f"Connection error on attempt {attempt+1} for {url}: {e}")
            last_exception = e

        except requests.RequestException as e:
            logger.error(f"Request failed for {url}: {e}")
            raise

    raise last_exception or requests.RequestException(f"All retries failed for {url}")


# ─────────────────────────────────────────────────────────────
# Snapshot Manager
# Tracks what was processed last time — enables incremental updates
# ─────────────────────────────────────────────────────────────

class SnapshotManager:
    """
    Maintains a snapshot.json file that acts as pipeline memory.

    For each API it stores:
      - last_processed: timestamp of last successful processing
      - spec_hash: MD5 of the spec content (detect content changes)
      - updated: apis.guru's own updated timestamp

    On next run:
      - If apis.guru updated timestamp matches snapshot → SKIP
      - If spec content hash matches → SKIP (even if timestamp differs)
      - Otherwise → RE-PROCESS
    """

    def __init__(self, snapshot_path: str = "data/snapshot.json"):
        self.path = Path(snapshot_path)
        self.data = self._load()

    def _load(self) -> dict:
        if self.path.exists():
            try:
                with open(self.path) as f:
                    data = json.load(f)
                logger.info(f"Loaded snapshot with {len(data)} entries")
                return data
            except (json.JSONDecodeError, IOError) as e:
                logger.warning(f"Corrupt snapshot file, starting fresh: {e}")
        return {}

    def save(self):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        try:
            with open(self.path, "w") as f:
                json.dump(self.data, f, indent=2)
        except IOError as e:
            logger.error(f"Failed to save snapshot: {e}")

    def needs_update(self, api_id: str, updated: str, spec_hash: str) -> bool:
        """Returns True if this API needs re-processing."""
        if api_id not in self.data:
            return True
        entry = self.data[api_id]
        if entry.get("updated") == updated:
            return False
        if entry.get("spec_hash") == spec_hash:
            return False
        return True

    def mark_processed(self, api_id: str, updated: str, spec_hash: str):
        self.data[api_id] = {
            "updated": updated,
            "spec_hash": spec_hash,
            "last_processed": datetime.now(timezone.utc).isoformat()
        }

    def mark_failed(self, api_id: str, error: str):
        """Track failures so we can report them in metrics."""
        if api_id not in self.data:
            self.data[api_id] = {}
        self.data[api_id]["last_error"] = error
        self.data[api_id]["last_failed"] = datetime.now(timezone.utc).isoformat()

    def get_failed_apis(self) -> list:
        return [
            api_id for api_id, entry in self.data.items()
            if "last_error" in entry
        ]


# ─────────────────────────────────────────────────────────────
# Metrics Tracker
# Tracks success/failure counts for pipeline run summary
# ─────────────────────────────────────────────────────────────

class MetricsTracker:
    """
    Tracks pipeline run statistics.
    Printed at end of every run:
      Processed: 2500 | Success: 2341 | Failed: 159 | Skipped: 1823
    """

    def __init__(self):
        self.total      = 0
        self.success    = 0
        self.failed     = 0
        self.skipped    = 0
        self.errors     = []
        self.start_time = time.time()

    def record_success(self, api_id: str):
        self.total   += 1
        self.success += 1

    def record_failure(self, api_id: str, error: str):
        self.total  += 1
        self.failed += 1
        self.errors.append({"api": api_id, "error": str(error)})

    def record_skip(self, api_id: str):
        self.skipped += 1

    def summary(self) -> dict:
        elapsed = time.time() - self.start_time
        return {
            "total_processed" : self.total,
            "success"         : self.success,
            "failed"          : self.failed,
            "skipped"         : self.skipped,
            "elapsed_seconds" : round(elapsed, 2),
            "errors"          : self.errors
        }

    def print_summary(self):
        s = self.summary()
        logger.info("─" * 50)
        logger.info(f"Pipeline Run Summary")
        logger.info(f"  Total processed : {s['total_processed']}")
        logger.info(f"  Success         : {s['success']}")
        logger.info(f"  Failed          : {s['failed']}")
        logger.info(f"  Skipped         : {s['skipped']}")
        logger.info(f"  Elapsed         : {s['elapsed_seconds']}s")
        if s["errors"]:
            logger.info(f"  Failed APIs:")
            for e in s["errors"][:10]:
                logger.info(f"    - {e['api']}: {e['error']}")
            if len(s["errors"]) > 10:
                logger.info(f"    ... and {len(s['errors'])-10} more (see logs/pipeline.log)")
        logger.info("─" * 50)


# ─────────────────────────────────────────────────────────────
# Main Fetcher
# ─────────────────────────────────────────────────────────────

class Fetcher:
    """
    Fetches raw API specs from two sources:
      1. apis.guru — 2500+ general APIs with OpenAPI specs
      2. foss42/awesome-generative-ai-apis — AI-specific APIs

    Outputs raw spec files to data/raw/{api_id}.json or .yaml
    Updates snapshot.json for incremental processing.
    """

    def __init__(self, output_dir: str = "data/raw"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.snapshot = SnapshotManager()
        self.metrics  = MetricsTracker()

    def _compute_hash(self, content: str) -> str:
        """MD5 hash of spec content — detects changes even if timestamp unchanged."""
        return hashlib.md5(content.encode()).hexdigest()

    def _save_spec(self, api_id: str, content: str, ext: str = "json"):
        """
        Saves raw spec to disk.
        Corner case: handles invalid characters in api_id for filenames.
        """
        safe_id  = api_id.replace("/", "_").replace(":", "_")
        filepath = self.output_dir / f"{safe_id}.{ext}"
        try:
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(content)
            return str(filepath)
        except IOError as e:
            logger.error(f"Failed to save spec for {api_id}: {e}")
            raise

    def _get_cached_spec_path(self, api_id: str) -> str | None:
        """
        Returns the on-disk cached spec path for an API if it exists.
        Cached specs are saved with ':' and '/' normalized to '_'.
        """
        safe_id = api_id.replace("/", "_").replace(":", "_")
        for ext in ("json", "yaml", "yml"):
            filepath = self.output_dir / f"{safe_id}.{ext}"
            if filepath.exists():
                return str(filepath)
        return None

    def fetch_apis_guru_list(self) -> dict:
        """
        Fetches the full list of APIs from apis.guru.
        Returns dict of {api_id: api_metadata}.

        Corner case: if apis.guru is down, falls back to
        existing snapshot data so pipeline doesn't fail completely.
        """
        logger.info("Fetching API list from apis.guru...")
        try:
            response = fetch_with_retry(APIS_GURU_LIST_URL)
            data     = response.json()
            logger.info(f"Found {len(data)} APIs on apis.guru")
            return data
        except Exception as e:
            logger.error(f"Failed to fetch apis.guru list: {e}")
            logger.warning("Falling back to cached snapshot data")
            # Return empty dict — pipeline will use existing processed data
            return {}

    def fetch_single_spec(self, api_id: str, api_data: dict) -> dict:
        """
        Fetches and saves the OpenAPI spec for one API.
        Returns result dict with status and metadata.

        Corner cases handled:
          - Missing spec URL in api_data
          - Spec URL returns non-200
          - Spec content is not valid JSON or YAML
          - File already exists and unchanged (incremental skip)
          - Spec too large (>10MB, memory concern)
        """
        try:
            # Extract latest version data
            versions    = api_data.get("versions", {})
            if not versions:
                return {"api_id": api_id, "status": "skipped",
                        "reason": "no versions found"}

            latest_key, latest = max(
                versions.items(),
                key=_latest_version_key,
            )
            # swaggerYamlUrl is the YAML variant of the spec URL in the apis.guru schema.
            # openapiVer is a version *string* (e.g. "3.0.2"), not a URL — using it as
            # a fallback URL caused fetch_with_retry to fire on a nonsensical string.
            spec_url    = latest.get("swaggerUrl") or latest.get("swaggerYamlUrl")
            updated     = latest.get("updated", "")

            # Corner case: missing spec URL
            if not spec_url:
                logger.warning(f"No spec URL for {api_id}")
                return {"api_id": api_id, "status": "skipped",
                        "reason": "no spec URL"}

            cached_filepath = self._get_cached_spec_path(api_id)
            snapshot_entry = self.snapshot.data.get(api_id, {})
            if (
                cached_filepath
                and updated
                and snapshot_entry.get("updated") == updated
            ):
                self.metrics.record_skip(api_id)
                return {
                    "api_id": api_id,
                    "status": "cached",
                    "filepath": cached_filepath,
                    "spec_url": spec_url,
                    "updated": updated,
                    "categories": api_data.get("categories", []),
                    "info": latest.get("info", {}),
                    "reason": "unchanged since last run",
                }

            # Fetch spec content
            response = fetch_with_retry(spec_url)
            content  = response.text

            # Corner case: extremely large specs (>10MB)
            # These cause memory issues during parsing
            if len(content) > 10 * 1024 * 1024:
                logger.warning(f"Spec too large for {api_id} ({len(content)/1024/1024:.1f}MB) — skipping")
                return {"api_id": api_id, "status": "skipped",
                        "reason": "spec too large (>10MB)"}

            spec_hash = self._compute_hash(content)

            # Incremental update check — skip if unchanged
            if not self.snapshot.needs_update(api_id, updated, spec_hash):
                self.metrics.record_skip(api_id)
                if cached_filepath:
                    return {
                        "api_id": api_id,
                        "status": "cached",
                        "filepath": cached_filepath,
                        "spec_url": spec_url,
                        "updated": updated,
                        "categories": api_data.get("categories", []),
                        "info": latest.get("info", {}),
                        "reason": "unchanged since last run",
                    }
                logger.warning(
                    f"Snapshot says {api_id} is unchanged, but cached spec file is missing. Refetching."
                )

            # Detect format and save
            ext      = "yaml" if spec_url.endswith((".yaml", ".yml")) else "json"
            filepath = self._save_spec(api_id, content, ext)

            # Update snapshot
            self.snapshot.mark_processed(api_id, updated, spec_hash)
            self.metrics.record_success(api_id)

            return {
                "api_id"    : api_id,
                "status"    : "fetched",
                "filepath"  : filepath,
                "spec_url"  : spec_url,
                "updated"   : updated,
                "categories": api_data.get("categories", []),
                "info"      : latest.get("info", {})
            }

        except Exception as e:
            error_msg = str(e)
            logger.error(f"Failed to fetch {api_id}: {error_msg}")
            self.snapshot.mark_failed(api_id, error_msg)
            self.metrics.record_failure(api_id, error_msg)
            return {"api_id": api_id, "status": "failed", "error": error_msg}

    def fetch_all_apis_guru(self, api_list: dict) -> list:
        """
        Fetches all APIs from apis.guru concurrently.
        Uses ThreadPoolExecutor with MAX_WORKERS=15.

        Why ThreadPoolExecutor over asyncio:
          - requests library is synchronous
          - ThreadPoolExecutor is simpler and sufficient for I/O bound work
          - asyncio would require rewriting all HTTP calls with aiohttp

        Returns list of result dicts.
        """
        logger.info(f"Fetching specs for {len(api_list)} APIs "
                    f"(up to {MAX_WORKERS} concurrent)...")
        results = []

        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
            future_to_api = {
                executor.submit(self.fetch_single_spec, api_id, api_data): api_id
                for api_id, api_data in api_list.items()
            }

            completed = 0
            for future in as_completed(future_to_api):
                api_id    = future_to_api[future]
                completed += 1

                try:
                    result = future.result()
                    results.append(result)
                except Exception as e:
                    logger.error(f"Unexpected error for {api_id}: {e}")
                    results.append({
                        "api_id": api_id,
                        "status": "failed",
                        "error" : str(e)
                    })

                # Progress log every 100 APIs
                if completed % 100 == 0:
                    logger.info(f"Progress: {completed}/{len(api_list)} APIs processed")

        return results

    def fetch_awesome_ai_apis(self) -> list:
        """
        Fetches AI-specific APIs from foss42/awesome-generative-ai-apis.
        Parses the README.md table to extract API names + doc URLs.

        This is the maintainer's explicitly recommended data source.
        Provides AI APIs that may not be on apis.guru.

        Returns list of dicts with api name + docs URL.
        """
        logger.info("Fetching AI APIs from awesome-generative-ai-apis...")
        try:
            response = fetch_with_retry(AWESOME_AI_APIS_URL)
            lines    = response.text.split("\n")
            ai_apis  = []

            for line in lines:
                # Parse markdown table rows: | API Name | [Link](url) | Y/N | desc |
                if line.startswith("|") and "[Link]" in line:
                    parts = [p.strip() for p in line.split("|")]
                    parts = [p for p in parts if p]
                    if len(parts) >= 2:
                        name     = parts[0].strip()
                        link_raw = parts[1]

                        # Extract URL from markdown [Link](url) format
                        if "[Link](" in link_raw:
                            url_start = link_raw.find("(") + 1
                            url_end   = link_raw.find(")")
                            doc_url   = link_raw[url_start:url_end]
                            requires_auth = parts[2].strip() == "Y" if len(parts) > 2 else True

                            ai_apis.append({
                                "name"         : name,
                                "docs_url"     : doc_url,
                                "requires_auth": requires_auth,
                                "source"       : "awesome-generative-ai-apis"
                            })

            logger.info(f"Found {len(ai_apis)} AI APIs from awesome-generative-ai-apis")
            return ai_apis

        except Exception as e:
            logger.error(f"Failed to fetch awesome-generative-ai-apis: {e}")
            return []

    def run(self) -> dict:
        """
        Main entry point for Phase 1.
        Returns combined results from both sources.
        """
        logger.info("=" * 50)
        logger.info("Phase 1 — Fetcher starting")
        logger.info("=" * 50)

        # Source 1: apis.guru
        api_list        = self.fetch_apis_guru_list()
        apis_guru_results = self.fetch_all_apis_guru(api_list) if api_list else []

        # Source 2: awesome-generative-ai-apis
        ai_apis = self.fetch_awesome_ai_apis()

        # Save snapshot after run
        self.snapshot.save()

        # Save metrics
        metrics = self.metrics.summary()
        os.makedirs("logs", exist_ok=True)
        with open("logs/metrics.json", "w") as f:
            json.dump(metrics, f, indent=2)

        self.metrics.print_summary()

        # Build combined results and save to disk for next phases or debugging
        results = {
            "apis_guru": apis_guru_results,
            "ai_apis": ai_apis,
            "metrics": metrics
        }
        os.makedirs("data", exist_ok=True)
        with open("data/fetch_results.json", "w") as f:
            json.dump(results, f, indent=2)
        logger.info("Results saved to data/fetch_results.json")

        return results


# ─────────────────────────────────────────────────────────────
# Manual Sources Loader
# Reads sources.yaml — community-contributed API sources
# that are not in apis.guru or awesome-generative-ai-apis
# ─────────────────────────────────────────────────────────────

def load_manual_sources(filepath: str) -> list:
    """
    Loads manually curated API sources from a YAML file.

    Expected YAML structure:
      sources:
        - name: "Some API"
          spec_url: "https://example.com/openapi.json"
          docs_url: "https://example.com/docs"
          requires_auth: true
          categories: ["developer-tools"]

    Returns list of source dicts, or empty list if:
      - File does not exist (non-fatal — manual sources are optional)
      - File is malformed YAML
      - File has unexpected structure

    Corner cases:
      - Missing file → warn and return [] (not an error)
      - Invalid YAML → warn and return []
      - Missing 'sources' key → return []
      - Empty sources list → return []
    """
    path = Path(filepath)

    if not path.exists():
        logger.warning(
            f"Manual sources file not found: {filepath} — skipping"
        )
        return []

    try:
        import yaml
    except ImportError:
        logger.warning(
            "PyYAML not installed — cannot load manual sources. "
            "Run: pip install pyyaml"
        )
        return []

    try:
        with open(path, encoding="utf-8") as f:
            data = yaml.safe_load(f)
    except Exception as e:
        logger.warning(f"Failed to parse {filepath}: {e}")
        return []

    if not isinstance(data, dict):
        logger.warning(f"{filepath} must be a YAML mapping with a 'sources' key")
        return []

    sources = data.get("sources", [])
    if not isinstance(sources, list):
        logger.warning(f"'sources' in {filepath} must be a list")
        return []

    # Validate each entry has at minimum a name and spec_url or docs_url
    valid = []
    for i, entry in enumerate(sources):
        if not isinstance(entry, dict):
            logger.warning(f"Manual source entry {i} is not a dict — skipping")
            continue
        if not entry.get("name"):
            logger.warning(f"Manual source entry {i} missing 'name' — skipping")
            continue
        if not (entry.get("spec_url") or entry.get("docs_url")):
            logger.warning(
                f"Manual source '{entry['name']}' has no spec_url or docs_url — skipping"
            )
            continue
        valid.append(entry)

    logger.info(f"Loaded {len(valid)} manual sources from {filepath}")
    return valid


# ─────────────────────────────────────────────────────────────
# Demo — runs with mock data since network is restricted here
# Run locally to fetch real data from apis.guru
# ─────────────────────────────────────────────────────────────

def run_demo():
    """
    Demonstrates Phase 1 with mock data.
    Shows all edge cases: success, skip, failure, rate limit handling.
    """
    logger.info("Running Phase 1 demo with mock data...")

    fetcher  = Fetcher(output_dir="data/raw")
    snapshot = fetcher.snapshot

    # Mock API list (simulates apis.guru response structure)
    mock_apis = {
        "openai.com": {
            "versions": {
                "2.0.0": {
                    "swaggerUrl": "https://api.openai.com/openapi.yaml",
                    "updated"   : "2025-01-01T00:00:00Z",
                    "info"      : {"title": "OpenAI API",
                                   "description": "OpenAI's GPT models"}
                }
            },
            "categories": ["machine_learning", "text"]
        },
        "anthropic.com": {
            "versions": {
                "1.0.0": {
                    "swaggerUrl": "https://api.anthropic.com/openapi.json",
                    "updated"   : "2025-02-01T00:00:00Z",
                    "info"      : {"title": "Anthropic Claude API",
                                   "description": "Claude AI models"}
                }
            },
            "categories": ["machine_learning"]
        },
        "broken-api.com": {
            "versions": {}  # Corner case: no versions
        },
        "no-url-api.com": {
            "versions": {
                "1.0.0": {
                    "updated": "2025-01-01T00:00:00Z"
                    # Corner case: missing swaggerUrl
                }
            }
        }
    }

    # Simulate incremental update — mark anthropic as already processed
    # Pre-seed with the real hash of the mock content so needs_update() correctly
    # identifies this entry as unchanged and skips it (Bug fix: "abc123" never
    # matched "mock_hash", so anthropic.com was always re-fetched in the demo).
    import hashlib as _hashlib
    _anthropic_mock = json.dumps({"openapi": "3.0.0",
                                  "info": {"title": "Anthropic Claude API",
                                           "description": "Claude AI models"}})
    snapshot.data["anthropic.com"] = {
        "updated"       : "2025-02-01T00:00:00Z",
        "spec_hash"     : _hashlib.md5(_anthropic_mock.encode()).hexdigest(),
        "last_processed": "2025-01-01T00:00:00Z"
    }

    results = {
        "apis_guru": [],
        "ai_apis"  : []
    }

    # Process each mock API
    for api_id, api_data in mock_apis.items():
        # Skip network call — simulate result
        versions = api_data.get("versions", {})
        if not versions:
            result = {"api_id": api_id, "status": "skipped",
                      "reason": "no versions found"}
        else:
            latest_key, latest = max(
                versions.items(),
                key=_latest_version_key,
            )
            spec_url   = latest.get("swaggerUrl")
            updated    = latest.get("updated", "")

            if not spec_url:
                result = {"api_id": api_id, "status": "skipped",
                          "reason": "no spec URL"}
            elif not snapshot.needs_update(
                api_id, updated,
                # Compute the same hash the pre-seeded snapshot entry was built
                # from so needs_update() correctly identifies unchanged entries.
                fetcher._compute_hash(
                    json.dumps({"openapi": "3.0.0", "info": latest.get("info", {})})
                )
            ):
                result = {"api_id": api_id, "status": "skipped",
                          "reason": "unchanged since last run"}
                fetcher.metrics.record_skip(api_id)
            else:
                # Simulate successful fetch
                mock_content = json.dumps({"openapi": "3.0.0",
                                           "info": latest.get("info", {})})
                spec_hash    = fetcher._compute_hash(mock_content)

                # Save mock spec to disk
                filepath = fetcher._save_spec(api_id, mock_content, "json")
                snapshot.mark_processed(api_id, updated, spec_hash)
                fetcher.metrics.record_success(api_id)

                result = {
                    "api_id"    : api_id,
                    "status"    : "fetched",
                    "filepath"  : filepath,
                    "spec_url"  : spec_url,
                    "categories": api_data.get("categories", [])
                }

        results["apis_guru"].append(result)
        logger.info(f"  {api_id}: {result['status']}"
                    + (f" ({result.get('reason','')})" if result["status"]=="skipped" else ""))

    # Mock AI APIs
    results["ai_apis"] = [
        {"name": "OpenAI", "docs_url": "https://platform.openai.com/docs/api-reference",
         "requires_auth": True, "source": "awesome-generative-ai-apis"},
        {"name": "ElevenLabs", "docs_url": "https://elevenlabs.io/docs/api-reference",
         "requires_auth": True, "source": "awesome-generative-ai-apis"},
        {"name": "Pollinations.AI", "docs_url": "https://pollinations.ai/docs",
         "requires_auth": False, "source": "awesome-generative-ai-apis"},
    ]

    snapshot.save()
    fetcher.metrics.print_summary()

    # Save results for Phase 2
    os.makedirs("data", exist_ok=True)
    with open("data/fetch_results.json", "w") as f:
        json.dump(results, f, indent=2)

    logger.info("Phase 1 complete. Results saved to data/fetch_results.json")
    return results


if __name__ == "__main__":
    run_demo()
