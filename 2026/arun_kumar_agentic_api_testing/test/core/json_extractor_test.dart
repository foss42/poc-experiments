import 'package:flutter_test/flutter_test.dart';
import 'package:agentic_api_testing/core/utils/json_extractor.dart';

void main() {
  test('extracts top-level key', () {
    expect(extractJsonValue('{"id": 42}', 'id'), '42');
  });

  test('extracts nested key', () {
    expect(
      extractJsonValue('{"data": {"user": {"id": "abc"}}}', 'data.user.id'),
      'abc',
    );
  });

  test('extracts array element', () {
    expect(
      extractJsonValue('[{"id": 1}, {"id": 2}]', '[0].id'),
      '1',
    );
  });

  test('returns null for missing path', () {
    expect(extractJsonValue('{"a": 1}', 'b'), null);
  });

  test('returns null for invalid json', () {
    expect(extractJsonValue('not json', 'id'), null);
  });

  test('extracts string value', () {
    expect(
      extractJsonValue('{"token": "abc-123-fake"}', 'token'),
      'abc-123-fake',
    );
  });
}
