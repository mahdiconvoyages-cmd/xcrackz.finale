import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';
import 'dart:convert';
import '../models/mission.dart';
import '../utils/logger.dart';

/// Service de gestion du mode hors ligne
/// Cache local avec sqflite + Queue d'actions à synchroniser
class OfflineService {
  static final OfflineService _instance = OfflineService._internal();
  factory OfflineService() => _instance;
  OfflineService._internal();

  Database? _database;
  final List<OfflineAction> _syncQueue = [];
  bool _isSyncing = false;

  /// Initialiser la base de données locale
  Future<void> initialize() async {
    if (_database != null) return;

    try {
      final dbPath = await getDatabasesPath();
      final path = join(dbPath, 'xcrackz_offline.db');

      _database = await openDatabase(
        path,
        version: 1,
        onCreate: (db, version) async {
          logger.i('📦 Creating offline database schema...');

          // Table missions cache
          await db.execute('''
            CREATE TABLE missions (
              id TEXT PRIMARY KEY,
              data TEXT NOT NULL,
              cached_at INTEGER NOT NULL,
              status TEXT
            )
          ''');

          // Table inspections cache
          await db.execute('''
            CREATE TABLE inspections (
              id TEXT PRIMARY KEY,
              mission_id TEXT NOT NULL,
              data TEXT NOT NULL,
              cached_at INTEGER NOT NULL,
              type TEXT
            )
          ''');

          // Table documents cache
          await db.execute('''
            CREATE TABLE documents (
              id TEXT PRIMARY KEY,
              data TEXT NOT NULL,
              cached_at INTEGER NOT NULL,
              file_path TEXT
            )
          ''');

          // Table queue de synchronisation
          await db.execute('''
            CREATE TABLE sync_queue (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              action_type TEXT NOT NULL,
              table_name TEXT NOT NULL,
              item_id TEXT NOT NULL,
              data TEXT NOT NULL,
              created_at INTEGER NOT NULL,
              retry_count INTEGER DEFAULT 0
            )
          ''');

          logger.i('✅ Offline database created');
        },
      );

      // Charger la queue existante
      await _loadSyncQueue();
      
      logger.i('✅ OfflineService initialized');
    } catch (e, stack) {
      logger.e('❌ Failed to initialize OfflineService', e, stack);
    }
  }

  /// Vérifier si la base est initialisée
  bool get isInitialized => _database != null;

  // ==========================================
  // CACHE - MISSIONS
  // ==========================================

  /// Mettre en cache une mission
  Future<void> cacheMission(Mission mission) async {
    if (_database == null) return;

    try {
      await _database!.insert(
        'missions',
        {
          'id': mission.id,
          'data': jsonEncode(mission.toJson()),
          'cached_at': DateTime.now().millisecondsSinceEpoch,
          'status': mission.status,
        },
        conflictAlgorithm: ConflictAlgorithm.replace,
      );
      logger.d('💾 Mission cached: ${mission.id}');
    } catch (e, stack) {
      logger.e('Failed to cache mission', e, stack);
    }
  }

  /// Récupérer les missions en cache
  Future<List<Mission>> getCachedMissions({String? status}) async {
    if (_database == null) return [];

    try {
      String whereClause = '';
      List<dynamic> whereArgs = [];

      if (status != null && status != 'all') {
        whereClause = 'status = ?';
        whereArgs = [status];
      }

      final results = await _database!.query(
        'missions',
        where: whereClause.isEmpty ? null : whereClause,
        whereArgs: whereArgs.isEmpty ? null : whereArgs,
        orderBy: 'cached_at DESC',
      );

      final missions = results.map((row) {
        final data = jsonDecode(row['data'] as String);
        return Mission.fromJson(data);
      }).toList();

      logger.d('📦 Loaded ${missions.length} cached missions');
      return missions;
    } catch (e, stack) {
      logger.e('Failed to load cached missions', e, stack);
      return [];
    }
  }

  /// Nettoyer le cache ancien (> 7 jours)
  Future<void> cleanOldCache() async {
    if (_database == null) return;

    try {
      final weekAgo = DateTime.now().subtract(const Duration(days: 7)).millisecondsSinceEpoch;

      await _database!.delete(
        'missions',
        where: 'cached_at < ?',
        whereArgs: [weekAgo],
      );

      await _database!.delete(
        'inspections',
        where: 'cached_at < ?',
        whereArgs: [weekAgo],
      );

      logger.i('🧹 Old cache cleaned');
    } catch (e, stack) {
      logger.e('Failed to clean cache', e, stack);
    }
  }

  // ==========================================
  // QUEUE DE SYNCHRONISATION
  // ==========================================

  /// Ajouter une action à la queue
  Future<void> queueAction(OfflineAction action) async {
    if (_database == null) return;

    try {
      await _database!.insert('sync_queue', {
        'action_type': action.type.toString(),
        'table_name': action.tableName,
        'item_id': action.itemId,
        'data': jsonEncode(action.data),
        'created_at': DateTime.now().millisecondsSinceEpoch,
        'retry_count': 0,
      });

      _syncQueue.add(action);
      logger.d('📝 Action queued: ${action.type} ${action.tableName}/${action.itemId}');
    } catch (e, stack) {
      logger.e('Failed to queue action', e, stack);
    }
  }

  /// Charger la queue depuis la base
  Future<void> _loadSyncQueue() async {
    if (_database == null) return;

    try {
      final results = await _database!.query(
        'sync_queue',
        orderBy: 'created_at ASC',
      );

      _syncQueue.clear();
      for (final row in results) {
        _syncQueue.add(OfflineAction(
          id: row['id'] as int,
          type: ActionType.values.firstWhere(
            (e) => e.toString() == row['action_type'],
          ),
          tableName: row['table_name'] as String,
          itemId: row['item_id'] as String,
          data: jsonDecode(row['data'] as String),
          retryCount: row['retry_count'] as int,
        ));
      }

      logger.i('📥 Loaded ${_syncQueue.length} pending actions');
    } catch (e, stack) {
      logger.e('Failed to load sync queue', e, stack);
    }
  }

  /// Synchroniser la queue quand en ligne
  Future<void> syncQueue(Function(OfflineAction) executor) async {
    if (_database == null || _isSyncing || _syncQueue.isEmpty) return;

    _isSyncing = true;
    logger.i('🔄 Starting sync of ${_syncQueue.length} actions...');

    final actionsToSync = List<OfflineAction>.from(_syncQueue);
    int successCount = 0;
    int failCount = 0;

    for (final action in actionsToSync) {
      try {
        // Exécuter l'action
        await executor(action);

        // Supprimer de la queue
        await _database!.delete(
          'sync_queue',
          where: 'id = ?',
          whereArgs: [action.id],
        );
        _syncQueue.remove(action);

        successCount++;
        logger.d('✅ Synced: ${action.type} ${action.tableName}/${action.itemId}');
      } catch (e, stack) {
        failCount++;
        logger.w('⚠️ Sync failed for action ${action.id}', e, stack);

        // Incrémenter retry count
        final newRetryCount = action.retryCount + 1;
        if (newRetryCount < 5) {
          await _database!.update(
            'sync_queue',
            {'retry_count': newRetryCount},
            where: 'id = ?',
            whereArgs: [action.id],
          );
        } else {
          // Après 5 tentatives, supprimer
          logger.e('❌ Max retries reached, removing action ${action.id}');
          await _database!.delete(
            'sync_queue',
            where: 'id = ?',
            whereArgs: [action.id],
          );
          _syncQueue.remove(action);
        }
      }
    }

    _isSyncing = false;
    logger.i('🎉 Sync completed: $successCount success, $failCount failed');
  }

  /// Obtenir le nombre d'actions en attente
  int get pendingActionsCount => _syncQueue.length;

  /// Vider complètement le cache et la queue
  Future<void> clearAll() async {
    if (_database == null) return;

    try {
      await _database!.delete('missions');
      await _database!.delete('inspections');
      await _database!.delete('documents');
      await _database!.delete('sync_queue');
      _syncQueue.clear();

      logger.i('🗑️ All offline data cleared');
    } catch (e, stack) {
      logger.e('Failed to clear offline data', e, stack);
    }
  }

  /// Fermer la base de données
  Future<void> close() async {
    await _database?.close();
    _database = null;
    logger.i('👋 OfflineService closed');
  }
}

/// Type d'action offline
enum ActionType {
  create,
  update,
  delete,
}

/// Action en attente de synchronisation
class OfflineAction {
  final int? id;
  final ActionType type;
  final String tableName;
  final String itemId;
  final Map<String, dynamic> data;
  final int retryCount;

  OfflineAction({
    this.id,
    required this.type,
    required this.tableName,
    required this.itemId,
    required this.data,
    this.retryCount = 0,
  });
}
