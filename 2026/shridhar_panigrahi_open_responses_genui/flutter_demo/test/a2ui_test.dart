import 'package:flutter_test/flutter_test.dart';

import 'package:open_responses_demo/models/a2ui.dart';

void main() {
  // ---------------------------------------------------------------------------
  // A2UIParser.isA2UIPayload
  // ---------------------------------------------------------------------------

  group('A2UIParser.isA2UIPayload', () {
    test('returns true for payload containing createSurface', () {
      const jsonl = '{"createSurface":{"id":"s1","title":"My UI"}}';
      expect(A2UIParser.isA2UIPayload(jsonl), isTrue);
    });

    test('returns true for payload containing updateComponents', () {
      const jsonl =
          '{"updateComponents":{"components":[{"id":"root","component":"Text","text":"Hi"}]}}';
      expect(A2UIParser.isA2UIPayload(jsonl), isTrue);
    });

    test('returns true when valid line is buried among blank lines', () {
      const jsonl = '\n\n{"createSurface":{"id":"s"}}\n\n';
      expect(A2UIParser.isA2UIPayload(jsonl), isTrue);
    });

    test('returns false for plain JSON object', () {
      const jsonl = '{"object":"response","id":"r_1"}';
      expect(A2UIParser.isA2UIPayload(jsonl), isFalse);
    });

    test('returns false for empty string', () {
      expect(A2UIParser.isA2UIPayload(''), isFalse);
    });

    test('returns false for malformed JSON', () {
      expect(A2UIParser.isA2UIPayload('{not json}'), isFalse);
    });

    test('returns false for SSE-formatted text/event-stream', () {
      const sse = 'event: response.created\ndata: {"type":"response.created"}\n';
      expect(A2UIParser.isA2UIPayload(sse), isFalse);
    });
  });

  // ---------------------------------------------------------------------------
  // A2UIParser.parse — component tree
  // ---------------------------------------------------------------------------

  group('A2UIParser.parse components', () {
    test('returns null for empty string', () {
      expect(A2UIParser.parse(''), isNull);
    });

    test('returns null for payload with no updateComponents', () {
      const jsonl = '{"createSurface":{"id":"s","title":"T"}}';
      expect(A2UIParser.parse(jsonl), isNull);
    });

    test('parses single Text component', () {
      const jsonl =
          '{"updateComponents":{"components":[{"id":"root","component":"Text","text":"Hello"}]}}';
      final result = A2UIParser.parse(jsonl);
      expect(result, isNotNull);
      expect(result!.components['root'], isNotNull);
      expect(result.components['root']['component'], 'Text');
      expect(result.components['root']['text'], 'Hello');
    });

    test('parses multiple components into flat map keyed by id', () {
      const jsonl =
          '{"updateComponents":{"components":[{"id":"root","component":"Column","children":["t1","t2"]},{"id":"t1","component":"Text","text":"One"},{"id":"t2","component":"Text","text":"Two"}]}}';
      final result = A2UIParser.parse(jsonl);
      expect(result!.components.length, 3);
      expect(result.components.containsKey('root'), isTrue);
      expect(result.components.containsKey('t1'), isTrue);
      expect(result.components.containsKey('t2'), isTrue);
    });

    test('later updateComponents event merges with earlier ones', () {
      const jsonl = '''
{"updateComponents":{"components":[{"id":"root","component":"Text","text":"v1"}]}}
{"updateComponents":{"components":[{"id":"extra","component":"Divider"}]}}
''';
      final result = A2UIParser.parse(jsonl);
      expect(result!.components.length, 2);
    });

    test('later updateComponents event can overwrite a component id', () {
      const jsonl = '''
{"updateComponents":{"components":[{"id":"root","component":"Text","text":"old"}]}}
{"updateComponents":{"components":[{"id":"root","component":"Text","text":"new"}]}}
''';
      final result = A2UIParser.parse(jsonl);
      expect(result!.components['root']['text'], 'new');
    });

    test('components without an id are silently ignored', () {
      const jsonl =
          '{"updateComponents":{"components":[{"component":"Text","text":"no id"},{"id":"root","component":"Text","text":"has id"}]}}';
      final result = A2UIParser.parse(jsonl);
      expect(result!.components.length, 1);
      expect(result.components.containsKey('root'), isTrue);
    });

    test('malformed JSON lines are skipped without throwing', () {
      const jsonl = '''
{broken json here
{"updateComponents":{"components":[{"id":"root","component":"Text","text":"ok"}]}}
''';
      expect(() => A2UIParser.parse(jsonl), returnsNormally);
      final result = A2UIParser.parse(jsonl);
      expect(result!.components['root']['text'], 'ok');
    });
  });

  // ---------------------------------------------------------------------------
  // A2UIParser.parse — surface title
  // ---------------------------------------------------------------------------

  group('A2UIParser.parse surfaceTitle', () {
    test('extracts title from createSurface', () {
      const jsonl = '''
{"createSurface":{"id":"s1","title":"Sales Dashboard"}}
{"updateComponents":{"components":[{"id":"root","component":"Text","text":"Hi"}]}}
''';
      final result = A2UIParser.parse(jsonl);
      expect(result!.surfaceTitle, 'Sales Dashboard');
    });

    test('surfaceTitle is null when createSurface is absent', () {
      const jsonl =
          '{"updateComponents":{"components":[{"id":"root","component":"Text","text":"Hi"}]}}';
      final result = A2UIParser.parse(jsonl);
      expect(result!.surfaceTitle, isNull);
    });

    test('surfaceTitle is null when createSurface has no title field', () {
      const jsonl = '''
{"createSurface":{"id":"s1"}}
{"updateComponents":{"components":[{"id":"root","component":"Text","text":"Hi"}]}}
''';
      final result = A2UIParser.parse(jsonl);
      expect(result!.surfaceTitle, isNull);
    });
  });

  // ---------------------------------------------------------------------------
  // A2UIParser.parse — data model
  // ---------------------------------------------------------------------------

  group('A2UIParser.parse dataModel', () {
    test('empty dataModel when no updateDataModel events', () {
      const jsonl =
          '{"updateComponents":{"components":[{"id":"root","component":"Text","text":"Hi"}]}}';
      final result = A2UIParser.parse(jsonl);
      expect(result!.dataModel, isEmpty);
    });

    test('parses a single updateDataModel event', () {
      const jsonl = '''
{"updateComponents":{"components":[{"id":"root","component":"Text","text":"Hi"}]}}
{"updateDataModel":{"path":"/revenue","value":"\$12,450"}}
''';
      final result = A2UIParser.parse(jsonl);
      expect(result!.dataModel['revenue'], '\$12,450');
    });

    test('parses multiple updateDataModel events', () {
      const jsonl = '''
{"updateComponents":{"components":[{"id":"root","component":"Text","text":"Hi"}]}}
{"updateDataModel":{"path":"/a","value":1}}
{"updateDataModel":{"path":"/b","value":"two"}}
{"updateDataModel":{"path":"/c","value":true}}
''';
      final result = A2UIParser.parse(jsonl);
      expect(result!.dataModel['a'], 1);
      expect(result.dataModel['b'], 'two');
      expect(result.dataModel['c'], isTrue);
    });

    test('later updateDataModel event overwrites earlier one for same path', () {
      const jsonl = '''
{"updateComponents":{"components":[{"id":"root","component":"Text","text":"Hi"}]}}
{"updateDataModel":{"path":"/x","value":"old"}}
{"updateDataModel":{"path":"/x","value":"new"}}
''';
      final result = A2UIParser.parse(jsonl);
      expect(result!.dataModel['x'], 'new');
    });

    test('ignores updateDataModel events whose path does not start with /', () {
      const jsonl = '''
{"updateComponents":{"components":[{"id":"root","component":"Text","text":"Hi"}]}}
{"updateDataModel":{"path":"noslash","value":"ignored"}}
''';
      final result = A2UIParser.parse(jsonl);
      expect(result!.dataModel, isEmpty);
    });

    test('strips leading slash from path key', () {
      const jsonl = '''
{"updateComponents":{"components":[{"id":"root","component":"Text","text":"Hi"}]}}
{"updateDataModel":{"path":"/user/name","value":"Alice"}}
''';
      final result = A2UIParser.parse(jsonl);
      // stored as "user/name" (slash stripped from front only)
      expect(result!.dataModel.containsKey('user/name'), isTrue);
    });
  });

  // ---------------------------------------------------------------------------
  // A2UIParser.parse — closeSurface is ignored
  // ---------------------------------------------------------------------------

  group('A2UIParser.parse closeSurface', () {
    test('closeSurface event does not affect components or dataModel', () {
      const jsonl = '''
{"createSurface":{"id":"s1","title":"T"}}
{"updateComponents":{"components":[{"id":"root","component":"Text","text":"Hi"}]}}
{"updateDataModel":{"path":"/v","value":42}}
{"closeSurface":{"id":"s1"}}
''';
      final result = A2UIParser.parse(jsonl);
      expect(result!.components.length, 1);
      expect(result.dataModel['v'], 42);
    });
  });
}
