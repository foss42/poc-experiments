class DiagnosticReport {
  final String nodeId;
  final String nodeName;
  final String failureType;
  final int? expectedStatus;
  final int? actualStatus;
  final String? responsePreview;
  final List<String> possibleCauses;
  final List<String> suggestedFixes;
  final String? selfHealingProposal;
  final Map<String, String> contextAtFailure;

  const DiagnosticReport({
    required this.nodeId,
    required this.nodeName,
    required this.failureType,
    this.expectedStatus,
    this.actualStatus,
    this.responsePreview,
    required this.possibleCauses,
    required this.suggestedFixes,
    this.selfHealingProposal,
    required this.contextAtFailure,
  });
}
