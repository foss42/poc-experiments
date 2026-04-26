import 'dart:io';
import '../services/storage_service.dart';
import '../utils/printer.dart';

// ---------------------------------------------------------------------------
// delete / del — remove a request (or a collection with --collection flag)
//
// Usage:
//   apidash delete "Request Name"
//   apidash delete --collection "Collection Name"
// ---------------------------------------------------------------------------

Future<void> deleteCommand(List<String> args) async {
  if (args.isEmpty) {
    printError('Usage: apidash delete "Request Name"');
    print('       apidash delete --collection "Collection Name"');
    exit(1);
  }

  final storage = StorageService();
  await storage.init();

  // Delete collection
  if (args[0] == '--collection' || args[0] == '-c') {
    if (args.length < 2) {
      printError('Provide a collection name.');
      exit(1);
    }
    final colName = args.sublist(1).join(' ');
    final collections = await storage.loadCollections();
    final before = collections.length;
    collections.removeWhere((c) =>
        c.id == colName || c.name.toLowerCase() == colName.toLowerCase());

    if (collections.length == before) {
      printError('Collection not found: "$colName"');
      exit(1);
    }

    await storage.saveCollections(collections);
    printSuccess('Deleted collection "$colName".');
    exit(0);
  }

  // Delete request
  final nameOrId = args.join(' ');
  final collections = await storage.loadCollections();
  bool found = false;

  outer:
  for (final col in collections) {
    for (var i = 0; i < col.requests.length; i++) {
      final req = col.requests[i];
      if (req.id == nameOrId ||
          req.name.toLowerCase() == nameOrId.toLowerCase()) {
        col.requests.removeAt(i);
        found = true;
        printSuccess('Deleted "${req.name}" from "${col.name}".');
        break outer;
      }
    }
  }

  if (!found) {
    printError('Request not found: "$nameOrId"');
    exit(1);
  }

  await storage.saveCollections(collections);
  exit(0);
}
