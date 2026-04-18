import 'package:http/http.dart' as http;
import '../models/models.dart';
import '../services/storage_service.dart';
import '../utils/var_interpolator.dart';

// ---------------------------------------------------------------------------
// McpHttp — a silent HTTP executor for MCP tools.
//
// Never writes to stdout (stdout is reserved for JSON-RPC protocol frames).
// All output is returned as McpHttpResult or thrown as exceptions.
// Saves each fired request to history.json via StorageService.
// ---------------------------------------------------------------------------

class McpHttpResult {
  final int statusCode;
  final String statusText;
  final Map<String, String> responseHeaders;
  final String body;
  final int durationMs;
  final String contentType;

  McpHttpResult({
    required this.statusCode,
    required this.statusText,
    required this.responseHeaders,
    required this.body,
    required this.durationMs,
    required this.contentType,
  });

  Map<String, dynamic> toJson() => {
        'status': statusCode,
        'statusText': statusText,
        'headers': responseHeaders,
        'body': body,
        'durationMs': durationMs,
        'contentType': contentType,
      };
}

class McpHttp {
  final StorageService _storage;

  McpHttp(this._storage);

  Future<McpHttpResult> fire(
    ApiRequest request, {
    Map<String, String> envVars = const {},
    bool saveHistory = true,
  }) async {
    final url = interpolate(request.url, envVars);
    final headers = interpolateHeaders(request.headers, envVars);
    final rawBody =
        request.body != null ? interpolate(request.body!, envVars) : null;

    final uri = Uri.tryParse(url);
    if (uri == null) throw Exception('Invalid URL: $url');

    final client = http.Client();
    final sw = Stopwatch()..start();
    http.Response response;

    try {
      response =
          await _dispatch(client, request.method, uri, headers, rawBody);
    } finally {
      sw.stop();
      client.close();
    }

    final ct = response.headers['content-type'] ?? 'unknown';
    final cleanCt = ct.split(';').first.trim();
    final responseBody =
        _isTextual(ct) ? response.body : '[binary ${response.bodyBytes.length} bytes]';
    final truncated = responseBody.length > 8192
        ? '${responseBody.substring(0, 8192)}…'
        : responseBody;

    if (saveHistory) {
      final meta = ResponseMeta(
        statusCode: response.statusCode,
        statusMessage: response.reasonPhrase ?? '',
        contentType: cleanCt,
        sizeBytes: response.bodyBytes.length,
        durationMs: sw.elapsedMilliseconds,
        body: truncated,
      );
      await _storage
          .appendHistory(HistoryEntry.create(request: request, response: meta));
    }

    return McpHttpResult(
      statusCode: response.statusCode,
      statusText: response.reasonPhrase ?? '',
      responseHeaders: Map<String, String>.from(response.headers),
      body: responseBody,
      durationMs: sw.elapsedMilliseconds,
      contentType: cleanCt,
    );
  }

  // ---- dispatch ------------------------------------------------------------

  Future<http.Response> _dispatch(
    http.Client client,
    String method,
    Uri uri,
    Map<String, String> headers,
    String? body,
  ) {
    switch (method.toUpperCase()) {
      case 'GET':
        return client.get(uri, headers: headers);
      case 'POST':
        return client.post(uri, headers: headers, body: body);
      case 'PUT':
        return client.put(uri, headers: headers, body: body);
      case 'PATCH':
        return client.patch(uri, headers: headers, body: body);
      case 'DELETE':
        return client.delete(uri, headers: headers, body: body);
      case 'HEAD':
        return client.head(uri, headers: headers);
      default:
        return client
            .send(http.Request(method, uri)
              ..headers.addAll(headers)
              ..body = body ?? '')
            .then(http.Response.fromStream);
    }
  }

  bool _isTextual(String ct) {
    final c = ct.toLowerCase();
    return c.contains('text/') ||
        c.contains('json') ||
        c.contains('xml') ||
        c.contains('javascript') ||
        c.contains('html');
  }
}
