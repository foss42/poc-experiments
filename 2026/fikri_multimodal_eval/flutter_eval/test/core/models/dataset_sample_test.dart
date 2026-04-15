import 'package:flutter_test/flutter_test.dart';
import 'package:image_picker/image_picker.dart';
import 'package:flutter_eval/core/models/dataset_sample.dart';

void main() {
  group('DatasetSample', () {
    final image = XFile('test.jpg');

    test('constructs with required fields', () {
      final sample = DatasetSample(image: image, question: 'What is this?');
      expect(sample.image.path, 'test.jpg');
      expect(sample.question, 'What is this?');
      expect(sample.choices, isEmpty);
      expect(sample.answer, isNull);
    });

    test('copyWith replaces question', () {
      final sample = DatasetSample(image: image, question: 'Old?');
      final updated = sample.copyWith(question: 'New?');
      expect(updated.question, 'New?');
      expect(updated.image.path, 'test.jpg');
    });

    test('copyWith replaces answer', () {
      final sample = DatasetSample(image: image, question: 'Q?');
      final updated = sample.copyWith(answer: 'cat');
      expect(updated.answer, 'cat');
    });

    test('copyWith preserves unchanged fields', () {
      final sample = DatasetSample(
        image: image,
        question: 'Q?',
        choices: ['A. yes', 'B. no'],
        answer: 'A',
      );
      final updated = sample.copyWith(question: 'New?');
      expect(updated.choices, ['A. yes', 'B. no']);
      expect(updated.answer, 'A');
    });
  });
}
