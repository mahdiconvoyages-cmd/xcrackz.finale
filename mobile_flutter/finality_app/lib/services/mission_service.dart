import 'dart:convert';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/mission.dart';
import 'background_tracking_service.dart';
import 'offline_service.dart';
import '../main.dart' show connectivityService;
import '../utils/logger.dart';

class MissionService {
  final SupabaseClient _supabase;
  final BackgroundTrackingService _gpsService = BackgroundTrackingService();
  final OfflineService _offlineService = OfflineService();
  /// Use the global ConnectivityService singleton instead of creating a new one
  get _connectivityService => connectivityService;

  MissionService({SupabaseClient? client})
      : _supabase = client ?? Supabase.instance.client;
  
  bool _isInitialized = false;
  
  Future<void> _ensureInitialized() async {
    if (!_isInitialized) {
      await _offlineService.initialize();
      _isInitialized = true;
      logger.i('MissionService: OfflineService initialized');
    }
  }

  // Get all missions FOR CURRENT USER ONLY
  Future<List<Mission>> getMissions({String? status, int limit = 50, int offset = 0}) async {
    await _ensureInitialized();
    
    try {
      final userId = _supabase.auth.currentUser?.id;
      if (userId == null) {
        throw Exception('Utilisateur non connecté');
      }

      // Si offline, retourner le cache
      if (_connectivityService.isOffline) {
        logger.w('MissionService: Offline - returning cached missions');
        return await _offlineService.getCachedMissions(status: status);
      }

      // Si online, récupérer depuis Supabase
      var query = _supabase
          .from('missions')
          .select()
          .or('assigned_user_id.eq.$userId,user_id.eq.$userId');
      
      if (status != null && status != 'all') {
        query = query.eq('status', status);
      }
      
      final response = await query
          .order('created_at', ascending: false)
          .range(offset, offset + limit - 1);
      final missionsList = (response as List).map((json) => Mission.fromJson(json)).toList();
      
      // 🔧 Dédoublonner les missions par ID
      // (évite les doublons si user_id == assigned_user_id)
      final Map<String, Mission> uniqueMissions = {};
      for (final mission in missionsList) {
        uniqueMissions[mission.id] = mission;
      }
      final missions = uniqueMissions.values.toList();
      
      logger.d('MissionService: ${missionsList.length} missions récupérées, ${missions.length} uniques après dédoublonnage');
      
      // Mettre en cache pour offline (batch — une seule transaction SQLite)
      await _offlineService.cacheMissions(missions);
      logger.d('MissionService: Cached ${missions.length} missions');
      
      return missions;
    } catch (e) {
      // En cas d'erreur réseau, fallback sur le cache
      logger.e('MissionService: Error loading missions, fallback to cache: $e');
      return await _offlineService.getCachedMissions(status: status);
    }
  }

  // Get mission by ID
  Future<Mission> getMissionById(String id) async {
    await _ensureInitialized();
    
    try {
      // Essayer le cache d'abord (O(1) via SQLite index)
      final cachedMission = await _offlineService.getCachedMissionById(id);
      
      if (_connectivityService.isOffline && cachedMission != null) {
        logger.w('MissionService: Offline - returning cached mission $id');
        return cachedMission;
      }

      // Si online, récupérer depuis Supabase
      final response = await _supabase
          .from('missions')
          .select()
          .eq('id', id)
          .single();

      final mission = Mission.fromJson(response);
      await _offlineService.cacheMission(mission);
      
      return mission;
    } catch (e) {
      // Fallback sur cache si erreur (O(1) lookup)
      final cachedMission = await _offlineService.getCachedMissionById(id);
      if (cachedMission != null) {
        logger.w('MissionService: Error, returning cached mission');
        return cachedMission;
      }
      logger.e('MissionService: Error loading mission: $e');
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
    await _ensureInitialized();
    
    try {
      // Si offline, ajouter à la queue
      if (_connectivityService.isOffline) {
        logger.w('MissionService: Offline - queueing create action');
        final tempId = 'temp_${DateTime.now().millisecondsSinceEpoch}';
        missionData['id'] = tempId;
        missionData['created_at'] ??= DateTime.now().toUtc().toIso8601String();
        missionData['updated_at'] ??= DateTime.now().toUtc().toIso8601String();
        missionData['status'] ??= 'pending';
        
        await _offlineService.queueAction(OfflineAction(
          type: ActionType.create,
          tableName: 'missions',
          itemId: tempId,
          data: missionData,
        ));
        
        // Créer mission temporaire pour UI
        final tempMission = Mission.fromJson(missionData);
        await _offlineService.cacheMission(tempMission);
        return tempMission;
      }

      // Si online, créer directement
      final response = await _supabase
          .from('missions')
          .insert(missionData)
          .select()
          .single();

      final mission = Mission.fromJson(response);
      await _offlineService.cacheMission(mission);
      logger.i('MissionService: Mission created and cached');
      
      return mission;
    } catch (e) {
      logger.e('MissionService: Error creating mission: $e');
      throw Exception('Erreur lors de la création de la mission: $e');
    }
  }

  // Update mission
  Future<Mission> updateMission(String id, Map<String, dynamic> updates) async {
    await _ensureInitialized();
    
    try {
      // Si offline, ajouter à la queue
      if (_connectivityService.isOffline) {
        logger.w('MissionService: Offline - queueing update action');
        await _offlineService.queueAction(OfflineAction(
          type: ActionType.update,
          tableName: 'missions',
          itemId: id,
          data: updates,
        ));
        
        // Mettre à jour le cache local
        final cached = await _offlineService.getCachedMissions();
        final mission = cached.where((m) => m.id == id).firstOrNull;
        if (mission != null) {
          final updatedJson = mission.toJson()..addAll(updates);
          final updatedMission = Mission.fromJson(updatedJson);
          await _offlineService.cacheMission(updatedMission);
          return updatedMission;
        }
        throw Exception('Mission introuvable dans le cache');
      }

      // Si online, mettre à jour directement
      final response = await _supabase
          .from('missions')
          .update(updates)
          .eq('id', id)
          .select()
          .single();

      final mission = Mission.fromJson(response);
      await _offlineService.cacheMission(mission);
      logger.i('MissionService: Mission updated and cached');
      
      return mission;
    } catch (e) {
      logger.e('MissionService: Error updating mission: $e');
      throw Exception('Erreur lors de la mise à jour de la mission: $e');
    }
  }

  // Update mission status
  Future<void> updateMissionStatus(String id, String status) async {
    try {
      await _supabase
          .from('missions')
          .update({'status': status, 'updated_at': DateTime.now().toUtc().toIso8601String()})
          .eq('id', id);
      
      // Gérer automatiquement le tracking GPS
      if (status == 'in_progress') {
        // Démarrer le tracking quand la mission commence
        final started = await _gpsService.startTracking(id);
        if (started) {
          logger.i('✅ Tracking GPS démarré automatiquement pour mission: $id');
        } else {
          logger.w('⚠️ Impossible de démarrer le tracking GPS');
        }

        // Générer automatiquement le lien public de suivi
        try {
          final publicLink = await generatePublicTrackingLink(id);
          logger.i('✅ Lien public généré: $publicLink');
        } catch (e) {
          logger.e('⚠️ Erreur génération lien public: $e');
        }
      } else if (status == 'completed' || status == 'cancelled') {
        // Arrêter le tracking si la mission est terminée ou annulée
        // Vérifier d'abord si le tracking est actif pour cette mission
        if (_gpsService.isTracking && _gpsService.currentMissionId == id) {
          await _gpsService.stopTracking();
          logger.i('⏹️ Tracking GPS arrêté automatiquement pour mission: $id');
        }
      }
    } catch (e) {
      throw Exception('Erreur lors de la mise à jour du statut: $e');
    }
  }

  /// Génère un lien public de tracking sécurisé pour une mission
  /// 
  /// Appelle la fonction SQL generate_public_tracking_link qui:
  /// - Crée un token unique cryptographique
  /// - Définit l'expiration à 48h après la fin prévue de la mission
  /// - Retourne le token pour construire l'URL publique
  Future<String> generatePublicTrackingLink(String missionId) async {
    try {
      logger.i('🔗 Appel RPC generate_public_tracking_link pour mission: $missionId');
      final response = await _supabase.rpc('generate_public_tracking_link', params: {
        'p_mission_id': missionId,
      });

      if (response == null) {
        throw Exception('La fonction SQL n\'a retourné aucun token. '
            'Vérifiez que la table public_tracking_links existe '
            'et que la fonction generate_public_tracking_link est déployée dans Supabase.');
      }

      final token = response.toString();
      if (token.isEmpty) {
        throw Exception('Token vide retourné par la fonction SQL');
      }

      final publicUrl = 'https://checksfleet.com/tracking/$token';

      // Sauvegarder le lien dans la table missions (comme le web)
      try {
        await _supabase
            .from('missions')
            .update({'public_tracking_link': publicUrl})
            .eq('id', missionId);
        logger.i('✅ Lien sauvegardé dans missions: $publicUrl');
      } catch (updateErr) {
        logger.w('⚠️ Lien généré mais non sauvegardé dans missions: $updateErr');
        // Ne pas bloquer — le lien est quand même utilisable
      }

      logger.i('🔗 Lien public généré: $publicUrl');
      return publicUrl;
    } on PostgrestException catch (e) {
      if (e.message.contains('does not exist') || e.message.contains('function')) {
        logger.e('❌ Fonction SQL manquante: $e');
        throw Exception(
          'Fonction SQL manquante dans Supabase. '
          'Exécutez le fichier SETUP_TRACKING_GPS_BACKEND.sql dans l\'éditeur SQL Supabase.');
      }
      logger.e('❌ Erreur Supabase: ${e.message} (code: ${e.code})');
      throw Exception('Erreur base de données: ${e.message}');
    } catch (e) {
      logger.e('❌ Erreur génération lien public: $e');
      rethrow;
    }
  }

  // Delete mission
  Future<void> deleteMission(String id) async {
    try {
      final userId = _supabase.auth.currentUser?.id;
      if (userId == null) throw Exception('Utilisateur non connecté');
      await _supabase.from('missions').delete().eq('id', id).eq('user_id', userId);
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
            'assigned_user_id': driverId,
            'driver_id': driverId,
            'status': 'pending',
            'updated_at': DateTime.now().toUtc().toIso8601String(),
          })
          .eq('id', missionId);
    } catch (e) {
      throw Exception('Erreur lors de l\'assignation de la mission: $e');
    }
  }

  // Get missions count by status
  Future<Map<String, int>> getMissionsCountByStatus() async {
    try {
      final userId = _supabase.auth.currentUser?.id;
      if (userId == null) throw Exception('Utilisateur non connecté');

      final statuses = ['pending', 'assigned', 'in_progress', 'completed', 'cancelled'];
      final counts = <String, int>{};

      // Parallel server-side count queries — no row data transferred
      final futures = statuses.map((status) =>
        _supabase.from('missions')
          .select('id')
          .or('user_id.eq.$userId,assigned_user_id.eq.$userId')
          .eq('status', status)
          .count(CountOption.exact)
      );
      final results = await Future.wait(futures);

      for (var i = 0; i < statuses.length; i++) {
        counts[statuses[i]] = results[i].count;
      }

      return counts;
    } catch (e) {
      throw Exception('Erreur lors du comptage des missions: $e');
    }
  }

  // Search missions
  Future<List<Mission>> searchMissions(String query) async {
    try {
      final userId = _supabase.auth.currentUser?.id;
      if (userId == null) throw Exception('Utilisateur non connecté');
      // RLS handles user scoping, but add filter for defense in depth
      // Combine user filter and search filter in a single query
      final response = await _supabase
          .from('missions')
          .select()
          .or('user_id.eq.$userId,assigned_user_id.eq.$userId')
          .or('pickup_address.ilike.%$query%,delivery_address.ilike.%$query%,client_name.ilike.%$query%,vehicle_brand.ilike.%$query%,vehicle_plate.ilike.%$query%')
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

      // Nettoyer le code (enlever les tirets et espaces, convertir en majuscules)
      final cleanedCode = shareCode.replaceAll(RegExp(r'[^A-Z0-9]'), '').toUpperCase();

      if (cleanedCode.length != 8) {
        throw Exception('Code invalide. Format attendu: XZ-ABC-123 (8 caractères)');
      }

      // Utiliser la fonction RPC claim_mission comme l'app Expo
      final response = await _supabase.rpc('claim_mission', params: {
        'p_code': cleanedCode,
        'p_user_id': userId,
      });

      // La fonction RPC retourne un JSON avec success/error
      if (response == null) {
        throw Exception('Aucune réponse du serveur');
      }

      // Parser la réponse
      dynamic result = response;
      if (result is String) {
        try {
          result = jsonDecode(result);
        } catch (e) {
          // Si c'est déjà un objet, garder tel quel
        }
      }
      
      if (result is List && result.isNotEmpty) {
        result = result[0];
      }

      if (result is Map) {
        if (result['success'] == true) {
          // Succès - mission rejointe
          return;
        } else {
          // Erreur retournée par la fonction
          throw Exception(result['message'] ?? result['error'] ?? 'Impossible de rejoindre la mission');
        }
      } else if (result == true) {
        // Succès simple
        return;
      }

      throw Exception('Réponse invalide du serveur');
    } catch (e) {
      if (e is Exception) {
        rethrow;
      }
      throw Exception('Erreur lors de la jonction à la mission: $e');
    }
  }
}
