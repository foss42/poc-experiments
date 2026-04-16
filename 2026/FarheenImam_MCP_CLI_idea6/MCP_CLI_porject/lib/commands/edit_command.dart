import 'dart:io';
import 'package:args/args.dart';
import '../services/storage_service.dart';
import '../utils/printer.dart';

// ---------------------------------------------------------------------------
// edit / e — update fields of a saved request
//
// Usage:
//   apidash edit "Request Name" [--url <url>] [--method <method>]
//                               [--header K:V] [--body <body>]
//                               [--name <new-name>]
// ---------------------------------------------------------------------------

Future<void> editCommand(List<String> args) async {
  if (args.isEmpty) {
    printError('Provide a request name or id.');
    print('\nUsage: apidash edit "Request Name" [options]');
    exit(1);
  }

  final parser = ArgParser()
    ..addOption('url', abbr: 'u', help: 'New URL')
    ..addOption('method', abbr: 'm', help: 'New HTTP method')
    ..addMultiOption('header',
        abbr: 'H', help: 'Replace/add header in "Key: Value" format')
    ..addOption('body', abbr: 'b', help: 'New request body')
    ..addOption('name', abbr: 'n', help: 'Rename the request');

  ArgResults parsed;
  try {
    parsed = parser.parse(args);
  } catch (e) {
    printError('$e');
    print(parser.usage);
    exit(1);
  }

  if (parsed.rest.isEmpty) {
    printError('Provide a request name or id.');
    exit(1);
  }

  final nameOrId = parsed.rest.join(' ');
  final storage = StorageService();
  await storage.init();

  final collections = await storage.loadCollections();

  bool found = false;
  for (final col in collections) {
    for (var i = 0; i < col.requests.length; i++) {
      final req = col.requests[i];
      if (req.id != nameOrId && req.name.toLowerCase() != nameOrId.toLowerCase()) {
        continue;
      }

      // Parse new headers
      final newHeaders = Map<String, String>.from(req.headers);
      for (final h in parsed['header'] as List<String>) {
        final idx = h.indexOf(':');
        if (idx < 0) {
          printWarning('Skipping malformed header: $h');
          continue;
        }
        newHeaders[h.substring(0, idx).trim()] = h.substring(idx + 1).trim();
      }

      col.requests[i] = req.copyWith(
        name: parsed['name'] as String?,
        url: parsed['url'] as String?,
        method: (parsed['method'] as String?)?.toUpperCase(),
        headers: newHeaders,
        body: parsed['body'] as String?,
      );

      found = true;
      break;
    }
    if (found) break;
  }

  if (!found) {
    printError('Request not found: "$nameOrId"');
    exit(1);
  }

  await storage.saveCollections(collections);
  printSuccess('Request updated.');
  exit(0);
}
