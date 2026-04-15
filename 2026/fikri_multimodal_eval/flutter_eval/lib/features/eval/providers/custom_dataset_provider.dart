import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/models/dataset_sample.dart';

enum EvalMode { standard, custom }

final evalModeProvider = StateProvider<EvalMode>((ref) => EvalMode.standard);

class CustomDatasetNotifier extends StateNotifier<List<DatasetSample>> {
  CustomDatasetNotifier() : super([]);

  void addSamples(List<DatasetSample> samples) {
    state = [...state, ...samples];
  }

  void updateSample(int index, DatasetSample sample) {
    final updated = [...state];
    updated[index] = sample;
    state = updated;
  }

  void removeSample(int index) {
    final updated = [...state];
    updated.removeAt(index);
    state = updated;
  }

  void clear() => state = [];
}

final customDatasetProvider =
    StateNotifierProvider<CustomDatasetNotifier, List<DatasetSample>>(
  (ref) => CustomDatasetNotifier(),
);
