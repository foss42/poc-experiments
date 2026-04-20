import '../models/execution_result.dart';

class NodeStateMachine {
  final String nodeId;
  NodeStatus _state = NodeStatus.pending;

  NodeStateMachine(this.nodeId);

  NodeStatus get state => _state;

  void start() {
    if (_state == NodeStatus.pending) {
      _state = NodeStatus.running;
    }
  }

  void succeed() {
    if (_state == NodeStatus.running) {
      _state = NodeStatus.success;
    }
  }

  void fail() {
    if (_state == NodeStatus.running) {
      _state = NodeStatus.failed;
    }
  }

  void skip() {
    if (_state == NodeStatus.pending) {
      _state = NodeStatus.skipped;
    }
  }

  void reset() {
    _state = NodeStatus.pending;
  }
}
