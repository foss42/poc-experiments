from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from tests.shared import create_client, get_fixture_paths


@dataclass(slots=True)
class ScenarioResult:
    name: str
    passed: bool
    summary: str
    details: dict[str, Any]


SCENARIOS = [
    {"name": "text_analysis_workflow"},
    {"name": "structure_and_media_workflow"},
]



def run_pdf_workflow_scenarios() -> list[ScenarioResult]:
    client = create_client()
    paths = get_fixture_paths()
    pdf_path = paths["pdf"]
    keyword = paths["keyword"]
    results: list[ScenarioResult] = []

    info = client.call_tool_sync("get_pdf_info", {"file_path": pdf_path})
    if info.is_error or info.structured_content is None:
        return [
            ScenarioResult(
                name="bootstrap",
                passed=False,
                summary="get_pdf_info failed before scenarios could run",
                details={"messages": info.text_content},
            )
        ]

    text = client.call_tool_sync("read_pdf_as_text", {"file_path": pdf_path, "pages": "1-2"})
    search = client.call_tool_sync("search_pdf_text", {"file_path": pdf_path, "query": keyword, "max_results": 10})
    stats = client.call_tool_sync("get_pdf_text_stats", {"file_path": pdf_path, "pages": "1-2"})

    text_passed = (
        not text.is_error
        and not search.is_error
        and not stats.is_error
        and isinstance(text.structured_content, dict)
        and isinstance(search.structured_content, dict)
        and isinstance(stats.structured_content, dict)
        and search.structured_content["total_matches"] >= 2
        and stats.structured_content["total_characters"] > 0
    )
    results.append(
        ScenarioResult(
            name="text_analysis_workflow",
            passed=text_passed,
            summary="text analysis workflow passed" if text_passed else "text analysis workflow failed",
            details={
                "pageCount": info.structured_content["page_count"],
                "matchedPages": search.structured_content["pages_with_matches"] if isinstance(search.structured_content, dict) else [],
                "totalCharacters": stats.structured_content["total_characters"] if isinstance(stats.structured_content, dict) else 0,
            },
        )
    )

    outline = client.call_tool_sync("get_pdf_outline", {"file_path": pdf_path})
    links = client.call_tool_sync("extract_pdf_links", {"file_path": pdf_path})
    annotations = client.call_tool_sync("get_pdf_annotations", {"file_path": pdf_path})
    embedded = client.call_tool_sync("extract_pdf_images", {"file_path": pdf_path, "pages": "1", "min_width": 50, "min_height": 50})

    structure_passed = (
        not outline.is_error
        and not links.is_error
        and not annotations.is_error
        and not embedded.is_error
        and isinstance(outline.structured_content, dict)
        and isinstance(links.structured_content, dict)
        and isinstance(annotations.structured_content, dict)
        and isinstance(embedded.structured_content, dict)
        and outline.structured_content["outline_count"] == 3
        and links.structured_content["total_links"] >= 2
        and annotations.structured_content["total_annotations"] >= 1
        and embedded.structured_content["total_images"] >= 1
    )
    results.append(
        ScenarioResult(
            name="structure_and_media_workflow",
            passed=structure_passed,
            summary="structure and media workflow passed" if structure_passed else "structure and media workflow failed",
            details={
                "outlineCount": outline.structured_content["outline_count"] if isinstance(outline.structured_content, dict) else 0,
                "totalLinks": links.structured_content["total_links"] if isinstance(links.structured_content, dict) else 0,
                "totalAnnotations": annotations.structured_content["total_annotations"] if isinstance(annotations.structured_content, dict) else 0,
                "totalImages": embedded.structured_content["total_images"] if isinstance(embedded.structured_content, dict) else 0,
            },
        )
    )

    return results
