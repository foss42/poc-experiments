import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:flutter_eval/core/models/health_status.dart';
import 'package:flutter_eval/core/theme/app_theme.dart';
import 'package:flutter_eval/shared/widgets/engine_dot.dart';
import 'package:flutter_eval/shared/widgets/status_bar.dart';

Widget _wrap(Widget child) => MaterialApp(
      home: Scaffold(body: child),
      theme: AppTheme.dark(),
    );

HealthStatus _allOnline() => const HealthStatus(
      lmEval: true,
      lmmsEval: true,
      inspectAi: true,
      fasterWhisper: true,
      ollama: true,
    );

HealthStatus _allOffline() => HealthStatus.allOffline();

void main() {
  testWidgets('StatusBar renders all 5 engine labels', (tester) async {
    await tester.pumpWidget(_wrap(StatusBar(status: _allOnline())));

    expect(find.text('lm-eval-harness'), findsOneWidget);
    expect(find.text('lmms-eval'), findsOneWidget);
    expect(find.text('inspect-ai'), findsOneWidget);
    expect(find.text('faster-whisper'), findsOneWidget);
    expect(find.text('Ollama'), findsOneWidget);
  });

  testWidgets('StatusBar shows 5 emerald dots when all engines online', (tester) async {
    await tester.pumpWidget(_wrap(StatusBar(status: _allOnline())));

    final dots = tester.widgetList<EngineDot>(find.byType(EngineDot));
    for (final dot in dots) {
      expect(dot.ok, isTrue, reason: 'all dots should be ok=true');
    }
  });

  testWidgets('StatusBar shows 5 muted dots when all engines offline', (tester) async {
    await tester.pumpWidget(_wrap(StatusBar(status: _allOffline())));

    final dots = tester.widgetList<EngineDot>(find.byType(EngineDot));
    for (final dot in dots) {
      expect(dot.ok, isFalse, reason: 'all dots should be ok=false');
    }
  });

  testWidgets('StatusBar is horizontally scrollable (SingleChildScrollView)', (tester) async {
    await tester.pumpWidget(_wrap(StatusBar(status: _allOnline())));

    expect(
      find.descendant(
        of: find.byType(StatusBar),
        matching: find.byType(SingleChildScrollView),
      ),
      findsOneWidget,
    );
  });

  test('HealthStatus.fromJson parses all fields correctly', () {
    final h = HealthStatus.fromJson({
      'status': 'ok',
      'lm_eval': true,
      'lmms_eval': false,
      'inspect_ai': true,
      'faster_whisper': false,
      'ollama': true,
    });
    expect(h.lmEval, isTrue);
    expect(h.lmmsEval, isFalse);
    expect(h.inspectAi, isTrue);
    expect(h.fasterWhisper, isFalse);
    expect(h.ollama, isTrue);
  });

  test('HealthStatus.fromJson defaults missing fields to false', () {
    final h = HealthStatus.fromJson({});
    expect(h.lmEval, isFalse);
    expect(h.lmmsEval, isFalse);
    expect(h.inspectAi, isFalse);
    expect(h.fasterWhisper, isFalse);
    expect(h.ollama, isFalse);
  });
}
