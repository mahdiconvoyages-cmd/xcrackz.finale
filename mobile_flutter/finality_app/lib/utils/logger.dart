import 'package:flutter/foundation.dart';
import 'package:logger/logger.dart';

/// Logger professionnel pour l'application
/// Remplace print() et debugPrint()
class AppLogger {
  static final AppLogger _instance = AppLogger._internal();
  factory AppLogger() => _instance;
  AppLogger._internal();

  late final Logger _logger;

  void init() {
    _logger = Logger(
      printer: PrettyPrinter(
        methodCount: 0, // Pas de stack trace par défaut
        errorMethodCount: 5, // Stack trace sur erreurs
        lineLength: 80,
        colors: true,
        printEmojis: true,
        printTime: true,
      ),
      level: kDebugMode ? Level.debug : Level.error,
    );
  }

  /// Log de debug (développement uniquement)
  void d(dynamic message, [dynamic error, StackTrace? stackTrace]) {
    _logger.d(message, error: error, stackTrace: stackTrace);
  }

  /// Log d'information
  void i(dynamic message, [dynamic error, StackTrace? stackTrace]) {
    _logger.i(message, error: error, stackTrace: stackTrace);
  }

  /// Log d'avertissement
  void w(dynamic message, [dynamic error, StackTrace? stackTrace]) {
    _logger.w(message, error: error, stackTrace: stackTrace);
  }

  /// Log d'erreur
  void e(dynamic message, [dynamic error, StackTrace? stackTrace]) {
    _logger.e(message, error: error, stackTrace: stackTrace);
  }

  /// Log d'erreur fatale
  void f(dynamic message, [dynamic error, StackTrace? stackTrace]) {
    _logger.f(message, error: error, stackTrace: stackTrace);
  }
}

// Instance globale
final logger = AppLogger();
