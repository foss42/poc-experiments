import 'package:flutter/material.dart';
import 'utils/math_utils.dart';

void main() {
  runApp(const EvalPoCApp());
}

class EvalPoCApp extends StatelessWidget {
  const EvalPoCApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: ThemeData.dark().copyWith(
        primaryColor: Colors.blueAccent,
        scaffoldBackgroundColor: const Color(0xFF0D1117), // Dark GitHub-style background
      ),
      home: const EvalDashboard(),
    );
  }
}

class EvalDashboard extends StatefulWidget {
  const EvalDashboard({super.key});

  @override
  State<EvalDashboard> createState() => _EvalDashboardState();
}

class _EvalDashboardState extends State<EvalDashboard> {
  // --- Class Level Variables (Persistence) ---
  final _groundTruthController = TextEditingController(text: "The capital of France is Paris.");
  final _aiResponseController = TextEditingController(text: "Paris is the capital of the French Republic.");
  
  double _score = 0.0;
  double _latency = 0.0;
  bool _isEvaluating = false;

  // --- The Evaluation Logic ---
  Future<void> _runEval() async {
    setState(() => _isEvaluating = true);
    
    final stopwatch = Stopwatch()..start();
    
    // Simulating computational work/network latency for GSoC demo
    await Future.delayed(const Duration(milliseconds: 800));
    
    setState(() {
      _score = EvalMath.calculateSimilarity(
        _groundTruthController.text, 
        _aiResponseController.text
      );
      stopwatch.stop();
      _latency = stopwatch.elapsedMilliseconds.toDouble();
      _isEvaluating = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("API Dash: Multimodal AI Eval"),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            const Text(
              "MCP Tool Hook: 'evaluate_alignment'",
              style: TextStyle(color: Colors.greenAccent, fontWeight: FontWeight.bold, fontSize: 12),
            ),
            const SizedBox(height: 30),
            
            // Input Section
            TextField(
              controller: _groundTruthController,
              decoration: const InputDecoration(
                labelText: "Ground Truth (Reference)",
                border: OutlineInputBorder(),
              ),
              maxLines: 2,
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _aiResponseController,
              decoration: const InputDecoration(
                labelText: "AI Prediction (Output)",
                border: OutlineInputBorder(),
              ),
              maxLines: 2,
            ),
            const SizedBox(height: 24),
            
            // Execution Button
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton(
                onPressed: _isEvaluating ? null : _runEval,
                style: ElevatedButton.styleFrom(backgroundColor: Colors.blueAccent),
                child: _isEvaluating 
                    ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text("Run Scientific Evaluation"),
              ),
            ),
            
            const Spacer(),
            
            // Results Section
            if (_isEvaluating)
              const LinearProgressIndicator()
            else ...[
              Text(
                "Alignment Score: ${(_score * 100).toStringAsFixed(2)}%",
                style: const TextStyle(fontSize: 36, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              Text(
                "Engine Latency: ${_latency.toStringAsFixed(0)}ms",
                style: TextStyle(color: Colors.grey.shade400, fontSize: 14),
              ),
              const SizedBox(height: 4),
              const Text(
                "Metric: Cosine Similarity (Vector Space)",
                style: TextStyle(color: Colors.blueGrey, fontSize: 12),
              ),
            ],
            const Spacer(flex: 2),
          ],
        ),
      ),
    );
  }

  @override
  void dispose() {
    _groundTruthController.dispose();
    _aiResponseController.dispose();
    super.dispose();
  }
}