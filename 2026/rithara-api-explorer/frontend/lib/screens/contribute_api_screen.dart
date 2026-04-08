import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../theme/app_colors.dart';
import '../providers/submission_providers.dart';
import '../widgets/common/section_card.dart';
import '../data/categories.dart';

class ContributeApiScreen extends ConsumerWidget {
  const ContributeApiScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final form = ref.watch(contributeFormNotifierProvider);
    final notifier = ref.read(contributeFormNotifierProvider.notifier);

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () {
            if (context.canPop()) {
              context.pop();
            } else {
              context.go('/');
            }
          },
        ),
        title: const Text('Contribute New API'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildInfoAlert(),
            const SizedBox(height: 32),
            
            // Basic Info
            SectionCard(
              title: 'Basic Information',
              child: Column(
                children: [
                  _buildTextField(
                    label: 'API Name',
                    hint: 'e.g. OpenAI API',
                    value: form.name,
                    onChanged: (v) => notifier.updateField('name', v),
                  ),
                  const SizedBox(height: 20),
                  _buildTextField(
                    label: 'Short Description',
                    hint: 'A brief 1-line summary of what the API does',
                    value: form.description,
                    onChanged: (v) => notifier.updateField('description', v),
                  ),
                  const SizedBox(height: 20),
                  _buildCategoryDropdown(ref, form.category),
                  const SizedBox(height: 20),
                  Row(
                    children: [
                      Expanded(
                        child: _buildTextField(
                          label: 'Version',
                          hint: 'e.g. 1.0.0',
                          value: form.version,
                          onChanged: (v) => notifier.updateField('version', v),
                        ),
                      ),
                      const SizedBox(width: 20),
                      Expanded(
                        child: _buildTextField(
                          label: 'Tags',
                          hint: 'comma separated',
                          value: form.tags,
                          onChanged: (v) => notifier.updateField('tags', v),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Config
            SectionCard(
              title: 'API Configuration',
              child: Column(
                children: [
                  _buildTextField(
                    label: 'Base URL',
                    hint: 'https://api.example.com/v1',
                    value: form.baseUrl,
                    onChanged: (v) => notifier.updateField('baseUrl', v),
                  ),
                  const SizedBox(height: 20),
                  _buildTextField(
                    label: 'Documentation URL',
                    hint: 'https://docs.example.com',
                    value: form.documentation,
                    onChanged: (v) => notifier.updateField('documentation', v),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 32),

            // Submit Actions
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton(
                  onPressed: () {
                    notifier.reset();
                    if (context.canPop()) {
                      context.pop();
                    } else {
                      context.go('/');
                    }
                  },
                  child: const Text('Cancel'),
                ),
                const SizedBox(width: 16),
                ElevatedButton(
                  onPressed: () {
                    final err = notifier.validate();
                    if (err != null) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text(err), backgroundColor: AppColors.danger),
                      );
                      return;
                    }
                    // Simulate submission
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Submission successful!'), backgroundColor: AppColors.success),
                    );
                    notifier.reset();
                    context.go('/my-contributions');
                  },
                  child: const Text('Submit for Review'),
                ),
              ],
            ),
            const SizedBox(height: 48),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoAlert() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.blueFaint,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.blue.withValues(alpha: 0.2)),
      ),
      child: Row(
        children: [
          const Icon(Icons.info_outline, color: AppColors.blueLight, size: 20),
          const SizedBox(width: 12),
          const Expanded(
            child: Text(
              'Your submission will be reviewed by the community before being listed. '
              'Please ensure all information is accurate and documentation URLs are valid.',
              style: TextStyle(color: AppColors.textGray300, fontSize: 13),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTextField({
    required String label,
    required String hint,
    required String value,
    required ValueChanged<String> onChanged,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(color: AppColors.textGray300, fontSize: 13, fontWeight: FontWeight.w500)),
        const SizedBox(height: 8),
        TextFormField(
          initialValue: value,
          onChanged: onChanged,
          decoration: InputDecoration(
            hintText: hint,
          ),
        ),
      ],
    );
  }

  Widget _buildCategoryDropdown(WidgetRef ref, String current) {
     final notifier = ref.read(contributeFormNotifierProvider.notifier);
     return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Category', style: TextStyle(color: AppColors.textGray300, fontSize: 13, fontWeight: FontWeight.w500)),
        const SizedBox(height: 8),
        DropdownButtonFormField<String>(
          initialValue: current,
          items: categories.where((c) => c.id != 'all').map((c) => DropdownMenuItem(
            value: c.id,
            child: Text(c.name),
          )).toList(),
          onChanged: (v) => notifier.updateField('category', v!),
        ),
      ],
    );
  }
}
