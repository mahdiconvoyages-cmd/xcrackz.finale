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
import 'package:shared_preferences/shared_preferences.dart';
import 'mission_create_screen_new.dart';
import '../planning/retour_lift_screen.dart';
import '../planning/_offer_publish_sheet.dart';
import 'widgets/mission_detail_cards.dart';

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
  Map<String, dynamic>? _activeLiftOffer;
  int _liftMatchCount = 0;

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

      // Charger l'offre de lift liée à cette mission
      Map<String, dynamic>? liftOffer;
      int matchCount = 0;
      try {
        liftOffer = await Supabase.instance.client
            .from('ride_offers')
            .select('id, seats_available, status')
            .eq('mission_id', mission.id)
            .eq('status', 'active')
            .maybeSingle();
        if (liftOffer != null) {
          final matches = await Supabase.instance.client
              .from('ride_matches')
              .select('id')
              .eq('offer_id', liftOffer['id'])
              .inFilter('status', ['proposed', 'accepted', 'in_transit']);
          matchCount = (matches as List).length;
        }
      } catch (_) {}

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
        _activeLiftOffer = liftOffer;
        _liftMatchCount = matchCount;
        // Auto-load existing public tracking link from DB
        if (mission.publicTrackingLink != null && mission.publicTrackingLink!.isNotEmpty) {
          _publicTrackingLink = mission.publicTrackingLink;
        }
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
                    MissionShareCodeCard(mission: _mission!),
                    const SizedBox(height: 16),
                  ],
                  // Chauffeur assigne + changement
                  if (_mission!.assignedToUserId != null || _isCreator) ...[
                    MissionDriverCard(
                      mission: _mission!,
                      driverName: _assignedDriverName,
                      isCreator: _isCreator,
                      onChangeDriver: _changeDriver,
                    ),
                    const SizedBox(height: 16),
                  ],
                  // Etat des inspections (visible quand en cours ou terminee)
                  if (_mission!.status == 'in_progress' || _mission!.status == 'completed') ...[
                    MissionInspectionStatusCard(
                      mission: _mission!,
                      hasDeparture: _hasDepartureInspection,
                      hasArrival: _hasArrivalInspection,
                      hasRestitutionDeparture: _hasRestitutionDepartureInspection,
                      hasRestitutionArrival: _hasRestitutionArrivalInspection,
                    ),
                    const SizedBox(height: 16),
                  ],
                  // Mandataire
                  MissionMandataireCard(mission: _mission!),
                  const SizedBox(height: 16),
                  // Vehicule
                  MissionVehicleCard(mission: _mission!),
                  const SizedBox(height: 16),
                  // Itineraire
                  MissionItineraryCard(mission: _mission!, onPhoneCall: _makePhoneCall),
                  const SizedBox(height: 16),
                  // Restitution (vehicule retour + itineraire retour)
                  if (_mission!.hasRestitution) ...[
                    MissionRestitutionCard(mission: _mission!, onPhoneCall: _makePhoneCall),
                    const SizedBox(height: 16),
                  ],
                  // Prix
                  if (_mission!.price != null) ...[
                    MissionPriceCard(price: _mission!.price!),
                    const SizedBox(height: 16),
                  ],
                  // Notes
                  if (_mission!.notes != null && _mission!.notes!.isNotEmpty) ...[
                    MissionNotesCard(notes: _mission!.notes!),
                    const SizedBox(height: 16),
                  ],
                  // Partage lien de suivi client
                  if (_mission!.status == 'in_progress' || _publicTrackingLink != null) ...[
                    _buildClientTrackingShareCard(),
                    const SizedBox(height: 16),
                  ],
                  // Tracking GPS
                  if (_mission!.status == 'in_progress') ...[
                    MissionTrackingCard(
                      isActive: _isTrackingActive,
                      publicLink: _publicTrackingLink,
                      onToggle: _toggleTracking,
                      onCopyLink: _copyLinkToClipboard,
                      onShareLink: _shareTrackingLink,
                    ),
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
                      MissionStatusBadge(status: _mission!.status),
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

  // ==============================================
  //  SHARE CODE CARD → Extracted to MissionShareCodeCard
  //  DRIVER CARD → Extracted to MissionDriverCard
  //  INSPECTION STATUS CARD → Extracted to MissionInspectionStatusCard
  //  MANDATAIRE CARD → Extracted to MissionMandataireCard
  //  VEHICLE CARD → Extracted to MissionVehicleCard
  //  ITINERARY CARD → Extracted to MissionItineraryCard
  //  RESTITUTION CARD → Extracted to MissionRestitutionCard
  //  PRICE CARD → Extracted to MissionPriceCard
  //  NOTES CARD → Extracted to MissionNotesCard
  //  TRACKING CARD → Extracted to MissionTrackingCard
  //  (All above are in widgets/mission_detail_cards.dart)
  // ==============================================

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
            if (_mission!.status == 'pending') ...[
              // ── Offre de lift depuis cette mission ──
              _buildLiftOfferSection(),
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
            ],
            if (_mission!.status == 'in_progress') ...[
              // ── Offre de lift depuis cette mission ──
              _buildLiftOfferSection(),
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
  Future<void> _showRetourLiftPopup() async {
    final prefs = await SharedPreferences.getInstance();
    if ((prefs.getBool('lift_popup_disabled') ?? false) || !mounted) return;
    final deliveryCity = _mission?.deliveryCity ?? '';
    bool neverAgain = false;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setLocal) => Container(
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
            const SizedBox(height: 4),
            Row(
              children: [
                Transform.scale(
                  scale: 0.85,
                  child: Checkbox(
                    value: neverAgain,
                    activeColor: const Color(0xFF0D9488),
                    onChanged: (v) {
                      setLocal(() => neverAgain = v ?? false);
                      if (v == true) prefs.setBool('lift_popup_disabled', true);
                    },
                  ),
                ),
                const Text('Ne plus afficher',
                    style: TextStyle(fontSize: 13, color: Color(0xFF64748B))),
              ],
            ),
          ],
        ),
      ),
    ),
    );
  }

  // ==============================================
  //  OFFRE DE LIFT DEPUIS LA MISSION (manuel)
  // ==============================================
  Widget _buildLiftOfferSection() {
    if (_activeLiftOffer != null) {
      // Offre active — afficher le statut
      final seats = (_activeLiftOffer!['seats_available'] as num?)?.toInt() ?? 1;
      return Padding(
        padding: const EdgeInsets.only(bottom: 10),
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            color: const Color(0xFFF0FDFA),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: PremiumTheme.primaryTeal.withValues(alpha: 0.3)),
          ),
          child: Row(
            children: [
              const Icon(Icons.people_alt_rounded, color: PremiumTheme.primaryTeal, size: 20),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '$seats place${seats > 1 ? 's' : ''} proposée${seats > 1 ? 's' : ''} 🚗',
                      style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: Color(0xFF0F172A)),
                    ),
                    if (_liftMatchCount > 0)
                      Text(
                        '$_liftMatchCount demande${_liftMatchCount > 1 ? 's' : ''} en cours',
                        style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                      ),
                  ],
                ),
              ),
              SizedBox(
                height: 32,
                child: TextButton(
                  onPressed: _cancelLiftOffer,
                  style: TextButton.styleFrom(
                    foregroundColor: PremiumTheme.accentRed,
                    padding: const EdgeInsets.symmetric(horizontal: 10),
                  ),
                  child: const Text('Annuler', style: TextStyle(fontSize: 12)),
                ),
              ),
            ],
          ),
        ),
      );
    }
    // Pas d'offre — proposer d'en créer une
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: SizedBox(
        width: double.infinity,
        child: OutlinedButton.icon(
          onPressed: _openLiftOfferSheet,
          icon: const Icon(Icons.people_alt_rounded, size: 18),
          label: const Text('Proposer des places de lift',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
          style: OutlinedButton.styleFrom(
            foregroundColor: PremiumTheme.primaryTeal,
            side: const BorderSide(color: PremiumTheme.primaryTeal),
            padding: const EdgeInsets.symmetric(vertical: 12),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        ),
      ),
    );
  }

  void _openLiftOfferSheet() {
    final m = _mission;
    if (m == null) return;
    final uid = Supabase.instance.client.auth.currentUser?.id;
    if (uid == null) return;

    final depDate = m.pickupDate;
    TimeOfDay? depTime;
    if (depDate != null) {
      depTime = TimeOfDay(hour: depDate.hour, minute: depDate.minute);
    }

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => OfferPublishSheet(
        userId: uid,
        missionId: m.id,
        defaultFrom: m.pickupCity,
        defaultTo: m.deliveryCity,
        defaultDate: depDate,
        defaultTime: depTime,
        onPublished: () {
          _loadMission();
        },
      ),
    );
  }

  Future<void> _cancelLiftOffer() async {
    if (_activeLiftOffer == null) return;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Annuler l\'offre de lift ?'),
        content: const Text('Les demandes en cours seront aussi annulées.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Non'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: TextButton.styleFrom(foregroundColor: PremiumTheme.accentRed),
            child: const Text('Oui, annuler'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    try {
      await Supabase.instance.client
          .from('ride_offers')
          .update({'status': 'cancelled'})
          .eq('id', _activeLiftOffer!['id']);
      _loadMission();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Offre de lift annulée'), backgroundColor: Color(0xFF64748B)),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur: $e')),
        );
      }
    }
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
      if (mounted) {
        setState(() => _publicTrackingLink = link);
      }
    } catch (e) {
      debugPrint('Erreur generation lien public: $e');
    }
  }

  // ── Partage tracking au client ──

  Widget _buildClientTrackingShareCard() {
    final hasLink = _publicTrackingLink != null;
    final clientName = _mission?.clientName;
    final clientPhone = _mission?.clientPhone;
    final clientEmail = _mission?.clientEmail;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: PremiumTheme.cardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: hasLink ? PremiumTheme.primaryBlue.withOpacity(0.4) : const Color(0xFFE5E7EB),
        ),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 8, offset: const Offset(0, 2)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: PremiumTheme.primaryBlue.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.share_location, color: PremiumTheme.primaryBlue, size: 24),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Suivi en temps reel',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: PremiumTheme.textPrimary),
                    ),
                    Text(
                      hasLink ? 'Lien pret a envoyer au client' : 'Generez un lien pour votre client',
                      style: const TextStyle(color: PremiumTheme.textTertiary, fontSize: 12),
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 16),

          // Link display or generate button
          if (!hasLink) ...[  
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _isGeneratingLink ? null : _generateAndShowLink,
                icon: _isGeneratingLink
                    ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Icon(Icons.link, size: 18),
                label: Text(_isGeneratingLink ? 'Generation...' : 'Generer le lien de suivi'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: PremiumTheme.primaryBlue,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ),
          ] else ...[
            // Show link
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.link, size: 16, color: PremiumTheme.primaryBlue),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _publicTrackingLink!,
                      style: const TextStyle(fontSize: 11, color: PremiumTheme.textSecondary),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  IconButton(
                    onPressed: _copyLinkToClipboard,
                    icon: const Icon(Icons.copy, size: 16, color: PremiumTheme.primaryBlue),
                    tooltip: 'Copier',
                    constraints: const BoxConstraints(),
                    padding: EdgeInsets.zero,
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // Client info
            if (clientName != null && clientName.isNotEmpty) ...[
              Text(
                'Envoyer a $clientName',
                style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: PremiumTheme.textPrimary),
              ),
              const SizedBox(height: 10),
            ] else ...[
              const Text(
                'Envoyer au client',
                style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: PremiumTheme.textPrimary),
              ),
              const SizedBox(height: 10),
            ],

            // Action buttons row
            Row(
              children: [
                // SMS
                Expanded(
                  child: ShareButton(
                    icon: Icons.sms,
                    label: 'SMS',
                    color: const Color(0xFF10B981),
                    onTap: clientPhone != null && clientPhone.isNotEmpty
                        ? () => _sendTrackingViaSMS(clientPhone)
                        : () => _sendTrackingViaSMS(null),
                  ),
                ),
                const SizedBox(width: 8),
                // WhatsApp
                Expanded(
                  child: ShareButton(
                    icon: Icons.chat,
                    label: 'WhatsApp',
                    color: const Color(0xFF25D366),
                    onTap: () => _sendTrackingViaWhatsApp(clientPhone),
                  ),
                ),
                const SizedBox(width: 8),
                // Email
                Expanded(
                  child: ShareButton(
                    icon: Icons.email,
                    label: 'Email',
                    color: const Color(0xFF3B82F6),
                    onTap: clientEmail != null && clientEmail.isNotEmpty
                        ? () => _sendTrackingViaEmail(clientEmail)
                        : () => _sendTrackingViaEmail(null),
                  ),
                ),
                const SizedBox(width: 8),
                // Share generic
                Expanded(
                  child: ShareButton(
                    icon: Icons.share,
                    label: 'Autre',
                    color: const Color(0xFF8B5CF6),
                    onTap: _shareTrackingLink,
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  bool _isGeneratingLink = false;

  Future<void> _generateAndShowLink() async {
    setState(() => _isGeneratingLink = true);
    try {
      final link = await _missionService.generatePublicTrackingLink(_mission!.id);
      if (mounted) {
        setState(() {
          _publicTrackingLink = link;
          _isGeneratingLink = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Row(children: [
              Icon(Icons.check_circle, color: Colors.white, size: 20),
              SizedBox(width: 8),
              Text('Lien de suivi genere !'),
            ]),
            backgroundColor: PremiumTheme.accentGreen,
            duration: Duration(seconds: 2),
          ),
        );
      }
    } catch (e) {
      if (!mounted) return;
      setState(() => _isGeneratingLink = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Erreur: ${ErrorHelper.cleanError(e)}'),
          backgroundColor: PremiumTheme.accentRed,
        ),
      );
    }
  }

  String _buildTrackingMessage() {
    final ref = _mission?.reference ?? '';
    return 'Bonjour,\n\n'
        'Suivez la livraison de votre vehicule en temps reel :\n\n'
        '${ref.isNotEmpty ? "Mission : $ref\n" : ""}'
        '$_publicTrackingLink\n\n'
        'ChecksFleet';
  }

  Future<void> _sendTrackingViaSMS(String? phone) async {
    final message = _buildTrackingMessage();
    final encodedMessage = Uri.encodeComponent(message);
    final uri = phone != null && phone.isNotEmpty
        ? Uri.parse('sms:$phone?body=$encodedMessage')
        : Uri.parse('sms:?body=$encodedMessage');
    try {
      await launchUrl(uri);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Impossible d\'ouvrir les SMS'), backgroundColor: Colors.orange),
      );
    }
  }

  Future<void> _sendTrackingViaWhatsApp(String? phone) async {
    final message = _buildTrackingMessage();
    final encodedMessage = Uri.encodeComponent(message);
    final Uri uri;
    if (phone != null && phone.isNotEmpty) {
      // Nettoyer le numero (enlever espaces, tirets, etc.)
      final cleanPhone = phone.replaceAll(RegExp(r'[^\d+]'), '');
      uri = Uri.parse('https://wa.me/$cleanPhone?text=$encodedMessage');
    } else {
      uri = Uri.parse('https://wa.me/?text=$encodedMessage');
    }
    try {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('WhatsApp non disponible'), backgroundColor: Colors.orange),
      );
    }
  }

  Future<void> _sendTrackingViaEmail(String? email) async {
    final ref = _mission?.reference ?? 'votre vehicule';
    final subject = Uri.encodeComponent('Suivi en temps reel - Mission $ref');
    final body = Uri.encodeComponent(_buildTrackingMessage());
    final uri = email != null && email.isNotEmpty
        ? Uri.parse('mailto:$email?subject=$subject&body=$body')
        : Uri.parse('mailto:?subject=$subject&body=$body');
    try {
      await launchUrl(uri);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Impossible d\'ouvrir l\'email'), backgroundColor: Colors.orange),
      );
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
    final message = _buildTrackingMessage();
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
