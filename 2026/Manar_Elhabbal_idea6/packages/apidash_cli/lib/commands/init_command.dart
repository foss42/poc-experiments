import 'package:apidash_cli/cli/base_command.dart';
import 'package:apidash_cli/services/config_service.dart';

class InitCommand extends BaseCommand {
  InitCommand({ConfigService? configService})
      : _configService = configService ?? ConfigService() {
    argParser
      ..addFlag(
        'force',
        abbr: 'f',
        defaultsTo: false,
        help: 'Overwrite existing config if present.',
      )
      ..addOption(
        'name',
        abbr: 'n',
        help: 'Project name to save in the config file.',
      );
  }

  final ConfigService _configService;

  @override
  String get name => 'init';

  @override
  String get description => 'Initialize API Dash config in current directory.';

  @override
  Future<int> run() async {
    final force = argResults!['force'] as bool;
    final projectName = argResults?['name'] as String?;

    if (projectName != null && projectName.trim().isEmpty) {
      error('Project name cannot be empty.');
      return 1;
    }

    try {
      final result = await _configService.initProject(
        projectName: projectName?.trim(),
        force: force,
      );

      if (!result.created) {
        info('Configuration already exists.');
        info('Use --force (-f) to overwrite.');
        return 1;
      }

      if (result.overwritten) {
        success('API Dash config overwritten successfully!');
      } else {
        success('API Dash initialized successfully!');
      }

      info('Config written to: ${result.configPath}');

      return 0;
    } catch (e) {
      error('Failed to initialize API Dash config: $e');
      return 1;
    }
  }
}
