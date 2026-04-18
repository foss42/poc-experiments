import 'dart:convert';

/// Domain Model: Represents the state of a Request in API Dash.
/// Using a class instead of a raw Map ensures type safety across the app.
class RequestModel {
  final String url;
  final Map<String, dynamic> body;
  final String userAgent;

  const RequestModel({
    required this.url,
    required this.body,
    this.userAgent = 'API Dash/1.0',
  });
}

/// Abstract Base: Ensures every new language added follows the same contract.
abstract class CodeGenerator {
  String generate(RequestModel request);
}

/// Implementation: Focused strictly on Python 'requests' logic.
class PythonRequestsGenerator implements CodeGenerator {
  final int indent;

  const PythonRequestsGenerator({this.indent = 4});

  @override
  String generate(RequestModel request) {
    final encoder = JsonEncoder.withIndent(' ' * indent);
    final String prettyJson = encoder.convert(request.body);

    // Using a raw string block with clear escaping for Python syntax.
    return '''
import requests
import json

url = "${request.url}"
headers = {
    "User-Agent": "${request.userAgent}"
}

response = requests.get(url, headers=headers)

# DX Enhancement: Pretty-printing the structured data
data = $prettyJson
print(json.dumps(data, indent=$indent))
''';
  }
}

void main() {
  // 1. Setup Mock Data
  final mockRequest = RequestModel(
    url: "https://api.nasa.gov/planetary/apod",
    body: {
      "id": 101,
      "message": "GSoC 2026 PoC for API Dash",
      "features": ["Pretty-Print", "User-Agent Presets"]
    },
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) API-Dash/2026",
  );

  // 2. Initialize the Service
  // This allows us to swap PythonRequestsGenerator for Dart or Go easily.
  final CodeGenerator generator = const PythonRequestsGenerator(indent: 4);

  // 3. Execution
  print("--- API Dash DX Enhancement: CodeGen Engine ---");
  
  try {
    final snippet = generator.generate(mockRequest);
    print("\n[Generated Snippet]:\n$snippet");
  } catch (e) {
    print("Error generating snippet: $e");
  }
}
