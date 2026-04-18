import 'package:flutter/material.dart';
import '../../core/models/workflow.dart';
import '../../core/models/execution_result.dart';
import '../../core/models/diagnostic_report.dart';
import '../../core/engine/context_store.dart';
import '../../core/engine/workflow_engine.dart';
import '../../core/engine/diagnostics.dart';
import '../theme.dart';
import '../widgets/top_bar.dart';
import '../widgets/workflow_graph.dart';
import '../widgets/execution_log_tab.dart';
import '../widgets/context_store_tab.dart';
import '../widgets/diagnostics_tab.dart';
import '../widgets/mcp_apps_tab.dart';

class WorkflowScreen extends StatefulWidget {
  final List<Workflow> workflows;
  const WorkflowScreen({super.key, required this.workflows});

  @override
  State<WorkflowScreen> createState() => _WorkflowScreenState();
}

class _WorkflowScreenState extends State<WorkflowScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  late ContextStore _contextStore;
  late WorkflowEngine _engine;

  int _selectedWorkflowIndex = 0;
  bool _simulateFailure = false;
  bool _isRunning = false;
  String? _status;

  final Map<String, NodeStatus> _nodeStates = {};
  final List<LogEntry> _logs = [];
  List<ContextVariable> _variables = [];
  DiagnosticReport? _diagnosticReport;

  Workflow get _currentWorkflow => widget.workflows[_selectedWorkflowIndex];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _contextStore = ContextStore();
    _engine = WorkflowEngine(contextStore: _contextStore);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  void _resetState() {
    _nodeStates.clear();
    _logs.clear();
    _variables = [];
    _diagnosticReport = null;
    _status = null;
  }

  Future<void> _executeWorkflow() async {
    setState(() {
      _isRunning = true;
      _resetState();
      _tabController.index = 0;
    });

    _engine.simulateFailure = _simulateFailure;

    final result = await _engine.executeWorkflow(
      _currentWorkflow,
      onLog: (nodeId, message) {
        if (mounted) setState(() => _logs.add(LogEntry(nodeId: nodeId, message: message)));
      },
      onStateChange: (nodeId, status) {
        if (mounted) setState(() => _nodeStates[nodeId] = status);
      },
    );

    if (!mounted) return;

    final failedResult = result.nodeResults.where((r) => r.status == NodeStatus.failed).toList();
    DiagnosticReport? report;
    if (failedResult.isNotEmpty) {
      final failedNode = _currentWorkflow.getNode(failedResult.first.nodeId);
      if (failedNode != null) {
        report = diagnoseFailure(failedNode, failedResult.first, _contextStore);
      }
    }

    setState(() {
      _isRunning = false;
      _status = result.status;
      _variables = _contextStore.getAllWithSource();
      _diagnosticReport = report;
      if (report != null) _tabController.index = 2;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: Column(
        children: [
          TopBar(
            status: _status,
            simulateFailure: _simulateFailure,
            onToggleSimulate: () => setState(() => _simulateFailure = !_simulateFailure),
            onExecute: _executeWorkflow,
            isRunning: _isRunning,
          ),
          _buildWorkflowTabs(),
          Expanded(
            child: Row(
              children: [
                Expanded(
                  flex: 55,
                  child: Container(
                    decoration: const BoxDecoration(
                      border: Border(right: BorderSide(color: AppColors.border)),
                    ),
                    child: WorkflowGraph(workflow: _currentWorkflow, nodeStates: _nodeStates),
                  ),
                ),
                Expanded(
                  flex: 45,
                  child: Column(
                    children: [
                      Container(
                        decoration: const BoxDecoration(
                          border: Border(bottom: BorderSide(color: AppColors.border)),
                        ),
                        child: TabBar(
                          controller: _tabController,
                          labelColor: AppColors.text,
                          unselectedLabelColor: AppColors.textDim,
                          indicatorColor: AppColors.text,
                          indicatorWeight: 2,
                          labelStyle: const TextStyle(fontSize: 11, fontFamily: 'monospace', fontWeight: FontWeight.bold),
                          tabs: const [
                            Tab(text: 'EXECUTION LOG'),
                            Tab(text: 'CONTEXT STORE'),
                            Tab(text: 'DIAGNOSTICS'),
                            Tab(text: 'MCP APPS'),
                          ],
                        ),
                      ),
                      Expanded(
                        child: TabBarView(
                          controller: _tabController,
                          children: [
                            ExecutionLogTab(logs: _logs),
                            ContextStoreTab(variables: _variables),
                            DiagnosticsTab(
                              report: _diagnosticReport,
                              onApproveHeal: () => setState(() => _logs.add(
                                LogEntry(nodeId: 'system', message: 'Graph mutation approved. Re-executing...'),
                              )),
                            ),
                            const McpAppsTab(),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildWorkflowTabs() {
    return Container(
      height: 36,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      decoration: const BoxDecoration(
        color: AppColors.background,
        border: Border(bottom: BorderSide(color: AppColors.border)),
      ),
      child: Row(
        children: [
          for (int i = 0; i < widget.workflows.length; i++) ...[
            GestureDetector(
              onTap: () => setState(() { _selectedWorkflowIndex = i; _resetState(); }),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  border: Border(
                    bottom: BorderSide(
                      color: i == _selectedWorkflowIndex ? AppColors.text : Colors.transparent,
                      width: 2,
                    ),
                  ),
                ),
                child: Text(
                  widget.workflows[i].name,
                  style: TextStyle(
                    color: i == _selectedWorkflowIndex ? AppColors.text : AppColors.textDim,
                    fontSize: 12,
                    fontFamily: 'monospace',
                  ),
                ),
              ),
            ),
            if (i < widget.workflows.length - 1) const SizedBox(width: 4),
          ],
        ],
      ),
    );
  }
}
