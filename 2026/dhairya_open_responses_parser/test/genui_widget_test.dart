import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:open_responses_parser/open_responses_parser.dart';

Widget _wrap(Widget child) {
  return MaterialApp(
    home: Scaffold(body: SingleChildScrollView(child: child)),
  );
}

void main() {
  group('GenUITextWidget styles', () {
    testWidgets('heading: displays content', (tester) async {
      const component = TextComponent(id: 't1', content: 'Big Title', style: 'heading');
      await tester.pumpWidget(_wrap(const GenUITextWidget(component: component)));
      expect(find.text('Big Title'), findsOneWidget);
      final text = tester.widget<Text>(find.text('Big Title'));
      expect(text.style?.fontSize, 22);
      expect(text.style?.fontWeight, FontWeight.w700);
    });

    testWidgets('subheading: displays content', (tester) async {
      const component = TextComponent(id: 't2', content: 'Sub Title', style: 'subheading');
      await tester.pumpWidget(_wrap(const GenUITextWidget(component: component)));
      expect(find.text('Sub Title'), findsOneWidget);
      final text = tester.widget<Text>(find.text('Sub Title'));
      expect(text.style?.fontSize, 17);
      expect(text.style?.fontWeight, FontWeight.w600);
    });

    testWidgets('body: displays content', (tester) async {
      const component = TextComponent(id: 't3', content: 'Some body text', style: 'body');
      await tester.pumpWidget(_wrap(const GenUITextWidget(component: component)));
      expect(find.text('Some body text'), findsOneWidget);
      final text = tester.widget<Text>(find.text('Some body text'));
      expect(text.style?.fontSize, 14);
      expect(text.style?.fontWeight, FontWeight.w400);
    });

    testWidgets('caption: displays content', (tester) async {
      const component = TextComponent(id: 't4', content: 'A caption', style: 'caption');
      await tester.pumpWidget(_wrap(const GenUITextWidget(component: component)));
      expect(find.text('A caption'), findsOneWidget);
      final text = tester.widget<Text>(find.text('A caption'));
      expect(text.style?.fontSize, 12);
    });

    testWidgets('unknown style falls back to body sizing', (tester) async {
      const component = TextComponent(id: 't5', content: 'Default', style: 'unknown_style');
      await tester.pumpWidget(_wrap(const GenUITextWidget(component: component)));
      expect(find.text('Default'), findsOneWidget);
      final text = tester.widget<Text>(find.text('Default'));
      expect(text.style?.fontSize, 14);
    });
  });

  group('GenUIButtonWidget', () {
    testWidgets('renders ElevatedButton for primary variant', (tester) async {
      const component = ButtonComponent(id: 'b1', label: 'Go', variant: 'primary');
      await tester.pumpWidget(_wrap(const GenUIButtonWidget(component: component)));
      expect(find.byType(ElevatedButton), findsOneWidget);
      expect(find.text('Go'), findsOneWidget);
    });

    testWidgets('renders OutlinedButton for secondary variant', (tester) async {
      const component = ButtonComponent(id: 'b2', label: 'Cancel', variant: 'secondary');
      await tester.pumpWidget(_wrap(const GenUIButtonWidget(component: component)));
      expect(find.byType(OutlinedButton), findsOneWidget);
      expect(find.text('Cancel'), findsOneWidget);
    });

    testWidgets('renders TextButton for outlined variant', (tester) async {
      const component = ButtonComponent(id: 'b3', label: 'Link', variant: 'outlined');
      await tester.pumpWidget(_wrap(const GenUIButtonWidget(component: component)));
      expect(find.byType(TextButton), findsOneWidget);
      expect(find.text('Link'), findsOneWidget);
    });

    testWidgets('shows SnackBar with label on tap', (tester) async {
      const component = ButtonComponent(id: 'b4', label: 'Refresh', variant: 'primary');
      await tester.pumpWidget(_wrap(const GenUIButtonWidget(component: component)));
      await tester.tap(find.byType(ElevatedButton));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 200));
      expect(find.text('Action: Refresh'), findsOneWidget);
    });
  });

  group('UnknownComponentCard', () {
    testWidgets('renders warning for unrecognized type', (tester) async {
      const component = UnknownComponent(
        id: 'unk_1',
        type: 'future_widget',
        raw: {'type': 'future_widget', 'id': 'unk_1', 'data': 'test'},
      );
      await tester.pumpWidget(_wrap(const UnknownComponentCard(component: component)));
      expect(find.text('Unsupported component: future_widget'), findsOneWidget);
      expect(find.text('Raw descriptor preserved'), findsOneWidget);
    });

    testWidgets('contains monospace text for raw JSON', (tester) async {
      const component = UnknownComponent(
        id: 'unk_2',
        type: 'x_component',
        raw: {'type': 'x_component', 'id': 'unk_2'},
      );
      await tester.pumpWidget(_wrap(const UnknownComponentCard(component: component)));
      final textWidgets = tester.widgetList<Text>(find.byType(Text));
      final hasMonospace = textWidgets.any((t) => t.style?.fontFamily == 'monospace');
      expect(hasMonospace, isTrue);
    });
  });

  group('GenUIPreviewPanel', () {
    testWidgets('renders all component types in sequence', (tester) async {
      final descriptor = GenUIDescriptor.fromJson({
        'type': 'screen',
        'version': '0.1.0',
        'agent': 'test-agent',
        'title': 'Test Dashboard',
        'description': 'A test description',
        'components': [
          {'id': 'txt1', 'type': 'text', 'content': 'Hello World', 'style': 'heading'},
          {'id': 'btn1', 'type': 'button', 'label': 'Click Me', 'variant': 'primary'},
          {'id': 'div1', 'type': 'divider'},
          {
            'id': 'tbl1',
            'type': 'table',
            'headers': ['A', 'B'],
            'rows': [
              ['1', '2'],
            ],
          },
          {'id': 'inp1', 'type': 'input', 'label': 'City', 'placeholder': 'Enter city'},
          {
            'id': 'card1',
            'type': 'card',
            'title': 'Summary',
            'children': [
              {'id': 'ctxt1', 'type': 'text', 'content': 'Card content', 'style': 'body'},
            ],
          },
          {'id': 'unk1', 'type': 'unsupported_thing', 'data': 'something'},
        ],
      });

      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: SizedBox(
            height: 800,
            child: GenUIPreviewPanel.withDefaultRegistry(descriptor: descriptor),
          ),
        ),
      ));
      await tester.pumpAndSettle();

      expect(find.text('GenUI Preview'), findsOneWidget);
      expect(find.text('Test Dashboard'), findsOneWidget);
      expect(find.text('A test description'), findsOneWidget);
      expect(find.text('Hello World'), findsOneWidget);
      expect(find.text('Click Me'), findsOneWidget);
      expect(find.text('Unsupported component: unsupported_thing'), findsOneWidget);
    });
  });
}
