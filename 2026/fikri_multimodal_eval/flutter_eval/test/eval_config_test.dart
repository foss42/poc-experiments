import 'package:flutter_test/flutter_test.dart';

import 'package:flutter_eval/core/models/benchmark_config.dart';
import 'package:flutter_eval/features/eval/providers/eval_config_provider.dart';

void main() {
  group('EvalConfigNotifier initial state', () {
    test('defaults to image modality, huggingface provider', () {
      final n = EvalConfigNotifier();
      expect(n.state.modality, Modality.image);
      expect(n.state.provider, EvalProvider.huggingface);
    });

    test('initial benchmark is first image benchmark (MMMU)', () {
      final n = EvalConfigNotifier();
      expect(n.state.benchmark.id, 'mmmu');
    });

    test('initial sampleLimit is 10', () {
      final n = EvalConfigNotifier();
      expect(n.state.sampleLimit, 10);
    });
  });

  group('switchModality', () {
    test('switching to audio resets benchmark to first audio benchmark', () {
      final n = EvalConfigNotifier();
      n.switchModality(Modality.audio);

      expect(n.state.modality, Modality.audio);
      expect(n.state.benchmark.id, audioBenchmarks.first.id);
    });

    test('switching to audio resets provider to huggingface', () {
      final n = EvalConfigNotifier();
      n.switchProvider(EvalProvider.ollama); // set to ollama first
      n.switchModality(Modality.audio);

      expect(n.state.provider, EvalProvider.huggingface);
    });

    test('switching to audio resets tasks to first task of new benchmark', () {
      final n = EvalConfigNotifier();
      n.switchModality(Modality.audio);

      expect(n.state.tasks, [audioBenchmarks.first.tasks.first]);
    });

    test('switching to audio sets model to defaultModelHf of first audio benchmark', () {
      final n = EvalConfigNotifier();
      n.switchModality(Modality.audio);

      expect(n.state.models, [audioBenchmarks.first.defaultModelHf ?? '']);
    });

    test('switching to agent resets sampleLimit to 5', () {
      final n = EvalConfigNotifier();
      n.switchModality(Modality.agent);

      expect(n.state.sampleLimit, 5);
    });

    test('switching to agent hides provider (still stored as hf)', () {
      final n = EvalConfigNotifier();
      n.switchModality(Modality.agent);

      expect(n.state.modality, Modality.agent);
      expect(n.state.provider, EvalProvider.huggingface);
    });
  });

  group('switchProvider', () {
    test('switching to ollama updates model to defaultModelOllama', () {
      final n = EvalConfigNotifier();
      n.switchProvider(EvalProvider.ollama);

      expect(n.state.provider, EvalProvider.ollama);
      expect(n.state.models, [n.state.benchmark.defaultModelOllama ?? '']);
    });

    test('switching back to huggingface restores defaultModelHf', () {
      final n = EvalConfigNotifier();
      n.switchProvider(EvalProvider.ollama);
      n.switchProvider(EvalProvider.huggingface);

      expect(n.state.provider, EvalProvider.huggingface);
      expect(n.state.models, [n.state.benchmark.defaultModelHf ?? '']);
    });
  });

  group('selectBenchmark', () {
    test('selecting a benchmark updates benchmark, tasks, and model', () {
      final n = EvalConfigNotifier();
      final target = imageBenchmarks[2]; // TextVQA
      n.selectBenchmark(target);

      expect(n.state.benchmark.id, 'textvqa');
      expect(n.state.tasks, [target.tasks.first]);
      expect(n.state.models, [target.defaultModelHf ?? '']);
    });
  });

  group('setters', () {
    test('setTasks updates tasks', () {
      final n = EvalConfigNotifier();
      n.setTasks(['mmmu_val', 'mmmu_pro']);
      expect(n.state.tasks, ['mmmu_val', 'mmmu_pro']);
    });

    test('setModels updates models', () {
      final n = EvalConfigNotifier();
      n.setModels(['pretrained=Qwen/Qwen2.5-VL-3B-Instruct', 'llava-phi3']);
      expect(n.state.models, ['pretrained=Qwen/Qwen2.5-VL-3B-Instruct', 'llava-phi3']);
    });

    test('setSampleLimit updates sampleLimit', () {
      final n = EvalConfigNotifier();
      n.setSampleLimit(50);
      expect(n.state.sampleLimit, 50);
    });
  });
}
