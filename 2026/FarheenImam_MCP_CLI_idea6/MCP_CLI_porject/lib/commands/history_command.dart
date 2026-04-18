import 'dart:io';
import '../models/models.dart';
import '../services/http_service.dart';
import '../services/storage_service.dart';
import '../utils/printer.dart';

// ---------------------------------------------------------------------------
// history sub-commands:
//   history         (h)   — list recent history
//   history replay  (hr)  — replay a history entry by short id
//   history search  (hs)  — search history by URL / method / status
//   history save    (hsv) — save history entry as a named request
// ---------------------------------------------------------------------------

Future<void> historyCommand(List<String> args) async {
  if (args.isEmpty) {
    await _historyList([]);
    return;
  }

  final sub = args[0];
  final rest = args.sublist(1);

  switch (sub) {
    case 'replay':
      await _historyReplay(rest);
    case 'search':
      await _historySearch(rest);
    case 'save':
      await _historySave(rest);
    default:
      // Treat as list with possible limit arg
      await _historyList(args);
  }
}

// ---- list -------------------------------------------------------------------

Future<void> _historyList(List<String> args) async {
  final storage = StorageService();
  await storage.init();

  final history = await storage.loadHistory();

  if (history.isEmpty) {
    printInfo('No history yet. Run a request first.');
    exit(0);
  }

  final limit = args.isNotEmpty ? (int.tryParse(args[0]) ?? 20) : 20;
  final recent = history.reversed.take(limit).toList();

  printSection('Recent history (${recent.length} of ${history.length})');
  printTable(
    ['#', 'Short ID', 'Method', 'URL', 'Status', 'Size', 'Time', 'Saved'],
    recent.asMap().entries.map((e) {
      final h = e.value;
      final shortId = h.id.substring(0, 8);
      return [
        '${e.key + 1}',
        shortId,
        h.request.method,
        _truncUrl(h.request.url, 40),
        '${h.response.statusCode}',
        _fmt(h.response.sizeBytes),
        '${h.response.durationMs}ms',
        h.savedAs ?? '',
      ];
    }).toList(),
  );

  printDim('\nReplay: apidash history replay <short-id>');
  printDim('Search: apidash history search <query>');
  exit(0);
}

// ---- replay -----------------------------------------------------------------

Future<void> _historyReplay(List<String> args) async {
  if (args.isEmpty) {
    printError('Provide a short id (first 8 chars from history list).');
    exit(1);
  }

  final shortId = args[0];
  final storage = StorageService();
  await storage.init();

  final history = await storage.loadHistory();
  final matches = history.where((h) => h.id.startsWith(shortId)).toList();

  if (matches.isEmpty) {
    printError('No history entry matches id: $shortId');
    exit(1);
  }
  if (matches.length > 1) {
    printWarning('Ambiguous id — multiple matches. Use more characters.');
    exit(1);
  }

  final entry = matches.first;
  printDim('Replaying: ${entry.request.method} ${entry.request.url}');
  printDim('Original:  ${entry.timestamp.toLocal()}');

  final activeEnv = await storage.loadActiveEnvironment();
  final httpSvc = HttpService(storage);
  await httpSvc.fire(
    entry.request,
    envVars: activeEnv?.variables ?? {},
    saveToHistory: true,
  );

  exit(0);
}

// ---- search -----------------------------------------------------------------

Future<void> _historySearch(List<String> args) async {
  if (args.isEmpty) {
    printError('Provide a search query (URL, method, or status code).');
    exit(1);
  }

  final query = args.join(' ').toLowerCase();
  final storage = StorageService();
  await storage.init();

  final history = await storage.loadHistory();
  final results = history.where((h) {
    return h.request.url.toLowerCase().contains(query) ||
        h.request.method.toLowerCase().contains(query) ||
        '${h.response.statusCode}'.contains(query) ||
        (h.savedAs?.toLowerCase().contains(query) ?? false);
  }).toList();

  if (results.isEmpty) {
    printInfo('No history entries matching "$query".');
    exit(0);
  }

  printSection('History search: "$query" (${results.length} results)');
  printTable(
    ['Short ID', 'Method', 'URL', 'Status', 'Time', 'Saved'],
    results.reversed.map((h) {
      return [
        h.id.substring(0, 8),
        h.request.method,
        _truncUrl(h.request.url, 40),
        '${h.response.statusCode}',
        '${h.response.durationMs}ms',
        h.savedAs ?? '',
      ];
    }).toList(),
  );

  exit(0);
}

// ---- save -------------------------------------------------------------------

Future<void> _historySave(List<String> args) async {
  if (args.length < 2) {
    printError('Usage: apidash history save <short-id> "Request Name"');
    exit(1);
  }

  final shortId = args[0];
  final saveName = args.sublist(1).join(' ');

  final storage = StorageService();
  await storage.init();

  final history = await storage.loadHistory();
  final matchIdx = history.indexWhere((h) => h.id.startsWith(shortId));

  if (matchIdx < 0) {
    printError('No history entry matches id: $shortId');
    exit(1);
  }

  final entry = history[matchIdx];

  // Save as a request in Default collection
  final collections = await storage.loadCollections();
  ApiCollection col;
  if (collections.isEmpty) {
    col = ApiCollection.create(name: 'Default');
    collections.add(col);
  } else {
    col = collections.first;
  }

  final saved = entry.request.copyWith(name: saveName, collectionId: col.id);
  col.requests.add(saved);
  await storage.saveCollections(collections);

  // Mark history entry as saved
  history[matchIdx].savedAs = saveName;
  await storage.saveHistory(history);

  printSuccess('Saved as "$saveName" in collection "${col.name}".');
  exit(0);
}

// ---- helpers ----------------------------------------------------------------

String _truncUrl(String url, int max) =>
    url.length <= max ? url : '${url.substring(0, max)}…';

String _fmt(int bytes) {
  if (bytes < 1024) return '$bytes B';
  if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
  return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
}
