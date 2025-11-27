import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import '../utils/logger.dart';

part 'connectivity_provider.g.dart';

/// Provider Riverpod pour la connectivité réseau
@riverpod
class ConnectivityNotifier extends _$ConnectivityNotifier {
  final Connectivity _connectivity = Connectivity();

  @override
  bool build() {
    // Initialiser l'écoute des changements de connectivité
    _listenToConnectivityChanges();
    _checkInitialConnectivity();
    return true; // Supposer en ligne par défaut
  }

  /// Vérifie la connectivité initiale au démarrage
  Future<void> _checkInitialConnectivity() async {
    try {
      final results = await _connectivity.checkConnectivity();
      _updateConnectionStatus(results);
    } catch (e) {
      logger.w('⚠️ Error checking connectivity: $e');
      state = false;
    }
  }

  /// Écoute les changements de connectivité
  void _listenToConnectivityChanges() {
    _connectivity.onConnectivityChanged.listen((List<ConnectivityResult> results) {
      if (results.isNotEmpty) {
        _updateConnectionStatus(results);
      }
    });
  }

  /// Met à jour le statut de connexion
  void _updateConnectionStatus(List<ConnectivityResult> results) {
    final wasOnline = state;
    
    // Si aucun résultat ou que tous sont 'none', on est offline
    final isOnline = results.isNotEmpty && 
                     results.any((result) => result != ConnectivityResult.none);
    
    // Notifier uniquement si le statut a changé
    if (wasOnline != isOnline) {
      logger.i('📡 Connectivity changed: ${isOnline ? "ONLINE" : "OFFLINE"}');
      state = isOnline;
    }
  }

  /// Vérifie manuellement la connectivité
  Future<bool> checkConnectivity() async {
    try {
      final results = await _connectivity.checkConnectivity();
      _updateConnectionStatus(results);
      return state;
    } catch (e) {
      logger.w('⚠️ Error checking connectivity: $e');
      return false;
    }
  }
}

/// Provider simple pour savoir si on est en ligne
final isOnlineProvider = Provider<bool>((ref) {
  return ref.watch(connectivityNotifierProvider);
});

/// Provider pour savoir si on est hors ligne
final isOfflineProvider = Provider<bool>((ref) {
  return !ref.watch(connectivityNotifierProvider);
});
