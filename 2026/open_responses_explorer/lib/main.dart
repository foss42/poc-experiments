import 'package:flutter/material.dart';

import 'domain/response_models.dart';
import 'screens/response_explorer_screen.dart';

void main() {
  runApp(const OpenResponsesExplorerApp());
}

class OpenResponsesExplorerApp extends StatelessWidget {
  const OpenResponsesExplorerApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Open Responses Explorer',
      themeMode: ThemeMode.system,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF2563EB)),
        scaffoldBackgroundColor: const Color(0xFFF8FAFC),
      ),
      darkTheme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF2563EB),
          brightness: Brightness.dark,
        ),
      ),
      home: ResponseExplorerScreen(response: _sampleParsedResponse()),
    );
  }
}

ParsedResponse _sampleParsedResponse() {
  final tokyoCall = FunctionCallItem(
    id: 'fc_001',
    callId: 'call_weather_tokyo',
    name: 'get_current_weather',
    arguments: <String, dynamic>{'city': 'Tokyo', 'unit': 'celsius'},
  );

  final tokyoOutput = FunctionCallOutputItem(
    callId: 'call_weather_tokyo',
    parsedOutput: <String, dynamic>{
      'city': 'Tokyo',
      'temperature': 21,
      'condition': 'Partly Cloudy',
      'humidity': 58,
    },
  );

  final londonCall = FunctionCallItem(
    id: 'fc_002',
    callId: 'call_weather_london',
    name: 'get_current_weather',
    arguments: <String, dynamic>{'city': 'London', 'unit': 'celsius'},
  );

  final londonOutput = FunctionCallOutputItem(
    callId: 'call_weather_london',
    parsedOutput: <String, dynamic>{
      'city': 'London',
      'temperature': 13,
      'condition': 'Rain',
      'humidity': 76,
    },
  );

  return ParsedResponse(
    id: 'resp_demo_001',
    status: 'completed',
    model: 'gpt-4o',
    totalTokens: 1247,
    items: <ResponseItem>[
      const ReasoningItem(
        id: 'rsn_001',
        summaryText:
            'I should call weather tools for both requested cities before answering. '
            'Once outputs arrive, I can summarize temperatures and conditions clearly.',
      ),
      tokyoCall,
      tokyoOutput,
      londonCall,
      londonOutput,
      const MessageItem(
        role: 'assistant',
        text:
            'Tokyo is currently warmer and partly cloudy, while London is cooler with rain.',
      ),
      const UnknownItem(
        raw: <String, dynamic>{
          'type': 'future_reasoning_trace',
          'version': 2,
          'payload': <String, dynamic>{
            'detail':
                'This fake future item demonstrates forward compatibility.',
          },
        },
      ),
    ],
    correlatedCalls: <CorrelatedCall>[
      CorrelatedCall(call: tokyoCall, output: tokyoOutput, isComplete: true),
      CorrelatedCall(call: londonCall, output: londonOutput, isComplete: true),
    ],
  );
}
