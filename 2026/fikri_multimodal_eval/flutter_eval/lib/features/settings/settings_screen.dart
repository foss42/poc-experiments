import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_theme.dart';
import '../../shared/widgets/section_card.dart';
import 'providers/settings_provider.dart';

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  late TextEditingController _urlController;
  late TextEditingController _apiKeyController;

  @override
  void initState() {
    super.initState();
    final settings = ref.read(settingsProvider);
    _urlController = TextEditingController(text: settings.baseUrl);
    _apiKeyController = TextEditingController(text: settings.openRouterApiKey);
  }

  @override
  void dispose() {
    _urlController.dispose();
    _apiKeyController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final settings = ref.watch(settingsProvider);
    final notifier = ref.read(settingsProvider.notifier);
    final isTesting = settings.testStatus == TestConnectionStatus.testing;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: SectionCard(
        step: '1',
        title: 'Backend connection',
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            TextField(
              controller: _urlController,
              decoration: const InputDecoration(
                hintText: 'http://localhost:8001',
                labelText: 'Backend base URL',
                labelStyle: TextStyle(color: AppTheme.textMuted),
              ),
              style: const TextStyle(color: AppTheme.textPrimary),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _apiKeyController,
              obscureText: true,
              onChanged: (v) =>
                  ref.read(settingsProvider.notifier).setOpenRouterApiKey(v),
              decoration: const InputDecoration(
                hintText: 'sk-or-v1-…',
                labelText: 'OpenRouter API key',
                labelStyle: TextStyle(color: AppTheme.textMuted),
              ),
              style: const TextStyle(color: AppTheme.textPrimary),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                ElevatedButton(
                  onPressed: () => notifier.setBaseUrl(_urlController.text.trim()),
                  child: const Text('Save'),
                ),
                const SizedBox(width: 8),
                OutlinedButton(
                  onPressed: isTesting
                      ? null
                      : () {
                          notifier.setBaseUrl(_urlController.text.trim()).then(
                                (_) => notifier.testConnection(),
                              );
                        },
                  child: isTesting
                      ? const SizedBox(
                          width: 14,
                          height: 14,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Test connection'),
                ),
              ],
            ),
            if (settings.testStatus == TestConnectionStatus.ok)
              const Padding(
                padding: EdgeInsets.only(top: 8),
                child: Text(
                  'Connected \u2713',
                  style: TextStyle(color: AppTheme.success, fontSize: 13),
                ),
              ),
            if (settings.testStatus == TestConnectionStatus.error)
              const Padding(
                padding: EdgeInsets.only(top: 8),
                child: Text(
                  'Failed \u2014 check URL',
                  style: TextStyle(color: AppTheme.error, fontSize: 13),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
