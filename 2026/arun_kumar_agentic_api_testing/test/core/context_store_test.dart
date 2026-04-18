import 'package:flutter_test/flutter_test.dart';
import 'package:agentic_api_testing/core/engine/context_store.dart';
import 'package:agentic_api_testing/core/models/workflow_node.dart';

void main() {
  late ContextStore store;

  setUp(() {
    store = ContextStore();
  });

  test('set and get variable', () {
    store.set('user_id', '42', 'node-1');
    expect(store.get('user_id'), '42');
  });

  test('substitute replaces template variables', () {
    store.set('id', '7', 'n1');
    store.set('token', 'abc', 'n2');
    expect(
      store.substitute('https://api.com/users/{{id}}?token={{token}}'),
      'https://api.com/users/7?token=abc',
    );
  });

  test('substitute leaves unknown variables untouched', () {
    expect(
      store.substitute('{{missing}}'),
      '{{missing}}',
    );
  });

  test('extractFromResponse extracts values', () {
    final rules = [
      ExtractionRule(variableName: 'post_id', jsonPath: 'id'),
      ExtractionRule(variableName: 'title', jsonPath: 'title'),
    ];
    final extracted = store.extractFromResponse(
      '{"id": 101, "title": "Hello"}',
      rules,
      'create-node',
    );
    expect(extracted['post_id'], '101');
    expect(extracted['title'], 'Hello');
    expect(store.get('post_id'), '101');
  });

  test('getAllWithSource tracks source node', () {
    store.set('x', '1', 'node-a');
    final vars = store.getAllWithSource();
    expect(vars.length, 1);
    expect(vars.first.sourceNodeId, 'node-a');
  });

  test('clear removes all variables', () {
    store.set('a', '1', 'n');
    store.clear();
    expect(store.getAll(), isEmpty);
  });
}
