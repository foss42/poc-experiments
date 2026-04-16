import 'package:apidash_cli/cli/cli_runner.dart';

Future<int> runCli(List<String> args) async {
  final runner = CliRunner();
  return await runner.run(args) ?? 0;
}
