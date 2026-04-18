// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'submission_providers.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

String _$allSubmissionsHash() => r'e727a83ba7f585362d5c8b0d714462e79f978880';

/// See also [allSubmissions].
@ProviderFor(allSubmissions)
final allSubmissionsProvider =
    AutoDisposeProvider<List<ApiSubmission>>.internal(
  allSubmissions,
  name: r'allSubmissionsProvider',
  debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
      ? null
      : _$allSubmissionsHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

typedef AllSubmissionsRef = AutoDisposeProviderRef<List<ApiSubmission>>;
String _$pendingSubmissionsHash() =>
    r'1d12c4a4c2aa21b5b79a759f55b9f8be6d555bc7';

/// See also [pendingSubmissions].
@ProviderFor(pendingSubmissions)
final pendingSubmissionsProvider =
    AutoDisposeProvider<List<ApiSubmission>>.internal(
  pendingSubmissions,
  name: r'pendingSubmissionsProvider',
  debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
      ? null
      : _$pendingSubmissionsHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

typedef PendingSubmissionsRef = AutoDisposeProviderRef<List<ApiSubmission>>;
String _$userSubmissionsHash() => r'33a1e4a3a01095e9da9879f27c8167338b9ed7fa';

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

/// See also [userSubmissions].
@ProviderFor(userSubmissions)
const userSubmissionsProvider = UserSubmissionsFamily();

/// See also [userSubmissions].
class UserSubmissionsFamily extends Family<List<ApiSubmission>> {
  /// See also [userSubmissions].
  const UserSubmissionsFamily();

  /// See also [userSubmissions].
  UserSubmissionsProvider call(
    String email,
  ) {
    return UserSubmissionsProvider(
      email,
    );
  }

  @override
  UserSubmissionsProvider getProviderOverride(
    covariant UserSubmissionsProvider provider,
  ) {
    return call(
      provider.email,
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
  String? get name => r'userSubmissionsProvider';
}

/// See also [userSubmissions].
class UserSubmissionsProvider extends AutoDisposeProvider<List<ApiSubmission>> {
  /// See also [userSubmissions].
  UserSubmissionsProvider(
    String email,
  ) : this._internal(
          (ref) => userSubmissions(
            ref as UserSubmissionsRef,
            email,
          ),
          from: userSubmissionsProvider,
          name: r'userSubmissionsProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$userSubmissionsHash,
          dependencies: UserSubmissionsFamily._dependencies,
          allTransitiveDependencies:
              UserSubmissionsFamily._allTransitiveDependencies,
          email: email,
        );

  UserSubmissionsProvider._internal(
    super._createNotifier, {
    required super.name,
    required super.dependencies,
    required super.allTransitiveDependencies,
    required super.debugGetCreateSourceHash,
    required super.from,
    required this.email,
  }) : super.internal();

  final String email;

  @override
  Override overrideWith(
    List<ApiSubmission> Function(UserSubmissionsRef provider) create,
  ) {
    return ProviderOverride(
      origin: this,
      override: UserSubmissionsProvider._internal(
        (ref) => create(ref as UserSubmissionsRef),
        from: from,
        name: null,
        dependencies: null,
        allTransitiveDependencies: null,
        debugGetCreateSourceHash: null,
        email: email,
      ),
    );
  }

  @override
  AutoDisposeProviderElement<List<ApiSubmission>> createElement() {
    return _UserSubmissionsProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is UserSubmissionsProvider && other.email == email;
  }

  @override
  int get hashCode {
    var hash = _SystemHash.combine(0, runtimeType.hashCode);
    hash = _SystemHash.combine(hash, email.hashCode);

    return _SystemHash.finish(hash);
  }
}

mixin UserSubmissionsRef on AutoDisposeProviderRef<List<ApiSubmission>> {
  /// The parameter `email` of this provider.
  String get email;
}

class _UserSubmissionsProviderElement
    extends AutoDisposeProviderElement<List<ApiSubmission>>
    with UserSubmissionsRef {
  _UserSubmissionsProviderElement(super.provider);

  @override
  String get email => (origin as UserSubmissionsProvider).email;
}

String _$contributeFormNotifierHash() =>
    r'20b8fe36a73a5befb51860ab53ffe77af4ea678a';

/// See also [ContributeFormNotifier].
@ProviderFor(ContributeFormNotifier)
final contributeFormNotifierProvider = AutoDisposeNotifierProvider<
    ContributeFormNotifier, ContributeFormState>.internal(
  ContributeFormNotifier.new,
  name: r'contributeFormNotifierProvider',
  debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
      ? null
      : _$contributeFormNotifierHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

typedef _$ContributeFormNotifier = AutoDisposeNotifier<ContributeFormState>;
// ignore_for_file: type=lint
// ignore_for_file: subtype_of_sealed_class, invalid_use_of_internal_member, invalid_use_of_visible_for_testing_member
