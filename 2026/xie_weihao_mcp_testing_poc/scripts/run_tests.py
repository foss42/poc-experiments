from __future__ import annotations

import importlib
import json
import sys
import traceback
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from scenarios import run_sales_workflow_scenarios

TEST_SPECS: list[tuple[str, str, str]] = [
    ("Health check", "tests.test_health", "run_test"),
    ("Tool contracts", "tests.test_tool_contracts", "run_test"),
    ("Resource metadata", "tests.test_resource_metadata", "run_test"),
    ("Protocol edges", "tests.test_protocol_edges", "run_test"),
    ("Visualization flow", "tests.test_visualization_flow", "run_test"),
    ("PDF payload", "tests.test_pdf_payload", "run_test"),
]



def load_callable(module_name: str, function_name: str) -> Callable[[], list[str]]:
    module = importlib.import_module(module_name)
    return getattr(module, function_name)



def write_reports(report_payload: dict) -> None:
    reports_dir = PROJECT_ROOT / "reports"
    reports_dir.mkdir(exist_ok=True)

    json_path = reports_dir / "latest_report.json"
    md_path = reports_dir / "latest_report.md"

    json_path.write_text(json.dumps(report_payload, indent=2, ensure_ascii=False), encoding="utf-8")

    lines: list[str] = [
        "# Sales Analytics MCP Testing Report",
        "",
        f"- Generated at: {report_payload['generatedAt']}",
        f"- Total checks: {report_payload['summary']['totalChecks']}",
        f"- Passed: {report_payload['summary']['passedChecks']}",
        f"- Failed: {report_payload['summary']['failedChecks']}",
        "",
        "## Test checks",
        "",
    ]

    for result in report_payload["tests"]:
        lines.append(f"### {result['label']}")
        lines.append("")
        lines.append(f"- Status: {result['status']}")
        for detail in result.get("details", []):
            lines.append(f"- {detail}")
        if result.get("error"):
            lines.append(f"- Error: {result['error']}")
        lines.append("")

    lines.extend(["## Workflow scenarios", ""])
    for scenario in report_payload["scenarios"]:
        lines.append(f"### {scenario['name']}")
        lines.append("")
        lines.append(f"- Status: {'PASS' if scenario['passed'] else 'FAIL'}")
        lines.append(f"- Summary: {scenario['summary']}")
        lines.append(f"- Details: `{json.dumps(scenario['details'], ensure_ascii=False)}`")
        lines.append("")

    md_path.write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    print("Running Sales Analytics MCP Testing PoC...\n")
    failures: list[str] = []
    test_results: list[dict] = []

    for label, module_name, function_name in TEST_SPECS:
        test_func = load_callable(module_name, function_name)
        try:
            details = test_func()
            print(f"[PASS] {label}")
            for detail in details:
                print(f"  - {detail}")
            test_results.append({"label": label, "status": "PASS", "details": details})
        except Exception as exc:  # noqa: BLE001
            failures.append(label)
            print(f"[FAIL] {label}: {exc}")
            traceback.print_exc()
            test_results.append({"label": label, "status": "FAIL", "details": [], "error": str(exc)})
        print()

    scenario_results = []
    print("Running workflow scenarios...\n")
    for scenario in run_sales_workflow_scenarios():
        scenario_results.append(
            {
                "name": scenario.name,
                "passed": scenario.passed,
                "summary": scenario.summary,
                "details": scenario.details,
            }
        )
        status = "PASS" if scenario.passed else "FAIL"
        safe_details = json.dumps(scenario.details, ensure_ascii=True)
        print(f"[{status}] scenario {scenario.name}")
        print(f"  - {scenario.summary}")
        print(f"  - {safe_details}")
        print()
        if not scenario.passed:
            failures.append(f"scenario:{scenario.name}")

    report_payload = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "summary": {
            "totalChecks": len(test_results) + len(scenario_results),
            "passedChecks": len([r for r in test_results if r['status'] == 'PASS']) + len([s for s in scenario_results if s['passed']]),
            "failedChecks": len(failures),
        },
        "tests": test_results,
        "scenarios": scenario_results,
    }
    write_reports(report_payload)

    if failures:
        print("Test run completed with failures:")
        for label in failures:
            print(f"  - {label}")
        print("Report written to reports/latest_report.md and reports/latest_report.json")
        return 1

    print("All PoC tests passed.")
    print("Report written to reports/latest_report.md and reports/latest_report.json")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
