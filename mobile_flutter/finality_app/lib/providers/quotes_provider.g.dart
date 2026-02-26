// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'quotes_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

String _$quoteServiceHash() => r'438df9389eb0b527f98d33b3c48f9a9dbbf63280';

/// Provider pour le service Quote (singleton).
///
/// Copied from [quoteService].
@ProviderFor(quoteService)
final quoteServiceProvider = AutoDisposeProvider<QuoteService>.internal(
  quoteService,
  name: r'quoteServiceProvider',
  debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
      ? null
      : _$quoteServiceHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
typedef QuoteServiceRef = AutoDisposeProviderRef<QuoteService>;
String _$quotesHash() => r'6060f3fbff32a90b7dcd9b61f585592c159a255f';

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

abstract class _$Quotes extends BuildlessAutoDisposeAsyncNotifier<List<Quote>> {
  late final String? status;

  FutureOr<List<Quote>> build({String? status});
}

/// Provider pour la liste des devis avec filtrage.
///
/// Copied from [Quotes].
@ProviderFor(Quotes)
const quotesProvider = QuotesFamily();

/// Provider pour la liste des devis avec filtrage.
///
/// Copied from [Quotes].
class QuotesFamily extends Family<AsyncValue<List<Quote>>> {
  /// Provider pour la liste des devis avec filtrage.
  ///
  /// Copied from [Quotes].
  const QuotesFamily();

  /// Provider pour la liste des devis avec filtrage.
  ///
  /// Copied from [Quotes].
  QuotesProvider call({String? status}) {
    return QuotesProvider(status: status);
  }

  @override
  QuotesProvider getProviderOverride(covariant QuotesProvider provider) {
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
  String? get name => r'quotesProvider';
}

/// Provider pour la liste des devis avec filtrage.
///
/// Copied from [Quotes].
class QuotesProvider
    extends AutoDisposeAsyncNotifierProviderImpl<Quotes, List<Quote>> {
  /// Provider pour la liste des devis avec filtrage.
  ///
  /// Copied from [Quotes].
  QuotesProvider({String? status})
    : this._internal(
        () => Quotes()..status = status,
        from: quotesProvider,
        name: r'quotesProvider',
        debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
            ? null
            : _$quotesHash,
        dependencies: QuotesFamily._dependencies,
        allTransitiveDependencies: QuotesFamily._allTransitiveDependencies,
        status: status,
      );

  QuotesProvider._internal(
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
  FutureOr<List<Quote>> runNotifierBuild(covariant Quotes notifier) {
    return notifier.build(status: status);
  }

  @override
  Override overrideWith(Quotes Function() create) {
    return ProviderOverride(
      origin: this,
      override: QuotesProvider._internal(
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
  AutoDisposeAsyncNotifierProviderElement<Quotes, List<Quote>> createElement() {
    return _QuotesProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is QuotesProvider && other.status == status;
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
mixin QuotesRef on AutoDisposeAsyncNotifierProviderRef<List<Quote>> {
  /// The parameter `status` of this provider.
  String? get status;
}

class _QuotesProviderElement
    extends AutoDisposeAsyncNotifierProviderElement<Quotes, List<Quote>>
    with QuotesRef {
  _QuotesProviderElement(super.provider);

  @override
  String? get status => (origin as QuotesProvider).status;
}

// ignore_for_file: type=lint
// ignore_for_file: subtype_of_sealed_class, invalid_use_of_internal_member, invalid_use_of_visible_for_testing_member, deprecated_member_use_from_same_package
