export interface CodegenInput {
  method: string;
  url: string;
  queryParams?: Record<string, string>;
  headers?: Record<string, string>;
  body?: string;
}

export interface CodegenResult {
  language: string;
  label: string;
  code: string;
}

function buildUrl(url: string, queryParams?: Record<string, string>): string {
  if (!queryParams || Object.keys(queryParams).length === 0) return url;
  return `${url}?${new URLSearchParams(queryParams).toString()}`;
}

function shellEscape(s: string): string {
  return s.replace(/'/g, "'\\''");
}

function indentBody(body: string, indent: string): string {
  try {
    return JSON.stringify(JSON.parse(body), null, 2)
      .split("\n")
      .map((line, i) => (i === 0 ? line : indent + line))
      .join("\n");
  } catch {
    return body;
  }
}

function hasHeaders(headers?: Record<string, string>): boolean {
  return !!headers && Object.keys(headers).length > 0;
}

function hasBody(method: string, body?: string): boolean {
  return !!body && method !== "GET";
}

// ─── cURL ───────────────────────────────────────────────────────

function generateCurl(input: CodegenInput): string {
  const fullUrl = buildUrl(input.url, input.queryParams);
  const parts: string[] = ["curl"];

  if (input.method !== "GET") parts.push(`--request ${input.method}`);
  parts.push(`'${shellEscape(fullUrl)}'`);

  if (input.headers) {
    for (const [key, value] of Object.entries(input.headers)) {
      parts.push(`--header '${shellEscape(key)}: ${shellEscape(value)}'`);
    }
  }

  if (hasBody(input.method, input.body)) {
    parts.push(`--data '${shellEscape(input.body!)}'`);
  }

  return parts.join(" \\\n  ");
}

// ─── Python (requests) ──────────────────────────────────────────

function jsonToPyDict(value: unknown): string {
  if (value === null) return "None";
  if (value === true) return "True";
  if (value === false) return "False";
  if (typeof value === "string") return `"${value}"`;
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) return `[${value.map(jsonToPyDict).join(", ")}]`;
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => `"${k}": ${jsonToPyDict(v)}`);
    return `{${entries.join(", ")}}`;
  }
  return String(value);
}

function generatePython(input: CodegenInput): string {
  const lines: string[] = ["import requests", ""];
  const fullUrl = buildUrl(input.url, input.queryParams);
  lines.push(`url = "${fullUrl}"`, "");

  if (hasHeaders(input.headers)) {
    lines.push("headers = {");
    for (const [key, value] of Object.entries(input.headers!)) {
      lines.push(`    "${key}": "${value}",`);
    }
    lines.push("}", "");
  }

  let bodyIsJson = false;
  if (hasBody(input.method, input.body)) {
    try {
      lines.push(`payload = ${jsonToPyDict(JSON.parse(input.body!))}`);
      bodyIsJson = true;
    } catch {
      lines.push(`payload = '''${input.body}'''`);
    }
    lines.push("");
  }

  const method = input.method.toLowerCase();
  const args: string[] = ["url"];
  if (hasHeaders(input.headers)) args.push("headers=headers");
  if (hasBody(input.method, input.body)) args.push(bodyIsJson ? "json=payload" : "data=payload");

  lines.push(`response = requests.${method}(${args.join(", ")})`, "");
  lines.push("print(response.status_code)");
  lines.push("print(response.text)");
  return lines.join("\n");
}

// ─── JavaScript (fetch) ─────────────────────────────────────────

function generateJavaScript(input: CodegenInput): string {
  const fullUrl = buildUrl(input.url, input.queryParams);
  const lines: string[] = [`const url = "${fullUrl}";`, ""];

  const options: string[] = [`  method: "${input.method}"`];

  if (hasHeaders(input.headers)) {
    const entries = Object.entries(input.headers!)
      .map(([k, v]) => `    "${k}": "${v}"`).join(",\n");
    options.push(`  headers: {\n${entries}\n  }`);
  }

  if (hasBody(input.method, input.body)) {
    options.push(`  body: JSON.stringify(${indentBody(input.body!, "  ")})`);
  }

  lines.push("const options = {", options.join(",\n"), "};", "");
  lines.push("fetch(url, options)");
  lines.push("  .then((response) => response.json())");
  lines.push("  .then((data) => console.log(data))");
  lines.push('  .catch((error) => console.error("Error:", error));');
  return lines.join("\n");
}

// ─── Dart (http) ────────────────────────────────────────────────

function generateDart(input: CodegenInput): string {
  const hasParams = input.queryParams && Object.keys(input.queryParams).length > 0;
  const lines: string[] = [
    "import 'dart:convert';",
    "import 'package:http/http.dart' as http;",
    "",
    "void main() async {",
  ];

  lines.push(`  var uri = Uri.parse("${input.url}");`);
  if (hasParams) {
    lines.push("  var queryParams = {");
    for (const [key, value] of Object.entries(input.queryParams!)) {
      lines.push(`    "${key}": "${value}",`);
    }
    lines.push("  };");
    lines.push("  uri = uri.replace(queryParameters: {...uri.queryParameters, ...queryParams});");
  }
  lines.push("");

  if (hasHeaders(input.headers)) {
    lines.push("  var headers = {");
    for (const [key, value] of Object.entries(input.headers!)) {
      lines.push(`    "${key}": "${value}",`);
    }
    lines.push("  };", "");
  }

  if (hasBody(input.method, input.body)) {
    lines.push(`  var body = jsonEncode(${indentBody(input.body!, "  ")});`, "");
  }

  const method = input.method.toLowerCase();
  const args: string[] = ["uri"];
  if (hasHeaders(input.headers)) args.push("headers: headers");
  if (hasBody(input.method, input.body)) args.push("body: body");

  lines.push(`  var response = await http.${method}(${args.join(", ")});`, "");
  lines.push("  if (response.statusCode ~/ 100 == 2) {");
  lines.push('    print("Success: ${response.statusCode}");');
  lines.push("    print(response.body);");
  lines.push("  } else {");
  lines.push('    print("Error: ${response.statusCode}");');
  lines.push("  }");
  lines.push("}");
  return lines.join("\n");
}

// ─── Go (net/http) ──────────────────────────────────────────────

function generateGo(input: CodegenInput): string {
  const withBody = hasBody(input.method, input.body);
  const hasParams = input.queryParams && Object.keys(input.queryParams).length > 0;

  const lines: string[] = ["package main", "", "import ("];
  lines.push('  "fmt"', '  "io"');
  if (withBody) lines.push('  "bytes"');
  lines.push('  "net/http"');
  if (hasParams) lines.push('  "net/url"');
  lines.push(")", "", "func main() {");

  if (hasParams) {
    lines.push(`  reqUrl, _ := url.Parse("${input.url}")`);
    lines.push("  q := reqUrl.Query()");
    for (const [key, value] of Object.entries(input.queryParams!)) {
      lines.push(`  q.Set("${key}", "${value}")`);
    }
    lines.push("  reqUrl.RawQuery = q.Encode()", "");
  } else {
    lines.push(`  reqUrl, _ := url.Parse("${input.url}")`, "");
  }

  const bodyArg = withBody ? "payload" : "nil";
  if (withBody) {
    lines.push(`  payload := bytes.NewBuffer([]byte(\`${input.body}\`))`);
  }
  lines.push(`  req, _ := http.NewRequest("${input.method}", reqUrl.String(), ${bodyArg})`);

  if (hasHeaders(input.headers)) {
    for (const [key, value] of Object.entries(input.headers!)) {
      lines.push(`  req.Header.Set("${key}", "${value}")`);
    }
  }

  lines.push("", "  client := &http.Client{}");
  lines.push("  resp, err := client.Do(req)");
  lines.push("  if err != nil {", "    fmt.Println(err)", "    return", "  }");
  lines.push("  defer resp.Body.Close()", "");
  lines.push("  body, _ := io.ReadAll(resp.Body)");
  lines.push("  fmt.Println(resp.StatusCode)");
  lines.push("  fmt.Println(string(body))");
  lines.push("}");
  return lines.join("\n");
}

// ─── Public API ─────────────────────────────────────────────────

export function generateAllSnippets(input: CodegenInput): CodegenResult[] {
  return [
    { language: "curl", label: "cURL", code: generateCurl(input) },
    { language: "python", label: "Python", code: generatePython(input) },
    { language: "javascript", label: "JavaScript", code: generateJavaScript(input) },
    { language: "dart", label: "Dart", code: generateDart(input) },
    { language: "go", label: "Go", code: generateGo(input) },
  ];
}
