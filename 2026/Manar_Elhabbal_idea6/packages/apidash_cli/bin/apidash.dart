// bin/apidash.dart
// CLI entry point — run with: dart run bin/apidash.dart or apidash after global activation

import 'package:apidash_cli/apidash_cli.dart';
import 'package:args/command_runner.dart';
import 'package:apidash_cli/utils/banner.dart';

const String _version = 'v1.0.0';

Future<void> main(List<String> args) async {
  final showBanner =
      args.isEmpty || args.contains('--help') || args.contains('-h');

  if (showBanner) printBanner(_version);

  if (args.isEmpty) return;

  try {
    await runCli(args);
  } on UsageException catch (e) {
    print(e.message);
    print('');
    print(e.usage);
  }
}
