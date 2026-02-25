import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:intl/intl.dart';
import '../../services/background_tracking_service.dart';

class TrackingListScreen extends StatefulWidget {
  const TrackingListScreen({super.key});

  @override
  State<TrackingListScreen> createState() => _TrackingListScreenState();
}

class _TrackingListScreenState extends State<TrackingListScreen> {
  final _supabase = Supabase.instance.client;
  final _gpsService = BackgroundTrackingService();
  
  List<Map<String, dynamic>> _trackedMissions = [];
  bool _isLoading = true;
  String _filter = 'active'; // active, completed, all

  @override
  void initState() {
    super.initState();
    _loadTrackedMissions();
  }

  Future<void> _loadTrackedMissions() async {
    setState(() => _isLoading = true);

    try {
      final userId = _supabase.auth.currentUser?.id;
      if (userId == null) return;

      var query = _supabase
          .from('missions')
          .select('*')
          .eq('user_id', userId);

      // Appliquer filtres
      if (_filter == 'active') {
        query = query.inFilter('status', ['active', 'in_progress']);
      } else if (_filter == 'completed') {
        query = query.eq('status', 'completed');
      }

      final response = await query.order('created_at', ascending: false);
      
      // Récupérer les données GPS pour toutes les missions en une seule requête batch
      final missionIds = (response as List).map((m) => m['id'] as String).toList();
      final gpsDataList = missionIds.isNotEmpty
          ? await _supabase
              .from('mission_tracking_live')
              .select('*')
              .inFilter('mission_id', missionIds)
          : <dynamic>[];
      
      // Créer un map pour accès rapide
      final gpsMap = <String, Map<String, dynamic>>{};
      for (final gps in gpsDataList) {
        gpsMap[gps['mission_id']] = gps;
      }

      final missionsWithGPS = <Map<String, dynamic>>[];
      for (var mission in response) {
        final gpsData = gpsMap[mission['id']];
        missionsWithGPS.add({
          ...mission,
          'last_gps': gpsData,
          'has_tracking': gpsData != null,
        });
      }

      if (!mounted) return;
      setState(() {
        _trackedMissions = missionsWithGPS;
        _isLoading = false;
      });
    } catch (e) {
      debugPrint('Erreur chargement missions: $e');
      if (!mounted) return;
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Suivi GPS'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadTrackedMissions,
          ),
        ],
      ),
      body: Column(
        children: [
          _buildFilterChips(),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _trackedMissions.isEmpty
                    ? _buildEmptyState()
                    : RefreshIndicator(
                        onRefresh: _loadTrackedMissions,
                        child: ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: _trackedMissions.length,
                          itemBuilder: (context, index) {
                            return _MissionTrackingCard(
                              mission: _trackedMissions[index],
                              gpsService: _gpsService,
                              onTap: () {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text('Suivi GPS actif - Position envoyée en temps réel')),
                                );
                              },
                            );
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChips() {
    return Container(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          FilterChip(
            label: const Text('Actives'),
            selected: _filter == 'active',
            onSelected: (selected) {
              if (selected) {
                setState(() => _filter = 'active');
                _loadTrackedMissions();
              }
            },
          ),
          const SizedBox(width: 8),
          FilterChip(
            label: const Text('Complétées'),
            selected: _filter == 'completed',
            onSelected: (selected) {
              if (selected) {
                setState(() => _filter = 'completed');
                _loadTrackedMissions();
              }
            },
          ),
          const SizedBox(width: 8),
          FilterChip(
            label: const Text('Toutes'),
            selected: _filter == 'all',
            onSelected: (selected) {
              if (selected) {
                setState(() => _filter = 'all');
                _loadTrackedMissions();
              }
            },
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.gps_off, size: 64, color: Colors.grey[400]),
          const SizedBox(height: 16),
          Text(
            'Aucune mission en suivi',
            style: TextStyle(fontSize: 18, color: Colors.grey[600]),
          ),
        ],
      ),
    );
  }


}

class _MissionTrackingCard extends StatelessWidget {
  final Map<String, dynamic> mission;
  final BackgroundTrackingService gpsService;
  final VoidCallback onTap;

  const _MissionTrackingCard({
    required this.mission,
    required this.gpsService,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final hasTracking = mission['has_tracking'] == true;
    final lastGPS = mission['last_gps'];
    final isCurrentlyTracking = gpsService.isTracking && 
                                 gpsService.currentMissionId == mission['id'];

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: isCurrentlyTracking 
                          ? Colors.green.withAlpha(51)
                          : Colors.blue.withAlpha(51),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(
                      isCurrentlyTracking ? Icons.gps_fixed : Icons.gps_not_fixed,
                      color: isCurrentlyTracking ? Colors.green : Colors.blue,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          mission['reference'] ?? 'N/A',
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${mission['vehicle_brand'] ?? ''} ${mission['vehicle_model'] ?? ''}',
                          style: TextStyle(
                            fontSize: 14,
                            color: Colors.grey[600],
                          ),
                        ),
                      ],
                    ),
                  ),
                  _buildStatusChip(mission['status']),
                ],
              ),
              const Divider(height: 24),
              Row(
                children: [
                  Expanded(
                    child: _buildInfoTile(
                      Icons.place,
                      'Départ',
                      mission['pickup_address'] ?? 'N/A',
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: _buildInfoTile(
                      Icons.location_on,
                      'Arrivée',
                      mission['delivery_address'] ?? 'N/A',
                    ),
                  ),
                ],
              ),
              if (hasTracking && lastGPS != null) ...[
                const Divider(height: 24),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.grey[100],
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(Icons.access_time, size: 16, color: Colors.grey[600]),
                          const SizedBox(width: 8),
                          Text(
                            'Dernière position: ${_formatTimestamp(lastGPS['timestamp'])}',
                            style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Lat: ${lastGPS['latitude'].toStringAsFixed(6)}, '
                        'Lng: ${lastGPS['longitude'].toStringAsFixed(6)}',
                        style: TextStyle(fontSize: 11, color: Colors.grey[500]),
                      ),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  if (isCurrentlyTracking)
                    TextButton.icon(
                      onPressed: () {
                        gpsService.stopTracking();
                      },
                      icon: const Icon(Icons.stop, size: 18),
                      label: const Text('Arrêter'),
                      style: TextButton.styleFrom(
                        foregroundColor: Colors.red,
                      ),
                    )
                  else
                    TextButton.icon(
                      onPressed: () {
                        gpsService.startTracking(mission['id']);
                      },
                      icon: const Icon(Icons.play_arrow, size: 18),
                      label: const Text('Démarrer'),
                    ),
                  const SizedBox(width: 8),
                  ElevatedButton.icon(
                    onPressed: onTap,
                    icon: const Icon(Icons.map, size: 18),
                    label: const Text('Voir carte'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildInfoTile(IconData icon, String label, String value) {
    return Row(
      children: [
        Icon(icon, size: 16, color: Colors.grey[600]),
        const SizedBox(width: 8),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: TextStyle(fontSize: 12, color: Colors.grey[600]),
              ),
              Text(
                value,
                style: const TextStyle(fontSize: 13),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildStatusChip(String? status) {
    Color color;
    String label;

    switch (status) {
      case 'active':
      case 'in_progress':
        color = Colors.orange;
        label = 'En cours';
        break;
      case 'completed':
        color = Colors.green;
        label = 'Complétée';
        break;
      case 'cancelled':
        color = Colors.red;
        label = 'Annulée';
        break;
      default:
        color = Colors.grey;
        label = 'Inconnue';
    }

    return Chip(
      label: Text(
        label,
        style: const TextStyle(fontSize: 12, color: Colors.white),
      ),
      backgroundColor: color,
      padding: EdgeInsets.zero,
    );
  }

  String _formatTimestamp(String? timestamp) {
    if (timestamp == null) return 'N/A';
    
    try {
      final date = DateTime.parse(timestamp);
      final now = DateTime.now();
      final diff = now.difference(date);

      if (diff.inMinutes < 1) {
        return 'À l\'instant';
      } else if (diff.inMinutes < 60) {
        return 'Il y a ${diff.inMinutes} min';
      } else if (diff.inHours < 24) {
        return 'Il y a ${diff.inHours}h';
      } else {
        return DateFormat('dd/MM à HH:mm').format(date);
      }
    } catch (e) {
      return 'N/A';
    }
  }
}
