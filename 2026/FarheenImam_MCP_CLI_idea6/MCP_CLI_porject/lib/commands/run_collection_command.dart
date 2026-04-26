import 'dart:io';
import '../services/http_service.dart';
import '../services/storage_service.dart';
import '../utils/printer.dart';

// ---------------------------------------------------------------------------
// run-collection / rc — run every request in a collection sequentially
// ---------------------------------------------------------------------------

Future<void> runCollectionCommand(List<String> args) async {
  if (args.isEmpty) {
    printError('Provide a collection name.');
    print('\nUsage: apidash run-collection "Collection Name"');
    exit(1);
  }

  final nameOrId = args.join(' ');
  final storage = StorageService();
  await storage.init();

  final collections = await storage.loadCollections();
  final col = collections.where((c) =>
      c.id == nameOrId || c.name.toLowerCase() == nameOrId.toLowerCase()).toList();

  if (col.isEmpty) {
    printError('Collection not found: "$nameOrId"');
    exit(1);
  }

  final collection = col.first;

  if (collection.requests.isEmpty) {
    printWarning('Collection "${collection.name}" has no requests.');
    exit(0);
  }

  final httpSvc = HttpService(storage);
  final activeEnv = await storage.loadActiveEnvironment();
  final envVars = activeEnv?.variables ?? {};

  if (activeEnv != null) printDim('env: ${activeEnv.name}');
  printSection('Running "${collection.name}" (${collection.requests.length} requests)');

  int passed = 0;
  int failed = 0;

  for (var i = 0; i < collection.requests.length; i++) {
    final req = collection.requests[i];
    print('\n[${i + 1}/${collection.requests.length}] ${req.name}');
    printDim('  ${req.method} ${req.url}');

    final meta = await httpSvc.fire(
      req,
      envVars: envVars,
      printBody: false,
      saveToHistory: true,
    );

    if (meta.statusCode >= 200 && meta.statusCode < 300) {
      passed++;
    } else {
      failed++;
    }
  }

  print('');
  printSection('Summary');
  printKeyValue('Total', '${collection.requests.length}');
  printKeyValue('Passed (2xx)', '$passed');
  if (failed > 0) {
    printKeyValue('Failed', '$failed');
  }

  exit(0);
}
