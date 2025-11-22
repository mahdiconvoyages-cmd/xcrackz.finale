import 'dart:io';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Service centralisé pour Supabase
class SupabaseService {
  static final SupabaseClient _client = Supabase.instance.client;
  
  /// Obtenir le client Supabase
  SupabaseClient get client => _client;
  static SupabaseClient get staticClient => _client;
  
  /// Obtenir l'utilisateur actuel
  static User? get currentUser => _client.auth.currentUser;
  
  /// Vérifier si l'utilisateur est connecté
  static bool get isAuthenticated => currentUser != null;
  
  /// Obtenir l'ID de l'utilisateur actuel
  static String? get currentUserId => currentUser?.id;
  
  /// Upload file to Supabase Storage with progress tracking
  static Future<String> uploadFile(
    File file,
    String path, {
    Function(double)? onProgress,
  }) async {
    final bytes = await file.readAsBytes();
    final totalBytes = bytes.length;
    
    // Simulate progress (Supabase SDK doesn't provide real-time progress)
    if (onProgress != null) {
      onProgress(0.3);
      await Future.delayed(const Duration(milliseconds: 500));
      onProgress(0.6);
    }
    
    final uploadPath = await _client.storage
        .from('documents')
        .uploadBinary(path, bytes);
    
    if (onProgress != null) {
      onProgress(1.0);
    }
    
    final publicUrl = _client.storage
        .from('documents')
        .getPublicUrl(path);
    
    return publicUrl;
  }
  
  /// Instance unique du service
  static final SupabaseService _instance = SupabaseService._internal();
  
  factory SupabaseService() {
    return _instance;
  }
  
  SupabaseService._internal();
}

