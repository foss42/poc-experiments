import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../theme/app_colors.dart';
import '../providers/api_providers.dart';
import '../widgets/api_card_grid.dart';
import '../data/categories.dart';

class CategoryViewScreen extends ConsumerWidget {
  final String category;

  const CategoryViewScreen({super.key, required this.category});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final apis = ref.watch(apisByCategoryProvider(category));
    final catInfo = categories.firstWhere((c) => c.id == category, 
        orElse: () => categories[0]);

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () {
            if (context.canPop()) {
              context.pop();
            } else {
              context.go('/');
            }
          },
        ),
        title: Row(
          children: [
            Icon(catInfo.icon, size: 20, color: AppColors.blueLight),
            const SizedBox(width: 12),
            Text(catInfo.name),
          ],
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 16),
            child: Center(
              child: Text(
                '${apis.length} APIs',
                style: const TextStyle(color: AppColors.textGray500, fontSize: 13),
              ),
            ),
          ),
        ],
      ),
      body: apis.isEmpty
          ? const Center(child: Text('No APIs found in this category'))
          : GridView.builder(
              padding: const EdgeInsets.all(24),
              gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                maxCrossAxisExtent: 400,
                mainAxisSpacing: 24,
                crossAxisSpacing: 24,
                mainAxisExtent: 240,
              ),
              itemCount: apis.length,
              itemBuilder: (context, index) => ApiCardGrid(api: apis[index]),
            ),
    );
  }
}
