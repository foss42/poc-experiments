import 'dart:io';
import '../services/storage_service.dart';
import '../utils/printer.dart';

// ---------------------------------------------------------------------------
// show / s — display details of a saved request
// ---------------------------------------------------------------------------

Future<void> showCommand(List<String> args) async {
  if (args.isEmpty) {
    printError('Provide a request name or id.');
    print('\nUsage: apidash show "Request Name"');
    exit(1);
  }

  final nameOrId = args.join(' ');
  final storage = StorageService();
  await storage.init();

  final found = await storage.findRequest(nameOrId);
  if (found == null) {
    printError('Request not found: "$nameOrId"');
    exit(1);
  }

  final (col, req) = found;

  printSection('Request: ${req.name}');
  printKeyValue('ID', req.id);
  printKeyValue('Collection', col?.name ?? '—');
  printKeyValue('Method', req.method);
  printKeyValue('URL', req.url);

  if (req.headers.isNotEmpty) {
    printSection('Headers');
    for (final entry in req.headers.entries) {
      printKeyValue(entry.key, entry.value);
    }
  }

  if (req.body != null && req.body!.isNotEmpty) {
    printSection('Body');
    printResponseBody(req.body!, null);
  }

  exit(0);
}
