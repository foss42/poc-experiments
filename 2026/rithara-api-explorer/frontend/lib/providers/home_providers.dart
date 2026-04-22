import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../models/api_item.dart';
import 'api_providers.dart';

part 'home_providers.g.dart';

enum ViewMode { grid, list }

enum SortOption { featured, rating, popularity, newest, name }

@riverpod
class ViewModeNotifier extends _$ViewModeNotifier {
  @override
  ViewMode build() => ViewMode.grid;

  void toggle() =>
      state = state == ViewMode.grid ? ViewMode.list : ViewMode.grid;
}

@riverpod
class SortOptionNotifier extends _$SortOptionNotifier {
  @override
  SortOption build() => SortOption.featured;

  void set(SortOption opt) => state = opt;
}

@riverpod
class SelectedCategoriesNotifier extends _$SelectedCategoriesNotifier {
  @override
  String build() => 'all';

  void select(String categoryId) => state = categoryId;
}

@riverpod
class CurrentPageNotifier extends _$CurrentPageNotifier {
  @override
  int build() => 1;

  void goTo(int page) => state = page;
  void reset() => state = 1;
}

@riverpod
class HomeSearchNotifier extends _$HomeSearchNotifier {
  @override
  String build() => '';

  void update(String q) => state = q;
}

@riverpod
AsyncValue<List<ApiItem>> filteredApis(Ref ref) {
  final allAsync = ref.watch(allApisProvider);
  final category = ref.watch(selectedCategoriesNotifierProvider);
  final sort     = ref.watch(sortOptionNotifierProvider);
  final search   = ref.watch(homeSearchNotifierProvider);

  return allAsync.whenData((all) {
    var result = category == 'all'
        ? all
        : all.where((a) => a.tags.contains(category)).toList();

    if (search.isNotEmpty) {
      final q = search.toLowerCase();
      result = result
          .where((a) =>
              a.name.toLowerCase().contains(q) ||
              a.description.toLowerCase().contains(q) ||
              a.tags.any((t) => t.toLowerCase().contains(q)))
          .toList();
    }

    result = List.from(result);
    switch (sort) {
      case SortOption.rating:
        result.sort((a, b) => b.rating.compareTo(a.rating));
      case SortOption.popularity:
        result.sort((a, b) => b.popularity.compareTo(a.popularity));
      case SortOption.newest:
        result.sort((a, b) => b.updated.compareTo(a.updated));
      case SortOption.name:
        result.sort((a, b) => a.name.compareTo(b.name));
      case SortOption.featured:
        result.sort((a, b) => b.popularity.compareTo(a.popularity));
    }
    return result;
  });
}