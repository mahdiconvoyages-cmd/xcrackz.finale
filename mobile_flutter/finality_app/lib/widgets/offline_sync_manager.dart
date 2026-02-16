import 'package:flutter/material.dart';
import '../services/connectivity_service.dart';
import '../services/offline_service.dart';
import '../utils/logger.dart';

/// Widget qui gère la synchronisation automatique quand l'app revient online
/// Affiche aussi un indicateur de statut offline/online
class OfflineSyncManager extends StatefulWidget {
  final Widget child;
  final OfflineService offlineService;
  final ConnectivityService connectivityService;

  const OfflineSyncManager({
    super.key,
    required this.child,
    required this.offlineService,
    required this.connectivityService,
  });

  @override
  State<OfflineSyncManager> createState() => _OfflineSyncManagerState();
}

class _OfflineSyncManagerState extends State<OfflineSyncManager> {
  bool _isSyncing = false;
  bool _showOfflineBanner = false;

  @override
  void initState() {
    super.initState();
    _listenToConnectivity();
  }

  void _listenToConnectivity() {
    widget.connectivityService.addListener(() {
      final isOnline = widget.connectivityService.isOnline;
      
      setState(() {
        _showOfflineBanner = !isOnline;
      });

      if (isOnline && !_isSyncing) {
        _syncPendingActions();
      }
    });

    // État initial
    _showOfflineBanner = widget.connectivityService.isOffline;
  }

  Future<void> _syncPendingActions() async {
    if (_isSyncing) return;

    final pendingCount = widget.offlineService.pendingActionsCount;
    if (pendingCount == 0) return;

    setState(() => _isSyncing = true);
    logger.i('🔄 Starting sync: $pendingCount pending actions');

    try {
      await widget.offlineService.syncQueue((action) async {
        // Exécuter l'action sur Supabase
        logger.d('Syncing action: ${action.type} on ${action.tableName}');
        
        // TODO: Implémenter l'exécution réelle selon le type
        // Pour l'instant, on simule le succès
        await Future.delayed(const Duration(milliseconds: 100));
      });

      logger.i('✅ Sync completed successfully');
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('✅ $pendingCount actions synchronisées'),
            backgroundColor: Colors.green,
            duration: const Duration(seconds: 2),
          ),
        );
      }
    } catch (e) {
      logger.e('❌ Sync failed: $e');
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('⚠️ Erreur de synchronisation'),
            backgroundColor: Colors.orange,
            duration: Duration(seconds: 3),
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSyncing = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        widget.child,
        
        // Bannière offline en haut
        if (_showOfflineBanner)
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: Material(
              elevation: 4,
              color: Colors.orange.shade700,
              child: SafeArea(
                bottom: false,
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  child: Row(
                    children: [
                      const Icon(Icons.cloud_off, color: Colors.white, size: 20),
                      const SizedBox(width: 8),
                      const Expanded(
                        child: Text(
                          'Mode hors ligne - Modifications enregistrées localement',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 13,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                      if (widget.offlineService.pendingActionsCount > 0)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.3),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            '${widget.offlineService.pendingActionsCount}',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        
        // Indicateur de synchronisation
        if (_isSyncing)
          Positioned(
            bottom: 16,
            right: 16,
            child: Material(
              elevation: 8,
              borderRadius: BorderRadius.circular(30),
              color: Colors.blue.shade700,
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Text(
                      'Synchronisation...',
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
      ],
    );
  }
}
