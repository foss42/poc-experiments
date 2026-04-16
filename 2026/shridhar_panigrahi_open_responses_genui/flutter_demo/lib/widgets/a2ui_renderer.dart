import 'package:flutter/material.dart';
import '../design.dart';

/// Renders an A2UI component tree built from the parsed JSONL payload.
/// Supports 24 component types — Text, Button, Card, Row, Column, Image,
/// Icon, Divider, List, Tabs, TextField, Checkbox, Switch, Progress, Chip,
/// Badge, Avatar, Slider, Radio, Dropdown, Table, Wrap, CircularProgress,
/// Tooltip, Container, Alert, CodeBlock, Link.
class A2UIRenderer extends StatefulWidget {
  const A2UIRenderer({
    super.key,
    required this.components,
    required this.dataModel,
  });

  final Map<String, dynamic> components;
  final Map<String, dynamic> dataModel;

  @override
  State<A2UIRenderer> createState() => _A2UIRendererState();
}

class _A2UIRendererState extends State<A2UIRenderer> {
  final Map<String, dynamic> _localState = {};

  @override
  Widget build(BuildContext context) {
    if (!widget.components.containsKey('root')) {
      return const _A2UIError(message: 'No root component');
    }
    return _renderComponent(context, 'root');
  }

  Widget _renderComponent(BuildContext context, String id) {
    final node = widget.components[id];
    if (node is! Map<String, dynamic>) return const SizedBox.shrink();

    return switch (node['component'] as String? ?? '') {
      'Text' => _buildText(context, node),
      'Button' => _buildButton(context, node),
      'Card' => _buildCard(context, node),
      'Row' => _buildRow(context, node),
      'Column' => _buildColumn(context, node),
      'Image' => _buildImage(node),
      'Icon' => _buildIcon(node),
      'Divider' => const Divider(),
      'List' => _buildList(context, node),
      'Tabs' => _buildTabs(context, node),
      'TextField' => _buildTextField(context, node),
      'Checkbox' => _buildCheckbox(context, node),
      'Switch' => _buildSwitch(context, node),
      'Progress' => _buildProgress(context, node),
      'Chip' => _buildChip(context, node),
      'Badge' => _buildBadge(context, node),
      'Avatar' => _buildAvatar(context, node),
      'Slider' => _buildSlider(context, node),
      'Radio' => _buildRadio(context, node),
      'Dropdown' => _buildDropdown(context, node),
      'Table' => _buildTable(context, node),
      'Wrap' => _buildWrap(context, node),
      'Spacer' => const SizedBox(height: 16),
      'CircularProgress' => _buildCircularProgress(context, node),
      'Tooltip' => _buildTooltip(context, node),
      'Container' => _buildContainer(context, node),
      'Alert' => _buildAlert(context, node),
      'CodeBlock' => _buildCodeBlock(context, node),
      'Link' => _buildLink(context, node),
      final t => _A2UIError(message: 'Unknown component: $t'),
    };
  }

  String _resolve(dynamic value) {
    if (value == null) return '';
    if (value is String) return value;
    if (value is Map) {
      final path = value['path'] as String?;
      if (path != null) return _dataAt(path)?.toString() ?? '';
      return value['literalString'] as String? ?? '';
    }
    return value.toString();
  }

  dynamic _dataAt(String path) {
    if (!path.startsWith('/')) return null;
    final segments = path.substring(1).split('/');
    dynamic cursor = widget.dataModel;
    for (final seg in segments) {
      if (cursor is Map) {
        cursor = cursor[seg];
      } else if (cursor is List) {
        final i = int.tryParse(seg);
        cursor = (i != null && i < cursor.length) ? cursor[i] : null;
      } else {
        return null;
      }
    }
    return cursor;
  }

  List<String> _children(dynamic raw) =>
      raw is List ? raw.cast<String>() : [];

  Widget _buildText(BuildContext context, Map<String, dynamic> n) {
    final style = switch (n['variant'] as String? ?? 'body') {
      'h1' => Theme.of(context).textTheme.headlineSmall,
      'h2' => Theme.of(context).textTheme.titleLarge,
      'h3' => Theme.of(context).textTheme.titleMedium,
      'caption' => Theme.of(context).textTheme.bodySmall,
      _ => Theme.of(context).textTheme.bodyMedium,
    };
    return SelectableText(_resolve(n['text']), style: style);
  }

  Widget _buildButton(BuildContext context, Map<String, dynamic> n) {
    final label = _resolve(n['text']);
    final action = n['action'] as String? ?? label;
    void onPressed() {
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(SnackBar(
          content: Text('Action: $action'),
          duration: const Duration(seconds: 1),
        ));
    }

    return switch (n['variant'] as String? ?? 'text') {
      'primary' => FilledButton(onPressed: onPressed, child: Text(label)),
      'outlined' => OutlinedButton(onPressed: onPressed, child: Text(label)),
      _ => TextButton(onPressed: onPressed, child: Text(label)),
    };
  }

  Widget _buildCard(BuildContext context, Map<String, dynamic> n) => Card(
        child: Padding(
          padding: kP8,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: _children(n['children'])
                .map((id) => _renderComponent(context, id))
                .toList(),
          ),
        ),
      );

  Widget _buildRow(BuildContext context, Map<String, dynamic> n) => Row(
        mainAxisAlignment: switch (n['justify'] as String? ?? 'start') {
          'center' => MainAxisAlignment.center,
          'end' => MainAxisAlignment.end,
          'spaceBetween' => MainAxisAlignment.spaceBetween,
          'spaceAround' => MainAxisAlignment.spaceAround,
          _ => MainAxisAlignment.start,
        },
        children: _children(n['children'])
            .map((id) => _renderComponent(context, id))
            .toList(),
      );

  Widget _buildColumn(BuildContext context, Map<String, dynamic> n) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: _children(n['children'])
            .map((id) => _renderComponent(context, id))
            .toList(),
      );

  Widget _buildImage(Map<String, dynamic> n) {
    final src = _resolve(n['src'] ?? n['url'] ?? '');
    if (src.isEmpty) return const Icon(Icons.broken_image_rounded);
    return Image.network(
      src,
      errorBuilder: (_, __, ___) => const Icon(Icons.broken_image_rounded),
    );
  }

  Widget _buildIcon(Map<String, dynamic> n) =>
      Icon(_iconFor(n['name'] as String? ?? ''), size: 24);

  Widget _buildList(BuildContext context, Map<String, dynamic> n) =>
      ListView.builder(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        itemCount: _children(n['children']).length,
        itemBuilder: (_, i) =>
            _renderComponent(context, _children(n['children'])[i]),
      );

  Widget _buildTextField(BuildContext context, Map<String, dynamic> n) {
    final id = n['id'] as String? ?? '';
    final label = _resolve(n['label'] ?? n['text'] ?? '');
    final hint = _resolve(n['hint'] ?? '');
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: TextField(
        controller: TextEditingController(
            text: _localState[id] as String? ?? ''),
        decoration: InputDecoration(
          labelText: label.isNotEmpty ? label : null,
          hintText: hint.isNotEmpty ? hint : null,
          border: const OutlineInputBorder(),
          isDense: true,
        ),
        onChanged: (v) => _localState[id] = v,
      ),
    );
  }

  Widget _buildCheckbox(BuildContext context, Map<String, dynamic> n) {
    final id = n['id'] as String? ?? '';
    final label = _resolve(n['label'] ?? n['text'] ?? '');
    final checked = _localState[id] as bool? ?? (n['checked'] == true);
    return CheckboxListTile(
      title: Text(label),
      value: checked,
      dense: true,
      controlAffinity: ListTileControlAffinity.leading,
      contentPadding: EdgeInsets.zero,
      onChanged: (v) => setState(() => _localState[id] = v ?? false),
    );
  }

  Widget _buildSwitch(BuildContext context, Map<String, dynamic> n) {
    final id = n['id'] as String? ?? '';
    final label = _resolve(n['label'] ?? n['text'] ?? '');
    final on = _localState[id] as bool? ?? (n['value'] == true);
    return SwitchListTile(
      title: Text(label),
      value: on,
      dense: true,
      contentPadding: EdgeInsets.zero,
      onChanged: (v) => setState(() => _localState[id] = v),
    );
  }

  Widget _buildProgress(BuildContext context, Map<String, dynamic> n) {
    final value = (n['value'] as num?)?.toDouble();
    final label = _resolve(n['label'] ?? '');
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (label.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(bottom: 4),
            child: Text(label, style: Theme.of(context).textTheme.bodySmall),
          ),
        value != null
            ? LinearProgressIndicator(value: value.clamp(0.0, 1.0))
            : const LinearProgressIndicator(),
      ],
    );
  }

  Widget _buildChip(BuildContext context, Map<String, dynamic> n) {
    final label = _resolve(n['label'] ?? n['text'] ?? '');
    return Chip(label: Text(label));
  }

  Widget _buildTabs(BuildContext context, Map<String, dynamic> n) {
    final ids = _children(n['children']);
    if (ids.isEmpty) return const SizedBox.shrink();
    final labels = n['labels'] is List
        ? (n['labels'] as List).cast<String>()
        : ids;
    return DefaultTabController(
      length: ids.length,
      child: Column(children: [
        TabBar(tabs: labels.map((l) => Tab(text: l)).toList()),
        SizedBox(
          height: 200,
          child: TabBarView(
            children:
                ids.map((id) => _renderComponent(context, id)).toList(),
          ),
        ),
      ]),
    );
  }

  Widget _buildBadge(BuildContext context, Map<String, dynamic> n) {
    final label = _resolve(n['label'] ?? n['text'] ?? '');
    final colorName = (n['color'] as String? ?? '').toLowerCase();
    final color = switch (colorName) {
      'red' => Colors.red,
      'green' => Colors.green,
      'blue' => Colors.blue,
      'orange' => Colors.orange,
      'yellow' => Colors.amber,
      'purple' => Colors.purple,
      _ => Theme.of(context).colorScheme.primary,
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.4)),
      ),
      child: Text(label,
          style: TextStyle(
              color: color,
              fontSize: 12,
              fontWeight: FontWeight.w600)),
    );
  }

  Widget _buildAvatar(BuildContext context, Map<String, dynamic> n) {
    final src = _resolve(n['src'] ?? n['url'] ?? '');
    final label = _resolve(n['label'] ?? n['text'] ?? '');
    final radius = (n['radius'] as num?)?.toDouble() ?? 20;
    if (src.isNotEmpty) {
      return CircleAvatar(
        radius: radius,
        backgroundImage: NetworkImage(src),
        onBackgroundImageError: (_, __) {},
      );
    }
    return CircleAvatar(
      radius: radius,
      child: Text(label.isNotEmpty ? label[0].toUpperCase() : '?'),
    );
  }

  Widget _buildSlider(BuildContext context, Map<String, dynamic> n) {
    final id = n['id'] as String? ?? '';
    final label = _resolve(n['label'] ?? '');
    final min = (n['min'] as num?)?.toDouble() ?? 0;
    final max = (n['max'] as num?)?.toDouble() ?? 100;
    final value = (_localState[id] as double?) ??
        (n['value'] as num?)?.toDouble() ??
        min;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (label.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(bottom: 2),
            child: Text('$label: ${value.toStringAsFixed(0)}',
                style: Theme.of(context).textTheme.bodySmall),
          ),
        Slider(
          value: value.clamp(min, max),
          min: min,
          max: max,
          onChanged: (v) => setState(() => _localState[id] = v),
        ),
      ],
    );
  }

  Widget _buildRadio(BuildContext context, Map<String, dynamic> n) {
    final id = n['id'] as String? ?? '';
    final label = _resolve(n['label'] ?? n['text'] ?? '');
    final groupId = n['group'] as String? ?? id;
    final selected = _localState[groupId] as String? ?? '';
    return RadioGroup<String>(
      groupValue: selected,
      onChanged: (v) => setState(() => _localState[groupId] = v ?? ''),
      child: InkWell(
        onTap: () => setState(() => _localState[groupId] = id),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Radio<String>(value: id),
            Text(label),
          ],
        ),
      ),
    );
  }

  Widget _buildDropdown(BuildContext context, Map<String, dynamic> n) {
    final id = n['id'] as String? ?? '';
    final label = _resolve(n['label'] ?? '');
    final options = (n['options'] as List?)?.cast<String>() ?? [];
    final selected = _localState[id] as String? ??
        (n['value'] as String?) ??
        (options.isNotEmpty ? options.first : '');
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: DropdownButtonFormField<String>(
        initialValue: options.contains(selected) ? selected : null,
        decoration: InputDecoration(
          labelText: label.isNotEmpty ? label : null,
          border: const OutlineInputBorder(),
          isDense: true,
        ),
        items: options
            .map((o) => DropdownMenuItem(value: o, child: Text(o)))
            .toList(),
        onChanged: (v) => setState(() => _localState[id] = v ?? ''),
      ),
    );
  }

  Widget _buildTable(BuildContext context, Map<String, dynamic> n) {
    final headers = (n['headers'] as List?)?.cast<String>() ?? [];
    final rows = (n['rows'] as List?)
            ?.map((r) => (r as List).map((c) => _resolve(c)).toList())
            .toList() ??
        [];
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: DataTable(
        headingRowHeight: 36,
        dataRowMinHeight: 32,
        dataRowMaxHeight: 40,
        columns: headers
            .map((h) => DataColumn(
                label: Text(h,
                    style:
                        const TextStyle(fontWeight: FontWeight.w600))))
            .toList(),
        rows: rows
            .map((row) => DataRow(
                  cells: row.map((cell) => DataCell(Text(cell))).toList(),
                ))
            .toList(),
      ),
    );
  }

  Widget _buildWrap(BuildContext context, Map<String, dynamic> n) {
    final spacing = (n['spacing'] as num?)?.toDouble() ?? 8;
    return Wrap(
      spacing: spacing,
      runSpacing: spacing,
      children: _children(n['children'])
          .map((id) => _renderComponent(context, id))
          .toList(),
    );
  }

  Widget _buildCircularProgress(
      BuildContext context, Map<String, dynamic> n) {
    final value = (n['value'] as num?)?.toDouble();
    final label = _resolve(n['label'] ?? '');
    final size = (n['size'] as num?)?.toDouble() ?? 48;
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        SizedBox(
          width: size,
          height: size,
          child: value != null
              ? CircularProgressIndicator(
                  value: value.clamp(0.0, 1.0), strokeWidth: 4)
              : const CircularProgressIndicator(strokeWidth: 4),
        ),
        if (label.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Text(label,
                style: Theme.of(context).textTheme.bodySmall),
          ),
      ],
    );
  }

  Widget _buildTooltip(BuildContext context, Map<String, dynamic> n) {
    final message = _resolve(n['message'] ?? n['text'] ?? '');
    final ids = _children(n['children']);
    final child = ids.isNotEmpty
        ? _renderComponent(context, ids.first)
        : Text(_resolve(n['label'] ?? ''));
    return Tooltip(message: message, child: child);
  }

  Widget _buildContainer(BuildContext context, Map<String, dynamic> n) {
    final padding = (n['padding'] as num?)?.toDouble() ?? 0;
    final colorName = (n['color'] as String? ?? '').toLowerCase();
    final bgColor = switch (colorName) {
      'red' => Colors.red.withValues(alpha: 0.1),
      'green' => Colors.green.withValues(alpha: 0.1),
      'blue' => Colors.blue.withValues(alpha: 0.1),
      'orange' => Colors.orange.withValues(alpha: 0.1),
      'yellow' => Colors.amber.withValues(alpha: 0.1),
      'grey' || 'gray' => Colors.grey.withValues(alpha: 0.1),
      _ => null,
    };
    final borderRadius = (n['borderRadius'] as num?)?.toDouble() ?? 0;
    return Container(
      padding: EdgeInsets.all(padding),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius:
            borderRadius > 0 ? BorderRadius.circular(borderRadius) : null,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: _children(n['children'])
            .map((id) => _renderComponent(context, id))
            .toList(),
      ),
    );
  }

  Widget _buildAlert(BuildContext context, Map<String, dynamic> n) {
    final message = _resolve(n['message'] ?? n['text'] ?? '');
    final severity = (n['severity'] as String? ?? 'info').toLowerCase();
    final (icon, color) = switch (severity) {
      'error' => (Icons.error_rounded, Colors.red),
      'warning' => (Icons.warning_rounded, Colors.orange),
      'success' => (Icons.check_circle_rounded, Colors.green),
      _ => (Icons.info_rounded, Colors.blue),
    };
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(width: 8),
          Expanded(
              child: Text(message, style: TextStyle(color: color))),
        ],
      ),
    );
  }

  Widget _buildCodeBlock(BuildContext context, Map<String, dynamic> n) {
    final code = _resolve(n['code'] ?? n['text'] ?? '');
    final language = n['language'] as String? ?? '';
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (language.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(bottom: 4),
              child: Text(language,
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        color: Theme.of(context)
                            .colorScheme
                            .onSurfaceVariant,
                      )),
            ),
          SelectableText(
            code,
            style: const TextStyle(
                fontFamily: 'monospace', fontSize: 13),
          ),
        ],
      ),
    );
  }

  Widget _buildLink(BuildContext context, Map<String, dynamic> n) {
    final label = _resolve(n['label'] ?? n['text'] ?? '');
    final url = _resolve(n['url'] ?? n['href'] ?? '');
    return InkWell(
      onTap: () => ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(SnackBar(
          content: Text('Navigate: $url'),
          duration: const Duration(seconds: 1),
        )),
      child: Text(
        label.isNotEmpty ? label : url,
        style: TextStyle(
          color: Theme.of(context).colorScheme.primary,
          decoration: TextDecoration.underline,
        ),
      ),
    );
  }

  IconData _iconFor(String name) => switch (name.toLowerCase()) {
        'home' => Icons.home_rounded,
        'search' => Icons.search_rounded,
        'settings' => Icons.settings_rounded,
        'person' => Icons.person_rounded,
        'check' => Icons.check_rounded,
        'close' => Icons.close_rounded,
        'add' => Icons.add_rounded,
        'edit' => Icons.edit_rounded,
        'delete' => Icons.delete_rounded,
        'info' => Icons.info_rounded,
        'warning' => Icons.warning_rounded,
        'error' => Icons.error_rounded,
        _ => Icons.widgets_rounded,
      };
}

class _A2UIError extends StatelessWidget {
  const _A2UIError({required this.message});
  final String message;

  @override
  Widget build(BuildContext context) => Padding(
        padding: kP8,
        child: Text(
          message,
          style: TextStyle(
              color: Theme.of(context).colorScheme.error),
        ),
      );
}
