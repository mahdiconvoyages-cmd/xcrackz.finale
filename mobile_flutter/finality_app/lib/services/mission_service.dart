import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/mission.dart';
import 'gps_tracking_service.dart';

class MissionService {
  final SupabaseClient _supabase = Supabase.instance.client;
  final GPSTrackingService _gpsService = GPSTrackingService();

  // Get all missions FOR CURRENT USER ONLY
  Future<List<Mission>> getMissions({String? status}) async {
    try {
      final userId = _supabase.auth.currentUser?.id;
      if (userId == null) {
        throw Exception('Utilisateur non connecté');
      }

      var query = _supabase
          .from('missions')
          .select()
          .or('assigned_user_id.eq.$userId,user_id.eq.$userId');
      
      if (status != null && status != 'all') {
        query = query.eq('status', status);
      }
      
      final response = await query.order('created_at', ascending: false);
      return (response as List).map((json) => Mission.fromJson(json)).toList();
    } catch (e) {
      throw Exception('Erreur lors du chargement des missions: $e');
    }
  }

  // Get mission by ID
  Future<Mission> getMissionById(String id) async {
    try {
      final response = await _supabase
          .from('missions')
          .select()
          .eq('id', id)
          .single();

      return Mission.fromJson(response);
    } catch (e) {
      throw Exception('Erreur lors du chargement de la mission: $e');
    }
  }

  // Get missions for current user
  Future<List<Mission>> getMyMissions() async {
    try {
      final userId = _supabase.auth.currentUser?.id;
      if (userId == null) {
        throw Exception('Utilisateur non connecté');
      }

      final response = await _supabase
          .from('missions')
          .select()
          .eq('driver_id', userId)
          .order('created_at', ascending: false);

      return (response as List).map((json) => Mission.fromJson(json)).toList();
    } catch (e) {
      throw Exception('Erreur lors du chargement de vos missions: $e');
    }
  }

  // Create mission
  Future<Mission> createMission(Map<String, dynamic> missionData) async {
    try {
      final response = await _supabase
          .from('missions')
          .insert(missionData)
          .select()
          .single();

      return Mission.fromJson(response);
    } catch (e) {
      throw Exception('Erreur lors de la création de la mission: $e');
    }
  }

  // Update mission
  Future<Mission> updateMission(String id, Map<String, dynamic> updates) async {
    try {
      final response = await _supabase
          .from('missions')
          .update(updates)
          .eq('id', id)
          .select()
          .single();

      return Mission.fromJson(response);
    } catch (e) {
      throw Exception('Erreur lors de la mise à jour de la mission: $e');
    }
  }

  // Update mission status
  Future<void> updateMissionStatus(String id, String status) async {
    try {
      await _supabase
          .from('missions')
          .update({'status': status, 'updated_at': DateTime.now().toIso8601String()})
          .eq('id', id);
      
      // Gérer automatiquement le tracking GPS
      if (status == 'in_progress') {
        // Démarrer le tracking quand la mission commence
        final started = await _gpsService.startTracking(id);
        if (started) {
          print('✅ Tracking GPS démarré automatiquement pour mission: $id');
        } else {
          print('⚠️ Impossible de démarrer le tracking GPS');
        }
      } else if (status == 'completed' || status == 'cancelled') {
        // Arrêter le tracking si la mission est terminée ou annulée
        // Vérifier d'abord si le tracking est actif pour cette mission
        if (_gpsService.isTracking && _gpsService.currentMissionId == id) {
          await _gpsService.stopTracking();
          print('⏹️ Tracking GPS arrêté automatiquement pour mission: $id');
        }
      }
    } catch (e) {
      throw Exception('Erreur lors de la mise à jour du statut: $e');
    }
  }

  // Delete mission
  Future<void> deleteMission(String id) async {
    try {
      await _supabase.from('missions').delete().eq('id', id);
    } catch (e) {
      throw Exception('Erreur lors de la suppression de la mission: $e');
    }
  }

  // Assign mission to driver
  Future<void> assignMission(String missionId, String driverId) async {
    try {
      await _supabase
          .from('missions')
          .update({
            'driver_id': driverId,
            'status': 'assigned',
            'updated_at': DateTime.now().toIso8601String(),
          })
          .eq('id', missionId);
    } catch (e) {
      throw Exception('Erreur lors de l\'assignation de la mission: $e');
    }
  }

  // Get missions count by status
  Future<Map<String, int>> getMissionsCountByStatus() async {
    try {
      final response = await _supabase.from('missions').select('status');
      
      final counts = <String, int>{
        'pending': 0,
        'assigned': 0,
        'in_progress': 0,
        'completed': 0,
        'cancelled': 0,
      };

      for (var mission in response as List) {
        final status = mission['status'] as String?;
        if (status != null && counts.containsKey(status)) {
          counts[status] = (counts[status] ?? 0) + 1;
        }
      }

      return counts;
    } catch (e) {
      throw Exception('Erreur lors du comptage des missions: $e');
    }
  }

  // Search missions
  Future<List<Mission>> searchMissions(String query) async {
    try {
      final response = await _supabase
          .from('missions')
          .select()
          .or('pickup_address.ilike.%$query%,delivery_address.ilike.%$query%,client_name.ilike.%$query%')
          .order('created_at', ascending: false);

      return (response as List).map((json) => Mission.fromJson(json)).toList();
    } catch (e) {
      throw Exception('Erreur lors de la recherche: $e');
    }
  }

  // Join mission by share code
  Future<void> joinMissionByShareCode(String shareCode) async {
    try {
      final userId = _supabase.auth.currentUser?.id;
      if (userId == null) {
        throw Exception('Utilisateur non connecté');
      }

      // Find mission by share code
      final response = await _supabase
          .from('missions')
          .select()
          .eq('share_code', shareCode)
          .maybeSingle();

      if (response == null) {
        throw Exception('Mission introuvable avec ce code');
      }

      final missionId = response['id'] as String;

      // Assign mission to current user
      await _supabase
          .from('missions')
          .update({
            'assigned_user_id': userId,
            'status': 'assigned',
            'updated_at': DateTime.now().toIso8601String(),
          })
          .eq('id', missionId);
    } catch (e) {
      throw Exception('Erreur lors de la jonction à la mission: $e');
    }
  }
}
