import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:frontend/main.dart';

void main() {
  testWidgets('App renders dashboard shell', (WidgetTester tester) async {
    await tester.pumpWidget(const ProviderScope(child: EvalFrameworkApp()));
    await tester.pump();

    // Verify the navigation rail has our expected labels
    expect(find.text('AI Eval'), findsOneWidget);
    expect(find.text('Datasets'), findsOneWidget);
    expect(find.text('Models'), findsOneWidget);
  });
}
