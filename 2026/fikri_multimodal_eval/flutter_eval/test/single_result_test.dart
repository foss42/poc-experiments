import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:flutter_eval/core/theme/app_theme.dart';
import 'package:flutter_eval/features/eval/widgets/single_result_view.dart';
import 'package:flutter_eval/features/eval/widgets/trajectory_view.dart';

void main() {
  group('SingleResultView metric formatting', () {
    test('value < 1.0 formatted as percentage', () {
      // Access the private static method via a trick: test via widget
      // Just verify the logic by constructing the widget and checking text
    });

    testWidgets('shows task name and formatted metric values', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: SingleChildScrollView(
              child: SingleResultView(
                data: {
                  'eval_id': 'test123',
                  'results': {
                    'mmmu_val': {
                      'acc,none': 0.456,
                      'acc_stderr,none': 0.01,
                    },
                  },
                },
              ),
            ),
          ),
        ),
      );

      expect(find.text('mmmu_val'), findsOneWidget);
      expect(find.text('acc'), findsOneWidget); // ",none" stripped
      expect(find.text('45.6%'), findsOneWidget); // 0.456 → 45.6%
      // stderr metric is hidden
      expect(find.text('acc_stderr'), findsNothing);
    });

    testWidgets('value >= 1.0 shows 3 decimal places', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: SingleChildScrollView(
              child: SingleResultView(
                data: {
                  'eval_id': 'abc',
                  'results': {
                    'textvqa': {
                      'exact_match,none': 3.14159,
                    },
                  },
                },
              ),
            ),
          ),
        ),
      );

      expect(find.text('3.142'), findsOneWidget);
    });

    testWidgets('shows empty state when results is empty', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: SingleResultView(data: {'eval_id': 'x', 'results': {}}),
          ),
        ),
      );

      expect(find.textContaining('No results'), findsOneWidget);
    });
  });

  group('TrajectoryView', () {
    testWidgets('renders collapsed ExpansionTile with message count', (tester) async {
      final trajectory = [
        {'role': 'system', 'content': 'You are a helpful assistant.'},
        {'role': 'user', 'content': 'What is 2+2?'},
        {'role': 'assistant', 'content': '4'},
      ];

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.dark(),
          home: Scaffold(
            body: TrajectoryView(trajectory: trajectory),
          ),
        ),
      );

      expect(find.textContaining('Agent trajectory (3 messages)'), findsOneWidget);
      expect(find.byType(ExpansionTile), findsOneWidget);
    });

    testWidgets('role labels visible when expanded', (tester) async {
      final trajectory = [
        {'role': 'user', 'content': 'Hello'},
        {'role': 'assistant', 'content': 'Hi there'},
      ];

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.dark(),
          home: Scaffold(
            body: SingleChildScrollView(
              child: TrajectoryView(trajectory: trajectory),
            ),
          ),
        ),
      );

      await tester.tap(find.byType(ExpansionTile));
      await tester.pumpAndSettle();

      expect(find.text('user'), findsOneWidget);
      expect(find.text('assistant'), findsOneWidget);
    });
  });
}
