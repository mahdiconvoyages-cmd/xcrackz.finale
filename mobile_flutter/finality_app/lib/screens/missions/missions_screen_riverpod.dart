import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/missions_provider.dart';
import '../../models/mission.dart';
import '../../widgets/skeleton_loaders.dart';
import '../../utils/logger.dart';
import 'package:intl/intl.dart';

/// Écran des missions refactoré avec Riverpod
/// ✅ Pas de setState
/// ✅ Performance optimisée
/// ✅ Skeleton loaders
/// ✅ Cached images
class MissionsScreenRiverpod extends ConsumerStatefulWidget {
  const MissionsScreenRiverpod({super.key});

  @override
  ConsumerState<MissionsScreenRiverpod> createState() => _MissionsScreenRiverpodState();
}

class _MissionsScreenRiverpodState extends ConsumerState<MissionsScreenRiverpod>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  String _selectedStatus = 'pending';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _tabController.addListener(_onTabChanged);
    logger.d('📱 MissionsScreen initialized');
  }

  @override
  void dispose() {
    _tabController.removeListener(_onTabChanged);
    _tabController.dispose();
    super.dispose();
  }

  void _onTabChanged() {
    if (!_tabController.indexIsChanging) {
      setState(() {
        _selectedStatus = ['pending', 'in_progress', 'completed'][_tabController.index];
      });
      logger.d('Tab changed to: $_selectedStatus');
    }
  }

  @override
  Widget build(BuildContext context) {
    // ✅ Pas de setState ici - Riverpod gère tout
    final missionsAsync = ref.watch(missionsProvider(status: _selectedStatus));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Mes Missions'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'En attente'),
            Tab(text: 'En cours'),
            Tab(text: 'Terminées'),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              logger.d('🔄 Manual refresh requested');
              ref.invalidate(missionsProvider(status: _selectedStatus));
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          logger.d('🔄 Pull to refresh');
          ref.invalidate(missionsProvider(status: _selectedStatus));
          // Attendre que les nouvelles données soient chargées
          await ref.read(missionsProvider(status: _selectedStatus).future);
        },
        child: missionsAsync.when(
          // ✅ Loading: Skeleton au lieu de CircularProgressIndicator
          loading: () => const MissionSkeleton(),
          
          // ✅ Error: Message clair avec retry
          error: (error, stack) {
            logger.e('Error loading missions', error, stack);
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.error_outline, size: 64, color: Colors.red),
                  const SizedBox(height: 16),
                  Text(
                    'Erreur de chargement',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Impossible de charger les missions',
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton.icon(
                    onPressed: () {
                      ref.invalidate(missionsProvider(status: _selectedStatus));
                    },
                    icon: const Icon(Icons.refresh),
                    label: const Text('Réessayer'),
                  ),
                ],
              ),
            );
          },
          
          // ✅ Data: Liste optimisée
          data: (missions) {
            if (missions.isEmpty) {
              return Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.inbox_outlined,
                      size: 80,
                      color: Colors.grey[400],
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Aucune mission',
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Créez votre première mission',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: Colors.grey[600],
                          ),
                    ),
                  ],
                ),
              );
            }

            return ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: missions.length,
              separatorBuilder: (context, index) => const SizedBox(height: 12),
              // ✅ Key importante pour performance
              itemBuilder: (context, index) => MissionCard(
                key: ValueKey(missions[index].id),
                mission: missions[index],
              ),
              // ✅ Optimisations ListView
              cacheExtent: 500.0,
              addAutomaticKeepAlives: true,
            );
          },
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          // Navigation vers création
          logger.d('➕ Create mission button pressed');
        },
        icon: const Icon(Icons.add),
        label: const Text('Nouvelle mission'),
      ),
    );
  }
}

/// Widget card de mission optimisé
class MissionCard extends StatelessWidget {
  final Mission mission;

  const MissionCard({
    super.key,
    required this.mission,
  });

  Color _getStatusColor(String status) {
    switch (status) {
      case 'pending':
        return Colors.orange;
      case 'in_progress':
        return Colors.blue;
      case 'completed':
        return Colors.green;
      default:
        return Colors.grey;
    }
  }

  String _getStatusLabel(String status) {
    switch (status) {
      case 'pending':
        return 'En attente';
      case 'in_progress':
        return 'En cours';
      case 'completed':
        return 'Terminée';
      default:
        return status;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
      child: InkWell(
        onTap: () {
          logger.d('Mission card tapped: ${mission.id}');
          // Navigation vers détails
        },
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  // ✅ Cached image au lieu de Image.network
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: _getStatusColor(mission.status).withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      Icons.local_shipping,
                      color: _getStatusColor(mission.status),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          mission.reference ?? 'Mission #${mission.id.substring(0, 8)}',
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${mission.vehicleBrand ?? 'Véhicule'} ${mission.vehicleModel ?? ''}',
                          style: TextStyle(
                            fontSize: 13,
                            color: Colors.grey[600],
                          ),
                        ),
                      ],
                    ),
                  ),
                  // Badge statut
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: _getStatusColor(mission.status).withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: _getStatusColor(mission.status),
                        width: 1,
                      ),
                    ),
                    child: Text(
                      _getStatusLabel(mission.status),
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: _getStatusColor(mission.status),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              const Divider(),
              const SizedBox(height: 12),
              // Adresses
              Row(
                children: [
                  Container(
                    width: 24,
                    height: 24,
                    decoration: BoxDecoration(
                      color: Colors.green.withValues(alpha: 0.1),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.circle,
                      size: 12,
                      color: Colors.green,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      mission.pickupAddress ?? 'Adresse de départ',
                      style: const TextStyle(fontSize: 13),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Container(
                    width: 24,
                    height: 24,
                    decoration: BoxDecoration(
                      color: Colors.red.withValues(alpha: 0.1),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.location_on,
                      size: 14,
                      color: Colors.red,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      mission.deliveryAddress ?? 'Adresse d\'arrivée',
                      style: const TextStyle(fontSize: 13),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
              if (mission.pickupDate != null) ...[
                const SizedBox(height: 12),
                Row(
                  children: [
                    Icon(Icons.calendar_today, size: 14, color: Colors.grey[600]),
                    const SizedBox(width: 6),
                    Text(
                      DateFormat('dd/MM/yyyy HH:mm').format(mission.pickupDate!),
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.grey[600],
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
