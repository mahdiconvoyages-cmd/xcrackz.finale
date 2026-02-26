// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'invoices_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

String _$invoiceServiceHash() => r'4e6a6d3355fed50596839a91c3570db2534d4597';

/// Provider pour le service Invoice (singleton).
///
/// Copied from [invoiceService].
@ProviderFor(invoiceService)
final invoiceServiceProvider = AutoDisposeProvider<InvoiceService>.internal(
  invoiceService,
  name: r'invoiceServiceProvider',
  debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
      ? null
      : _$invoiceServiceHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
typedef InvoiceServiceRef = AutoDisposeProviderRef<InvoiceService>;
String _$invoiceStatsHash() => r'ffe193c4bad6b3c2189afbaddfd92f9c97e9b3b8';

/// Provider pour les stats factures.
///
/// Copied from [invoiceStats].
@ProviderFor(invoiceStats)
final invoiceStatsProvider =
    AutoDisposeFutureProvider<Map<String, dynamic>>.internal(
      invoiceStats,
      name: r'invoiceStatsProvider',
      debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
          ? null
          : _$invoiceStatsHash,
      dependencies: null,
      allTransitiveDependencies: null,
    );

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
typedef InvoiceStatsRef = AutoDisposeFutureProviderRef<Map<String, dynamic>>;
String _$invoicesHash() => r'a10babb5fa89e0c43c7055a084e6ea12346e986d';

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

abstract class _$Invoices
    extends BuildlessAutoDisposeAsyncNotifier<List<Invoice>> {
  late final String? status;

  FutureOr<List<Invoice>> build({String? status});
}

/// Provider pour la liste des factures avec filtrage.
///
/// Copied from [Invoices].
@ProviderFor(Invoices)
const invoicesProvider = InvoicesFamily();

/// Provider pour la liste des factures avec filtrage.
///
/// Copied from [Invoices].
class InvoicesFamily extends Family<AsyncValue<List<Invoice>>> {
  /// Provider pour la liste des factures avec filtrage.
  ///
  /// Copied from [Invoices].
  const InvoicesFamily();

  /// Provider pour la liste des factures avec filtrage.
  ///
  /// Copied from [Invoices].
  InvoicesProvider call({String? status}) {
    return InvoicesProvider(status: status);
  }

  @override
  InvoicesProvider getProviderOverride(covariant InvoicesProvider provider) {
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
  String? get name => r'invoicesProvider';
}

/// Provider pour la liste des factures avec filtrage.
///
/// Copied from [Invoices].
class InvoicesProvider
    extends AutoDisposeAsyncNotifierProviderImpl<Invoices, List<Invoice>> {
  /// Provider pour la liste des factures avec filtrage.
  ///
  /// Copied from [Invoices].
  InvoicesProvider({String? status})
    : this._internal(
        () => Invoices()..status = status,
        from: invoicesProvider,
        name: r'invoicesProvider',
        debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
            ? null
            : _$invoicesHash,
        dependencies: InvoicesFamily._dependencies,
        allTransitiveDependencies: InvoicesFamily._allTransitiveDependencies,
        status: status,
      );

  InvoicesProvider._internal(
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
  FutureOr<List<Invoice>> runNotifierBuild(covariant Invoices notifier) {
    return notifier.build(status: status);
  }

  @override
  Override overrideWith(Invoices Function() create) {
    return ProviderOverride(
      origin: this,
      override: InvoicesProvider._internal(
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
  AutoDisposeAsyncNotifierProviderElement<Invoices, List<Invoice>>
  createElement() {
    return _InvoicesProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is InvoicesProvider && other.status == status;
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
mixin InvoicesRef on AutoDisposeAsyncNotifierProviderRef<List<Invoice>> {
  /// The parameter `status` of this provider.
  String? get status;
}

class _InvoicesProviderElement
    extends AutoDisposeAsyncNotifierProviderElement<Invoices, List<Invoice>>
    with InvoicesRef {
  _InvoicesProviderElement(super.provider);

  @override
  String? get status => (origin as InvoicesProvider).status;
}

// ignore_for_file: type=lint
// ignore_for_file: subtype_of_sealed_class, invalid_use_of_internal_member, invalid_use_of_visible_for_testing_member, deprecated_member_use_from_same_package
