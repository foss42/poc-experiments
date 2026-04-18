/**
 * Code generator utility for APIDash MCP
 * Generates code snippets for HTTP requests in various languages
 */

export const SUPPORTED_GENERATORS = [
  "curl", "python-requests", "javascript-fetch", "javascript-axios",
  "nodejs-fetch", "dart-http", "go-http", "java-http",
  "kotlin-okhttp", "php-curl", "ruby-net", "rust-reqwest"
] as const;

export type GeneratorId = typeof SUPPORTED_GENERATORS[number];

export interface CodeGenInput {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: string;
  contentType?: string;
}

function headersToEntries(headers?: Record<string, string>): [string, string][] {
  return Object.entries(headers ?? {});
}

function sanitizeUrl(url: string): string {
  return url.replace(/'/g, "\\'");
}

export function generateCurl(input: CodeGenInput): string {
  const { method, url, headers, body } = input;
  const lines: string[] = [`curl -X ${method} '${sanitizeUrl(url)}'`];
  for (const [k, v] of headersToEntries(headers)) {
    lines.push(`  -H '${k}: ${v}'`);
  }
  if (body) {
    lines.push(`  --data '${body.replace(/'/g, "\\'")}'`);
  }
  return lines.join(' \\\n');
}

export function generatePythonRequests(input: CodeGenInput): string {
  const { method, url, headers, body } = input;
  const lines: string[] = ['import requests', ''];
  lines.push(`url = "${url}"`);

  if (headers && Object.keys(headers).length > 0) {
    lines.push('headers = {');
    for (const [k, v] of headersToEntries(headers)) {
      lines.push(`    "${k}": "${v}",`);
    }
    lines.push('}');
  } else {
    lines.push('headers = {}');
  }

  if (body) {
    lines.push('');
    lines.push(`payload = '''${body}'''`);
    lines.push('');
    lines.push(`response = requests.${method.toLowerCase()}(url, headers=headers, data=payload)`);
  } else {
    lines.push('');
    lines.push(`response = requests.${method.toLowerCase()}(url, headers=headers)`);
  }

  lines.push('print(response.status_code)');
  lines.push('print(response.json())');
  return lines.join('\n');
}

export function generateJavaScriptFetch(input: CodeGenInput): string {
  const { method, url, headers, body } = input;
  const lines: string[] = [];
  lines.push(`const response = await fetch("${url}", {`);
  lines.push(`  method: "${method}",`);

  if (headers && Object.keys(headers).length > 0) {
    lines.push('  headers: {');
    for (const [k, v] of headersToEntries(headers)) {
      lines.push(`    "${k}": "${v}",`);
    }
    lines.push('  },');
  }

  if (body) {
    const escaped = body.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\${/g, '\\${');
    lines.push(`  body: \`${escaped}\`,`);
  }

  lines.push('});');
  lines.push('');
  lines.push('const data = await response.json();');
  lines.push('console.log(data);');
  return lines.join('\n');
}

export function generateJavaScriptAxios(input: CodeGenInput): string {
  const { method, url, headers, body } = input;
  const lines: string[] = ['import axios from "axios";', ''];
  lines.push('const config = {');
  lines.push(`  method: "${method.toLowerCase()}",`);
  lines.push(`  url: "${url}",`);

  if (headers && Object.keys(headers).length > 0) {
    lines.push('  headers: {');
    for (const [k, v] of headersToEntries(headers)) {
      lines.push(`    "${k}": "${v}",`);
    }
    lines.push('  },');
  }

  if (body) {
    lines.push(`  data: ${body},`);
  }

  lines.push('};');
  lines.push('');
  lines.push('const { data } = await axios(config);');
  lines.push('console.log(data);');
  return lines.join('\n');
}

export function generateNodeFetch(input: CodeGenInput): string {
  const { method, url, headers, body } = input;
  const lines: string[] = ['const fetch = require("node-fetch");', ''];
  lines.push('async function run() {');
  lines.push(`  const response = await fetch("${url}", {`);
  lines.push(`    method: "${method}",`);
  if (headers && Object.keys(headers).length > 0) {
    lines.push('    headers: {');
    for (const [k, v] of headersToEntries(headers)) {
      lines.push(`      "${k}": "${v}",`);
    }
    lines.push('    },');
  }
  if (body) {
    lines.push(`    body: JSON.stringify(${body}),`);
  }
  lines.push('  });');
  lines.push('  const data = await response.json();');
  lines.push('  console.log(data);');
  lines.push('}');
  lines.push('run();');
  return lines.join('\n');
}

export function generateDartHttp(input: CodeGenInput): string {
  const { method, url, headers, body } = input;
  const lines: string[] = ["import 'package:http/http.dart' as http;", ''];
  lines.push('void main() async {');
  lines.push(`  final uri = Uri.parse('${url}');`);
  if (headers && Object.keys(headers).length > 0) {
    lines.push('  final headers = {');
    for (const [k, v] of headersToEntries(headers)) {
      lines.push(`    '${k}': '${v}',`);
    }
    lines.push('  };');
  }
  if (body) {
    lines.push(`  final body = '''${body}''';`);
    lines.push(`  final response = await http.${method.toLowerCase()}(uri, headers: ${headers ? 'headers' : '{}'}, body: body);`);
  } else {
    lines.push(`  final response = await http.${method.toLowerCase()}(uri${headers ? ', headers: headers' : ''});`);
  }
  lines.push('  print(response.statusCode);');
  lines.push('  print(response.body);');
  lines.push('}');
  return lines.join('\n');
}

export function generateGo(input: CodeGenInput): string {
  const { method, url, headers, body } = input;
  const lines: string[] = [
    'package main', '',
    'import (', '  "fmt"', '  "io"', '  "net/http"', '  "strings"', ')', '',
    'func main() {',
  ];
  if (body) {
    lines.push(`  payload := strings.NewReader(\`${body}\`)`);
    lines.push(`  req, _ := http.NewRequest("${method}", "${url}", payload)`);
  } else {
    lines.push(`  req, _ := http.NewRequest("${method}", "${url}", nil)`);
  }
  for (const [k, v] of headersToEntries(headers)) {
    lines.push(`  req.Header.Add("${k}", "${v}")`);
  }
  lines.push('  client := &http.Client{}');
  lines.push('  resp, _ := client.Do(req)');
  lines.push('  defer resp.Body.Close()');
  lines.push('  body, _ := io.ReadAll(resp.Body)');
  lines.push('  fmt.Println(resp.StatusCode)');
  lines.push('  fmt.Println(string(body))');
  lines.push('}');
  return lines.join('\n');
}

export function generateJava(input: CodeGenInput): string {
  const { method, url, headers, body } = input;
  const lines: string[] = [
    'import java.net.URI;',
    'import java.net.http.HttpClient;',
    'import java.net.http.HttpRequest;',
    'import java.net.http.HttpResponse;',
    '',
    'public class ApiRequest {',
    '  public static void main(String[] args) throws Exception {',
    '    var client = HttpClient.newHttpClient();',
  ];
  lines.push(`    var request = HttpRequest.newBuilder()`);
  lines.push(`        .uri(URI.create("${url}"))`);
  for (const [k, v] of headersToEntries(headers)) {
    lines.push(`        .header("${k}", "${v}")`);
  }
  if (body) {
    lines.push(`        .${method}(HttpRequest.BodyPublishers.ofString("""${body}"""))`);
  } else {
    lines.push(`        .${method}(HttpRequest.BodyPublishers.noBody())`);
  }
  lines.push('        .build();');
  lines.push('    var response = client.send(request, HttpResponse.BodyHandlers.ofString());');
  lines.push('    System.out.println(response.statusCode());');
  lines.push('    System.out.println(response.body());');
  lines.push('  }');
  lines.push('}');
  return lines.join('\n');
}

export function generateKotlin(input: CodeGenInput): string {
  const { method, url, headers, body } = input;
  const lines: string[] = ['import okhttp3.OkHttpClient', 'import okhttp3.Request', ''];
  if (body) {
    lines.push('import okhttp3.RequestBody.Companion.toRequestBody');
    lines.push('import okhttp3.MediaType.Companion.toMediaType');
    lines.push('');
  }
  lines.push('val client = OkHttpClient()');
  if (body) {
    lines.push(`val body = """${body}""".toRequestBody("application/json".toMediaType())`);
  }
  lines.push('val request = Request.Builder()');
  lines.push(`    .url("${url}")`);
  for (const [k, v] of headersToEntries(headers)) {
    lines.push(`    .addHeader("${k}", "${v}")`);
  }
  if (body) {
    lines.push(`    .${method.toLowerCase()}(body)`);
  } else {
    lines.push(`    .${method.toLowerCase()}()`);
  }
  lines.push('    .build()');
  lines.push('');
  lines.push('val response = client.newCall(request).execute()');
  lines.push('println(response.code)');
  lines.push('println(response.body?.string())');
  return lines.join('\n');
}

export function generatePhp(input: CodeGenInput): string {
  const { method, url, headers, body } = input;
  const lines: string[] = ['<?php', ''];
  lines.push(`$ch = curl_init("${url}");`);
  lines.push('curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);');
  lines.push(`curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "${method}");`);
  if (headers && Object.keys(headers).length > 0) {
    lines.push('curl_setopt($ch, CURLOPT_HTTPHEADER, [');
    for (const [k, v] of headersToEntries(headers)) {
      lines.push(`  "${k}: ${v}",`);
    }
    lines.push(']);');
  }
  if (body) {
    lines.push(`curl_setopt($ch, CURLOPT_POSTFIELDS, '${body.replace(/'/g, "\\'")}');`);
  }
  lines.push('');
  lines.push('$response = curl_exec($ch);');
  lines.push('$statusCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);');
  lines.push('curl_close($ch);');
  lines.push('');
  lines.push('echo $statusCode . "\\n";');
  lines.push('echo $response . "\\n";');
  return lines.join('\n');
}

export function generateRuby(input: CodeGenInput): string {
  const { method, url, headers, body } = input;
  const lines: string[] = ['require "net/http"', 'require "uri"', ''];
  lines.push(`uri = URI("${url}")`);
  lines.push(`http = Net::HTTP.new(uri.host, uri.port)`);
  lines.push('http.use_ssl = true if uri.scheme == "https"');
  lines.push('');
  lines.push(`request = Net::HTTP::${method.charAt(0) + method.slice(1).toLowerCase()}.new(uri)`);
  for (const [k, v] of headersToEntries(headers)) {
    lines.push(`request["${k}"] = "${v}"`);
  }
  if (body) {
    lines.push(`request.body = '${body.replace(/'/g, "\\'")}'`);
  }
  lines.push('');
  lines.push('response = http.request(request)');
  lines.push('puts response.code');
  lines.push('puts response.body');
  return lines.join('\n');
}

export function generateRust(input: CodeGenInput): string {
  const { method, url, headers, body } = input;
  const lines: string[] = [
    'use reqwest;',
    '',
    '#[tokio::main]',
    'async fn main() -> Result<(), reqwest::Error> {',
    '    let client = reqwest::Client::new();',
  ];
  lines.push(`    let response = client.${method.toLowerCase()}("${url}")`);
  for (const [k, v] of headersToEntries(headers)) {
    lines.push(`        .header("${k}", "${v}")`);
  }
  if (body) {
    lines.push(`        .body(r#"${body}"#)`);
  }
  lines.push('        .send()');
  lines.push('        .await?;');
  lines.push('');
  lines.push('    println!("{}", response.status());');
  lines.push('    let text = response.text().await?;');
  lines.push('    println!("{}", text);');
  lines.push('    Ok(())');
  lines.push('}');
  return lines.join('\n');
}

export function generateCode(generatorId: string, input: CodeGenInput): string {
  switch (generatorId) {
    case 'curl': return generateCurl(input);
    case 'python-requests': return generatePythonRequests(input);
    case 'javascript-fetch': return generateJavaScriptFetch(input);
    case 'javascript-axios': return generateJavaScriptAxios(input);
    case 'nodejs-fetch': return generateNodeFetch(input);
    case 'dart-http': return generateDartHttp(input);
    case 'go-http': return generateGo(input);
    case 'java-http': return generateJava(input);
    case 'kotlin-okhttp': return generateKotlin(input);
    case 'php-curl': return generatePhp(input);
    case 'ruby-net': return generateRuby(input);
    case 'rust-reqwest': return generateRust(input);
    default: return generateCurl(input);
  }
}
