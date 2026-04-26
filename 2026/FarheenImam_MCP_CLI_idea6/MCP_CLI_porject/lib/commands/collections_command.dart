import 'dart:io';
import '../services/storage_service.dart';
import '../utils/printer.dart';

// ---------------------------------------------------------------------------
// collections / c — list all collections
// ---------------------------------------------------------------------------

Future<void> collectionsCommand(List<String> args) async {
  final storage = StorageService();
  await storage.init();

  final collections = await storage.loadCollections();

  if (collections.isEmpty) {
    printInfo('No collections found.');
    printDim('Create one with:  apidash run --url <url> --save-as "Name" --collection "My Collection"');
    exit(0);
  }

  printSection('Collections');
  printTable(
    ['#', 'Name', 'Requests', 'Description'],
    collections.asMap().entries.map((e) {
      final col = e.value;
      return [
        '${e.key + 1}',
        col.name,
        '${col.requests.length}',
        col.description ?? '',
      ];
    }).toList(),
  );

  exit(0);
}
