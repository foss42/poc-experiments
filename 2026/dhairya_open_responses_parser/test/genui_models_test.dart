import 'package:flutter_test/flutter_test.dart';
import 'package:open_responses_parser/open_responses_parser.dart';

void main() {
  group('TextComponent', () {
    test('parses all style variants correctly', () {
      for (final style in ['heading', 'subheading', 'body', 'caption']) {
        final json = {'id': 'txt_1', 'type': 'text', 'content': 'Hello', 'style': style};
        final component = TextComponent.fromJson(json);
        expect(component.id, 'txt_1');
        expect(component.content, 'Hello');
        expect(component.style, style);
        expect(component.type, 'text');
      }
    });

    test('defaults style to body when not provided', () {
      final json = {'id': 'txt_2', 'type': 'text', 'content': 'No style'};
      final component = TextComponent.fromJson(json);
      expect(component.style, 'body');
    });

    test('handles missing content gracefully', () {
      final json = {'id': 'txt_3', 'type': 'text'};
      final component = TextComponent.fromJson(json);
      expect(component.content, '');
    });
  });

  group('ButtonComponent', () {
    test('parses all variant types correctly', () {
      for (final variant in ['primary', 'secondary', 'outlined']) {
        final json = {
          'id': 'btn_1',
          'type': 'button',
          'label': 'Click me',
          'variant': variant,
        };
        final component = ButtonComponent.fromJson(json);
        expect(component.id, 'btn_1');
        expect(component.label, 'Click me');
        expect(component.variant, variant);
      }
    });

    test('defaults variant to primary when not provided', () {
      final json = {'id': 'btn_2', 'type': 'button', 'label': 'Go'};
      final component = ButtonComponent.fromJson(json);
      expect(component.variant, 'primary');
    });
  });

  group('CardComponent', () {
    test('parses with nested children recursively', () {
      final json = {
        'id': 'card_1',
        'type': 'card',
        'title': 'My Card',
        'children': [
          {'id': 'txt_child', 'type': 'text', 'content': 'Inside card', 'style': 'body'},
          {'id': 'btn_child', 'type': 'button', 'label': 'Child Button'},
        ],
      };

      final descriptor = GenUIDescriptor.fromJson({
        'type': 'screen',
        'version': '0.1.0',
        'components': [json],
      });

      final card = descriptor.components.first as CardComponent;
      expect(card.id, 'card_1');
      expect(card.title, 'My Card');
      expect(card.children.length, 2);
      expect(card.children[0], isA<TextComponent>());
      expect(card.children[1], isA<ButtonComponent>());
    });

    test('parses card with optional null title', () {
      final json = {
        'id': 'card_2',
        'type': 'card',
        'children': [],
      };
      final descriptor = GenUIDescriptor.fromJson({
        'type': 'screen',
        'version': '0.1.0',
        'components': [json],
      });
      final card = descriptor.components.first as CardComponent;
      expect(card.title, isNull);
      expect(card.children, isEmpty);
    });
  });

  group('TableComponent', () {
    test('parses headers and rows correctly', () {
      final json = {
        'id': 'tbl_1',
        'type': 'table',
        'headers': ['Name', 'Value'],
        'rows': [
          ['Row1Col1', 'Row1Col2'],
          ['Row2Col1', 'Row2Col2'],
        ],
      };
      final component = TableComponent.fromJson(json);
      expect(component.headers, ['Name', 'Value']);
      expect(component.rows.length, 2);
      expect(component.rows[0], ['Row1Col1', 'Row1Col2']);
      expect(component.rows[1], ['Row2Col1', 'Row2Col2']);
    });

    test('handles empty headers and rows', () {
      final json = {'id': 'tbl_2', 'type': 'table', 'headers': [], 'rows': []};
      final component = TableComponent.fromJson(json);
      expect(component.headers, isEmpty);
      expect(component.rows, isEmpty);
    });
  });

  group('UnknownComponent', () {
    test('produced for unrecognized component type', () {
      final descriptor = GenUIDescriptor.fromJson({
        'type': 'screen',
        'version': '0.1.0',
        'components': [
          {'id': 'unk_1', 'type': 'future_widget', 'data': 'some data'},
        ],
      });
      expect(descriptor.components.first, isA<UnknownComponent>());
      final unknown = descriptor.components.first as UnknownComponent;
      expect(unknown.type, 'future_widget');
      expect(unknown.raw['data'], 'some data');
    });
  });

  group('GenUIDescriptor', () {
    test('never crashes on malformed input', () {
      expect(
        () => GenUIDescriptor.fromJson({
          'type': 'screen',
          'version': '0.1.0',
          'components': [
            null,
            42,
            'a string',
            {'id': 'ok', 'type': 'text', 'content': 'Fine'},
          ],
        }),
        returnsNormally,
      );
    });

    test('empty components array produces empty GenUIDescriptor', () {
      final descriptor = GenUIDescriptor.fromJson({
        'type': 'screen',
        'version': '0.1.0',
        'components': [],
      });
      expect(descriptor.components, isEmpty);
    });

    test('missing optional fields use correct defaults', () {
      final descriptor = GenUIDescriptor.fromJson({
        'components': [],
      });
      expect(descriptor.type, 'screen');
      expect(descriptor.version, '0.1.0');
      expect(descriptor.agent, isNull);
      expect(descriptor.title, isNull);
      expect(descriptor.description, isNull);
    });

    test('parses all optional top-level fields', () {
      final descriptor = GenUIDescriptor.fromJson({
        'type': 'screen',
        'version': '0.2.0',
        'agent': 'my-agent',
        'title': 'My Title',
        'description': 'A description',
        'components': [],
      });
      expect(descriptor.version, '0.2.0');
      expect(descriptor.agent, 'my-agent');
      expect(descriptor.title, 'My Title');
      expect(descriptor.description, 'A description');
    });

    test('DividerComponent parsed correctly', () {
      final descriptor = GenUIDescriptor.fromJson({
        'type': 'screen',
        'version': '0.1.0',
        'components': [
          {'id': 'div_1', 'type': 'divider'},
        ],
      });
      expect(descriptor.components.first, isA<DividerComponent>());
    });

    test('InputComponent parsed correctly', () {
      final descriptor = GenUIDescriptor.fromJson({
        'type': 'screen',
        'version': '0.1.0',
        'components': [
          {
            'id': 'inp_1',
            'type': 'input',
            'label': 'City',
            'placeholder': 'Enter city',
          },
        ],
      });
      final input = descriptor.components.first as InputComponent;
      expect(input.label, 'City');
      expect(input.placeholder, 'Enter city');
    });

    test('InputComponent placeholder is optional', () {
      final descriptor = GenUIDescriptor.fromJson({
        'type': 'screen',
        'version': '0.1.0',
        'components': [
          {'id': 'inp_2', 'type': 'input', 'label': 'Name'},
        ],
      });
      final input = descriptor.components.first as InputComponent;
      expect(input.placeholder, isNull);
    });
  });
}
