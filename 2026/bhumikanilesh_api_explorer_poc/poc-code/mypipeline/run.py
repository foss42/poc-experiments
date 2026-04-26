"""
run.py — Full Pipeline Runner
API Explorer Pipeline | GSoC 2026 | foss42/apidash
Author: Bhumika Nilesh Ujjainkar

Orchestrates all 7 phases in sequence:
  Phase 1 — Fetcher        : Download API specs from apis.guru + awesome-generative-ai-apis
  Phase 2 — Parser         : Parse OpenAPI / Swagger / HTML / Markdown specs
  Phase 3 — Enricher       : Add categories, auth headers, path params, descriptions
  Phase 4 — Publisher      : Write GitHub Pages static file structure
  Phase 5 — Validator      : Validate templates, scan for leaked keys, remove dupes
  Phase 6 — Deployer       : Verify marketplace/, generate GitHub Pages config files
  Phase 7 — Search Indexer : Build pre-built inverted search index

Usage:
  python run.py                  # full pipeline (real network calls)
  python run.py --demo           # full pipeline using mock/demo data (no network)
  python run.py --from phase3    # resume from a specific phase (uses saved data)
  python run.py --only phase4    # run a single phase only

Flags:
  --demo              Use each module's run_demo() instead of the real pipeline.
                      Safe to run offline — no apis.guru or network calls.
  --from <phase>      Resume from phase N onwards, loading previous phase output
                      from disk (data/fetch_results.json, data/parsed_apis.json etc.)
  --only <phase>      Run exactly one phase. Must have prior phase data on disk.
  --marketplace <dir> Override the marketplace output directory (default: marketplace)
  --output <dir>      Override the raw data directory (default: data/raw)

Phase names accepted by --from / --only:
  phase1  fetch    fetcher
  phase2  parse    parser
  phase3  enrich   enricher
  phase4  publish  publisher
  phase5  validate validator
  phase6  deploy   deployer
  phase7  search   search_indexer  indexer
"""

import os
import sys
import json
import time
import argparse
import traceback
from pathlib import Path


# ─────────────────────────────────────────────────────────────
# Phase index — maps CLI names → integer phase numbers
# ─────────────────────────────────────────────────────────────

def configure_console_encoding():
    """
    Force UTF-8 console I/O where supported so the Unicode status symbols
    used throughout the runner and shared logger do not crash on Windows.
    """
    for stream_name in ("stdout", "stderr"):
        stream = getattr(sys, stream_name, None)
        if stream and hasattr(stream, "reconfigure"):
            try:
                stream.reconfigure(encoding="utf-8", errors="replace")
            except ValueError:
                pass


configure_console_encoding()

PHASE_ALIASES = {
    "phase1"  : 1, "fetch"         : 1, "fetcher"      : 1,
    "phase2"  : 2, "parse"         : 2, "parser"       : 2,
    "phase3"  : 3, "enrich"        : 3, "enricher"     : 3,
    "phase4"  : 4, "publish"       : 4, "publisher"    : 4,
    "phase5"  : 5, "validate"      : 5, "validator"    : 5,
    "phase6"  : 6, "deploy"        : 6, "deployer"     : 6,
    "phase7"  : 7, "search"        : 7, "search_indexer": 7, "indexer": 7,
}

PHASE_NAMES = {
    1: "Phase 1 — Fetcher",
    2: "Phase 2 — Parser",
    3: "Phase 3 — Enricher",
    4: "Phase 4 — Publisher",
    5: "Phase 5 — Validator",
    6: "Phase 6 — Deployer",
    7: "Phase 7 — Search Indexer",
}


# ─────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────

def banner(text: str):
    width = 60
    print("\n" + "=" * width)
    print(f"  {text}")
    print("=" * width)


def step(phase: int, text: str):
    print(f"\n[{phase}/7] {text}")
    print("─" * 55)


def ok(text: str):
    print(f"  ✓  {text}")


def warn(text: str):
    print(f"  ⚠  {text}")


def fail(text: str):
    print(f"  ✗  {text}")


def load_json(path: str, label: str) -> dict | list | None:
    """Loads a JSON file from disk, used when resuming from a phase."""
    p = Path(path)
    if not p.exists():
        fail(f"{label} not found at {path} — cannot resume from this phase.")
        fail("Run the pipeline from the beginning or from an earlier phase.")
        return None
    try:
        data = json.loads(p.read_text(encoding="utf-8"))
        ok(f"Loaded {label} from {path} ({p.stat().st_size // 1024} KB)")
        return data
    except (json.JSONDecodeError, IOError) as e:
        fail(f"Failed to load {label}: {e}")
        return None


def resolve_phase(name: str) -> int | None:
    """Converts a phase name/alias to its integer number."""
    key = name.strip().lower()
    if key not in PHASE_ALIASES:
        print(f"\nUnknown phase '{name}'. Valid names: {', '.join(sorted(PHASE_ALIASES))}")
        return None
    return PHASE_ALIASES[key]


def print_summary_table(results: dict):
    """Prints a clean per-phase summary table at the end of the run."""
    print("\n" + "=" * 60)
    print("  Pipeline Run Summary")
    print("=" * 60)
    print(f"  {'Phase':<30} {'Status':<12} {'Time':>8}")
    print("  " + "-" * 54)
    for phase_num in sorted(results):
        name   = PHASE_NAMES.get(phase_num, f"Phase {phase_num}")
        status = results[phase_num].get("status", "skipped")
        secs   = results[phase_num].get("elapsed", 0)
        icon   = "✓" if status in ("ok", "ready", "success") else ("⚠" if status == "warning" else "✗")
        print(f"  {icon} {name:<28} {status:<12} {secs:>6.1f}s")
    print("=" * 60)


# ─────────────────────────────────────────────────────────────
# Individual phase runners
# Each returns a result dict with at minimum {"status": ...}
# ─────────────────────────────────────────────────────────────

def run_phase1(args) -> tuple[dict, dict]:
    """
    Phase 1 — Fetcher
    Returns (fetch_results, phase_meta)
    fetch_results is passed directly into phase 2.
    """
    from fetcher import Fetcher, load_manual_sources

    fetcher      = Fetcher(output_dir=args.output)
    fetch_results = fetcher.run()

    # Optionally merge in manual sources from sources.yaml
    sources_path = Path("sources.yaml")
    if sources_path.exists():
        manual = load_manual_sources(str(sources_path))
        fetch_results["manual_sources"] = manual
        ok(f"Loaded {len(manual)} manual sources from sources.yaml")
    else:
        fetch_results.setdefault("manual_sources", [])

    metrics = fetch_results.get("metrics", {})
    ok(f"apis.guru   : {metrics.get('success', 0)} fetched, "
       f"{metrics.get('skipped', 0)} skipped, "
       f"{metrics.get('failed', 0)} failed")
    ok(f"AI APIs     : {len(fetch_results.get('ai_apis', []))} entries")

    return fetch_results, {"status": "ok"}


def run_phase2(args, fetch_results: dict) -> tuple[list, dict]:
    """
    Phase 2 — Parser
    Returns (parsed_apis, phase_meta)
    """
    from parser import Parser

    parser      = Parser()
    parsed_apis = parser.parse_all(fetch_results)

    ok(f"Parsed {len(parsed_apis)} APIs")
    return parsed_apis, {"status": "ok"}


def run_phase3(args, parsed_apis: list) -> tuple[list, dict]:
    """
    Phase 3 — Enricher
    Returns (enriched_apis, phase_meta)
    """
    from enricher import Enricher

    enricher     = Enricher()
    enriched_apis = enricher.enrich_all(parsed_apis)

    ok(f"Enriched {len(enriched_apis)} APIs")
    return enriched_apis, {"status": "ok"}


def run_phase4(args, enriched_apis: list) -> tuple[dict, dict]:
    """
    Phase 4 — Publisher
    Returns (publish_summary, phase_meta)
    """
    from publisher import Publisher

    publisher = Publisher(output_dir=args.marketplace)
    summary   = publisher.publish_all(enriched_apis)

    ok(f"Published   : {summary['success']} APIs")
    ok(f"Skipped     : {summary['skipped']} (no endpoints)")
    ok(f"Failed      : {summary['failed']}")
    ok(f"Index size  : {summary['index_size']} APIs")
    ok(f"Categories  : {summary['categories']}")
    if summary["failed"] > 0:
        warn(f"{summary['failed']} APIs failed to publish — check logs/pipeline.log")

    status = "warning" if summary["failed"] > 0 else "ok"
    return summary, {"status": status}


def run_phase5(args) -> tuple[dict, dict]:
    """
    Phase 5 — Validator
    Operates directly on marketplace/ directory (no input arg needed).
    Returns (validation_summary, phase_meta)
    """
    from validator import Validator

    validator = Validator(marketplace_dir=args.marketplace)
    summary   = validator.validate_all()

    ok(f"Valid       : {summary['valid']}")
    ok(f"Invalid     : {summary['invalid']} (removed)")
    ok(f"Report      : {summary.get('report_path', 'logs/validation_report.json')}")
    if summary["invalid"] > 0:
        warn(f"{summary['invalid']} templates failed validation and were removed")

    status = "warning" if summary["invalid"] > 0 else "ok"
    return summary, {"status": status}


def run_phase6(args) -> tuple[dict, dict]:
    """
    Phase 6 — Deployer
    Operates directly on marketplace/ directory.
    Returns (deploy_summary, phase_meta)
    """
    from deployer import Deployer

    deployer = Deployer(marketplace_dir=args.marketplace)
    summary  = deployer.deploy()

    if summary.get("status") == "failed":
        fail(f"Deployment failed: {summary.get('reason', 'unknown error')}")
        for err in summary.get("errors", []):
            fail(f"  {err}")
        return summary, {"status": "failed"}

    ok(f"APIs ready  : {summary['api_count']}")
    ok(f"Categories  : {summary['category_count']}")
    ok(f"Total size  : {summary['total_size_kb']:.1f} KB")
    ok(f"Warnings    : {summary['warnings']}")
    ok(f"GitHub URL  : {summary['github_pages_url']}")

    status = "warning" if summary["warnings"] > 0 else "ready"
    return summary, {"status": status}


def run_phase7(args) -> tuple[dict, dict]:
    """
    Phase 7 — Search Indexer
    Operates directly on marketplace/ directory.
    Returns (index_summary, phase_meta)
    """
    from search_indexer import SearchIndexer

    indexer = SearchIndexer(marketplace_dir=args.marketplace)
    result  = indexer.build_index()

    if result.get("status") == "failed":
        fail(f"Search index failed: {result.get('reason', 'unknown error')}")
        return result, {"status": "failed"}

    ok(f"APIs indexed: {result['apis_indexed']}")
    ok(f"Terms       : {result['term_count']}")
    ok(f"Index size  : {result['index_size_kb']} KB")
    ok(f"Index path  : {result['index_path']}")

    return result, {"status": "success"}


# ─────────────────────────────────────────────────────────────
# Demo runner — calls run_demo() in each module
# ─────────────────────────────────────────────────────────────

def run_demo_pipeline(start_phase: int, end_phase: int):
    """Runs the demo function in each phase module in sequence."""
    banner("API Explorer Pipeline — DEMO MODE")
    print("  Using mock data. No network calls will be made.")

    demos = {
        1: ("fetcher",       "fetcher"),
        2: ("parser",        "parser"),
        3: ("enricher",      "enricher"),
        4: ("publisher",     "publisher"),
        5: ("validator",     "validator"),
        6: ("deployer",      "deployer"),
        7: ("search_indexer","search_indexer"),
    }

    results = {}
    for phase_num in range(start_phase, end_phase + 1):
        module_name, _ = demos[phase_num]
        step(phase_num, PHASE_NAMES[phase_num])
        t0 = time.time()
        try:
            module = __import__(module_name)
            module.run_demo()
            elapsed = time.time() - t0
            results[phase_num] = {"status": "ok", "elapsed": elapsed}
            ok(f"Demo complete in {elapsed:.1f}s")
        except Exception as e:
            elapsed = time.time() - t0
            results[phase_num] = {"status": "failed", "elapsed": elapsed}
            fail(f"Demo failed: {e}")
            traceback.print_exc()

    print_summary_table(results)


# ─────────────────────────────────────────────────────────────
# Full pipeline runner
# ─────────────────────────────────────────────────────────────

def run_pipeline(args, start_phase: int, end_phase: int):
    """
    Runs the real pipeline from start_phase to end_phase.
    Handles loading saved data when resuming from a mid-pipeline phase.
    """
    banner("API Explorer Pipeline — FULL RUN")
    print(f"  Phases     : {start_phase} → {end_phase}")
    print(f"  Output dir : {args.marketplace}/")
    print(f"  Raw data   : {args.output}/")

    # ── Data carriers passed between phases ──
    fetch_results  = None
    parsed_apis    = None
    enriched_apis  = None

    results = {}

    # ── Load saved data if resuming mid-pipeline ──
    if start_phase > 1:
        print("\n  Loading saved phase outputs for resume...")

    if start_phase > 1:
        fetch_results = load_json("data/fetch_results.json", "fetch_results")
        if fetch_results is None:
            return

    if start_phase > 2:
        parsed_apis = load_json("data/parsed_apis.json", "parsed_apis")
        if parsed_apis is None:
            return

    if start_phase > 3:
        enriched_apis = load_json("data/enriched_apis.json", "enriched_apis")
        if enriched_apis is None:
            return

    # ── Run each requested phase ──

    if start_phase <= 1 <= end_phase:
        step(1, PHASE_NAMES[1])
        t0 = time.time()
        try:
            fetch_results, meta = run_phase1(args)
            meta["elapsed"] = time.time() - t0
            results[1] = meta
        except Exception as e:
            results[1] = {"status": "failed", "elapsed": time.time() - t0}
            fail(f"Phase 1 failed: {e}")
            traceback.print_exc()
            print("\n  Pipeline aborted — Phase 1 is required for all later phases.")
            print_summary_table(results)
            return

    if start_phase <= 2 <= end_phase:
        step(2, PHASE_NAMES[2])
        t0 = time.time()
        try:
            parsed_apis, meta = run_phase2(args, fetch_results)
            meta["elapsed"] = time.time() - t0
            results[2] = meta
        except Exception as e:
            results[2] = {"status": "failed", "elapsed": time.time() - t0}
            fail(f"Phase 2 failed: {e}")
            traceback.print_exc()
            print("\n  Pipeline aborted — Phase 2 output is required for Phase 3.")
            print_summary_table(results)
            return

    if start_phase <= 3 <= end_phase:
        step(3, PHASE_NAMES[3])
        t0 = time.time()
        try:
            enriched_apis, meta = run_phase3(args, parsed_apis)
            meta["elapsed"] = time.time() - t0
            results[3] = meta
        except Exception as e:
            results[3] = {"status": "failed", "elapsed": time.time() - t0}
            fail(f"Phase 3 failed: {e}")
            traceback.print_exc()
            print("\n  Pipeline aborted — Phase 3 output is required for Phase 4.")
            print_summary_table(results)
            return

    if start_phase <= 4 <= end_phase:
        step(4, PHASE_NAMES[4])
        t0 = time.time()
        try:
            _, meta = run_phase4(args, enriched_apis)
            meta["elapsed"] = time.time() - t0
            results[4] = meta
        except Exception as e:
            results[4] = {"status": "failed", "elapsed": time.time() - t0}
            fail(f"Phase 4 failed: {e}")
            traceback.print_exc()
            print("\n  Pipeline aborted — marketplace/ must exist for phases 5-7.")
            print_summary_table(results)
            return

    if start_phase <= 5 <= end_phase:
        step(5, PHASE_NAMES[5])
        t0 = time.time()
        try:
            _, meta = run_phase5(args)
            meta["elapsed"] = time.time() - t0
            results[5] = meta
        except Exception as e:
            results[5] = {"status": "failed", "elapsed": time.time() - t0}
            fail(f"Phase 5 failed: {e}")
            traceback.print_exc()
            # Non-fatal — continue to phase 6

    if start_phase <= 6 <= end_phase:
        step(6, PHASE_NAMES[6])
        t0 = time.time()
        try:
            _, meta = run_phase6(args)
            meta["elapsed"] = time.time() - t0
            results[6] = meta
            if meta["status"] == "failed":
                print("\n  Pipeline aborted — deployment verification failed.")
                print_summary_table(results)
                return
        except Exception as e:
            results[6] = {"status": "failed", "elapsed": time.time() - t0}
            fail(f"Phase 6 failed: {e}")
            traceback.print_exc()
            print_summary_table(results)
            return

    if start_phase <= 7 <= end_phase:
        step(7, PHASE_NAMES[7])
        t0 = time.time()
        try:
            _, meta = run_phase7(args)
            meta["elapsed"] = time.time() - t0
            results[7] = meta
        except Exception as e:
            results[7] = {"status": "failed", "elapsed": time.time() - t0}
            fail(f"Phase 7 failed: {e}")
            traceback.print_exc()

    print_summary_table(results)

    # ── Final output locations ──
    marketplace = Path(args.marketplace)
    if marketplace.exists():
        print(f"\n  Output: {marketplace}/")
        print(f"    index.json              — master API list")
        print(f"    apis/{{id}}.json          — full templates (on demand)")
        print(f"    categories/{{cat}}.json   — category indexes")
        print(f"    search/index.json       — pre-built search index")
        print(f"    manifest.json           — deployment metadata")
        print(f"\n  Commit the {marketplace}/ directory to your GitHub Pages branch")
        print(f"  to serve the marketplace as a free static REST API.")


# ─────────────────────────────────────────────────────────────
# CLI
# ─────────────────────────────────────────────────────────────

def parse_args():
    parser = argparse.ArgumentParser(
        description="API Explorer Pipeline runner — orchestrates all 7 phases.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python run.py                        # full pipeline with real network calls
  python run.py --demo                 # full pipeline with mock data (offline safe)
  python run.py --from phase3          # resume from enricher using saved data
  python run.py --only phase5          # run validator only
  python run.py --from phase4 --demo   # demo from publisher onwards
        """
    )
    parser.add_argument(
        "--demo",
        action="store_true",
        help="Use mock data via each module's run_demo(). No network calls."
    )
    parser.add_argument(
        "--from",
        dest="from_phase",
        metavar="PHASE",
        default=None,
        help="Resume pipeline from this phase (loads prior phase data from disk)."
    )
    parser.add_argument(
        "--only",
        dest="only_phase",
        metavar="PHASE",
        default=None,
        help="Run a single phase only."
    )
    parser.add_argument(
        "--marketplace",
        default="marketplace",
        metavar="DIR",
        help="Marketplace output directory (default: marketplace)."
    )
    parser.add_argument(
        "--output",
        default="data/raw",
        metavar="DIR",
        help="Raw spec download directory (default: data/raw)."
    )
    return parser.parse_args()


def main():
    args = parse_args()

    # Resolve start/end phases
    start_phase = 1
    end_phase   = 7

    if args.only_phase and args.from_phase:
        print("Error: --only and --from cannot be used together.")
        sys.exit(1)

    if args.only_phase:
        phase = resolve_phase(args.only_phase)
        if phase is None:
            sys.exit(1)
        start_phase = end_phase = phase

    if args.from_phase:
        phase = resolve_phase(args.from_phase)
        if phase is None:
            sys.exit(1)
        start_phase = phase

    if args.demo:
        run_demo_pipeline(start_phase, end_phase)
    else:
        run_pipeline(args, start_phase, end_phase)


if __name__ == "__main__":
    main()
