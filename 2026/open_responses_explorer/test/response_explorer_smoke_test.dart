import 'package:flutter_test/flutter_test.dart';
import 'package:open_responses_explorer/main.dart';

void main() {
  testWidgets('renders explorer tabs', (WidgetTester tester) async {
    await tester.pumpWidget(const OpenResponsesExplorerApp());
    await tester.pumpAndSettle();

    expect(find.text('Timeline'), findsOneWidget);
    expect(find.text('Correlation'), findsOneWidget);
    expect(find.text('Raw'), findsOneWidget);
  });
}
