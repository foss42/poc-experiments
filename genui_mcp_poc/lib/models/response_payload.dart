enum UIComponentType { text, card, dataTable, error }

class AgentResponse {
  final dynamic data;
  final UIComponentType targetUI;

  AgentResponse({required this.data, required this.targetUI});
}