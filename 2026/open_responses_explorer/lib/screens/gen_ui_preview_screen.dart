import 'dart:async';
import 'dart:convert';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../domain/gen_ui_component_registry.dart';
import '../domain/gen_ui_models.dart';
import '../domain/gen_ui_samples.dart';

const Color _previewAccent = Color(0xFF2563EB);
const Color _successGreen = Color(0xFF16A34A);
const Color _warningAmber = Color(0xFFD97706);
const Color _phoneBezelColor = Color(0xFF1C1C1E);
const Color _lightModeBackground = Color(0xFFF8FAFC);

class GenUIPreviewScreen extends StatefulWidget {
  const GenUIPreviewScreen({
    super.key,
    required this.descriptor,
    required this.rawDescriptorJson,
  });

  final GenUIDescriptor descriptor;
  final Map<String, dynamic> rawDescriptorJson;

  factory GenUIPreviewScreen.fromRawJson({
    Key? key,
    required Map<String, dynamic> rawDescriptorJson,
  }) {
    return GenUIPreviewScreen(
      key: key,
      descriptor: GenUIDescriptor.fromJson(rawDescriptorJson),
      rawDescriptorJson: rawDescriptorJson,
    );
  }

  static Map<String, dynamic> defaultRouteDescriptorJson() {
    final decoded = jsonDecode(weatherDashboardGenUiDescriptor);
    if (decoded is! Map) {
      return <String, dynamic>{};
    }

    return decoded.map(
      (dynamic key, dynamic value) => MapEntry(key.toString(), value),
    );
  }

  @override
  State<GenUIPreviewScreen> createState() => _GenUIPreviewScreenState();
}

class _GenUIPreviewScreenState extends State<GenUIPreviewScreen> {
  final GenUIComponentRegistry _registry = GenUIComponentRegistry();
  final ScrollController _descriptorScrollController = ScrollController();

  bool _splitMode = false;
  bool _phoneFrameMode = false;
  bool _fullscreen = false;
  double _previewOpacity = 1;

  String? _selectedComponentKey;

  final Map<String, GlobalKey> _descriptorSectionKeys = <String, GlobalKey>{};

  @override
  void dispose() {
    _descriptorScrollController.dispose();
    super.dispose();
  }

  Future<void> _refreshPreview() async {
    setState(() {
      _previewOpacity = 0;
    });

    await Future<void>.delayed(const Duration(milliseconds: 140));

    if (!mounted) {
      return;
    }

    setState(() {
      _previewOpacity = 1;
      _selectedComponentKey = null;
    });
  }

  Future<void> _copyToClipboard(String text, {String message = 'Copied'}) async {
    await Clipboard.setData(ClipboardData(text: text));

    if (!mounted) {
      return;
    }

    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(message),
          duration: const Duration(milliseconds: 1000),
          behavior: SnackBarBehavior.floating,
        ),
      );
  }

  Future<void> _showShareSheet() async {
    await showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (BuildContext context) {
        return SafeArea(
          top: false,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              ListTile(
                leading: const Icon(Icons.copy_rounded),
                title: const Text('Copy descriptor JSON'),
                onTap: () {
                  Navigator.of(context).pop();
                  _copyToClipboard(
                    const JsonEncoder.withIndent('  ').convert(widget.rawDescriptorJson),
                    message: 'Descriptor JSON copied',
                  );
                },
              ),
              ListTile(
                leading: const Icon(Icons.code_rounded),
                title: const Text('Copy as Dart code'),
                onTap: () {
                  Navigator.of(context).pop();
                  final pretty = const JsonEncoder.withIndent('  ').convert(widget.rawDescriptorJson);
                  final escaped = pretty.replaceAll("'''", "\\'\\'\\'");
                  final snippet = """
import 'dart:convert';

import 'package:open_responses_explorer/domain/gen_ui_models.dart';

const String descriptorJson = r'''
$escaped
''';

final GenUIDescriptor descriptor = GenUIDescriptor.fromJsonString(descriptorJson);
""";
                  _copyToClipboard(snippet, message: 'Dart snippet copied');
                },
              ),
              const SizedBox(height: 8),
            ],
          ),
        );
      },
    );
  }

  Future<void> _showComponentMenu({
    required LongPressStartDetails details,
    required GenUIComponent component,
  }) async {
    final selection = await showMenu<String>(
      context: context,
      position: RelativeRect.fromLTRB(
        details.globalPosition.dx,
        details.globalPosition.dy,
        details.globalPosition.dx,
        details.globalPosition.dy,
      ),
      items: const <PopupMenuEntry<String>>[
        PopupMenuItem<String>(value: 'inspect', child: Text('Inspect')),
        PopupMenuItem<String>(value: 'copy', child: Text('Copy JSON')),
      ],
    );

    if (!mounted || selection == null) {
      return;
    }

    if (selection == 'inspect') {
      _showInspectSheet(component);
      return;
    }

    if (selection == 'copy') {
      _copyToClipboard(
        const JsonEncoder.withIndent('  ').convert(component.toJson()),
        message: 'Component JSON copied',
      );
    }
  }

  Future<void> _showInspectSheet(GenUIComponent component) async {
    final json = component.toJson();
    final entries = json.entries.toList(growable: false);

    await showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      builder: (BuildContext context) {
        final theme = Theme.of(context);
        return Padding(
          padding: EdgeInsets.fromLTRB(
            16,
            4,
            16,
            16 + MediaQuery.viewInsetsOf(context).bottom,
          ),
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Row(
                  children: <Widget>[
                    Expanded(
                      child: Text(
                        component.type,
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    IconButton(
                      onPressed: () => _copyToClipboard(
                        const JsonEncoder.withIndent('  ').convert(json),
                        message: 'Component JSON copied',
                      ),
                      tooltip: 'Copy',
                      icon: const Icon(Icons.copy_rounded),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  component.id,
                  style: theme.textTheme.bodySmall?.copyWith(
                    fontFamily: 'monospace',
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: 14),
                Text(
                  'Properties',
                  style: theme.textTheme.labelLarge?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 8),
                Container(
                  width: double.infinity,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: theme.colorScheme.outlineVariant),
                  ),
                  child: Table(
                    border: TableBorder.symmetric(
                      inside: BorderSide(color: theme.colorScheme.outlineVariant),
                    ),
                    columnWidths: const <int, TableColumnWidth>{
                      0: FlexColumnWidth(1),
                      1: FlexColumnWidth(2),
                    },
                    children: entries
                        .map(
                          (MapEntry<String, dynamic> entry) => TableRow(
                            children: <Widget>[
                              Padding(
                                padding: const EdgeInsets.all(10),
                                child: Text(
                                  entry.key,
                                  style: theme.textTheme.labelMedium?.copyWith(
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ),
                              Padding(
                                padding: const EdgeInsets.all(10),
                                child: Text(
                                  _propertyValue(entry.value),
                                  style: theme.textTheme.bodySmall,
                                ),
                              ),
                            ],
                          ),
                        )
                        .toList(growable: false),
                  ),
                ),
                const SizedBox(height: 14),
                Text(
                  'Raw JSON',
                  style: theme.textTheme.labelLarge?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 8),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(10),
                    color: theme.colorScheme.surfaceContainerHighest,
                  ),
                  child: SelectableText(
                    const JsonEncoder.withIndent('  ').convert(json),
                    style: theme.textTheme.bodySmall?.copyWith(
                      fontFamily: 'monospace',
                      height: 1.4,
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  String _propertyValue(dynamic value) {
    if (value == null) {
      return 'null';
    }
    if (value is String || value is num || value is bool) {
      return value.toString();
    }
    return const JsonEncoder.withIndent('  ').convert(value);
  }

  void _handleComponentTap(String key) {
    setState(() {
      _selectedComponentKey = key;
    });

    if (_splitMode) {
      _scrollToDescriptorSection(key);
    }
  }

  void _scrollToDescriptorSection(String key) {
    final targetKey = _descriptorSectionKeys[key];
    final context = targetKey?.currentContext;
    if (context == null) {
      return;
    }

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) {
        return;
      }
      Scrollable.ensureVisible(
        context,
        alignment: 0.15,
        duration: const Duration(milliseconds: 260),
        curve: Curves.easeOutCubic,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final renderedEntries = _buildRenderedEntries();
    final successfulCount = renderedEntries
        .where((entry) => entry.successful)
        .length;
    final totalCount = renderedEntries.length;

    final content = _buildMainContent(theme, renderedEntries);

    if (_fullscreen) {
      return Scaffold(
        backgroundColor: theme.brightness == Brightness.light
            ? _lightModeBackground
            : theme.colorScheme.surface,
        body: SafeArea(
          child: Stack(
            children: <Widget>[
              Positioned.fill(child: content),
              Positioned(
                right: 14,
                bottom: 14,
                child: FilledButton.icon(
                  onPressed: () => setState(() => _fullscreen = false),
                  icon: const Icon(Icons.fullscreen_exit_rounded),
                  label: const Text('Exit fullscreen'),
                ),
              ),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: theme.brightness == Brightness.light
          ? _lightModeBackground
          : theme.colorScheme.surface,
      appBar: AppBar(
        title: const Text('GenUI Preview'),
        actions: <Widget>[
          IconButton(
            onPressed: () => setState(() => _splitMode = !_splitMode),
            tooltip: _splitMode ? 'Preview only' : 'Split view',
            icon: Icon(
              _splitMode ? Icons.close_fullscreen_rounded : Icons.view_sidebar_rounded,
            ),
          ),
          IconButton(
            onPressed: () => setState(() => _phoneFrameMode = !_phoneFrameMode),
            tooltip: _phoneFrameMode ? 'Disable phone frame' : 'Enable phone frame',
            icon: Icon(
              _phoneFrameMode ? Icons.smartphone_rounded : Icons.phone_android_rounded,
            ),
          ),
          const SizedBox(width: 6),
        ],
      ),
      body: SafeArea(
        top: false,
        child: Column(
          children: <Widget>[
            _buildAgentInfoBar(theme, totalCount),
            Expanded(child: content),
            _buildBottomToolbar(theme, successfulCount, totalCount),
          ],
        ),
      ),
    );
  }

  Widget _buildAgentInfoBar(ThemeData theme, int componentCount) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        border: Border(
          bottom: BorderSide(color: theme.colorScheme.outlineVariant),
        ),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      child: Row(
        children: <Widget>[
          Expanded(
            child: Row(
              children: <Widget>[
                Text(
                  widget.descriptor.agent,
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  decoration: BoxDecoration(
                    color: theme.colorScheme.surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(999),
                    border: Border.all(color: theme.colorScheme.outlineVariant),
                  ),
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  child: Text(
                    widget.descriptor.version,
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ],
            ),
          ),
          Text(
            '$componentCount components',
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
          IconButton(
            onPressed: _refreshPreview,
            tooltip: 'Refresh preview',
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
    );
  }

  Widget _buildBottomToolbar(ThemeData theme, int successfulCount, int totalCount) {
    final allSuccessful = successfulCount == totalCount;

    return SafeArea(
      top: false,
      child: Material(
        elevation: 12,
        color: theme.colorScheme.surface,
        child: Container(
          padding: const EdgeInsets.fromLTRB(14, 10, 14, 10),
          child: Row(
            children: <Widget>[
              Expanded(
                child: Text(
                  '$successfulCount / $totalCount rendered',
                  style: theme.textTheme.labelLarge?.copyWith(
                    color: allSuccessful ? _successGreen : _warningAmber,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              IconButton(
                onPressed: _showShareSheet,
                tooltip: 'Share',
                icon: const Icon(Icons.share_rounded),
              ),
              const Spacer(),
              IconButton(
                onPressed: () => setState(() => _fullscreen = true),
                tooltip: 'Fullscreen',
                icon: const Icon(Icons.fullscreen_rounded),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMainContent(ThemeData theme, List<_RenderedComponentEntry> renderedEntries) {
    if (_splitMode) {
      return AnimatedOpacity(
        opacity: _previewOpacity,
        duration: const Duration(milliseconds: 180),
        child: Row(
          children: <Widget>[
            Expanded(
              flex: 55,
              child: _buildPreviewPane(theme, renderedEntries, showLabel: true),
            ),
            VerticalDivider(width: 1, color: theme.colorScheme.outlineVariant),
            Expanded(
              flex: 45,
              child: _buildDescriptorPane(theme, renderedEntries),
            ),
          ],
        ),
      );
    }

    return AnimatedOpacity(
      opacity: _previewOpacity,
      duration: const Duration(milliseconds: 180),
      child: _buildPreviewPane(theme, renderedEntries, showLabel: false),
    );
  }

  Widget _buildPreviewPane(
    ThemeData theme,
    List<_RenderedComponentEntry> renderedEntries, {
    required bool showLabel,
  }) {
    final panel = Container(
      color: theme.brightness == Brightness.light
          ? Colors.white
          : theme.colorScheme.surface,
      child: Stack(
        children: <Widget>[
          Positioned.fill(
            child: _phoneFrameMode
                ? _buildPhoneFrame(theme, renderedEntries)
                : _buildPreviewScrollableContent(theme, renderedEntries),
          ),
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: IgnorePointer(
              child: Container(
                height: 18,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: <Color>[
                      Colors.black.withValues(alpha: 0.08),
                      Colors.transparent,
                    ],
                  ),
                ),
              ),
            ),
          ),
          if (showLabel)
            Positioned(
              left: 12,
              top: 10,
              child: Text(
                'Preview',
                style: theme.textTheme.labelSmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
            ),
          Positioned(
            right: 10,
            bottom: 10,
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: theme.colorScheme.surface.withValues(alpha: 0.72),
                borderRadius: BorderRadius.circular(999),
                border: Border.all(color: theme.colorScheme.outlineVariant),
              ),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: <Widget>[
                    Container(
                      width: 7,
                      height: 7,
                      decoration: const BoxDecoration(
                        color: _successGreen,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      'Live Preview',
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                        fontSize: 10,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );

    if (_splitMode) {
      return panel;
    }

    return Padding(
      padding: const EdgeInsets.all(10),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: panel,
      ),
    );
  }

  Widget _buildPreviewScrollableContent(
    ThemeData theme,
    List<_RenderedComponentEntry> renderedEntries,
  ) {
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(14, 14, 14, 20),
      child: _GenUIPreviewPanel(
        descriptor: widget.descriptor,
        renderedEntries: renderedEntries,
        selectedComponentKey: _selectedComponentKey,
      ),
    );
  }

  Widget _buildPhoneFrame(
    ThemeData theme,
    List<_RenderedComponentEntry> renderedEntries,
  ) {
    return LayoutBuilder(
      builder: (BuildContext context, BoxConstraints constraints) {
        final width = math.min(constraints.maxWidth * 0.94, 430.0);
        final height = math.min(constraints.maxHeight * 0.95, 860.0);

        return Center(
          child: Container(
            width: width,
            height: height,
            decoration: BoxDecoration(
              color: _phoneBezelColor,
              borderRadius: BorderRadius.circular(40),
              boxShadow: <BoxShadow>[
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.22),
                  blurRadius: 24,
                  offset: const Offset(0, 10),
                ),
              ],
            ),
            padding: const EdgeInsets.fromLTRB(8, 16, 8, 14),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(32),
              child: Stack(
                children: <Widget>[
                  Container(
                    color: theme.brightness == Brightness.light
                        ? Colors.white
                        : theme.colorScheme.surface,
                  ),
                  Positioned.fill(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(0, 18, 0, 22),
                      child: _buildPreviewScrollableContent(theme, renderedEntries),
                    ),
                  ),
                  Positioned(
                    top: 6,
                    left: 0,
                    right: 0,
                    child: Center(
                      child: Container(
                        width: 120,
                        height: 6,
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.34),
                          borderRadius: BorderRadius.circular(999),
                        ),
                      ),
                    ),
                  ),
                  Positioned(
                    left: 0,
                    right: 0,
                    bottom: 6,
                    child: Center(
                      child: Container(
                        width: 128,
                        height: 5,
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.24),
                          borderRadius: BorderRadius.circular(999),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildDescriptorPane(ThemeData theme, List<_RenderedComponentEntry> renderedEntries) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 10, 12, 8),
          child: Text(
            'Descriptor',
            style: theme.textTheme.labelSmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
        ),
        Expanded(
          child: ListView(
            controller: _descriptorScrollController,
            padding: const EdgeInsets.fromLTRB(12, 0, 12, 14),
            children: <Widget>[
              _buildDescriptorHeaderBlock(theme),
              const SizedBox(height: 10),
              for (int index = 0; index < renderedEntries.length; index++) ...<Widget>[
                _buildDescriptorComponentBlock(theme, renderedEntries[index], index),
                if (index != renderedEntries.length - 1) const SizedBox(height: 10),
              ],
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildDescriptorHeaderBlock(ThemeData theme) {
    final headerJson = <String, dynamic>{
      'type': widget.descriptor.type,
      'version': widget.descriptor.version,
      'agent': widget.descriptor.agent,
      'title': widget.descriptor.title,
      'description': widget.descriptor.description,
    };

    final source = const JsonEncoder.withIndent('  ').convert(headerJson);

    return _JsonSurface(
      title: 'screen',
      child: SelectableText.rich(
        TextSpan(children: _jsonSyntaxSpans(source, theme)),
        style: theme.textTheme.bodySmall?.copyWith(
          fontFamily: 'monospace',
          fontSize: 12,
          height: 1.45,
        ),
      ),
    );
  }

  Widget _buildDescriptorComponentBlock(
    ThemeData theme,
    _RenderedComponentEntry entry,
    int index,
  ) {
    _descriptorSectionKeys.putIfAbsent(entry.key, () => GlobalKey());
    final selected = _selectedComponentKey == entry.key;
    final source = const JsonEncoder.withIndent('  ').convert(entry.component.toJson());

    return AnimatedContainer(
      key: _descriptorSectionKeys[entry.key],
      duration: const Duration(milliseconds: 180),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: selected ? _previewAccent : theme.colorScheme.outlineVariant,
          width: selected ? 1.5 : 1,
        ),
        color: selected
            ? _previewAccent.withValues(alpha: 0.1)
            : theme.colorScheme.surface,
      ),
      padding: const EdgeInsets.all(10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Text(
            'components[$index] - ${entry.component.type} (${entry.component.id})',
            style: theme.textTheme.labelSmall?.copyWith(
              color: selected
                  ? _previewAccent
                  : theme.colorScheme.onSurfaceVariant,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 6),
          SelectableText.rich(
            TextSpan(children: _jsonSyntaxSpans(source, theme)),
            style: theme.textTheme.bodySmall?.copyWith(
              fontFamily: 'monospace',
              fontSize: 12,
              height: 1.45,
            ),
          ),
        ],
      ),
    );
  }

  List<_RenderedComponentEntry> _buildRenderedEntries() {
    final entries = <_RenderedComponentEntry>[];

    for (int i = 0; i < widget.descriptor.components.length; i++) {
      final component = widget.descriptor.components[i];
      final key = _topLevelKey(component, i);
      final successful = _registry.supports(component.type);

      Widget built;
      try {
        built = _buildInteractiveComponent(
          component: component,
          keyPath: key,
          isTopLevel: true,
        );
      } catch (_) {
        built = _buildFallbackComponent(component, key, isTopLevel: true);
      }

      entries.add(
        _RenderedComponentEntry(
          key: key,
          component: component,
          widget: built,
          successful: successful,
        ),
      );
    }

    return entries;
  }

  Widget _buildInteractiveComponent({
    required GenUIComponent component,
    required String keyPath,
    required bool isTopLevel,
  }) {
    final rawChild = _registry.build(
      context: context,
      component: component,
      childBuilder: (GenUIComponent child) {
        final childKey = '$keyPath/${child.id}_${identityHashCode(child)}';
        return _buildInteractiveComponent(
          component: child,
          keyPath: childKey,
          isTopLevel: false,
        );
      },
    );

    final selected = _selectedComponentKey == keyPath;

    return GestureDetector(
      behavior: HitTestBehavior.translucent,
      onTap: () {
        if (_splitMode) {
          _handleComponentTap(keyPath);
        }
      },
      onLongPressStart: (LongPressStartDetails details) {
        _showComponentMenu(details: details, component: component);
      },
      child: Stack(
        clipBehavior: Clip.none,
        children: <Widget>[
          AnimatedContainer(
            duration: const Duration(milliseconds: 160),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(10),
              border: Border.all(
                color: selected ? _previewAccent : Colors.transparent,
                width: 2,
              ),
            ),
            padding: const EdgeInsets.all(2),
            child: rawChild,
          ),
          if (selected)
            Positioned(
              top: -24,
              left: 8,
              child: DecoratedBox(
                decoration: BoxDecoration(
                  color: _previewAccent,
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  child: Text(
                    '${component.type} - ${component.id}',
                    style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      color: Colors.white,
                      fontSize: 10,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildFallbackComponent(
    GenUIComponent component,
    String keyPath, {
    required bool isTopLevel,
  }) {
    return _buildInteractiveComponent(
      component: UnknownComponent(id: component.id, raw: component.toJson()),
      keyPath: keyPath,
      isTopLevel: isTopLevel,
    );
  }

  String _topLevelKey(GenUIComponent component, int index) {
    if (component.id.trim().isNotEmpty) {
      return component.id.trim();
    }
    return 'component_$index';
  }
}

class _GenUIPreviewPanel extends StatelessWidget {
  const _GenUIPreviewPanel({
    required this.descriptor,
    required this.renderedEntries,
    required this.selectedComponentKey,
  });

  final GenUIDescriptor descriptor;
  final List<_RenderedComponentEntry> renderedEntries;
  final String? selectedComponentKey;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final hasHeader = descriptor.title.trim().isNotEmpty ||
        descriptor.description.trim().isNotEmpty;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        if (hasHeader) ...<Widget>[
          if (descriptor.title.trim().isNotEmpty)
            Text(
              descriptor.title,
              style: theme.textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
          if (descriptor.description.trim().isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Text(
                descriptor.description,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
            ),
          const SizedBox(height: 10),
          Divider(color: theme.colorScheme.outlineVariant),
          const SizedBox(height: 10),
        ],
        for (int i = 0; i < renderedEntries.length; i++) ...<Widget>[
          renderedEntries[i].widget,
          if (i != renderedEntries.length - 1) const SizedBox(height: 12),
        ],
      ],
    );
  }
}

class _JsonSurface extends StatelessWidget {
  const _JsonSurface({required this.title, required this.child});

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: theme.colorScheme.outlineVariant),
      ),
      padding: const EdgeInsets.all(10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Text(
            title,
            style: theme.textTheme.labelSmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 6),
          child,
        ],
      ),
    );
  }
}

class _RenderedComponentEntry {
  const _RenderedComponentEntry({
    required this.key,
    required this.component,
    required this.widget,
    required this.successful,
  });

  final String key;
  final GenUIComponent component;
  final Widget widget;
  final bool successful;
}

List<TextSpan> _jsonSyntaxSpans(String source, ThemeData theme) {
  final spans = <TextSpan>[];
  final keyColor = theme.colorScheme.onSurface;
  final bracketColor = theme.colorScheme.onSurfaceVariant;
  const stringValueColor = Color(0xFF16A34A);
  const numberColor = Color(0xFFD97706);
  const boolColor = Color(0xFF2563EB);
  const nullColor = Color(0xFFDC2626);

  int index = 0;
  while (index < source.length) {
    final current = source[index];

    if (current == '"') {
      final start = index;
      index++;
      var escaped = false;

      while (index < source.length) {
        final char = source[index];
        if (escaped) {
          escaped = false;
          index++;
          continue;
        }
        if (char == r'\') {
          escaped = true;
          index++;
          continue;
        }
        if (char == '"') {
          index++;
          break;
        }
        index++;
      }

      final token = source.substring(start, index);
      var lookAhead = index;
      while (lookAhead < source.length && _isWhitespace(source[lookAhead])) {
        lookAhead++;
      }
      final isKey = lookAhead < source.length && source[lookAhead] == ':';

      spans.add(
        TextSpan(
          text: token,
          style: TextStyle(color: isKey ? keyColor : stringValueColor),
        ),
      );
      continue;
    }

    if (source.startsWith('true', index)) {
      spans.add(const TextSpan(text: 'true', style: TextStyle(color: boolColor)));
      index += 4;
      continue;
    }

    if (source.startsWith('false', index)) {
      spans.add(const TextSpan(text: 'false', style: TextStyle(color: boolColor)));
      index += 5;
      continue;
    }

    if (source.startsWith('null', index)) {
      spans.add(const TextSpan(text: 'null', style: TextStyle(color: nullColor)));
      index += 4;
      continue;
    }

    if (current == '-' || _isDigit(current)) {
      final start = index;
      index++;
      while (index < source.length) {
        final char = source[index];
        final isNumericChar =
            _isDigit(char) ||
            char == '.' ||
            char == 'e' ||
            char == 'E' ||
            char == '+' ||
            char == '-';
        if (!isNumericChar) {
          break;
        }
        index++;
      }

      spans.add(
        TextSpan(
          text: source.substring(start, index),
          style: const TextStyle(color: numberColor),
        ),
      );
      continue;
    }

    if ('{}[]'.contains(current) || ':,'.contains(current)) {
      spans.add(TextSpan(text: current, style: TextStyle(color: bracketColor)));
      index++;
      continue;
    }

    spans.add(TextSpan(text: current));
    index++;
  }

  return spans;
}

bool _isWhitespace(String value) {
  return value == ' ' || value == '\n' || value == '\r' || value == '\t';
}

bool _isDigit(String value) {
  final code = value.codeUnitAt(0);
  return code >= 48 && code <= 57;
}
