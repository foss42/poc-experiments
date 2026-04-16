import 'dart:io';
import '../services/storage_service.dart';
import '../utils/printer.dart';

// ---------------------------------------------------------------------------
// rename / rn — rename a saved request
//
// Usage: apidash rename "Old Name" "New Name"
// ---------------------------------------------------------------------------

Future<void> renameCommand(List<String> args) async {
  if (args.length < 2) {
    printError('Usage: apidash rename "Old Name" "New Name"');
    exit(1);
  }

  final oldName = args[0];
  final newName = args[1];

  final storage = StorageService();
  await storage.init();

  final collections = await storage.loadCollections();
  bool found = false;

  outer:
  for (final col in collections) {
    for (var i = 0; i < col.requests.length; i++) {
      final req = col.requests[i];
      if (req.id == oldName || req.name.toLowerCase() == oldName.toLowerCase()) {
        col.requests[i] = req.copyWith(name: newName);
        found = true;
        break outer;
      }
    }
  }

  if (!found) {
    printError('Request not found: "$oldName"');
    exit(1);
  }

  await storage.saveCollections(collections);
  printSuccess('Renamed "$oldName" → "$newName"');
  exit(0);
}
