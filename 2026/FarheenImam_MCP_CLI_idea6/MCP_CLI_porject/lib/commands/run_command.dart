import 'dart:io';
import 'package:args/args.dart';
import '../models/models.dart';
import '../services/http_service.dart';
import '../services/storage_service.dart';
import '../utils/printer.dart';

// ---------------------------------------------------------------------------
// run / r — fire a named request or an inline one
//
// Usage:
//   apidash run "Request Name"
//   apidash run --url https://... [--method GET] [--header K:V] [--body '...']
//                                 [--save-as "Name"] [--collection "Col"]
// ---------------------------------------------------------------------------

Future<void> runCommand(List<String> args) async {
  final parser = ArgParser()
    ..addOption('url', abbr: 'u', help: 'Request URL (inline mode)')
    ..addOption('method', abbr: 'm', defaultsTo: 'GET', help: 'HTTP method')
    ..addMultiOption('header',
        abbr: 'H', help: 'Header in "Key: Value" format (repeatable)')
    ..addOption('body', abbr: 'b', help: 'Request body')
    ..addOption('save-as', abbr: 's', help: 'Save inline request with this name')
    ..addOption('collection',
        abbr: 'c', help: 'Collection to save into (used with --save-as)');

  ArgResults parsed;
  try {
    parsed = parser.parse(args);
  } catch (e) {
    printError('$e');
    print(parser.usage);
    exit(1);
  }

  final storage = StorageService();
  await storage.init();
  final http = HttpService(storage);

  final activeEnv = await storage.loadActiveEnvironment();
  final envVars = activeEnv?.variables ?? {};

  // ---- inline mode --------------------------------------------------------
  if (parsed['url'] != null) {
    final headers = <String, String>{};
    for (final h in parsed['header'] as List<String>) {
      final idx = h.indexOf(':');
      if (idx < 0) {
        printWarning('Skipping malformed header: $h (expected "Key: Value")');
        continue;
      }
      headers[h.substring(0, idx).trim()] = h.substring(idx + 1).trim();
    }

    final request = ApiRequest.create(
      name: parsed['save-as'] ?? '(inline)',
      method: (parsed['method'] as String).toUpperCase(),
      url: parsed['url'] as String,
      headers: headers,
      body: parsed['body'] as String?,
    );

    if (activeEnv != null) {
      printDim('env: ${activeEnv.name}');
    }

    await http.fire(request, envVars: envVars);

    // Optionally persist the request
    if (parsed['save-as'] != null) {
      await _saveRequest(
        storage,
        request.copyWith(name: parsed['save-as'] as String),
        parsed['collection'] as String?,
      );
      printSuccess('Saved as "${parsed['save-as']}"');
    }
    exit(0);
  }

  // ---- named mode ---------------------------------------------------------
  if (parsed.rest.isEmpty) {
    printError('Provide a request name or use --url for inline mode.');
    print('\nUsage: apidash run "Request Name"');
    print('       apidash run --url <url> [options]');
    print('\n${parser.usage}');
    exit(1);
  }

  final nameOrId = parsed.rest.join(' ');
  final found = await storage.findRequest(nameOrId);
  if (found == null) {
    printError('Request not found: "$nameOrId"');
    exit(1);
  }

  final (col, req) = found;
  if (activeEnv != null) printDim('env: ${activeEnv.name}');
  printDim('${req.method} ${req.url}');

  await http.fire(req, envVars: envVars);
  exit(0);
}

// ---- helpers ----------------------------------------------------------------

Future<void> _saveRequest(
    StorageService storage, ApiRequest request, String? collectionName) async {
  final collections = await storage.loadCollections();

  ApiCollection col;
  if (collectionName != null) {
    final existing = collections.where((c) =>
        c.name.toLowerCase() == collectionName.toLowerCase()).toList();
    if (existing.isEmpty) {
      col = ApiCollection.create(name: collectionName);
      collections.add(col);
    } else {
      col = existing.first;
    }
  } else {
    if (collections.isEmpty) {
      col = ApiCollection.create(name: 'Default');
      collections.add(col);
    } else {
      col = collections.first;
    }
  }

  col.requests.add(request.copyWith(collectionId: col.id));
  await storage.saveCollections(collections);
}
