import 'package:flutter/material.dart';
import '../../core/models/execution_result.dart';
import '../../core/models/workflow_node.dart';
import '../theme.dart';

class NodeCard extends StatelessWidget {
  final String name;
  final HTTPMethod method;
  final String url;
  final NodeStatus status;
  final bool isLast;

  const NodeCard({
    super.key,
    required this.name,
    required this.method,
    required this.url,
    required this.status,
    this.isLast = false,
  });

  Color get _borderColor => switch (status) {
    NodeStatus.success => AppColors.success,
    NodeStatus.failed => AppColors.failure,
    NodeStatus.running => AppColors.warning,
    NodeStatus.skipped => AppColors.textDim,
    NodeStatus.pending => AppColors.border,
  };

  Widget get _statusIcon => switch (status) {
    NodeStatus.success => const Icon(Icons.check_circle, color: AppColors.success, size: 16),
    NodeStatus.failed => const Icon(Icons.cancel, color: AppColors.failure, size: 16),
    NodeStatus.running => const SizedBox(
      width: 14, height: 14,
      child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.warning),
    ),
    NodeStatus.skipped => const Icon(Icons.skip_next, color: AppColors.textDim, size: 16),
    NodeStatus.pending => const Icon(Icons.circle_outlined, color: AppColors.border, size: 16),
  };

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 160,
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: status == NodeStatus.failed
                ? AppColors.failure.withValues(alpha: 0.1)
                : AppColors.surface,
            borderRadius: BorderRadius.circular(6),
            border: Border.all(color: _borderColor, width: 1.5),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: methodColor(method).withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(3),
                    ),
                    child: Text(
                      method.label,
                      style: TextStyle(
                        color: methodColor(method), fontSize: 10,
                        fontWeight: FontWeight.bold, fontFamily: 'monospace',
                      ),
                    ),
                  ),
                  const Spacer(),
                  _statusIcon,
                ],
              ),
              const SizedBox(height: 8),
              Text(name, style: AppTextStyles.mono12Bold),
              const SizedBox(height: 4),
              Text(
                _shortenUrl(url),
                style: const TextStyle(color: AppColors.textDim, fontSize: 10, fontFamily: 'monospace'),
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
        if (!isLast)
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 8),
            child: Icon(Icons.arrow_forward, color: AppColors.border, size: 18),
          ),
      ],
    );
  }

  String _shortenUrl(String url) {
    final uri = Uri.tryParse(url);
    if (uri == null) return url;
    return uri.path + (uri.query.isNotEmpty ? '?${uri.query}' : '');
  }
}
