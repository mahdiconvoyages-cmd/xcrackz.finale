import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart' as url_launcher;
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:share_plus/share_plus.dart';
import '../../l10n/app_localizations.dart';
import '../../main.dart';
import '../../models/mission.dart';
import '../../services/mission_service.dart';
import '../../services/gps_tracking_service.dart';
import 'package:intl/intl.dart';
import '../../utils/error_helper.dart';
import 'mission_create_screen_new.dart';
import '../../widgets/app_drawer.dart';
import '../inspections/inspection_departure_screen.dart';
import '../inspections/inspection_arrival_screen.dart';
import '../profile/profile_screen.dart';
import '../../theme/premium_theme.dart';
import '../../widgets/premium/premium_widgets.dart';

class MissionsScreen extends StatefulWidget {
  const MissionsScreen({super.key});

  @override
  State<MissionsScreen> createState() => _MissionsScreenState();
}

class _MissionsScreenState extends State<MissionsScreen> with SingleTickerProviderStateMixin {
  final MissionService _missionService = MissionService();
  final GPSTrackingService _gpsService = GPSTrackingService();
  List<Mission> _missions = [];
  bool _isLoading = true;
  String _selectedStatus = 'all';
  late TabController _tabController;
  bool _isGridView = false;
  final TextEditingController _joinCodeController = TextEditingController();

  @override
  void initState() {
    super.initState();
    // DEBUG: Version 2.9.5 - RAPPORTS PUBLICS + PHOTOS OPTIONNELLES
    debugPrint('🔧🔧🔧 MISSIONS v2.9.5 - Rapports publics départ/complet + 10 photos optionnelles');
    _tabController = TabController(length: 3, vsync: this);
    _tabController.addListener(() {
      if (!_tabController.indexIsChanging) {
        _filterByTab();
      }
    });
    _loadMissions();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _joinCodeController.dispose();
    super.dispose();
  }

  void _filterByTab() {
    String status;
    switch (_tabController.index) {
      case 0:
        status = 'pending';
        break;
      case 1:
        status = 'in_progress';
        break;
      case 2:
        status = 'completed';
        break;
      default:
        status = 'all';
    }
    
    if (_selectedStatus != status) {
      setState(() {
        _selectedStatus = status;
      });
      _loadMissions();
    }
  }

  Future<void> _loadMissions() async {
    setState(() => _isLoading = true);

    try {
      final missions = await _missionService.getMissions(
        status: _selectedStatus == 'all' ? null : _selectedStatus,
      );
      setState(() {
        _missions = missions;
        _isLoading = false;
      });
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
    final l10n = AppLocalizations.of(context);
    return Scaffold(
      backgroundColor: PremiumTheme.lightBg,
      drawer: const AppDrawer(),
      appBar: AppBar(
        flexibleSpace: Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                PremiumTheme.primaryTeal,
                PremiumTheme.primaryBlue,
                PremiumTheme.primaryIndigo,
              ],
            ),
            boxShadow: [
              BoxShadow(
                color: PremiumTheme.primaryTeal.withValues(alpha: 0.3),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
        ),
        title: Text(
          l10n.myConvoys,
          style: TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: 22,
            letterSpacing: 0.5,
            shadows: [
              Shadow(
                color: Colors.black.withValues(alpha: 0.3),
                offset: const Offset(0, 2),
                blurRadius: 4,
              ),
            ],
          ),
        ),
        centerTitle: false,
        elevation: 0,
        actions: [
          IconButton(
            icon: Icon(_isGridView ? Icons.list : Icons.grid_view),
            tooltip: _isGridView ? l10n.listView : l10n.gridView,
            onPressed: () {
              setState(() {
                _isGridView = !_isGridView;
              });
            },
          ),
          IconButton(
            icon: const Icon(Icons.notifications_outlined),
            onPressed: () {},
          ),
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: GestureDetector(
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => const ProfileScreen()),
                );
              },
              child: CircleAvatar(
                radius: 16,
                backgroundColor: Colors.white,
                child: Text(
                  supabase.auth.currentUser?.email?.substring(0, 1).toUpperCase() ?? 'U',
                  style: const TextStyle(
                    color: Color(0xFF14b8a6),
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                  ),
                ),
              ),
            ),
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.white,
          indicatorWeight: 3,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          tabs: [
            Tab(text: l10n.pending),
            Tab(text: l10n.inProgress),
            Tab(text: l10n.completed),
          ],
        ),
      ),
      body: Column(
        children: [
          // Join Mission Code Card - Compact
          Container(
            margin: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  PremiumTheme.primaryTeal.withValues(alpha: 0.1),
                  PremiumTheme.primaryBlue.withValues(alpha: 0.1),
                ],
              ),
              borderRadius: BorderRadius.circular(PremiumTheme.radiusLG),
              border: Border.all(
                color: PremiumTheme.primaryTeal.withValues(alpha: 0.3),
                width: 1,
              ),
              boxShadow: [
                BoxShadow(
                  color: PremiumTheme.primaryTeal.withValues(alpha: 0.15),
                  blurRadius: 12,
                  offset: const Offset(0, 4),
                ),
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.05),
                  blurRadius: 4,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            padding: const EdgeInsets.all(12),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _joinCodeController,
                      style: TextStyle(color: PremiumTheme.textPrimary),
                      decoration: InputDecoration(
                        hintText: l10n.missionCode,
                        hintStyle: TextStyle(color: PremiumTheme.textSecondary),
                        prefixIcon: Icon(
                          Icons.qr_code,
                          color: PremiumTheme.primaryTeal,
                        ),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(PremiumTheme.radiusMD),
                          borderSide: BorderSide(color: PremiumTheme.textSecondary.withValues(alpha: 0.2)),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(PremiumTheme.radiusMD),
                          borderSide: BorderSide(color: PremiumTheme.textSecondary.withValues(alpha: 0.2)),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(PremiumTheme.radiusMD),
                          borderSide: BorderSide(color: PremiumTheme.primaryTeal, width: 2),
                        ),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Container(
                    decoration: BoxDecoration(
                      gradient: PremiumTheme.tealGradient,
                      borderRadius: BorderRadius.circular(PremiumTheme.radiusMD),
                    ),
                    child: Material(
                      color: Colors.transparent,
                      child: InkWell(
                        onTap: _joinMissionByCode,
                        borderRadius: BorderRadius.circular(PremiumTheme.radiusMD),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.login, size: 16, color: Colors.white),
                              SizedBox(width: 6),
                              Text(l10n.join, style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 14)),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
          ),
          
          // Mission List/Grid
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildMissionView('pending'),
                _buildMissionView('in_progress'),
                _buildMissionView('completed'),
              ],
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => const MissionCreateScreenNew(),
            ),
          ).then((created) {
            if (created == true) _loadMissions();
          });
        },
        backgroundColor: const Color(0xFF14b8a6),
        child: const Icon(Icons.add),
      ),
    );
  }

  Widget _buildMissionView(String status) {
    final l10n = AppLocalizations.of(context);
    final filteredMissions = _missions.where((m) => m.status == status).toList();
    
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }
    
    if (filteredMissions.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.assignment_outlined,
              size: 64,
              color: Colors.white.withValues(alpha: 0.3),
            ),
            const SizedBox(height: 16),
            Text(
              l10n.noMissions,
              style: TextStyle(
                color: Colors.white.withValues(alpha: 0.7),
                fontSize: 16,
              ),
            ),
          ],
        ),
      );
    }
    
    return RefreshIndicator(
      onRefresh: _loadMissions,
      child: _isGridView 
        ? GridView.builder(
            key: ValueKey('missions-grid-$status'),
            padding: const EdgeInsets.all(16),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              childAspectRatio: 0.75,
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
            ),
            cacheExtent: 500.0,
            addAutomaticKeepAlives: true,
            itemCount: filteredMissions.length,
            itemBuilder: (context, index) {
              final mission = filteredMissions[index];
              return _MissionGridCard(
                key: ValueKey('grid-${mission.id}'),
                mission: mission,
              );
            },
          )
        : ListView.builder(
            key: ValueKey('missions-list-$status'),
            padding: const EdgeInsets.all(16),
            cacheExtent: 500.0,
            addAutomaticKeepAlives: true,
            itemCount: filteredMissions.length,
            itemBuilder: (context, index) {
              final mission = filteredMissions[index];
              return _MissionCard(
                key: ValueKey('card-${mission.id}'),
                mission: mission,
              );
            },
          ),
    );
  }

  Future<void> _joinMissionByCode() async {
    final code = _joinCodeController.text.trim();
    if (code.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Veuillez entrer un code')),
      );
      return;
    }

    try {
      // Call mission service to join by code
      await _missionService.joinMissionByShareCode(code);
      _joinCodeController.clear();
      
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Mission rejointe avec succès!'),
          backgroundColor: Colors.green,
        ),
      );
      _loadMissions();
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

  void _showFilterDialog() {
    // Filter is now handled by tabs
  }

  void _showJoinMissionModal() {
    // Join mission is now in the header card
  }

  Widget _buildStatItem({
    required IconData icon,
    required String label,
    required int value,
    required Color color,
  }) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.2),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, color: color, size: 20),
        ),
        const SizedBox(height: 8),
        Text(
          value.toString(),
          style: PremiumTheme.heading3.copyWith(
            color: color,
            fontSize: 24,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: PremiumTheme.bodySmall.copyWith(
            color: PremiumTheme.textSecondary,
            fontSize: 11,
          ),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }
}

// Grid Card for missions
class _MissionGridCard extends StatelessWidget {
  final Mission mission;

  const _MissionGridCard({super.key, required this.mission});

  static Color _getStatusColor(String status) {
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

  static String _getStatusText(String status) {
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
    final statusColor = _getStatusColor(mission.status);

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(PremiumTheme.radiusLG),
        border: Border.all(
          color: statusColor.withValues(alpha: 0.3),
          width: 1.5,
        ),
        boxShadow: [
          BoxShadow(
            color: statusColor.withValues(alpha: 0.15),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
        onTap: () {
          // TODO: Navigate to mission details
        },
        borderRadius: BorderRadius.circular(PremiumTheme.radiusLG),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Status badge
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [statusColor.withValues(alpha: 0.2), statusColor.withValues(alpha: 0.1)],
                  ),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: statusColor.withValues(alpha: 0.3)),
                ),
                child: Text(
                  _getStatusText(mission.status),
                  style: TextStyle(
                    color: statusColor,
                    fontWeight: FontWeight.bold,
                    fontSize: 10,
                  ),
                ),
              ),
              const SizedBox(height: 10),
              
              // Pickup
              Text(
                mission.pickupAddress ?? 'Départ',
                style: TextStyle(
                  color: PremiumTheme.textPrimary,
                  fontWeight: FontWeight.bold,
                  fontSize: 13,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 4),
              
              // Arrow
              Container(
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  color: PremiumTheme.primaryTeal.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: const Icon(Icons.arrow_downward, size: 14, color: Color(0xFF14b8a6)),
              ),
              const SizedBox(height: 4),
              
              // Delivery
              Text(
                mission.deliveryAddress ?? 'Arrivée',
                style: TextStyle(
                  color: PremiumTheme.textSecondary,
                  fontSize: 12,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              
              const Spacer(),
              
              // Vehicle info with type and plate
              if (mission.vehicleType != null || mission.vehiclePlate != null) ...[
                Divider(color: statusColor.withValues(alpha: 0.2), height: 16),
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: PremiumTheme.primaryTeal.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: PremiumTheme.primaryTeal.withValues(alpha: 0.2),
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (mission.vehicleType != null)
                        Row(
                          children: [
                            const Icon(Icons.directions_car, size: 14, color: Color(0xFF14b8a6)),
                            const SizedBox(width: 6),
                            Expanded(
                              child: Text(
                                mission.vehicleType!,
                                style: TextStyle(
                                  color: PremiumTheme.textPrimary,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                      if (mission.vehicleType != null && mission.vehiclePlate != null)
                        const SizedBox(height: 6),
                      if (mission.vehiclePlate != null)
                        Row(
                          children: [
                            const Icon(Icons.confirmation_number, size: 14, color: Color(0xFF14b8a6)),
                            const SizedBox(width: 6),
                            Expanded(
                              child: Text(
                                mission.vehiclePlate!,
                                style: TextStyle(
                                  color: PremiumTheme.textPrimary,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                  letterSpacing: 1,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    ),
    );
  }
}

class _MissionCard extends StatelessWidget {
  final Mission mission;

  const _MissionCard({super.key, required this.mission});

  static Color _getStatusColor(String status) {
    switch (status) {
      case 'pending':
        return PremiumTheme.accentAmber;
      case 'in_progress':
        return PremiumTheme.primaryTeal;
      case 'completed':
        return PremiumTheme.accentGreen;
      default:
        return Colors.grey;
    }
  }

  static String _getStatusText(String status) {
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
    final statusColor = _getStatusColor(mission.status);
    final dateFormat = DateFormat('dd/MM/yyyy');

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            PremiumTheme.cardBg,
            PremiumTheme.cardBg.withValues(alpha: 0.9),
          ],
        ),
        borderRadius: BorderRadius.circular(PremiumTheme.radiusLG),
        border: Border.all(
          color: statusColor.withValues(alpha: 0.3),
          width: 1.5,
        ),
        boxShadow: [
          BoxShadow(
            color: statusColor.withValues(alpha: 0.1),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () {
            // TODO: Navigate to mission details
          },
          borderRadius: BorderRadius.circular(PremiumTheme.radiusLG),
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header with status badge
                Row(
                  children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [statusColor, statusColor.withValues(alpha: 0.7)],
                      ),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      mission.status == 'pending'
                          ? Icons.pending_actions
                          : mission.status == 'in_progress'
                              ? Icons.local_shipping
                              : Icons.check_circle,
                      color: Colors.white,
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _getStatusText(mission.status),
                          style: PremiumTheme.bodySmall.copyWith(
                            color: statusColor,
                            fontWeight: FontWeight.w600,
                            fontSize: 13,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          mission.pickupAddress ?? 'Adresse de départ',
                          style: PremiumTheme.body.copyWith(
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              
              // Destination
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: PremiumTheme.cardBgLight,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: const Color(0xFFE5E7EB),
                  ),
                ),
                child: Row(
                  children: [
                    Icon(
                      Icons.place,
                      size: 18,
                      color: PremiumTheme.primaryTeal,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Destination',
                            style: PremiumTheme.bodySmall.copyWith(
                              color: PremiumTheme.textSecondary,
                              fontSize: 11,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            mission.deliveryAddress ?? 'Adresse de livraison',
                            style: PremiumTheme.body.copyWith(
                              fontSize: 14,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              
              // Client & Vehicle Info
              const SizedBox(height: 16),
              Column(
                children: [
                  // Client row
                  if (mission.clientName != null)
                    Row(
                      children: [
                        Expanded(
                          child: _InfoChip(
                            icon: Icons.person_outline,
                            label: mission.clientName!,
                            color: PremiumTheme.primaryBlue,
                          ),
                        ),
                      ],
                    ),
                  
                  // Vehicle info - improved display
                  if (mission.vehicleType != null || mission.vehiclePlate != null) ...[
                    if (mission.clientName != null)
                      const SizedBox(height: 10),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [
                            PremiumTheme.primaryTeal.withValues(alpha: 0.15),
                            PremiumTheme.primaryTeal.withValues(alpha: 0.08),
                          ],
                        ),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: PremiumTheme.primaryTeal.withValues(alpha: 0.3),
                          width: 1.5,
                        ),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            Icons.directions_car,
                            size: 18,
                            color: PremiumTheme.primaryTeal,
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                if (mission.vehicleType != null)
                                  Text(
                                    mission.vehicleType!,
                                    style: PremiumTheme.bodySmall.copyWith(
                                      color: PremiumTheme.textPrimary,
                                      fontWeight: FontWeight.w600,
                                      fontSize: 13,
                                    ),
                                  ),
                                if (mission.vehiclePlate != null) ...[
                                  if (mission.vehicleType != null)
                                    const SizedBox(height: 4),
                                  Row(
                                    children: [
                                      Icon(
                                        Icons.confirmation_number,
                                        size: 12,
                                        color: PremiumTheme.primaryTeal,
                                      ),
                                      const SizedBox(width: 6),
                                      Expanded(
                                        child: Text(
                                          mission.vehiclePlate!,
                                          style: PremiumTheme.bodySmall.copyWith(
                                            color: PremiumTheme.primaryTeal,
                                            fontWeight: FontWeight.w700,
                                            fontSize: 12,
                                            letterSpacing: 0.5,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
              
              // Date & Price
              const SizedBox(height: 12),
              Row(
                children: [
                  if (mission.pickupDate != null) ...[
                    Icon(
                      Icons.calendar_today,
                      size: 14,
                      color: PremiumTheme.textSecondary,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      dateFormat.format(mission.pickupDate!),
                      style: PremiumTheme.bodySmall.copyWith(
                        color: PremiumTheme.textSecondary,
                      ),
                    ),
                  ],
                  const Spacer(),
                  if (mission.price != null)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [
                            PremiumTheme.accentGreen,
                            PremiumTheme.accentGreen.withValues(alpha: 0.8),
                          ],
                        ),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        '${mission.price!.toStringAsFixed(2)} €',
                        style: PremiumTheme.body.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 15,
                        ),
                      ),
                    ),
                ],
              ),
              
              // Boutons d'inspection
              if (mission.status == 'pending' || mission.status == 'in_progress') ...[
                const SizedBox(height: 16),
                const Divider(),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () async {
                          // Vérifier si une inspection de départ existe déjà
                          final existingInspection = await supabase
                              .from('vehicle_inspections')
                              .select('id')
                              .eq('mission_id', mission.id)
                              .eq('inspection_type', 'departure')
                              .maybeSingle();

                          if (existingInspection != null) {
                            if (!context.mounted) return;
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('❌ Inspection de départ déjà validée'),
                                backgroundColor: Color(0xFFEF4444),
                                behavior: SnackBarBehavior.floating,
                              ),
                            );
                            return;
                          }

                          if (!context.mounted) return;
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (context) => InspectionDepartureScreen(
                                missionId: mission.id,
                              ),
                            ),
                          );
                        },
                        icon: const Icon(Icons.upload, size: 18),
                        label: const Text('Départ'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: PremiumTheme.primaryTeal,
                          side: BorderSide(color: PremiumTheme.primaryTeal),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: FilledButton.icon(
                        onPressed: mission.status == 'in_progress'
                            ? () async {
                                // Vérifier si une inspection d'arrivée existe déjà
                                final existingInspection = await supabase
                                    .from('vehicle_inspections')
                                    .select('id')
                                    .eq('mission_id', mission.id)
                                    .eq('inspection_type', 'arrival')
                                    .maybeSingle();

                                if (existingInspection != null) {
                                  if (!context.mounted) return;
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(
                                      content: Text('❌ Inspection d\'arrivée déjà validée'),
                                      backgroundColor: Color(0xFFEF4444),
                                      behavior: SnackBarBehavior.floating,
                                    ),
                                  );
                                  return;
                                }

                                if (!context.mounted) return;
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (context) => InspectionArrivalScreen(
                                      missionId: mission.id,
                                    ),
                                  ),
                                );
                              }
                            : null,
                        icon: const Icon(Icons.download, size: 18),
                        label: const Text('Arrivée'),
                        style: FilledButton.styleFrom(
                          backgroundColor: PremiumTheme.primaryTeal,
                          disabledBackgroundColor: PremiumTheme.cardBgLight,
                          padding: const EdgeInsets.symmetric(vertical: 12),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
              
              // Bouton rapport de départ pour missions in_progress
              if (mission.status == 'in_progress') ...[
                const SizedBox(height: 16),
                const Divider(color: Color(0xFF334155)),
                const SizedBox(height: 12),
                
                // Bouton pour le rapport de départ avec menu
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: () async {
                      // Afficher le menu de choix
                      if (!context.mounted) return;
                      showModalBottomSheet(
                        context: context,
                        backgroundColor: const Color(0xFF1F2937),
                        shape: const RoundedRectangleBorder(
                          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
                        ),
                        builder: (bottomSheetContext) => Container(
                          padding: const EdgeInsets.all(24),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Container(
                                width: 40,
                                height: 4,
                                margin: const EdgeInsets.only(bottom: 20),
                                decoration: BoxDecoration(
                                  color: Colors.white.withValues(alpha: 0.3),
                                  borderRadius: BorderRadius.circular(2),
                                ),
                              ),
                              const Text(
                                '📋 Rapport de départ',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 20,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                'Choisissez une action',
                                style: TextStyle(
                                  color: Colors.white.withValues(alpha: 0.7),
                                  fontSize: 14,
                                ),
                              ),
                              const SizedBox(height: 24),
                              
                              // Option 1: Ouvrir dans le navigateur
                              Container(
                                margin: const EdgeInsets.only(bottom: 12),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF374151),
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(
                                    color: const Color(0xFF14B8A6).withValues(alpha: 0.3),
                                  ),
                                ),
                                child: ListTile(
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                                leading: Container(
                                  padding: const EdgeInsets.all(12),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF14B8A6).withValues(alpha: 0.2),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: const Icon(Icons.open_in_browser, color: Color(0xFF14B8A6), size: 24),
                                ),
                                title: const Text(
                                  'Ouvrir dans le navigateur',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 16,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                subtitle: const Text(
                                  'Voir le rapport en ligne',
                                  style: TextStyle(
                                    color: Color(0xFF9CA3AF),
                                    fontSize: 13,
                                  ),
                                ),
                                onTap: () async {
                                  Navigator.pop(bottomSheetContext);
                                  try {
                                    if (!context.mounted) return;
                                    showDialog(
                                      context: context,
                                      barrierDismissible: false,
                                      builder: (context) => const Center(child: CircularProgressIndicator()),
                                    );

                                    final supabase = Supabase.instance.client;
                                    final userId = supabase.auth.currentUser?.id;
                                    if (userId == null) throw Exception('Non connecté');

                                    final result = await supabase.rpc(
                                      'create_or_get_inspection_share',
                                      params: {
                                        'p_mission_id': mission.id,
                                        'p_report_type': 'departure',
                                        'p_user_id': userId,
                                      },
                                    );

                                    if (!context.mounted) return;
                                    Navigator.pop(context);

                                    if (result != null && result is List && result.isNotEmpty) {
                                      final token = result[0]['share_token'] as String;
                                      final reportUrl = 'https://www.checksfleet.com/rapport-inspection/$token';
                                      await url_launcher.launchUrl(Uri.parse(reportUrl), mode: url_launcher.LaunchMode.externalApplication);
                                    }
                                  } catch (e) {
                                    if (!context.mounted) return;
                                    Navigator.pop(context);
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(content: Text(ErrorHelper.cleanError(e)), backgroundColor: const Color(0xFFEF4444)),
                                    );
                                  }
                                },
                              ),
                              ),
                              
                              // Option 2: Partager le lien
                              Container(
                                decoration: BoxDecoration(
                                  color: const Color(0xFF374151),
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(
                                    color: const Color(0xFF8B5CF6).withValues(alpha: 0.3),
                                  ),
                                ),
                                child: ListTile(
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                                leading: Container(
                                  padding: const EdgeInsets.all(12),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF8B5CF6).withValues(alpha: 0.2),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: const Icon(Icons.share, color: Color(0xFF8B5CF6), size: 24),
                                ),
                                title: const Text(
                                  'Partager le lien',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 16,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                subtitle: const Text(
                                  'Envoyer par WhatsApp, Email, etc.',
                                  style: TextStyle(
                                    color: Color(0xFF9CA3AF),
                                    fontSize: 13,
                                  ),
                                ),
                                onTap: () async {
                                  Navigator.pop(bottomSheetContext);
                                  try {
                                    if (!context.mounted) return;
                                    showDialog(
                                      context: context,
                                      barrierDismissible: false,
                                      builder: (context) => const Center(child: CircularProgressIndicator()),
                                    );

                                    final supabase = Supabase.instance.client;
                                    final userId = supabase.auth.currentUser?.id;
                                    if (userId == null) throw Exception('Non connecté');

                                    final result = await supabase.rpc(
                                      'create_or_get_inspection_share',
                                      params: {
                                        'p_mission_id': mission.id,
                                        'p_report_type': 'departure',
                                        'p_user_id': userId,
                                      },
                                    );

                                    if (!context.mounted) return;
                                    Navigator.pop(context);

                                    if (result != null && result is List && result.isNotEmpty) {
                                      final token = result[0]['share_token'] as String;
                                      final reportUrl = 'https://www.checksfleet.com/rapport-inspection/$token';
                                      final vehicleInfo = mission.vehicleType ?? 'Véhicule';
                                      await SharePlus.instance.share(ShareParams(text: '📋 Rapport de départ - $vehicleInfo\n$reportUrl'));
                                      
                                      if (!context.mounted) return;
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        const SnackBar(
                                          content: Row(
                                            children: [
                                              Icon(Icons.check_circle, color: Colors.white),
                                              SizedBox(width: 12),
                                              Text('Lien partagé'),
                                            ],
                                          ),
                                          backgroundColor: Color(0xFF14B8A6),
                                          behavior: SnackBarBehavior.floating,
                                        ),
                                      );
                                    }
                                  } catch (e) {
                                    if (!context.mounted) return;
                                    Navigator.pop(context);
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(content: Text(ErrorHelper.cleanError(e)), backgroundColor: const Color(0xFFEF4444)),
                                    );
                                  }
                                },
                              ),
                              ),
                              
                              const SizedBox(height: 20),
                            ],
                          ),
                        ),
                      );
                    },
                    icon: const Icon(Icons.description, size: 20),
                    label: const Text('📋 Rapport de départ'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF8B5CF6),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      elevation: 2,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                ),
              ],
              
              // Bouton rapport pour missions terminées
              if (mission.status == 'completed') ...[
                const SizedBox(height: 16),
                const Divider(color: Color(0xFF334155)),
                const SizedBox(height: 12),
                
                // Bouton pour le rapport complet avec menu
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: () async {
                      // Afficher le menu de choix
                      if (!context.mounted) return;
                      showModalBottomSheet(
                        context: context,
                        backgroundColor: const Color(0xFF1F2937),
                        shape: const RoundedRectangleBorder(
                          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
                        ),
                        builder: (bottomSheetContext) => Container(
                          padding: const EdgeInsets.all(24),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Container(
                                width: 40,
                                height: 4,
                                margin: const EdgeInsets.only(bottom: 20),
                                decoration: BoxDecoration(
                                  color: Colors.white.withValues(alpha: 0.3),
                                  borderRadius: BorderRadius.circular(2),
                                ),
                              ),
                              const Text(
                                '📊 Rapport complet',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 20,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                'Choisissez une action',
                                style: TextStyle(
                                  color: Colors.white.withValues(alpha: 0.7),
                                  fontSize: 14,
                                ),
                              ),
                              const SizedBox(height: 24),
                              
                              // Option 1: Ouvrir dans le navigateur
                              Container(
                                margin: const EdgeInsets.only(bottom: 12),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF374151),
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(
                                    color: const Color(0xFF14B8A6).withValues(alpha: 0.3),
                                  ),
                                ),
                                child: ListTile(
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                                leading: Container(
                                  padding: const EdgeInsets.all(12),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF14B8A6).withValues(alpha: 0.2),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: const Icon(Icons.open_in_browser, color: Color(0xFF14B8A6), size: 24),
                                ),
                                title: const Text(
                                  'Ouvrir dans le navigateur',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 16,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                subtitle: const Text(
                                  'Voir le rapport en ligne',
                                  style: TextStyle(
                                    color: Color(0xFF9CA3AF),
                                    fontSize: 13,
                                  ),
                                ),
                                onTap: () async {
                                  Navigator.pop(bottomSheetContext);
                                  try {
                                    if (!context.mounted) return;
                                    showDialog(
                                      context: context,
                                      barrierDismissible: false,
                                      builder: (context) => const Center(child: CircularProgressIndicator()),
                                    );

                                    final supabase = Supabase.instance.client;
                                    final userId = supabase.auth.currentUser?.id;
                                    if (userId == null) throw Exception('Non connecté');

                                    final result = await supabase.rpc(
                                      'create_or_get_inspection_share',
                                      params: {
                                        'p_mission_id': mission.id,
                                        'p_report_type': 'complete',
                                        'p_user_id': userId,
                                      },
                                    );

                                    if (!context.mounted) return;
                                    Navigator.pop(context);

                                    if (result != null && result is List && result.isNotEmpty) {
                                      final token = result[0]['share_token'] as String;
                                      final reportUrl = 'https://www.checksfleet.com/rapport-inspection/$token';
                                      await url_launcher.launchUrl(Uri.parse(reportUrl), mode: url_launcher.LaunchMode.externalApplication);
                                    }
                                  } catch (e) {
                                    if (!context.mounted) return;
                                    Navigator.pop(context);
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(content: Text(ErrorHelper.cleanError(e)), backgroundColor: const Color(0xFFEF4444)),
                                    );
                                  }
                                },
                              ),
                              ),
                              
                              // Option 2: Partager le lien
                              Container(
                                decoration: BoxDecoration(
                                  color: const Color(0xFF374151),
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(
                                    color: const Color(0xFF8B5CF6).withValues(alpha: 0.3),
                                  ),
                                ),
                                child: ListTile(
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                                leading: Container(
                                  padding: const EdgeInsets.all(12),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF8B5CF6).withValues(alpha: 0.2),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: const Icon(Icons.share, color: Color(0xFF8B5CF6), size: 24),
                                ),
                                title: const Text(
                                  'Partager le lien',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 16,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                subtitle: const Text(
                                  'Envoyer par WhatsApp, Email, etc.',
                                  style: TextStyle(
                                    color: Color(0xFF9CA3AF),
                                    fontSize: 13,
                                  ),
                                ),
                                onTap: () async {
                                  Navigator.pop(bottomSheetContext);
                                  try {
                                    if (!context.mounted) return;
                                    showDialog(
                                      context: context,
                                      barrierDismissible: false,
                                      builder: (context) => const Center(child: CircularProgressIndicator()),
                                    );

                                    final supabase = Supabase.instance.client;
                                    final userId = supabase.auth.currentUser?.id;
                                    if (userId == null) throw Exception('Non connecté');

                                    final result = await supabase.rpc(
                                      'create_or_get_inspection_share',
                                      params: {
                                        'p_mission_id': mission.id,
                                        'p_report_type': 'complete',
                                        'p_user_id': userId,
                                      },
                                    );

                                    if (!context.mounted) return;
                                    Navigator.pop(context);

                                    if (result != null && result is List && result.isNotEmpty) {
                                      final token = result[0]['share_token'] as String;
                                      final reportUrl = 'https://www.checksfleet.com/rapport-inspection/$token';
                                      final vehicleInfo = mission.vehicleType ?? 'Véhicule';
                                      await SharePlus.instance.share(ShareParams(text: '✅ Rapport complet - $vehicleInfo\n$reportUrl'));
                                      
                                      if (!context.mounted) return;
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        const SnackBar(
                                          content: Row(
                                            children: [
                                              Icon(Icons.check_circle, color: Colors.white),
                                              SizedBox(width: 12),
                                              Text('Lien partagé'),
                                            ],
                                          ),
                                          backgroundColor: Color(0xFF14B8A6),
                                          behavior: SnackBarBehavior.floating,
                                        ),
                                      );
                                    }
                                  } catch (e) {
                                    if (!context.mounted) return;
                                    Navigator.pop(context);
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(content: Text(ErrorHelper.cleanError(e)), backgroundColor: const Color(0xFFEF4444)),
                                    );
                                  }
                                },
                              ),
                              ),
                              
                              const SizedBox(height: 20),
                            ],
                          ),
                        ),
                      );
                    },
                    icon: const Icon(Icons.description, size: 20),
                    label: const Text('📊 Rapport complet'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF14B8A6),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      elevation: 2,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                ),
                
                const SizedBox(height: 8),
              ],
            ],
          ),
        ),
      ),
      ),
    );
  }
}

// Helper widget for info chips
class _InfoChip extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;

  const _InfoChip({
    required this.icon,
    required this.label,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: color.withValues(alpha: 0.3),
          width: 1,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: color),
          const SizedBox(width: 6),
          Flexible(
            child: Text(
              label,
              style: PremiumTheme.bodySmall.copyWith(
                color: color,
                fontWeight: FontWeight.w600,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }
}

