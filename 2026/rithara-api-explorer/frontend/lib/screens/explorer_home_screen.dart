import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../theme/app_colors.dart';
import '../providers/api_providers.dart';
import '../providers/home_providers.dart';
import '../widgets/api_card_grid.dart';
import '../widgets/api_card_list.dart';

class ExplorerHomeScreen extends ConsumerWidget {
  const ExplorerHomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final filteredApisAsync = ref.watch(filteredApisProvider);
    final viewMode = ref.watch(viewModeNotifierProvider);
    final selectedCategory = ref.watch(selectedCategoriesNotifierProvider);
    final sortOption = ref.watch(sortOptionNotifierProvider);
    final searchQuery = ref.watch(homeSearchNotifierProvider);

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          // Hero Section
          SliverToBoxAdapter(
            child: Container(
              padding: const EdgeInsets.fromLTRB(24, 40, 24, 32),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Discover and explore the world\'s\nbest APIs',
                    style: TextStyle(
                      color: AppColors.textWhite,
                      fontSize: 32,
                      fontWeight: FontWeight.w800,
                      height: 1.2,
                    ),
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    'Browse our curated collection of high-quality APIs for your next project.',
                    style: TextStyle(
                      color: AppColors.textGray400,
                      fontSize: 16,
                    ),
                  ),
                  const SizedBox(height: 32),
                  // Search Bar
                  Container(
                    constraints: const BoxConstraints(maxWidth: 600),
                    child: TextField(
                      onChanged: (val) => ref.read(homeSearchNotifierProvider.notifier).update(val),
                      style: const TextStyle(color: AppColors.textWhite),
                      decoration: InputDecoration(
                        hintText: 'Search by name, tags, or provider...',
                        prefixIcon: const Icon(Icons.search, color: AppColors.textGray500),
                        suffixIcon: searchQuery.isNotEmpty
                            ? IconButton(
                                icon: const Icon(Icons.clear, size: 18),
                                onPressed: () => ref.read(homeSearchNotifierProvider.notifier).update(''),
                              )
                            : null,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Categories Bar
          ref.watch(uniqueCategoriesProvider).when(
            data: (cats) => SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
                child: Wrap(
                  spacing: 12,
                  runSpacing: 12,
                  children: cats.map((cat) {
                    final isSelected = selectedCategory == cat.id;
                    return FilterChip(
                      selected: isSelected,
                      label: Text(cat.name),
                      avatar: Icon(cat.icon, 
                        size: 16, 
                        color: isSelected ? Colors.white : AppColors.textGray400
                      ),
                      onSelected: (_) => ref.read(selectedCategoriesNotifierProvider.notifier).select(cat.id),
                      backgroundColor: AppColors.cardBg,
                      selectedColor: AppColors.blue,
                      labelStyle: TextStyle(
                        color: isSelected ? Colors.white : AppColors.textGray400,
                        fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
                      ),
                      side: BorderSide(
                        color: isSelected ? AppColors.blue : AppColors.border,
                      ),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                      showCheckmark: false,
                    );
                  }).toList(),
                ),
              ),
            ),
            loading: () => const SliverToBoxAdapter(child: SizedBox(height: 50)),
            error: (_, __) => const SliverToBoxAdapter(child: SizedBox.shrink()),
          ),

          // Controls Bar (Count + Sort + Toggle)
          filteredApisAsync.when(
            data: (filteredApis) => SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
                child: Row(
                  children: [
                    Text(
                      '${filteredApis.length} results found',
                      style: const TextStyle(
                        color: AppColors.textGray500,
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const Spacer(),
                    // Sort Dropdown
                    _SortDropdown(
                      current: sortOption,
                      onChanged: (val) => ref.read(sortOptionNotifierProvider.notifier).set(val!),
                    ),
                    const SizedBox(width: 16),
                    // View Mode Toggle
                    Container(
                      decoration: BoxDecoration(
                        color: AppColors.cardBg,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Row(
                        children: [
                          _ViewModeButton(
                            icon: Icons.grid_view,
                            isSelected: viewMode == ViewMode.grid,
                            onPressed: () => ref.read(viewModeNotifierProvider.notifier).toggle(),
                          ),
                          _ViewModeButton(
                            icon: Icons.list,
                            isSelected: viewMode == ViewMode.list,
                            onPressed: () => ref.read(viewModeNotifierProvider.notifier).toggle(),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            loading: () => const SliverToBoxAdapter(child: SizedBox.shrink()),
            error: (err, stack) => const SliverToBoxAdapter(child: SizedBox.shrink()),
          ),

          // Main Grid/List
          filteredApisAsync.when(
            data: (filteredApis) => SliverPadding(
              padding: const EdgeInsets.all(24),
              sliver: filteredApis.isEmpty
                ? const SliverToBoxAdapter(
                    child: Center(
                      child: Padding(
                        padding: EdgeInsets.only(top: 100),
                        child: Text('No APIs found matching your criteria', style: TextStyle(color: AppColors.textGray500)),
                      ),
                    ),
                  )
                : viewMode == ViewMode.grid
                    ? SliverGrid(
                        gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                          maxCrossAxisExtent: 400,
                          mainAxisSpacing: 24,
                          crossAxisSpacing: 24,
                          mainAxisExtent: 240,
                        ),
                        delegate: SliverChildBuilderDelegate(
                          (context, index) => ApiCardGrid(api: filteredApis[index]),
                          childCount: filteredApis.length,
                        ),
                      )
                    : SliverList(
                        delegate: SliverChildBuilderDelegate(
                          (context, index) => Padding(
                            padding: const EdgeInsets.only(bottom: 16),
                            child: ApiCardList(api: filteredApis[index]),
                          ),
                          childCount: filteredApis.length,
                        ),
                      ),
            ),
            loading: () => const SliverToBoxAdapter(
              child: Center(
                child: Padding(
                  padding: EdgeInsets.only(top: 100),
                  child: CircularProgressIndicator(),
                ),
              ),
            ),
            error: (err, stack) => SliverToBoxAdapter(
              child: Center(
                child: Padding(
                  padding: const EdgeInsets.only(top: 100),
                  child: Text('Error loading APIs: $err', style: const TextStyle(color: AppColors.danger)),
                ),
              ),
            ),
          ),
          
          // Bottom Padding
          const SliverToBoxAdapter(child: SizedBox(height: 40)),
        ],
      ),
    );
  }
}

class _SortDropdown extends StatelessWidget {
  final SortOption current;
  final ValueChanged<SortOption?> onChanged;

  const _SortDropdown({required this.current, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(
        color: AppColors.cardBg,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.border),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<SortOption>(
          value: current,
          icon: const Icon(Icons.expand_more, size: 18, color: AppColors.textGray500),
          onChanged: onChanged,
          dropdownColor: AppColors.cardBg,
          items: SortOption.values.map((opt) {
            return DropdownMenuItem(
              value: opt,
              child: Text(
                _getSortLabel(opt),
                style: const TextStyle(color: AppColors.textGray300, fontSize: 13),
              ),
            );
          }).toList(),
        ),
      ),
    );
  }

  String _getSortLabel(SortOption opt) {
    switch (opt) {
      case SortOption.featured: return 'Featured';
      case SortOption.rating: return 'Top Rated';
      case SortOption.popularity: return 'Most Popular';
      case SortOption.newest: return 'Recently Updated';
      case SortOption.name: return 'Name (A-Z)';
    }
  }
}

class _ViewModeButton extends StatelessWidget {
  final IconData icon;
  final bool isSelected;
  final VoidCallback onPressed;

  const _ViewModeButton({
    required this.icon,
    required this.isSelected,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onPressed,
      child: Container(
        padding: const EdgeInsets.all(8),
        color: isSelected ? AppColors.blue.withValues(alpha: 0.1) : Colors.transparent,
        child: Icon(
          icon,
          size: 18,
          color: isSelected ? AppColors.blueLight : AppColors.textGray500,
        ),
      ),
    );
  }
}
