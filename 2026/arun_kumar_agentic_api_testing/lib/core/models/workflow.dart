import 'workflow_node.dart';
import 'workflow_edge.dart';

class Workflow {
  final String id;
  final String name;
  final String description;
  final List<WorkflowNode> nodes;
  final List<WorkflowEdge> edges;

  const Workflow({
    required this.id,
    required this.name,
    required this.description,
    required this.nodes,
    required this.edges,
  });

  WorkflowNode? getNode(String nodeId) {
    for (final node in nodes) {
      if (node.id == nodeId) return node;
    }
    return null;
  }

  List<String> getDependencies(String nodeId) {
    return edges.where((e) => e.to == nodeId).map((e) => e.from).toList();
  }

  List<String> getDependents(String nodeId) {
    return edges.where((e) => e.from == nodeId).map((e) => e.to).toList();
  }
}
