import 'dart:async';
import 'dart:convert';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../domain/open_response_parser.dart';
import '../domain/response_models.dart';
import 'response_explorer_screen.dart';

const Color _reasoningAccent = Color(0xFF7C3AED);
const Color _functionAccent = Color(0xFF2563EB);
const Color _outputAccent = Color(0xFF16A34A);
const Color _messageAccent = Color(0xFF6B7280);
const Color _unknownAccent = Color(0xFFD97706);
const Color _lightModeBackground = Color(0xFFF8FAFC);

const String _warningBannerText =
    'This does not look like an Open Responses payload. '
    'We will try to parse it anyway.';

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

enum _InputMode { pasteJson, loadSample }

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

  final TextEditingController _jsonController = TextEditingController();
  final FocusNode _jsonFocusNode = FocusNode();

  late final AnimationController _shakeController;
  Timer? _errorFadeTimer;

  _InputMode _mode = _InputMode.pasteJson;
  _ParseButtonState _buttonState = _ParseButtonState.idle;
  _SamplePayloadDefinition? _selectedSample;

  bool _showPreviewPanel = false;
  bool _showWelcomeTooltip = false;
  bool _textFieldHasError = false;

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
    super.dispose();
  }

  void _handleTextChanged() {
    if (!mounted) {
      return;
    }

    final hasText = _jsonController.text.trim().isNotEmpty;
    if (_textFieldHasError && hasText) {
      setState(() {
        _textFieldHasError = false;
      });
    } else {
      setState(() {});
    }
  }

  Future<void> _pasteFromClipboard() async {
    final clipboardData = await Clipboard.getData(Clipboard.kTextPlain);
    final pastedText = clipboardData?.text;

    if (pastedText == null || pastedText.isEmpty) {
      return;
    }

    _jsonController.text = pastedText;
    _jsonController.selection = TextSelection.collapsed(
      offset: _jsonController.text.length,
    );

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
    _jsonController.clear();
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
      if (mode == _InputMode.pasteJson) {
        _showPreviewPanel = false;
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

  void _dismissWelcomeTooltip() {
    setState(() {
      _showWelcomeTooltip = false;
    });
  }

  void _showInfoBottomSheet() {
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (BuildContext context) {
        final theme = Theme.of(context);
        return Padding(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 26),
          child: Text(
            'Open Responses Explorer helps developers inspect and debug '
            'OpenAI Responses API payloads visually. Paste raw JSON or '
            'load a sample to parse and explore the response timeline, '
            'correlations, and raw structure.',
            style: theme.textTheme.bodyMedium?.copyWith(height: 1.5),
          ),
        );
      },
    );
  }

  Future<void> _handleParsePressed() async {
    if (_isBusy) {
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
      final decoded = jsonDecode(source);
      if (decoded is! Map) {
        throw const FormatException('Root JSON value must be an object.');
      }
      payload = _normalizeMap(decoded);
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
              'by API Dash',
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
            onPressed: _showInfoBottomSheet,
            tooltip: 'About',
            icon: const Icon(Icons.info_outline_rounded),
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: SafeArea(
        top: false,
        child: Column(
          children: <Widget>[
            Expanded(
              child: SingleChildScrollView(
                padding: EdgeInsets.fromLTRB(16, 12, 16, 16 + keyboardInset),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    if (_showWelcomeTooltip) _buildWelcomeTooltip(theme),
                    SegmentedButton<_InputMode>(
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
                      ],
                      selected: <_InputMode>{_mode},
                      showSelectedIcon: false,
                      onSelectionChanged: (Set<_InputMode> selected) {
                        if (selected.isNotEmpty) {
                          _setMode(selected.first);
                        }
                      },
                    ),
                    const SizedBox(height: 14),
                    AnimatedSwitcher(
                      duration: const Duration(milliseconds: 260),
                      switchInCurve: Curves.easeOutCubic,
                      switchOutCurve: Curves.easeInCubic,
                      transitionBuilder:
                          (Widget child, Animation<double> anim) {
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
                      child: _mode == _InputMode.pasteJson
                          ? _buildPasteMode(theme)
                          : _buildSampleMode(theme),
                    ),
                  ],
                ),
              ),
            ),
            AnimatedPadding(
              duration: const Duration(milliseconds: 180),
              curve: Curves.easeOut,
              padding: EdgeInsets.fromLTRB(16, 8, 16, keyboardInset + 12),
              child: _buildParseButton(theme),
            ),
          ],
        ),
      ),
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

    final boxHeight = math.max(280.0, MediaQuery.sizeOf(context).height * 0.43);

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
              borderRadius: BorderRadius.circular(12),
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
                          tooltip: 'Clear',
                          icon: const Icon(Icons.clear_rounded, size: 20),
                        ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 8),
        Text(
          '${_formatNumber(_jsonController.text.length)} characters',
          style: theme.textTheme.bodySmall?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
            fontSize: 12,
          ),
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

  Widget _buildParseButton(ThemeData theme) {
    final colorScheme = theme.colorScheme;

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
      height: 52,
      width: double.infinity,
      child: FilledButton(
        onPressed: _isBusy ? null : _handleParsePressed,
        style: FilledButton.styleFrom(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          backgroundColor: buttonColor,
          disabledBackgroundColor: buttonColor,
        ),
        child: AnimatedSwitcher(
          duration: const Duration(milliseconds: 170),
          child: switch (_buttonState) {
            _ParseButtonState.loading => const SizedBox(
              key: ValueKey<String>('loading'),
              width: 22,
              height: 22,
              child: CircularProgressIndicator(
                strokeWidth: 2.3,
                valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
              ),
            ),
            _ParseButtonState.success => const Icon(
              Icons.check_rounded,
              key: ValueKey<String>('success'),
              color: Colors.white,
              size: 22,
            ),
            _ParseButtonState.error => const Icon(
              Icons.close_rounded,
              key: ValueKey<String>('error'),
              color: Colors.white,
              size: 22,
            ),
            _ParseButtonState.idle => const Row(
              key: ValueKey<String>('idle'),
              mainAxisAlignment: MainAxisAlignment.center,
              children: <Widget>[
                Text(
                  'Parse Response',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                ),
                SizedBox(width: 10),
                Icon(Icons.arrow_right_alt_rounded, size: 22),
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
