import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:flutter_eval/core/models/dataset_sample.dart';
import 'package:flutter_eval/features/eval/providers/custom_dataset_provider.dart';

void main() {
  ProviderContainer makeContainer() {
    final c = ProviderContainer();
    addTearDown(c.dispose);
    return c;
  }

  group('CustomDatasetNotifier', () {
    test('starts empty', () {
      final container = makeContainer();
      expect(container.read(customDatasetProvider), isEmpty);
    });

    test('addSamples appends to list', () {
      final container = makeContainer();
      final sample = DatasetSample(image: XFile('cat.jpg'), question: 'Q?');
      container.read(customDatasetProvider.notifier).addSamples([sample]);
      expect(container.read(customDatasetProvider), hasLength(1));
      expect(container.read(customDatasetProvider).first.question, 'Q?');
    });

    test('removeSample removes by index', () {
      final container = makeContainer();
      final a = DatasetSample(image: XFile('a.jpg'), question: 'A?');
      final b = DatasetSample(image: XFile('b.jpg'), question: 'B?');
      container.read(customDatasetProvider.notifier).addSamples([a, b]);
      container.read(customDatasetProvider.notifier).removeSample(0);
      final samples = container.read(customDatasetProvider);
      expect(samples, hasLength(1));
      expect(samples.first.question, 'B?');
    });

    test('updateSample replaces at index', () {
      final container = makeContainer();
      final original = DatasetSample(image: XFile('a.jpg'), question: 'Old?');
      container.read(customDatasetProvider.notifier).addSamples([original]);
      final updated = original.copyWith(question: 'New?');
      container.read(customDatasetProvider.notifier).updateSample(0, updated);
      expect(container.read(customDatasetProvider).first.question, 'New?');
    });

    test('clear empties the list', () {
      final container = makeContainer();
      container
          .read(customDatasetProvider.notifier)
          .addSamples([DatasetSample(image: XFile('a.jpg'), question: 'Q')]);
      container.read(customDatasetProvider.notifier).clear();
      expect(container.read(customDatasetProvider), isEmpty);
    });
  });

  group('EvalMode', () {
    test('default is standard', () {
      final container = makeContainer();
      expect(container.read(evalModeProvider), EvalMode.standard);
    });

    test('can be switched to custom', () {
      final container = makeContainer();
      container.read(evalModeProvider.notifier).state = EvalMode.custom;
      expect(container.read(evalModeProvider), EvalMode.custom);
    });
  });
}
