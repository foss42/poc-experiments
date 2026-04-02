import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:file_picker/file_picker.dart';
import '../app/theme.dart';
import '../providers/providers.dart';
import '../models/dataset.dart';

class DatasetScreen extends ConsumerStatefulWidget {
  const DatasetScreen({super.key});

  @override
  ConsumerState<DatasetScreen> createState() => _DatasetScreenState();
}

class _DatasetScreenState extends ConsumerState<DatasetScreen> {
  bool _uploading = false;
  Dataset? _previewDataset;
  List<DatasetItem>? _previewItems;

  Future<void> _uploadDataset() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['json'],
      withData: true,
    );

    if (result == null || result.files.isEmpty) return;
    final file = result.files.first;
    if (file.bytes == null) return;

    setState(() => _uploading = true);
    try {
      final api = ref.read(apiServiceProvider);
      await api.uploadDataset(fileBytes: file.bytes!, fileName: file.name);
      ref.read(datasetsProvider.notifier).refresh();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Dataset "${file.name}" uploaded successfully!'),
            backgroundColor: AppTheme.success,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Upload failed: $e'),
            backgroundColor: AppTheme.error,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  Future<void> _previewDatasetById(Dataset dataset) async {
    try {
      final api = ref.read(apiServiceProvider);
      final full = await api.getDataset(dataset.id);
      setState(() {
        _previewDataset = full;
        _previewItems = full.items;
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to load preview: $e'),
            backgroundColor: AppTheme.error,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final datasetsAsync = ref.watch(datasetsProvider);

    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            children: [
              const Icon(Icons.dataset, color: AppTheme.primary, size: 28),
              const SizedBox(width: 12),
              const Text(
                'Datasets',
                style: TextStyle(fontSize: 24, fontWeight: FontWeight.w700),
              ),
              const Spacer(),
              ElevatedButton.icon(
                onPressed: _uploading ? null : _uploadDataset,
                icon: _uploading
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Icon(Icons.upload_file),
                label: Text(_uploading ? 'Uploading...' : 'Upload Dataset'),
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Dataset list + preview
          Expanded(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Dataset list
                Expanded(
                  flex: 2,
                  child: datasetsAsync.when(
                    loading: () =>
                        const Center(child: CircularProgressIndicator()),
                    error: (e, _) => Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(
                            Icons.error_outline,
                            color: AppTheme.error,
                            size: 48,
                          ),
                          const SizedBox(height: 12),
                          Text(
                            'Failed to load datasets: $e',
                            style: const TextStyle(
                              color: AppTheme.textSecondary,
                            ),
                          ),
                          const SizedBox(height: 12),
                          ElevatedButton(
                            onPressed: () =>
                                ref.read(datasetsProvider.notifier).refresh(),
                            child: const Text('Retry'),
                          ),
                        ],
                      ),
                    ),
                    data: (datasets) => datasets.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  Icons.cloud_upload,
                                  size: 64,
                                  color: AppTheme.textSecondary.withValues(
                                    alpha: 0.5,
                                  ),
                                ),
                                const SizedBox(height: 16),
                                const Text(
                                  'No datasets yet',
                                  style: TextStyle(
                                    fontSize: 18,
                                    color: AppTheme.textSecondary,
                                  ),
                                ),
                                const SizedBox(height: 8),
                                const Text(
                                  'Upload a JSON dataset to get started',
                                  style: TextStyle(
                                    color: AppTheme.textSecondary,
                                  ),
                                ),
                              ],
                            ),
                          )
                        : ListView.builder(
                            itemCount: datasets.length,
                            itemBuilder: (context, index) {
                              final ds = datasets[index];
                              final isSelected = _previewDataset?.id == ds.id;
                              return Card(
                                color: isSelected
                                    ? AppTheme.primary.withValues(alpha: 0.1)
                                    : AppTheme.card,
                                child: ListTile(
                                  leading: Container(
                                    padding: const EdgeInsets.all(8),
                                    decoration: BoxDecoration(
                                      color: AppTheme.secondary.withValues(
                                        alpha: 0.15,
                                      ),
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: const Icon(
                                      Icons.description,
                                      color: AppTheme.secondary,
                                      size: 20,
                                    ),
                                  ),
                                  title: Text(
                                    ds.name,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                  subtitle: Text(
                                    '${ds.itemCount} items',
                                    style: const TextStyle(
                                      color: AppTheme.textSecondary,
                                    ),
                                  ),
                                  trailing: Text(
                                    ds.createdAt.substring(0, 10),
                                    style: const TextStyle(
                                      color: AppTheme.textSecondary,
                                      fontSize: 12,
                                    ),
                                  ),
                                  onTap: () => _previewDatasetById(ds),
                                ),
                              );
                            },
                          ),
                  ),
                ),
                const SizedBox(width: 16),

                // Preview panel
                Expanded(
                  flex: 3,
                  child: Container(
                    decoration: BoxDecoration(
                      color: AppTheme.card,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppTheme.border),
                    ),
                    child: _previewItems == null
                        ? const Center(
                            child: Text(
                              'Select a dataset to preview',
                              style: TextStyle(color: AppTheme.textSecondary),
                            ),
                          )
                        : Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Padding(
                                padding: const EdgeInsets.all(16),
                                child: Text(
                                  '${_previewDataset!.name} - Preview',
                                  style: const TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                              const Divider(color: AppTheme.border, height: 1),
                              Expanded(
                                child: SingleChildScrollView(
                                  scrollDirection: Axis.horizontal,
                                  child: SingleChildScrollView(
                                    child: DataTable(
                                      headingRowColor: WidgetStateProperty.all(
                                        AppTheme.surfaceVariant,
                                      ),
                                      columns: const [
                                        DataColumn(label: Text('#')),
                                        DataColumn(label: Text('Input')),
                                        DataColumn(
                                          label: Text('Expected Output'),
                                        ),
                                      ],
                                      rows: List.generate(
                                        _previewItems!.length,
                                        (i) => DataRow(
                                          cells: [
                                            DataCell(Text('${i + 1}')),
                                            DataCell(
                                              ConstrainedBox(
                                                constraints:
                                                    const BoxConstraints(
                                                      maxWidth: 300,
                                                    ),
                                                child: Text(
                                                  _previewItems![i].input,
                                                  overflow:
                                                      TextOverflow.ellipsis,
                                                ),
                                              ),
                                            ),
                                            DataCell(
                                              ConstrainedBox(
                                                constraints:
                                                    const BoxConstraints(
                                                      maxWidth: 300,
                                                    ),
                                                child: Text(
                                                  _previewItems![i]
                                                      .expectedOutput,
                                                  overflow:
                                                      TextOverflow.ellipsis,
                                                ),
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            ],
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
