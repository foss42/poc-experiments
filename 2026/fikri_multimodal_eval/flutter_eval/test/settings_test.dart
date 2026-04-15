import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:flutter_eval/features/settings/providers/settings_provider.dart';
import 'package:flutter_eval/features/settings/settings_screen.dart';
import 'package:flutter_eval/shared/providers/shared_prefs_provider.dart';

// Subclass that forces an initial state — used only in widget tests.
class _PresetNotifier extends SettingsNotifier {
  _PresetNotifier(super.prefs, SettingsState preset) {
    state = preset;
  }
}

Widget _wrapSettings(SharedPreferences prefs) {
  return ProviderScope(
    overrides: [sharedPrefsProvider.overrideWithValue(prefs)],
    child: MaterialApp(
      home: const Scaffold(body: SettingsScreen()),
      theme: ThemeData.dark(),
    ),
  );
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  testWidgets('Settings screen renders URL field and buttons', (tester) async {
    final prefs = await SharedPreferences.getInstance();
    await tester.pumpWidget(_wrapSettings(prefs));
    await tester.pumpAndSettle();

    expect(find.byType(TextField), findsNWidgets(2)); // base URL + OpenRouter API key
    expect(find.text('Save'), findsOneWidget);
    expect(find.text('Test connection'), findsOneWidget);
  });

  test('SettingsNotifier persists baseUrl to SharedPreferences', () async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final notifier = SettingsNotifier(prefs);

    await notifier.setBaseUrl('http://192.168.1.10:8001');

    expect(notifier.state.baseUrl, 'http://192.168.1.10:8001');
    expect(prefs.getString('base_url'), 'http://192.168.1.10:8001');
  });

  test('SettingsNotifier loads persisted baseUrl on init', () async {
    SharedPreferences.setMockInitialValues({'base_url': 'http://saved.example:8001'});
    final prefs = await SharedPreferences.getInstance();
    final notifier = SettingsNotifier(prefs);

    expect(notifier.state.baseUrl, 'http://saved.example:8001');
  });

  test('SettingsNotifier resets testStatus to idle after setBaseUrl', () async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final notifier = SettingsNotifier(prefs);

    await notifier.setBaseUrl('http://localhost:8001');

    expect(notifier.state.testStatus, TestConnectionStatus.idle);
  });

  testWidgets('Settings screen shows Connected text when testStatus is ok',
      (tester) async {
    final prefs = await SharedPreferences.getInstance();
    const preset = SettingsState(
      baseUrl: 'http://localhost:8001',
      testStatus: TestConnectionStatus.ok,
    );
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          sharedPrefsProvider.overrideWithValue(prefs),
          settingsProvider.overrideWith((ref) => _PresetNotifier(prefs, preset)),
        ],
        child: MaterialApp(
          home: const Scaffold(body: SettingsScreen()),
          theme: ThemeData.dark(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.textContaining('Connected'), findsOneWidget);
  });

  testWidgets('Settings screen shows Failed text when testStatus is error',
      (tester) async {
    final prefs = await SharedPreferences.getInstance();
    const preset = SettingsState(
      baseUrl: 'http://localhost:8001',
      testStatus: TestConnectionStatus.error,
    );
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          sharedPrefsProvider.overrideWithValue(prefs),
          settingsProvider.overrideWith((ref) => _PresetNotifier(prefs, preset)),
        ],
        child: MaterialApp(
          home: const Scaffold(body: SettingsScreen()),
          theme: ThemeData.dark(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.textContaining('Failed'), findsOneWidget);
  });
}
