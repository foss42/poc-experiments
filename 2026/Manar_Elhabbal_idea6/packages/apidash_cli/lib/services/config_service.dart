import 'dart:io';
import 'dart:convert';

const String kApidashFolderName = '.apidash';
const String kApidashConfigFileName = 'config.json';
const String kApidashConfigVersion = '1.0.0';
const String kApidashCollectionPath = 'collections';
const String kApidashEnvironmentPath = 'environments';
const String kApidashHistoryPath = 'history';
const String kApidashHistoryLazyPath = 'history-lazy';

class InitResult {
  const InitResult({
    required this.configPath,
    required this.created,
    this.overwritten = false,
  });

  final String configPath;
  final bool created;
  final bool overwritten;
}

class ConfigService {
  Future<InitResult> initProject({
    Directory? workingDirectory,
    String? projectName,
    bool force = false,
  }) async {
    final cwd = workingDirectory ?? Directory.current;
    final apidashDirectory = Directory('${cwd.path}/$kApidashFolderName');
    final configFile = File('${apidashDirectory.path}/$kApidashConfigFileName');

    projectName ??= cwd.uri.pathSegments
        .lastWhere((s) => s.isNotEmpty, orElse: () => 'my-project');

    final alreadyExists = await configFile.exists();
    if (alreadyExists && !force) {
      return InitResult(
        configPath: configFile.path,
        created: false,
        overwritten: false,
      );
    }

    await apidashDirectory.create(recursive: true);

    final subDirectories = [
      kApidashCollectionPath,
      kApidashEnvironmentPath,
      kApidashHistoryPath,
      kApidashHistoryLazyPath,
    ];

    for (final subDir in subDirectories) {
      final dir = Directory('${apidashDirectory.path}/$subDir');
      await dir.create(recursive: true);
    }

    final configContent = {
      'version': kApidashConfigVersion,
      'projectName': projectName,
      'createdAt': DateTime.now().toIso8601String(),
      'paths': {
        'collections': kApidashCollectionPath,
        'environments': kApidashEnvironmentPath,
        'history': kApidashHistoryPath,
        'historyLazy': kApidashHistoryLazyPath,
      },
    };

    await configFile.writeAsString(
      const JsonEncoder.withIndent('  ').convert(configContent),
    );

    return InitResult(
      configPath: configFile.path,
      created: true,
      overwritten: alreadyExists,
    );
  }
}
