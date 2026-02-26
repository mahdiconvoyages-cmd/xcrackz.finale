import 'package:flutter/material.dart';
import 'app_exception.dart';

/// Widget utilitaire pour afficher des erreurs [AppException] de manière
/// adaptée au type d'erreur.
///
/// Usage :
/// ```dart
/// } catch (e) {
///   if (mounted) AppErrorHandler.show(context, e);
/// }
/// ```
class AppErrorHandler {
  AppErrorHandler._();

  /// Affiche un SnackBar adapté au type d'erreur.
  static void show(BuildContext context, Object error, {VoidCallback? onRetry}) {
    final appError = error is AppException ? error : toAppException(error);

    final Color backgroundColor;
    final IconData icon;
    final Duration duration;
    final SnackBarAction? action;

    switch (appError) {
      case NetworkException() || TimeoutException():
        backgroundColor = Colors.orange.shade700;
        icon = Icons.wifi_off_rounded;
        duration = const Duration(seconds: 5);
        action = onRetry != null
            ? SnackBarAction(label: 'Réessayer', textColor: Colors.white, onPressed: onRetry)
            : null;

      case AuthException() || EmailNotVerifiedException():
        backgroundColor = Colors.red.shade700;
        icon = Icons.lock_outline_rounded;
        duration = const Duration(seconds: 4);
        action = null;

      case InsufficientCreditsException():
        backgroundColor = Colors.deepPurple;
        icon = Icons.monetization_on_rounded;
        duration = const Duration(seconds: 5);
        action = null;

      case NotFoundException():
        backgroundColor = Colors.blueGrey;
        icon = Icons.search_off_rounded;
        duration = const Duration(seconds: 3);
        action = null;

      case ForbiddenException():
        backgroundColor = Colors.red.shade800;
        icon = Icons.block_rounded;
        duration = const Duration(seconds: 4);
        action = null;

      case ValidationException():
        backgroundColor = Colors.amber.shade800;
        icon = Icons.warning_amber_rounded;
        duration = const Duration(seconds: 4);
        action = null;

      case SubscriptionRequiredException():
        backgroundColor = Colors.indigo;
        icon = Icons.workspace_premium_rounded;
        duration = const Duration(seconds: 5);
        action = null;

      case ServerException():
        backgroundColor = Colors.red.shade600;
        icon = Icons.cloud_off_rounded;
        duration = const Duration(seconds: 4);
        action = onRetry != null
            ? SnackBarAction(label: 'Réessayer', textColor: Colors.white, onPressed: onRetry)
            : null;
    }

    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(icon, color: Colors.white, size: 20),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                appError.userMessage,
                style: const TextStyle(color: Colors.white, fontSize: 14),
                maxLines: 3,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
        backgroundColor: backgroundColor,
        duration: duration,
        action: action,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      ),
    );
  }
}
