class WorkflowEdge {
  final String from;
  final String to;
  final String? condition;

  const WorkflowEdge({
    required this.from,
    required this.to,
    this.condition,
  });
}
