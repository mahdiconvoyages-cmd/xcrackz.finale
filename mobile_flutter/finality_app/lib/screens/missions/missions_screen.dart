import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart' as url_launcher;
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:share_plus/share_plus.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'dart:io';
import 'package:path_provider/path_provider.dart';
import '../../l10n/app_localizations.dart';
import '../../main.dart';
import '../../models/mission.dart';
import '../../models/invoice.dart';
import '../../models/company_info.dart';
import '../../services/mission_service.dart';
import '../../services/gps_tracking_service.dart';
import 'package:intl/intl.dart';
import '../../utils/error_helper.dart';
import 'mission_create_screen_new.dart';
import '../../widgets/app_drawer.dart';
import '../inspections/inspection_departure_screen.dart';
import '../inspections/inspection_arrival_screen.dart';
import '../invoices/invoice_form_screen.dart';
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

  // Helper methods for status
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
          style: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
            fontSize: 22,
            letterSpacing: 0.5,
            shadows: [
              Shadow(
                color: Colors.black26,
                offset: Offset(0, 2),
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
          // Join Mission Code Card - Modern Design
          Container(
            margin: const EdgeInsets.fromLTRB(16, 16, 16, 12),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  PremiumTheme.primaryTeal.withValues(alpha: 0.08),
                  PremiumTheme.primaryBlue.withValues(alpha: 0.08),
                  PremiumTheme.primaryIndigo.withValues(alpha: 0.05),
                ],
              ),
              borderRadius: BorderRadius.circular(PremiumTheme.radiusLG),
              border: Border.all(
                color: PremiumTheme.primaryTeal.withValues(alpha: 0.2),
                width: 1.5,
              ),
              boxShadow: [
                BoxShadow(
                  color: PremiumTheme.primaryTeal.withValues(alpha: 0.1),
                  blurRadius: 16,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        gradient: PremiumTheme.tealGradient,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Icon(
                        Icons.group_add_rounded,
                        color: Colors.white,
                        size: 20,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Rejoindre un convoyage',
                            style: TextStyle(
                              color: PremiumTheme.primaryTeal,
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 0.3,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'Entrez le code pour rejoindre une mission',
                            style: TextStyle(
                              color: PremiumTheme.textSecondary,
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                Row(
                  children: [
                    Expanded(
                      child: Container(
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(PremiumTheme.radiusMD),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.05),
                              blurRadius: 4,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: TextField(
                          controller: _joinCodeController,
                          style: TextStyle(
                            color: PremiumTheme.textPrimary,
                            fontWeight: FontWeight.w500,
                            fontSize: 15,
                          ),
                          decoration: InputDecoration(
                            hintText: 'Code de mission (ex: ABC123)',
                            hintStyle: TextStyle(
                              color: PremiumTheme.textSecondary.withValues(alpha: 0.6),
                              fontSize: 14,
                            ),
                            prefixIcon: Icon(
                              Icons.qr_code_rounded,
                              color: PremiumTheme.primaryTeal,
                              size: 22,
                            ),
                            border: InputBorder.none,
                            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Container(
                      decoration: BoxDecoration(
                        gradient: PremiumTheme.tealGradient,
                        borderRadius: BorderRadius.circular(PremiumTheme.radiusMD),
                        boxShadow: [
                          BoxShadow(
                            color: PremiumTheme.primaryTeal.withValues(alpha: 0.4),
                            blurRadius: 8,
                            offset: const Offset(0, 3),
                          ),
                        ],
                      ),
                      child: Material(
                        color: Colors.transparent,
                        child: InkWell(
                          onTap: _joinMissionByCode,
                          borderRadius: BorderRadius.circular(PremiumTheme.radiusMD),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(Icons.login_rounded, size: 18, color: Colors.white),
                                const SizedBox(width: 8),
                                Text(
                                  l10n.join,
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 15,
                                    letterSpacing: 0.5,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
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
    final progressValue = mission.status == 'completed' ? 1.0 : mission.status == 'in_progress' ? 0.5 : 0.0;

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.95),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: const Color(0xFFE2E8F0),
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.08),
            blurRadius: 20,
            offset: const Offset(0, 4),
            spreadRadius: 0,
          ),
          BoxShadow(
            color: statusColor.withValues(alpha: 0.1),
            blurRadius: 30,
            offset: const Offset(0, 10),
            spreadRadius: -5,
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: () {
              // TODO: Navigate to mission details
            },
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header avec image et infos
                Padding(
                  padding: const EdgeInsets.all(20),
                  child: Row(
                    children: [
                      // Image du véhicule
                      Container(
                        width: 70,
                        height: 70,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: statusColor.withValues(alpha: 0.3),
                            width: 2,
                          ),
                          gradient: LinearGradient(
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                            colors: [
                              statusColor.withValues(alpha: 0.1),
                              statusColor.withValues(alpha: 0.05),
                            ],
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: statusColor.withValues(alpha: 0.2),
                              blurRadius: 8,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(14),
                          child: Icon(
                            Icons.directions_car,
                            size: 36,
                            color: statusColor,
                          ),
                        ),
                      ),
                      const SizedBox(width: 16),
                      // Infos principales
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    mission.reference ?? 'Mission',
                                    style: const TextStyle(
                                      fontSize: 18,
                                      fontWeight: FontWeight.bold,
                                      color: Color(0xFF0F172A),
                                      height: 1.2,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 6),
                            if (mission.vehicleBrand != null || mission.vehicleModel != null)
                              Text(
                                '${mission.vehicleBrand ?? ''} ${mission.vehicleModel ?? ''}'.trim(),
                                style: TextStyle(
                                  fontSize: 14,
                                  color: Colors.grey[600],
                                  fontWeight: FontWeight.w500,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            if (mission.vehiclePlate != null) ...[
                              const SizedBox(height: 4),
                              Row(
                                children: [
                                  Icon(
                                    Icons.confirmation_number_outlined,
                                    size: 14,
                                    color: Colors.grey[400],
                                  ),
                                  const SizedBox(width: 4),
                                  Text(
                                    mission.vehiclePlate!,
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: Colors.grey[500],
                                      letterSpacing: 0.5,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ],
                        ),
                      ),
                      // Badge de statut
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: statusColor.withValues(alpha: 0.15),
                          border: Border.all(
                            color: statusColor.withValues(alpha: 0.3),
                            width: 1,
                          ),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          _getStatusText(mission.status),
                          style: TextStyle(
                            color: statusColor,
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 0.3,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                
                // Barre de progression
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Progression',
                            style: TextStyle(
                              fontSize: 11,
                              color: Colors.grey[600],
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          Text(
                            '${(progressValue * 100).toInt()}%',
                            style: TextStyle(
                              fontSize: 11,
                              color: Colors.grey[700],
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(10),
                        child: Container(
                          height: 8,
                          decoration: BoxDecoration(
                            color: const Color(0xFFF1F5F9),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: FractionallySizedBox(
                            alignment: Alignment.centerLeft,
                            widthFactor: progressValue,
                            child: Container(
                              decoration: BoxDecoration(
                                gradient: LinearGradient(
                                  colors: [
                                    statusColor,
                                    statusColor.withValues(alpha: 0.7),
                                  ],
                                ),
                                borderRadius: BorderRadius.circular(10),
                                boxShadow: [
                                  BoxShadow(
                                    color: statusColor.withValues(alpha: 0.4),
                                    blurRadius: 4,
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                
                const SizedBox(height: 16),
                
                // Détails de la mission
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: Column(
                    children: [
                      // Départ
                      _LocationRow(
                        icon: Icons.trip_origin,
                        iconColor: const Color(0xFF10B981),
                        label: mission.pickupAddress ?? 'Adresse de départ',
                      ),
                      const SizedBox(height: 12),
                      // Arrivée
                      _LocationRow(
                        icon: Icons.place,
                        iconColor: const Color(0xFFEF4444),
                        label: mission.deliveryAddress ?? 'Adresse de livraison',
                      ),
                      const SizedBox(height: 16),
                      // Date et Prix
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          if (mission.pickupDate != null)
                            Row(
                              children: [
                                Icon(
                                  Icons.calendar_today,
                                  size: 16,
                                  color: Colors.grey[600],
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  dateFormat.format(mission.pickupDate!),
                                  style: TextStyle(
                                    fontSize: 13,
                                    color: Colors.grey[700],
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                              ],
                            ),
                          if (mission.price != null && mission.price! > 0)
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                              decoration: BoxDecoration(
                                gradient: const LinearGradient(
                                  colors: [
                                    Color(0xFF14B8A6),
                                    Color(0xFF06B6D4),
                                  ],
                                ),
                                borderRadius: BorderRadius.circular(10),
                                boxShadow: [
                                  BoxShadow(
                                    color: const Color(0xFF14B8A6).withValues(alpha: 0.3),
                                    blurRadius: 8,
                                    offset: const Offset(0, 2),
                                  ),
                                ],
                              ),
                              child: Text(
                                '${mission.price!.toStringAsFixed(0)}€',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                  letterSpacing: 0.5,
                                ),
                              ),
                            ),
                        ],
                      ),
                      // Client et Mandataire
                      if (mission.clientName != null || mission.agentName != null) ...[
                        const SizedBox(height: 12),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            if (mission.clientName != null)
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                decoration: BoxDecoration(
                                  gradient: LinearGradient(
                                    colors: [
                                      const Color(0xFF8B5CF6).withValues(alpha: 0.1),
                                      const Color(0xFF7C3AED).withValues(alpha: 0.1),
                                    ],
                                  ),
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(
                                    color: const Color(0xFF8B5CF6).withValues(alpha: 0.3),
                                  ),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    const Icon(
                                      Icons.person_outline,
                                      size: 14,
                                      color: Color(0xFF8B5CF6),
                                    ),
                                    const SizedBox(width: 6),
                                    Text(
                                      mission.clientName!,
                                      style: const TextStyle(
                                        fontSize: 12,
                                        color: Color(0xFF8B5CF6),
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            if (mission.agentName != null)
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                decoration: BoxDecoration(
                                  gradient: LinearGradient(
                                    colors: [
                                      const Color(0xFF6366F1).withValues(alpha: 0.1),
                                      const Color(0xFF4F46E5).withValues(alpha: 0.1),
                                    ],
                                  ),
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(
                                    color: const Color(0xFF6366F1).withValues(alpha: 0.3),
                                  ),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    const Icon(
                                      Icons.badge_outlined,
                                      size: 14,
                                      color: Color(0xFF6366F1),
                                    ),
                                    const SizedBox(width: 6),
                                    Text(
                                      'Mandataire: ${mission.agentName}',
                                      style: const TextStyle(
                                        fontSize: 12,
                                        color: Color(0xFF6366F1),
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
                
                // Actions principales
                const SizedBox(height: 20),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: Row(
                    children: [
                      // Bouton principal selon statut
                      if (mission.status == 'pending') ...[
                        Expanded(
                          child: _GradientButton(
                            onPressed: () async {
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
                            gradient: const LinearGradient(
                              colors: [Color(0xFF14B8A6), Color(0xFF06B6D4)],
                            ),
                            icon: Icons.play_arrow,
                            label: 'Démarrer Inspection',
                          ),
                        ),
                      ] else if (mission.status == 'in_progress') ...[
                        Expanded(
                          child: _GradientButton(
                            onPressed: () async {
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
                            },
                            gradient: const LinearGradient(
                              colors: [Color(0xFF3B82F6), Color(0xFF06B6D4)],
                            ),
                            icon: Icons.trending_up,
                            label: 'Continuer Inspection',
                          ),
                        ),
                      ] else if (mission.status == 'completed') ...[
                        Expanded(
                          child: _GradientButton(
                            onPressed: () async {
                              await _viewMissionReport(context, mission);
                            },
                            gradient: const LinearGradient(
                              colors: [Color(0xFF10B981), Color(0xFF059669)],
                            ),
                            icon: Icons.description,
                            label: 'Voir Rapport',
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _GradientButton(
                            onPressed: () {
                              _createInvoiceFromMission(context, mission);
                            },
                            gradient: const LinearGradient(
                              colors: [Color(0xFFF59E0B), Color(0xFFEF4444)],
                            ),
                            icon: Icons.receipt_long,
                            label: 'Créer Facture',
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                
                const SizedBox(height: 16),
                
                // Boutons secondaires
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: Row(
                    children: [
                      Expanded(
                        child: _SecondaryButton(
                          onPressed: () {
                            _showMissionDetails(context, mission);
                          },
                          icon: Icons.visibility,
                          label: 'Détails',
                          color: const Color(0xFF3B82F6),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _SecondaryButton(
                          onPressed: () async {
                            await _downloadMissionPDF(context, mission);
                          },
                          icon: Icons.picture_as_pdf,
                          label: 'PDF',
                          color: const Color(0xFFA855F7),
                        ),
                      ),
                    ],
                  ),
                ),
                
                const SizedBox(height: 20),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// Widget pour afficher une ligne de localisation
class _LocationRow extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String label;

  const _LocationRow({
    required this.icon,
    required this.iconColor,
    required this.label,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(
          icon,
          size: 18,
          color: iconColor,
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            label,
            style: TextStyle(
              fontSize: 13,
              color: Colors.grey[700],
              fontWeight: FontWeight.w500,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }
}

// Widget bouton avec gradient
class _GradientButton extends StatelessWidget {
  final VoidCallback onPressed;
  final Gradient gradient;
  final IconData icon;
  final String label;

  const _GradientButton({
    required this.onPressed,
    required this.gradient,
    required this.icon,
    required this.label,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 48,
      decoration: BoxDecoration(
        gradient: gradient,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.15),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onPressed,
          borderRadius: BorderRadius.circular(12),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, color: Colors.white, size: 20),
              const SizedBox(width: 8),
              Text(
                label,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 0.3,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// Widget bouton secondaire
class _SecondaryButton extends StatelessWidget {
  final VoidCallback onPressed;
  final IconData icon;
  final String label;
  final Color color;

  const _SecondaryButton({
    required this.onPressed,
    required this.icon,
    required this.label,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 44,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            color,
            color.withValues(alpha: 0.8),
          ],
        ),
        borderRadius: BorderRadius.circular(10),
        boxShadow: [
          BoxShadow(
            color: color.withValues(alpha: 0.25),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onPressed,
          borderRadius: BorderRadius.circular(10),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, color: Colors.white, size: 18),
              const SizedBox(width: 6),
              Text(
                label,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// Helper method pour créer une facture à partir d'une mission
void _createInvoiceFromMission(BuildContext context, Mission mission) {
  // Rediriger vers le formulaire de facture vide du CRM
  // Les données de la mission peuvent être ajoutées manuellement
  Navigator.push(
    context,
    MaterialPageRoute(
      builder: (context) => const InvoiceFormScreen(),
    ),
  );
}

/// Voir le rapport d'inspection de la mission
Future<void> _viewMissionReport(BuildContext context, Mission mission) async {
  try {
    // Récupérer l'inspection liée à la mission
    final response = await supabase
        .from('vehicle_inspections')
        .select('id, share_token')
        .eq('mission_id', mission.id)
        .maybeSingle();

    if (response == null) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Aucun rapport d\'inspection trouvé pour cette mission'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    String? shareToken = response['share_token'];

    // Si pas de token de partage, en créer un
    if (shareToken == null || shareToken.isEmpty) {
      final inspectionId = response['id'];
      shareToken = DateTime.now().millisecondsSinceEpoch.toString();
      
      await supabase
          .from('vehicle_inspections')
          .update({'share_token': shareToken})
          .eq('id', inspectionId);
    }

    // Ouvrir l'URL du rapport
    final url = 'https://www.checksfleet.com/rapport-inspection/$shareToken';
    final uri = Uri.parse(url);
    
    if (await url_launcher.canLaunchUrl(uri)) {
      await url_launcher.launchUrl(uri, mode: url_launcher.LaunchMode.externalApplication);
    } else {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Impossible d\'ouvrir le rapport'),
          backgroundColor: Colors.red,
        ),
      );
    }
  } catch (e) {
    if (!context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Erreur: ${ErrorHelper.cleanError(e)}'),
        backgroundColor: Colors.red,
      ),
    );
  }
}

/// Afficher les détails complets de la mission
void _showMissionDetails(BuildContext context, Mission mission) {
  showDialog(
    context: context,
    builder: (context) => Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: Container(
        constraints: const BoxConstraints(maxWidth: 600, maxHeight: 700),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // En-tête
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    _MissionsScreenState._getStatusColor(mission.status),
                    _MissionsScreenState._getStatusColor(mission.status).withValues(alpha: 0.7),
                  ],
                ),
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(20),
                  topRight: Radius.circular(20),
                ),
              ),
              child: Row(
                children: [
                  const Icon(Icons.info_outline, color: Colors.white, size: 28),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'Détails de la mission',
                      style: PremiumTheme.heading3.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(Icons.close, color: Colors.white),
                  ),
                ],
              ),
            ),
            // Contenu
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Référence
                    if (mission.reference != null) ...[
                      _DetailRow(
                        icon: Icons.tag,
                        label: 'Référence',
                        value: mission.reference!,
                        color: const Color(0xFF3B82F6),
                      ),
                      const SizedBox(height: 16),
                    ],
                    // Client
                    _DetailRow(
                      icon: Icons.person,
                      label: 'Client',
                      value: mission.clientName ?? 'Non spécifié',
                      color: const Color(0xFF8B5CF6),
                    ),
                    const SizedBox(height: 16),
                    // Mandataire
                    if (mission.agentName != null && mission.agentName!.isNotEmpty) ...[
                      _DetailRow(
                        icon: Icons.badge,
                        label: 'Mandataire',
                        value: mission.agentName!,
                        color: const Color(0xFF6366F1),
                      ),
                      const SizedBox(height: 16),
                    ],
                    // Véhicule
                    _DetailRow(
                      icon: Icons.directions_car,
                      label: 'Véhicule',
                      value: '${mission.vehicleBrand ?? ''} ${mission.vehicleModel ?? ''}\n${mission.vehiclePlate ?? 'Immat. N/A'}',
                      color: const Color(0xFF14B8A6),
                    ),
                    const SizedBox(height: 16),
                    // Adresse de départ
                    _DetailRow(
                      icon: Icons.location_on,
                      label: 'Départ',
                      value: mission.pickupAddress ?? 'Non spécifié',
                      color: const Color(0xFF10B981),
                    ),
                    const SizedBox(height: 16),
                    // Adresse d'arrivée
                    _DetailRow(
                      icon: Icons.flag,
                      label: 'Arrivée',
                      value: mission.deliveryAddress ?? 'Non spécifié',
                      color: const Color(0xFFEF4444),
                    ),
                    const SizedBox(height: 16),
                    // Date de départ
                    if (mission.pickupDate != null) ...[
                      _DetailRow(
                        icon: Icons.calendar_today,
                        label: 'Date de départ',
                        value: DateFormat('dd/MM/yyyy à HH:mm').format(mission.pickupDate!),
                        color: const Color(0xFFF59E0B),
                      ),
                      const SizedBox(height: 16),
                    ],
                    // Date de livraison
                    if (mission.deliveryDate != null) ...[
                      _DetailRow(
                        icon: Icons.event_available,
                        label: 'Date de livraison',
                        value: DateFormat('dd/MM/yyyy à HH:mm').format(mission.deliveryDate!),
                        color: const Color(0xFF06B6D4),
                      ),
                      const SizedBox(height: 16),
                    ],
                    // Prix
                    _DetailRow(
                      icon: Icons.euro,
                      label: 'Prix',
                      value: '${mission.price?.toStringAsFixed(2) ?? '0.00'} €',
                      color: const Color(0xFF10B981),
                    ),
                    const SizedBox(height: 16),
                    // Statut
                    _DetailRow(
                      icon: Icons.flag_circle,
                      label: 'Statut',
                      value: _MissionsScreenState._getStatusText(mission.status),
                      color: _MissionsScreenState._getStatusColor(mission.status),
                    ),
                    // Notes
                    if (mission.notes != null && mission.notes!.isNotEmpty) ...[
                      const SizedBox(height: 20),
                      const Divider(),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          const Icon(Icons.note, color: Color(0xFF64748B), size: 20),
                          const SizedBox(width: 8),
                          Text(
                            'Notes',
                            style: PremiumTheme.heading4.copyWith(
                              fontWeight: FontWeight.bold,
                              color: const Color(0xFF1E293B),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          mission.notes!,
                          style: PremiumTheme.body.copyWith(
                            color: const Color(0xFF475569),
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

/// Télécharger le PDF de la mission
Future<void> _downloadMissionPDF(BuildContext context, Mission mission) async {
  try {
    // Afficher un indicateur de chargement
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(
        child: Card(
          child: Padding(
            padding: EdgeInsets.all(20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                CircularProgressIndicator(),
                SizedBox(height: 16),
                Text('Génération du PDF...'),
              ],
            ),
          ),
        ),
      ),
    );

    // Générer le PDF
    final pdf = await _generateMissionPDF(mission);

    // Fermer le dialogue de chargement
    if (!context.mounted) return;
    Navigator.pop(context);

    // Sauvegarder et partager le PDF
    await Printing.sharePdf(
      bytes: await pdf.save(),
      filename: 'mission_${mission.reference ?? mission.id}.pdf',
    );
  } catch (e) {
    // Fermer le dialogue de chargement
    if (!context.mounted) return;
    Navigator.pop(context);
    
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Erreur lors de la génération du PDF: ${ErrorHelper.cleanError(e)}'),
        backgroundColor: Colors.red,
      ),
    );
  }
}

/// Générer le document PDF de la mission
Future<pw.Document> _generateMissionPDF(Mission mission) async {
  final pdf = pw.Document();
  final company = CompanyInfo.defaultChecksFleet();

  pdf.addPage(
    pw.Page(
      pageFormat: PdfPageFormat.a4,
      margin: const pw.EdgeInsets.all(40),
      build: (context) {
        return pw.Column(
          crossAxisAlignment: pw.CrossAxisAlignment.start,
          children: [
            // ============================================
            // EN-TÊTE PROFESSIONNEL
            // ============================================
            pw.Row(
              mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
              crossAxisAlignment: pw.CrossAxisAlignment.start,
              children: [
                // Logo et informations entreprise
                pw.Expanded(
                  child: pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Container(
                        padding: const pw.EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        decoration: pw.BoxDecoration(
                          gradient: const pw.LinearGradient(
                            colors: [PdfColor.fromInt(0xFF14B8A6), PdfColor.fromInt(0xFF0D9488)],
                          ),
                          borderRadius: pw.BorderRadius.circular(8),
                        ),
                        child: pw.Text(
                          company.companyName.toUpperCase(),
                          style: pw.TextStyle(
                            fontSize: 20,
                            fontWeight: pw.FontWeight.bold,
                            color: PdfColors.white,
                          ),
                        ),
                      ),
                      pw.SizedBox(height: 8),
                      pw.Text(
                        'Inspections Véhicules Pro',
                        style: pw.TextStyle(
                          fontSize: 10,
                          color: PdfColor.fromHex('#6B7280'),
                        ),
                      ),
                      pw.SizedBox(height: 8),
                      pw.Text(
                        company.email,
                        style: const pw.TextStyle(fontSize: 9),
                      ),
                      pw.Text(
                        company.phone,
                        style: const pw.TextStyle(fontSize: 9),
                      ),
                    ],
                  ),
                ),
                
                pw.SizedBox(width: 40),
                
                // Type de document
                pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.end,
                  children: [
                    pw.Container(
                      padding: const pw.EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      decoration: pw.BoxDecoration(
                        color: PdfColor.fromHex('#14B8A6'),
                        borderRadius: pw.BorderRadius.circular(8),
                      ),
                      child: pw.Text(
                        'BON DE MISSION',
                        style: pw.TextStyle(
                          fontSize: 18,
                          fontWeight: pw.FontWeight.bold,
                          color: PdfColors.white,
                        ),
                      ),
                    ),
                    if (mission.reference != null) ...[
                      pw.SizedBox(height: 12),
                      pw.Text(
                        'Réf: ${mission.reference}',
                        style: pw.TextStyle(
                          fontSize: 12,
                          fontWeight: pw.FontWeight.bold,
                        ),
                      ),
                    ],
                    pw.SizedBox(height: 8),
                    pw.Container(
                      padding: const pw.EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                      decoration: pw.BoxDecoration(
                        color: _getStatusPdfColor(mission.status),
                        borderRadius: pw.BorderRadius.circular(4),
                      ),
                      child: pw.Text(
                        _MissionsScreenState._getStatusText(mission.status),
                        style: pw.TextStyle(
                          fontSize: 10,
                          fontWeight: pw.FontWeight.bold,
                          color: PdfColors.white,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
            
            pw.SizedBox(height: 25),
            pw.Divider(thickness: 2, color: PdfColor.fromHex('#E5E7EB')),
            pw.SizedBox(height: 20),

            // ============================================
            // INFORMATIONS CLIENT
            // ============================================
            pw.Container(
              padding: const pw.EdgeInsets.all(16),
              decoration: pw.BoxDecoration(
                color: PdfColor.fromHex('#F9FAFB'),
                border: pw.Border.all(color: PdfColor.fromHex('#E5E7EB')),
                borderRadius: pw.BorderRadius.circular(8),
              ),
              child: pw.Column(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  pw.Text(
                    'CLIENT',
                    style: pw.TextStyle(
                      fontSize: 10,
                      fontWeight: pw.FontWeight.bold,
                      color: PdfColor.fromHex('#6B7280'),
                    ),
                  ),
                  pw.SizedBox(height: 8),
                  pw.Text(
                    mission.clientName ?? 'Non spécifié',
                    style: pw.TextStyle(
                      fontSize: 12,
                      fontWeight: pw.FontWeight.bold,
                    ),
                  ),
                  if (mission.clientEmail != null) ...[
                    pw.SizedBox(height: 4),
                    pw.Text(
                      'Email: ${mission.clientEmail}',
                      style: const pw.TextStyle(fontSize: 9),
                    ),
                  ],
                  if (mission.clientPhone != null) ...[
                    pw.SizedBox(height: 4),
                    pw.Text(
                      'Téléphone: ${mission.clientPhone}',
                      style: const pw.TextStyle(fontSize: 9),
                    ),
                  ],
                  if (mission.agentName != null && mission.agentName!.isNotEmpty) ...[
                    pw.SizedBox(height: 8),
                    pw.Text(
                      'Mandataire: ${mission.agentName}',
                      style: pw.TextStyle(
                        fontSize: 10,
                        fontWeight: pw.FontWeight.bold,
                        color: PdfColor.fromHex('#6366F1'),
                      ),
                    ),
                  ],
                ],
              ),
            ),

            pw.SizedBox(height: 20),

            // ============================================
            // INFORMATIONS VÉHICULE
            // ============================================
            pw.Text(
              'VÉHICULE',
              style: pw.TextStyle(
                fontSize: 16,
                fontWeight: pw.FontWeight.bold,
                color: PdfColor.fromHex('#1E293B'),
              ),
            ),
            pw.SizedBox(height: 12),
            pw.Container(
              padding: const pw.EdgeInsets.all(12),
              decoration: pw.BoxDecoration(
                border: pw.Border.all(color: PdfColor.fromHex('#E2E8F0')),
                borderRadius: pw.BorderRadius.circular(8),
              ),
              child: pw.Column(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  pw.Text('Marque: ${mission.vehicleBrand ?? 'N/A'}'),
                  pw.Text('Modèle: ${mission.vehicleModel ?? 'N/A'}'),
                  pw.Text('Immatriculation: ${mission.vehiclePlate ?? 'N/A'}'),
                  if (mission.vehicleVin != null)
                    pw.Text('VIN: ${mission.vehicleVin}'),
                ],
              ),
            ),
            pw.SizedBox(height: 20),

            // Itinéraire
            pw.Text(
              'ITINÉRAIRE',
              style: pw.TextStyle(
                fontSize: 16,
                fontWeight: pw.FontWeight.bold,
              ),
            ),
            pw.SizedBox(height: 12),
            pw.Container(
              padding: const pw.EdgeInsets.all(12),
              decoration: pw.BoxDecoration(
                border: pw.Border.all(color: PdfColor.fromHex('#E2E8F0')),
                borderRadius: pw.BorderRadius.circular(8),
              ),
              child: pw.Column(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  pw.Row(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text('🟢 ', style: pw.TextStyle(fontSize: 12)),
                      pw.Expanded(
                        child: pw.Text('Départ: ${mission.pickupAddress ?? 'Non spécifié'}'),
                      ),
                    ],
                  ),
                  if (mission.pickupDate != null) ...[
                    pw.SizedBox(height: 4),
                    pw.Text(
                      '   Date: ${DateFormat('dd/MM/yyyy à HH:mm').format(mission.pickupDate!)}',
                      style: pw.TextStyle(fontSize: 10, color: PdfColor.fromHex('#64748B')),
                    ),
                  ],
                  pw.SizedBox(height: 12),
                  pw.Row(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text('🔴 ', style: pw.TextStyle(fontSize: 12)),
                      pw.Expanded(
                        child: pw.Text('Arrivée: ${mission.deliveryAddress ?? 'Non spécifié'}'),
                      ),
                    ],
                  ),
                  if (mission.deliveryDate != null) ...[
                    pw.SizedBox(height: 4),
                    pw.Text(
                      '   Date: ${DateFormat('dd/MM/yyyy à HH:mm').format(mission.deliveryDate!)}',
                      style: pw.TextStyle(fontSize: 10, color: PdfColor.fromHex('#64748B')),
                    ),
                  ],
                ],
              ),
            ),
            pw.SizedBox(height: 20),

            // Prix et statut
            pw.Row(
              mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
              children: [
                pw.Expanded(
                  child: pw.Container(
                    padding: const pw.EdgeInsets.all(12),
                    decoration: pw.BoxDecoration(
                      color: PdfColor.fromHex('#ECFDF5'),
                      border: pw.Border.all(color: PdfColor.fromHex('#10B981')),
                      borderRadius: pw.BorderRadius.circular(8),
                    ),
                    child: pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.start,
                      children: [
                        pw.Text(
                          'Prix',
                          style: pw.TextStyle(
                            fontSize: 12,
                            color: PdfColor.fromHex('#064E3B'),
                          ),
                        ),
                        pw.SizedBox(height: 4),
                        pw.Text(
                          '${mission.price?.toStringAsFixed(2) ?? '0.00'} €',
                          style: pw.TextStyle(
                            fontSize: 18,
                            fontWeight: pw.FontWeight.bold,
                            color: PdfColor.fromHex('#10B981'),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                pw.SizedBox(width: 12),
                pw.Expanded(
                  child: pw.Container(
                    padding: const pw.EdgeInsets.all(12),
                    decoration: pw.BoxDecoration(
                      color: PdfColor.fromHex('#EFF6FF'),
                      border: pw.Border.all(color: PdfColor.fromHex('#3B82F6')),
                      borderRadius: pw.BorderRadius.circular(8),
                    ),
                    child: pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.start,
                      children: [
                        pw.Text(
                          'Statut',
                          style: pw.TextStyle(
                            fontSize: 12,
                            color: PdfColor.fromHex('#1E3A8A'),
                          ),
                        ),
                        pw.SizedBox(height: 4),
                        pw.Text(
                          _MissionsScreenState._getStatusText(mission.status),
                          style: pw.TextStyle(
                            fontSize: 14,
                            fontWeight: pw.FontWeight.bold,
                            color: PdfColor.fromHex('#3B82F6'),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),

            // Notes
            if (mission.notes != null && mission.notes!.isNotEmpty) ...[
              pw.SizedBox(height: 20),
              pw.Text(
                'NOTES',
                style: pw.TextStyle(
                  fontSize: 16,
                  fontWeight: pw.FontWeight.bold,
                ),
              ),
              pw.SizedBox(height: 12),
              pw.Container(
                width: double.infinity,
                padding: const pw.EdgeInsets.all(12),
                decoration: pw.BoxDecoration(
                  color: PdfColor.fromHex('#F1F5F9'),
                  borderRadius: pw.BorderRadius.circular(8),
                ),
                child: pw.Text(mission.notes!),
              ),
            ],

            pw.Spacer(),

            // Pied de page
            pw.Divider(),
            pw.SizedBox(height: 8),
            pw.Text(
              'Document généré le ${DateFormat('dd/MM/yyyy à HH:mm').format(DateTime.now())}',
              style: pw.TextStyle(
                fontSize: 10,
                color: PdfColor.fromHex('#64748B'),
              ),
            ),
          ],
        );
      },
    ),
  );

  return pdf;
}

/// Helper: Couleur du statut pour PDF
PdfColor _getStatusPdfColor(String status) {
  switch (status) {
    case 'pending':
      return PdfColor.fromHex('#F59E0B');
    case 'in_progress':
      return PdfColor.fromHex('#3B82F6');
    case 'completed':
      return PdfColor.fromHex('#10B981');
    default:
      return PdfColor.fromHex('#6B7280');
  }
}

// Helper widget for mission details dialog
class _DetailRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color color;

  const _DetailRow({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(icon, color: color, size: 20),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: PremiumTheme.bodySmall.copyWith(
                  color: const Color(0xFF64748B),
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                value,
                style: PremiumTheme.body.copyWith(
                  color: const Color(0xFF1E293B),
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ],
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

