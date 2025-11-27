// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'subscription_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

String _$subscriptionServiceHash() =>
    r'51fb58091d7babc315c400f9d2c3d7beebd82fc8';

/// Provider pour le service d'abonnement
///
/// Copied from [subscriptionService].
@ProviderFor(subscriptionService)
final subscriptionServiceProvider =
    AutoDisposeProvider<SubscriptionService>.internal(
      subscriptionService,
      name: r'subscriptionServiceProvider',
      debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
          ? null
          : _$subscriptionServiceHash,
      dependencies: null,
      allTransitiveDependencies: null,
    );

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
typedef SubscriptionServiceRef = AutoDisposeProviderRef<SubscriptionService>;
String _$subscriptionHash() => r'c123500ad45920517d8029f09aba64603b305951';

/// Provider Riverpod pour l'abonnement
///
/// Copied from [Subscription].
@ProviderFor(Subscription)
final subscriptionProvider =
    AutoDisposeNotifierProvider<Subscription, SubscriptionState>.internal(
      Subscription.new,
      name: r'subscriptionProvider',
      debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
          ? null
          : _$subscriptionHash,
      dependencies: null,
      allTransitiveDependencies: null,
    );

typedef _$Subscription = AutoDisposeNotifier<SubscriptionState>;
// ignore_for_file: type=lint
// ignore_for_file: subtype_of_sealed_class, invalid_use_of_internal_member, invalid_use_of_visible_for_testing_member, deprecated_member_use_from_same_package
