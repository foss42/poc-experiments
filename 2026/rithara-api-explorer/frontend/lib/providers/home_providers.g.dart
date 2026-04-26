// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'home_providers.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

String _$filteredApisHash() => r'8a63373c9049563e7214c1ec1cdcf36ef5243e94';

/// See also [filteredApis].
@ProviderFor(filteredApis)
final filteredApisProvider =
    AutoDisposeProvider<AsyncValue<List<ApiItem>>>.internal(
  filteredApis,
  name: r'filteredApisProvider',
  debugGetCreateSourceHash:
      const bool.fromEnvironment('dart.vm.product') ? null : _$filteredApisHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

typedef FilteredApisRef = AutoDisposeProviderRef<AsyncValue<List<ApiItem>>>;
String _$viewModeNotifierHash() => r'f81603bb4c4f66b82e290736818b1fe7f4ddd3e4';

/// See also [ViewModeNotifier].
@ProviderFor(ViewModeNotifier)
final viewModeNotifierProvider =
    AutoDisposeNotifierProvider<ViewModeNotifier, ViewMode>.internal(
  ViewModeNotifier.new,
  name: r'viewModeNotifierProvider',
  debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
      ? null
      : _$viewModeNotifierHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

typedef _$ViewModeNotifier = AutoDisposeNotifier<ViewMode>;
String _$sortOptionNotifierHash() =>
    r'292ed558a9ed2c6f4ced2fe9a9d73c6cac8534a8';

/// See also [SortOptionNotifier].
@ProviderFor(SortOptionNotifier)
final sortOptionNotifierProvider =
    AutoDisposeNotifierProvider<SortOptionNotifier, SortOption>.internal(
  SortOptionNotifier.new,
  name: r'sortOptionNotifierProvider',
  debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
      ? null
      : _$sortOptionNotifierHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

typedef _$SortOptionNotifier = AutoDisposeNotifier<SortOption>;
String _$selectedCategoriesNotifierHash() =>
    r'69b1708263de0470624363c1f47e0728eae75b8c';

/// See also [SelectedCategoriesNotifier].
@ProviderFor(SelectedCategoriesNotifier)
final selectedCategoriesNotifierProvider =
    AutoDisposeNotifierProvider<SelectedCategoriesNotifier, String>.internal(
  SelectedCategoriesNotifier.new,
  name: r'selectedCategoriesNotifierProvider',
  debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
      ? null
      : _$selectedCategoriesNotifierHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

typedef _$SelectedCategoriesNotifier = AutoDisposeNotifier<String>;
String _$currentPageNotifierHash() =>
    r'3c7359f11ec341dc502a462fd93988a1a2873fb0';

/// See also [CurrentPageNotifier].
@ProviderFor(CurrentPageNotifier)
final currentPageNotifierProvider =
    AutoDisposeNotifierProvider<CurrentPageNotifier, int>.internal(
  CurrentPageNotifier.new,
  name: r'currentPageNotifierProvider',
  debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
      ? null
      : _$currentPageNotifierHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

typedef _$CurrentPageNotifier = AutoDisposeNotifier<int>;
String _$homeSearchNotifierHash() =>
    r'ac2691ea701a722e3558e25c81beb5c9419c3191';

/// See also [HomeSearchNotifier].
@ProviderFor(HomeSearchNotifier)
final homeSearchNotifierProvider =
    AutoDisposeNotifierProvider<HomeSearchNotifier, String>.internal(
  HomeSearchNotifier.new,
  name: r'homeSearchNotifierProvider',
  debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
      ? null
      : _$homeSearchNotifierHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

typedef _$HomeSearchNotifier = AutoDisposeNotifier<String>;
// ignore_for_file: type=lint
// ignore_for_file: subtype_of_sealed_class, invalid_use_of_internal_member, invalid_use_of_visible_for_testing_member
