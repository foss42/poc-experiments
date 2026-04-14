import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_eval/app.dart';
import 'package:flutter_eval/shared/widgets/section_card.dart';
import 'package:flutter_eval/shared/widgets/engine_dot.dart';

void main() {
  testWidgets('App boots without error', (WidgetTester tester) async {
    await tester.pumpWidget(const ProviderScope(child: EvalApp()));
    expect(find.byType(MaterialApp), findsOneWidget);
  });

  testWidgets('SectionCard renders step badge and title', (WidgetTester tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: SectionCard(
            step: '1',
            title: 'Test Section',
            child: Text('content'),
          ),
        ),
      ),
    );
    expect(find.text('1'), findsOneWidget);
    expect(find.text('Test Section'), findsOneWidget);
    expect(find.text('content'), findsOneWidget);
  });

  testWidgets('EngineDot shows green dot when ok', (WidgetTester tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: EngineDot(label: 'ollama', ok: true),
        ),
      ),
    );
    expect(find.text('ollama'), findsOneWidget);
    final container = tester.widget<Container>(
      find.descendant(
        of: find.byType(EngineDot),
        matching: find.byType(Container),
      ),
    );
    final decoration = container.decoration as BoxDecoration;
    expect(decoration.color, const Color(0xFF34D399)); // AppTheme.success
  });

  testWidgets('EngineDot shows muted dot when offline', (WidgetTester tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: EngineDot(label: 'lm_eval', ok: false),
        ),
      ),
    );
    expect(find.text('lm_eval'), findsOneWidget);
    final container = tester.widget<Container>(
      find.descendant(
        of: find.byType(EngineDot),
        matching: find.byType(Container),
      ),
    );
    final decoration = container.decoration as BoxDecoration;
    expect(decoration.color, const Color(0xFF3F3F46)); // AppTheme.muted
  });
}
