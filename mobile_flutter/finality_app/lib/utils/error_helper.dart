/// Helper pour formater les messages d'erreur de manière sécurisée
/// Ne jamais exposer les URLs, tokens ou détails techniques sensibles
class ErrorHelper {
  /// Nettoie un message d'erreur pour l'affichage utilisateur
  /// Retire les URLs, tokens, et autres informations sensibles
  static String cleanError(dynamic error) {
    if (error == null) return 'Une erreur inconnue s\'est produite';
    
    final errorStr = error.toString();
    
    // Détecter les erreurs Supabase communes
    if (errorStr.contains('JWT') || errorStr.contains('token')) {
      return 'Erreur d\'authentification. Veuillez vous reconnecter';
    }
    
    if (errorStr.contains('supabase.co') || errorStr.contains('http')) {
      return 'Erreur de connexion au serveur';
    }
    
    if (errorStr.contains('storage') || errorStr.contains('bucket')) {
      return 'Erreur lors de l\'upload du fichier';
    }
    
    if (errorStr.contains('network') || errorStr.contains('Network')) {
      return 'Erreur réseau. Vérifiez votre connexion';
    }
    
    if (errorStr.contains('permission') || errorStr.contains('Permission')) {
      return 'Permissions insuffisantes pour cette action';
    }
    
    if (errorStr.contains('not found') || errorStr.contains('Not found')) {
      return 'Élément introuvable';
    }
    
    // Messages génériques pour les autres erreurs
    return 'Une erreur s\'est produite. Veuillez réessayer';
  }
}
