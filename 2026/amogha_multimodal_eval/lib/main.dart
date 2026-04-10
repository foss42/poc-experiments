import 'package:flutter/material.dart';
import 'utils/math_utils.dart';

void main() => runApp(const EvalPoCApp());

class EvalPoCApp extends StatelessWidget {
  const EvalPoCApp({super.key});
  @override
  Widget build(BuildContext context) => MaterialApp(
    theme: ThemeData.dark(),
    home: const EvalDashboard(),
  );
}

class EvalDashboard extends StatefulWidget {
  const EvalDashboard({super.key});
  @override
  State<EvalDashboard> createState() => _EvalDashboardState();
}

class _EvalDashboardState extends State<EvalDashboard> {
  final _groundTruth = TextEditingController(text: "The capital of France is Paris.");
  final _aiResponse = TextEditingController(text: "Paris is the capital of the French Republic.");
  double _score = 0.0;

  void _runEval() {
    setState(() {
      _score = EvalMath.calculateSimilarity(_groundTruth.text, _aiResponse.text);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("API Dash: AI Eval PoC")),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            const Text("MCP Tool Hook: 'evaluate_alignment'", style: TextStyle(color: Colors.green)),
            const SizedBox(height: 20),
            TextField(controller: _groundTruth, decoration: const InputDecoration(labelText: "Ground Truth")),
            const SizedBox(height: 10),
            TextField(controller: _aiResponse, decoration: const InputDecoration(labelText: "AI Prediction")),
            const SizedBox(height: 20),
            ElevatedButton(onPressed: _runEval, child: const Text("Execute Evaluation")),
            const Spacer(),
            Text("Alignment Score: ${(_score * 100).toStringAsFixed(2)}%", 
                 style: const TextStyle(fontSize: 32, fontWeight: FontWeight.bold)),
            const Spacer(),
          ],
        ),
      ),
    );
  }
}