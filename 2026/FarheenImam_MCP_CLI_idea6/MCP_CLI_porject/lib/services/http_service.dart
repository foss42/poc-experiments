import 'dart:io';
import 'dart:typed_data';
import 'package:http/http.dart' as http;
import 'package:path/path.dart' as p;
import '../models/models.dart';
import '../utils/printer.dart';
import '../utils/var_interpolator.dart';
import 'storage_service.dart';

// ---------------------------------------------------------------------------
// HTTP service — fires requests, prints results, returns ResponseMeta.
// ---------------------------------------------------------------------------

class HttpService {
  final StorageService _storage;

  HttpService(this._storage);

  Future<ResponseMeta> fire(
    ApiRequest request, {
    Map<String, String> envVars = const {},
    bool printBody = true,
    bool saveToHistory = true,
  }) async {
    // Interpolate variables
    final url = interpolate(request.url, envVars);
    final headers = interpolateHeaders(request.headers, envVars);
    final rawBody =
        request.body != null ? interpolate(request.body!, envVars) : null;

    final uri = Uri.tryParse(url);
    if (uri == null) {
      printError('Invalid URL: $url');
      exit(1);
    }

    final client = http.Client();
    late http.Response response;
    final sw = Stopwatch()..start();

    try {
      response = await _dispatch(client, request.method, uri, headers, rawBody);
    } on SocketException catch (e) {
      printError('Connection failed: ${e.message}');
      exit(1);
    } on http.ClientException catch (e) {
      printError('HTTP error: ${e.message}');
      exit(1);
    } finally {
      client.close();
      sw.stop();
    }

    final durationMs = sw.elapsedMilliseconds;
    final contentType = response.headers['content-type'];
    final bytes = response.bodyBytes;
    final sizeBytes = bytes.length;

    printStatusLine(
      response.statusCode,
      response.reasonPhrase ?? '',
      _cleanContentType(contentType),
      sizeBytes,
      durationMs,
    );

    if (printBody) {
      await _handleBody(bytes, contentType, response.statusCode);
    }

    final bodySample = _isTextual(contentType)
        ? _truncate(response.body, 4096)
        : '[binary ${_formatSize(sizeBytes)}]';

    final meta = ResponseMeta(
      statusCode: response.statusCode,
      statusMessage: response.reasonPhrase ?? '',
      contentType: _cleanContentType(contentType),
      sizeBytes: sizeBytes,
      durationMs: durationMs,
      body: bodySample,
    );

    if (saveToHistory) {
      final entry = HistoryEntry.create(request: request, response: meta);
      await _storage.appendHistory(entry);
    }

    return meta;
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
        return client.send(http.Request(method, uri)
              ..headers.addAll(headers)
              ..body = body ?? '')
            .then(http.Response.fromStream);
    }
  }

  // ---- body handler --------------------------------------------------------

  Future<void> _handleBody(
      Uint8List bytes, String? contentType, int statusCode) async {
    final ct = (contentType ?? '').toLowerCase();

    if (_isMedia(ct)) {
      await _saveMediaResponse(bytes, ct);
      return;
    }

    if (_isTextual(contentType)) {
      final body = String.fromCharCodes(bytes);
      print('');
      printResponseBody(body, ct);
    } else {
      printWarning('Binary response (${_formatSize(bytes.length)}). '
          'Use a media-aware client to view.');
    }
  }

  Future<void> _saveMediaResponse(Uint8List bytes, String ct) async {
    final ext = _extensionFor(ct);
    final ts = DateTime.now()
        .toIso8601String()
        .replaceAll(':', '-')
        .replaceAll('.', '-');
    final filename = 'response_$ts$ext';
    final dest = p.join(_storage.responsesDirPath, filename);
    await File(dest).writeAsBytes(bytes);

    printSection('Media response');
    printKeyValue('Type', ct);
    printKeyValue('Size', _formatSize(bytes.length));
    printKeyValue('Saved to', dest);
  }

  // ---- helpers -------------------------------------------------------------

  bool _isMedia(String ct) =>
      ct.contains('pdf') ||
      ct.contains('audio/') ||
      ct.contains('video/') ||
      ct.contains('image/');

  bool _isTextual(String? ct) {
    if (ct == null) return false;
    final c = ct.toLowerCase();
    return c.contains('text/') ||
        c.contains('json') ||
        c.contains('xml') ||
        c.contains('javascript') ||
        c.contains('html') ||
        c.contains('x-www-form-urlencoded');
  }

  String _cleanContentType(String? ct) {
    if (ct == null) return 'unknown';
    return ct.split(';').first.trim();
  }

  String _extensionFor(String ct) {
    if (ct.contains('pdf')) return '.pdf';
    if (ct.contains('mp3') || ct.contains('mpeg')) return '.mp3';
    if (ct.contains('ogg')) return '.ogg';
    if (ct.contains('wav')) return '.wav';
    if (ct.contains('mp4')) return '.mp4';
    if (ct.contains('webm')) return '.webm';
    if (ct.contains('png')) return '.png';
    if (ct.contains('jpeg') || ct.contains('jpg')) return '.jpg';
    if (ct.contains('gif')) return '.gif';
    if (ct.contains('svg')) return '.svg';
    return '.bin';
  }

  String _formatSize(int bytes) {
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
    return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
  }

  String _truncate(String s, int max) =>
      s.length <= max ? s : '${s.substring(0, max)}…';
}
