// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'clients_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

String _$clientServiceHash() => r'cdc74b6899150a698096d83f3645561e3224afdd';

/// Provider pour le service Client (singleton).
///
/// Copied from [clientService].
@ProviderFor(clientService)
final clientServiceProvider = AutoDisposeProvider<ClientService>.internal(
  clientService,
  name: r'clientServiceProvider',
  debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
      ? null
      : _$clientServiceHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
typedef ClientServiceRef = AutoDisposeProviderRef<ClientService>;
String _$clientCountsHash() => r'4ce1cca6006a324d3a8008d827da5dd1118c872f';

/// Provider pour les statistiques clients.
///
/// Copied from [clientCounts].
@ProviderFor(clientCounts)
final clientCountsProvider =
    AutoDisposeFutureProvider<Map<String, int>>.internal(
      clientCounts,
      name: r'clientCountsProvider',
      debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
          ? null
          : _$clientCountsHash,
      dependencies: null,
      allTransitiveDependencies: null,
    );

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
typedef ClientCountsRef = AutoDisposeFutureProviderRef<Map<String, int>>;
String _$clientStatsHash() => r'2cde94f3954d4abab27372a49075e9edb41399bb';

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

/// Provider pour les stats d'un client.
///
/// Copied from [clientStats].
@ProviderFor(clientStats)
const clientStatsProvider = ClientStatsFamily();

/// Provider pour les stats d'un client.
///
/// Copied from [clientStats].
class ClientStatsFamily extends Family<AsyncValue<ClientStats>> {
  /// Provider pour les stats d'un client.
  ///
  /// Copied from [clientStats].
  const ClientStatsFamily();

  /// Provider pour les stats d'un client.
  ///
  /// Copied from [clientStats].
  ClientStatsProvider call(String clientId) {
    return ClientStatsProvider(clientId);
  }

  @override
  ClientStatsProvider getProviderOverride(
    covariant ClientStatsProvider provider,
  ) {
    return call(provider.clientId);
  }

  static const Iterable<ProviderOrFamily>? _dependencies = null;

  @override
  Iterable<ProviderOrFamily>? get dependencies => _dependencies;

  static const Iterable<ProviderOrFamily>? _allTransitiveDependencies = null;

  @override
  Iterable<ProviderOrFamily>? get allTransitiveDependencies =>
      _allTransitiveDependencies;

  @override
  String? get name => r'clientStatsProvider';
}

/// Provider pour les stats d'un client.
///
/// Copied from [clientStats].
class ClientStatsProvider extends AutoDisposeFutureProvider<ClientStats> {
  /// Provider pour les stats d'un client.
  ///
  /// Copied from [clientStats].
  ClientStatsProvider(String clientId)
    : this._internal(
        (ref) => clientStats(ref as ClientStatsRef, clientId),
        from: clientStatsProvider,
        name: r'clientStatsProvider',
        debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
            ? null
            : _$clientStatsHash,
        dependencies: ClientStatsFamily._dependencies,
        allTransitiveDependencies: ClientStatsFamily._allTransitiveDependencies,
        clientId: clientId,
      );

  ClientStatsProvider._internal(
    super._createNotifier, {
    required super.name,
    required super.dependencies,
    required super.allTransitiveDependencies,
    required super.debugGetCreateSourceHash,
    required super.from,
    required this.clientId,
  }) : super.internal();

  final String clientId;

  @override
  Override overrideWith(
    FutureOr<ClientStats> Function(ClientStatsRef provider) create,
  ) {
    return ProviderOverride(
      origin: this,
      override: ClientStatsProvider._internal(
        (ref) => create(ref as ClientStatsRef),
        from: from,
        name: null,
        dependencies: null,
        allTransitiveDependencies: null,
        debugGetCreateSourceHash: null,
        clientId: clientId,
      ),
    );
  }

  @override
  AutoDisposeFutureProviderElement<ClientStats> createElement() {
    return _ClientStatsProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is ClientStatsProvider && other.clientId == clientId;
  }

  @override
  int get hashCode {
    var hash = _SystemHash.combine(0, runtimeType.hashCode);
    hash = _SystemHash.combine(hash, clientId.hashCode);

    return _SystemHash.finish(hash);
  }
}

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
mixin ClientStatsRef on AutoDisposeFutureProviderRef<ClientStats> {
  /// The parameter `clientId` of this provider.
  String get clientId;
}

class _ClientStatsProviderElement
    extends AutoDisposeFutureProviderElement<ClientStats>
    with ClientStatsRef {
  _ClientStatsProviderElement(super.provider);

  @override
  String get clientId => (origin as ClientStatsProvider).clientId;
}

String _$clientsHash() => r'c6a49edd0209c1092a3460a00472a2715d9a8da0';

abstract class _$Clients
    extends BuildlessAutoDisposeAsyncNotifier<List<Client>> {
  late final String? searchQuery;
  late final bool? isCompany;
  late final bool? isFavorite;

  FutureOr<List<Client>> build({
    String? searchQuery,
    bool? isCompany,
    bool? isFavorite,
  });
}

/// Provider pour la liste des clients avec filtrage.
///
/// Copied from [Clients].
@ProviderFor(Clients)
const clientsProvider = ClientsFamily();

/// Provider pour la liste des clients avec filtrage.
///
/// Copied from [Clients].
class ClientsFamily extends Family<AsyncValue<List<Client>>> {
  /// Provider pour la liste des clients avec filtrage.
  ///
  /// Copied from [Clients].
  const ClientsFamily();

  /// Provider pour la liste des clients avec filtrage.
  ///
  /// Copied from [Clients].
  ClientsProvider call({
    String? searchQuery,
    bool? isCompany,
    bool? isFavorite,
  }) {
    return ClientsProvider(
      searchQuery: searchQuery,
      isCompany: isCompany,
      isFavorite: isFavorite,
    );
  }

  @override
  ClientsProvider getProviderOverride(covariant ClientsProvider provider) {
    return call(
      searchQuery: provider.searchQuery,
      isCompany: provider.isCompany,
      isFavorite: provider.isFavorite,
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
  String? get name => r'clientsProvider';
}

/// Provider pour la liste des clients avec filtrage.
///
/// Copied from [Clients].
class ClientsProvider
    extends AutoDisposeAsyncNotifierProviderImpl<Clients, List<Client>> {
  /// Provider pour la liste des clients avec filtrage.
  ///
  /// Copied from [Clients].
  ClientsProvider({String? searchQuery, bool? isCompany, bool? isFavorite})
    : this._internal(
        () => Clients()
          ..searchQuery = searchQuery
          ..isCompany = isCompany
          ..isFavorite = isFavorite,
        from: clientsProvider,
        name: r'clientsProvider',
        debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
            ? null
            : _$clientsHash,
        dependencies: ClientsFamily._dependencies,
        allTransitiveDependencies: ClientsFamily._allTransitiveDependencies,
        searchQuery: searchQuery,
        isCompany: isCompany,
        isFavorite: isFavorite,
      );

  ClientsProvider._internal(
    super._createNotifier, {
    required super.name,
    required super.dependencies,
    required super.allTransitiveDependencies,
    required super.debugGetCreateSourceHash,
    required super.from,
    required this.searchQuery,
    required this.isCompany,
    required this.isFavorite,
  }) : super.internal();

  final String? searchQuery;
  final bool? isCompany;
  final bool? isFavorite;

  @override
  FutureOr<List<Client>> runNotifierBuild(covariant Clients notifier) {
    return notifier.build(
      searchQuery: searchQuery,
      isCompany: isCompany,
      isFavorite: isFavorite,
    );
  }

  @override
  Override overrideWith(Clients Function() create) {
    return ProviderOverride(
      origin: this,
      override: ClientsProvider._internal(
        () => create()
          ..searchQuery = searchQuery
          ..isCompany = isCompany
          ..isFavorite = isFavorite,
        from: from,
        name: null,
        dependencies: null,
        allTransitiveDependencies: null,
        debugGetCreateSourceHash: null,
        searchQuery: searchQuery,
        isCompany: isCompany,
        isFavorite: isFavorite,
      ),
    );
  }

  @override
  AutoDisposeAsyncNotifierProviderElement<Clients, List<Client>>
  createElement() {
    return _ClientsProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is ClientsProvider &&
        other.searchQuery == searchQuery &&
        other.isCompany == isCompany &&
        other.isFavorite == isFavorite;
  }

  @override
  int get hashCode {
    var hash = _SystemHash.combine(0, runtimeType.hashCode);
    hash = _SystemHash.combine(hash, searchQuery.hashCode);
    hash = _SystemHash.combine(hash, isCompany.hashCode);
    hash = _SystemHash.combine(hash, isFavorite.hashCode);

    return _SystemHash.finish(hash);
  }
}

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
mixin ClientsRef on AutoDisposeAsyncNotifierProviderRef<List<Client>> {
  /// The parameter `searchQuery` of this provider.
  String? get searchQuery;

  /// The parameter `isCompany` of this provider.
  bool? get isCompany;

  /// The parameter `isFavorite` of this provider.
  bool? get isFavorite;
}

class _ClientsProviderElement
    extends AutoDisposeAsyncNotifierProviderElement<Clients, List<Client>>
    with ClientsRef {
  _ClientsProviderElement(super.provider);

  @override
  String? get searchQuery => (origin as ClientsProvider).searchQuery;
  @override
  bool? get isCompany => (origin as ClientsProvider).isCompany;
  @override
  bool? get isFavorite => (origin as ClientsProvider).isFavorite;
}

// ignore_for_file: type=lint
// ignore_for_file: subtype_of_sealed_class, invalid_use_of_internal_member, invalid_use_of_visible_for_testing_member, deprecated_member_use_from_same_package
