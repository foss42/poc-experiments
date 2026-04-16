import 'dart:convert';
import 'dart:io';

import 'package:apidash_cli/services/config_service.dart';
import 'package:apidash_cli/services/hive_cli_services.dart';
import 'package:test/test.dart';

void main() {
  test('initProject creates .apidash/config.json', () async {
    final tempDir = await Directory.systemTemp.createTemp('apidash-cli-test-');
    addTearDown(() => tempDir.delete(recursive: true));

    final service = ConfigService();
    final result = await service.initProject(workingDirectory: tempDir);

    expect(result.created, isTrue);
    final configFile = File(result.configPath);
    expect(await configFile.exists(), isTrue);

    final configJson =
        jsonDecode(await configFile.readAsString()) as Map<String, dynamic>;
    expect(configJson['version'], kApidashConfigVersion);
    expect(configJson['projectName'], isNotEmpty);
  });

  test('HiveHandler adds ID only once in setRequestModel', () async {
    final tempDir = await Directory.systemTemp.createTemp('hive-test-');
    addTearDown(() async {
      await hiveHandler.close();
      await tempDir.delete(recursive: true);
    });

    await hiveHandler.initWorkspaceStore(tempDir.path);

    final id = 'test_id';
    final data = {'id': id, 'name': 'test'};

    await hiveHandler.setRequestModel(id, data);
    expect(hiveHandler.getIds(), contains(id));
    expect(hiveHandler.getIds()!.length, 1);

    // Call it again with same ID
    await hiveHandler.setRequestModel(id, data);
    expect(hiveHandler.getIds()!.length, 1,
        reason: 'ID should not be duplicated');
  });
}
