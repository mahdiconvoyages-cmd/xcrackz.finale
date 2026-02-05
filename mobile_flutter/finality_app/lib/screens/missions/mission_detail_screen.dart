import 'package:flutter/material.dart';
import '../../utils/error_helper.dart';
import '../../models/mission.dart';
import '../../services/mission_service.dart';
import '../../services/background_tracking_service.dart';
import 'package:intl/intl.dart';
import 'mission_map_screen.dart';

class MissionDetailScreen extends StatefulWidget {
  final String missionId;

  const MissionDetailScreen({
    super.key,
    required this.missionId,
  });

  @override
  State<MissionDetailScreen> createState() => _MissionDetailScreenState();
}

class _MissionDetailScreenState extends State<MissionDetailScreen> {
  final MissionService _missionService = MissionService();
  final BackgroundTrackingService _trackingService = BackgroundTrackingService();
  Mission? _mission;
  bool _isLoading = true;
  bool _isTrackingActive = false;

  @override
  void initState() {
    super.initState();
    _loadMission();
    _checkTrackingStatus();
  }

  void _checkTrackingStatus() {
    setState(() {
      _isTrackingActive = _trackingService.isTracking &&
          _trackingService.currentMissionId == widget.missionId;
    });
  }

  Future<void> _loadMission() async {
    setState(() => _isLoading = true);

    try {
      final mission = await _missionService.getMissionById(widget.missionId);
      setState(() {
        _mission = mission;
        _isLoading = false;
      });

      // AUTO-START: Démarrer le tracking automatiquement si mission en cours
      if (mission.status == 'in_progress' && !_trackingService.isTracking) {
        final started = await _trackingService.startTracking(mission.id, autoStart: true);
        if (started) {
          setState(() => _isTrackingActive = true);
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Row(
                  children: [
                    Icon(Icons.gps_fixed, color: Colors.white, size: 20),
                    SizedBox(width: 8),
                    Text('📍 Tracking GPS activé automatiquement'),
                  ],
                ),
                backgroundColor: Colors.green,
                duration: Duration(seconds: 2),
              ),
            );
          }
        }
      }
    } catch (e) {
      setState(() => _isLoading = false);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(ErrorHelper.cleanError(e))),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(title: const Text('Détails de la mission')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_mission == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Détails de la mission')),
        body: const Center(child: Text('Mission introuvable')),
      );
    }

    final dateFormat = DateFormat('dd/MM/yyyy à HH:mm');

    return Scaffold(
      appBar: AppBar(
        title: const Text('Détails de la mission'),
        actions: [
          PopupMenuButton(
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: 'edit',
                child: Row(
                  children: [
                    Icon(Icons.edit),
                    SizedBox(width: 8),
                    Text('Modifier'),
                  ],
                ),
              ),
              const PopupMenuItem(
                value: 'delete',
                child: Row(
                  children: [
                    Icon(Icons.delete, color: Colors.red),
                    SizedBox(width: 8),
                    Text('Supprimer', style: TextStyle(color: Colors.red)),
                  ],
                ),
              ),
            ],
            onSelected: (value) {
              if (value == 'delete') {
                _confirmDelete();
              }
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadMission,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _StatusCard(mission: _mission!),
              const SizedBox(height: 16),
              _AddressCard(mission: _mission!),
              const SizedBox(height: 16),
              _VehicleCard(mission: _mission!),
              const SizedBox(height: 16),
              _ClientCard(mission: _mission!),
              if (_mission!.notes != null) ...[
                const SizedBox(height: 16),
                _NotesCard(mission: _mission!),
              ],
            ],
          ),
        ),
      ),
      bottomNavigationBar: _buildBottomActions(),
    );
  }

  Widget _buildBottomActions() {
    final bool canTrack = _mission!.status == 'in_progress';
    
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Bouton toggle GPS (visible si mission en cours)
            if (canTrack) ..[
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: _isTrackingActive ? Colors.green.shade50 : Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: _isTrackingActive ? Colors.green : Colors.grey.shade300,
                    width: 2,
                  ),
                ),
                child: Row(
                  children: [
                    Icon(
                      _isTrackingActive ? Icons.gps_fixed : Icons.gps_off,
                      color: _isTrackingActive ? Colors.green : Colors.grey,
                      size: 24,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _isTrackingActive ? 'Tracking GPS Actif' : 'Tracking GPS Inactif',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              color: _isTrackingActive ? Colors.green.shade900 : Colors.grey.shade700,
                            ),
                          ),
                          Text(
                            _isTrackingActive 
                                ? 'Position mise à jour toutes les 3s'
                                : 'Activez pour partager votre position',
                            style: TextStyle(
                              fontSize: 12,
                              color: _isTrackingActive ? Colors.green.shade700 : Colors.grey.shade600,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Switch(
                      value: _isTrackingActive,
                      onChanged: (_) => _toggleTracking(),
                      activeColor: Colors.green,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
            ],
            // Boutons d'action principaux
            Row(
              children: [
                if (_mission!.status == 'pending') ...[
                  Expanded(
                    child: FilledButton.icon(
                      onPressed: () => _updateStatus('in_progress'),
                      icon: const Icon(Icons.play_arrow),
                      label: const Text('Démarrer'),
                    ),
                  ),
                ] else if (_mission!.status == 'in_progress') ...[
                  Expanded(
                    child: FilledButton.icon(
                      onPressed: () => _updateStatus('completed'),
                      icon: const Icon(Icons.check),
                      label: const Text('Terminer'),
                    ),
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _updateStatus(String newStatus) async {
    try {
      // Mettre à jour le statut
      await _missionService.updateMissionStatus(_mission!.id, newStatus);
      
      // Gérer le tracking GPS automatiquement
      if (newStatus == 'in_progress') {
        // Démarrer le tracking quand la mission commence
        final started = await _trackingService.startTracking(_mission!.id, autoStart: true);
        if (started) {
          setState(() => _isTrackingActive = true);
          print('✅ Tracking GPS démarré automatiquement');
        }
      } else if (newStatus == 'completed') {
        // Arrêter le tracking quand la mission est terminée
        await _trackingService.stopTracking();
        setState(() => _isTrackingActive = false);
        print('⏹️ Tracking GPS arrêté automatiquement');
      }
      
      await _loadMission();
      if (!mounted) return;
      
      String message = 'Statut mis à jour';
      if (newStatus == 'in_progress') {
        message = 'Mission démarrée - Tracking GPS activé 📍';
      } else if (newStatus == 'completed') {
        message = 'Mission terminée - Tracking GPS arrêté ✅';
      }
      
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(message),
          backgroundColor: Colors.green,
          behavior: SnackBarBehavior.floating,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(ErrorHelper.cleanError(e)),
          backgroundColor: Colors.red,
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  Future<void> _toggleTracking() async {
    try {
      if (_isTrackingActive) {
        // Arrêter le tracking
        await _trackingService.stopTracking();
        setState(() => _isTrackingActive = false);
        
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Row(
              children: [
                Icon(Icons.gps_off, color: Colors.white, size: 20),
                SizedBox(width: 8),
                Text('Tracking GPS désactivé'),
              ],
            ),
            backgroundColor: Colors.orange,
            duration: Duration(seconds: 2),
          ),
        );
      } else {
        // Démarrer le tracking
        final started = await _trackingService.startTracking(_mission!.id);
        if (started) {
          setState(() => _isTrackingActive = true);
          
          if (!mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Row(
                children: [
                  Icon(Icons.gps_fixed, color: Colors.white, size: 20),
                  SizedBox(width: 8),
                  Text('📍 Tracking GPS activé (3s)'),
                ],
              ),
              backgroundColor: Colors.green,
              duration: Duration(seconds: 2),
            ),
          );
        } else {
          if (!mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('❌ Impossible de démarrer le GPS (permissions?)'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(ErrorHelper.cleanError(e)),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _confirmDelete() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Supprimer la mission'),
        content: const Text('Êtes-vous sûr de vouloir supprimer cette mission ?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Annuler'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            style: FilledButton.styleFrom(
              backgroundColor: Colors.red,
            ),
            child: const Text('Supprimer'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      try {
        await _missionService.deleteMission(_mission!.id);
        if (!mounted) return;
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Mission supprimée')),
        );
      } catch (e) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(ErrorHelper.cleanError(e))),
        );
      }
    }
  }
}

class _StatusCard extends StatelessWidget {
  final Mission mission;

  const _StatusCard({required this.mission});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  _getStatusIcon(mission.status),
                  color: _getStatusColor(mission.status),
                ),
                const SizedBox(width: 8),
                Text(
                  _getStatusText(mission.status),
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        color: _getStatusColor(mission.status),
                        fontWeight: FontWeight.bold,
                      ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  IconData _getStatusIcon(String status) {
    switch (status) {
      case 'pending':
        return Icons.schedule;
      case 'assigned':
        return Icons.assignment_ind;
      case 'in_progress':
        return Icons.local_shipping;
      case 'completed':
        return Icons.check_circle;
      default:
        return Icons.info;
    }
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'pending':
        return Colors.orange;
      case 'assigned':
        return Colors.blue;
      case 'in_progress':
        return Colors.purple;
      case 'completed':
        return Colors.green;
      default:
        return Colors.grey;
    }
  }

  String _getStatusText(String status) {
    switch (status) {
      case 'pending':
        return 'En attente';
      case 'assigned':
        return 'Assignée';
      case 'in_progress':
        return 'En cours';
      case 'completed':
        return 'Terminée';
      default:
        return status;
    }
  }
}

class _AddressCard extends StatelessWidget {
  final Mission mission;

  const _AddressCard({required this.mission});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Itinéraire',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
                IconButton(
                  icon: const Icon(Icons.map_outlined),
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => MissionMapScreen(mission: mission),
                      ),
                    );
                  },
                  tooltip: 'Voir sur la carte',
                ),
              ],
            ),
            const SizedBox(height: 16),
            _AddressItem(
              icon: Icons.location_on,
              title: 'Départ',
              address: mission.pickupAddress ?? 'Non spécifié',
              city: mission.pickupCity,
            ),
            const Divider(height: 24),
            _AddressItem(
              icon: Icons.flag,
              title: 'Arrivée',
              address: mission.deliveryAddress ?? 'Non spécifié',
              city: mission.deliveryCity,
            ),
          ],
        ),
      ),
    );
  }
}

class _AddressItem extends StatelessWidget {
  final IconData icon;
  final String title;
  final String address;
  final String? city;

  const _AddressItem({
    required this.icon,
    required this.title,
    required this.address,
    this.city,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, color: Theme.of(context).colorScheme.primary),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
              ),
              const SizedBox(height: 4),
              Text(
                address,
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              if (city != null) ...[
                const SizedBox(height: 2),
                Text(
                  city!,
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }
}

class _VehicleCard extends StatelessWidget {
  final Mission mission;

  const _VehicleCard({required this.mission});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Véhicule',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 16),
            if (mission.vehicleBrand != null || mission.vehicleModel != null)
              _InfoRow(
                icon: Icons.directions_car,
                label: 'Marque / Modèle',
                value: '${mission.vehicleBrand ?? ''} ${mission.vehicleModel ?? ''}'.trim(),
              ),
            if (mission.vehicleType != null)
              _InfoRow(
                icon: Icons.category,
                label: 'Type',
                value: mission.vehicleType!,
              ),
            if (mission.vehiclePlate != null)
              _InfoRow(
                icon: Icons.credit_card,
                label: 'Immatriculation',
                value: mission.vehiclePlate!,
              ),
            if (mission.vehicleVin != null)
              _InfoRow(
                icon: Icons.numbers,
                label: 'N° VIN',
                value: mission.vehicleVin!,
              ),
          ],
        ),
      ),
    );
  }
}

class _ClientCard extends StatelessWidget {
  final Mission mission;

  const _ClientCard({required this.mission});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Client',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 16),
            if (mission.clientName != null)
              _InfoRow(
                icon: Icons.person,
                label: 'Nom',
                value: mission.clientName!,
              ),
            if (mission.clientPhone != null)
              _InfoRow(
                icon: Icons.phone,
                label: 'Téléphone',
                value: mission.clientPhone!,
              ),
            if (mission.clientEmail != null)
              _InfoRow(
                icon: Icons.email,
                label: 'Email',
                value: mission.clientEmail!,
              ),
            if (mission.price != null)
              _InfoRow(
                icon: Icons.euro,
                label: 'Prix',
                value: '${mission.price!.toStringAsFixed(2)} €',
              ),
          ],
        ),
      ),
    );
  }
}

class _NotesCard extends StatelessWidget {
  final Mission mission;

  const _NotesCard({required this.mission});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Notes',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 8),
            Text(
              mission.notes!,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ],
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _InfoRow({
    required this.icon,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Icon(
            icon,
            size: 20,
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                ),
                const SizedBox(height: 2),
                Text(
                  value,
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
