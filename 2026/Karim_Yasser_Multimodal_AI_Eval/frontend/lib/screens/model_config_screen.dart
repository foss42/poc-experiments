import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../app/theme.dart';
import '../providers/providers.dart';

class ModelConfigScreen extends ConsumerStatefulWidget {
  const ModelConfigScreen({super.key});

  @override
  ConsumerState<ModelConfigScreen> createState() => _ModelConfigScreenState();
}

class _ModelConfigScreenState extends ConsumerState<ModelConfigScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController();
  final _modelNameCtrl = TextEditingController();
  final _apiKeyCtrl = TextEditingController();
  final _baseUrlCtrl = TextEditingController(text: 'https://api.openai.com/v1');
  double _temperature = 0.7;
  int _maxTokens = 256;
  String _provider = 'openai';

  @override
  void dispose() {
    _nameCtrl.dispose();
    _modelNameCtrl.dispose();
    _apiKeyCtrl.dispose();
    _baseUrlCtrl.dispose();
    super.dispose();
  }

  Future<void> _createConfig() async {
    if (!_formKey.currentState!.validate()) return;
    try {
      final api = ref.read(apiServiceProvider);
      await api.createModelConfig(
        name: _nameCtrl.text,
        modelName: _modelNameCtrl.text,
        provider: _provider,
        apiKey: _apiKeyCtrl.text,
        temperature: _temperature,
        maxTokens: _maxTokens,
        baseUrl: _baseUrlCtrl.text,
      );
      _nameCtrl.clear();
      _modelNameCtrl.clear();
      _apiKeyCtrl.clear();
      ref.read(modelConfigsProvider.notifier).refresh();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Model config created!'),
            backgroundColor: AppTheme.success,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed: $e'),
            backgroundColor: AppTheme.error,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final configsAsync = ref.watch(modelConfigsProvider);

    return Padding(
      padding: const EdgeInsets.all(24),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Form
          Expanded(
            flex: 2,
            child: Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: AppTheme.card,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppTheme.border),
              ),
              child: Form(
                key: _formKey,
                child: SingleChildScrollView(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Row(
                        children: [
                          Icon(
                            Icons.smart_toy,
                            color: AppTheme.primary,
                            size: 24,
                          ),
                          SizedBox(width: 12),
                          Text(
                            'Add Model Configuration',
                            style: TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 24),
                      TextFormField(
                        controller: _nameCtrl,
                        decoration: const InputDecoration(
                          labelText: 'Configuration Name',
                        ),
                        validator: (v) =>
                            v == null || v.isEmpty ? 'Required' : null,
                      ),
                      const SizedBox(height: 16),
                      DropdownButtonFormField<String>(
                        initialValue: _provider,
                        decoration: const InputDecoration(
                          labelText: 'Provider',
                        ),
                        dropdownColor: AppTheme.surfaceVariant,
                        items: const [
                          DropdownMenuItem(
                            value: 'openai',
                            child: Text('OpenAI'),
                          ),
                          DropdownMenuItem(
                            value: 'ollama',
                            child: Text('Ollama'),
                          ),
                          DropdownMenuItem(
                            value: 'lmstudio',
                            child: Text('LM Studio'),
                          ),
                          DropdownMenuItem(
                            value: 'local',
                            child: Text('Local Server'),
                          ),
                        ],
                        onChanged: (v) =>
                            setState(() => _provider = v ?? 'openai'),
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _modelNameCtrl,
                        decoration: const InputDecoration(
                          labelText: 'Model Name',
                          hintText: 'e.g. gpt-4o-mini',
                        ),
                        validator: (v) =>
                            v == null || v.isEmpty ? 'Required' : null,
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _apiKeyCtrl,
                        decoration: const InputDecoration(
                          labelText: 'API Key (optional)',
                        ),
                        obscureText: true,
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _baseUrlCtrl,
                        decoration: const InputDecoration(
                          labelText: 'Base URL',
                        ),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'Temperature: ${_temperature.toStringAsFixed(1)}',
                        style: const TextStyle(color: AppTheme.textSecondary),
                      ),
                      Slider(
                        value: _temperature,
                        min: 0.0,
                        max: 2.0,
                        divisions: 20,
                        activeColor: AppTheme.primary,
                        onChanged: (v) => setState(() => _temperature = v),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Max Tokens: $_maxTokens',
                        style: const TextStyle(color: AppTheme.textSecondary),
                      ),
                      Slider(
                        value: _maxTokens.toDouble(),
                        min: 1,
                        max: 4096,
                        divisions: 64,
                        activeColor: AppTheme.primary,
                        onChanged: (v) =>
                            setState(() => _maxTokens = v.toInt()),
                      ),
                      const SizedBox(height: 24),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton.icon(
                          onPressed: _createConfig,
                          icon: const Icon(Icons.save),
                          label: const Text('Save Configuration'),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(width: 24),

          // Existing configs
          Expanded(
            flex: 3,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Saved Configurations',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 16),
                Expanded(
                  child: configsAsync.when(
                    loading: () =>
                        const Center(child: CircularProgressIndicator()),
                    error: (e, _) => Center(child: Text('Error: $e')),
                    data: (configs) => configs.isEmpty
                        ? const Center(
                            child: Text(
                              'No configurations yet',
                              style: TextStyle(color: AppTheme.textSecondary),
                            ),
                          )
                        : ListView.builder(
                            itemCount: configs.length,
                            itemBuilder: (context, index) {
                              final c = configs[index];
                              return Card(
                                child: ListTile(
                                  leading: Container(
                                    padding: const EdgeInsets.all(8),
                                    decoration: BoxDecoration(
                                      color: AppTheme.primary.withValues(
                                        alpha: 0.15,
                                      ),
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: const Icon(
                                      Icons.memory,
                                      color: AppTheme.primary,
                                      size: 20,
                                    ),
                                  ),
                                  title: Text(
                                    c.name,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                  subtitle: Text(
                                    '${c.provider} • ${c.modelName} • T=${c.temperature}',
                                    style: const TextStyle(
                                      color: AppTheme.textSecondary,
                                    ),
                                  ),
                                  trailing: IconButton(
                                    icon: const Icon(
                                      Icons.delete_outline,
                                      color: AppTheme.error,
                                      size: 20,
                                    ),
                                    onPressed: () async {
                                      final api = ref.read(apiServiceProvider);
                                      await api.deleteModelConfig(c.id);
                                      ref
                                          .read(modelConfigsProvider.notifier)
                                          .refresh();
                                    },
                                  ),
                                ),
                              );
                            },
                          ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
