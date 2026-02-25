import 'dart:async';
import 'dart:io';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/foundation.dart';
import '../utils/logger.dart';

/// Service de gestion de la connectivité réseau
/// Permet de détecter si l'application est en ligne ou hors ligne
class ConnectivityService extends ChangeNotifier {
  final Connectivity _connectivity = Connectivity();
  bool _isOnline = true;
  StreamSubscription<List<ConnectivityResult>>? _subscription;
  
  bool get isOnline => _isOnline;
  bool get isOffline => !_isOnline;
  
  ConnectivityService() {
    _checkInitialConnectivity();
    _listenToConnectivityChanges();
  }
  
  /// Vérifie la connectivité initiale au démarrage
  Future<void> _checkInitialConnectivity() async {
    try {
      final result = await _connectivity.checkConnectivity();
      _updateConnectionStatus(result);
    } catch (e) {
      logger.e('Erreur vérification connectivité: $e');
      _isOnline = false;
      notifyListeners();
    }
  }
  
  /// Écoute les changements de connectivité
  void _listenToConnectivityChanges() {
    _subscription = _connectivity.onConnectivityChanged.listen((List<ConnectivityResult> results) {
      if (results.isNotEmpty) {
        _updateConnectionStatus(results);
      }
    });
  }
  
  /// Met à jour le statut de connexion
  void _updateConnectionStatus(List<ConnectivityResult> results) {
    final wasOnline = _isOnline;
    
    // Si aucun résultat ou que tous sont 'none', on est offline
    _isOnline = results.isNotEmpty && 
                results.any((result) => result != ConnectivityResult.none);
    
    // Notifier uniquement si le statut a changé
    if (wasOnline != _isOnline) {
      logger.i('Connectivité changée: ${_isOnline ? "EN LIGNE" : "HORS LIGNE"}');
      notifyListeners();
    }
  }
  
  /// Vérifie manuellement la connectivité
  Future<bool> checkConnectivity() async {
    try {
      final results = await _connectivity.checkConnectivity();
      _updateConnectionStatus(results);
      // Also verify real internet access
      if (_isOnline) {
        _isOnline = await _hasRealInternet();
      }
      return _isOnline;
    } catch (e) {
      logger.e('Erreur vérification manuelle: $e');
      return false;
    }
  }

  /// Vérifie si internet est vraiment accessible (DNS lookup)
  Future<bool> _hasRealInternet() async {
    try {
      final result = await InternetAddress.lookup('google.com')
          .timeout(const Duration(seconds: 3));
      return result.isNotEmpty && result[0].rawAddress.isNotEmpty;
    } catch (_) {
      return false;
    }
  }

  @override
  void dispose() {
    _subscription?.cancel();
    super.dispose();
  }
}
