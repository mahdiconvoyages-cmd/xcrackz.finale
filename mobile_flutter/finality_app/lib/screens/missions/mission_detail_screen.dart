import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../utils/error_helper.dart';
import '../../models/mission.dart';
import '../../services/mission_service.dart';
import '../../services/background_tracking_service.dart';
import '../invoices/invoice_form_screen.dart';
import '../inspections/inspection_departure_screen.dart';
import '../inspections/inspection_arrival_screen.dart';
import '../../theme/premium_theme.dart';
import 'package:intl/intl.dart';
import 'mission_create_screen_new.dart';
import '../planning/retour_lift_screen.dart';

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
  String? _publicTrackingLink;
  bool _isCreator = false;
  bool _hasDepartureInspection = false;
  bool _hasArrivalInspection = false;
  bool _hasRestitutionDepartureInspection = false;
  bool _hasRestitutionArrivalInspection = false;
  String? _assignedDriverName;

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
      if (!mounted) return;

      final currentUserId = Supabase.instance.client.auth.currentUser?.id;

      // Verifier si les inspections existent (en parallele)
      final inspectionFutures = await Future.wait([
        Supabase.instance.client
            .from('vehicle_inspections')
            .select('id')
            .eq('mission_id', widget.missionId)
            .eq('inspection_type', 'departure')
            .maybeSingle(),
        Supabase.instance.client
            .from('vehicle_inspections')
            .select('id')
            .eq('mission_id', widget.missionId)
            .eq('inspection_type', 'arrival')
            .maybeSingle(),
        Supabase.instance.client
            .from('vehicle_inspections')
            .select('id')
            .eq('mission_id', widget.missionId)
            .eq('inspection_type', 'restitution_departure')
            .maybeSingle(),
        Supabase.instance.client
            .from('vehicle_inspections')
            .select('id')
            .eq('mission_id', widget.missionId)
            .eq('inspection_type', 'restitution_arrival')
            .maybeSingle(),
      ]);
      final depInsp = inspectionFutures[0];
      final arrInsp = inspectionFutures[1];
      final restDepInsp = inspectionFutures[2];
      final restArrInsp = inspectionFutures[3];

      // Recuperer le nom du chauffeur assigne
      String? driverName;
      if (mission.assignedToUserId != null) {
        try {
          final profile = await Supabase.instance.client
              .from('profiles')
              .select('full_name, email')
              .eq('id', mission.assignedToUserId!)
              .maybeSingle();
          if (profile != null) {
            driverName = profile['full_name'] as String? ?? profile['email'] as String? ?? 'Chauffeur';
          }
        } catch (_) {}
      }

      if (!mounted) return;
      setState(() {
        _mission = mission;
        _isLoading = false;
        _isCreator = currentUserId != null && mission.userId == currentUserId;
        _hasDepartureInspection = depInsp != null;
        _hasArrivalInspection = arrInsp != null;
        _hasRestitutionDepartureInspection = restDepInsp != null;
        _hasRestitutionArrivalInspection = restArrInsp != null;
        _assignedDriverName = driverName;
      });

      // AUTO-START: Demarrer le tracking automatiquement si mission en cours
      if (mission.status == 'in_progress' && !_trackingService.isTracking) {
        final started = await _trackingService.startTracking(mission.id, autoStart: true);
        if (started && mounted) {
          setState(() => _isTrackingActive = true);
          _generatePublicLink();
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Row(
                  children: [
                    Icon(Icons.gps_fixed, color: Colors.white, size: 20),
                    SizedBox(width: 8),
                    Text('Tracking GPS active automatiquement'),
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
      if (!mounted) return;
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
        backgroundColor: PremiumTheme.lightBg,
        body: const Center(child: CircularProgressIndicator(color: PremiumTheme.primaryBlue)),
      );
    }

    if (_mission == null) {
      return Scaffold(
        backgroundColor: PremiumTheme.lightBg,
        appBar: AppBar(
          backgroundColor: PremiumTheme.cardBg,
          title: const Text('Mission', style: TextStyle(color: PremiumTheme.textPrimary)),
          iconTheme: const IconThemeData(color: PremiumTheme.textPrimary),
        ),
        body: const Center(child: Text('Mission introuvable', style: TextStyle(color: PremiumTheme.textSecondary))),
      );
    }

    return Scaffold(
      backgroundColor: PremiumTheme.lightBg,
      body: RefreshIndicator(
        onRefresh: _loadMission,
        child: CustomScrollView(
          slivers: [
            _buildSliverAppBar(),
            SliverPadding(
              padding: const EdgeInsets.all(16),
              sliver: SliverList(
                delegate: SliverChildListDelegate([
                  // Code de partage (createur uniquement)
                  if (_isCreator && _mission!.shareCode != null) ...[
                    _buildShareCodeCard(),
                    const SizedBox(height: 16),
                  ],
                  // Chauffeur assigne + changement
                  if (_mission!.assignedToUserId != null || _isCreator) ...[
                    _buildDriverCard(),
                    const SizedBox(height: 16),
                  ],
                  // Etat des inspections (visible quand en cours ou terminee)
                  if (_mission!.status == 'in_progress' || _mission!.status == 'completed') ...[
                    _buildInspectionStatusCard(),
                    const SizedBox(height: 16),
                  ],
                  // Mandataire
                  _buildMandataireCard(),
                  const SizedBox(height: 16),
                  // Vehicule
                  _buildVehicleCard(),
                  const SizedBox(height: 16),
                  // Itineraire
                  _buildItineraireCard(),
                  const SizedBox(height: 16),
                  // Restitution (vehicule retour + itineraire retour)
                  if (_mission!.hasRestitution) ...[
                    _buildRestitutionCard(),
                    const SizedBox(height: 16),
                  ],
                  // Prix
                  if (_mission!.price != null) ...[
                    _buildPriceCard(),
                    const SizedBox(height: 16),
                  ],
                  // Notes
                  if (_mission!.notes != null && _mission!.notes!.isNotEmpty) ...[
                    _buildNotesCard(),
                    const SizedBox(height: 16),
                  ],
                  // Tracking GPS
                  if (_mission!.status == 'in_progress') ...[
                    _buildTrackingCard(),
                    const SizedBox(height: 16),
                  ],
                  const SizedBox(height: 80),
                ]),
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: _buildBottomActions(),
    );
  }

  // ==============================================
  //  APP BAR
  // ==============================================
  SliverAppBar _buildSliverAppBar() {
    return SliverAppBar(
      backgroundColor: PremiumTheme.cardBg,
      pinned: true,
      expandedHeight: 120,
      iconTheme: const IconThemeData(color: PremiumTheme.textPrimary),
      actions: [
        if (_isCreator)
          PopupMenuButton(
            icon: const Icon(Icons.more_vert, color: PremiumTheme.textSecondary),
            color: PremiumTheme.cardBg,
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: 'edit',
                child: Row(
                  children: [
                    Icon(Icons.edit_rounded, color: PremiumTheme.primaryBlue),
                    SizedBox(width: 8),
                    Text('Modifier', style: TextStyle(color: PremiumTheme.primaryBlue)),
                  ],
                ),
              ),
              const PopupMenuItem(
                value: 'delete',
                child: Row(
                  children: [
                    Icon(Icons.delete, color: PremiumTheme.accentRed),
                    SizedBox(width: 8),
                    Text('Supprimer', style: TextStyle(color: PremiumTheme.accentRed)),
                  ],
                ),
              ),
            ],
            onSelected: (value) {
              if (value == 'delete') _confirmDelete();
              if (value == 'edit') _editMission();
            },
          ),
      ],
      flexibleSpace: FlexibleSpaceBar(
        background: Container(
          decoration: const BoxDecoration(
            gradient: PremiumTheme.primaryGradient,
          ),
          child: SafeArea(
            child: Padding(
              padding: const EdgeInsets.only(left: 56, right: 16, bottom: 12),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.end,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      _statusBadge(_mission!.status),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          _mission!.reference ?? '',
                          style: const TextStyle(
                            color: Colors.white70,
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${_mission!.vehicleBrand ?? ''} ${_mission!.vehicleModel ?? ''}'.trim(),
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _statusBadge(String status) {
    Color bgColor;
    String label;
    switch (status) {
      case 'pending':
        bgColor = PremiumTheme.accentAmber;
        label = 'En attente';
        break;
      case 'assigned':
        bgColor = PremiumTheme.primaryBlue;
        label = 'Assignee';
        break;
      case 'in_progress':
        bgColor = PremiumTheme.primaryPurple;
        label = 'En cours';
        break;
      case 'completed':
        bgColor = PremiumTheme.accentGreen;
        label = 'Terminee';
        break;
      default:
        bgColor = PremiumTheme.textSecondary;
        label = status;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        label,
        style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
      ),
    );
  }

  // ==============================================
  //  SHARE CODE CARD
  // ==============================================
  Widget _buildShareCodeCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF6366F1), Color(0xFF8B5CF6)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(color: const Color(0xFF6366F1).withOpacity(0.3), blurRadius: 12, offset: const Offset(0, 4)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.key, color: Colors.white, size: 22),
              SizedBox(width: 8),
              Text(
                'Code de mission',
                style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            _mission!.status == 'in_progress'
                ? 'Ce code reste actif. Un autre chauffeur peut prendre le relais.'
                : 'Partagez ce code pour permettre a un chauffeur de rejoindre la mission',
            style: const TextStyle(color: Colors.white70, fontSize: 13),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.white.withOpacity(0.3)),
                  ),
                  child: Text(
                    _mission!.shareCode!,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 2,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              IconButton(
                onPressed: () {
                  Clipboard.setData(ClipboardData(text: _mission!.shareCode!));
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Code copie dans le presse-papier'),
                        backgroundColor: PremiumTheme.accentGreen,
                        duration: Duration(seconds: 2),
                      ),
                    );
                  }
                },
                icon: const Icon(Icons.copy, color: Colors.white),
                style: IconButton.styleFrom(
                  backgroundColor: Colors.white.withOpacity(0.2),
                  padding: const EdgeInsets.all(14),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ==============================================
  //  DRIVER CARD
  // ==============================================
  Widget _buildDriverCard() {
    final hasDriver = _mission!.assignedToUserId != null;
    return _card(
      icon: Icons.person_pin,
      title: 'Chauffeur',
      color: PremiumTheme.primaryBlue,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (hasDriver) ...[
            Row(
              children: [
                Container(
                  width: 40, height: 40,
                  decoration: BoxDecoration(
                    color: PremiumTheme.primaryBlue.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: const Icon(Icons.person, color: PremiumTheme.primaryBlue, size: 22),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _assignedDriverName ?? 'Chauffeur assigne',
                        style: const TextStyle(color: PremiumTheme.textPrimary, fontSize: 16, fontWeight: FontWeight.w600),
                      ),
                      const Text('Chauffeur actuel', style: TextStyle(color: PremiumTheme.textTertiary, fontSize: 13)),
                    ],
                  ),
                ),
              ],
            ),
          ] else ...[
            const Text(
              'Aucun chauffeur assigne',
              style: TextStyle(color: PremiumTheme.textSecondary, fontSize: 15),
            ),
            const SizedBox(height: 4),
            const Text(
              'Partagez le code de mission pour qu\'un chauffeur rejoigne',
              style: TextStyle(color: PremiumTheme.textTertiary, fontSize: 13),
            ),
          ],
          // Bouton changer de chauffeur (createur uniquement, mission pas terminee)
          if (_isCreator && hasDriver && _mission!.status != 'completed') ...[
            const SizedBox(height: 14),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: _changeDriver,
                icon: const Icon(Icons.swap_horiz, size: 20),
                label: const Text('Changer de chauffeur'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: PremiumTheme.accentAmber,
                  side: BorderSide(color: PremiumTheme.accentAmber.withOpacity(0.5)),
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
            ),
            const SizedBox(height: 6),
            const Text(
              'Le code de mission restera actif pour le nouveau chauffeur.',
              style: TextStyle(color: PremiumTheme.textTertiary, fontSize: 12),
              textAlign: TextAlign.center,
            ),
          ],
        ],
      ),
    );
  }

  // ==============================================
  //  INSPECTION STATUS CARD
  // ==============================================
  Widget _buildInspectionStatusCard() {
    return _card(
      icon: Icons.checklist,
      title: 'Inspections',
      color: PremiumTheme.primaryTeal,
      child: Column(
        children: [
          _inspectionRow(
            'Inspection depart',
            _hasDepartureInspection,
            Icons.login,
          ),
          const SizedBox(height: 10),
          _inspectionRow(
            'Inspection arrivee',
            _hasArrivalInspection,
            Icons.logout,
          ),
          if (_mission!.hasRestitution) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 10),
              decoration: BoxDecoration(
                color: const Color(0xFFFFF3E0),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFFE65100).withOpacity(0.2)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.swap_horiz_rounded, color: Color(0xFFE65100), size: 16),
                  const SizedBox(width: 6),
                  Text(
                    'Restitution',
                    style: TextStyle(
                      color: const Color(0xFFE65100),
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 10),
            _inspectionRow(
              'Inspection depart restitution',
              _hasRestitutionDepartureInspection,
              Icons.login,
            ),
            const SizedBox(height: 10),
            _inspectionRow(
              'Inspection arrivee restitution',
              _hasRestitutionArrivalInspection,
              Icons.logout,
            ),
          ],
          if (_mission!.status == 'in_progress' && (!_hasDepartureInspection || !_hasArrivalInspection ||
              (_mission!.hasRestitution && (!_hasRestitutionDepartureInspection || !_hasRestitutionArrivalInspection)))) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: PremiumTheme.accentAmber.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: PremiumTheme.accentAmber.withOpacity(0.3)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.warning_amber_rounded, color: PremiumTheme.accentAmber, size: 18),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _mission!.hasRestitution
                          ? 'Les 4 inspections (depart, arrivee, restitution depart, restitution arrivee) sont obligatoires.'
                          : 'Les deux inspections (depart et arrivee) sont obligatoires pour terminer la mission.',
                      style: TextStyle(color: PremiumTheme.accentAmber.withOpacity(0.9), fontSize: 12),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _inspectionRow(String label, bool done, IconData icon) {
    return Row(
      children: [
        Container(
          width: 32, height: 32,
          decoration: BoxDecoration(
            color: done ? PremiumTheme.accentGreen.withOpacity(0.1) : PremiumTheme.textTertiary.withOpacity(0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(
            done ? Icons.check_circle : Icons.radio_button_unchecked,
            color: done ? PremiumTheme.accentGreen : PremiumTheme.textTertiary,
            size: 20,
          ),
        ),
        const SizedBox(width: 10),
        Icon(icon, size: 18, color: done ? PremiumTheme.textPrimary : PremiumTheme.textTertiary),
        const SizedBox(width: 8),
        Text(
          label,
          style: TextStyle(
            color: done ? PremiumTheme.textPrimary : PremiumTheme.textTertiary,
            fontSize: 15,
            fontWeight: done ? FontWeight.w600 : FontWeight.normal,
            decoration: done ? TextDecoration.lineThrough : null,
          ),
        ),
        const Spacer(),
        Text(
          done ? 'Fait' : 'A faire',
          style: TextStyle(
            color: done ? PremiumTheme.accentGreen : PremiumTheme.accentAmber,
            fontSize: 13,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }

  // ==============================================
  //  MANDATAIRE CARD
  // ==============================================
  Widget _buildMandataireCard() {
    return _card(
      icon: Icons.person_outline,
      title: 'Mandataire',
      color: PremiumTheme.primaryPurple,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            _mission!.mandataireName ?? 'Non renseigne',
            style: const TextStyle(color: PremiumTheme.textPrimary, fontSize: 17, fontWeight: FontWeight.w600),
          ),
          if (_mission!.mandataireCompany != null && _mission!.mandataireCompany!.isNotEmpty) ...[
            const SizedBox(height: 6),
            Row(
              children: [
                const Icon(Icons.business, color: PremiumTheme.primaryPurple, size: 16),
                const SizedBox(width: 6),
                Text(
                  _mission!.mandataireCompany!,
                  style: const TextStyle(color: PremiumTheme.textSecondary, fontSize: 15),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  // ==============================================
  //  VEHICLE CARD
  // ==============================================
  Widget _buildVehicleCard() {
    final label = _mission!.hasRestitution ? 'Vehicule Aller' : 'Vehicule';
    return _card(
      icon: Icons.directions_car,
      title: label,
      color: PremiumTheme.primaryTeal,
      child: Column(
        children: [
          if (_mission!.hasRestitution)
            Container(
              margin: const EdgeInsets.only(bottom: 10),
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: PremiumTheme.primaryBlue.withOpacity(0.1),
                borderRadius: BorderRadius.circular(6),
              ),
              child: const Text('ALLER', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: PremiumTheme.primaryBlue)),
            ),
          if (_mission!.vehicleBrand != null || _mission!.vehicleModel != null)
            _infoRow(Icons.directions_car, 'Marque / Modele',
                '${_mission!.vehicleBrand ?? ''} ${_mission!.vehicleModel ?? ''}'.trim()),
          if (_mission!.vehicleType != null)
            _infoRow(Icons.category, 'Type', _mission!.vehicleType!),
          if (_mission!.vehiclePlate != null)
            _infoRow(Icons.pin, 'Immatriculation', _mission!.vehiclePlate!),
          if (_mission!.vehicleVin != null)
            _infoRow(Icons.confirmation_number, 'N VIN', _mission!.vehicleVin!),
        ],
      ),
    );
  }

  // ==============================================
  //  ITINERAIRE CARD
  // ==============================================
  Widget _buildItineraireCard() {
    final dateFormat = DateFormat('dd/MM/yyyy HH:mm');
    return _card(
      icon: Icons.route,
      title: 'Itineraire',
      color: PremiumTheme.accentGreen,
      child: Column(
        children: [
          _locationBlock(
            color: PremiumTheme.accentGreen,
            label: 'ENLEVEMENT',
            address: _mission!.pickupAddress ?? 'Non specifie',
            contactName: _mission!.pickupContactName,
            contactPhone: _mission!.pickupContactPhone,
            date: _mission!.pickupDate != null ? dateFormat.format(_mission!.pickupDate!) : null,
          ),
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Row(
              children: [
                const SizedBox(width: 16),
                Container(
                  width: 2,
                  height: 30,
                  decoration: const BoxDecoration(
                    gradient: LinearGradient(
                      colors: [PremiumTheme.accentGreen, PremiumTheme.primaryBlue],
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Icon(Icons.arrow_downward, color: PremiumTheme.textTertiary, size: 16),
              ],
            ),
          ),
          _locationBlock(
            color: PremiumTheme.primaryBlue,
            label: 'LIVRAISON',
            address: _mission!.deliveryAddress ?? 'Non specifie',
            contactName: _mission!.deliveryContactName,
            contactPhone: _mission!.deliveryContactPhone,
            date: _mission!.deliveryDate != null ? dateFormat.format(_mission!.deliveryDate!) : null,
          ),
        ],
      ),
    );
  }

  Widget _locationBlock({
    required Color color,
    required String label,
    required String address,
    String? contactName,
    String? contactPhone,
    String? date,
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: color.withOpacity(0.05),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.circle, color: color, size: 10),
              const SizedBox(width: 8),
              Text(label, style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 1)),
            ],
          ),
          const SizedBox(height: 8),
          Text(address, style: const TextStyle(color: PremiumTheme.textPrimary, fontSize: 15, fontWeight: FontWeight.w500)),
          if (date != null) ...[
            const SizedBox(height: 8),
            Row(
              children: [
                Icon(Icons.calendar_today, color: color.withOpacity(0.7), size: 14),
                const SizedBox(width: 6),
                Text(date, style: const TextStyle(color: PremiumTheme.textSecondary, fontSize: 13)),
              ],
            ),
          ],
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: color.withOpacity(0.04),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: color.withOpacity(0.15)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(Icons.person, color: color, size: 18),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        contactName != null && contactName.isNotEmpty
                            ? contactName
                            : 'Contact non renseigne',
                        style: TextStyle(
                          color: contactName != null && contactName.isNotEmpty
                              ? PremiumTheme.textPrimary
                              : PremiumTheme.textTertiary,
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                if (contactPhone != null && contactPhone.isNotEmpty)
                  InkWell(
                    onTap: () => _makePhoneCall(contactPhone),
                    borderRadius: BorderRadius.circular(10),
                    child: Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
                      decoration: BoxDecoration(
                        color: color.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: color.withOpacity(0.3)),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.phone, color: color, size: 20),
                          const SizedBox(width: 10),
                          Text(
                            contactPhone,
                            style: const TextStyle(
                              color: PremiumTheme.textPrimary,
                              fontSize: 17,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 0.5,
                            ),
                          ),
                          const SizedBox(width: 10),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: color,
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: const Text(
                              'Appeler',
                              style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
                            ),
                          ),
                        ],
                      ),
                    ),
                  )
                else
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
                    decoration: BoxDecoration(
                      color: PremiumTheme.textTertiary.withOpacity(0.05),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.phone_disabled, color: PremiumTheme.textTertiary, size: 18),
                        SizedBox(width: 8),
                        Text(
                          'Aucun numero de telephone',
                          style: TextStyle(color: PremiumTheme.textTertiary, fontSize: 14),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ==============================================
  //  RESTITUTION CARD (Phase 2 - Retour)
  // ==============================================
  Widget _buildRestitutionCard() {
    const Color restitutionOrange = Color(0xFFE65100);
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(color: restitutionOrange.withOpacity(0.08), blurRadius: 15, offset: const Offset(0, 4)),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: Column(
          children: [
            // Orange gradient header
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [Color(0xFFE65100), Color(0xFFF57C00)],
                ),
              ),
              child: Row(
                children: [
                  const Icon(Icons.swap_horiz_rounded, color: Colors.white, size: 22),
                  const SizedBox(width: 10),
                  const Expanded(
                    child: Text(
                      'Restitution - Vehicule Retour',
                      style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w700),
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Text('PHASE 2', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700)),
                  ),
                ],
              ),
            ),
            // Body
            Container(
              width: double.infinity,
              color: PremiumTheme.cardBg,
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Vehicle info box
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: restitutionOrange.withOpacity(0.05),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: restitutionOrange.withOpacity(0.15)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: restitutionOrange.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: const Icon(Icons.directions_car, color: restitutionOrange, size: 22),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    '${_mission!.restitutionVehicleBrand ?? ''} ${_mission!.restitutionVehicleModel ?? ''}'.trim().isEmpty
                                        ? 'Vehicule retour'
                                        : '${_mission!.restitutionVehicleBrand ?? ''} ${_mission!.restitutionVehicleModel ?? ''}'.trim(),
                                    style: const TextStyle(color: PremiumTheme.textPrimary, fontSize: 16, fontWeight: FontWeight.w700),
                                  ),
                                  if (_mission!.restitutionVehiclePlate != null) ...[
                                    const SizedBox(height: 4),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: restitutionOrange.withOpacity(0.12),
                                        borderRadius: BorderRadius.circular(6),
                                      ),
                                      child: Text(
                                        _mission!.restitutionVehiclePlate!,
                                        style: const TextStyle(color: restitutionOrange, fontSize: 13, fontWeight: FontWeight.w700, letterSpacing: 1),
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: restitutionOrange.withOpacity(0.15),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: const Text('RETOUR', style: TextStyle(color: restitutionOrange, fontSize: 11, fontWeight: FontWeight.w700)),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  // Itinerary
                  _locationBlock(
                    color: restitutionOrange,
                    label: 'ENLEVEMENT RETOUR',
                    address: _mission!.restitutionPickupAddress ?? 'Non specifie',
                    contactName: null,
                    contactPhone: null,
                  ),
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    child: Row(
                      children: [
                        const SizedBox(width: 16),
                        Container(
                          width: 2,
                          height: 30,
                          decoration: const BoxDecoration(
                            gradient: LinearGradient(
                              colors: [Color(0xFFE65100), Color(0xFFD32F2F)],
                              begin: Alignment.topCenter,
                              end: Alignment.bottomCenter,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        const Icon(Icons.arrow_downward, color: PremiumTheme.textTertiary, size: 16),
                      ],
                    ),
                  ),
                  _locationBlock(
                    color: const Color(0xFFD32F2F),
                    label: 'LIVRAISON RETOUR',
                    address: _mission!.restitutionDeliveryAddress ?? 'Non specifie',
                    contactName: null,
                    contactPhone: null,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ==============================================
  //  PRICE CARD
  // ==============================================
  Widget _buildPriceCard() {
    return _card(
      icon: Icons.euro,
      title: 'Prix',
      color: PremiumTheme.accentAmber,
      child: Text(
        '${_mission!.price!.toStringAsFixed(2)} EUR',
        style: const TextStyle(color: PremiumTheme.textPrimary, fontSize: 22, fontWeight: FontWeight.bold),
      ),
    );
  }

  // ==============================================
  //  NOTES CARD
  // ==============================================
  Widget _buildNotesCard() {
    return _card(
      icon: Icons.note_outlined,
      title: 'Notes',
      color: PremiumTheme.textSecondary,
      child: Text(
        _mission!.notes!,
        style: const TextStyle(color: PremiumTheme.textSecondary, fontSize: 15),
      ),
    );
  }

  // ==============================================
  //  TRACKING CARD
  // ==============================================
  Widget _buildTrackingCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: PremiumTheme.cardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: _isTrackingActive ? PremiumTheme.accentGreen.withOpacity(0.5) : const Color(0xFFE5E7EB),
        ),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 8, offset: const Offset(0, 2)),
        ],
      ),
      child: Column(
        children: [
          Row(
            children: [
              Icon(
                _isTrackingActive ? Icons.gps_fixed : Icons.gps_off,
                color: _isTrackingActive ? PremiumTheme.accentGreen : PremiumTheme.textTertiary,
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
                        color: _isTrackingActive ? PremiumTheme.accentGreen : PremiumTheme.textSecondary,
                        fontWeight: FontWeight.bold,
                        fontSize: 15,
                      ),
                    ),
                    Text(
                      _isTrackingActive
                          ? 'Position mise a jour toutes les 3s'
                          : 'Activez pour partager votre position',
                      style: const TextStyle(color: PremiumTheme.textTertiary, fontSize: 12),
                    ),
                  ],
                ),
              ),
              Switch(
                value: _isTrackingActive,
                onChanged: (_) => _toggleTracking(),
                activeColor: PremiumTheme.accentGreen,
              ),
            ],
          ),
          if (_isTrackingActive && _publicTrackingLink != null) ...[
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: PremiumTheme.lightBg,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFFE5E7EB)),
              ),
              child: Text(
                _publicTrackingLink!,
                style: const TextStyle(color: PremiumTheme.textSecondary, fontSize: 12),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _copyLinkToClipboard,
                    icon: const Icon(Icons.copy, size: 16),
                    label: const Text('Copier'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: PremiumTheme.primaryTeal,
                      side: const BorderSide(color: Color(0xFFE5E7EB)),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: _shareTrackingLink,
                    icon: const Icon(Icons.share, size: 16),
                    label: const Text('Partager'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: PremiumTheme.primaryTeal,
                      foregroundColor: Colors.white,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  // ==============================================
  //  BOTTOM ACTIONS
  // ==============================================
  Widget _buildBottomActions() {
    return SafeArea(
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: PremiumTheme.cardBg,
          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.08), blurRadius: 10, offset: const Offset(0, -3))],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (_mission!.status == 'pending')
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () => _startDepartureInspection(),
                  icon: const Icon(Icons.play_arrow),
                  label: const Text('Demarrer la mission', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: PremiumTheme.primaryTeal,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ),
            if (_mission!.status == 'in_progress') ...[
              // Bouton "Voir rapport départ" si inspection de départ effectuée
              if (_hasDepartureInspection)
                Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: _viewReport,
                      icon: const Icon(Icons.description, size: 20),
                      label: const Text('Voir rapport depart', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: PremiumTheme.primaryTeal,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ),
                ),
              // Boutons d'inspection si manquantes
              if (!_hasDepartureInspection)
                Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: () => _startDepartureInspection(),
                      icon: const Icon(Icons.login),
                      label: const Text('Faire l\'inspection de depart', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: PremiumTheme.primaryBlue,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ),
                ),
              if (_hasDepartureInspection && !_hasArrivalInspection)
                Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: () => _startArrivalInspection(),
                      icon: const Icon(Icons.logout),
                      label: const Text('Faire l\'inspection d\'arrivee', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: PremiumTheme.primaryPurple,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ),
                ),
              // ---- Restitution inspection buttons ----
              if (_mission!.hasRestitution && _hasDepartureInspection && _hasArrivalInspection) ...[
                Container(
                  margin: const EdgeInsets.only(bottom: 10),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFF3E0),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFE65100).withValues(alpha: 0.3)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.swap_horiz_rounded, color: Color(0xFFE65100), size: 20),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              _hasRestitutionDepartureInspection && _hasRestitutionArrivalInspection
                                  ? 'Restitution terminée ✅'
                                  : 'Restitution (aller-retour)',
                              style: const TextStyle(
                                color: Color(0xFFE65100),
                                fontWeight: FontWeight.w700,
                                fontSize: 14,
                              ),
                            ),
                          ),
                        ],
                      ),
                      if (_mission!.restitutionVehicleBrand != null || _mission!.restitutionVehiclePlate != null || _mission!.vehicleBrand != null || _mission!.vehiclePlate != null) ...[
                        const SizedBox(height: 6),
                        Row(
                          children: [
                            Icon(Icons.directions_car, size: 16, color: const Color(0xFFE65100).withValues(alpha: 0.7)),
                            const SizedBox(width: 6),
                            Expanded(
                              child: Text(
                                [
                                  if (_mission!.restitutionVehicleBrand != null || _mission!.vehicleBrand != null)
                                    _mission!.restitutionVehicleBrand ?? _mission!.vehicleBrand,
                                  if (_mission!.restitutionVehicleModel != null || _mission!.vehicleModel != null)
                                    _mission!.restitutionVehicleModel ?? _mission!.vehicleModel,
                                ].where((e) => e != null).join(' '),
                                style: const TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w500,
                                  color: Color(0xFFE65100),
                                ),
                              ),
                            ),
                            if (_mission!.restitutionVehiclePlate != null || _mission!.vehiclePlate != null) ...[
                              const SizedBox(width: 10),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFE65100).withValues(alpha: 0.12),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  _mission!.restitutionVehiclePlate ?? _mission!.vehiclePlate!,
                                  style: const TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w700,
                                    color: Color(0xFFE65100),
                                  ),
                                ),
                              ),
                            ],
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
                if (!_hasRestitutionDepartureInspection)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        onPressed: () => _startRestitutionDepartureInspection(),
                        icon: const Icon(Icons.login),
                        label: const Text('Inspection départ restitution', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFE65100),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                    ),
                  ),
                if (_hasRestitutionDepartureInspection && !_hasRestitutionArrivalInspection)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        onPressed: () => _startRestitutionArrivalInspection(),
                        icon: const Icon(Icons.logout),
                        label: const Text('Inspection arrivée restitution', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFE65100),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                    ),
                  ),
              ],
              // Afficher avertissement si inspections manquantes
              if (!_hasDepartureInspection || !_hasArrivalInspection ||
                  (_mission!.hasRestitution && (!_hasRestitutionDepartureInspection || !_hasRestitutionArrivalInspection)))
                Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: Row(
                    children: [
                      const Icon(Icons.info_outline, color: PremiumTheme.accentAmber, size: 16),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          !_hasDepartureInspection && !_hasArrivalInspection
                              ? 'Inspections depart et arrivee requises'
                              : !_hasDepartureInspection
                                  ? 'Inspection depart requise'
                                  : !_hasArrivalInspection
                                      ? 'Inspection arrivee requise'
                                      : _mission!.hasRestitution && !_hasRestitutionDepartureInspection
                                          ? 'Inspection départ restitution requise'
                                          : 'Inspection arrivée restitution requise',
                          style: const TextStyle(color: PremiumTheme.accentAmber, fontSize: 12, fontWeight: FontWeight.w500),
                        ),
                      ),
                    ],
                  ),
                ),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: (_canComplete())
                      ? () => _updateStatus('completed')
                      : () => _showInspectionRequiredDialog(),
                  icon: const Icon(Icons.check_circle),
                  label: const Text('Terminer la mission', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: (_canComplete())
                        ? PremiumTheme.accentGreen
                        : PremiumTheme.textTertiary,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ),
            ],
            if (_mission!.status == 'completed') ...[
              // Boutons pour mission terminee: Voir rapport + Creer facture
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: _viewReport,
                      icon: const Icon(Icons.description, size: 20),
                      label: const Text('Voir le rapport', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: PremiumTheme.primaryBlue,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: _createInvoice,
                      icon: const Icon(Icons.receipt_long, size: 20),
                      label: const Text('Creer facture', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: PremiumTheme.accentGreen,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  // ==============================================
  //  WIDGETS REUTILISABLES
  // ==============================================
  Widget _card({required IconData icon, required String title, required Color color, required Widget child}) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: PremiumTheme.cardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withOpacity(0.15)),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 8, offset: const Offset(0, 2)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: color, size: 22),
              const SizedBox(width: 8),
              Text(title, style: TextStyle(color: color, fontSize: 17, fontWeight: FontWeight.bold)),
            ],
          ),
          const SizedBox(height: 12),
          child,
        ],
      ),
    );
  }

  Widget _infoRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        children: [
          Icon(icon, color: PremiumTheme.primaryTeal.withOpacity(0.7), size: 18),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: const TextStyle(color: PremiumTheme.textTertiary, fontSize: 12)),
                const SizedBox(height: 2),
                Text(value, style: const TextStyle(color: PremiumTheme.textPrimary, fontSize: 15)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ==============================================
  //  ACTIONS
  // ==============================================
  Future<void> _makePhoneCall(String phoneNumber) async {
    final Uri launchUri = Uri(scheme: 'tel', path: phoneNumber);
    if (await canLaunchUrl(launchUri)) {
      await launchUrl(launchUri);
    }
  }

  void _showInspectionRequiredDialog() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: PremiumTheme.cardBg,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.warning_amber_rounded, color: PremiumTheme.accentAmber, size: 28),
            SizedBox(width: 10),
            Expanded(child: Text('Inspections requises', style: TextStyle(color: PremiumTheme.textPrimary, fontSize: 18))),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Vous ne pouvez pas terminer cette mission sans avoir effectue les deux inspections:',
              style: TextStyle(color: PremiumTheme.textSecondary, fontSize: 14),
            ),
            const SizedBox(height: 16),
            _dialogInspectionItem('Inspection de depart', _hasDepartureInspection),
            const SizedBox(height: 8),
            _dialogInspectionItem('Inspection d\'arrivee', _hasArrivalInspection),
            if (_mission!.hasRestitution) ...[
              const SizedBox(height: 12),
              const Divider(),
              const SizedBox(height: 8),
              const Text('Restitution :', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: Color(0xFFE65100))),
              const SizedBox(height: 8),
              _dialogInspectionItem('Inspection départ restitution', _hasRestitutionDepartureInspection),
              const SizedBox(height: 8),
              _dialogInspectionItem('Inspection arrivée restitution', _hasRestitutionArrivalInspection),
            ],
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Compris', style: TextStyle(color: PremiumTheme.primaryBlue, fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );
  }

  Widget _dialogInspectionItem(String label, bool done) {
    return Row(
      children: [
        Icon(
          done ? Icons.check_circle : Icons.cancel,
          color: done ? PremiumTheme.accentGreen : PremiumTheme.accentRed,
          size: 22,
        ),
        const SizedBox(width: 10),
        Text(
          label,
          style: TextStyle(
            color: done ? PremiumTheme.accentGreen : PremiumTheme.accentRed,
            fontSize: 15,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }

  /// Ouvre l'inspection de depart et passe la mission en in_progress APRES
  Future<void> _startDepartureInspection() async {
    try {
      // Verifier si deja faite
      final existing = await Supabase.instance.client
          .from('vehicle_inspections')
          .select('id')
          .eq('mission_id', _mission!.id)
          .eq('inspection_type', 'departure')
          .maybeSingle();
      if (existing != null) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Inspection de depart deja validee'), backgroundColor: PremiumTheme.accentAmber),
        );
        return;
      }

      if (!mounted) return;
      // Ouvrir l'ecran d'inspection de depart D'ABORD
      await Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => InspectionDepartureScreen(missionId: _mission!.id),
        ),
      );

      // Apres retour, verifier si l'inspection a ete creee
      final created = await Supabase.instance.client
          .from('vehicle_inspections')
          .select('id')
          .eq('mission_id', _mission!.id)
          .eq('inspection_type', 'departure')
          .maybeSingle();

      // Passer en in_progress SEULEMENT si l'inspection existe
      if (created != null && _mission!.status == 'pending') {
        await _missionService.updateMissionStatus(_mission!.id, 'in_progress');
        final started = await _trackingService.startTracking(_mission!.id, autoStart: true);
        if (started && mounted) {
          setState(() => _isTrackingActive = true);
        }
      }

      // Recharger la mission au retour
      await _loadMission();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(ErrorHelper.cleanError(e)), backgroundColor: PremiumTheme.accentRed, behavior: SnackBarBehavior.floating),
      );
    }
  }

  /// Ouvre l'inspection d'arrivee
  Future<void> _startArrivalInspection() async {
    try {
      final existing = await Supabase.instance.client
          .from('vehicle_inspections')
          .select('id')
          .eq('mission_id', _mission!.id)
          .eq('inspection_type', 'arrival')
          .maybeSingle();
      if (existing != null) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Inspection d\'arrivee deja validee'), backgroundColor: PremiumTheme.accentAmber),
        );
        return;
      }

      if (!mounted) return;
      await Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => InspectionArrivalScreen(missionId: _mission!.id),
        ),
      );
      await _loadMission();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(ErrorHelper.cleanError(e)), backgroundColor: PremiumTheme.accentRed, behavior: SnackBarBehavior.floating),
      );
    }
  }

  /// Check if all required inspections are completed
  bool _canComplete() {
    if (!_hasDepartureInspection || !_hasArrivalInspection) return false;
    if (_mission!.hasRestitution) {
      return _hasRestitutionDepartureInspection && _hasRestitutionArrivalInspection;
    }
    return true;
  }

  /// Start the restitution departure inspection
  Future<void> _startRestitutionDepartureInspection() async {
    try {
      final existing = await Supabase.instance.client
          .from('vehicle_inspections')
          .select('id')
          .eq('mission_id', _mission!.id)
          .eq('inspection_type', 'restitution_departure')
          .maybeSingle();
      if (existing != null) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Inspection départ restitution déjà validée'), backgroundColor: PremiumTheme.accentAmber),
        );
        return;
      }

      if (!mounted) return;
      await Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => InspectionDepartureScreen(missionId: _mission!.id, isRestitution: true),
        ),
      );
      await _loadMission();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(ErrorHelper.cleanError(e)), backgroundColor: PremiumTheme.accentRed, behavior: SnackBarBehavior.floating),
      );
    }
  }

  /// Start the restitution arrival inspection
  Future<void> _startRestitutionArrivalInspection() async {
    try {
      final existing = await Supabase.instance.client
          .from('vehicle_inspections')
          .select('id')
          .eq('mission_id', _mission!.id)
          .eq('inspection_type', 'restitution_arrival')
          .maybeSingle();
      if (existing != null) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Inspection arrivée restitution déjà validée'), backgroundColor: PremiumTheme.accentAmber),
        );
        return;
      }

      if (!mounted) return;
      await Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => InspectionArrivalScreen(missionId: _mission!.id, isRestitution: true),
        ),
      );
      await _loadMission();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(ErrorHelper.cleanError(e)), backgroundColor: PremiumTheme.accentRed, behavior: SnackBarBehavior.floating),
      );
    }
  }

  Future<void> _updateStatus(String newStatus) async {
    // Bloquer la completion sans les deux inspections
    if (newStatus == 'completed') {
      if (!_hasDepartureInspection || !_hasArrivalInspection) {
        _showInspectionRequiredDialog();
        return;
      }
    }

    try {
      await _missionService.updateMissionStatus(_mission!.id, newStatus);

      if (newStatus == 'in_progress') {
        final started = await _trackingService.startTracking(_mission!.id, autoStart: true);
        if (started && mounted) {
          setState(() => _isTrackingActive = true);
        }
      } else if (newStatus == 'completed') {
        await _trackingService.stopTracking();
        if (mounted) setState(() => _isTrackingActive = false);
      }

      await _loadMission();
      if (!mounted) return;

      String message = 'Statut mis a jour';
      if (newStatus == 'in_progress') {
        message = 'Mission demarree - Tracking GPS active';
      } else if (newStatus == 'completed') {
        message = 'Mission terminee';
        // Proposer un lift retour
        _showRetourLiftPopup();
      }

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(message), backgroundColor: PremiumTheme.accentGreen, behavior: SnackBarBehavior.floating),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(ErrorHelper.cleanError(e)), backgroundColor: PremiumTheme.accentRed, behavior: SnackBarBehavior.floating),
      );
    }
  }

  // ==============================================
  //  POPUP RETOUR LIFT (après mission terminée)
  // ==============================================
  void _showRetourLiftPopup() {
    final deliveryCity = _mission?.deliveryCity ?? '';
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        margin: const EdgeInsets.all(16),
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFFD1FAE5),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Text('✅', style: TextStyle(fontSize: 24)),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Mission terminée !',
                          style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
                      if (deliveryCity.isNotEmpty)
                        Text('Tu es à $deliveryCity',
                            style: const TextStyle(fontSize: 13, color: Color(0xFF64748B))),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFFF0FDF4),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFF86EFAC)),
              ),
              child: const Row(
                children: [
                  Icon(Icons.directions_car_outlined, color: Color(0xFF059669), size: 20),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Un convoyeur dans la région peut peut-être te ramener !',
                      style: TextStyle(fontSize: 13, color: Color(0xFF059669), height: 1.4),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.pop(ctx),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: const Text('Plus tard'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: FilledButton.icon(
                    onPressed: () {
                      Navigator.pop(ctx);
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => RetourLiftScreen(
                            fromCity: deliveryCity,
                            missionId: _mission?.id,
                          ),
                        ),
                      );
                    },
                    icon: const Icon(Icons.search, size: 16),
                    label: const Text('Trouver un lift'),
                    style: FilledButton.styleFrom(
                      backgroundColor: const Color(0xFF0D9488),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  // ==============================================
  //  CHANGER DE CHAUFFEUR
  // ==============================================
  Future<void> _changeDriver() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: PremiumTheme.cardBg,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.swap_horiz, color: PremiumTheme.accentAmber, size: 28),
            SizedBox(width: 10),
            Expanded(child: Text('Changer de chauffeur', style: TextStyle(color: PremiumTheme.textPrimary, fontSize: 18))),
          ],
        ),
        content: const Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Le chauffeur actuel sera retire de la mission. Un nouveau chauffeur pourra rejoindre avec le meme code de mission.',
              style: TextStyle(color: PremiumTheme.textSecondary, fontSize: 14),
            ),
            SizedBox(height: 12),
            Row(
              children: [
                Icon(Icons.key, color: PremiumTheme.primaryPurple, size: 18),
                SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Le code de mission reste inchange et fonctionnel.',
                    style: TextStyle(color: PremiumTheme.primaryPurple, fontSize: 13, fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Annuler', style: TextStyle(color: PremiumTheme.textSecondary)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: PremiumTheme.accentAmber,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            child: const Text('Confirmer le changement'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    try {
      // Liberer le chauffeur actuel en mettant assigned_user_id a null
      await Supabase.instance.client
          .from('missions')
          .update({
            'assigned_user_id': null,
            'status': 'pending',
          })
          .eq('id', _mission!.id);

      await _loadMission();
      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Row(
            children: [
              Icon(Icons.check_circle, color: Colors.white, size: 20),
              SizedBox(width: 8),
              Expanded(child: Text('Chauffeur libere. Le code de mission est toujours actif pour un nouveau chauffeur.')),
            ],
          ),
          backgroundColor: PremiumTheme.accentGreen,
          behavior: SnackBarBehavior.floating,
          duration: Duration(seconds: 4),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Erreur: ${ErrorHelper.cleanError(e)}'),
          backgroundColor: PremiumTheme.accentRed,
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  // ==============================================
  //  VOIR LE RAPPORT
  // ==============================================
  Future<void> _viewReport() async {
    try {
      // Chercher un token existant
      final existing = await Supabase.instance.client
          .from('inspection_report_shares')
          .select('share_token')
          .eq('mission_id', _mission!.id)
          .eq('is_active', true)
          .maybeSingle();

      String shareToken;
      if (existing != null) {
        shareToken = existing['share_token'] as String;
      } else {
        // Creer un nouveau token
        final userId = Supabase.instance.client.auth.currentUser?.id;
        if (userId == null) {
          if (!mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Erreur: utilisateur non connecte'), backgroundColor: PremiumTheme.accentRed),
          );
          return;
        }

        final token = DateTime.now().millisecondsSinceEpoch.toRadixString(36) +
            userId.substring(0, 8);

        await Supabase.instance.client.from('inspection_report_shares').upsert({
          'mission_id': _mission!.id,
          'user_id': userId,
          'share_token': token,
          'report_type': 'complete',
          'is_active': true,
          'expires_at': DateTime.now().add(const Duration(days: 30)).toIso8601String(),
        }, onConflict: 'mission_id,report_type');
        shareToken = token;
      }

      final reportUrl = 'https://www.checksfleet.com/rapport-inspection/$shareToken';
      final uri = Uri.parse(reportUrl);
      try {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      } catch (_) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Impossible d\'ouvrir le navigateur'), backgroundColor: PremiumTheme.accentRed),
        );
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Erreur: ${ErrorHelper.cleanError(e)}'),
          backgroundColor: PremiumTheme.accentRed,
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  // ==============================================
  //  CREER FACTURE
  // ==============================================
  void _createInvoice() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => InvoiceFormScreen(mission: _mission)),
    );
  }

  Future<void> _toggleTracking() async {
    try {
      if (_isTrackingActive) {
        await _trackingService.stopTracking();
        if (mounted) setState(() => _isTrackingActive = false);
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Row(children: [
              Icon(Icons.gps_off, color: Colors.white, size: 20),
              SizedBox(width: 8),
              Text('Tracking GPS desactive'),
            ]),
            backgroundColor: Colors.orange,
            duration: Duration(seconds: 2),
          ),
        );
      } else {
        final started = await _trackingService.startTracking(_mission!.id);
        if (started && mounted) {
          setState(() => _isTrackingActive = true);
          _generatePublicLink();
          if (!mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Row(children: [
                Icon(Icons.gps_fixed, color: Colors.white, size: 20),
                SizedBox(width: 8),
                Text('Tracking GPS active'),
              ]),
              backgroundColor: Colors.green,
              duration: Duration(seconds: 2),
            ),
          );
        } else {
          if (!mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Impossible de demarrer le GPS (permissions?)'),
              backgroundColor: PremiumTheme.accentRed,
            ),
          );
        }
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(ErrorHelper.cleanError(e)), backgroundColor: PremiumTheme.accentRed),
      );
    }
  }

  Future<void> _editMission() async {
    if (_mission == null) return;
    final result = await Navigator.push<bool>(
      context,
      MaterialPageRoute(
        builder: (_) => MissionCreateScreenNew(existingMission: _mission),
      ),
    );
    if (result == true) {
      _loadMission();
    }
  }

  Future<void> _confirmDelete() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: PremiumTheme.cardBg,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Supprimer la mission', style: TextStyle(color: PremiumTheme.textPrimary)),
        content: const Text('Etes-vous sur de vouloir supprimer cette mission ?', style: TextStyle(color: PremiumTheme.textSecondary)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Annuler', style: TextStyle(color: PremiumTheme.textSecondary)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(backgroundColor: PremiumTheme.accentRed),
            child: const Text('Supprimer', style: TextStyle(color: Colors.white)),
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
          const SnackBar(content: Text('Mission supprimee'), backgroundColor: PremiumTheme.accentGreen),
        );
      } catch (e) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(ErrorHelper.cleanError(e)), backgroundColor: PremiumTheme.accentRed),
        );
      }
    }
  }

  Future<void> _generatePublicLink() async {
    try {
      final link = await _missionService.generatePublicTrackingLink(_mission!.id);
      if (link != null && mounted) {
        setState(() => _publicTrackingLink = link);
      }
    } catch (e) {
      debugPrint('Erreur generation lien public: $e');
    }
  }

  Future<void> _copyLinkToClipboard() async {
    if (_publicTrackingLink == null) return;
    await Clipboard.setData(ClipboardData(text: _publicTrackingLink!));
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Lien copie dans le presse-papier'),
        backgroundColor: PremiumTheme.accentGreen,
        duration: Duration(seconds: 2),
      ),
    );
  }

  Future<void> _shareTrackingLink() async {
    if (_publicTrackingLink == null) return;
    final message = 'Suivi de votre livraison en temps reel\n\n'
        'Mission: ${_mission!.reference}\n'
        'Suivez votre commande en direct:\n\n'
        '$_publicTrackingLink\n\n'
        'ChecksFleet';
    try {
      await Share.share(message, subject: 'Suivi GPS - Mission ${_mission!.reference}');
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Erreur partage: ${ErrorHelper.cleanError(e)}'), backgroundColor: PremiumTheme.accentRed),
      );
    }
  }
}
