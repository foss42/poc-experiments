from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from client.mcp_http_client import SampleMcpClient


@dataclass(slots=True)
class ScenarioResult:
    name: str
    passed: bool
    summary: str
    details: dict[str, Any]


SCENARIOS = [
    {
        "name": "monthly_revenue_workflow",
        "selections": {
            "states": ["MH", "KA", "TN"],
            "metric": "revenue",
            "period": "monthly",
            "year": "2025",
        },
    },
    {
        "name": "quarterly_conversion_workflow",
        "selections": {
            "states": ["DL", "MH", "GJ"],
            "metric": "conversion",
            "period": "quarterly",
            "year": "2025",
        },
    },
]



def run_sales_workflow_scenarios() -> list[ScenarioResult]:
    client = SampleMcpClient()
    results: list[ScenarioResult] = []

    for scenario in SCENARIOS:
        selections = scenario["selections"]
        name = scenario["name"]

        report_result = client.call_tool_sync("get-sales-data", selections)
        if report_result.is_error or report_result.structured_content is None:
            results.append(
                ScenarioResult(
                    name=name,
                    passed=False,
                    summary="get-sales-data failed",
                    details={
                        "stage": "get-sales-data",
                        "messages": report_result.text_content,
                    },
                )
            )
            continue

        report = report_result.structured_content

        visualization_result = client.call_tool_sync(
            "visualize-sales-data",
            {
                "selections": selections,
                "report": report,
            },
        )
        if visualization_result.is_error or visualization_result.structured_content is None:
            results.append(
                ScenarioResult(
                    name=name,
                    passed=False,
                    summary="visualize-sales-data failed",
                    details={
                        "stage": "visualize-sales-data",
                        "messages": visualization_result.text_content,
                    },
                )
            )
            continue

        pdf_result = client.call_tool_sync(
            "show-sales-pdf-report",
            {
                "selections": selections,
                "report": report,
            },
        )
        if pdf_result.is_error or pdf_result.structured_content is None:
            results.append(
                ScenarioResult(
                    name=name,
                    passed=False,
                    summary="show-sales-pdf-report failed",
                    details={
                        "stage": "show-sales-pdf-report",
                        "messages": pdf_result.text_content,
                    },
                )
            )
            continue

        periods = report.get("periods", [])
        pdf_structured = pdf_result.structured_content
        visualization_structured = visualization_result.structured_content

        expected_periods = 12 if selections["period"] == "monthly" else 4
        period_count_ok = len(periods) == expected_periods
        visualization_ok = visualization_structured.get("selections") == selections and "report" in visualization_structured
        pdf_ok = isinstance(pdf_structured.get("pdfBase64"), str) and pdf_structured.get("fileSize", 0) > 0

        passed = period_count_ok and visualization_ok and pdf_ok
        results.append(
            ScenarioResult(
                name=name,
                passed=passed,
                summary="workflow passed" if passed else "workflow assertions failed",
                details={
                    "selections": selections,
                    "periodCount": len(periods),
                    "expectedPeriodCount": expected_periods,
                    "visualizationMessage": visualization_result.text_content,
                    "pdfFileName": pdf_structured.get("fileName"),
                    "pdfFileSize": pdf_structured.get("fileSize"),
                },
            )
        )

    return results
