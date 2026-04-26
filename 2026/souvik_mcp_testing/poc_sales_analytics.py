#!/usr/bin/env python3
"""
MCP Testing Suite — PoC: Sales Analytics MCP Apps Server
=========================================================
Tests the Sales Analytics MCP Apps server by @ashitaprasad over its real
transport: Streamable HTTP on POST /mcp.

Usage:
  python3 poc_sales_analytics.py
  python3 poc_sales_analytics.py --json
  python3 poc_sales_analytics.py --verbose
"""

import json
import os
import socket
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
from collections import defaultdict
from pathlib import Path

TIMEOUT_S = 20.0
STARTUP_TIMEOUT_S = 20.0
SERVER_DIR = "sample-mcp-apps-chatflow"
SERVER_CMD = "node"
SERVER_ARGS = ["dist/index.js"]
JSON_OUTPUT = "--json" in sys.argv
VERBOSE = "--verbose" in sys.argv

G = "\033[32m"
R = "\033[31m"
D = "\033[90m"
B = "\033[1m"
M = "\033[35m"
X = "\033[0m"

results = []
_MAIN_ALREADY_RAN = False


def classify_error(error, context=None):
    ctx = context or {}
    code = error.get("code") if isinstance(error, dict) else None
    if ctx.get("spawn_failed") or ctx.get("server_not_ready") or ctx.get("http_failed"):
        return "transport"
    if code in (-32700, -32600):
        return "transport"
    if code in (-32601, -32602):
        return "protocol"
    if ctx.get("method", "").startswith("ui/"):
        return "ui-handshake"
    if ctx.get("host_context_rejected"):
        return "ui-handshake"
    return "tool-exec"


class TransportError(Exception):
    pass


class RPCError(Exception):
    def __init__(self, e):
        self.code = e.get("code")
        self.rpc_message = e.get("message", "")
        super().__init__(f"[{self.code}] {self.rpc_message}")


def diff_snapshots(base, curr, path="$"):
    diffs = []
    if type(base) != type(curr):
        return [{"path": path, "type": "type-change"}]
    if isinstance(base, dict):
        for k in sorted(set(list(base) + list(curr))):
            p = f"{path}.{k}"
            if k not in base:
                diffs.append({"path": p, "type": "added"})
            elif k not in curr:
                diffs.append({"path": p, "type": "removed"})
            else:
                diffs.extend(diff_snapshots(base[k], curr[k], p))
    elif isinstance(base, list):
        if len(base) != len(curr):
            diffs.append({"path": path, "type": "length-change", "from": len(base), "to": len(curr)})
        for i in range(min(len(base), len(curr))):
            diffs.extend(diff_snapshots(base[i], curr[i], f"{path}[{i}]") )
    elif base != curr:
        diffs.append({"path": path, "type": "value-change", "from": base, "to": curr})
    return diffs


def detect_mcp_app(obj):
    if not isinstance(obj, dict):
        return None
    meta = obj.get("_meta")
    if meta and meta.get("ui"):
        return meta["ui"].get("resourceUri")
    return None


def detect_mcp_app_in_tool(tool):
    if not isinstance(tool, dict):
        return None
    meta = tool.get("_meta")
    if meta and meta.get("ui"):
        return meta["ui"].get("resourceUri")
    return None


def find_free_port():
    sock = socket.socket()
    sock.bind(("127.0.0.1", 0))
    port = sock.getsockname()[1]
    sock.close()
    return port


class HttpTransport:
    """Spawn the server process, then talk to POST /mcp over HTTP."""

    def __init__(self, cmd, args, cwd=None, port=None):
        self.cmd = cmd
        self.args = args
        self.cwd = cwd
        self.port = port or find_free_port()
        self.base = f"http://127.0.0.1:{self.port}"
        self.proc = None
        self.next_id = 1
        self.events = []
        self.stdout_lines = []
        self.stderr_lines = []

    def _capture(self, pipe, out):
        try:
            for line in iter(pipe.readline, b""):
                txt = line.decode("utf-8", errors="replace").rstrip()
                out.append(txt)
                if VERBOSE and txt:
                    print(f"    {D}{txt}{X}")
        except Exception:
            pass

    def connect(self):
        env = os.environ.copy()
        env["PORT"] = str(self.port)
        self.proc = subprocess.Popen(
            [self.cmd] + self.args,
            cwd=self.cwd,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env=env,
        )
        threading.Thread(target=self._capture, args=(self.proc.stdout, self.stdout_lines), daemon=True).start()
        threading.Thread(target=self._capture, args=(self.proc.stderr, self.stderr_lines), daemon=True).start()
        self._wait_ready()

    def _wait_ready(self):
        t0 = time.time()
        last_err = None
        while time.time() - t0 < STARTUP_TIMEOUT_S:
            if self.proc.poll() is not None:
                raise TransportError(f"Server exited early with code {self.proc.returncode}")
            try:
                req = urllib.request.Request(self.base + "/health", headers={"Accept": "application/json"})
                with urllib.request.urlopen(req, timeout=2) as resp:
                    data = json.loads(resp.read().decode("utf-8"))
                if data.get("status") == "ok":
                    return
            except Exception as e:
                last_err = e
                time.sleep(0.3)
        raise TransportError(f"Server not ready on {self.base}/health: {last_err}")

    def _post_json(self, path, obj):
        data = json.dumps(obj).encode("utf-8")
        req = urllib.request.Request(
            self.base + path,
            data=data,
            method="POST",
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json, text/event-stream",
            },
        )
        with urllib.request.urlopen(req, timeout=TIMEOUT_S) as resp:
            body = resp.read().decode("utf-8")
            ctype = resp.headers.get("Content-Type", "")
            return body, ctype, resp.status

    def send(self, method, params=None):
        if not self.proc or self.proc.poll() is not None:
            raise TransportError("Server not running")
        mid = self.next_id
        self.next_id += 1
        req = {"jsonrpc": "2.0", "id": mid, "method": method}
        if params is not None:
            req["params"] = params
        self.events.append({"ts": time.time(), "type": "request", "data": req})
        if VERBOSE:
            print(f"    {D}→ {json.dumps(req, separators=(',', ':'))}{X}")
        try:
            body, ctype, status = self._post_json("/mcp", req)
        except urllib.error.HTTPError as e:
            try:
                raw = e.read().decode("utf-8", errors="replace")
            except Exception:
                raw = ""
            raise TransportError(f"HTTP {e.code}: {raw[:300]}")
        except Exception as e:
            raise TransportError(f"HTTP request failed: {e}")

        try:
            msg = json.loads(body)
        except Exception as e:
            raise TransportError(f"Invalid JSON response ({ctype}, {status}): {body[:300]} ({e})")

        self.events.append({"ts": time.time(), "type": "response", "data": msg})
        if VERBOSE:
            print(f"    {D}← {json.dumps(msg, separators=(',', ':'))[:250]}{X}")

        if "error" in msg:
            raise RPCError(msg["error"])
        return msg.get("result")

    def notify(self, method, params=None):
        req = {"jsonrpc": "2.0", "method": method}
        if params is not None:
            req["params"] = params
        self.events.append({"ts": time.time(), "type": "notification", "data": req})
        try:
            self._post_json("/mcp", req)
        except Exception:
            pass

    def disconnect(self):
        if self.proc:
            try:
                self.proc.terminate()
                self.proc.wait(timeout=5)
            except Exception:
                try:
                    self.proc.kill()
                except Exception:
                    pass
            self.proc = None


def log(icon, msg):
    if not JSON_OUTPUT:
        print(f"  {icon} {msg}")


def run_test(name, layer, fn):
    t0 = time.perf_counter()
    try:
        fn()
        ms = round((time.perf_counter() - t0) * 1000)
        results.append({"name": name, "layer": layer, "status": "PASS", "ms": ms})
        log("✓", f"{name} {D}({ms}ms){X}")
    except Exception as e:
        ms = round((time.perf_counter() - t0) * 1000)
        results.append({"name": name, "layer": layer, "status": "FAIL", "ms": ms, "error": str(e)})
        log("✗", f"{R}{name}{X} — {e}")


def print_human_summary(results, total_ms, si, tools, tnames, mcp_apps, base_url):
    passed = sum(1 for r in results if r["status"] == "PASS")
    failed = sum(1 for r in results if r["status"] == "FAIL")
    total = len(results)

    print()
    if failed == 0:
        print(f"  {G}✓ All {total} tests passed{X}  {D}({total_ms}ms){X}")
    else:
        print(f"  {R}✗ {failed}/{total} failed{X}  {D}({total_ms}ms){X}")

    print(f"\n  {B}Server:{X} {D}{si.get('name', '?')} v{si.get('version', '?')} · {len(tools)} tools · {len(mcp_apps)} MCP Apps{X}")
    print(f"  {B}Base URL:{X} {D}{base_url}{X}")

    print(f"\n  {B}Layer Breakdown:{X}")
    layer_desc = {
        "transport": ("Transport     ", "subprocess + HTTP /health + POST /mcp"),
        "protocol": ("Protocol      ", "JSON-RPC 2.0 · tools · resources"),
        "tool-exec": ("Tool Exec     ", "sales data · charts · PDF · MCP Apps"),
        "ui-handshake": ("UI Handshake  ", "ui/initialize"),
    }
    grouped = defaultdict(list)
    for item in results:
        grouped[item["layer"]].append(item["status"])
    for lid in ["transport", "protocol", "tool-exec", "ui-handshake"]:
        if lid not in grouped:
            continue
        ok = all(s == "PASS" for s in grouped[lid])
        label, desc = layer_desc[lid]
        print(f"  {G if ok else R}■{X} {label} ── {G if ok else R}{'OK' if ok else 'FAIL'}{X}     {D}{desc}{X}")

    if mcp_apps:
        print(f"\n  {B}MCP Apps:{X}")
        for app in mcp_apps:
            print(f"  {M}▣{X} {app['name']} → {D}{app['uri']}{X}")
    print()


def main():
    global _MAIN_ALREADY_RAN
    if _MAIN_ALREADY_RAN:
        return
    _MAIN_ALREADY_RAN = True
    results.clear()

    t0 = time.perf_counter()
    if not JSON_OUTPUT:
        print(f"\n{B}  MCP Testing Suite — Sales Analytics Server PoC{X}")
        print("  ════════════════════════════════════════════════")
        print(f"  {D}Server: ashitaprasad/sample-mcp-apps-chatflow{X}")
        print(f"  {D}Transport: HTTP POST /mcp (Streamable HTTP server){X}\n")

    sd = Path(__file__).parent / SERVER_DIR
    if not (sd / "dist" / "index.js").exists():
        print(f"  {R}❌ Server not built. Run: bash setup.sh{X}\n")
        sys.exit(1)

    tr = HttpTransport(SERVER_CMD, SERVER_ARGS, cwd=str(sd))

    def t_connect():
        tr.connect()
        assert tr.proc and tr.proc.pid and tr.proc.poll() is None
    run_test("L1 · Transport: spawn server", "transport", t_connect)

    def t_health():
        req = urllib.request.Request(tr.base + "/health", headers={"Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        assert data.get("status") == "ok"
        log(" ", f"  {D}↳ {tr.base}/health OK{X}")
    run_test("L1 · Transport: HTTP health check", "transport", t_health)

    si = {}

    def t_init():
        resp = tr.send("initialize", {
            "protocolVersion": "2024-11-05",
            "capabilities": {"tools": {}, "resources": {}},
            "clientInfo": {"name": "mcp-testing-suite", "version": "2.0.0"},
        })
        assert resp and "serverInfo" in resp
        si.update(resp["serverInfo"])
        log(" ", f"  {D}↳ {si.get('name')} v{si.get('version')}{X}")
        tr.notify("notifications/initialized")
    run_test("L2 · Protocol: initialize handshake", "protocol", t_init)

    tools = []
    tnames = []
    mcp_apps = []

    def t_tools():
        nonlocal tools, tnames, mcp_apps
        resp = tr.send("tools/list")
        tools = resp.get("tools", [])
        tnames = [t["name"] for t in tools]
        assert len(tools) >= 3, f"Expected ≥3 tools, got {len(tools)}"
        log(" ", f"  {D}↳ {len(tools)} tools: {', '.join(tnames)}{X}")
        mcp_apps = []
        for tool in tools:
            uri = detect_mcp_app_in_tool(tool)
            if uri:
                mcp_apps.append({"name": tool["name"], "uri": uri})
        if mcp_apps:
            log(" ", f"  {M}↳ {len(mcp_apps)} MCP App tools{X}")
    run_test("L2 · Protocol: tools/list discovery", "protocol", t_tools)

    def t_schema():
        for tool in tools:
            assert "name" in tool
            assert "description" in tool
    run_test("L2 · Protocol: tool schema validation", "protocol", t_schema)

    def t_err():
        try:
            tr.send("nonexistent/method")
            raise AssertionError("Expected RPCError")
        except RPCError as e:
            assert e.code == -32601
            assert classify_error({"code": e.code}) == "protocol"
    run_test("L2 · Protocol: error -32601 classification", "protocol", t_err)

    report_box = [None]
    sels = {"states": ["MH", "KA", "TN"], "metric": "revenue", "period": "quarterly", "year": "2024"}

    def t_select():
        resp = tr.send("tools/call", {"name": "select-sales-metric", "arguments": {}})
        assert resp is not None
        uri = detect_mcp_app(resp)
        if uri:
            log(" ", f"  {M}↳ MCP App: {uri}{X}")
    run_test("L3 · Tool exec: select-sales-metric", "tool-exec", t_select)

    def t_get_data():
        resp = tr.send("tools/call", {"name": "get-sales-data", "arguments": sels})
        assert resp is not None
        txt = None
        for item in resp.get("content", []):
            if item.get("type") == "text":
                txt = item.get("text")
                break
        assert txt, "No text payload from get-sales-data"
        report_box[0] = json.loads(txt)
        assert isinstance(report_box[0], dict)
        log(" ", f"  {D}↳ structured data received{X}")
    run_test("L3 · Tool exec: get-sales-data (3 states)", "tool-exec", t_get_data)

    def t_viz():
        args = {"selections": sels, "report": report_box[0]}
        resp = tr.send("tools/call", {"name": "visualize-sales-data", "arguments": args})
        assert resp is not None
        sc = resp.get("structuredContent", {})
        assert "report" in sc or resp.get("content"), "Visualization response missing expected content"
        uri = detect_mcp_app(resp)
        if uri:
            log(" ", f"  {M}↳ MCP App (chart): {uri}{X}")
    run_test("L3 · Tool exec: visualize-sales-data", "tool-exec", t_viz)

    def t_pdf():
        if "show-sales-pdf-report" not in tnames:
            log(" ", f"  {D}↳ skipped (tool not available){X}")
            return
        args = {"selections": sels, "report": report_box[0]}
        resp = tr.send("tools/call", {"name": "show-sales-pdf-report", "arguments": args})
        assert resp is not None
        sc = resp.get("structuredContent", {})
        assert "pdfBase64" in sc and "fileName" in sc
        uri = detect_mcp_app(resp)
        if uri:
            log(" ", f"  {M}↳ MCP App (PDF): {uri}{X}")
    run_test("L3 · Tool exec: show-sales-pdf-report", "tool-exec", t_pdf)

    def t_detect():
        assert len(mcp_apps) > 0, "No MCP Apps detected in tools/list"
    run_test("L3 · MCP Apps: resource URI detection", "tool-exec", t_detect)

    def t_ui():
        try:
            resp = tr.send("ui/initialize", {"clientInfo": {"name": "mcp-testing-suite", "version": "2.0.0"}})
            if resp and "hostContext" in resp:
                css = resp["hostContext"].get("css", {})
                log(" ", f"  {M}↳ hostContext: {len(css)} CSS vars{X}")
        except RPCError as e:
            if e.code == -32601:
                log(" ", f"  {D}↳ not implemented (OK){X}")
            else:
                raise
    run_test("L4 · UI handshake: ui/initialize", "ui-handshake", t_ui)

    def t_res():
        try:
            resp = tr.send("resources/list")
            if resp and "resources" in resp:
                apps = [x for x in resp["resources"] if "html" in x.get("mimeType", "")]
                log(" ", f"  {D}↳ {len(resp['resources'])} resources, {len(apps)} MCP Apps{X}")
                for app in apps[:5]:
                    log(" ", f"  {M}↳ {app.get('uri', '?')}{X}")
        except RPCError as e:
            if e.code == -32601:
                log(" ", f"  {D}↳ not implemented{X}")
            else:
                raise
    run_test("L2 · Protocol: resources/list", "protocol", t_res)

    def t_snap():
        base = {"si": dict(si), "tc": len(tools), "tn": sorted(tnames), "apps": len(mcp_apps)}
        curr = {"si": {**si, "version": "2.0.0-beta"}, "tc": max(0, len(tools) - 1), "tn": sorted(tnames)[:-1], "apps": len(mcp_apps)}
        diffs = diff_snapshots(base, curr)
        assert len(diffs) > 0
        for item in diffs[:3]:
            log(" ", f"  {D}↳ {item['type']}: {item['path']}{X}")
    run_test("L2 · Replay: snapshot diff", "protocol", t_snap)

    def t_cls():
        assert classify_error({"code": -32700}) == "transport"
        assert classify_error({"code": -32601}) == "protocol"
        assert classify_error({"code": -32602}) == "protocol"
        assert classify_error({}, {"method": "ui/initialize"}) == "ui-handshake"
        assert classify_error({}, {"server_not_ready": True}) == "transport"
        assert classify_error({"code": -1}) == "tool-exec"
    run_test("L* · Classifier: 6 rules verified", "protocol", t_cls)

    tr.disconnect()
    total_ms = round((time.perf_counter() - t0) * 1000)
    passed = sum(1 for r in results if r["status"] == "PASS")
    failed = sum(1 for r in results if r["status"] == "FAIL")
    total = len(results)

    if JSON_OUTPUT:
        grouped = defaultdict(list)
        for item in results:
            grouped[item["layer"]].append(item["status"])
        print(json.dumps({
            "server": "ashitaprasad/sample-mcp-apps-chatflow",
            "transport": "http",
            "summary": {"total": total, "passed": passed, "failed": failed, "ms": total_ms},
            "tests": results,
            "layers": {k: "OK" if all(s == "PASS" for s in v) else "FAIL" for k, v in grouped.items()},
            "serverInfo": si,
            "tools": tnames,
            "mcpApps": mcp_apps,
            "baseUrl": tr.base,
        }, indent=2))
    else:
        print_human_summary(results, total_ms, si, tools, tnames, mcp_apps, tr.base)

    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
