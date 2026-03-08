import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/inspection.dart';
import 'dart:io';
import 'dart:typed_data';
import 'offline_service.dart';
import 'connectivity_service.dart';
import '../main.dart' show connectivityService;
import '../utils/logger.dart';

class InspectionService {
  final SupabaseClient _supabase;
  final OfflineService _offlineService = OfflineService();
  // Use the global ConnectivityService singleton — never create a new instance
  ConnectivityService get _connectivityService => connectivityService;
  bool _isInitialized = false;

  InspectionService({SupabaseClient? client})
      : _supabase = client ?? Supabase.instance.client;

  Future<void> _ensureInitialized() async {
    if (!_isInitialized) {
      await _offlineService.initialize();
      _isInitialized = true;
    }
  }

  // Get all inspections for the current user
  Future<List<VehicleInspection>> getUserInspections() async {
    await _ensureInitialized();
    try {
      final userId = _supabase.auth.currentUser?.id;
      if (userId == null) return [];

      // Si offline, retourner le cache
      if (_connectivityService.isOffline) {
        logger.w('InspectionService: Offline - returning cached inspections');
        final cached = await _offlineService.getCachedInspections();
        return cached.map((json) => VehicleInspection.fromJson(json)).toList();
      }

      final response = await _supabase
          .from('vehicle_inspections')
          .select()
          .eq('inspector_id', userId)
          .order('created_at', ascending: false)
          .limit(50);

      final list = response as List;
      // Cache pour offline
      await _offlineService.cacheInspections(
        list.map((e) => Map<String, dynamic>.from(e as Map)).toList(),
      );

      return list.map((json) => VehicleInspection.fromJson(json)).toList();
    } catch (e) {
      // Fallback cache
      logger.e('InspectionService: Error, fallback to cache: $e');
      final cached = await _offlineService.getCachedInspections();
      if (cached.isNotEmpty) {
        return cached.map((json) => VehicleInspection.fromJson(json)).toList();
      }
      throw Exception('Erreur lors du chargement des inspections: $e');
    }
  }

  // Get inspections for a mission
  Future<List<VehicleInspection>> getInspectionsByMission(String missionId) async {
    await _ensureInitialized();
    try {
      if (_connectivityService.isOffline) {
        final cached = await _offlineService.getCachedInspections(missionId: missionId);
        return cached.map((json) => VehicleInspection.fromJson(json)).toList();
      }

      final response = await _supabase
          .from('vehicle_inspections')
          .select()
          .eq('mission_id', missionId)
          .order('created_at', ascending: false);

      final list = response as List;
      await _offlineService.cacheInspections(
        list.map((e) => Map<String, dynamic>.from(e as Map)).toList(),
      );

      return list.map((json) => VehicleInspection.fromJson(json)).toList();
    } catch (e) {
      final cached = await _offlineService.getCachedInspections(missionId: missionId);
      if (cached.isNotEmpty) {
        return cached.map((json) => VehicleInspection.fromJson(json)).toList();
      }
      throw Exception('Erreur lors du chargement des inspections: $e');
    }
  }

  // Get inspection by ID
  Future<VehicleInspection> getInspectionById(String id) async {
    await _ensureInitialized();
    try {
      if (_connectivityService.isOffline) {
        logger.w('InspectionService: Offline - returning cached inspection $id');
        final cached = await _offlineService.getCachedInspections();
        final match = cached.where((j) => j['id'] == id).toList();
        if (match.isNotEmpty) {
          return VehicleInspection.fromJson(match.first);
        }
        throw Exception('Inspection non trouvée en cache');
      }

      final response = await _supabase
          .from('vehicle_inspections')
          .select()
          .eq('id', id)
          .single();

      return VehicleInspection.fromJson(response);
    } catch (e) {
      // Fallback cache
      logger.e('InspectionService: Error, fallback cache for inspection $id: $e');
      final cached = await _offlineService.getCachedInspections();
      final match = cached.where((j) => j['id'] == id).toList();
      if (match.isNotEmpty) {
        return VehicleInspection.fromJson(match.first);
      }
      throw Exception('Erreur lors du chargement de l\'inspection: $e');
    }
  }

  // Create inspection
  Future<VehicleInspection> createInspection(Map<String, dynamic> inspectionData) async {
    await _ensureInitialized();
    try {
      // Si offline, mettre en queue
      if (_connectivityService.isOffline) {
        logger.w('InspectionService: Offline - queueing create action');
        final tempId = 'temp_insp_${DateTime.now().millisecondsSinceEpoch}';
        inspectionData['id'] = tempId;
        inspectionData['created_at'] ??= DateTime.now().toUtc().toIso8601String();
        inspectionData['updated_at'] ??= DateTime.now().toUtc().toIso8601String();

        await _offlineService.queueAction(OfflineAction(
          type: ActionType.create,
          tableName: 'vehicle_inspections',
          itemId: tempId,
          data: inspectionData,
        ));

        await _offlineService.cacheInspection(inspectionData);
        return VehicleInspection.fromJson(inspectionData);
      }

      final response = await _supabase
          .from('vehicle_inspections')
          .insert(inspectionData)
          .select()
          .single();

      final inspection = VehicleInspection.fromJson(response);
      await _offlineService.cacheInspection(response);
      return inspection;
    } catch (e) {
      logger.e('InspectionService: Error creating inspection: $e');
      throw Exception('Erreur lors de la création de l\'inspection: $e');
    }
  }

  // Update inspection
  Future<VehicleInspection> updateInspection(String id, Map<String, dynamic> updates) async {
    await _ensureInitialized();
    try {
      if (_connectivityService.isOffline) {
        logger.w('InspectionService: Offline - queueing update action');
        await _offlineService.queueAction(OfflineAction(
          type: ActionType.update,
          tableName: 'vehicle_inspections',
          itemId: id,
          data: updates,
        ));

        // Mettre à jour le cache local
        final cached = await _offlineService.getCachedInspections();
        final match = cached.where((j) => j['id'] == id).toList();
        if (match.isNotEmpty) {
          final updatedJson = Map<String, dynamic>.from(match.first)..addAll(updates);
          await _offlineService.cacheInspection(updatedJson);
          return VehicleInspection.fromJson(updatedJson);
        }
        throw Exception('Inspection introuvable dans le cache');
      }

      final response = await _supabase
          .from('vehicle_inspections')
          .update(updates)
          .eq('id', id)
          .select()
          .single();

      await _offlineService.cacheInspection(response);
      return VehicleInspection.fromJson(response);
    } catch (e) {
      logger.e('InspectionService: Error updating inspection: $e');
      throw Exception('Erreur lors de la mise à jour de l\'inspection: $e');
    }
  }

  // Delete inspection
  Future<void> deleteInspection(String id) async {
    await _ensureInitialized();
    try {
      if (_connectivityService.isOffline) {
        logger.w('InspectionService: Offline - queueing delete action');
        await _offlineService.queueAction(OfflineAction(
          type: ActionType.delete,
          tableName: 'vehicle_inspections',
          itemId: id,
          data: {'id': id},
        ));
        return;
      }

      final userId = _supabase.auth.currentUser?.id;
      if (userId == null) throw Exception('Utilisateur non connecté');
      await _supabase.from('vehicle_inspections').delete().eq('id', id).eq('inspector_id', userId);
    } catch (e) {
      throw Exception('Erreur lors de la suppression de l\'inspection: $e');
    }
  }

  // Upload inspection photo
  Future<String> uploadPhoto(String filePath, String missionId) async {
    try {
      final fileName = '${missionId}_${DateTime.now().millisecondsSinceEpoch}.jpg';
      final path = 'inspections/$missionId/$fileName';

      await _supabase.storage
          .from('inspection-photos')
          .upload(path, File(filePath));

      final publicUrl = _supabase.storage
          .from('inspection-photos')
          .getPublicUrl(path);

      return publicUrl;
    } catch (e) {
      throw Exception('Erreur lors de l\'upload de la photo: $e');
    }
  }

  // Upload signature
  Future<String> uploadSignature(Uint8List signatureData, String missionId, String type) async {
    try {
      final fileName = '${missionId}_${type}_${DateTime.now().millisecondsSinceEpoch}.png';
      final path = 'signatures/$missionId/$fileName';

      await _supabase.storage
          .from('inspection-photos')
          .uploadBinary(path, signatureData, fileOptions: const FileOptions(contentType: 'image/png'));

      final publicUrl = _supabase.storage
          .from('inspection-photos')
          .getPublicUrl(path);

      return publicUrl;
    } catch (e) {
      throw Exception('Erreur lors de l\'upload de la signature: $e');
    }
  }
}
