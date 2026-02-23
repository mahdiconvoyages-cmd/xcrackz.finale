import 'package:supabase_flutter/supabase_flutter.dart';
import 'background_tracking_service.dart';
import '../utils/logger.dart';

/// Service de surveillance pour gérer automatiquement le tracking GPS
/// en fonction des changements de statut des missions
class MissionTrackingMonitor {
  static final MissionTrackingMonitor _instance = MissionTrackingMonitor._internal();
  factory MissionTrackingMonitor() => _instance;
  MissionTrackingMonitor._internal();

  final _supabase = Supabase.instance.client;
  final _gpsService = BackgroundTrackingService();
  RealtimeChannel? _channel;
  bool _isMonitoring = false;

  bool get isMonitoring => _isMonitoring;

  /// Démarre la surveillance des missions de l'utilisateur courant
  Future<void> startMonitoring() async {
    if (_isMonitoring) {
      logger.w('Surveillance déjà active');
      return;
    }

    final userId = _supabase.auth.currentUser?.id;
    if (userId == null) {
      logger.e('Utilisateur non connecté - Impossible de surveiller');
      return;
    }

    try {
      // S'abonner aux changements de missions
      // Note: On surveille toutes les missions et on filtre dans le callback
      // car Realtime ne supporte pas les filtres OR complexes
      _channel = _supabase
          .channel('mission_tracking_monitor')
          .onPostgresChanges(
            event: PostgresChangeEvent.update,
            schema: 'public',
            table: 'missions',
            callback: (payload) => _handleMissionUpdate(payload, userId),
          )
          .subscribe();

      _isMonitoring = true;
      logger.i('Surveillance des missions démarrée');
    } catch (e) {
      logger.e('Erreur démarrage surveillance: $e');
    }
  }

  /// Arrête la surveillance
  Future<void> stopMonitoring() async {
    if (!_isMonitoring) return;

    await _channel?.unsubscribe();
    _channel = null;
    _isMonitoring = false;

    logger.i('Surveillance des missions arrêtée');
  }

  /// Gère les mises à jour de missions
  void _handleMissionUpdate(PostgresChangePayload payload, String userId) {
    try {
      final newRecord = payload.newRecord;
      if (newRecord.isEmpty) return;

      final missionId = newRecord['id'] as String?;
      final status = newRecord['status'] as String?;
      final missionUserId = newRecord['user_id'] as String?;
      final assignedUserId = newRecord['assigned_user_id'] as String?;

      if (missionId == null || status == null) return;
      
      // Vérifier si la mission concerne l'utilisateur courant
      if (missionUserId != userId && assignedUserId != userId) {
        return; // Cette mission ne concerne pas cet utilisateur
      }

      logger.i('Mission $missionId - Nouveau statut: $status');

      // Gérer le tracking GPS selon le statut
      _handleTrackingForStatus(missionId, status);
    } catch (e) {
      logger.e('Erreur traitement mise à jour mission: $e');
    }
  }

  /// Gère le tracking GPS selon le statut de la mission
  Future<void> _handleTrackingForStatus(String missionId, String status) async {
    switch (status) {
      case 'in_progress':
        // Démarrer le tracking si pas déjà actif
        if (!_gpsService.isTracking) {
          final started = await _gpsService.startTracking(missionId);
          if (started) {
            logger.i('Tracking GPS démarré automatiquement (surveillance)');
          }
        } else if (_gpsService.currentMissionId != missionId) {
          // Une autre mission est en tracking, arrêter l'ancienne et démarrer la nouvelle
          await _gpsService.stopTracking();
          await _gpsService.startTracking(missionId);
          logger.i('Tracking GPS basculé vers nouvelle mission');
        }
        break;

      case 'completed':
      case 'cancelled':
        // Arrêter le tracking si c'est la mission courante
        if (_gpsService.isTracking && _gpsService.currentMissionId == missionId) {
          await _gpsService.stopTracking();
          logger.i('Tracking GPS arrêté automatiquement (surveillance)');
        }
        break;

      default:
        break;
    }
  }

  /// Vérifie et synchronise le tracking avec l'état actuel des missions
  /// 
  /// IMPORTANT: Ne démarre le tracking QUE pour les missions 'in_progress'.
  /// Les missions 'pending' (en attente) n'ont PAS besoin de GPS.
  Future<void> syncTrackingState() async {
    try {
      final userId = _supabase.auth.currentUser?.id;
      if (userId == null) return;

      // Chercher UNIQUEMENT une mission en cours (in_progress)
      // Les missions 'pending' ne doivent PAS déclencher le GPS
      final response = await _supabase
          .from('missions')
          .select('id, status')
          .or('user_id.eq.$userId,assigned_user_id.eq.$userId')
          .eq('status', 'in_progress')
          .limit(1)
          .maybeSingle();

      if (response != null) {
        final missionId = response['id'] as String;
        
        // Si une mission est en cours mais le tracking n'est pas actif
        if (!_gpsService.isTracking) {
          await _gpsService.startTracking(missionId);
          logger.i('Tracking GPS synchronisé pour mission en cours: $missionId');
        }
      } else {
        // Aucune mission in_progress → arrêter le tracking si actif
        // Cela nettoie aussi les services GPS restés actifs par erreur
        if (_gpsService.isTracking) {
          await _gpsService.stopTracking();
          logger.i('Tracking GPS arrêté — aucune mission in_progress');
        } else {
          // Même si _isTracking est false, un service Android orphelin
          // peut tourner (ex: app tuée et relancée). Nettoyage.
          await _gpsService.forceStopIfRunning();
        }
      }
    } catch (e) {
      logger.e('Erreur synchronisation tracking: $e');
    }
  }
}
