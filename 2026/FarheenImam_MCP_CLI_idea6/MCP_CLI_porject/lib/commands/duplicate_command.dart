import 'dart:io';
import '../models/models.dart';
import '../services/storage_service.dart';
import '../utils/printer.dart';

// ---------------------------------------------------------------------------
// duplicate / dup — copy a request (appends " (copy)" to the name)
//
// Usage: apidash duplicate "Request Name" [--as "New Name"]
// ---------------------------------------------------------------------------

Future<void> duplicateCommand(List<String> args) async {
  if (args.isEmpty) {
    printError('Usage: apidash duplicate "Request Name"');
    exit(1);
  }

  final nameOrId = args[0];
  String? customName;
  if (args.length >= 3 && args[1] == '--as') {
    customName = args.sublist(2).join(' ');
  }

  final storage = StorageService();
  await storage.init();

  final collections = await storage.loadCollections();
  bool found = false;

  outer:
  for (final col in collections) {
    for (final req in col.requests) {
      if (req.id != nameOrId && req.name.toLowerCase() != nameOrId.toLowerCase()) {
        continue;
      }

      final copyName = customName ?? '${req.name} (copy)';
      final copy = ApiRequest(
        id: generateId(),
        name: copyName,
        method: req.method,
        url: req.url,
        headers: Map.from(req.headers),
        body: req.body,
        collectionId: col.id,
      );
      col.requests.add(copy);
      found = true;
      printSuccess('Duplicated "${req.name}" → "$copyName"');
      break outer;
    }
  }

  if (!found) {
    printError('Request not found: "$nameOrId"');
    exit(1);
  }

  await storage.saveCollections(collections);
  exit(0);
}
