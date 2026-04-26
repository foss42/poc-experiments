import 'dart:convert';
import 'dart:io';
import 'package:uuid/uuid.dart';
import 'package:apidash_cli/models/name_value_model.dart';
import 'package:apidash_cli/models/request_model.dart';
import 'package:apidash_cli/services/hive_cli_services.dart';
import 'package:apidash_cli/services/http_service.dart';
import '../cli/base_command.dart';

class RequestCommand extends BaseCommand {
  RequestCommand() {
    argParser
      ..addOption('workspace', abbr: 'w', help: 'Path to API Dash workspace')
      ..addOption('output',
          abbr: 'o', defaultsTo: 'human', help: 'Output format: human or json')
      ..addOption('name', help: 'Custom name for the request in history')
      ..addOption('body', help: 'Request body for POST/PUT/PATCH')
      ..addMultiOption('header',
          abbr: 'H', help: 'Add header (can be used multiple times)');
  }

  @override
  String get name => 'request';

  @override
  String get description => 'Execute HTTP request and save to history';

  @override
  Future<int> run() async {
    final args = argResults!.rest;
    if (args.length < 2) {
      info('Usage: apidash request <METHOD> <URL>');
      return 1;
    }

    final methodStr = args[0].toLowerCase(); // for case-insensitive matching
    final url = args[1];
    final workspace = argResults!['workspace'] as String? ?? '.apidash';
    final outputFormat = argResults!['output'] as String;
    final name = argResults!['name'] as String? ?? url;
    final body = argResults!['body'] as String?;
    final headersArgs = argResults!['header'] as List<String>? ?? [];

    // Parse HTTP method
    RequestMethod method;
    try {
      method = RequestMethod.values.firstWhere((v) => v.name == methodStr);
    } catch (_) {
      error('Invalid HTTP method: $methodStr');
      return 1;
    }

    // Prepare headers
    final headers = <NameValueModel>[];
    for (var h in headersArgs) {
      final parts = h.split(':');
      if (parts.length >= 2) {
        headers.add(NameValueModel(
          name: parts[0].trim(),
          value: parts.sublist(1).join(':').trim(),
        ));
      }
    }

    await hiveHandler.initWorkspaceStore(workspace);
    final currentIds = (hiveHandler.getIds() ?? []).toSet().toList();
    String? existingId;
    for (var id in currentIds) {
      final json = await hiveHandler.getRequestModel(id);
      if (json != null && json['url'] == url && json['method'] == method.name) {
        existingId = id;
        break;
      }
    }

    final httpService = HttpService();
    final start = DateTime.now();

    try {
      final response = await httpService.sendRequest(
        method: method,
        url: url,
        headers: headers,
        body: body,
      );
      final duration = DateTime.now().difference(start);

      // check the type of response based on content-type header
      final contentType = response.headers
          ?.firstWhere(
            (h) => h.name.toLowerCase() == 'content-type',
            orElse: () => NameValueModel(name: '', value: ''),
          )
          .value
          .toLowerCase();

      final isMedia = contentType != null &&
          contentType.isNotEmpty &&
          (contentType.contains('image/') ||
              contentType.contains('video/') ||
              contentType.contains('audio/') ||
              contentType.contains('application/pdf'));

      if (isMedia) {
        final extension = contentType.contains('application/pdf')
            ? 'pdf'
            : contentType.split('/').last.split(';').first;
        final tempFile = File(
            '${Directory.systemTemp.path}/apidash_${DateTime.now().millisecondsSinceEpoch}.$extension');
        await tempFile.writeAsBytes(response.bodyBytes!);

        // Print JSON output with temp file path for media responses
        const encoder = JsonEncoder.withIndent('  ');
        print(encoder.convert({
          'status': response.statusCode,
          'content-type': contentType,
          'message': 'Media detected, opening in external viewer...',
          'temp_file': tempFile.path,
        }));

        // Open file on supported platforms (Linux, macOS, Windows)
        if (Platform.isLinux) {
          await Process.run('xdg-open', [tempFile.path]);
        } else if (Platform.isMacOS) {
          await Process.run('open', [tempFile.path]);
        } else if (Platform.isWindows) {
          await Process.run('start', [tempFile.path], runInShell: true);
        }
      } else {
        // Print output as usual
        if (outputFormat == 'json') {
          const encoder = JsonEncoder.withIndent('  ');
          print(encoder.convert({
            'status': response.statusCode,
            'headers': response.headers?.map((e) => e.toJson()).toList(),
            'body': response.body,
            'duration_ms': duration.inMilliseconds,
          }));
        } else {
          info(
              'Response: ${response.statusCode} in ${duration.inMilliseconds}ms');
          print(response.body);
        }
      }

      // Use existing ID if found, otherwise generate a new one
      final requestId = existingId ?? const Uuid().v4();
      final requestModel = RequestModel(
        id: requestId,
        name: name,
        url: url,
        method: method,
        headers: headers,
        body: body,
        response: response,
      );

      await hiveHandler.setRequestModel(requestId, requestModel.toJson());
      success('Saved to history');
      return 0;
    } catch (e) {
      error('Failed to execute request: $e');
      return 1;
    }
  }
}
