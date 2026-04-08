from __future__ import annotations

import json
import sys
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from client import SampleMcpClient

HOST = "127.0.0.1"
PORT = 8765
PAGE_PATH = PROJECT_ROOT / "web" / "manual_test_page.html"
CLIENT = SampleMcpClient()


class ManualTestHandler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:
        path = urlparse(self.path).path
        if path in {"/", "/manual-test"}:
            self._serve_page()
            return
        if path == "/api/health":
            self._handle_health()
            return
        self._json_response(HTTPStatus.NOT_FOUND, {"ok": False, "error": f"Unknown path: {path}"})

    def do_POST(self) -> None:
        path = urlparse(self.path).path
        payload = self._read_json_body()

        if path == "/api/get-sales-data":
            self._handle_get_sales_data(payload)
            return
        if path == "/api/visualize-sales-data":
            self._handle_visualize_sales_data(payload)
            return
        if path == "/api/show-sales-pdf-report":
            self._handle_show_sales_pdf_report(payload)
            return
        if path == "/api/run-full-workflow":
            self._handle_run_full_workflow(payload)
            return

        self._json_response(HTTPStatus.NOT_FOUND, {"ok": False, "error": f"Unknown path: {path}"})

    def log_message(self, format: str, *args: object) -> None:
        return

    def _serve_page(self) -> None:
        html = PAGE_PATH.read_text(encoding="utf-8")
        encoded = html.encode("utf-8")
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def _handle_health(self) -> None:
        try:
            health = CLIENT.get_health()
            self._json_response(HTTPStatus.OK, {"ok": True, "data": health})
        except Exception as exc:  # noqa: BLE001
            self._json_response(HTTPStatus.BAD_GATEWAY, {"ok": False, "error": str(exc)})

    def _handle_get_sales_data(self, payload: dict) -> None:
        result = CLIENT.call_tool_sync("get-sales-data", payload)
        self._tool_response(result)

    def _handle_visualize_sales_data(self, payload: dict) -> None:
        result = CLIENT.call_tool_sync("visualize-sales-data", payload)
        self._tool_response(result)

    def _handle_show_sales_pdf_report(self, payload: dict) -> None:
        result = CLIENT.call_tool_sync("show-sales-pdf-report", payload)
        self._tool_response(result)

    def _handle_run_full_workflow(self, payload: dict) -> None:
        report_result = CLIENT.call_tool_sync("get-sales-data", payload)
        if report_result.is_error or report_result.structured_content is None:
            self._tool_response(report_result)
            return

        report = report_result.structured_content
        visualization_result = CLIENT.call_tool_sync(
            "visualize-sales-data",
            {"selections": payload, "report": report},
        )
        if visualization_result.is_error or visualization_result.structured_content is None:
            self._tool_response(visualization_result)
            return

        pdf_result = CLIENT.call_tool_sync(
            "show-sales-pdf-report",
            {"selections": payload, "report": report},
        )
        if pdf_result.is_error or pdf_result.structured_content is None:
            self._tool_response(pdf_result)
            return

        self._json_response(
            HTTPStatus.OK,
            {
                "ok": True,
                "data": {
                    "selections": payload,
                    "report": report,
                    "visualization": {
                        "textContent": visualization_result.text_content,
                        "structuredContent": visualization_result.structured_content,
                    },
                    "pdf": {
                        "textContent": pdf_result.text_content,
                        "structuredContent": pdf_result.structured_content,
                    },
                },
            },
        )

    def _tool_response(self, result: object) -> None:
        is_error = getattr(result, "is_error", True)
        status = HTTPStatus.BAD_REQUEST if is_error else HTTPStatus.OK
        payload = {
            "ok": not is_error,
            "data": {
                "name": getattr(result, "name", "unknown"),
                "textContent": getattr(result, "text_content", []),
                "structuredContent": getattr(result, "structured_content", None),
            },
        }
        if is_error:
            payload["error"] = "Tool invocation failed"
        self._json_response(status, payload)

    def _read_json_body(self) -> dict:
        content_length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(content_length) if content_length else b"{}"
        if not raw:
            return {}
        return json.loads(raw.decode("utf-8"))

    def _json_response(self, status: HTTPStatus, payload: dict) -> None:
        encoded = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)


def main() -> None:
    server = ThreadingHTTPServer((HOST, PORT), ManualTestHandler)
    print(f"Manual test page running at http://{HOST}:{PORT}")
    print("Make sure sample-mcp-apps-chatflow is already running on http://127.0.0.1:3000")
    server.serve_forever()


if __name__ == "__main__":
    main()
