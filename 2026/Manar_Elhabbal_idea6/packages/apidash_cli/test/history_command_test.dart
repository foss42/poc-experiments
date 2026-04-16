import 'dart:io';
import 'package:apidash_cli/cli/cli_runner.dart';
import 'package:apidash_cli/models/request_model.dart';
import 'package:apidash_cli/models/respond_model.dart';
import 'package:apidash_cli/services/hive_cli_services.dart';
import 'package:test/test.dart';

void main() {
  late Directory tempDir;
  late CliRunner runner;

  setUp(() async {
    tempDir = await Directory.systemTemp.createTemp('apidash-history-test-');
    runner = CliRunner();
  });

  tearDown(() async {
    await hiveHandler.close();
    if (await tempDir.exists()) {
      await tempDir.delete(recursive: true);
    }
  });

  Future<void> populateHistory(int count) async {
    await hiveHandler.initWorkspaceStore(tempDir.path);
    for (int i = 0; i < count; i++) {
      final id = 'req_$i';
      final request = RequestModel(
        id: id,
        name: 'Request $i',
        url: 'https://api.example.com/$i',
        method: RequestMethod.get,
        response: ResponseModel(statusCode: 200, body: 'Response $i'),
      );
      await hiveHandler.setRequestModel(id, request.toJson());
      final ids = hiveHandler.getIds() ?? [];
      if (!ids.contains(id)) {
        await hiveHandler.setIds([id, ...ids]);
      }
    }
    await hiveHandler.close(); // Close so command can re-open it
  }

  test('history command shows empty history', () async {
    final result = await runner.run(['history', '-w', tempDir.path]);
    expect(result, 0);
  });

  test('history command lists requests', () async {
    await populateHistory(3);

    // Using a simple print override or just checking if it runs successfully
    // In a real test we might want to capture stdout
    final result = await runner.run(['history', '-w', tempDir.path]);
    expect(result, 0);
  });

  test('history command respects limit', () async {
    await populateHistory(5);
    final result =
        await runner.run(['history', '-w', tempDir.path, '--limit', '2']);
    expect(result, 0);
  });

  test('history command can clear history', () async {
    await populateHistory(3);

    // Verify it exists
    await hiveHandler.initWorkspaceStore(tempDir.path);
    expect(hiveHandler.getIds()?.length, 3);
    await hiveHandler.close();

    final result = await runner.run(['history', '-w', tempDir.path, '--clear']);
    expect(result, 0);

    // Verify it's cleared
    await hiveHandler.initWorkspaceStore(tempDir.path);
    expect(hiveHandler.getIds()?.length, 0);
    await hiveHandler.close();
  });

  test('history command can delete a specific request', () async {
    await populateHistory(3);

    final result =
        await runner.run(['history', '-w', tempDir.path, '--delete', 'req_1']);
    expect(result, 0);

    // Verify it's deleted
    await hiveHandler.initWorkspaceStore(tempDir.path);
    expect(hiveHandler.getIds(), isNot(contains('req_1')));
    expect(hiveHandler.getIds()?.length, 2);
    await hiveHandler.close();
  });

  test('history command cleans up duplicate IDs in index', () async {
    await hiveHandler.initWorkspaceStore(tempDir.path);
    final id = 'duplicate_id';
    final request = RequestModel(
      id: id,
      name: 'Duplicate Request',
      url: 'https://api.example.com/dup',
      method: RequestMethod.get,
      response: ResponseModel(statusCode: 200, body: 'Response'),
    );
    // Manually put duplicate IDs in the index
    await hiveHandler.setRequestModel(id, request.toJson());
    await hiveHandler.setIds([id, id, id]); // Force duplicates

    expect(hiveHandler.getIds()?.length, 3);
    await hiveHandler.close();

    // Running history should clean it up
    final result = await runner.run(['history', '-w', tempDir.path]);
    expect(result, 0);

    // Verify it's cleaned
    await hiveHandler.initWorkspaceStore(tempDir.path);
    expect(hiveHandler.getIds()?.length, 1);
    await hiveHandler.close();
  });

  test('detect race condition in setRequestModel', () async {
    await hiveHandler.initWorkspaceStore(tempDir.path);

    final id = 'race_test';

    final request = RequestModel(
      id: id,
      name: 'Race Test',
      url: 'https://api.example.com/race',
      method: RequestMethod.get,
      response: ResponseModel(statusCode: 200, body: 'OK'),
    );

    await Future.wait([
      hiveHandler.setRequestModel(id, request.toJson()),
      hiveHandler.setRequestModel(id, request.toJson()),
    ]);

    final ids = hiveHandler.getIds();

    print('RACE IDS: $ids');

    expect(ids!.where((e) => e == id).length, 1);

    await hiveHandler.close();
  });
}
