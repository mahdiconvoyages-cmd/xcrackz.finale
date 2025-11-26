// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'missions_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

String _$missionServiceHash() => r'09f6d79c364354a9ecbe4073feb6238f45abdfea';

/// Provider pour le service Mission
///
/// Copied from [missionService].
@ProviderFor(missionService)
final missionServiceProvider = AutoDisposeProvider<MissionService>.internal(
  missionService,
  name: r'missionServiceProvider',
  debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
      ? null
      : _$missionServiceHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
typedef MissionServiceRef = AutoDisposeProviderRef<MissionService>;
String _$missionHash() => r'cf1310fca382e8e103ccc924417658bfe4f3f7d4';

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

/// Provider pour une mission spécifique par ID
///
/// Copied from [mission].
@ProviderFor(mission)
const missionProvider = MissionFamily();

/// Provider pour une mission spécifique par ID
///
/// Copied from [mission].
class MissionFamily extends Family<AsyncValue<Mission>> {
  /// Provider pour une mission spécifique par ID
  ///
  /// Copied from [mission].
  const MissionFamily();

  /// Provider pour une mission spécifique par ID
  ///
  /// Copied from [mission].
  MissionProvider call(String id) {
    return MissionProvider(id);
  }

  @override
  MissionProvider getProviderOverride(covariant MissionProvider provider) {
    return call(provider.id);
  }

  static const Iterable<ProviderOrFamily>? _dependencies = null;

  @override
  Iterable<ProviderOrFamily>? get dependencies => _dependencies;

  static const Iterable<ProviderOrFamily>? _allTransitiveDependencies = null;

  @override
  Iterable<ProviderOrFamily>? get allTransitiveDependencies =>
      _allTransitiveDependencies;

  @override
  String? get name => r'missionProvider';
}

/// Provider pour une mission spécifique par ID
///
/// Copied from [mission].
class MissionProvider extends AutoDisposeFutureProvider<Mission> {
  /// Provider pour une mission spécifique par ID
  ///
  /// Copied from [mission].
  MissionProvider(String id)
    : this._internal(
        (ref) => mission(ref as MissionRef, id),
        from: missionProvider,
        name: r'missionProvider',
        debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
            ? null
            : _$missionHash,
        dependencies: MissionFamily._dependencies,
        allTransitiveDependencies: MissionFamily._allTransitiveDependencies,
        id: id,
      );

  MissionProvider._internal(
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
    FutureOr<Mission> Function(MissionRef provider) create,
  ) {
    return ProviderOverride(
      origin: this,
      override: MissionProvider._internal(
        (ref) => create(ref as MissionRef),
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
  AutoDisposeFutureProviderElement<Mission> createElement() {
    return _MissionProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is MissionProvider && other.id == id;
  }

  @override
  int get hashCode {
    var hash = _SystemHash.combine(0, runtimeType.hashCode);
    hash = _SystemHash.combine(hash, id.hashCode);

    return _SystemHash.finish(hash);
  }
}

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
mixin MissionRef on AutoDisposeFutureProviderRef<Mission> {
  /// The parameter `id` of this provider.
  String get id;
}

class _MissionProviderElement extends AutoDisposeFutureProviderElement<Mission>
    with MissionRef {
  _MissionProviderElement(super.provider);

  @override
  String get id => (origin as MissionProvider).id;
}

String _$missionCountsHash() => r'286619085cc3887e78e973afbd6b6af8d62a1068';

/// Provider pour le comptage des missions par statut
///
/// Copied from [missionCounts].
@ProviderFor(missionCounts)
final missionCountsProvider =
    AutoDisposeFutureProvider<Map<String, int>>.internal(
      missionCounts,
      name: r'missionCountsProvider',
      debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
          ? null
          : _$missionCountsHash,
      dependencies: null,
      allTransitiveDependencies: null,
    );

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
typedef MissionCountsRef = AutoDisposeFutureProviderRef<Map<String, int>>;
String _$missionsHash() => r'05cc081ad63a198688be5324c9d4f4ce786e1d89';

abstract class _$Missions
    extends BuildlessAutoDisposeAsyncNotifier<List<Mission>> {
  late final String? status;

  FutureOr<List<Mission>> build({String? status});
}

/// Provider pour la liste des missions avec filtrage par statut
///
/// Copied from [Missions].
@ProviderFor(Missions)
const missionsProvider = MissionsFamily();

/// Provider pour la liste des missions avec filtrage par statut
///
/// Copied from [Missions].
class MissionsFamily extends Family<AsyncValue<List<Mission>>> {
  /// Provider pour la liste des missions avec filtrage par statut
  ///
  /// Copied from [Missions].
  const MissionsFamily();

  /// Provider pour la liste des missions avec filtrage par statut
  ///
  /// Copied from [Missions].
  MissionsProvider call({String? status}) {
    return MissionsProvider(status: status);
  }

  @override
  MissionsProvider getProviderOverride(covariant MissionsProvider provider) {
    return call(status: provider.status);
  }

  static const Iterable<ProviderOrFamily>? _dependencies = null;

  @override
  Iterable<ProviderOrFamily>? get dependencies => _dependencies;

  static const Iterable<ProviderOrFamily>? _allTransitiveDependencies = null;

  @override
  Iterable<ProviderOrFamily>? get allTransitiveDependencies =>
      _allTransitiveDependencies;

  @override
  String? get name => r'missionsProvider';
}

/// Provider pour la liste des missions avec filtrage par statut
///
/// Copied from [Missions].
class MissionsProvider
    extends AutoDisposeAsyncNotifierProviderImpl<Missions, List<Mission>> {
  /// Provider pour la liste des missions avec filtrage par statut
  ///
  /// Copied from [Missions].
  MissionsProvider({String? status})
    : this._internal(
        () => Missions()..status = status,
        from: missionsProvider,
        name: r'missionsProvider',
        debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
            ? null
            : _$missionsHash,
        dependencies: MissionsFamily._dependencies,
        allTransitiveDependencies: MissionsFamily._allTransitiveDependencies,
        status: status,
      );

  MissionsProvider._internal(
    super._createNotifier, {
    required super.name,
    required super.dependencies,
    required super.allTransitiveDependencies,
    required super.debugGetCreateSourceHash,
    required super.from,
    required this.status,
  }) : super.internal();

  final String? status;

  @override
  FutureOr<List<Mission>> runNotifierBuild(covariant Missions notifier) {
    return notifier.build(status: status);
  }

  @override
  Override overrideWith(Missions Function() create) {
    return ProviderOverride(
      origin: this,
      override: MissionsProvider._internal(
        () => create()..status = status,
        from: from,
        name: null,
        dependencies: null,
        allTransitiveDependencies: null,
        debugGetCreateSourceHash: null,
        status: status,
      ),
    );
  }

  @override
  AutoDisposeAsyncNotifierProviderElement<Missions, List<Mission>>
  createElement() {
    return _MissionsProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is MissionsProvider && other.status == status;
  }

  @override
  int get hashCode {
    var hash = _SystemHash.combine(0, runtimeType.hashCode);
    hash = _SystemHash.combine(hash, status.hashCode);

    return _SystemHash.finish(hash);
  }
}

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
mixin MissionsRef on AutoDisposeAsyncNotifierProviderRef<List<Mission>> {
  /// The parameter `status` of this provider.
  String? get status;
}

class _MissionsProviderElement
    extends AutoDisposeAsyncNotifierProviderElement<Missions, List<Mission>>
    with MissionsRef {
  _MissionsProviderElement(super.provider);

  @override
  String? get status => (origin as MissionsProvider).status;
}

// ignore_for_file: type=lint
// ignore_for_file: subtype_of_sealed_class, invalid_use_of_internal_member, invalid_use_of_visible_for_testing_member, deprecated_member_use_from_same_package
