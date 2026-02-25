import 'dart:io';
import 'dart:typed_data';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/inspection_photo.dart';
import '../models/inspection_damage.dart';

class InspectionPhotoService {
  final SupabaseClient _supabase = Supabase.instance.client;

  // ============================================
  // GESTION DES PHOTOS
  // ============================================

  /// Récupérer toutes les photos d'une inspection
  Future<List<InspectionPhoto>> getPhotosByInspection(String inspectionId) async {
    try {
      final response = await _supabase
          .from('inspection_photos_v2')
          .select('*')
          .eq('inspection_id', inspectionId)
          .order('created_at', ascending: true);

      return (response as List)
          .map((json) => InspectionPhoto.fromJson(json))
          .toList();
    } catch (e) {
      throw Exception('Erreur lors du chargement des photos: $e');
    }
  }

  /// Récupérer les photos par catégorie
  Future<List<InspectionPhoto>> getPhotosByCategory(
    String inspectionId,
    PhotoCategory category,
  ) async {
    try {
      final response = await _supabase
          .from('inspection_photos')
          .select()
          .eq('inspection_id', inspectionId)
          .eq('category', category.value)
          .order('created_at', ascending: true);

      return (response as List)
          .map((json) => InspectionPhoto.fromJson(json))
          .toList();
    } catch (e) {
      throw Exception('Erreur lors du chargement des photos: $e');
    }
  }

  /// Upload une photo vers le bucket et enregistre dans la table
  Future<InspectionPhoto> uploadPhoto({
    required String inspectionId,
    required File photoFile,
    required PhotoCategory category,
  }) async {
    try {
      // 1. Upload vers Storage
      final fileName = '${inspectionId}_${category.value}_${DateTime.now().millisecondsSinceEpoch}.jpg';
      final path = 'inspections/$inspectionId/$fileName';

      await _supabase.storage
          .from('inspection-photos')
          .upload(path, photoFile);

      // 2. Obtenir l'URL publique
      final publicUrl = _supabase.storage
          .from('inspection-photos')
          .getPublicUrl(path);

      // 3. Enregistrer dans la table inspection_photos
      final response = await _supabase
          .from('inspection_photos')
          .insert({
            'inspection_id': inspectionId,
            'category': category.value,
            'photo_url': publicUrl,
          })
          .select()
          .single();

      return InspectionPhoto.fromJson(response);
    } catch (e) {
      throw Exception('Erreur lors de l\'upload de la photo: $e');
    }
  }

  /// Upload une photo depuis bytes (pour web)
  Future<InspectionPhoto> uploadPhotoFromBytes({
    required String inspectionId,
    required List<int> photoBytes,
    required PhotoCategory category,
    String fileExtension = 'jpg',
  }) async {
    try {
      // 1. Upload vers Storage
      final fileName = '${inspectionId}_${category.value}_${DateTime.now().millisecondsSinceEpoch}.$fileExtension';
      final path = 'inspections/$inspectionId/$fileName';

      await _supabase.storage
          .from('inspection-photos')
          .uploadBinary(path, Uint8List.fromList(photoBytes));

      // 2. Obtenir l'URL publique
      final publicUrl = _supabase.storage
          .from('inspection-photos')
          .getPublicUrl(path);

      // 3. Enregistrer dans la table inspection_photos
      final response = await _supabase
          .from('inspection_photos')
          .insert({
            'inspection_id': inspectionId,
            'category': category.value,
            'photo_url': publicUrl,
          })
          .select()
          .single();

      return InspectionPhoto.fromJson(response);
    } catch (e) {
      throw Exception('Erreur lors de l\'upload de la photo: $e');
    }
  }

  /// Supprimer une photo
  Future<void> deletePhoto(String photoId, String photoUrl) async {
    try {
      // 1. Extraire le path depuis l'URL
      final uri = Uri.parse(photoUrl);
      final path = uri.pathSegments.skip(uri.pathSegments.indexOf('inspection-photos') + 1).join('/');

      // 2. Supprimer du storage
      await _supabase.storage
          .from('inspection-photos')
          .remove([path]);

      // 3. Supprimer de la table
      await _supabase
          .from('inspection_photos_v2')
          .delete()
          .eq('id', photoId);
    } catch (e) {
      throw Exception('Erreur lors de la suppression de la photo: $e');
    }
  }

  // ============================================
  // GESTION DES DOMMAGES
  // ============================================

  /// Récupérer tous les dommages d'une inspection
  Future<List<InspectionDamage>> getDamagesByInspection(String inspectionId) async {
    try {
      final response = await _supabase
          .from('inspection_damages')
          .select()
          .eq('inspection_id', inspectionId)
          .order('created_at', ascending: true);

      return (response as List)
          .map((json) => InspectionDamage.fromJson(json))
          .toList();
    } catch (e) {
      throw Exception('Erreur lors du chargement des dommages: $e');
    }
  }

  /// Créer un nouveau dommage
  Future<InspectionDamage> createDamage({
    required String inspectionId,
    required String damageLocation,
    required DamageSeverity severity,
    String? description,
    File? photoFile,
  }) async {
    try {
      String? photoUrl;

      // 1. Upload de la photo si fournie
      if (photoFile != null) {
        final fileName = '${inspectionId}_damage_${DateTime.now().millisecondsSinceEpoch}.jpg';
        final path = 'damages/$inspectionId/$fileName';

        await _supabase.storage
            .from('inspection-photos')
            .upload(path, photoFile);

        photoUrl = _supabase.storage
            .from('inspection-photos')
            .getPublicUrl(path);
      }

      // 2. Créer l'entrée dans la table
      final response = await _supabase
          .from('inspection_damages')
          .insert({
            'inspection_id': inspectionId,
            'damage_location': damageLocation,
            'damage_severity': severity.value,
            'description': description,
            'photo_url': photoUrl,
          })
          .select()
          .single();

      return InspectionDamage.fromJson(response);
    } catch (e) {
      throw Exception('Erreur lors de la création du dommage: $e');
    }
  }

  /// Mettre à jour un dommage
  Future<InspectionDamage> updateDamage({
    required String damageId,
    String? damageLocation,
    DamageSeverity? severity,
    String? description,
  }) async {
    try {
      final updates = <String, dynamic>{};
      
      if (damageLocation != null) updates['damage_location'] = damageLocation;
      if (severity != null) updates['damage_severity'] = severity.value;
      if (description != null) updates['description'] = description;

      final response = await _supabase
          .from('inspection_damages')
          .update(updates)
          .eq('id', damageId)
          .select()
          .single();

      return InspectionDamage.fromJson(response);
    } catch (e) {
      throw Exception('Erreur lors de la mise à jour du dommage: $e');
    }
  }

  /// Supprimer un dommage
  Future<void> deleteDamage(String damageId, String? photoUrl) async {
    try {
      // 1. Supprimer la photo du storage si elle existe
      if (photoUrl != null) {
        final uri = Uri.parse(photoUrl);
        final path = uri.pathSegments.skip(uri.pathSegments.indexOf('inspection-photos') + 1).join('/');
        
        await _supabase.storage
            .from('inspection-photos')
            .remove([path]);
      }

      // 2. Supprimer de la table
      await _supabase
          .from('inspection_damages')
          .delete()
          .eq('id', damageId);
    } catch (e) {
      throw Exception('Erreur lors de la suppression du dommage: $e');
    }
  }

  // ============================================
  // UTILITAIRES
  // ============================================

  /// Compter le nombre de photos par inspection
  Future<int> countPhotos(String inspectionId) async {
    try {
      final response = await _supabase
          .from('inspection_photos_v2')
          .select('id')
          .eq('inspection_id', inspectionId)
          .count();

      return response.count;
    } catch (e) {
      throw Exception('Erreur lors du comptage des photos: $e');
    }
  }

  /// Compter le nombre de dommages par inspection
  Future<int> countDamages(String inspectionId) async {
    try {
      final response = await _supabase
          .from('inspection_damages')
          .select('id')
          .eq('inspection_id', inspectionId)
          .count();

      return response.count;
    } catch (e) {
      throw Exception('Erreur lors du comptage des dommages: $e');
    }
  }

  /// Vérifier si toutes les photos obligatoires sont présentes
  Future<bool> hasAllRequiredPhotos(String inspectionId) async {
    try {
      final requiredCategories = [
        PhotoCategory.vehicleFront,
        PhotoCategory.vehicleBack,
        PhotoCategory.vehicleSide,
        PhotoCategory.exterior,
        PhotoCategory.interior,
      ];

      for (final category in requiredCategories) {
        final photos = await getPhotosByCategory(inspectionId, category);
        if (photos.isEmpty) {
          return false;
        }
      }

      return true;
    } catch (e) {
      return false;
    }
  }
}
