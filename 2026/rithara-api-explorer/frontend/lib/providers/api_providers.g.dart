// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'api_providers.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

String _$allApisHash() => r'6f0bb94caafa8b610040db57cab0cd23025c173a';

/// See also [allApis].
@ProviderFor(allApis)
final allApisProvider = AutoDisposeFutureProvider<List<ApiItem>>.internal(
  allApis,
  name: r'allApisProvider',
  debugGetCreateSourceHash:
      const bool.fromEnvironment('dart.vm.product') ? null : _$allApisHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

typedef AllApisRef = AutoDisposeFutureProviderRef<List<ApiItem>>;
String _$allCategoriesHash() => r'34c834d7a0d6ac5fcc563c13b497759eaf288167';

/// See also [allCategories].
@ProviderFor(allCategories)
final allCategoriesProvider = AutoDisposeProvider<List<ApiCategory>>.internal(
  allCategories,
  name: r'allCategoriesProvider',
  debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
      ? null
      : _$allCategoriesHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

typedef AllCategoriesRef = AutoDisposeProviderRef<List<ApiCategory>>;
String _$uniqueCategoriesHash() => r'a7dfa9c778483730f442f7efa537b668f10c52c4';

/// See also [uniqueCategories].
@ProviderFor(uniqueCategories)
final uniqueCategoriesProvider =
    AutoDisposeFutureProvider<List<ApiCategory>>.internal(
  uniqueCategories,
  name: r'uniqueCategoriesProvider',
  debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
      ? null
      : _$uniqueCategoriesHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

typedef UniqueCategoriesRef = AutoDisposeFutureProviderRef<List<ApiCategory>>;
String _$apiByIdHash() => r'fea362ac2b882cad014959e6f44540861971e482';

/// Copied from Dart SDK
class _SystemHash {
  _SystemHash._();

  static int combine(int hash, int value) {
    // ignore: parameter_assignments
    hash = 0x1fffffff & (hash + value);
    // ignore: parameter_assignments
    hash = 0x1fffffff & (hash + ((0x0007ffff & hash) << 10));
    return hash ^ (hash >> 6);
  }

  static int finish(int hash) {
    // ignore: parameter_assignments
    hash = 0x1fffffff & (hash + ((0x03ffffff & hash) << 3));
    // ignore: parameter_assignments
    hash = hash ^ (hash >> 11);
    return 0x1fffffff & (hash + ((0x00003fff & hash) << 15));
  }
}

/// See also [apiById].
@ProviderFor(apiById)
const apiByIdProvider = ApiByIdFamily();

/// See also [apiById].
class ApiByIdFamily extends Family<ApiItem?> {
  /// See also [apiById].
  const ApiByIdFamily();

  /// See also [apiById].
  ApiByIdProvider call(
    String id,
  ) {
    return ApiByIdProvider(
      id,
    );
  }

  @override
  ApiByIdProvider getProviderOverride(
    covariant ApiByIdProvider provider,
  ) {
    return call(
      provider.id,
    );
  }

  static const Iterable<ProviderOrFamily>? _dependencies = null;

  @override
  Iterable<ProviderOrFamily>? get dependencies => _dependencies;

  static const Iterable<ProviderOrFamily>? _allTransitiveDependencies = null;

  @override
  Iterable<ProviderOrFamily>? get allTransitiveDependencies =>
      _allTransitiveDependencies;

  @override
  String? get name => r'apiByIdProvider';
}

/// See also [apiById].
class ApiByIdProvider extends AutoDisposeProvider<ApiItem?> {
  /// See also [apiById].
  ApiByIdProvider(
    String id,
  ) : this._internal(
          (ref) => apiById(
            ref as ApiByIdRef,
            id,
          ),
          from: apiByIdProvider,
          name: r'apiByIdProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$apiByIdHash,
          dependencies: ApiByIdFamily._dependencies,
          allTransitiveDependencies: ApiByIdFamily._allTransitiveDependencies,
          id: id,
        );

  ApiByIdProvider._internal(
    super._createNotifier, {
    required super.name,
    required super.dependencies,
    required super.allTransitiveDependencies,
    required super.debugGetCreateSourceHash,
    required super.from,
    required this.id,
  }) : super.internal();

  final String id;

  @override
  Override overrideWith(
    ApiItem? Function(ApiByIdRef provider) create,
  ) {
    return ProviderOverride(
      origin: this,
      override: ApiByIdProvider._internal(
        (ref) => create(ref as ApiByIdRef),
        from: from,
        name: null,
        dependencies: null,
        allTransitiveDependencies: null,
        debugGetCreateSourceHash: null,
        id: id,
      ),
    );
  }

  @override
  AutoDisposeProviderElement<ApiItem?> createElement() {
    return _ApiByIdProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is ApiByIdProvider && other.id == id;
  }

  @override
  int get hashCode {
    var hash = _SystemHash.combine(0, runtimeType.hashCode);
    hash = _SystemHash.combine(hash, id.hashCode);

    return _SystemHash.finish(hash);
  }
}

mixin ApiByIdRef on AutoDisposeProviderRef<ApiItem?> {
  /// The parameter `id` of this provider.
  String get id;
}

class _ApiByIdProviderElement extends AutoDisposeProviderElement<ApiItem?>
    with ApiByIdRef {
  _ApiByIdProviderElement(super.provider);

  @override
  String get id => (origin as ApiByIdProvider).id;
}

String _$apisByCategoryHash() => r'26b40a91ffd6f5cd4f27fa6b5a691b2fdad603d1';

/// See also [apisByCategory].
@ProviderFor(apisByCategory)
const apisByCategoryProvider = ApisByCategoryFamily();

/// See also [apisByCategory].
class ApisByCategoryFamily extends Family<List<ApiItem>> {
  /// See also [apisByCategory].
  const ApisByCategoryFamily();

  /// See also [apisByCategory].
  ApisByCategoryProvider call(
    String categoryId,
  ) {
    return ApisByCategoryProvider(
      categoryId,
    );
  }

  @override
  ApisByCategoryProvider getProviderOverride(
    covariant ApisByCategoryProvider provider,
  ) {
    return call(
      provider.categoryId,
    );
  }

  static const Iterable<ProviderOrFamily>? _dependencies = null;

  @override
  Iterable<ProviderOrFamily>? get dependencies => _dependencies;

  static const Iterable<ProviderOrFamily>? _allTransitiveDependencies = null;

  @override
  Iterable<ProviderOrFamily>? get allTransitiveDependencies =>
      _allTransitiveDependencies;

  @override
  String? get name => r'apisByCategoryProvider';
}

/// See also [apisByCategory].
class ApisByCategoryProvider extends AutoDisposeProvider<List<ApiItem>> {
  /// See also [apisByCategory].
  ApisByCategoryProvider(
    String categoryId,
  ) : this._internal(
          (ref) => apisByCategory(
            ref as ApisByCategoryRef,
            categoryId,
          ),
          from: apisByCategoryProvider,
          name: r'apisByCategoryProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$apisByCategoryHash,
          dependencies: ApisByCategoryFamily._dependencies,
          allTransitiveDependencies:
              ApisByCategoryFamily._allTransitiveDependencies,
          categoryId: categoryId,
        );

  ApisByCategoryProvider._internal(
    super._createNotifier, {
    required super.name,
    required super.dependencies,
    required super.allTransitiveDependencies,
    required super.debugGetCreateSourceHash,
    required super.from,
    required this.categoryId,
  }) : super.internal();

  final String categoryId;

  @override
  Override overrideWith(
    List<ApiItem> Function(ApisByCategoryRef provider) create,
  ) {
    return ProviderOverride(
      origin: this,
      override: ApisByCategoryProvider._internal(
        (ref) => create(ref as ApisByCategoryRef),
        from: from,
        name: null,
        dependencies: null,
        allTransitiveDependencies: null,
        debugGetCreateSourceHash: null,
        categoryId: categoryId,
      ),
    );
  }

  @override
  AutoDisposeProviderElement<List<ApiItem>> createElement() {
    return _ApisByCategoryProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is ApisByCategoryProvider && other.categoryId == categoryId;
  }

  @override
  int get hashCode {
    var hash = _SystemHash.combine(0, runtimeType.hashCode);
    hash = _SystemHash.combine(hash, categoryId.hashCode);

    return _SystemHash.finish(hash);
  }
}

mixin ApisByCategoryRef on AutoDisposeProviderRef<List<ApiItem>> {
  /// The parameter `categoryId` of this provider.
  String get categoryId;
}

class _ApisByCategoryProviderElement
    extends AutoDisposeProviderElement<List<ApiItem>> with ApisByCategoryRef {
  _ApisByCategoryProviderElement(super.provider);

  @override
  String get categoryId => (origin as ApisByCategoryProvider).categoryId;
}

String _$searchResultsHash() => r'5d42440f6328611812fbc4b76041fd9dc08e90ce';

/// See also [searchResults].
@ProviderFor(searchResults)
const searchResultsProvider = SearchResultsFamily();

/// See also [searchResults].
class SearchResultsFamily extends Family<List<ApiItem>> {
  /// See also [searchResults].
  const SearchResultsFamily();

  /// See also [searchResults].
  SearchResultsProvider call(
    String query,
  ) {
    return SearchResultsProvider(
      query,
    );
  }

  @override
  SearchResultsProvider getProviderOverride(
    covariant SearchResultsProvider provider,
  ) {
    return call(
      provider.query,
    );
  }

  static const Iterable<ProviderOrFamily>? _dependencies = null;

  @override
  Iterable<ProviderOrFamily>? get dependencies => _dependencies;

  static const Iterable<ProviderOrFamily>? _allTransitiveDependencies = null;

  @override
  Iterable<ProviderOrFamily>? get allTransitiveDependencies =>
      _allTransitiveDependencies;

  @override
  String? get name => r'searchResultsProvider';
}

/// See also [searchResults].
class SearchResultsProvider extends AutoDisposeProvider<List<ApiItem>> {
  /// See also [searchResults].
  SearchResultsProvider(
    String query,
  ) : this._internal(
          (ref) => searchResults(
            ref as SearchResultsRef,
            query,
          ),
          from: searchResultsProvider,
          name: r'searchResultsProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$searchResultsHash,
          dependencies: SearchResultsFamily._dependencies,
          allTransitiveDependencies:
              SearchResultsFamily._allTransitiveDependencies,
          query: query,
        );

  SearchResultsProvider._internal(
    super._createNotifier, {
    required super.name,
    required super.dependencies,
    required super.allTransitiveDependencies,
    required super.debugGetCreateSourceHash,
    required super.from,
    required this.query,
  }) : super.internal();

  final String query;

  @override
  Override overrideWith(
    List<ApiItem> Function(SearchResultsRef provider) create,
  ) {
    return ProviderOverride(
      origin: this,
      override: SearchResultsProvider._internal(
        (ref) => create(ref as SearchResultsRef),
        from: from,
        name: null,
        dependencies: null,
        allTransitiveDependencies: null,
        debugGetCreateSourceHash: null,
        query: query,
      ),
    );
  }

  @override
  AutoDisposeProviderElement<List<ApiItem>> createElement() {
    return _SearchResultsProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is SearchResultsProvider && other.query == query;
  }

  @override
  int get hashCode {
    var hash = _SystemHash.combine(0, runtimeType.hashCode);
    hash = _SystemHash.combine(hash, query.hashCode);

    return _SystemHash.finish(hash);
  }
}

mixin SearchResultsRef on AutoDisposeProviderRef<List<ApiItem>> {
  /// The parameter `query` of this provider.
  String get query;
}

class _SearchResultsProviderElement
    extends AutoDisposeProviderElement<List<ApiItem>> with SearchResultsRef {
  _SearchResultsProviderElement(super.provider);

  @override
  String get query => (origin as SearchResultsProvider).query;
}

String _$apiTemplatesHash() => r'5eae89e1cfffb20eb7b5b0b5a40ebff42db2e97e';

/// See also [apiTemplates].
@ProviderFor(apiTemplates)
const apiTemplatesProvider = ApiTemplatesFamily();

/// See also [apiTemplates].
class ApiTemplatesFamily extends Family<AsyncValue<Map<String, dynamic>>> {
  /// See also [apiTemplates].
  const ApiTemplatesFamily();

  /// See also [apiTemplates].
  ApiTemplatesProvider call(
    String templatePath,
  ) {
    return ApiTemplatesProvider(
      templatePath,
    );
  }

  @override
  ApiTemplatesProvider getProviderOverride(
    covariant ApiTemplatesProvider provider,
  ) {
    return call(
      provider.templatePath,
    );
  }

  static const Iterable<ProviderOrFamily>? _dependencies = null;

  @override
  Iterable<ProviderOrFamily>? get dependencies => _dependencies;

  static const Iterable<ProviderOrFamily>? _allTransitiveDependencies = null;

  @override
  Iterable<ProviderOrFamily>? get allTransitiveDependencies =>
      _allTransitiveDependencies;

  @override
  String? get name => r'apiTemplatesProvider';
}

/// See also [apiTemplates].
class ApiTemplatesProvider
    extends AutoDisposeFutureProvider<Map<String, dynamic>> {
  /// See also [apiTemplates].
  ApiTemplatesProvider(
    String templatePath,
  ) : this._internal(
          (ref) => apiTemplates(
            ref as ApiTemplatesRef,
            templatePath,
          ),
          from: apiTemplatesProvider,
          name: r'apiTemplatesProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$apiTemplatesHash,
          dependencies: ApiTemplatesFamily._dependencies,
          allTransitiveDependencies:
              ApiTemplatesFamily._allTransitiveDependencies,
          templatePath: templatePath,
        );

  ApiTemplatesProvider._internal(
    super._createNotifier, {
    required super.name,
    required super.dependencies,
    required super.allTransitiveDependencies,
    required super.debugGetCreateSourceHash,
    required super.from,
    required this.templatePath,
  }) : super.internal();

  final String templatePath;

  @override
  Override overrideWith(
    FutureOr<Map<String, dynamic>> Function(ApiTemplatesRef provider) create,
  ) {
    return ProviderOverride(
      origin: this,
      override: ApiTemplatesProvider._internal(
        (ref) => create(ref as ApiTemplatesRef),
        from: from,
        name: null,
        dependencies: null,
        allTransitiveDependencies: null,
        debugGetCreateSourceHash: null,
        templatePath: templatePath,
      ),
    );
  }

  @override
  AutoDisposeFutureProviderElement<Map<String, dynamic>> createElement() {
    return _ApiTemplatesProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is ApiTemplatesProvider && other.templatePath == templatePath;
  }

  @override
  int get hashCode {
    var hash = _SystemHash.combine(0, runtimeType.hashCode);
    hash = _SystemHash.combine(hash, templatePath.hashCode);

    return _SystemHash.finish(hash);
  }
}

mixin ApiTemplatesRef on AutoDisposeFutureProviderRef<Map<String, dynamic>> {
  /// The parameter `templatePath` of this provider.
  String get templatePath;
}

class _ApiTemplatesProviderElement
    extends AutoDisposeFutureProviderElement<Map<String, dynamic>>
    with ApiTemplatesRef {
  _ApiTemplatesProviderElement(super.provider);

  @override
  String get templatePath => (origin as ApiTemplatesProvider).templatePath;
}
// ignore_for_file: type=lint
// ignore_for_file: subtype_of_sealed_class, invalid_use_of_internal_member, invalid_use_of_visible_for_testing_member
