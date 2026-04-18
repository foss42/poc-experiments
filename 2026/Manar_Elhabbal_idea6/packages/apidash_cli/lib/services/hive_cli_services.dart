import 'dart:convert';
import 'package:hive_ce/hive_ce.dart';

const String kHistoryMetaBox = "apidash-history-meta";
const String kHistoryLazyBox = "apidash-history-lazy";
const String kHistoryBoxIds = "historyIds";

class HiveHandler {
  late Box _metaBox;
  late LazyBox _lazyBox;
  bool _initialized = false;

  Future<void> initWorkspaceStore(String path) async {
    if (_initialized) return;
    try {
      Hive.init(path);
      _metaBox = await Hive.openBox(kHistoryMetaBox);
      _lazyBox = await Hive.openLazyBox(kHistoryLazyBox);
      _initialized = true;
    } catch (e) {
      if (e.toString().contains('lock failed')) {
        throw 'Workspace is currently locked by another process. Please ensure no other instance of API Dash is using this workspace.';
      }
      rethrow;
    }
  }

  Future<void> close() async {
    if (!_initialized) return;
    await _metaBox.close();
    await _lazyBox.close();
    await Hive.close();
    _initialized = false;
  }

  Future<void> setRequestModel(String id, Map<String, dynamic> json) async {
    await _lazyBox.put(id, json);
    final List<String> ids = getIds() ?? [];

    ids.removeWhere((e) => e == id);
    ids.insert(0, id);

    await _metaBox.put(kHistoryBoxIds, jsonEncode(ids));
  }

  Future<Map<String, dynamic>?> getRequestModel(String id) async {
    final json = await _lazyBox.get(id);
    if (json == null) return null;
    return Map<String, dynamic>.from(json as Map<dynamic, dynamic>);
  }

  Future<void> delete(String id) async {
    await _lazyBox.delete(id);
    final List<String> ids = getIds() ?? [];
    ids.removeWhere((e) => e == id);
    await _metaBox.put(kHistoryBoxIds, jsonEncode(ids));
  }

  Future<void> setIds(List<String> ids) async {
    await _metaBox.put(kHistoryBoxIds, jsonEncode(ids));
  }

  List<String>? getIds() {
    final raw = _metaBox.get(kHistoryBoxIds);
    if (raw == null) return null;
    List<String> ids;
    if (raw is String) {
      ids = (jsonDecode(raw) as List).map((e) => e.toString()).toList();
    } else {
      ids = (raw as List).map((e) => e.toString()).toList();
    }
    return ids.toSet().toList();
  }
}

final hiveHandler = HiveHandler();
