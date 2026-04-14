import 'package:flutter_test/flutter_test.dart';
import 'package:open_responses_explorer/main.dart';

void main() {
  testWidgets('renders input screen entrypoint', (WidgetTester tester) async {
    await tester.pumpWidget(const OpenResponsesExplorerApp());
    await tester.pumpAndSettle();

    expect(find.text('Open Responses Explorer'), findsOneWidget);
    expect(find.text('Paste JSON'), findsOneWidget);
    expect(find.text('Load Sample'), findsOneWidget);
    expect(find.text('Parse Response'), findsOneWidget);
  });
}
