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

  // ─── Text dataset upload (existing) ──────────────────────────────────

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

  // ─── Multimodal dataset upload ───────────────────────────────────────

  Future<void> _uploadMultimodalDataset() async {
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
      await api.uploadMultimodalDataset(
        fileBytes: file.bytes!,
        fileName: file.name,
      );
      ref.read(datasetsProvider.notifier).refresh();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Multimodal dataset "${file.name}" uploaded!'),
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

  // ─── Upload media files for local reference ──────────────────────────

  Future<void> _uploadMediaFiles() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: [
        'jpg',
        'jpeg',
        'png',
        'gif',
        'webp',
        'bmp',
        'pdf',
        'mp4',
        'avi',
        'mov',
        'webm',
      ],
      withData: true,
      allowMultiple: true,
    );

    if (result == null || result.files.isEmpty) return;

    setState(() => _uploading = true);
    final api = ref.read(apiServiceProvider);
    final uploaded = <String>[];

    try {
      for (final file in result.files) {
        if (file.bytes == null) continue;
        final res = await api.uploadMediaFile(
          fileBytes: file.bytes!,
          fileName: file.name,
        );
        uploaded.add(res['file_path'] ?? file.name);
      }

      if (mounted) {
        showDialog(
          context: context,
          builder: (context) => AlertDialog(
            backgroundColor: AppTheme.surfaceVariant,
            title: const Text('Media Uploaded'),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Use these paths as "media_file" values in your multimodal dataset JSON:',
                  style: TextStyle(color: AppTheme.textSecondary, fontSize: 13),
                ),
                const SizedBox(height: 12),
                ...uploaded.map(
                  (p) => Padding(
                    padding: const EdgeInsets.only(bottom: 6),
                    child: SelectableText(
                      p,
                      style: const TextStyle(
                        fontFamily: 'monospace',
                        fontSize: 12,
                        color: AppTheme.primary,
                      ),
                    ),
                  ),
                ),
              ],
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('OK'),
              ),
            ],
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

  // ─── Show multimodal help dialog ─────────────────────────────────────

  void _showMultimodalHelp() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppTheme.surfaceVariant,
        title: const Row(
          children: [
            Icon(Icons.help_outline, color: AppTheme.primary),
            SizedBox(width: 8),
            Text('Multimodal Dataset Format'),
          ],
        ),
        content: SizedBox(
          width: 500,
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text(
                  'Create a JSON file with this format:',
                  style: TextStyle(color: AppTheme.textSecondary),
                ),
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppTheme.background,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const SelectableText(
                    '[\n'
                    '  {\n'
                    '    "media_url": "https://example.com/cat.jpg",\n'
                    '    "input": "What is in this image?",\n'
                    '    "expected_output": ["A cat", "Orange cat"]\n'
                    '  },\n'
                    '  {\n'
                    '    "media_file": "/path/to/uploaded/file.png",\n'
                    '    "expected_output": "A sunset over the ocean"\n'
                    '  }\n'
                    ']',
                    style: TextStyle(
                      fontFamily: 'monospace',
                      fontSize: 12,
                      color: AppTheme.primary,
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                const Text(
                  'Supported media types:',
                  style: TextStyle(fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 8),
                _helpRow('🖼️', 'Images', 'JPG, PNG, GIF, WebP, BMP'),
                _helpRow('📄', 'PDFs', 'Multi-page documents (max 5 pages)'),
                _helpRow('🎬', 'Videos', 'MP4, AVI, MOV, WebM (5 key frames)'),
                const SizedBox(height: 16),
                const Text(
                  'Tips:',
                  style: TextStyle(fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 8),
                const Text(
                  '• Use "media_url" for images from the web\n'
                  '• Upload files first with "Upload Media Files" button,\n'
                  '  then use the returned path as "media_file"\n'
                  '• "input" is optional (defaults to a description prompt)\n'
                  '• "expected_output" can be a string or array of strings',
                  style: TextStyle(color: AppTheme.textSecondary, fontSize: 13),
                ),
              ],
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Got it'),
          ),
        ],
      ),
    );
  }

  Widget _helpRow(String emoji, String label, String desc) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(
        children: [
          Text(emoji, style: const TextStyle(fontSize: 16)),
          const SizedBox(width: 8),
          Text(
            label,
            style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
          ),
          const SizedBox(width: 8),
          Text(
            desc,
            style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13),
          ),
        ],
      ),
    );
  }

  // ─── Delete dataset ──────────────────────────────────────────────────

  Future<void> _deleteDataset(Dataset ds) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppTheme.surfaceVariant,
        title: const Text('Delete Dataset?'),
        content: Text(
          'Are you sure you want to delete "${ds.name}"?\n'
          'This will permanently delete it AND all of its evaluation runs!',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: AppTheme.error),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    try {
      setState(() => _uploading = true);
      final api = ref.read(apiServiceProvider);
      await api.deleteDataset(ds.id);

      if (_previewDataset?.id == ds.id) {
        setState(() {
          _previewDataset = null;
          _previewItems = null;
        });
      }

      ref.read(datasetsProvider.notifier).refresh();
      ref.read(evaluationsProvider.notifier).refresh();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Dataset deleted successfully.'),
            backgroundColor: AppTheme.success,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to delete dataset: $e'),
            backgroundColor: AppTheme.error,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  // ─── Dataset preview ─────────────────────────────────────────────────

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

  // ─── Media type badge ────────────────────────────────────────────────

  Widget _mediaTypeBadge(Dataset ds) {
    if (!ds.isMultimodal) return const SizedBox.shrink();

    final (String emoji, String label, Color color) = switch (ds.mediaType) {
      'image' => ('🖼️', 'Image', const Color(0xFF66BB6A)),
      'pdf' => ('📄', 'PDF', const Color(0xFF42A5F5)),
      'video' => ('🎬', 'Video', const Color(0xFFFF7043)),
      'mixed' => ('📦', 'Mixed', const Color(0xFFAB47BC)),
      _ => ('📎', ds.mediaType, AppTheme.textSecondary),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Text(
        '$emoji $label',
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: color,
        ),
      ),
    );
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
              // Help button
              IconButton(
                icon: const Icon(
                  Icons.help_outline,
                  color: AppTheme.textSecondary,
                ),
                tooltip: 'Multimodal dataset format help',
                onPressed: _showMultimodalHelp,
              ),
              const SizedBox(width: 8),
              // Upload media files
              OutlinedButton.icon(
                onPressed: _uploading ? null : _uploadMediaFiles,
                icon: const Icon(Icons.perm_media, size: 18),
                label: const Text('Upload Media Files'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppTheme.secondary,
                  side: const BorderSide(color: AppTheme.secondary),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 12,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              // Upload multimodal dataset
              ElevatedButton.icon(
                onPressed: _uploading ? null : _uploadMultimodalDataset,
                icon: const Icon(Icons.image_search, size: 18),
                label: const Text('Multimodal Dataset'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.secondary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 14,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              // Upload text dataset
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
                label: Text(_uploading ? 'Uploading...' : 'Text Dataset'),
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Dataset list + preview
          Expanded(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
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
                                      color:
                                          (ds.isMultimodal
                                                  ? AppTheme.secondary
                                                  : AppTheme.primary)
                                              .withValues(alpha: 0.15),
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: Icon(
                                      ds.isMultimodal
                                          ? Icons.image_search
                                          : Icons.description,
                                      color: ds.isMultimodal
                                          ? AppTheme.secondary
                                          : AppTheme.primary,
                                      size: 20,
                                    ),
                                  ),
                                  title: Row(
                                    children: [
                                      Flexible(
                                        child: Text(
                                          ds.name,
                                          style: const TextStyle(
                                            fontWeight: FontWeight.w600,
                                          ),
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      _mediaTypeBadge(ds),
                                    ],
                                  ),
                                  subtitle: Text(
                                    '${ds.itemCount} items${ds.isMultimodal ? ' • Multimodal' : ''}',
                                    style: const TextStyle(
                                      color: AppTheme.textSecondary,
                                    ),
                                  ),
                                  trailing: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Text(
                                        ds.createdAt.substring(0, 10),
                                        style: const TextStyle(
                                          color: AppTheme.textSecondary,
                                          fontSize: 12,
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      IconButton(
                                        icon: const Icon(
                                          Icons.delete_outline,
                                          size: 20,
                                        ),
                                        color: AppTheme.error,
                                        tooltip: 'Delete dataset',
                                        onPressed: () => _deleteDataset(ds),
                                      ),
                                    ],
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
                                child: Row(
                                  children: [
                                    Text(
                                      '${_previewDataset!.name} - Preview',
                                      style: const TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    _mediaTypeBadge(_previewDataset!),
                                  ],
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
                                      columns: [
                                        const DataColumn(label: Text('#')),
                                        // if (_previewDataset!.isMultimodal)
                                        //   const DataColumn(
                                        //     label: Text('Media'),
                                        //   ),
                                        const DataColumn(label: Text('Input')),
                                        const DataColumn(
                                          label: Text('Expected Output'),
                                        ),
                                      ],
                                      rows: List.generate(_previewItems!.length, (
                                        i,
                                      ) {
                                        final item = _previewItems![i];
                                        return DataRow(
                                          cells: [
                                            DataCell(Text('${i + 1}')),
                                            // if (_previewDataset!.isMultimodal)
                                            //   DataCell(
                                            //     _buildMediaPreview(item),
                                            //   ),
                                            DataCell(
                                              ConstrainedBox(
                                                constraints:
                                                    const BoxConstraints(
                                                      maxWidth: 300,
                                                    ),
                                                child: Text(
                                                  item.input,
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
                                                  item.expectedOutput,
                                                  overflow:
                                                      TextOverflow.ellipsis,
                                                ),
                                              ),
                                            ),
                                          ],
                                        );
                                      }),
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

  // ignore: unused_element
  Widget _buildMediaPreview(DatasetItem item) {
    final url = item.mediaUrl;
    if (url == null || url.isEmpty) {
      return const Icon(
        Icons.broken_image,
        color: AppTheme.textSecondary,
        size: 20,
      );
    }

    // Check if it's a web URL or local file
    final isWebUrl = url.startsWith('http://') || url.startsWith('https://');
    final ext = url.split('.').last.split('?').first.toLowerCase();
    final isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].contains(ext);
    final isPdf = ext == 'pdf';
    final isVideo = ['mp4', 'avi', 'mov', 'webm'].contains(ext);

    if (isImage && isWebUrl) {
      return GestureDetector(
        onTap: () {
          showDialog(
            context: context,
            builder: (context) => Dialog(
              backgroundColor: Colors.transparent,
              child: Stack(
                alignment: Alignment.topRight,
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: Image.network(
                      url,
                      headers: const {
                        'User-Agent': 'MultimodalEvalUI/1.0 (eval@example.com)',
                      },
                      fit: BoxFit.contain,
                      errorBuilder: (_, error, stack) {
                        debugPrint('Failed to load image preview: $error');
                        return Container(
                          padding: const EdgeInsets.all(32),
                          color: AppTheme.surfaceVariant,
                          child: const Icon(
                            Icons.broken_image,
                            size: 64,
                            color: AppTheme.error,
                          ),
                        );
                      },
                    ),
                  ),
                  IconButton(
                    icon: const Icon(
                      Icons.close,
                      color: Colors.white,
                      shadows: [Shadow(color: Colors.black, blurRadius: 4)],
                    ),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
            ),
          );
        },
        child: MouseRegion(
          cursor: SystemMouseCursors.click,
          child: ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: Image.network(
              url,
              headers: const {
                'User-Agent': 'MultimodalEvalUI/1.0 (eval@example.com)',
              },
              width: 48,
              height: 48,
              fit: BoxFit.cover,
              errorBuilder: (_, error, stack) => const Icon(
                Icons.broken_image,
                color: AppTheme.textSecondary,
                size: 20,
              ),
            ),
          ),
        ),
      );
    }

    if (isPdf) {
      return Container(
        width: 48,
        height: 48,
        decoration: BoxDecoration(
          color: const Color(0xFF42A5F5).withValues(alpha: 0.15),
          borderRadius: BorderRadius.circular(4),
        ),
        child: const Icon(
          Icons.picture_as_pdf,
          color: Color(0xFF42A5F5),
          size: 24,
        ),
      );
    }

    if (isVideo) {
      return Container(
        width: 48,
        height: 48,
        decoration: BoxDecoration(
          color: const Color(0xFFFF7043).withValues(alpha: 0.15),
          borderRadius: BorderRadius.circular(4),
        ),
        child: const Icon(Icons.videocam, color: Color(0xFFFF7043), size: 24),
      );
    }

    return Tooltip(
      message: url,
      child: const Icon(
        Icons.insert_drive_file,
        color: AppTheme.textSecondary,
        size: 20,
      ),
    );
  }
}
