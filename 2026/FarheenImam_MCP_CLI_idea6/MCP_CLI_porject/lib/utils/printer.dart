import 'dart:convert';

// ---------------------------------------------------------------------------
// ANSI colour constants
// ---------------------------------------------------------------------------

const _reset = '\x1B[0m';
const _bold = '\x1B[1m';
const _dim = '\x1B[2m';
const _yellow = '\x1B[33m';
const _cyan = '\x1B[36m';
const _magenta = '\x1B[35m';
const _white = '\x1B[37m';
const _brightGreen = '\x1B[92m';
const _brightYellow = '\x1B[93m';
const _brightRed = '\x1B[91m';
const _brightBlue = '\x1B[94m';

// ---------------------------------------------------------------------------
// Public helpers
// ---------------------------------------------------------------------------

void printSuccess(String msg) => print('$_brightGreen✓$_reset $msg');
void printWarning(String msg) => print('$_brightYellow!$_reset $msg');
void printError(String msg) => print('$_brightRed✗$_reset $msg');
void printInfo(String msg) => print('$_cyan$msg$_reset');
void printDim(String msg) => print('$_dim$msg$_reset');
void printBold(String msg) => print('$_bold$msg$_reset');

// ---------------------------------------------------------------------------
// Response status line
// Format: ← 200 OK │ application/json │ 3.2 KB │ 142ms
// ---------------------------------------------------------------------------

void printStatusLine(int statusCode, String statusMessage,
    String? contentType, int sizeBytes, int durationMs) {
  final statusColor = _statusColor(statusCode);
  final sizeStr = _formatSize(sizeBytes);
  final ct = contentType ?? 'unknown';

  print(
    '$_dim←$_reset '
    '$_bold$statusColor$statusCode $statusMessage$_reset'
    ' $_dim│$_reset '
    '$_cyan$ct$_reset'
    ' $_dim│$_reset '
    '$_white$sizeStr$_reset'
    ' $_dim│$_reset '
    '$_dim${durationMs}ms$_reset',
  );
}

String _statusColor(int code) {
  if (code >= 200 && code < 300) return _brightGreen;
  if (code >= 300 && code < 400) return _brightYellow;
  if (code >= 400 && code < 500) return _yellow;
  if (code >= 500) return _brightRed;
  return _white;
}

String _formatSize(int bytes) {
  if (bytes < 1024) return '$bytes B';
  if (bytes < 1024 * 1024) {
    return '${(bytes / 1024).toStringAsFixed(1)} KB';
  }
  return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
}

// ---------------------------------------------------------------------------
// JSON pretty-printer
// ---------------------------------------------------------------------------

void printResponseBody(String body, String? contentType) {
  final ct = (contentType ?? '').toLowerCase();
  if (ct.contains('json')) {
    try {
      final decoded = jsonDecode(body);
      final pretty = const JsonEncoder.withIndent('  ').convert(decoded);
      print(_colorizeJson(pretty));
      return;
    } catch (_) {
      // fall through to plain text
    }
  }
  print('$_dim$body$_reset');
}

String _colorizeJson(String json) {
  // Minimal JSON colorization: keys cyan, strings yellow, numbers green,
  // booleans/null magenta.
  final buf = StringBuffer();
  bool inString = false;
  bool escape = false;
  bool isKey = false;

  for (var i = 0; i < json.length; i++) {
    final ch = json[i];
    if (escape) {
      escape = false;
      buf.write(ch);
      continue;
    }
    if (ch == '\\' && inString) {
      escape = true;
      buf.write(ch);
      continue;
    }
    if (ch == '"') {
      if (!inString) {
        inString = true;
        // Peek ahead to decide if this is a key
        final rest = json.substring(i + 1);
        final closeQuote = rest.indexOf('"');
        isKey = closeQuote >= 0 &&
            rest.substring(closeQuote + 1).trimLeft().startsWith(':');
        buf.write(isKey ? _cyan : _yellow);
        buf.write(ch);
      } else {
        buf.write(ch);
        buf.write(_reset);
        inString = false;
      }
      continue;
    }
    if (!inString) {
      if (ch == '{' || ch == '[') {
        buf.write('$_dim$ch$_reset');
        continue;
      }
      if (ch == '}' || ch == ']') {
        buf.write('$_dim$ch$_reset');
        continue;
      }
      if (ch == ':') {
        buf.write('$_dim:$_reset ');
        // skip the space that JsonEncoder already adds
        if (i + 1 < json.length && json[i + 1] == ' ') i++;
        continue;
      }
      // numbers
      if (RegExp(r'[\d\-]').hasMatch(ch)) {
        var numEnd = i;
        while (numEnd < json.length &&
            RegExp(r'[\d.\-eE+]').hasMatch(json[numEnd])) {
          numEnd++;
        }
        buf.write('$_brightGreen${json.substring(i, numEnd)}$_reset');
        i = numEnd - 1;
        continue;
      }
      // true / false / null
      if (json.startsWith('true', i)) {
        buf.write('$_magenta${json.substring(i, i + 4)}$_reset');
        i += 3;
        continue;
      }
      if (json.startsWith('false', i)) {
        buf.write('$_magenta${json.substring(i, i + 5)}$_reset');
        i += 4;
        continue;
      }
      if (json.startsWith('null', i)) {
        buf.write('$_magenta${json.substring(i, i + 4)}$_reset');
        i += 3;
        continue;
      }
    }
    buf.write(ch);
  }
  return buf.toString();
}

// ---------------------------------------------------------------------------
// Table helpers
// ---------------------------------------------------------------------------

void printTable(List<String> headers, List<List<String>> rows) {
  if (rows.isEmpty) return;
  final colWidths = List<int>.generate(headers.length, (i) {
    final maxRow = rows.map((r) => i < r.length ? r[i].length : 0).fold(0, (a, b) => a > b ? a : b);
    return headers[i].length > maxRow ? headers[i].length : maxRow;
  });

  final sep = colWidths.map((w) => '─' * (w + 2)).join('┼');
  final headerLine = headers
      .asMap()
      .entries
      .map((e) => ' $_bold${e.value.padRight(colWidths[e.key])}$_reset ')
      .join('│');

  print('┌${colWidths.map((w) => '─' * (w + 2)).join('┬')}┐');
  print('│$headerLine│');
  print('├$sep┤');
  for (final row in rows) {
    final cells = List<String>.generate(
        headers.length, (i) => i < row.length ? row[i] : '');
    print('│${cells.asMap().entries.map((e) => ' ${e.value.padRight(colWidths[e.key])} ').join('│')}│');
  }
  print('└${colWidths.map((w) => '─' * (w + 2)).join('┴')}┘');
}

// ---------------------------------------------------------------------------
// Section header
// ---------------------------------------------------------------------------

void printSection(String title) {
  print('\n$_bold$_brightBlue$title$_reset');
  print('$_dim${'─' * title.length}$_reset');
}

void printKeyValue(String key, String value) {
  print('  $_cyan${key.padRight(16)}$_reset $_white$value$_reset');
}
