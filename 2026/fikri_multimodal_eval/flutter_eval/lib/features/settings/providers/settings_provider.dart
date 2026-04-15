import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../shared/providers/shared_prefs_provider.dart';

const _kBaseUrlKey = 'base_url';
const _kOpenRouterApiKeyKey = 'openrouter_api_key';

String _platformDefaultUrl() {
  if (kIsWeb) return '';
  switch (defaultTargetPlatform) {
    case TargetPlatform.android:
      return 'http://10.0.2.2:8001';
    default:
      return 'http://localhost:8001';
  }
}

enum TestConnectionStatus { idle, testing, ok, error }

class SettingsState {
  const SettingsState({
    required this.baseUrl,
    this.openRouterApiKey = '',
    this.testStatus = TestConnectionStatus.idle,
  });

  final String baseUrl;
  final String openRouterApiKey;
  final TestConnectionStatus testStatus;

  SettingsState copyWith({String? baseUrl, String? openRouterApiKey, TestConnectionStatus? testStatus}) {
    return SettingsState(
      baseUrl: baseUrl ?? this.baseUrl,
      openRouterApiKey: openRouterApiKey ?? this.openRouterApiKey,
      testStatus: testStatus ?? this.testStatus,
    );
  }
}

class SettingsNotifier extends StateNotifier<SettingsState> {
  SettingsNotifier(this._prefs)
      : super(SettingsState(
          baseUrl: _prefs.getString(_kBaseUrlKey) ?? _platformDefaultUrl(),
          openRouterApiKey: _prefs.getString(_kOpenRouterApiKeyKey) ?? '',
        ));

  final SharedPreferences _prefs;

  Future<void> setBaseUrl(String url) async {
    await _prefs.setString(_kBaseUrlKey, url);
    state = state.copyWith(baseUrl: url, testStatus: TestConnectionStatus.idle);
  }

  Future<void> setOpenRouterApiKey(String key) async {
    await _prefs.setString(_kOpenRouterApiKeyKey, key);
    state = state.copyWith(openRouterApiKey: key);
  }

  Future<void> testConnection() async {
    state = state.copyWith(testStatus: TestConnectionStatus.testing);
    try {
      final dio = Dio();
      await dio.get(
        '${state.baseUrl}/api/health',
        options: Options(receiveTimeout: const Duration(seconds: 5)),
      );
      state = state.copyWith(testStatus: TestConnectionStatus.ok);
    } catch (_) {
      state = state.copyWith(testStatus: TestConnectionStatus.error);
    }
  }
}

final settingsProvider =
    StateNotifierProvider<SettingsNotifier, SettingsState>((ref) {
  final prefs = ref.watch(sharedPrefsProvider);
  return SettingsNotifier(prefs);
});
