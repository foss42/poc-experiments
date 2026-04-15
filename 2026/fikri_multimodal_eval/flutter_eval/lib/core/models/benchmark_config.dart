enum Modality { image, audio, agent }

enum EvalProvider { huggingface, ollama, openrouter }

class BenchmarkConfig {
  const BenchmarkConfig({
    required this.id,
    required this.label,
    required this.harness,
    required this.tasks,
    required this.metric,
    required this.description,
    this.defaultModelHf,
    this.defaultModelOllama,
  });

  final String id;
  final String label;

  /// 'lm-eval' | 'lmms-eval' | 'inspect-ai' | 'faster-whisper'
  final String harness;
  final List<String> tasks;
  final String metric;
  final String description;

  /// Default model arg for HuggingFace provider (or faster-whisper size).
  final String? defaultModelHf;

  /// Default model arg when Ollama provider is selected (image benchmarks only).
  final String? defaultModelOllama;
}

const imageBenchmarks = <BenchmarkConfig>[
  BenchmarkConfig(
    id: 'mmmu',
    label: 'MMMU',
    harness: 'lm-eval',
    tasks: ['mmmu_val'],
    metric: 'acc',
    description:
        'Massive Multi-discipline Multimodal Understanding — 11K expert-level questions across 57 subjects.',
    defaultModelHf: 'pretrained=HuggingFaceTB/SmolVLM-500M-Instruct',
    defaultModelOllama: 'llava-phi3',
  ),
  BenchmarkConfig(
    id: 'scienceqa',
    label: 'ScienceQA',
    harness: 'lm-eval',
    tasks: ['scienceqa_img'],
    metric: 'acc',
    description:
        'Multi-modal science questions with explanations from elementary to high school.',
    defaultModelHf: 'pretrained=HuggingFaceTB/SmolVLM-500M-Instruct',
    defaultModelOllama: 'llava-phi3',
  ),
  BenchmarkConfig(
    id: 'textvqa',
    label: 'TextVQA',
    harness: 'lm-eval',
    tasks: ['textvqa'],
    metric: 'exact_match',
    description:
        'Visual question answering requiring reading and reasoning about text in images.',
    defaultModelHf: 'pretrained=HuggingFaceTB/SmolVLM-500M-Instruct',
    defaultModelOllama: 'llava-phi3',
  ),
  BenchmarkConfig(
    id: 'chartqa',
    label: 'ChartQA',
    harness: 'lm-eval',
    tasks: ['chartqa'],
    metric: 'relaxed_overall',
    description:
        'Chart question answering with logical and data extraction tasks.',
    defaultModelHf: 'pretrained=HuggingFaceTB/SmolVLM-500M-Instruct',
    defaultModelOllama: 'llava-phi3',
  ),
  BenchmarkConfig(
    id: 'gqa',
    label: 'GQA',
    harness: 'lm-eval',
    tasks: ['gqa'],
    metric: 'acc',
    description:
        'Scene graph-based visual question answering with compositional reasoning.',
    defaultModelHf: 'pretrained=HuggingFaceTB/SmolVLM-500M-Instruct',
    defaultModelOllama: 'llava-phi3',
  ),
];

const audioBenchmarks = <BenchmarkConfig>[
  BenchmarkConfig(
    id: 'librispeech_lmms',
    label: 'LibriSpeech',
    harness: 'lmms-eval',
    tasks: ['librispeech'],
    metric: 'wer',
    description:
        'ASR benchmark on read-speech audiobooks — clean split via lmms-eval.',
    defaultModelHf: 'pretrained=openai/whisper-base',
  ),
  BenchmarkConfig(
    id: 'commonvoice',
    label: 'CommonVoice',
    harness: 'lmms-eval',
    tasks: ['common_voice_15_en'],
    metric: 'wer',
    description: 'Crowdsourced multilingual speech dataset from Mozilla.',
    defaultModelHf: 'pretrained=openai/whisper-base',
  ),
  BenchmarkConfig(
    id: 'fleurs',
    label: 'FLEURS',
    harness: 'lmms-eval',
    tasks: ['fleurs_en_us'],
    metric: 'wer',
    description:
        'Few-shot Learning Evaluation of Universal Representations of Speech.',
    defaultModelHf: 'pretrained=openai/whisper-base',
  ),
  BenchmarkConfig(
    id: 'voicebench',
    label: 'VoiceBench',
    harness: 'lmms-eval',
    tasks: ['voicebench'],
    metric: 'acc',
    description: 'Spoken question answering and instruction following.',
    defaultModelHf: 'pretrained=openai/whisper-base',
  ),
  BenchmarkConfig(
    id: 'librispeech_fw',
    label: 'LibriSpeech (faster-whisper)',
    harness: 'faster-whisper',
    tasks: ['librispeech'],
    metric: 'wer',
    description:
        'Optimised ASR using CTranslate2 INT8 quantisation for fast CPU/GPU inference.',
    defaultModelHf: 'base',
  ),
];

const agentBenchmarks = <BenchmarkConfig>[
  BenchmarkConfig(
    id: 'basic_agent',
    label: 'Basic Agent',
    harness: 'inspect-ai',
    tasks: ['basic_agent'],
    metric: 'accuracy',
    description:
        'Tool-use and step-by-step reasoning evaluation using inspect-ai framework.',
    defaultModelHf: 'qwen2.5:1.5b',
  ),
];

List<BenchmarkConfig> benchmarksForModality(Modality modality) {
  switch (modality) {
    case Modality.image:
      return imageBenchmarks;
    case Modality.audio:
      return audioBenchmarks;
    case Modality.agent:
      return agentBenchmarks;
  }
}
