// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'credits_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

String _$creditsServiceHash() => r'a1047318a5fafec21f4d3c7b3aa454828685ef45';

/// Provider pour le service de crédits
///
/// Copied from [creditsService].
@ProviderFor(creditsService)
final creditsServiceProvider = AutoDisposeProvider<CreditsService>.internal(
  creditsService,
  name: r'creditsServiceProvider',
  debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
      ? null
      : _$creditsServiceHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
typedef CreditsServiceRef = AutoDisposeProviderRef<CreditsService>;
String _$creditsHash() => r'82a06b3c822c080b7f8c5a1c9fd2454fb3efcec1';

/// Provider Riverpod pour les crédits
///
/// Copied from [Credits].
@ProviderFor(Credits)
final creditsProvider =
    AutoDisposeNotifierProvider<Credits, CreditsState>.internal(
      Credits.new,
      name: r'creditsProvider',
      debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
          ? null
          : _$creditsHash,
      dependencies: null,
      allTransitiveDependencies: null,
    );

typedef _$Credits = AutoDisposeNotifier<CreditsState>;
// ignore_for_file: type=lint
// ignore_for_file: subtype_of_sealed_class, invalid_use_of_internal_member, invalid_use_of_visible_for_testing_member, deprecated_member_use_from_same_package
