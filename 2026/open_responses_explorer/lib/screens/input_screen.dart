import 'dart:async';
import 'dart:convert';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';

import '../domain/gen_ui_models.dart';
import '../domain/gen_ui_samples.dart';
import '../domain/open_response_parser.dart';
import '../domain/response_models.dart';
import 'gen_ui_preview_screen.dart';
import 'response_explorer_screen.dart';
import 'streaming_simulator_screen.dart';

const Color _reasoningAccent = Color(0xFF7C3AED);
const Color _functionAccent = Color(0xFF2563EB);
const Color _outputAccent = Color(0xFF16A34A);
const Color _messageAccent = Color(0xFF6B7280);
const Color _unknownAccent = Color(0xFFD97706);
const Color _lightModeBackground = Color(0xFFF8FAFC);

const String _warningBannerText =
    'This does not look like an Open Responses payload. '
    'We will open it in generic inspection mode.';

const String _sampleSimpleMessagePayload = '''
{
  "id": "resp_simple_001",
  "object": "response",
  "status": "completed",
  "model": "gpt-4o",
  "output": [
    {
      "type": "message",
      "role": "assistant",
      "content": [
        {
          "type": "text",
          "text": "The capital of France is Paris."
        }
      ]
    }
  ]
}
''';

const String _sampleWeatherToolCallPayload = '''
{
  "id": "resp_weather_001",
  "object": "response",
  "status": "completed",
  "model": "gpt-4o",
  "output": [
    {
      "type": "reasoning",
      "id": "rs_001",
      "summary": [
        {
          "type": "summary_text",
          "text": "The user wants weather info for Tokyo. I will call the weather tool."
        }
      ]
    },
    {
      "type": "function_call",
      "id": "fc_001",
      "call_id": "call_weather_tokyo",
      "name": "get_current_weather",
      "arguments": "{\\"city\\": \\"Tokyo\\", \\"units\\": \\"celsius\\"}"
    },
    {
      "type": "function_call_output",
      "call_id": "call_weather_tokyo",
      "output": "{\\"temperature\\": 22, \\"condition\\": \\"Partly cloudy\\", \\"humidity\\": 65}"
    },
    {
      "type": "message",
      "role": "assistant",
      "content": [
        {
          "type": "text",
          "text": "Tokyo is currently 22 degrees Celsius with partly cloudy skies and 65% humidity."
        }
      ]
    }
  ]
}
''';

const String _sampleMultiToolPayload = '''
{
  "id": "resp_multi_001",
  "object": "response",
  "status": "completed",
  "model": "gpt-4o",
  "output": [
    {
      "type": "reasoning",
      "id": "rs_001",
      "summary": [
        {
          "type": "summary_text",
          "text": "The user wants to compare weather in Tokyo and London. I will call the weather tool for each city."
        }
      ]
    },
    {
      "type": "function_call",
      "id": "fc_001",
      "call_id": "call_weather_tokyo",
      "name": "get_current_weather",
      "arguments": "{\\"city\\": \\"Tokyo\\", \\"units\\": \\"celsius\\"}"
    },
    {
      "type": "function_call",
      "id": "fc_002",
      "call_id": "call_weather_london",
      "name": "get_current_weather",
      "arguments": "{\\"city\\": \\"London\\", \\"units\\": \\"celsius\\"}"
    },
    {
      "type": "function_call_output",
      "call_id": "call_weather_tokyo",
      "output": "{\\"temperature\\": 22, \\"condition\\": \\"Partly cloudy\\", \\"humidity\\": 65}"
    },
    {
      "type": "function_call_output",
      "call_id": "call_weather_london",
      "output": "{\\"temperature\\": 14, \\"condition\\": \\"Overcast\\", \\"humidity\\": 78}"
    },
    {
      "type": "message",
      "role": "assistant",
      "content": [
        {
          "type": "text",
          "text": "Tokyo is 22C and partly cloudy. London is 14C and overcast. Tokyo is significantly warmer today."
        }
      ]
    }
  ]
}
''';

const List<_SamplePayloadDefinition>
_samplePayloads = <_SamplePayloadDefinition>[
  _SamplePayloadDefinition(
    id: 'simple_message',
    title: 'Simple Message Response',
    description: 'A basic assistant message with no tool calls',
    icon: Icons.chat_bubble_outline_rounded,
    iconColor: _messageAccent,
    tags: <_SampleTag>[_SampleTag(label: 'message', color: _messageAccent)],
    payload: _sampleSimpleMessagePayload,
  ),
  _SamplePayloadDefinition(
    id: 'weather_tool',
    title: 'Weather Tool Call',
    description:
        'A function call to get weather with correlated output and reasoning trace',
    icon: Icons.build_circle_outlined,
    iconColor: _functionAccent,
    tags: <_SampleTag>[
      _SampleTag(label: 'function_call', color: _functionAccent),
      _SampleTag(label: 'reasoning', color: _reasoningAccent),
    ],
    payload: _sampleWeatherToolCallPayload,
  ),
  _SamplePayloadDefinition(
    id: 'multi_tool',
    title: 'Multi Tool Response',
    description:
        'Two parallel weather tool calls for Tokyo and London with full correlation and a final summary message',
    icon: Icons.layers_outlined,
    iconColor: _functionAccent,
    tags: <_SampleTag>[
      _SampleTag(label: 'function_call', color: _functionAccent),
      _SampleTag(label: 'function_call', color: _functionAccent),
      _SampleTag(label: 'reasoning', color: _reasoningAccent),
      _SampleTag(label: 'message', color: _messageAccent),
    ],
    payload: _sampleMultiToolPayload,
  ),
];

enum _InputMode { pasteJson, loadSample, streaming, genUiPreview }

enum _ParseButtonState { idle, loading, success, error }

class InputScreen extends StatefulWidget {
  const InputScreen({
    super.key,
    required this.themeMode,
    required this.onToggleTheme,
  });

  final ThemeMode themeMode;
  final VoidCallback onToggleTheme;

  @override
  State<InputScreen> createState() => _InputScreenState();
}

class _InputScreenState extends State<InputScreen>
    with SingleTickerProviderStateMixin {
  static bool _welcomeTooltipAlreadyShown = false;
  static const double _minPasteEditorHeight = 260;
  static const double _pasteResizeHandleSize = 24;

  final TextEditingController _jsonController = TextEditingController();
  final FocusNode _jsonFocusNode = FocusNode();
  final TextEditingController _genUiController = TextEditingController();
  final FocusNode _genUiFocusNode = FocusNode();

  late final AnimationController _shakeController;
  Timer? _errorFadeTimer;

  _InputMode _mode = _InputMode.pasteJson;
  _ParseButtonState _buttonState = _ParseButtonState.idle;
  _SamplePayloadDefinition? _selectedSample;
  GenUISampleDescriptor? _selectedGenUiSample;

  bool _showPreviewPanel = false;
  bool _showWelcomeTooltip = false;
  bool _textFieldHasError = false;
  double _pasteEditorHeight = 420;

  String? _errorMessage;
  String? _warningMessage;

  bool get _isBusy => _buttonState != _ParseButtonState.idle;

  @override
  void initState() {
    super.initState();
    _shakeController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 420),
    );

    _jsonController.addListener(_handleTextChanged);
    _jsonFocusNode.addListener(_handleTextChanged);
    _genUiController.addListener(_handleTextChanged);
    _genUiFocusNode.addListener(_handleTextChanged);

    if (!_welcomeTooltipAlreadyShown) {
      _showWelcomeTooltip = true;
      _welcomeTooltipAlreadyShown = true;
    }
  }

  @override
  void dispose() {
    _errorFadeTimer?.cancel();
    _shakeController.dispose();
    _jsonController
      ..removeListener(_handleTextChanged)
      ..dispose();
    _jsonFocusNode
      ..removeListener(_handleTextChanged)
      ..dispose();
    _genUiController
      ..removeListener(_handleTextChanged)
      ..dispose();
    _genUiFocusNode
      ..removeListener(_handleTextChanged)
      ..dispose();
    super.dispose();
  }

  void _handleTextChanged() {
    if (!mounted) {
      return;
    }

    final hasText = _mode == _InputMode.genUiPreview
        ? _genUiController.text.trim().isNotEmpty
        : _jsonController.text.trim().isNotEmpty;
    if (_textFieldHasError && hasText) {
      setState(() {
        _textFieldHasError = false;
      });
    }
  }

  Future<void> _pasteFromClipboard() async {
    final clipboardData = await Clipboard.getData(Clipboard.kTextPlain);
    final pastedText = clipboardData?.text;

    if (pastedText == null || pastedText.isEmpty) {
      return;
    }

    final target = _mode == _InputMode.genUiPreview
        ? _genUiController
        : _jsonController;

    target.text = pastedText;
    target.selection = TextSelection.collapsed(offset: target.text.length);

    if (!mounted) {
      return;
    }

    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        const SnackBar(
          content: Text('Pasted'),
          duration: Duration(milliseconds: 900),
          behavior: SnackBarBehavior.floating,
        ),
      );
  }

  void _clearInput() {
    if (_mode == _InputMode.genUiPreview) {
      _genUiController.clear();
    } else {
      _jsonController.clear();
    }
    setState(() {
      _warningMessage = null;
      _errorMessage = null;
      _textFieldHasError = false;
    });
  }

  void _setMode(_InputMode mode) {
    if (_mode == mode) {
      return;
    }

    setState(() {
      _mode = mode;
      _errorMessage = null;
      _warningMessage = null;
      _textFieldHasError = false;
      if (mode != _InputMode.loadSample) {
        _showPreviewPanel = false;
      }
      if (mode != _InputMode.genUiPreview) {
        _selectedGenUiSample = null;
      }
    });
  }

  void _selectSample(_SamplePayloadDefinition sample) {
    setState(() {
      _selectedSample = sample;
      _showPreviewPanel = true;
      _errorMessage = null;
    });
  }

  void _selectGenUiSample(GenUISampleDescriptor sample) {
    setState(() {
      _selectedGenUiSample = sample;
      _genUiController.text = sample.payload;
      _genUiController.selection = TextSelection.collapsed(
        offset: _genUiController.text.length,
      );
      _errorMessage = null;
      _textFieldHasError = false;
    });
  }

  void _dismissWelcomeTooltip() {
    setState(() {
      _showWelcomeTooltip = false;
    });
  }

  void _showInfoDialog() {
    showDialog<void>(
      context: context,
      builder: (BuildContext dialogContext) {
        final theme = Theme.of(dialogContext);
        return Dialog(
          insetPadding: const EdgeInsets.symmetric(
            horizontal: 140,
            vertical: 80,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 860, maxHeight: 700),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(24, 20, 24, 20),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Row(
                    children: <Widget>[
                      Text(
                        'About Open Responses Explorer',
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const Spacer(),
                      IconButton(
                        onPressed: () => Navigator.of(dialogContext).pop(),
                        icon: const Icon(Icons.close_rounded),
                        tooltip: 'Close',
                        constraints: const BoxConstraints.tightFor(
                          width: 30,
                          height: 30,
                        ),
                        visualDensity: VisualDensity.compact,
                        padding: EdgeInsets.zero,
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Open Responses Explorer is a Proof of Concept built for '
                    'GSoC 2026 with API Dash. It helps developers inspect and '
                    'debug OpenAI Responses API payloads with a clear visual flow '
                    'for parsed items, correlations, streaming behavior, and raw JSON.',
                    style: theme.textTheme.bodyMedium?.copyWith(height: 1.55),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'Why this was made',
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'The goal is to validate a practical response-inspection '
                    'experience for API Dash users: easier debugging, better '
                    'visibility into tool-call chains, and a replayable streaming '
                    'timeline that reflects real model output behavior.',
                    style: theme.textTheme.bodyMedium?.copyWith(height: 1.55),
                  ),
                  const SizedBox(height: 14),
                  Text(
                    'Project links',
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Flexible(
                    child: SingleChildScrollView(
                      child: Column(
                        children: <Widget>[
                          _buildAboutLinkTile(
                            theme,
                            title: 'GSoC Proposal PR',
                            url: 'https://github.com/foss42/apidash/pull/1608',
                          ),
                          _buildAboutLinkTile(
                            theme,
                            title: 'Old POC (testing)',
                            url: 'https://github.com/foss42/gsoc-poc/pull/29',
                          ),
                          _buildAboutLinkTile(
                            theme,
                            title: 'New Final POC',
                            url: 'https://github.com/foss42/gsoc-poc/pull/51',
                          ),
                          _buildAboutLinkTile(
                            theme,
                            title: 'GitHub: dhairyajangir',
                            url: 'https://github.com/dhairyajangir',
                          ),
                        ],
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

  Future<void> _openExternalUrl(String url) async {
    final uri = Uri.tryParse(url);
    final isWebScheme =
        uri != null &&
        (uri.scheme == 'https' || uri.scheme == 'http') &&
        uri.hasAuthority;

    if (!isWebScheme) {
      return;
    }

    final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);

    if (launched || !mounted) {
      return;
    }

    await Clipboard.setData(ClipboardData(text: url));
    if (!mounted) {
      return;
    }

    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        const SnackBar(
          content: Text('Could not open the link. URL copied to clipboard.'),
          duration: Duration(milliseconds: 1300),
          behavior: SnackBarBehavior.floating,
        ),
      );
  }

  Widget _buildAboutLinkTile(
    ThemeData theme, {
    required String title,
    required String url,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(10),
        color: theme.colorScheme.surfaceContainerHighest.withValues(
          alpha: 0.36,
        ),
        border: Border.all(color: theme.colorScheme.outlineVariant),
      ),
      child: Row(
        children: <Widget>[
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  title,
                  style: theme.textTheme.labelLarge?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 4),
                SelectableText(
                  url,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: _functionAccent,
                    height: 1.35,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          FilledButton.tonalIcon(
            onPressed: () => _openExternalUrl(url),
            icon: const Icon(Icons.open_in_new_rounded, size: 16),
            label: const Text('Open'),
            style: FilledButton.styleFrom(
              visualDensity: VisualDensity.compact,
              minimumSize: const Size(0, 34),
              padding: const EdgeInsets.symmetric(horizontal: 12),
            ),
          ),
        ],
      ),
    );
  }

  void _resizePasteEditor(double verticalDelta) {
    final maxHeight = math.max(340.0, MediaQuery.sizeOf(context).height * 0.78);

    setState(() {
      _pasteEditorHeight = (_pasteEditorHeight + verticalDelta).clamp(
        _minPasteEditorHeight,
        maxHeight,
      );
    });
  }

  Future<void> _handleParsePressed() async {
    if (_isBusy) {
      return;
    }

    if (_mode == _InputMode.streaming) {
      await Navigator.of(context).push(_buildStreamingRoute());
      return;
    }

    if (_mode == _InputMode.genUiPreview) {
      await _handleGenUiPreviewPressed();
      return;
    }

    _errorFadeTimer?.cancel();

    String source;

    if (_mode == _InputMode.pasteJson) {
      source = _jsonController.text.trim();

      if (source.isEmpty) {
        setState(() {
          _textFieldHasError = true;
          _errorMessage = 'Please paste a valid JSON payload';
          _warningMessage = null;
        });
        _shakeController.forward(from: 0);
        return;
      }
    } else {
      if (_selectedSample == null) {
        setState(() {
          _errorMessage = 'Please select a sample payload to continue.';
        });
        return;
      }
      source = _selectedSample!.payload;
    }

    setState(() {
      _buttonState = _ParseButtonState.loading;
      _errorMessage = null;
      _textFieldHasError = false;
    });

    final startedAt = DateTime.now();

    Map<String, dynamic> payload;

    try {
      final decoded = _decodeJsonLenient(source);
      payload = _normalizeRootPayload(decoded);
    } catch (_) {
      await _showButtonErrorAndSetMessage(
        startedAt,
        'Invalid JSON. Please check your payload and try again.',
        highlightField: _mode == _InputMode.pasteJson,
        transient: true,
      );
      return;
    }

    final looksLikeOpenResponses =
        OpenResponseParser.looksLikeOpenResponsesPayload(payload);

    setState(() {
      if (_mode == _InputMode.pasteJson && !looksLikeOpenResponses) {
        _warningMessage = _warningBannerText;
      } else {
        _warningMessage = null;
      }
    });

    ParsedResponse parsed;

    try {
      parsed = OpenResponseParser.parse(payload);
    } catch (_) {
      await _showButtonErrorAndSetMessage(
        startedAt,
        'Unable to parse this payload. Please verify the structure and try again.',
      );
      return;
    }

    await _ensureMinimumLoadingTime(startedAt);

    if (!mounted) {
      return;
    }

    setState(() {
      _buttonState = _ParseButtonState.success;
    });

    await Future<void>.delayed(const Duration(milliseconds: 300));

    if (!mounted) {
      return;
    }

    await Navigator.of(context).push(_buildExplorerRoute(parsed));

    if (!mounted) {
      return;
    }

    setState(() {
      _buttonState = _ParseButtonState.idle;
    });
  }

  Future<void> _handleGenUiPreviewPressed() async {
    if (_isBusy) {
      return;
    }

    _errorFadeTimer?.cancel();

    final source = _genUiController.text.trim().isNotEmpty
        ? _genUiController.text.trim()
        : _selectedGenUiSample?.payload ?? '';

    if (source.isEmpty) {
      setState(() {
        _textFieldHasError = true;
        _errorMessage = 'Please paste or load a GenUI descriptor JSON.';
      });
      return;
    }

    setState(() {
      _buttonState = _ParseButtonState.loading;
      _errorMessage = null;
      _textFieldHasError = false;
    });

    final startedAt = DateTime.now();

    Map<String, dynamic> descriptorJson;
    GenUIDescriptor descriptor;

    try {
      final decoded = jsonDecode(source);
      if (decoded is! Map) {
        throw const FormatException('Descriptor root must be an object.');
      }
      descriptorJson = _normalizeMap(decoded);
      descriptor = GenUIDescriptor.fromJson(descriptorJson);
    } catch (_) {
      await _showButtonErrorAndSetMessage(
        startedAt,
        'Invalid GenUI descriptor JSON. Please verify and try again.',
        highlightField: true,
      );
      return;
    }

    await _ensureMinimumLoadingTime(startedAt);

    if (!mounted) {
      return;
    }

    setState(() {
      _buttonState = _ParseButtonState.success;
    });

    await Future<void>.delayed(const Duration(milliseconds: 260));

    if (!mounted) {
      return;
    }

    await Navigator.of(
      context,
    ).push(_buildGenUiPreviewRoute(descriptor, descriptorJson));

    if (!mounted) {
      return;
    }

    setState(() {
      _buttonState = _ParseButtonState.idle;
    });
  }

  Future<void> _showButtonErrorAndSetMessage(
    DateTime startedAt,
    String message, {
    bool highlightField = false,
    bool transient = false,
  }) async {
    await _ensureMinimumLoadingTime(startedAt);

    if (!mounted) {
      return;
    }

    setState(() {
      _buttonState = _ParseButtonState.error;
    });

    await Future<void>.delayed(const Duration(milliseconds: 300));

    if (!mounted) {
      return;
    }

    setState(() {
      _buttonState = _ParseButtonState.idle;
      _errorMessage = message;
      _textFieldHasError = highlightField;
    });

    if (transient) {
      _errorFadeTimer = Timer(const Duration(seconds: 3), () {
        if (!mounted) {
          return;
        }
        setState(() {
          if (_errorMessage == message) {
            _errorMessage = null;
          }
        });
      });
    }
  }

  Future<void> _ensureMinimumLoadingTime(DateTime startedAt) async {
    final elapsed = DateTime.now().difference(startedAt);
    const minimum = Duration(milliseconds: 600);
    if (elapsed < minimum) {
      await Future<void>.delayed(minimum - elapsed);
    }
  }

  Route<void> _buildExplorerRoute(ParsedResponse response) {
    return PageRouteBuilder<void>(
      pageBuilder: (context, animation, secondaryAnimation) =>
          ResponseExplorerScreen(response: response),
      transitionDuration: const Duration(milliseconds: 360),
      reverseTransitionDuration: const Duration(milliseconds: 300),
      transitionsBuilder: (context, animation, secondaryAnimation, child) {
        final curved = CurvedAnimation(
          parent: animation,
          curve: Curves.easeOutCubic,
        );

        return SlideTransition(
          position: Tween<Offset>(
            begin: const Offset(0, 1),
            end: Offset.zero,
          ).animate(curved),
          child: child,
        );
      },
    );
  }

  Route<void> _buildStreamingRoute() {
    return PageRouteBuilder<void>(
      pageBuilder: (context, animation, secondaryAnimation) =>
          const StreamingSimulatorScreen(),
      transitionDuration: const Duration(milliseconds: 320),
      reverseTransitionDuration: const Duration(milliseconds: 260),
      transitionsBuilder: (context, animation, secondaryAnimation, child) {
        final curved = CurvedAnimation(
          parent: animation,
          curve: Curves.easeOutCubic,
        );

        return SlideTransition(
          position: Tween<Offset>(
            begin: const Offset(0, 1),
            end: Offset.zero,
          ).animate(curved),
          child: child,
        );
      },
    );
  }

  Route<void> _buildGenUiPreviewRoute(
    GenUIDescriptor descriptor,
    Map<String, dynamic> descriptorJson,
  ) {
    return PageRouteBuilder<void>(
      pageBuilder: (context, animation, secondaryAnimation) =>
          GenUIPreviewScreen(
            descriptor: descriptor,
            rawDescriptorJson: descriptorJson,
          ),
      transitionDuration: const Duration(milliseconds: 320),
      reverseTransitionDuration: const Duration(milliseconds: 260),
      transitionsBuilder: (context, animation, secondaryAnimation, child) {
        final curved = CurvedAnimation(
          parent: animation,
          curve: Curves.easeOutCubic,
        );

        return SlideTransition(
          position: Tween<Offset>(
            begin: const Offset(0, 1),
            end: Offset.zero,
          ).animate(curved),
          child: child,
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final keyboardInset = MediaQuery.viewInsetsOf(context).bottom;

    return Scaffold(
      resizeToAvoidBottomInset: false,
      backgroundColor: isDark
          ? theme.colorScheme.surface
          : _lightModeBackground,
      appBar: AppBar(
        automaticallyImplyLeading: false,
        titleSpacing: 16,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Text(
              'Open Responses Explorer',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w700,
                fontSize: 18,
              ),
            ),
            Text(
              'Proof of Concept by Dhairya for GSoC26 for API Dash',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
                fontSize: 12,
              ),
            ),
          ],
        ),
        actions: <Widget>[
          IconButton(
            onPressed: widget.onToggleTheme,
            tooltip: 'Toggle Theme',
            icon: Icon(
              widget.themeMode == ThemeMode.dark
                  ? Icons.light_mode_rounded
                  : Icons.dark_mode_rounded,
            ),
          ),
          IconButton(
            onPressed: _showInfoDialog,
            tooltip: 'About',
            icon: const Icon(Icons.info_outline_rounded),
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: SafeArea(
        top: false,
        child: SingleChildScrollView(
          padding: EdgeInsets.fromLTRB(24, 26, 24, 30 + keyboardInset),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              if (_showWelcomeTooltip) _buildWelcomeTooltip(theme),
              LayoutBuilder(
                builder: (BuildContext context, BoxConstraints constraints) {
                  final compact = constraints.maxWidth < 980;

                  if (compact) {
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        SingleChildScrollView(
                          scrollDirection: Axis.horizontal,
                          child: _buildModeSelector(),
                        ),
                        const SizedBox(height: 14),
                        _buildParseButton(theme, compact: true),
                      ],
                    );
                  }

                  return Row(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: <Widget>[
                      Expanded(
                        child: SingleChildScrollView(
                          scrollDirection: Axis.horizontal,
                          child: _buildModeSelector(),
                        ),
                      ),
                      const SizedBox(width: 12),
                      _buildParseButton(theme, compact: true),
                    ],
                  );
                },
              ),
              const SizedBox(height: 36),
              AnimatedSwitcher(
                duration: const Duration(milliseconds: 260),
                switchInCurve: Curves.easeOutCubic,
                switchOutCurve: Curves.easeInCubic,
                transitionBuilder: (Widget child, Animation<double> anim) {
                  return FadeTransition(
                    opacity: anim,
                    child: SlideTransition(
                      position: Tween<Offset>(
                        begin: const Offset(0.03, 0),
                        end: Offset.zero,
                      ).animate(anim),
                      child: child,
                    ),
                  );
                },
                child: switch (_mode) {
                  _InputMode.pasteJson => _buildPasteMode(theme),
                  _InputMode.loadSample => _buildSampleMode(theme),
                  _InputMode.streaming => _buildStreamingMode(theme),
                  _InputMode.genUiPreview => _buildGenUiPreviewMode(theme),
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildModeSelector() {
    return SegmentedButton<_InputMode>(
      segments: const <ButtonSegment<_InputMode>>[
        ButtonSegment<_InputMode>(
          value: _InputMode.pasteJson,
          icon: Icon(Icons.content_paste_rounded),
          label: Text('Paste JSON'),
        ),
        ButtonSegment<_InputMode>(
          value: _InputMode.loadSample,
          icon: Icon(Icons.auto_awesome_rounded),
          label: Text('Load Sample'),
        ),
        ButtonSegment<_InputMode>(
          value: _InputMode.streaming,
          icon: Icon(Icons.stream_rounded),
          label: Text('Streaming'),
        ),
        ButtonSegment<_InputMode>(
          value: _InputMode.genUiPreview,
          icon: Icon(Icons.dashboard_customize_rounded),
          label: Text('GenUI Preview'),
        ),
      ],
      selected: <_InputMode>{_mode},
      showSelectedIcon: false,
      onSelectionChanged: (Set<_InputMode> selected) {
        if (selected.isNotEmpty) {
          _setMode(selected.first);
        }
      },
    );
  }

  Widget _buildWelcomeTooltip(ThemeData theme) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: GestureDetector(
        onTap: _dismissWelcomeTooltip,
        child: Column(
          children: <Widget>[
            Container(
              width: double.infinity,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                color: _tintedSurface(theme, _functionAccent),
                border: Border.all(
                  color: _functionAccent.withValues(alpha: 0.35),
                ),
              ),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              child: Text(
                'Start by pasting your JSON or loading a sample',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurface,
                ),
              ),
            ),
            const Icon(Icons.arrow_drop_down_rounded, color: _functionAccent),
          ],
        ),
      ),
    );
  }

  Widget _buildPasteMode(ThemeData theme) {
    final isDark = theme.brightness == Brightness.dark;
    final baseBorder = _textFieldHasError
        ? theme.colorScheme.error
        : (_jsonFocusNode.hasFocus
              ? _functionAccent
              : theme.colorScheme.outlineVariant);

    final background = isDark
        ? const Color(0xFF0D1117)
        : const Color(0xFFFBFDFF);

    final maxHeight = math.max(340.0, MediaQuery.sizeOf(context).height * 0.78);
    final boxHeight = _pasteEditorHeight.clamp(
      _minPasteEditorHeight,
      maxHeight,
    );

    return Column(
      key: const ValueKey<String>('paste-mode'),
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        AnimatedBuilder(
          animation: _shakeController,
          builder: (BuildContext context, Widget? child) {
            final t = _shakeController.value;
            final x = math.sin(t * math.pi * 8) * (1 - t) * 14;
            return Transform.translate(offset: Offset(x, 0), child: child);
          },
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 180),
            curve: Curves.easeOut,
            height: boxHeight,
            decoration: BoxDecoration(
              color: background,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: baseBorder),
            ),
            child: Stack(
              children: <Widget>[
                TextField(
                  controller: _jsonController,
                  focusNode: _jsonFocusNode,
                  maxLines: null,
                  minLines: null,
                  expands: true,
                  autocorrect: false,
                  enableSuggestions: false,
                  style: theme.textTheme.bodySmall?.copyWith(
                    fontFamily: 'monospace',
                    fontSize: 13,
                    height: 1.35,
                  ),
                  decoration: InputDecoration(
                    border: InputBorder.none,
                    hintStyle: theme.textTheme.bodySmall?.copyWith(
                      fontFamily: 'monospace',
                      fontSize: 13,
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                    hintText:
                        'Paste your OpenAI Responses API JSON here...\n\n'
                        '{\n'
                        '  "object": "response",\n'
                        '  "output": [...]\n'
                        '}',
                    contentPadding: const EdgeInsets.fromLTRB(16, 44, 16, 14),
                  ),
                ),
                Positioned(
                  right: 6,
                  top: 4,
                  child: Row(
                    children: <Widget>[
                      IconButton(
                        onPressed: _pasteFromClipboard,
                        tooltip: 'Paste',
                        icon: const Icon(Icons.content_paste_rounded, size: 20),
                      ),
                      if (_jsonController.text.isNotEmpty)
                        IconButton(
                          onPressed: _clearInput,
                          tooltip: 'Delete JSON',
                          icon: const Icon(
                            Icons.delete_outline_rounded,
                            size: 20,
                          ),
                          visualDensity: VisualDensity.compact,
                        ),
                    ],
                  ),
                ),
                Positioned(
                  right: 6,
                  bottom: 6,
                  child: Tooltip(
                    message: 'Drag to resize editor',
                    child: MouseRegion(
                      cursor: SystemMouseCursors.resizeUpLeftDownRight,
                      child: GestureDetector(
                        behavior: HitTestBehavior.opaque,
                        onPanUpdate: (DragUpdateDetails details) {
                          _resizePasteEditor(details.delta.dy);
                        },
                        child: Container(
                          width: _pasteResizeHandleSize,
                          height: _pasteResizeHandleSize,
                          decoration: BoxDecoration(
                            color: theme.colorScheme.surfaceContainerHighest,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(
                              color: theme.colorScheme.outlineVariant,
                            ),
                          ),
                          child: Icon(
                            Icons.unfold_more_rounded,
                            size: 14,
                            color: theme.colorScheme.onSurfaceVariant,
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
        const SizedBox(height: 10),
        Row(
          children: <Widget>[
            Text(
              '${_formatNumber(_jsonController.text.length)} characters',
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
                fontSize: 12,
              ),
            ),
            const SizedBox(width: 20),
            Text(
              'Editor height: ${boxHeight.round()} px',
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
                fontSize: 12,
              ),
            ),
          ],
        ),
        if (_warningMessage != null)
          Padding(
            padding: const EdgeInsets.only(top: 10),
            child: _InlineBanner(color: _unknownAccent, text: _warningMessage!),
          ),
        AnimatedSwitcher(
          duration: const Duration(milliseconds: 220),
          switchInCurve: Curves.easeOut,
          switchOutCurve: Curves.easeIn,
          child: _errorMessage == null
              ? const SizedBox.shrink()
              : Padding(
                  padding: const EdgeInsets.only(top: 10),
                  child: Text(
                    _errorMessage!,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.error,
                      fontSize: 12,
                    ),
                  ),
                ),
        ),
      ],
    );
  }

  Widget _buildSampleMode(ThemeData theme) {
    return Column(
      key: const ValueKey<String>('sample-mode'),
      children: <Widget>[
        for (int i = 0; i < _samplePayloads.length; i++)
          Padding(
            padding: EdgeInsets.only(
              bottom: i == _samplePayloads.length - 1 ? 0 : 12,
            ),
            child: _buildSampleCard(theme, _samplePayloads[i]),
          ),
        const SizedBox(height: 14),
        ClipRect(
          child: AnimatedSize(
            duration: const Duration(milliseconds: 250),
            curve: Curves.easeInOut,
            child: (_selectedSample == null || !_showPreviewPanel)
                ? const SizedBox.shrink()
                : AnimatedSlide(
                    duration: const Duration(milliseconds: 250),
                    curve: Curves.easeOut,
                    offset: _showPreviewPanel
                        ? Offset.zero
                        : const Offset(0, 0.2),
                    child: _SamplePreviewPanel(
                      previewText: _previewFromSample(_selectedSample!.payload),
                      onClose: () {
                        setState(() {
                          _showPreviewPanel = false;
                        });
                      },
                    ),
                  ),
          ),
        ),
        if (_errorMessage != null)
          Padding(
            padding: const EdgeInsets.only(top: 10),
            child: Align(
              alignment: Alignment.centerLeft,
              child: Text(
                _errorMessage!,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.error,
                  fontSize: 12,
                ),
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildStreamingMode(ThemeData theme) {
    return Container(
      key: const ValueKey<String>('streaming-mode'),
      width: double.infinity,
      decoration: BoxDecoration(
        color: _tintedSurface(theme, _functionAccent),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: _functionAccent.withValues(alpha: 0.35)),
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            children: <Widget>[
              const Icon(Icons.stream_rounded, color: _functionAccent),
              const SizedBox(width: 8),
              Text(
                'Live Streaming Simulator',
                style: theme.textTheme.titleSmall?.copyWith(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: _functionAccent,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            'Watch a real-time OpenAI Responses streaming sequence event by '
            'event, with live timeline rendering and full playback controls.',
            style: theme.textTheme.bodySmall?.copyWith(
              height: 1.45,
              color: theme.colorScheme.onSurface,
            ),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: const <Widget>[
              _StreamingModeChip(label: 'SSE Event Feed'),
              _StreamingModeChip(label: 'Live Timeline View'),
              _StreamingModeChip(label: 'Playback Controls'),
              _StreamingModeChip(label: 'Step Debugging'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildGenUiPreviewMode(ThemeData theme) {
    final isDark = theme.brightness == Brightness.dark;
    final borderColor = _textFieldHasError
        ? theme.colorScheme.error
        : (_genUiFocusNode.hasFocus
              ? _functionAccent
              : theme.colorScheme.outlineVariant);

    final background = isDark
        ? const Color(0xFF0D1117)
        : const Color(0xFFFBFDFF);

    final boxHeight = math.max(230.0, MediaQuery.sizeOf(context).height * 0.33);

    return Column(
      key: const ValueKey<String>('genui-preview-mode'),
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Container(
          width: double.infinity,
          decoration: BoxDecoration(
            color: _tintedSurface(theme, _functionAccent),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: _functionAccent.withValues(alpha: 0.35)),
          ),
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Row(
                children: <Widget>[
                  const Icon(
                    Icons.dashboard_customize_rounded,
                    color: _functionAccent,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'Direct GenUI Descriptor Preview',
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: _functionAccent,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                'Paste raw descriptor JSON from an AI agent to render a live, '
                'interactive Flutter preview instantly.',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurface,
                  height: 1.45,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          curve: Curves.easeOut,
          height: boxHeight,
          decoration: BoxDecoration(
            color: background,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: borderColor),
          ),
          child: Stack(
            children: <Widget>[
              TextField(
                controller: _genUiController,
                focusNode: _genUiFocusNode,
                maxLines: null,
                minLines: null,
                expands: true,
                autocorrect: false,
                enableSuggestions: false,
                style: theme.textTheme.bodySmall?.copyWith(
                  fontFamily: 'monospace',
                  fontSize: 13,
                  height: 1.35,
                ),
                decoration: InputDecoration(
                  border: InputBorder.none,
                  hintText:
                      'Paste GenUI descriptor JSON here...\n\n'
                      '{\n'
                      '  "type": "screen",\n'
                      '  "components": [...]\n'
                      '}',
                  hintStyle: theme.textTheme.bodySmall?.copyWith(
                    fontFamily: 'monospace',
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                  contentPadding: const EdgeInsets.fromLTRB(16, 44, 16, 14),
                ),
              ),
              Positioned(
                top: 4,
                right: 6,
                child: Row(
                  children: <Widget>[
                    IconButton(
                      onPressed: _pasteFromClipboard,
                      tooltip: 'Paste',
                      icon: const Icon(Icons.content_paste_rounded, size: 20),
                    ),
                    if (_genUiController.text.isNotEmpty)
                      IconButton(
                        onPressed: _clearInput,
                        tooltip: 'Delete JSON',
                        icon: const Icon(
                          Icons.delete_outline_rounded,
                          size: 20,
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 8),
        Text(
          '${_formatNumber(_genUiController.text.length)} characters',
          style: theme.textTheme.bodySmall?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
            fontSize: 12,
          ),
        ),
        const SizedBox(height: 14),
        Text(
          'Load Sample Descriptor',
          style: theme.textTheme.labelLarge?.copyWith(
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 8),
        for (int i = 0; i < genUiSampleDescriptors.length; i++)
          Padding(
            padding: EdgeInsets.only(
              bottom: i == genUiSampleDescriptors.length - 1 ? 0 : 10,
            ),
            child: _buildGenUiSampleCard(theme, genUiSampleDescriptors[i]),
          ),
        if (_errorMessage != null)
          Padding(
            padding: const EdgeInsets.only(top: 10),
            child: Text(
              _errorMessage!,
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.error,
                fontSize: 12,
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildGenUiSampleCard(ThemeData theme, GenUISampleDescriptor sample) {
    final selected = sample.id == _selectedGenUiSample?.id;

    return InkWell(
      onTap: () => _selectGenUiSample(sample),
      borderRadius: BorderRadius.circular(12),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeInOut,
        decoration: BoxDecoration(
          color: theme.colorScheme.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: selected
                ? _functionAccent
                : theme.colorScheme.outlineVariant,
            width: selected ? 1.8 : 1,
          ),
        ),
        padding: const EdgeInsets.all(12),
        child: Row(
          children: <Widget>[
            const Icon(Icons.widgets_outlined, color: _functionAccent),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(
                    sample.title,
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    sample.description,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
            if (selected)
              const Icon(Icons.check_circle_rounded, color: _functionAccent),
          ],
        ),
      ),
    );
  }

  Widget _buildSampleCard(ThemeData theme, _SamplePayloadDefinition sample) {
    final selected = sample.id == _selectedSample?.id;
    final borderColor = selected
        ? _functionAccent
        : theme.colorScheme.outlineVariant;

    return InkWell(
      onTap: () => _selectSample(sample),
      borderRadius: BorderRadius.circular(12),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 220),
        curve: Curves.easeInOut,
        decoration: BoxDecoration(
          color: theme.colorScheme.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: borderColor, width: selected ? 2.0 : 1.0),
          boxShadow: <BoxShadow>[
            BoxShadow(
              color: Colors.black.withValues(
                alpha: theme.brightness == Brightness.dark ? 0.22 : 0.06,
              ),
              blurRadius: 10,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        padding: const EdgeInsets.all(14),
        child: Stack(
          children: <Widget>[
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Icon(sample.icon, color: sample.iconColor),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: <Widget>[
                          Text(
                            sample.title,
                            style: theme.textTheme.titleSmall?.copyWith(
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            sample.description,
                            style: theme.textTheme.bodySmall?.copyWith(
                              fontSize: 13,
                              color: theme.colorScheme.onSurfaceVariant,
                              height: 1.4,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: <Widget>[
                    for (final tag in sample.tags) _TagChip(tag: tag),
                  ],
                ),
              ],
            ),
            Positioned(
              top: 2,
              right: 2,
              child: AnimatedScale(
                duration: const Duration(milliseconds: 220),
                scale: selected ? 1 : 0,
                curve: Curves.easeOutBack,
                child: Container(
                  width: 22,
                  height: 22,
                  decoration: const BoxDecoration(
                    color: _functionAccent,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.check_rounded,
                    color: Colors.white,
                    size: 16,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildParseButton(ThemeData theme, {bool compact = false}) {
    final colorScheme = theme.colorScheme;
    final isStreamingMode = _mode == _InputMode.streaming;
    final isGenUiMode = _mode == _InputMode.genUiPreview;

    Color buttonColor;
    switch (_buttonState) {
      case _ParseButtonState.success:
        buttonColor = _outputAccent;
      case _ParseButtonState.error:
        buttonColor = colorScheme.error;
      case _ParseButtonState.loading:
      case _ParseButtonState.idle:
        buttonColor = colorScheme.primary;
    }

    return SizedBox(
      height: compact ? 40 : 52,
      width: compact ? 220 : double.infinity,
      child: FilledButton(
        onPressed: _isBusy ? null : _handleParsePressed,
        style: FilledButton.styleFrom(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(compact ? 10 : 12),
          ),
          backgroundColor: buttonColor,
          disabledBackgroundColor: buttonColor,
          padding: EdgeInsets.symmetric(
            horizontal: compact ? 14 : 18,
            vertical: compact ? 0 : 10,
          ),
        ),
        child: AnimatedSwitcher(
          duration: const Duration(milliseconds: 170),
          child: switch (_buttonState) {
            _ParseButtonState.loading => const SizedBox(
              key: ValueKey<String>('loading'),
              width: 18,
              height: 18,
              child: CircularProgressIndicator(
                strokeWidth: 2.3,
                valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
              ),
            ),
            _ParseButtonState.success => const Icon(
              Icons.check_rounded,
              key: ValueKey<String>('success'),
              color: Colors.white,
              size: 18,
            ),
            _ParseButtonState.error => const Icon(
              Icons.close_rounded,
              key: ValueKey<String>('error'),
              color: Colors.white,
              size: 18,
            ),
            _ParseButtonState.idle => Row(
              key: const ValueKey<String>('idle'),
              mainAxisAlignment: MainAxisAlignment.center,
              children: <Widget>[
                Flexible(
                  child: Text(
                    isGenUiMode
                        ? 'Preview UI'
                        : isStreamingMode
                        ? 'Open Streaming Simulator'
                        : 'Parse Response',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: compact ? 13 : 16,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                SizedBox(width: compact ? 6 : 10),
                Icon(
                  isStreamingMode
                      ? Icons.play_circle_fill_rounded
                      : isGenUiMode
                      ? Icons.dashboard_customize_rounded
                      : Icons.arrow_right_alt_rounded,
                  size: compact ? 16 : 22,
                ),
              ],
            ),
          },
        ),
      ),
    );
  }

  Map<String, dynamic> _normalizeMap(dynamic value) {
    if (value is Map<String, dynamic>) {
      return value;
    }

    if (value is Map) {
      return value.map((dynamic key, dynamic mapValue) {
        return MapEntry(key.toString(), mapValue);
      });
    }

    return <String, dynamic>{};
  }

  dynamic _decodeJsonLenient(String source) {
    try {
      return jsonDecode(source);
    } catch (_) {
      final trimmed = source.trim();
      final mayBeObjectFields =
          !trimmed.startsWith('{') &&
          !trimmed.startsWith('[') &&
          trimmed.contains(':');

      if (mayBeObjectFields) {
        return jsonDecode('{$trimmed}');
      }
      rethrow;
    }
  }

  Map<String, dynamic> _normalizeRootPayload(dynamic decoded) {
    if (decoded is Map) {
      return _normalizeMap(decoded);
    }

    if (decoded is List) {
      return <String, dynamic>{'items': decoded};
    }

    return <String, dynamic>{'value': decoded};
  }

  String _previewFromSample(String payload) {
    final lines = const LineSplitter().convert(payload.trim());
    final visible = lines.take(8).join('\n');
    if (lines.length > 8) {
      return '$visible\n...';
    }
    return visible;
  }

  String _formatNumber(int value) {
    if (value == 0) {
      return '0';
    }

    final digits = value.toString();
    final chunks = <String>[];

    for (var i = digits.length; i > 0; i -= 3) {
      final start = (i - 3).clamp(0, i);
      chunks.insert(0, digits.substring(start, i));
    }

    return chunks.join(',');
  }
}

class _InlineBanner extends StatelessWidget {
  const _InlineBanner({required this.color, required this.text});

  final Color color;
  final String text;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: _tintedSurface(theme, color),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: color.withValues(alpha: 0.4)),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      child: Text(
        text,
        style: theme.textTheme.bodySmall?.copyWith(
          color: theme.colorScheme.onSurface,
          fontSize: 12,
        ),
      ),
    );
  }
}

class _SamplePreviewPanel extends StatelessWidget {
  const _SamplePreviewPanel({required this.previewText, required this.onClose});

  final String previewText;
  final VoidCallback onClose;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        color: theme.colorScheme.surface,
        border: Border.all(color: theme.colorScheme.outlineVariant),
      ),
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            children: <Widget>[
              Text(
                'Preview',
                style: theme.textTheme.labelLarge?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
              const Spacer(),
              IconButton(
                onPressed: onClose,
                tooltip: 'Close Preview',
                icon: const Icon(Icons.close_rounded, size: 18),
                constraints: const BoxConstraints.tightFor(
                  width: 30,
                  height: 30,
                ),
                visualDensity: VisualDensity.compact,
                padding: EdgeInsets.zero,
              ),
            ],
          ),
          const SizedBox(height: 8),
          Container(
            width: double.infinity,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(8),
              color: theme.colorScheme.surfaceContainerHighest,
            ),
            padding: const EdgeInsets.all(10),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Text(
                previewText,
                style: theme.textTheme.bodySmall?.copyWith(
                  fontFamily: 'monospace',
                  fontSize: 13,
                  height: 1.4,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _TagChip extends StatelessWidget {
  const _TagChip({required this.tag});

  final _SampleTag tag;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      decoration: BoxDecoration(
        color: _tintedSurface(theme, tag.color),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: tag.color.withValues(alpha: 0.36)),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      child: Text(
        tag.label,
        style: theme.textTheme.labelSmall?.copyWith(
          color: tag.color,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _StreamingModeChip extends StatelessWidget {
  const _StreamingModeChip({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: _functionAccent.withValues(alpha: 0.35)),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      child: Text(
        label,
        style: theme.textTheme.labelSmall?.copyWith(
          color: _functionAccent,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _SamplePayloadDefinition {
  const _SamplePayloadDefinition({
    required this.id,
    required this.title,
    required this.description,
    required this.icon,
    required this.iconColor,
    required this.tags,
    required this.payload,
  });

  final String id;
  final String title;
  final String description;
  final IconData icon;
  final Color iconColor;
  final List<_SampleTag> tags;
  final String payload;
}

class _SampleTag {
  const _SampleTag({required this.label, required this.color});

  final String label;
  final Color color;
}

Color _tintedSurface(ThemeData theme, Color accent) {
  final opacity = theme.brightness == Brightness.dark ? 0.24 : 0.1;
  return Color.alphaBlend(
    accent.withValues(alpha: opacity),
    theme.colorScheme.surface,
  );
}
