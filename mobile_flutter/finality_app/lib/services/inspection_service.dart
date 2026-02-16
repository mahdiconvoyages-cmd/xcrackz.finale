import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/inspection.dart';
import 'dart:io';
import 'dart:typed_data';

class InspectionService {
  final SupabaseClient _supabase = Supabase.instance.client;

  // Get all inspections for the current user
  Future<List<VehicleInspection>> getUserInspections() async {
    try {
      final userId = _supabase.auth.currentUser?.id;
      if (userId == null) return [];
      
      final response = await _supabase
          .from('vehicle_inspections')
          .select()
          .eq('inspector_id', userId)
          .order('created_at', ascending: false)
          .limit(50);

      return (response as List).map((json) => VehicleInspection.fromJson(json)).toList();
    } catch (e) {
      throw Exception('Erreur lors du chargement des inspections: $e');
    }
  }

  // Get inspections for a mission
  Future<List<VehicleInspection>> getInspectionsByMission(String missionId) async {
    try {
      final response = await _supabase
          .from('vehicle_inspections')
          .select()
          .eq('mission_id', missionId)
          .order('created_at', ascending: false);

      return (response as List).map((json) => VehicleInspection.fromJson(json)).toList();
    } catch (e) {
      throw Exception('Erreur lors du chargement des inspections: $e');
    }
  }

  // Get inspection by ID
  Future<VehicleInspection> getInspectionById(String id) async {
    try {
      final response = await _supabase
          .from('vehicle_inspections')
          .select()
          .eq('id', id)
          .single();

      return VehicleInspection.fromJson(response);
    } catch (e) {
      throw Exception('Erreur lors du chargement de l\'inspection: $e');
    }
  }

  // Create inspection
  Future<VehicleInspection> createInspection(Map<String, dynamic> inspectionData) async {
    try {
      final response = await _supabase
          .from('vehicle_inspections')
          .insert(inspectionData)
          .select()
          .single();

      return VehicleInspection.fromJson(response);
    } catch (e) {
      throw Exception('Erreur lors de la création de l\'inspection: $e');
    }
  }

  // Update inspection
  Future<VehicleInspection> updateInspection(String id, Map<String, dynamic> updates) async {
    try {
      final response = await _supabase
          .from('vehicle_inspections')
          .update(updates)
          .eq('id', id)
          .select()
          .single();

      return VehicleInspection.fromJson(response);
    } catch (e) {
      throw Exception('Erreur lors de la mise à jour de l\'inspection: $e');
    }
  }

  // Delete inspection
  Future<void> deleteInspection(String id) async {
    try {
      await _supabase.from('vehicle_inspections').delete().eq('id', id);
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
