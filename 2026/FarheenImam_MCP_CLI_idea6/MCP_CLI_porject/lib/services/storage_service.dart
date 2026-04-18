import 'dart:convert';
import 'dart:io';
import 'package:path/path.dart' as p;
import '../models/models.dart';

// ---------------------------------------------------------------------------
// Storage service — all data lives in ~/.apidash_cli/ as plain JSON.
// ---------------------------------------------------------------------------

class StorageService {
  static final StorageService _instance = StorageService._();
  StorageService._();
  factory StorageService() => _instance;

  late final String _baseDir;
  bool _initialized = false;

  // ---- paths ---------------------------------------------------------------

  String get collectionsPath => p.join(_baseDir, 'collections.json');
  String get environmentsPath => p.join(_baseDir, 'environments.json');
  String get historyPath => p.join(_baseDir, 'history.json');
  String get activeEnvPath => p.join(_baseDir, 'active_env.json');
  String get responsesDir => p.join(_baseDir, 'responses');

  // ---- init ----------------------------------------------------------------

  Future<void> init() async {
    if (_initialized) return;
    final home = Platform.environment['HOME'] ??
        Platform.environment['USERPROFILE'] ??
        '.';
    _baseDir = p.join(home, '.apidash_cli');
    await Directory(_baseDir).create(recursive: true);
    await Directory(responsesDir).create(recursive: true);
    _initialized = true;
  }

  // ---- collections ---------------------------------------------------------

  Future<List<ApiCollection>> loadCollections() async {
    final file = File(collectionsPath);
    if (!await file.exists()) return [];
    try {
      final raw = await file.readAsString();
      final list = jsonDecode(raw) as List<dynamic>;
      return list
          .map((e) => ApiCollection.fromJson(e as Map<String, dynamic>))
          .toList();
    } catch (_) {
      return [];
    }
  }

  Future<void> saveCollections(List<ApiCollection> collections) async {
    await _ensureInit();
    final file = File(collectionsPath);
    await file
        .writeAsString(const JsonEncoder.withIndent('  ').convert(collections.map((c) => c.toJson()).toList()));
  }

  // ---- environments --------------------------------------------------------

  Future<List<ApiEnvironment>> loadEnvironments() async {
    final file = File(environmentsPath);
    if (!await file.exists()) return [];
    try {
      final raw = await file.readAsString();
      final list = jsonDecode(raw) as List<dynamic>;
      return list
          .map((e) => ApiEnvironment.fromJson(e as Map<String, dynamic>))
          .toList();
    } catch (_) {
      return [];
    }
  }

  Future<void> saveEnvironments(List<ApiEnvironment> environments) async {
    await _ensureInit();
    final file = File(environmentsPath);
    await file
        .writeAsString(const JsonEncoder.withIndent('  ').convert(environments.map((e) => e.toJson()).toList()));
  }

  // ---- active environment --------------------------------------------------

  Future<String?> loadActiveEnvId() async {
    final file = File(activeEnvPath);
    if (!await file.exists()) return null;
    try {
      final raw = await file.readAsString();
      final map = jsonDecode(raw) as Map<String, dynamic>;
      return map['id'] as String?;
    } catch (_) {
      return null;
    }
  }

  Future<void> saveActiveEnvId(String id) async {
    await _ensureInit();
    await File(activeEnvPath)
        .writeAsString(const JsonEncoder.withIndent('  ').convert({'id': id}));
  }

  Future<ApiEnvironment?> loadActiveEnvironment() async {
    final id = await loadActiveEnvId();
    if (id == null) return null;
    final envs = await loadEnvironments();
    try {
      return envs.firstWhere((e) => e.id == id);
    } catch (_) {
      return null;
    }
  }

  // ---- history -------------------------------------------------------------

  Future<List<HistoryEntry>> loadHistory() async {
    final file = File(historyPath);
    if (!await file.exists()) return [];
    try {
      final raw = await file.readAsString();
      final list = jsonDecode(raw) as List<dynamic>;
      return list
          .map((e) => HistoryEntry.fromJson(e as Map<String, dynamic>))
          .toList();
    } catch (_) {
      return [];
    }
  }

  Future<void> saveHistory(List<HistoryEntry> history) async {
    await _ensureInit();
    // Keep at most 500 entries
    final trimmed = history.length > 500 ? history.sublist(history.length - 500) : history;
    final file = File(historyPath);
    await file
        .writeAsString(const JsonEncoder.withIndent('  ').convert(trimmed.map((h) => h.toJson()).toList()));
  }

  Future<void> appendHistory(HistoryEntry entry) async {
    await _ensureInit();
    final history = await loadHistory();
    history.add(entry);
    await saveHistory(history);
  }

  // ---- convenience: find request by name or id ----------------------------

  Future<(ApiCollection?, ApiRequest)?> findRequest(String nameOrId) async {
    final collections = await loadCollections();
    for (final col in collections) {
      for (final req in col.requests) {
        if (req.id == nameOrId ||
            req.name.toLowerCase() == nameOrId.toLowerCase()) {
          return (col, req);
        }
      }
    }
    return null;
  }

  // ---- responses dir -------------------------------------------------------

  String get responsesDirPath => responsesDir;

  // ---- private helpers -----------------------------------------------------

  Future<void> _ensureInit() async {
    if (!_initialized) await init();
  }
}
