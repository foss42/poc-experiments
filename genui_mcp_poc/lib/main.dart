import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:animations/animations.dart';
import 'package:flutter_riverpod/legacy.dart';


import 'logic/backend_service.dart'; 
import 'logic/type_mapper.dart';
import 'models/response_payload.dart';
import 'widgets/response_widgets.dart';

// --- STATE MANAGEMENT ---

final responseHistoryProvider = StateProvider<List<dynamic>>((ref) => ["System Ready: Waiting for Backend..."]);
final isLoadingProvider = StateProvider<bool>((ref) => false);

void main() {
  runApp(const ProviderScope(child: MyApp()));
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: ThemeData(useMaterial3: true, colorSchemeSeed: Colors.blue),
      home: const GenUIHomeScreen(),
    );
  }
}

class GenUIHomeScreen extends ConsumerWidget {
  const GenUIHomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final currentHistory = ref.watch(responseHistoryProvider);
    final isLoading = ref.watch(isLoadingProvider);

    return Scaffold(
      appBar: AppBar(title: const Text("AWS Orchestrator PoC")),
      body: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          children: [
            const Text("Trigger Backend Intent:", 
                       style: TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 10),
            
            // Interaction Row (Simulating different AWS Lambda Triggers)
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                _buildActionButton(ref, "Fetch User", "fetch_user"),
                _buildActionButton(ref, "Get Status", "text_only"),
                _buildActionButton(ref, "Force Error", "trigger_error"),
              ],
            ),
            
            if (isLoading) const LinearProgressIndicator(), // Visual feedback for "Cloud" work
            const Divider(height: 40),
            
            Expanded(
              child: ListView.builder(
                itemCount: currentHistory.length,
                itemBuilder: (context, index) {
                  final itemData = currentHistory[index];
                  final uiType = TypeMapper.detectRequiredUI(itemData);
                  
                  return PageTransitionSwitcher(
                    duration: const Duration(milliseconds: 600),
                    transitionBuilder: (child, anim, secondaryAnim) => SharedAxisTransition(
                      animation: anim,
                      secondaryAnimation: secondaryAnim,
                      transitionType: SharedAxisTransitionType.vertical,
                      child: child,
                    ),
                    child: Padding(
                      key: ValueKey(itemData.hashCode + index),
                      padding: const EdgeInsets.only(bottom: 16.0),
                      child: _buildGeneratedUI(uiType, itemData),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ACTION BUTTON: Handles the async "Backend" call
  Widget _buildActionButton(WidgetRef ref, String label, String intent) {
    final loading = ref.watch(isLoadingProvider);
    
    return ElevatedButton(
      onPressed: loading ? null : () async {
        ref.read(isLoadingProvider.notifier).state = true;
        
        // Simulating the call to AWS Lambda
        final result = await BackendService.processRequest(intent);
        
        ref.read(responseHistoryProvider.notifier).update((state) => [...state, result]);
        ref.read(isLoadingProvider.notifier).state = false;
      },
      child: loading 
        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)) 
        : Text(label),
    );
  }

  Widget _buildGeneratedUI(UIComponentType type, dynamic data) {
    switch (type) {
      case UIComponentType.text:
        return Text(data.toString(), style: const TextStyle(fontSize: 16));
      case UIComponentType.card:
        return ProfileCard(data: data);
      case UIComponentType.error:
        return ErrorDisplay(errorData: data);
      default:
        return const Text("Unknown Data Format");
    }
  }
}