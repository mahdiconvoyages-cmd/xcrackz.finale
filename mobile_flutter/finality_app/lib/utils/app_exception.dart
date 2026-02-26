/// Exceptions typées pour l'application CHECKSFLEET.
///
/// Chaque type déclenche une UI / message / comportement différent,
/// ce qui remplace les `Exception('Erreur: $e')` génériques.

// ─────────────────────────────────────────────────
//  Base exception
// ─────────────────────────────────────────────────

/// Exception de base de l'application.
/// Toutes les exceptions CHECKSFLEET en héritent.
sealed class AppException implements Exception {
  final String message;
  final String? technicalDetail;
  final Object? cause;

  const AppException(this.message, {this.technicalDetail, this.cause});

  /// Message affichable à l'utilisateur.
  String get userMessage => message;

  @override
  String toString() => 'AppException: $message';
}

// ─────────────────────────────────────────────────
//  Network exceptions
// ─────────────────────────────────────────────────

/// Pas de connexion internet.
class NetworkException extends AppException {
  const NetworkException([
    super.message = 'Vérifiez votre connexion internet et réessayez.',
    Object? cause,
  ]) : super(cause: cause);
}

/// Timeout de requête réseau.
class TimeoutException extends AppException {
  const TimeoutException([
    super.message = 'Le serveur met trop de temps à répondre. Réessayez.',
    Object? cause,
  ]) : super(cause: cause);
}

// ─────────────────────────────────────────────────
//  Auth exceptions
// ─────────────────────────────────────────────────

/// Session expirée ou utilisateur non connecté.
class AuthException extends AppException {
  const AuthException([
    super.message = 'Votre session a expiré. Veuillez vous reconnecter.',
    Object? cause,
  ]) : super(cause: cause);
}

/// Email non vérifié.
class EmailNotVerifiedException extends AppException {
  const EmailNotVerifiedException([
    super.message = 'Veuillez confirmer votre adresse email avant de continuer.',
    Object? cause,
  ]) : super(cause: cause);
}

// ─────────────────────────────────────────────────
//  Business exceptions
// ─────────────────────────────────────────────────

/// Crédits insuffisants.
class InsufficientCreditsException extends AppException {
  final int required;
  final int available;

  const InsufficientCreditsException({
    this.required = 0,
    this.available = 0,
  }) : super('Crédits insuffisants. Il vous faut $required crédits (vous en avez $available).');
}

/// Ressource introuvable.
class NotFoundException extends AppException {
  const NotFoundException([
    super.message = 'L\'élément demandé est introuvable.',
    Object? cause,
  ]) : super(cause: cause);
}

/// Action non autorisée (RLS / permissions).
class ForbiddenException extends AppException {
  const ForbiddenException([
    super.message = 'Vous n\'avez pas les droits pour effectuer cette action.',
    Object? cause,
  ]) : super(cause: cause);
}

/// Validation métier échouée.
class ValidationException extends AppException {
  final Map<String, String> fieldErrors;

  const ValidationException(
    super.message, {
    this.fieldErrors = const {},
    Object? cause,
  }) : super(cause: cause);
}

/// Abonnement requis / expiré.
class SubscriptionRequiredException extends AppException {
  const SubscriptionRequiredException([
    super.message = 'Cette fonctionnalité nécessite un abonnement actif.',
    Object? cause,
  ]) : super(cause: cause);
}

// ─────────────────────────────────────────────────
//  Server exceptions
// ─────────────────────────────────────────────────

/// Erreur serveur inattendue.
class ServerException extends AppException {
  const ServerException([
    super.message = 'Le service est temporairement indisponible. Réessayez dans quelques instants.',
    Object? cause,
  ]) : super(cause: cause);
}

// ─────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────

/// Convertit n'importe quelle erreur brute en [AppException] typée.
AppException toAppException(Object error) {
  if (error is AppException) return error;

  final msg = error.toString().toLowerCase();

  // Network
  if (msg.contains('socketexception') ||
      msg.contains('connection refused') ||
      msg.contains('network is unreachable') ||
      msg.contains('no internet') ||
      msg.contains('failed host lookup')) {
    return NetworkException('Connexion impossible. Vérifiez votre réseau.', error);
  }
  if (msg.contains('timeout') || msg.contains('timed out')) {
    return TimeoutException('Le serveur ne répond pas. Réessayez.', error);
  }

  // Auth
  if (msg.contains('not authenticated') ||
      msg.contains('jwt expired') ||
      msg.contains('invalid jwt') ||
      msg.contains('session_not_found') ||
      msg.contains('utilisateur non connecté')) {
    return AuthException('Session expirée. Reconnectez-vous.', error);
  }
  if (msg.contains('email not confirmed')) {
    return const EmailNotVerifiedException();
  }

  // Business
  if (msg.contains('insuffisants') || msg.contains('insufficient credits')) {
    return const InsufficientCreditsException();
  }
  if (msg.contains('not found') || msg.contains('introuvable') || msg.contains('no rows')) {
    return NotFoundException('Élément introuvable.', error);
  }
  if (msg.contains('permission denied') ||
      msg.contains('rls') ||
      msg.contains('policy')) {
    return ForbiddenException('Accès refusé.', error);
  }

  // Server
  if (msg.contains('500') || msg.contains('internal server')) {
    return ServerException('Erreur serveur. Réessayez plus tard.', error);
  }

  // Default
  return ServerException('Une erreur inattendue est survenue.', error);
}
