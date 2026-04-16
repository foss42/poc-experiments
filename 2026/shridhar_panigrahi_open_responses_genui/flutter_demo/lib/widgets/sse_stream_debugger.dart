import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../design.dart';
import '../models/open_responses.dart';
import 'open_responses_viewer.dart';

// ---------------------------------------------------------------------------
// Data model
// ---------------------------------------------------------------------------

class _SseEvent {
  const _SseEvent({
    required this.type,
    required this.label,
    required this.rawLines,
    this.json,
  });

  final String type;
  final String label;
  final List<String> rawLines;
  final Map<String, dynamic>? json;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

List<_SseEvent> _parseEvents(List<String> sseLines) {
  final events = <_SseEvent>[];
  final current = <String>[];

  void flush() {
    if (current.isEmpty) return;
    events.add(_makeEvent(List.of(current)));
    current.clear();
  }

  for (final line in sseLines) {
    if (line.trim().isEmpty) {
      flush();
    } else {
      if (line.trim().startsWith('data: ') &&
          current.any((l) => l.trim().startsWith('data: '))) {
        flush();
      }
      current.add(line);
    }
  }
  flush();
  return events;
}

_SseEvent _makeEvent(List<String> lines) {
  Map<String, dynamic>? json;
  String type = 'unknown';

  for (final line in lines) {
    final t = line.trim();
    if (t.startsWith('data: ')) {
      final data = t.substring(6).trim();
      if (data == '[DONE]') {
        type = 'done';
        break;
      }
      try {
        final j = jsonDecode(data) as Map<String, dynamic>;
        json = j;
        type = j['type'] as String? ?? 'unknown';
      } catch (_) {}
    }
  }

  return _SseEvent(
    type: type,
    label: _shortLabel(type),
    rawLines: lines,
    json: json,
  );
}

String _shortLabel(String type) => switch (type) {
      'response.created' => 'created',
      'response.output_item.added' => 'item added',
      'response.output_text.delta' => 'text δ',
      'response.reasoning_summary_text.delta' => 'reasoning δ',
      'response.function_call_arguments.delta' => 'fn args δ',
      'response.output_item.done' => 'item done',
      'response.completed' => 'completed',
      'response.failed' => 'failed',
      'done' => '[DONE]',
      _ => type.replaceFirst('response.', ''),
    };

Color _eventColor(String type, ThemeData theme) => switch (type) {
      'response.created' || 'response.completed' => theme.colorScheme.primary,
      'response.output_item.added' ||
      'response.output_item.done' =>
        theme.colorScheme.secondary,
      'response.output_text.delta' => Colors.green.shade600,
      String t when t.contains('reasoning') => Colors.purple.shade400,
      String t when t.contains('function_call') => Colors.orange.shade600,
      'response.failed' => theme.colorScheme.error,
      _ => theme.colorScheme.outline,
    };

// ---------------------------------------------------------------------------
// SseStreamDebugger
//
// Replays a real Open Responses SSE stream event by event so developers
// can see exactly how the agent's response was built — which items appeared
// first, when tool calls resolved, where reasoning ended and the message
// began. Works with actual response data captured by APIDash, not a
// simulation.
// ---------------------------------------------------------------------------

class SseStreamDebugger extends StatefulWidget {
  const SseStreamDebugger({super.key, required this.sseLines});

  final List<String> sseLines;

  @override
  State<SseStreamDebugger> createState() => _SseStreamDebuggerState();
}

class _SseStreamDebuggerState extends State<SseStreamDebugger> {
  late List<_SseEvent> _events;
  int _step = 0;
  bool _isPlaying = false;
  double _speed = 1.0;
  Timer? _timer;

  final _timelineController = ScrollController();
  static const _baseIntervalMs = 350;

  @override
  void initState() {
    super.initState();
    _events = _parseEvents(widget.sseLines);
  }

  @override
  void didUpdateWidget(SseStreamDebugger old) {
    super.didUpdateWidget(old);
    if (old.sseLines != widget.sseLines) {
      _timer?.cancel();
      _events = _parseEvents(widget.sseLines);
      _step = 0;
      _isPlaying = false;
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    _timelineController.dispose();
    super.dispose();
  }

  void _play() {
    if (_step >= _events.length) _step = 0;
    setState(() => _isPlaying = true);
    _scheduleNext();
  }

  void _pause() {
    _timer?.cancel();
    setState(() => _isPlaying = false);
  }

  void _scheduleNext() {
    _timer?.cancel();
    _timer = Timer(
      Duration(milliseconds: (_baseIntervalMs / _speed).round()),
      () {
        if (!mounted) return;
        if (_step < _events.length) {
          setState(() => _step++);
          _scrollTimeline();
          if (_step < _events.length) {
            _scheduleNext();
          } else {
            setState(() => _isPlaying = false);
          }
        }
      },
    );
  }

  void _stepForward() {
    _pause();
    if (_step < _events.length) setState(() => _step++);
    _scrollTimeline();
  }

  void _stepBack() {
    _pause();
    if (_step > 0) setState(() => _step--);
    _scrollTimeline();
  }

  void _reset() {
    _pause();
    setState(() => _step = 0);
    if (_timelineController.hasClients) {
      _timelineController.animateTo(0,
          duration: const Duration(milliseconds: 200), curve: Curves.easeOut);
    }
  }

  void _jumpTo(int index) {
    _pause();
    setState(() => _step = index + 1);
    _scrollTimeline();
  }

  void _scrollTimeline() {
    if (!_timelineController.hasClients || _events.isEmpty) return;
    const rowHeight = 40.0;
    final target = (_step - 1).clamp(0, _events.length - 1) * rowHeight;
    _timelineController.animateTo(
      target,
      duration: const Duration(milliseconds: 200),
      curve: Curves.easeOut,
    );
  }

  List<OutputItem> get _currentItems {
    if (_step == 0 || _events.isEmpty) return [];
    final lines = _events
        .sublist(0, _step)
        .expand((e) => e.rawLines)
        .toList();
    return OpenResponsesStreamParser.parse(lines);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (_events.isEmpty) {
      return Center(
        child: Text('No SSE events to replay',
            style: theme.textTheme.bodyMedium
                ?.copyWith(color: theme.colorScheme.outline)),
      );
    }

    return Column(
      children: [
        _ControlsBar(
          step: _step,
          total: _events.length,
          isPlaying: _isPlaying,
          speed: _speed,
          onPlay: _play,
          onPause: _pause,
          onStepBack: _stepBack,
          onStepForward: _stepForward,
          onReset: _reset,
          onSpeedChanged: (s) => setState(() => _speed = s),
          onScrub: (v) {
            _pause();
            setState(() => _step = v.round());
          },
        ),
        Expanded(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SizedBox(
                width: 196,
                child: _EventTimeline(
                  events: _events,
                  currentStep: _step,
                  scrollController: _timelineController,
                  onTap: _jumpTo,
                ),
              ),
              VerticalDivider(
                  width: 1, color: theme.colorScheme.outlineVariant),
              Expanded(
                child: _LiveRender(
                  items: _currentItems,
                  step: _step,
                  total: _events.length,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Controls bar
// ---------------------------------------------------------------------------

class _ControlsBar extends StatelessWidget {
  const _ControlsBar({
    required this.step,
    required this.total,
    required this.isPlaying,
    required this.speed,
    required this.onPlay,
    required this.onPause,
    required this.onStepBack,
    required this.onStepForward,
    required this.onReset,
    required this.onSpeedChanged,
    required this.onScrub,
  });

  final int step, total;
  final bool isPlaying;
  final double speed;
  final VoidCallback onPlay, onPause, onStepBack, onStepForward, onReset;
  final ValueChanged<double> onSpeedChanged, onScrub;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final done = step >= total;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerLow,
        border: Border(
          bottom: BorderSide(color: theme.colorScheme.outlineVariant),
        ),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              _CtrlBtn(icon: Icons.restart_alt_rounded, tooltip: 'Reset', onTap: onReset),
              kHSpacer4,
              _CtrlBtn(
                  icon: Icons.skip_previous_rounded,
                  tooltip: 'Step back',
                  onTap: step > 0 ? onStepBack : null),
              kHSpacer4,
              SizedBox(
                width: 32,
                height: 32,
                child: FilledButton(
                  onPressed: isPlaying ? onPause : onPlay,
                  style: FilledButton.styleFrom(
                    padding: EdgeInsets.zero,
                    minimumSize: const Size(32, 32),
                    shape: const CircleBorder(),
                  ),
                  child: Icon(
                    done
                        ? Icons.replay_rounded
                        : isPlaying
                            ? Icons.pause_rounded
                            : Icons.play_arrow_rounded,
                    size: 16,
                  ),
                ),
              ),
              kHSpacer4,
              _CtrlBtn(
                  icon: Icons.skip_next_rounded,
                  tooltip: 'Step forward',
                  onTap: step < total ? onStepForward : null),
              kHSpacer8,
              _SpeedSelector(speed: speed, onChanged: onSpeedChanged),
              const Spacer(),
              Text(
                '$step / $total',
                style: theme.textTheme.labelSmall?.copyWith(
                  color: theme.colorScheme.outline,
                  fontFeatures: const [FontFeature.tabularFigures()],
                ),
              ),
            ],
          ),
          kVSpacer5,
          SliderTheme(
            data: SliderTheme.of(context).copyWith(
              trackHeight: 3,
              thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 6),
              overlayShape: const RoundSliderOverlayShape(overlayRadius: 12),
            ),
            child: Slider(
              value: step.toDouble(),
              min: 0,
              max: total.toDouble(),
              divisions: total > 0 ? total : 1,
              onChanged: total > 0 ? onScrub : null,
            ),
          ),
        ],
      ),
    );
  }
}

class _CtrlBtn extends StatelessWidget {
  const _CtrlBtn(
      {required this.icon, required this.tooltip, required this.onTap});
  final IconData icon;
  final String tooltip;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: tooltip,
      child: SizedBox(
        width: 30,
        height: 30,
        child: IconButton(
          padding: EdgeInsets.zero,
          iconSize: 18,
          icon: Icon(icon),
          onPressed: onTap,
          color: onTap == null
              ? Theme.of(context).colorScheme.outlineVariant
              : Theme.of(context).colorScheme.onSurface,
        ),
      ),
    );
  }
}

class _SpeedSelector extends StatelessWidget {
  const _SpeedSelector({required this.speed, required this.onChanged});
  final double speed;
  final ValueChanged<double> onChanged;

  static const _options = [0.5, 1.0, 2.0, 4.0];

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        border: Border.all(color: theme.colorScheme.outlineVariant),
        borderRadius: BorderRadius.circular(6),
      ),
      child: DropdownButton<double>(
        value: speed,
        isDense: true,
        underline: const SizedBox.shrink(),
        style: theme.textTheme.labelSmall
            ?.copyWith(color: theme.colorScheme.onSurface),
        items: _options
            .map((s) => DropdownMenuItem(value: s, child: Text('${s}x')))
            .toList(),
        onChanged: (v) => onChanged(v!),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Event timeline
// ---------------------------------------------------------------------------

class _EventTimeline extends StatelessWidget {
  const _EventTimeline({
    required this.events,
    required this.currentStep,
    required this.scrollController,
    required this.onTap,
  });

  final List<_SseEvent> events;
  final int currentStep;
  final ScrollController scrollController;
  final ValueChanged<int> onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(10, 8, 8, 5),
          child: Text(
            'EVENT TIMELINE',
            style: theme.textTheme.labelSmall?.copyWith(
              color: theme.colorScheme.outline,
              letterSpacing: 0.8,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
        Expanded(
          child: ListView.builder(
            controller: scrollController,
            padding: const EdgeInsets.only(bottom: 8),
            itemCount: events.length,
            itemExtent: 40,
            itemBuilder: (context, i) {
              final event = events[i];
              final isPlayed = i < currentStep;
              final isCurrent = i == currentStep - 1;
              final color = _eventColor(event.type, theme);

              return InkWell(
                onTap: () => onTap(i),
                child: Container(
                  color: isCurrent
                      ? color.withValues(alpha: 0.1)
                      : Colors.transparent,
                  padding: const EdgeInsets.symmetric(horizontal: 10),
                  child: Row(
                    children: [
                      Container(
                        width: 8,
                        height: 8,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: isPlayed
                              ? color
                              : theme.colorScheme.outlineVariant,
                          border: isCurrent
                              ? Border.all(color: color, width: 2)
                              : null,
                        ),
                      ),
                      kHSpacer8,
                      Expanded(
                        child: Text(
                          event.label,
                          style: kCodeStyle.copyWith(
                            fontSize: 11,
                            color: isPlayed
                                ? (isCurrent
                                    ? color
                                    : theme.colorScheme.onSurface)
                                : theme.colorScheme.outlineVariant,
                            fontWeight: isCurrent
                                ? FontWeight.w700
                                : FontWeight.normal,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      if (isCurrent && event.json != null)
                        GestureDetector(
                          onTap: () {
                            final pretty = const JsonEncoder.withIndent('  ')
                                .convert(event.json);
                            Clipboard.setData(ClipboardData(text: pretty));
                          },
                          child: Icon(Icons.copy_rounded,
                              size: 10,
                              color: theme.colorScheme.outline),
                        ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Live render
// ---------------------------------------------------------------------------

class _LiveRender extends StatelessWidget {
  const _LiveRender({
    required this.items,
    required this.step,
    required this.total,
  });

  final List<OutputItem> items;
  final int step, total;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (step == 0) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.play_circle_outline_rounded,
                size: 40, color: theme.colorScheme.outlineVariant),
            kVSpacer8,
            Text(
              'Press play to replay the stream',
              style: theme.textTheme.bodySmall
                  ?.copyWith(color: theme.colorScheme.outline),
            ),
            kVSpacer5,
            Text(
              'or click any event in the timeline to jump to it',
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.outlineVariant,
                fontSize: 11,
              ),
            ),
          ],
        ),
      );
    }

    if (items.isEmpty) {
      return Center(
        child: Text(
          'Waiting for first output item...',
          style: theme.textTheme.bodySmall
              ?.copyWith(color: theme.colorScheme.outline),
        ),
      );
    }

    final result = OpenResponsesResult(
      id: '',
      model: '',
      status: step < total ? 'in_progress' : 'completed',
      output: items,
    );

    return OpenResponsesViewer(result: result);
  }
}
