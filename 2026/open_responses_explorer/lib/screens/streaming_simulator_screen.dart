import 'dart:async';
import 'dart:convert';
import 'dart:math' as math;
import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../domain/response_models.dart';
import '../domain/streaming_session.dart';

const Color _reasoningAccent = Color(0xFF7C3AED);
const Color _functionAccent = Color(0xFF2563EB);
const Color _outputAccent = Color(0xFF16A34A);
const Color _messageAccent = Color(0xFF6B7280);
const Color _unknownAccent = Color(0xFFD97706);
const Color _processingBlue = Color(0xFF2563EB);
const Color _completedGreen = Color(0xFF16A34A);
const Color _pendingGray = Color(0xFF94A3B8);
const Color _lightModeBackground = Color(0xFFF8FAFC);

const ParsedResponse _emptyStreamingResponse = ParsedResponse(
  id: 'resp_stream_simulated',
  status: 'in_progress',
  model: 'gpt-4o',
  items: <ResponseItem>[],
  correlatedCalls: <CorrelatedCall>[],
  totalTokens: null,
);

final List<_SimulationEvent> _simulationEvents = <_SimulationEvent>[
  _SimulationEvent(
    delayAfterPreviousMs: 0,
    payload: <String, dynamic>{
      'type': 'response.output_item.added',
      'output_index': 0,
      'item': <String, dynamic>{
        'type': 'reasoning',
        'id': 'rs_001',
        'status': 'in_progress',
      },
    },
  ),
  _SimulationEvent(
    delayAfterPreviousMs: 400,
    payload: <String, dynamic>{
      'type': 'response.output_text.delta',
      'output_index': 0,
      'content_index': 0,
      'delta': 'The user wants weather',
    },
  ),
  _SimulationEvent(
    delayAfterPreviousMs: 300,
    payload: <String, dynamic>{
      'type': 'response.output_text.delta',
      'output_index': 0,
      'content_index': 0,
      'delta': ' info for Tokyo and London.',
    },
  ),
  _SimulationEvent(
    delayAfterPreviousMs: 200,
    payload: <String, dynamic>{
      'type': 'response.output_item.done',
      'output_index': 0,
      'item': <String, dynamic>{
        'type': 'reasoning',
        'id': 'rs_001',
        'summary': <Map<String, dynamic>>[
          <String, dynamic>{
            'type': 'summary_text',
            'text':
                'The user wants weather info for Tokyo and London. I will call the weather tool for each city.',
          },
        ],
        'status': 'completed',
      },
    },
  ),
  _SimulationEvent(
    delayAfterPreviousMs: 500,
    payload: <String, dynamic>{
      'type': 'response.output_item.added',
      'output_index': 1,
      'item': <String, dynamic>{
        'type': 'function_call',
        'id': 'fc_001',
        'call_id': 'call_weather_tokyo',
        'name': 'get_current_weather',
        'status': 'in_progress',
      },
    },
  ),
  _SimulationEvent(
    delayAfterPreviousMs: 300,
    payload: <String, dynamic>{
      'type': 'response.function_call_arguments.delta',
      'output_index': 1,
      'delta': '{"city":',
    },
  ),
  _SimulationEvent(
    delayAfterPreviousMs: 250,
    payload: <String, dynamic>{
      'type': 'response.function_call_arguments.delta',
      'output_index': 1,
      'delta': ' "Tokyo",',
    },
  ),
  _SimulationEvent(
    delayAfterPreviousMs: 250,
    payload: <String, dynamic>{
      'type': 'response.function_call_arguments.delta',
      'output_index': 1,
      'delta': ' "units": "celsius"}',
    },
  ),
  _SimulationEvent(
    delayAfterPreviousMs: 200,
    payload: <String, dynamic>{
      'type': 'response.output_item.done',
      'output_index': 1,
      'item': <String, dynamic>{
        'type': 'function_call',
        'id': 'fc_001',
        'call_id': 'call_weather_tokyo',
        'name': 'get_current_weather',
        'arguments': '{"city": "Tokyo", "units": "celsius"}',
        'status': 'completed',
      },
    },
  ),
  _SimulationEvent(
    delayAfterPreviousMs: 400,
    payload: <String, dynamic>{
      'type': 'response.output_item.added',
      'output_index': 2,
      'item': <String, dynamic>{
        'type': 'function_call_output',
        'call_id': 'call_weather_tokyo',
        'status': 'in_progress',
      },
    },
  ),
  _SimulationEvent(
    delayAfterPreviousMs: 600,
    payload: <String, dynamic>{
      'type': 'response.output_item.done',
      'output_index': 2,
      'item': <String, dynamic>{
        'type': 'function_call_output',
        'call_id': 'call_weather_tokyo',
        'output':
            '{"temperature": 22, "condition": "Partly cloudy", "humidity": 65}',
        'status': 'completed',
      },
    },
  ),
  _SimulationEvent(
    delayAfterPreviousMs: 400,
    payload: <String, dynamic>{
      'type': 'response.output_item.added',
      'output_index': 3,
      'item': <String, dynamic>{
        'type': 'message',
        'role': 'assistant',
        'status': 'in_progress',
      },
    },
  ),
  _SimulationEvent(
    delayAfterPreviousMs: 300,
    payload: <String, dynamic>{
      'type': 'response.output_text.delta',
      'output_index': 3,
      'content_index': 0,
      'delta': 'Tokyo is currently',
    },
  ),
  _SimulationEvent(
    delayAfterPreviousMs: 200,
    payload: <String, dynamic>{
      'type': 'response.output_text.delta',
      'output_index': 3,
      'content_index': 0,
      'delta': ' 22 degrees Celsius',
    },
  ),
  _SimulationEvent(
    delayAfterPreviousMs: 200,
    payload: <String, dynamic>{
      'type': 'response.output_text.delta',
      'output_index': 3,
      'content_index': 0,
      'delta': ' with partly cloudy skies.',
    },
  ),
  _SimulationEvent(
    delayAfterPreviousMs: 150,
    payload: <String, dynamic>{
      'type': 'response.output_item.done',
      'output_index': 3,
      'item': <String, dynamic>{
        'type': 'message',
        'role': 'assistant',
        'content': <Map<String, dynamic>>[
          <String, dynamic>{
            'type': 'text',
            'text':
                'Tokyo is currently 22 degrees Celsius with partly cloudy skies and 65% humidity.',
          },
        ],
        'status': 'completed',
      },
    },
  ),
  _SimulationEvent(
    delayAfterPreviousMs: 300,
    payload: <String, dynamic>{
      'type': 'response.completed',
      'response': <String, dynamic>{
        'id': 'resp_stream_001',
        'status': 'completed',
        'model': 'gpt-4o',
      },
    },
  ),
];

enum _SimulationSpeed { slow, normal, fast, step }

extension on _SimulationSpeed {
  String get dropdownLabel {
    switch (this) {
      case _SimulationSpeed.slow:
        return '0.5x Slow';
      case _SimulationSpeed.normal:
        return '1x Normal';
      case _SimulationSpeed.fast:
        return '2x Fast';
      case _SimulationSpeed.step:
        return 'Step mode';
    }
  }

  String get shortLabel {
    switch (this) {
      case _SimulationSpeed.slow:
        return '0.5x';
      case _SimulationSpeed.normal:
        return '1x';
      case _SimulationSpeed.fast:
        return '2x';
      case _SimulationSpeed.step:
        return 'Step';
    }
  }

  double get multiplier {
    switch (this) {
      case _SimulationSpeed.slow:
        return 2;
      case _SimulationSpeed.normal:
        return 1;
      case _SimulationSpeed.fast:
        return 0.5;
      case _SimulationSpeed.step:
        return 0;
    }
  }
}

class StreamingSimulatorScreen extends StatefulWidget {
  const StreamingSimulatorScreen({super.key});

  @override
  State<StreamingSimulatorScreen> createState() =>
      _StreamingSimulatorScreenState();
}

class _StreamingSimulatorScreenState extends State<StreamingSimulatorScreen> {
  final ScrollController _eventScrollController = ScrollController();

  late final StreamingSession _session;
  StreamSubscription<ParsedResponse>? _sessionSubscription;

  ParsedResponse _currentResponse = _emptyStreamingResponse;
  _SimulationSpeed _speed = _SimulationSpeed.normal;

  Timer? _playbackTimer;
  bool _isRunning = false;

  int _processedCount = 0;
  int? _processingIndex;
  int? _recentlyProcessedIndex;
  int _elapsedMs = 0;

  final Set<int> _expandedEventIndexes = <int>{};
  final Map<int, int> _arrivalTimeMsByEventIndex = <int, int>{};

  final Map<int, bool> _outputCompletionByIndex = <int, bool>{};
  final Set<int> _knownOutputIndexes = <int>{};
  final Set<int> _flashingOutputIndexes = <int>{};
  final Map<int, String> _argumentsByOutputIndex = <int, String>{};

  double? _scrubbingValue;

  int get _totalEventCount => _simulationEvents.length;

  bool get _isComplete => _processedCount >= _totalEventCount;

  bool get _hasStarted => _processedCount > 0 || _processingIndex != null;

  @override
  void initState() {
    super.initState();
    _session = StreamingSession();
    _currentResponse = _session.currentResponse;

    _sessionSubscription = _session.stream.listen((ParsedResponse response) {
      if (!mounted) {
        return;
      }
      setState(() {
        _currentResponse = response;
      });
    });
  }

  @override
  void dispose() {
    _playbackTimer?.cancel();
    _sessionSubscription?.cancel();
    _session.dispose();
    _eventScrollController.dispose();
    super.dispose();
  }

  void _togglePlayPause() {
    if (_isRunning) {
      _pausePlayback();
      return;
    }

    if (_isComplete) {
      _resetSimulation();
    }

    setState(() {
      _isRunning = true;
    });
    _scheduleNextEvent();
  }

  void _pausePlayback() {
    _playbackTimer?.cancel();
    setState(() {
      _isRunning = false;
      _processingIndex = null;
    });
  }

  void _scheduleNextEvent() {
    _playbackTimer?.cancel();

    if (!_isRunning) {
      return;
    }

    if (_processedCount >= _totalEventCount) {
      setState(() {
        _isRunning = false;
        _processingIndex = null;
      });
      return;
    }

    final duration = _delayForEvent(_processedCount);
    _playbackTimer = Timer(duration, () {
      _processNextEvent(appliedDelayMs: duration.inMilliseconds);
    });
  }

  Duration _delayForEvent(int eventIndex) {
    if (eventIndex == 0) {
      return Duration.zero;
    }

    if (_speed == _SimulationSpeed.step) {
      return Duration.zero;
    }

    final baseDelay = _simulationEvents[eventIndex].delayAfterPreviousMs;
    final scaled = (baseDelay * _speed.multiplier).round();
    return Duration(milliseconds: scaled);
  }

  Future<void> _processNextEvent({required int appliedDelayMs}) async {
    if (_processedCount >= _totalEventCount) {
      return;
    }

    final eventIndex = _processedCount;
    final event = _simulationEvents[eventIndex];

    setState(() {
      _processingIndex = eventIndex;
      _recentlyProcessedIndex = eventIndex;
      _elapsedMs += appliedDelayMs;
      _arrivalTimeMsByEventIndex[eventIndex] = _elapsedMs;
      _applyEventState(event);
    });

    Future<void>.delayed(const Duration(milliseconds: 280), () {
      if (!mounted || _recentlyProcessedIndex != eventIndex) {
        return;
      }
      setState(() {
        _recentlyProcessedIndex = null;
      });
    });

    await Future<void>.delayed(const Duration(milliseconds: 100));

    if (!mounted) {
      return;
    }

    setState(() {
      _processedCount += 1;
      _processingIndex = null;
      if (_processedCount >= _totalEventCount) {
        _isRunning = false;
      }
    });

    _autoScrollEventsToLatest();

    if (_isRunning) {
      _scheduleNextEvent();
    }
  }

  Future<void> _stepForward() async {
    if (_processedCount >= _totalEventCount) {
      return;
    }

    if (_isRunning && _speed != _SimulationSpeed.step) {
      return;
    }

    _playbackTimer?.cancel();
    await _processNextEvent(appliedDelayMs: 0);

    if (_isRunning) {
      _scheduleNextEvent();
    }
  }

  void _rewindToStart() {
    _pausePlayback();
    _resetSimulation();
  }

  void _resetSimulation() {
    _playbackTimer?.cancel();
    _session.reset();

    setState(() {
      _isRunning = false;
      _processedCount = 0;
      _processingIndex = null;
      _recentlyProcessedIndex = null;
      _elapsedMs = 0;
      _scrubbingValue = null;
      _expandedEventIndexes.clear();
      _arrivalTimeMsByEventIndex.clear();
      _outputCompletionByIndex.clear();
      _knownOutputIndexes.clear();
      _flashingOutputIndexes.clear();
      _argumentsByOutputIndex.clear();
      _currentResponse = _session.currentResponse;
    });

    if (_eventScrollController.hasClients) {
      _eventScrollController.jumpTo(0);
    }
  }

  void _applyEventState(_SimulationEvent event) {
    final type = event.type;
    final outputIndex = _asInt(event.payload['output_index']);

    if (type == 'response.output_item.added' && outputIndex != null) {
      _knownOutputIndexes.add(outputIndex);
      _outputCompletionByIndex[outputIndex] = false;
    }

    if (type == 'response.output_item.done' && outputIndex != null) {
      _knownOutputIndexes.add(outputIndex);
      _outputCompletionByIndex[outputIndex] = true;
      _triggerOutputCompletionFlash(outputIndex);
    }

    if (type == 'response.function_call_arguments.delta' && outputIndex != null) {
      final currentArguments = _argumentsByOutputIndex[outputIndex] ?? '';
      _argumentsByOutputIndex[outputIndex] =
          '$currentArguments${_asString(event.payload['delta'])}';
    }

    if (type == 'response.output_item.done' && outputIndex != null) {
      final doneItem = _normalizeMap(event.payload['item']);
      final finalArguments = doneItem['arguments'];
      if (finalArguments is String) {
        _argumentsByOutputIndex[outputIndex] = finalArguments;
      }
    }

    _session.applyDelta(event.payload);
    _currentResponse = _session.currentResponse;
  }

  void _triggerOutputCompletionFlash(int outputIndex) {
    _flashingOutputIndexes.add(outputIndex);
    Future<void>.delayed(const Duration(milliseconds: 300), () {
      if (!mounted) {
        return;
      }
      setState(() {
        _flashingOutputIndexes.remove(outputIndex);
      });
    });
  }

  void _autoScrollEventsToLatest() {
    if (!_eventScrollController.hasClients) {
      return;
    }

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_eventScrollController.hasClients) {
        return;
      }

      final target = _eventScrollController.position.maxScrollExtent;
      _eventScrollController.animateTo(
        target,
        duration: const Duration(milliseconds: 240),
        curve: Curves.easeOutCubic,
      );
    });
  }

  Future<void> _copyEventJson(_SimulationEvent event) async {
    final text = const JsonEncoder.withIndent('  ').convert(event.payload);
    await Clipboard.setData(ClipboardData(text: text));

    if (!mounted) {
      return;
    }

    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        const SnackBar(
          content: Text('Event JSON copied'),
          duration: Duration(milliseconds: 1000),
          behavior: SnackBarBehavior.floating,
        ),
      );
  }

  Future<void> _copyText(String text, {String message = 'Copied'}) async {
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

  void _toggleEventExpanded(int eventIndex) {
    if (eventIndex >= _processedCount) {
      return;
    }

    setState(() {
      if (_expandedEventIndexes.contains(eventIndex)) {
        _expandedEventIndexes.remove(eventIndex);
      } else {
        _expandedEventIndexes.add(eventIndex);
      }
    });
  }

  void _handleScrubChanged(double value) {
    if (_isRunning) {
      _pausePlayback();
    }

    setState(() {
      _scrubbingValue = value;
    });
  }

  void _handleScrubEnd(double value) {
    final target = value.round().clamp(0, _totalEventCount);
    _jumpToEventPosition(target);
  }

  void _jumpToEventPosition(int processedEvents) {
    _pausePlayback();

    _playbackTimer?.cancel();
    _session.reset();

    _outputCompletionByIndex.clear();
    _knownOutputIndexes.clear();
    _flashingOutputIndexes.clear();
    _argumentsByOutputIndex.clear();
    _arrivalTimeMsByEventIndex.clear();

    _elapsedMs = 0;

    for (var i = 0; i < processedEvents; i++) {
      final event = _simulationEvents[i];
      if (i > 0 && _speed != _SimulationSpeed.step) {
        final additional = (event.delayAfterPreviousMs * _speed.multiplier)
            .round();
        _elapsedMs += additional;
      }
      _arrivalTimeMsByEventIndex[i] = _elapsedMs;
      _applyEventState(event);
    }

    setState(() {
      _processedCount = processedEvents;
      _processingIndex = null;
      _recentlyProcessedIndex = null;
      _scrubbingValue = null;
      _expandedEventIndexes.removeWhere((int index) => index >= _processedCount);
      _currentResponse = _session.currentResponse;
      if (_processedCount >= _totalEventCount) {
        _isRunning = false;
      }
    });

    _autoScrollEventsToLatest();
  }

  void _cycleSpeed() {
    setState(() {
      final values = _SimulationSpeed.values;
      final currentIndex = values.indexOf(_speed);
      _speed = values[(currentIndex + 1) % values.length];
    });

    if (_isRunning) {
      _scheduleNextEvent();
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: theme.brightness == Brightness.light
          ? _lightModeBackground
          : theme.colorScheme.surface,
      appBar: AppBar(
        titleSpacing: 16,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Text(
              'Streaming Simulator',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w700,
                fontSize: 18,
              ),
            ),
            Text(
              'Simulating live SSE session',
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
                fontSize: 12,
              ),
            ),
          ],
        ),
        actions: <Widget>[
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: _SpeedDropdown(
              speed: _speed,
              onChanged: (_SimulationSpeed value) {
                setState(() {
                  _speed = value;
                });
                if (_isRunning) {
                  _scheduleNextEvent();
                }
              },
            ),
          ),
          IconButton(
            onPressed: _resetSimulation,
            tooltip: 'Reset simulation',
            icon: const Icon(Icons.refresh_rounded),
          ),
          const SizedBox(width: 6),
        ],
      ),
      body: SafeArea(
        top: false,
        child: Column(
          children: <Widget>[
            Expanded(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
                child: _buildResponsivePanels(theme),
              ),
            ),
            _buildControlBar(theme),
          ],
        ),
      ),
    );
  }

  Widget _buildResponsivePanels(ThemeData theme) {
    return LayoutBuilder(
      builder: (BuildContext context, BoxConstraints constraints) {
        final isWide = constraints.maxWidth >= 900;

        if (isWide) {
          return Row(
            children: <Widget>[
              Expanded(flex: 5, child: _buildEventFeedPanel(theme)),
              const SizedBox(width: 10),
              Expanded(flex: 7, child: _buildLiveResponsePanel(theme)),
            ],
          );
        }

        return Column(
          children: <Widget>[
            Expanded(flex: 4, child: _buildEventFeedPanel(theme)),
            const SizedBox(height: 10),
            Expanded(flex: 6, child: _buildLiveResponsePanel(theme)),
          ],
        );
      },
    );
  }

  Widget _buildEventFeedPanel(ThemeData theme) {
    return _PanelFrame(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 12, 14, 10),
            child: Row(
              children: <Widget>[
                Text(
                  'SSE Events',
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w700,
                    fontSize: 16,
                  ),
                ),
                const SizedBox(width: 10),
                _PulsingDot(
                  active: _isRunning,
                  activeColor: _completedGreen,
                  inactiveColor: _pendingGray,
                  diameter: 10,
                ),
                const Spacer(),
                Text(
                  '$_processedCount / $_totalEventCount events',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                    fontFamily: 'monospace',
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          Divider(height: 1, color: theme.colorScheme.outlineVariant),
          Expanded(
            child: ListView.builder(
              controller: _eventScrollController,
              padding: const EdgeInsets.all(10),
              itemCount: _simulationEvents.length,
              itemBuilder: (BuildContext context, int index) {
                final event = _simulationEvents[index];
                final isCompleted = index < _processedCount;
                final isProcessing = index == _processingIndex;
                final isPending = !isCompleted && !isProcessing;
                final isExpanded = _expandedEventIndexes.contains(index);
                final isRecentlyProcessed = index == _recentlyProcessedIndex;

                return Padding(
                  padding: EdgeInsets.only(
                    bottom: index == _simulationEvents.length - 1 ? 0 : 8,
                  ),
                  child: _EventRow(
                    event: event,
                    eventIndex: index,
                    isCompleted: isCompleted,
                    isPending: isPending,
                    isProcessing: isProcessing,
                    isExpanded: isExpanded,
                    isRecentlyProcessed: isRecentlyProcessed,
                    timestampMs: _arrivalTimeMsByEventIndex[index],
                    onToggleExpanded: () => _toggleEventExpanded(index),
                    onCopyJson: () => _copyEventJson(event),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLiveResponsePanel(ThemeData theme) {
    final status = _liveStatus();
    final sortedOutputIndexes = _knownOutputIndexes.toList()..sort();

    return _PanelFrame(
      child: Column(
        children: <Widget>[
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 12, 14, 10),
            child: Row(
              children: <Widget>[
                Text(
                  'Live Response',
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w700,
                    fontSize: 16,
                  ),
                ),
                const Spacer(),
                _StatusPill(
                  text: status.label,
                  color: status.color,
                  pulsing: status.pulsing,
                ),
              ],
            ),
          ),
          Divider(height: 1, color: theme.colorScheme.outlineVariant),
          Expanded(
            child: _currentResponse.items.isEmpty
                ? _LiveEmptyState(hasStarted: _hasStarted)
                : ListView.builder(
                    padding: const EdgeInsets.all(12),
                    itemCount: _currentResponse.items.length,
                    itemBuilder: (BuildContext context, int index) {
                      final item = _currentResponse.items[index];
                      final outputIndex = index < sortedOutputIndexes.length
                          ? sortedOutputIndexes[index]
                          : index;
                      final isComplete =
                          _outputCompletionByIndex[outputIndex] ?? false;
                      final isInProgress =
                          _hasStarted && !isComplete && !_isComplete;
                      final shouldFlash =
                          _flashingOutputIndexes.contains(outputIndex);

                      return Padding(
                        padding: EdgeInsets.only(
                          bottom: index == _currentResponse.items.length - 1
                              ? 0
                              : 10,
                        ),
                        child: _CardEntrance(
                          key: ValueKey<String>('live-card-$outputIndex'),
                          child: _buildLiveCard(
                            theme,
                            item,
                            outputIndex,
                            isInProgress,
                            shouldFlash,
                          ),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildLiveCard(
    ThemeData theme,
    ResponseItem item,
    int outputIndex,
    bool isInProgress,
    bool flash,
  ) {
    if (item is ReasoningItem) {
      return _LiveReasoningCard(
        item: item,
        inProgress: isInProgress,
        flashComplete: flash,
        onCopy: () => _copyText(
          const JsonEncoder.withIndent('  ').convert(itemToJson(item)),
        ),
      );
    }

    if (item is FunctionCallItem) {
      final argumentsText = _argumentsByOutputIndex[outputIndex] ??
          _argumentsToText(item.arguments);
      return _LiveFunctionCallCard(
        item: item,
        argumentsText: argumentsText,
        inProgress: isInProgress,
        flashComplete: flash,
        onCopy: () => _copyText(
          const JsonEncoder.withIndent('  ').convert(itemToJson(item)),
        ),
      );
    }

    if (item is FunctionCallOutputItem) {
      return _LiveFunctionOutputCard(
        item: item,
        inProgress: isInProgress,
        flashComplete: flash,
        onCopy: () => _copyText(
          const JsonEncoder.withIndent('  ').convert(itemToJson(item)),
        ),
      );
    }

    if (item is MessageItem) {
      return _LiveMessageCard(
        item: item,
        inProgress: isInProgress,
        flashComplete: flash,
        onCopy: () => _copyText(
          const JsonEncoder.withIndent('  ').convert(itemToJson(item)),
        ),
      );
    }

    if (item is UnknownItem) {
      return _LiveUnknownCard(
        raw: item.raw,
        flashComplete: flash,
        onCopy: () => _copyText(
          const JsonEncoder.withIndent('  ').convert(itemToJson(item)),
        ),
      );
    }

    return const SizedBox.shrink();
  }

  Widget _buildControlBar(ThemeData theme) {
    final progressValue = _scrubbingValue ?? _processedCount.toDouble();
    final canStep = _speed == _SimulationSpeed.step || !_isRunning;

    return SafeArea(
      top: false,
      child: Material(
        color: theme.colorScheme.surface,
        elevation: 10,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(14, 10, 14, 12),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              Slider(
                min: 0,
                max: _totalEventCount.toDouble(),
                divisions: _totalEventCount,
                value: progressValue.clamp(0, _totalEventCount.toDouble()),
                label: _sliderLabel(progressValue),
                onChanged: _handleScrubChanged,
                onChangeEnd: _handleScrubEnd,
              ),
              Row(
                children: <Widget>[
                  IconButton(
                    onPressed: _rewindToStart,
                    tooltip: 'Rewind',
                    icon: const Icon(Icons.first_page_rounded),
                  ),
                  const SizedBox(width: 10),
                  FilledButton(
                    onPressed: _togglePlayPause,
                    style: FilledButton.styleFrom(
                      shape: const CircleBorder(),
                      padding: const EdgeInsets.all(14),
                    ),
                    child: Icon(
                      _isRunning
                          ? Icons.pause_rounded
                          : Icons.play_arrow_rounded,
                      size: 28,
                    ),
                  ),
                  const SizedBox(width: 10),
                  IconButton(
                    onPressed: canStep ? _stepForward : null,
                    tooltip: 'Step forward',
                    icon: const Icon(Icons.skip_next_rounded),
                  ),
                  const Spacer(),
                  InkWell(
                    onTap: _cycleSpeed,
                    borderRadius: BorderRadius.circular(999),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 8,
                      ),
                      child: Text(
                        _speed.shortLabel,
                        style: theme.textTheme.labelLarge?.copyWith(
                          fontWeight: FontWeight.w700,
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  _LiveStatus _liveStatus() {
    if (_isComplete || _currentResponse.status.toLowerCase() == 'completed') {
      return const _LiveStatus(
        label: 'Complete',
        color: _completedGreen,
        pulsing: false,
      );
    }

    if (!_hasStarted) {
      return const _LiveStatus(
        label: 'Waiting...',
        color: _pendingGray,
        pulsing: false,
      );
    }

    return const _LiveStatus(
      label: 'Streaming...',
      color: Color(0xFFEA580C),
      pulsing: true,
    );
  }

  String _sliderLabel(double value) {
    if (value <= 0) {
      return 'Start';
    }

    final index = value.ceil().clamp(1, _totalEventCount) - 1;
    final event = _simulationEvents[index];
    return event.type;
  }
}

class _PanelFrame extends StatelessWidget {
  const _PanelFrame({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Material(
      color: theme.colorScheme.surface,
      elevation: 1,
      borderRadius: BorderRadius.circular(12),
      shadowColor: Colors.black.withValues(alpha: 0.08),
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: theme.colorScheme.outlineVariant),
        ),
        child: child,
      ),
    );
  }
}

class _SpeedDropdown extends StatelessWidget {
  const _SpeedDropdown({required this.speed, required this.onChanged});

  final _SimulationSpeed speed;
  final ValueChanged<_SimulationSpeed> onChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      height: 36,
      padding: const EdgeInsets.symmetric(horizontal: 10),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: theme.colorScheme.outlineVariant),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<_SimulationSpeed>(
          value: speed,
          icon: const Icon(Icons.expand_more_rounded, size: 18),
          style: theme.textTheme.bodySmall?.copyWith(
            color: theme.colorScheme.onSurface,
            fontWeight: FontWeight.w600,
          ),
          items: _SimulationSpeed.values
              .map(
                (_SimulationSpeed item) => DropdownMenuItem<_SimulationSpeed>(
                  value: item,
                  child: Text(item.dropdownLabel),
                ),
              )
              .toList(growable: false),
          onChanged: (_SimulationSpeed? value) {
            if (value != null) {
              onChanged(value);
            }
          },
        ),
      ),
    );
  }
}

class _EventRow extends StatelessWidget {
  const _EventRow({
    required this.event,
    required this.eventIndex,
    required this.isCompleted,
    required this.isPending,
    required this.isProcessing,
    required this.isExpanded,
    required this.isRecentlyProcessed,
    required this.timestampMs,
    required this.onToggleExpanded,
    required this.onCopyJson,
  });

  final _SimulationEvent event;
  final int eventIndex;
  final bool isCompleted;
  final bool isPending;
  final bool isProcessing;
  final bool isExpanded;
  final bool isRecentlyProcessed;
  final int? timestampMs;
  final VoidCallback onToggleExpanded;
  final VoidCallback onCopyJson;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    var backgroundColor = theme.colorScheme.surface;
    if (isProcessing || isRecentlyProcessed) {
      backgroundColor = _tintedSurface(theme, _processingBlue);
    }

    final leftBorderColor = isProcessing
        ? _processingBlue
        : (isCompleted ? _completedGreen.withValues(alpha: 0.45) : Colors.transparent);

    Widget content = AnimatedContainer(
      duration: const Duration(milliseconds: 180),
      curve: Curves.easeOut,
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(10),
        border: Border(
          left: BorderSide(color: leftBorderColor, width: 3),
        ),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: isCompleted ? onToggleExpanded : null,
          borderRadius: BorderRadius.circular(10),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(10, 10, 10, 10),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    SizedBox(
                      width: 48,
                      child: Row(
                        children: <Widget>[
                          if (isCompleted)
                            const Icon(
                              Icons.check_circle_rounded,
                              color: _completedGreen,
                              size: 16,
                            ),
                          if (isCompleted) const SizedBox(width: 4),
                          _EventIndexBadge(
                            index: eventIndex + 1,
                            isCompleted: isCompleted,
                            isProcessing: isProcessing,
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: <Widget>[
                          Text(
                            event.type,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: theme.textTheme.labelLarge?.copyWith(
                              fontFamily: 'monospace',
                              fontWeight: FontWeight.w700,
                              color: _eventTypeColor(event.type),
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            event.previewText,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: theme.textTheme.bodySmall?.copyWith(
                              fontFamily: 'monospace',
                              color: theme.colorScheme.onSurfaceVariant,
                              fontSize: 11.5,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 10),
                    SizedBox(
                      width: 68,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: <Widget>[
                          Text(
                            timestampMs == null ? 'pending' : '+${timestampMs}ms',
                            style: theme.textTheme.bodySmall?.copyWith(
                              fontFamily: 'monospace',
                              fontSize: 11,
                              color: theme.colorScheme.onSurfaceVariant,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Icon(
                            isExpanded
                                ? Icons.expand_less_rounded
                                : Icons.expand_more_rounded,
                            size: 18,
                            color: isCompleted
                                ? theme.colorScheme.onSurfaceVariant
                                : theme.colorScheme.outline,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                if (isExpanded && isCompleted)
                  Padding(
                    padding: const EdgeInsets.only(top: 10),
                    child: _ExpandedJsonPayload(
                      payload: event.payload,
                      onCopyPressed: onCopyJson,
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );

    if (isPending) {
      content = Opacity(
        opacity: 0.58,
        child: ImageFiltered(
          imageFilter: ImageFilter.blur(sigmaX: 0.8, sigmaY: 0.8),
          child: content,
        ),
      );
    }

    return content;
  }
}

class _EventIndexBadge extends StatelessWidget {
  const _EventIndexBadge({
    required this.index,
    required this.isCompleted,
    required this.isProcessing,
  });

  final int index;
  final bool isCompleted;
  final bool isProcessing;

  @override
  Widget build(BuildContext context) {
    final color = isCompleted
        ? _completedGreen
        : (isProcessing ? _processingBlue : _pendingGray);

    if (isProcessing) {
      return _PulsingDot(
        active: true,
        activeColor: color,
        inactiveColor: color,
        diameter: 22,
        child: Text(
          '$index',
          style: const TextStyle(
            color: Colors.white,
            fontSize: 10,
            fontWeight: FontWeight.w700,
          ),
        ),
      );
    }

    return Container(
      width: 22,
      height: 22,
      decoration: BoxDecoration(color: color, shape: BoxShape.circle),
      alignment: Alignment.center,
      child: Text(
        '$index',
        style: const TextStyle(
          color: Colors.white,
          fontSize: 10,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _ExpandedJsonPayload extends StatelessWidget {
  const _ExpandedJsonPayload({required this.payload, required this.onCopyPressed});

  final Map<String, dynamic> payload;
  final VoidCallback onCopyPressed;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final pretty = const JsonEncoder.withIndent('  ').convert(payload);

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(8),
      ),
      padding: const EdgeInsets.all(10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            children: <Widget>[
              Text(
                'Event JSON',
                style: theme.textTheme.labelSmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const Spacer(),
              IconButton(
                onPressed: onCopyPressed,
                tooltip: 'Copy JSON',
                icon: const Icon(Icons.copy_rounded, size: 16),
                constraints: const BoxConstraints.tightFor(width: 28, height: 28),
                visualDensity: VisualDensity.compact,
                padding: EdgeInsets.zero,
              ),
            ],
          ),
          const SizedBox(height: 6),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: SelectableText(
              pretty,
              style: theme.textTheme.bodySmall?.copyWith(
                fontFamily: 'monospace',
                fontSize: 12,
                height: 1.45,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _StatusPill extends StatelessWidget {
  const _StatusPill({
    required this.text,
    required this.color,
    required this.pulsing,
  });

  final String text;
  final Color color;
  final bool pulsing;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: _tintedSurface(theme, color),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: color.withValues(alpha: 0.35)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          _PulsingDot(
            active: pulsing,
            activeColor: color,
            inactiveColor: color,
            diameter: 8,
          ),
          const SizedBox(width: 6),
          Text(
            text,
            style: theme.textTheme.labelSmall?.copyWith(
              color: color,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

class _LiveEmptyState extends StatelessWidget {
  const _LiveEmptyState({required this.hasStarted});

  final bool hasStarted;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            Icon(
              hasStarted
                  ? Icons.timelapse_rounded
                  : Icons.hourglass_empty_rounded,
              size: 48,
              color: theme.colorScheme.onSurfaceVariant,
            ),
            const SizedBox(height: 10),
            Text(
              hasStarted
                  ? 'Awaiting next streamed item...'
                  : 'Press play to start the stream simulation.',
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CardEntrance extends StatefulWidget {
  const _CardEntrance({super.key, required this.child});

  final Widget child;

  @override
  State<_CardEntrance> createState() => _CardEntranceState();
}

class _CardEntranceState extends State<_CardEntrance> {
  bool _visible = false;

  @override
  void initState() {
    super.initState();
    Future<void>.delayed(const Duration(milliseconds: 10), () {
      if (!mounted) {
        return;
      }
      setState(() {
        _visible = true;
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedOpacity(
      opacity: _visible ? 1 : 0,
      duration: const Duration(milliseconds: 200),
      curve: Curves.easeOut,
      child: AnimatedSlide(
        offset: _visible ? Offset.zero : const Offset(0, 0.08),
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeOut,
        child: widget.child,
      ),
    );
  }
}

class _LiveCardFrame extends StatelessWidget {
  const _LiveCardFrame({
    required this.accentColor,
    required this.flashComplete,
    required this.child,
    required this.backgroundColor,
  });

  final Color accentColor;
  final bool flashComplete;
  final Widget child;
  final Color backgroundColor;

  @override
  Widget build(BuildContext context) {
    final borderAccent = flashComplete ? _completedGreen : accentColor;

    return AnimatedContainer(
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeOut,
      decoration: BoxDecoration(
        color: flashComplete
            ? _tintedSurface(Theme.of(context), _completedGreen)
            : backgroundColor,
        borderRadius: BorderRadius.circular(10),
        border: Border(left: BorderSide(color: borderAccent, width: 4)),
        boxShadow: <BoxShadow>[
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.06),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      padding: const EdgeInsets.all(14),
      child: child,
    );
  }
}

class _LiveReasoningCard extends StatelessWidget {
  const _LiveReasoningCard({
    required this.item,
    required this.inProgress,
    required this.flashComplete,
    required this.onCopy,
  });

  final ReasoningItem item;
  final bool inProgress;
  final bool flashComplete;
  final VoidCallback onCopy;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    final summary = Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(8),
      ),
      padding: const EdgeInsets.all(10),
      child: Text(
        item.summaryText.isEmpty ? 'Thinking...' : item.summaryText,
        style: theme.textTheme.bodyMedium?.copyWith(height: 1.4),
      ),
    );

    return _LiveCardFrame(
      accentColor: _reasoningAccent,
      flashComplete: flashComplete,
      backgroundColor: _tintedSurface(theme, _reasoningAccent),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            children: <Widget>[
              const Icon(Icons.psychology_alt_rounded, color: _reasoningAccent),
              const SizedBox(width: 8),
              Text(
                'Reasoning',
                style: theme.textTheme.titleSmall?.copyWith(
                  color: _reasoningAccent,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const Spacer(),
              _SmallCopyButton(onPressed: onCopy),
            ],
          ),
          const SizedBox(height: 10),
          _Shimmer(active: inProgress, child: summary),
        ],
      ),
    );
  }
}

class _LiveFunctionCallCard extends StatelessWidget {
  const _LiveFunctionCallCard({
    required this.item,
    required this.argumentsText,
    required this.inProgress,
    required this.flashComplete,
    required this.onCopy,
  });

  final FunctionCallItem item;
  final String argumentsText;
  final bool inProgress;
  final bool flashComplete;
  final VoidCallback onCopy;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    final argumentsBox = Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(8),
      ),
      padding: const EdgeInsets.all(10),
      child: _CharacterRevealText(
        text: argumentsText,
        animate: inProgress,
      ),
    );

    return _LiveCardFrame(
      accentColor: _functionAccent,
      flashComplete: flashComplete,
      backgroundColor: _tintedSurface(theme, _functionAccent),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            children: <Widget>[
              const Icon(Icons.functions_rounded, color: _functionAccent),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  item.name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.titleSmall?.copyWith(
                    color: _functionAccent,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              _SmallCopyButton(onPressed: onCopy),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            'call_id: ${item.callId}',
            style: theme.textTheme.bodySmall?.copyWith(
              fontFamily: 'monospace',
              color: theme.colorScheme.onSurfaceVariant,
              fontSize: 12,
            ),
          ),
          const SizedBox(height: 10),
          Text(
            'Arguments',
            style: theme.textTheme.labelLarge?.copyWith(
              color: _functionAccent,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 6),
          _Shimmer(active: inProgress, child: argumentsBox),
        ],
      ),
    );
  }
}

class _LiveFunctionOutputCard extends StatelessWidget {
  const _LiveFunctionOutputCard({
    required this.item,
    required this.inProgress,
    required this.flashComplete,
    required this.onCopy,
  });

  final FunctionCallOutputItem item;
  final bool inProgress;
  final bool flashComplete;
  final VoidCallback onCopy;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final outputText = const JsonEncoder.withIndent('  ').convert(item.parsedOutput);

    final outputBox = Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(8),
      ),
      padding: const EdgeInsets.all(10),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Text(
          outputText,
          style: theme.textTheme.bodySmall?.copyWith(
            fontFamily: 'monospace',
            fontSize: 12.5,
            height: 1.4,
          ),
        ),
      ),
    );

    return _LiveCardFrame(
      accentColor: _outputAccent,
      flashComplete: flashComplete,
      backgroundColor: _tintedSurface(theme, _outputAccent),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            children: <Widget>[
              const Icon(Icons.check_circle_rounded, color: _outputAccent),
              const SizedBox(width: 8),
              Text(
                'Function Output',
                style: theme.textTheme.titleSmall?.copyWith(
                  color: _outputAccent,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const Spacer(),
              _SmallCopyButton(onPressed: onCopy),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            'call_id: ${item.callId}',
            style: theme.textTheme.bodySmall?.copyWith(
              fontFamily: 'monospace',
              color: theme.colorScheme.onSurfaceVariant,
              fontSize: 12,
            ),
          ),
          const SizedBox(height: 10),
          _Shimmer(active: inProgress, child: outputBox),
        ],
      ),
    );
  }
}

class _LiveMessageCard extends StatelessWidget {
  const _LiveMessageCard({
    required this.item,
    required this.inProgress,
    required this.flashComplete,
    required this.onCopy,
  });

  final MessageItem item;
  final bool inProgress;
  final bool flashComplete;
  final VoidCallback onCopy;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return _LiveCardFrame(
      accentColor: _messageAccent,
      flashComplete: flashComplete,
      backgroundColor: theme.colorScheme.surface,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            children: <Widget>[
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: _functionAccent,
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  item.role,
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              const Spacer(),
              _SmallCopyButton(onPressed: onCopy),
            ],
          ),
          const SizedBox(height: 10),
          _WordByWordStreamingText(
            text: item.text,
            inProgress: inProgress,
          ),
        ],
      ),
    );
  }
}

class _LiveUnknownCard extends StatelessWidget {
  const _LiveUnknownCard({
    required this.raw,
    required this.flashComplete,
    required this.onCopy,
  });

  final Map<String, dynamic> raw;
  final bool flashComplete;
  final VoidCallback onCopy;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final rawText = const JsonEncoder.withIndent('  ').convert(raw);

    return _LiveCardFrame(
      accentColor: _unknownAccent,
      flashComplete: flashComplete,
      backgroundColor: _tintedSurface(theme, _unknownAccent),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            children: <Widget>[
              const Icon(Icons.warning_amber_rounded, color: _unknownAccent),
              const SizedBox(width: 8),
              Text(
                'Unknown Item',
                style: theme.textTheme.titleSmall?.copyWith(
                  color: _unknownAccent,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const Spacer(),
              _SmallCopyButton(onPressed: onCopy),
            ],
          ),
          const SizedBox(height: 10),
          Container(
            width: double.infinity,
            decoration: BoxDecoration(
              color: theme.colorScheme.surfaceContainerHighest,
              borderRadius: BorderRadius.circular(8),
            ),
            padding: const EdgeInsets.all(10),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Text(
                rawText,
                style: theme.textTheme.bodySmall?.copyWith(
                  fontFamily: 'monospace',
                  fontSize: 12,
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

class _SmallCopyButton extends StatelessWidget {
  const _SmallCopyButton({required this.onPressed});

  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return IconButton(
      onPressed: onPressed,
      tooltip: 'Copy',
      icon: const Icon(Icons.copy_rounded, size: 18),
      constraints: const BoxConstraints.tightFor(width: 30, height: 30),
      visualDensity: VisualDensity.compact,
      padding: EdgeInsets.zero,
    );
  }
}

class _CharacterRevealText extends StatefulWidget {
  const _CharacterRevealText({required this.text, required this.animate});

  final String text;
  final bool animate;

  @override
  State<_CharacterRevealText> createState() => _CharacterRevealTextState();
}

class _CharacterRevealTextState extends State<_CharacterRevealText> {
  Timer? _revealTimer;
  int _visibleChars = 0;

  @override
  void initState() {
    super.initState();
    _visibleChars = widget.text.length;
  }

  @override
  void didUpdateWidget(covariant _CharacterRevealText oldWidget) {
    super.didUpdateWidget(oldWidget);

    if (widget.text == oldWidget.text) {
      return;
    }

    if (!widget.animate || widget.text.length <= oldWidget.text.length) {
      _revealTimer?.cancel();
      setState(() {
        _visibleChars = widget.text.length;
      });
      return;
    }

    _revealTimer?.cancel();
    _visibleChars = math.min(oldWidget.text.length, widget.text.length);

    _revealTimer = Timer.periodic(const Duration(milliseconds: 16), (Timer t) {
      if (!mounted) {
        t.cancel();
        return;
      }

      if (_visibleChars >= widget.text.length) {
        t.cancel();
        return;
      }

      setState(() {
        _visibleChars += 1;
      });
    });
  }

  @override
  void dispose() {
    _revealTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final visible = widget.text.substring(0, _visibleChars.clamp(0, widget.text.length));

    return Text(
      visible,
      style: Theme.of(context).textTheme.bodySmall?.copyWith(
        fontFamily: 'monospace',
        fontSize: 12.5,
        height: 1.4,
      ),
    );
  }
}

class _WordByWordStreamingText extends StatefulWidget {
  const _WordByWordStreamingText({required this.text, required this.inProgress});

  final String text;
  final bool inProgress;

  @override
  State<_WordByWordStreamingText> createState() => _WordByWordStreamingTextState();
}

class _WordByWordStreamingTextState extends State<_WordByWordStreamingText> {
  Timer? _revealTimer;
  Timer? _cursorTimer;
  int _visibleWordCount = 0;
  bool _cursorVisible = true;

  List<String> get _words {
    final source = widget.text.trim();
    if (source.isEmpty) {
      return const <String>[];
    }
    return source.split(RegExp(r'\s+'));
  }

  @override
  void initState() {
    super.initState();
    _visibleWordCount = _words.length;
    _startCursorTimer();
  }

  @override
  void didUpdateWidget(covariant _WordByWordStreamingText oldWidget) {
    super.didUpdateWidget(oldWidget);

    final oldWords = oldWidget.text.trim().isEmpty
        ? const <String>[]
        : oldWidget.text.trim().split(RegExp(r'\s+'));
    final targetWords = _words;

    if (!widget.inProgress) {
      _revealTimer?.cancel();
      setState(() {
        _visibleWordCount = targetWords.length;
      });
      return;
    }

    if (targetWords.length <= oldWords.length) {
      return;
    }

    _revealTimer?.cancel();
    _visibleWordCount = oldWords.length;

    _revealTimer = Timer.periodic(const Duration(milliseconds: 70), (Timer t) {
      if (!mounted) {
        t.cancel();
        return;
      }

      if (_visibleWordCount >= targetWords.length) {
        t.cancel();
        return;
      }

      setState(() {
        _visibleWordCount += 1;
      });
    });
  }

  @override
  void dispose() {
    _revealTimer?.cancel();
    _cursorTimer?.cancel();
    super.dispose();
  }

  void _startCursorTimer() {
    _cursorTimer = Timer.periodic(const Duration(milliseconds: 450), (Timer t) {
      if (!mounted) {
        t.cancel();
        return;
      }

      setState(() {
        _cursorVisible = !_cursorVisible;
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    final words = _words;
    final visibleWords = words.take(_visibleWordCount.clamp(0, words.length));
    final text = visibleWords.join(' ');

    return RichText(
      text: TextSpan(
        style: Theme.of(context).textTheme.bodyMedium?.copyWith(height: 1.45),
        children: <InlineSpan>[
          TextSpan(text: text),
          if (widget.inProgress)
            TextSpan(
              text: _cursorVisible ? ' |' : '  ',
              style: TextStyle(
                color: Theme.of(context).colorScheme.primary,
                fontWeight: FontWeight.w700,
              ),
            ),
        ],
      ),
    );
  }
}

class _Shimmer extends StatefulWidget {
  const _Shimmer({required this.active, required this.child});

  final bool active;
  final Widget child;

  @override
  State<_Shimmer> createState() => _ShimmerState();
}

class _ShimmerState extends State<_Shimmer>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1100),
    );

    if (widget.active) {
      _controller.repeat();
    }
  }

  @override
  void didUpdateWidget(covariant _Shimmer oldWidget) {
    super.didUpdateWidget(oldWidget);

    if (oldWidget.active == widget.active) {
      return;
    }

    if (widget.active) {
      _controller.repeat();
    } else {
      _controller.stop();
      _controller.value = 0;
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.active) {
      return widget.child;
    }

    final isDark = Theme.of(context).brightness == Brightness.dark;
    final base = isDark ? const Color(0xFF374151) : const Color(0xFFE5E7EB);
    final highlight = isDark ? const Color(0xFF4B5563) : Colors.white;

    return AnimatedBuilder(
      animation: _controller,
      builder: (BuildContext context, Widget? child) {
        final value = _controller.value;
        return ShaderMask(
          blendMode: BlendMode.srcATop,
          shaderCallback: (Rect bounds) {
            return LinearGradient(
              begin: Alignment(-1.0 + (2.5 * value), 0),
              end: Alignment(0.2 + (2.5 * value), 0),
              colors: <Color>[base, highlight, base],
              stops: const <double>[0.1, 0.45, 0.9],
            ).createShader(bounds);
          },
          child: child,
        );
      },
      child: widget.child,
    );
  }
}

class _PulsingDot extends StatefulWidget {
  const _PulsingDot({
    required this.active,
    required this.activeColor,
    required this.inactiveColor,
    required this.diameter,
    this.child,
  });

  final bool active;
  final Color activeColor;
  final Color inactiveColor;
  final double diameter;
  final Widget? child;

  @override
  State<_PulsingDot> createState() => _PulsingDotState();
}

class _PulsingDotState extends State<_PulsingDot>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
      lowerBound: 0,
      upperBound: 1,
    );

    if (widget.active) {
      _controller.repeat(reverse: true);
    }
  }

  @override
  void didUpdateWidget(covariant _PulsingDot oldWidget) {
    super.didUpdateWidget(oldWidget);

    if (oldWidget.active == widget.active) {
      return;
    }

    if (widget.active) {
      _controller.repeat(reverse: true);
    } else {
      _controller.stop();
      _controller.value = 0;
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final color = widget.active ? widget.activeColor : widget.inactiveColor;

    return AnimatedBuilder(
      animation: _controller,
      builder: (BuildContext context, Widget? child) {
        final pulse = widget.active ? (0.82 + (_controller.value * 0.2)) : 1.0;
        return Transform.scale(
          scale: pulse,
          child: Container(
            width: widget.diameter,
            height: widget.diameter,
            decoration: BoxDecoration(
              color: color,
              shape: BoxShape.circle,
              boxShadow: widget.active
                  ? <BoxShadow>[
                      BoxShadow(
                        color: color.withValues(alpha: 0.5),
                        blurRadius: 8,
                        spreadRadius: 1,
                      ),
                    ]
                  : null,
            ),
            alignment: Alignment.center,
            child: child,
          ),
        );
      },
      child: widget.child,
    );
  }
}

class _LiveStatus {
  const _LiveStatus({
    required this.label,
    required this.color,
    required this.pulsing,
  });

  final String label;
  final Color color;
  final bool pulsing;
}

class _SimulationEvent {
  const _SimulationEvent({
    required this.delayAfterPreviousMs,
    required this.payload,
  });

  final int delayAfterPreviousMs;
  final Map<String, dynamic> payload;

  String get type => _asString(payload['type']);

  String get previewText => jsonEncode(payload);
}

String _argumentsToText(Map<String, dynamic> arguments) {
  if (arguments.containsKey('raw_arguments')) {
    return _asString(arguments['raw_arguments']);
  }
  if (arguments.isEmpty) {
    return '';
  }
  return const JsonEncoder.withIndent('  ').convert(arguments);
}

Color _eventTypeColor(String type) {
  switch (type) {
    case 'response.output_item.added':
      return const Color(0xFF2563EB);
    case 'response.output_text.delta':
      return const Color(0xFF7C3AED);
    case 'response.function_call_arguments.delta':
      return const Color(0xFFEA580C);
    case 'response.output_item.done':
      return const Color(0xFF16A34A);
    case 'response.completed':
      return const Color(0xFF0D9488);
    default:
      return _pendingGray;
  }
}

Map<String, dynamic> _normalizeMap(dynamic value) {
  if (value is Map<String, dynamic>) {
    return value;
  }
  if (value is Map) {
    return value.map(
      (dynamic key, dynamic mapValue) => MapEntry(key.toString(), mapValue),
    );
  }
  return <String, dynamic>{};
}

int? _asInt(dynamic value) {
  if (value is int) {
    return value;
  }
  if (value is num) {
    return value.toInt();
  }
  if (value is String) {
    return int.tryParse(value);
  }
  return null;
}

String _asString(dynamic value, {String fallback = ''}) {
  if (value is String) {
    return value;
  }
  if (value == null) {
    return fallback;
  }
  return value.toString();
}

Color _tintedSurface(ThemeData theme, Color accent) {
  final opacity = theme.brightness == Brightness.dark ? 0.22 : 0.1;
  return Color.alphaBlend(
    accent.withValues(alpha: opacity),
    theme.colorScheme.surface,
  );
}
