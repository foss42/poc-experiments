import 'package:args/command_runner.dart';

const String infoColor = '\x1B[34m'; // Blue
const String errorColor = '\x1B[31m'; // Red
const String successColor = '\x1B[32m'; // Green
const String resetColor = '\x1B[0m'; // Reset

abstract class BaseCommand extends Command<int> {
  void info(String message) => print('$infoColor$message$resetColor');
  void success(String message) => print('$successColor$message$resetColor');
  void error(String message) => print('$errorColor$message$resetColor');

  Never fail(String message) => throw Exception(message);
}
