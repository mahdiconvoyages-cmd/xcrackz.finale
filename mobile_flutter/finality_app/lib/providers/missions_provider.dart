import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../services/mission_service.dart';
import '../models/mission.dart';
import '../utils/logger.dart';

part 'missions_provider.g.dart';

/// Provider pour le service Mission
@riverpod
MissionService missionService(Ref ref) {
  return MissionService();
}

/// Provider pour la liste des missions avec filtrage par statut
@riverpod
class Missions extends _$Missions {
  @override
  Future<List<Mission>> build({String? status}) async {
    logger.d('📦 Loading missions with status: ${status ?? "all"}');
    
    try {
      final service = ref.read(missionServiceProvider);
      final missions = await service.getMissions(status: status);
      
      logger.i('✅ Loaded ${missions.length} missions');
      return missions;
    } catch (e, stack) {
      logger.e('❌ Failed to load missions', e, stack);
      rethrow;
    }
  }

  /// Rafraîchir la liste des missions
  Future<void> refresh() async {
    logger.d('🔄 Refreshing missions...');
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      final service = ref.read(missionServiceProvider);
      return service.getMissions(status: status);
    });
  }

  /// Créer une nouvelle mission
  Future<Mission> createMission(Map<String, dynamic> data) async {
    logger.d('➕ Creating new mission');
    
    try {
      final service = ref.read(missionServiceProvider);
      final mission = await service.createMission(data);
      
      // Invalider le cache pour recharger
      ref.invalidateSelf();
      
      logger.i('✅ Mission created: ${mission.id}');
      return mission;
    } catch (e, stack) {
      logger.e('❌ Failed to create mission', e, stack);
      rethrow;
    }
  }

  /// Mettre à jour une mission
  Future<Mission> updateMission(String id, Map<String, dynamic> updates) async {
    logger.d('✏️ Updating mission: $id');
    
    try {
      final service = ref.read(missionServiceProvider);
      final mission = await service.updateMission(id, updates);
      
      // Invalider le cache
      ref.invalidateSelf();
      
      logger.i('✅ Mission updated: $id');
      return mission;
    } catch (e, stack) {
      logger.e('❌ Failed to update mission', e, stack);
      rethrow;
    }
  }

  /// Changer le statut d'une mission
  Future<void> updateStatus(String id, String newStatus) async {
    logger.d('🔄 Changing mission $id status to: $newStatus');
    
    try {
      final service = ref.read(missionServiceProvider);
      await service.updateMissionStatus(id, newStatus);
      
      // Invalider le cache
      ref.invalidateSelf();
      
      logger.i('✅ Mission status updated: $id → $newStatus');
    } catch (e, stack) {
      logger.e('❌ Failed to update mission status', e, stack);
      rethrow;
    }
  }
}

/// Provider pour une mission spécifique par ID
@riverpod
Future<Mission> mission(Ref ref, String id) async {
  logger.d('📄 Loading mission: $id');
  
  try {
    final service = ref.read(missionServiceProvider);
    final mission = await service.getMissionById(id);
    
    logger.i('✅ Mission loaded: $id');
    return mission;
  } catch (e, stack) {
    logger.e('❌ Failed to load mission', e, stack);
    rethrow;
  }
}

/// Provider pour le comptage des missions par statut
@riverpod
Future<Map<String, int>> missionCounts(Ref ref) async {
  logger.d('📊 Calculating mission counts');
  
  try {
    final service = ref.read(missionServiceProvider);
    final allMissions = await service.getMissions();
    
    final counts = <String, int>{
      'pending': allMissions.where((m) => m.status == 'pending').length,
      'in_progress': allMissions.where((m) => m.status == 'in_progress').length,
      'completed': allMissions.where((m) => m.status == 'completed').length,
    };
    
    logger.i('✅ Mission counts: $counts');
    return counts;
  } catch (e, stack) {
    logger.e('❌ Failed to calculate counts', e, stack);
    rethrow;
  }
}
