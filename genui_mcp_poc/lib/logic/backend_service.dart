class BackendService {
  // Simulates an AWS Lambda / MCP Orchestrator
  static Future<dynamic> processRequest(String intent) async {
    // 1. Simulate Network Latency (The "Uplifting" part - feels real!)
    await Future.delayed(const Duration(seconds: 2));

    // 2. Mock Logic: In a real app, this would be an API call to AWS
    if (intent == "fetch_user") {
      return {
        "username": "Banashankari21",
        "role": "GSoC '26 Developer",
        "bio": "Simulated response from AWS Lambda Orchestrator.",
        "avatar": "https://github.com/Banashankari21.png"
      };
    } else if (intent == "trigger_error") {
      return {
        "status_code": 500,
        "message": "AWS Gateway Timeout: MCP Server unreachable."
      };
    }
    return "Processed by Backend: I found your requested data.";
  }
}