import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart' as url_launcher;
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:intl/intl.dart';
import '../../l10n/app_localizations.dart';
import '../../main.dart';
import '../../models/mission.dart';
import '../../services/mission_service.dart';
import '../../theme/premium_theme.dart';
import '../invoices/invoice_form_screen.dart';
import '../../utils/error_helper.dart';
import '../../widgets/premium/premium_widgets.dart';
import 'mission_create_screen_new.dart';
import 'mission_detail_screen.dart';
import '../inspections/inspection_departure_screen.dart';
import '../inspections/inspection_arrival_screen.dart';

class MissionsScreen extends StatefulWidget {
  const MissionsScreen({super.key});

  @override
  State<MissionsScreen> createState() => _MissionsScreenState();
}

class _MissionsScreenState extends State<MissionsScreen>
    with SingleTickerProviderStateMixin {
  final MissionService _missionService = MissionService();
  List<Mission> _missions = [];
  bool _isLoading = true;
  late TabController _tabController;
  final _joinCodeController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _tabController.addListener(() {
      if (!_tabController.indexIsChanging && mounted) setState(() {});
    });
    _loadMissions();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _joinCodeController.dispose();
    super.dispose();
  }

  Future<void> _loadMissions() async {
    if (!mounted) return;
    setState(() => _isLoading = true);
    try {
      final missions = await _missionService.getMissions();
      if (!mounted) return;
      setState(() {
        _missions = missions;
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _isLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(ErrorHelper.cleanError(e))),
      );
    }
  }

  List<Mission> _filtered(String status) =>
      _missions.where((m) => m.status == status).toList();

  // =========== STATUS HELPERS ===========
  static Color statusColor(String status) {
    switch (status) {
      case 'pending':
        return PremiumTheme.accentAmber;
      case 'in_progress':
        return PremiumTheme.primaryBlue;
      case 'completed':
        return PremiumTheme.accentGreen;
      case 'assigned':
        return PremiumTheme.primaryPurple;
      default:
        return PremiumTheme.textTertiary;
    }
  }

  static IconData statusIcon(String status) {
    switch (status) {
      case 'pending':
        return Icons.schedule_rounded;
      case 'in_progress':
        return Icons.local_shipping_rounded;
      case 'completed':
        return Icons.check_circle_rounded;
      default:
        return Icons.circle;
    }
  }

  static String statusLabel(String status) {
    switch (status) {
      case 'pending':
        return 'En attente';
      case 'in_progress':
        return 'En cours';
      case 'completed':
        return 'Terminee';
      case 'assigned':
        return 'Assignee';
      default:
        return status;
    }
  }

  // =========== BUILD ===========
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: PremiumTheme.lightBg,
      appBar: AppBar(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        title: Text(
          'Mes Convoyages',
          style: PremiumTheme.heading4.copyWith(fontSize: 20),
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(52),
          child: Container(
            decoration: BoxDecoration(
              color: Colors.white,
              border: Border(
                bottom: BorderSide(
                    color: Colors.grey.shade200, width: 1),
              ),
            ),
            child: TabBar(
              controller: _tabController,
              indicatorColor: PremiumTheme.primaryBlue,
              indicatorWeight: 3,
              labelColor: PremiumTheme.primaryBlue,
              unselectedLabelColor: PremiumTheme.textTertiary,
              labelStyle: const TextStyle(
                  fontSize: 13, fontWeight: FontWeight.w600),
              unselectedLabelStyle: const TextStyle(
                  fontSize: 13, fontWeight: FontWeight.w500),
              tabs: [
                _tabItem('En attente', _filtered('pending').length,
                    PremiumTheme.accentAmber),
                _tabItem('En cours', _filtered('in_progress').length,
                    PremiumTheme.primaryBlue),
                _tabItem('Terminees', _filtered('completed').length,
                    PremiumTheme.accentGreen),
              ],
            ),
          ),
        ),
      ),
      body: Column(
        children: [
          _buildJoinBar(),
          Expanded(
            child: _isLoading
                ? _buildLoading()
                : TabBarView(
                    controller: _tabController,
                    children: [
                      _buildMissionList('pending'),
                      _buildMissionList('in_progress'),
                      _buildMissionList('completed'),
                    ],
                  ),
          ),
        ],
      ),
    );
  }

  Widget _tabItem(String label, int count, Color color) {
    return Tab(
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(label),
          if (count > 0) ...[
            const SizedBox(width: 6),
            Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                '$count',
                style: TextStyle(
                    color: color,
                    fontSize: 11,
                    fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ],
      ),
    );
  }

  // =========== JOIN BAR ===========
  Widget _buildJoinBar() {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 12, 16, 4),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE5E7EB)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: PremiumTheme.primaryPurple.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(Icons.qr_code_rounded,
                color: PremiumTheme.primaryPurple, size: 20),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: TextField(
              controller: _joinCodeController,
              style: PremiumTheme.body.copyWith(fontSize: 14),
              textCapitalization: TextCapitalization.characters,
              decoration: InputDecoration(
                hintText: 'Code de mission...',
                hintStyle: PremiumTheme.bodySmall
                    .copyWith(color: PremiumTheme.textTertiary),
                border: InputBorder.none,
                isDense: true,
                contentPadding:
                    const EdgeInsets.symmetric(vertical: 8),
              ),
            ),
          ),
          const SizedBox(width: 8),
          ElevatedButton(
            onPressed: _joinByCode,
            style: ElevatedButton.styleFrom(
              backgroundColor: PremiumTheme.primaryPurple,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(
                  horizontal: 18, vertical: 10),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10)),
              elevation: 0,
            ),
            child: const Text('Rejoindre',
                style: TextStyle(
                    fontWeight: FontWeight.w600, fontSize: 13)),
          ),
        ],
      ),
    );
  }

  Future<void> _joinByCode() async {
    final code = _joinCodeController.text.trim();
    if (code.isEmpty) return;
    try {
      await _missionService.joinMissionByShareCode(code);
      _joinCodeController.clear();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Mission rejointe avec succes !'),
          backgroundColor: PremiumTheme.accentGreen,
        ),
      );
      _loadMissions();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(ErrorHelper.cleanError(e)),
          backgroundColor: PremiumTheme.accentRed,
        ),
      );
    }
  }

  // =========== LOADING ===========
  Widget _buildLoading() {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: List.generate(
          3,
          (_) => Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: ShimmerLoading(
                width: double.infinity, height: 120),
          ),
        ),
      ),
    );
  }

  // =========== LIST ===========
  Widget _buildMissionList(String status) {
    final missions = _filtered(status);
    if (missions.isEmpty) {
      return _buildEmpty(status);
    }
    return RefreshIndicator(
      onRefresh: _loadMissions,
      backgroundColor: Colors.white,
      color: PremiumTheme.primaryBlue,
      child: ListView.builder(
        padding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        itemCount: missions.length,
        itemBuilder: (_, i) => FadeInAnimation(
          delay: Duration(milliseconds: 50 * i.clamp(0, 8)),
          child: _MissionTile(
            mission: missions[i],
            onTap: () => _openDetail(missions[i]),
            onAction: () => _handleAction(missions[i]),
            onReport: missions[i].status == 'completed'
                ? () => _viewReport(missions[i])
                : null,
            onInvoice: missions[i].status == 'completed'
                ? () => _createInvoice(missions[i])
                : null,
          ),
        ),
      ),
    );
  }

  Widget _buildEmpty(String status) {
    final color = statusColor(status);
    final icon = statusIcon(status);
    final label = status == 'pending'
        ? 'Aucune mission en attente'
        : status == 'in_progress'
            ? 'Aucune mission en cours'
            : 'Aucune mission terminee';
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.08),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, size: 48, color: color.withValues(alpha: 0.5)),
          ),
          const SizedBox(height: 16),
          Text(label,
              style: PremiumTheme.bodySmall
                  .copyWith(fontSize: 15, color: PremiumTheme.textTertiary)),
          const SizedBox(height: 8),
          Text('Tirez vers le bas pour actualiser',
              style: PremiumTheme.caption),
        ],
      ),
    );
  }

  // =========== NAVIGATION ===========
  void _openDetail(Mission mission) {
    Navigator.push(
      context,
      MaterialPageRoute(
          builder: (_) => MissionDetailScreen(missionId: mission.id)),
    ).then((_) => _loadMissions());
  }

  // =========== ACTIONS ===========
  Future<void> _handleAction(Mission mission) async {
    if (mission.status == 'pending') {
      try {
        final existing = await supabase
            .from('vehicle_inspections')
            .select('id')
            .eq('mission_id', mission.id)
            .eq('inspection_type', 'departure')
            .maybeSingle();
        if (existing != null) {
          if (!mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
                content: const Text('Inspection de depart deja validee'),
                backgroundColor: PremiumTheme.accentAmber),
          );
          return;
        }
        if (!mounted) return;
        Navigator.push(
          context,
          MaterialPageRoute(
              builder: (_) =>
                  InspectionDepartureScreen(missionId: mission.id)),
        ).then((_) => _loadMissions());
      } catch (e) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text(ErrorHelper.cleanError(e)),
              backgroundColor: PremiumTheme.accentRed),
        );
      }
    } else if (mission.status == 'in_progress') {
      try {
        final existing = await supabase
            .from('vehicle_inspections')
            .select('id')
            .eq('mission_id', mission.id)
            .eq('inspection_type', 'arrival')
            .maybeSingle();
        if (existing != null) {
          if (!mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
                content: const Text("Inspection d'arrivee deja validee"),
                backgroundColor: PremiumTheme.accentAmber),
          );
          return;
        }
        if (!mounted) return;
        Navigator.push(
          context,
          MaterialPageRoute(
              builder: (_) =>
                  InspectionArrivalScreen(missionId: mission.id)),
        ).then((_) => _loadMissions());
      } catch (e) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text(ErrorHelper.cleanError(e)),
              backgroundColor: PremiumTheme.accentRed),
        );
      }
    }
  }

  // =========== CREER FACTURE ===========
  void _createInvoice(Mission mission) {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const InvoiceFormScreen()),
    );
  }

  // =========== VOIR LE RAPPORT (CORRIGE) ===========
  Future<void> _viewReport(Mission mission) async {
    try {
      final inspection = await supabase
          .from('vehicle_inspections')
          .select('id')
          .eq('mission_id', mission.id)
          .order('created_at', ascending: false)
          .limit(1)
          .maybeSingle();

      if (inspection == null) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: const Text(
                  'Aucune inspection trouvee pour cette mission'),
              backgroundColor: PremiumTheme.accentAmber),
        );
        return;
      }

      final shareRow = await supabase
          .from('inspection_report_shares')
          .select('share_token')
          .eq('mission_id', mission.id)
          .maybeSingle();

      String? shareToken = shareRow?['share_token'] as String?;

      if (shareToken == null || shareToken.isEmpty) {
        shareToken =
            '${DateTime.now().millisecondsSinceEpoch}';
        final userId = supabase.auth.currentUser?.id;
        await supabase.from('inspection_report_shares').insert({
          'mission_id': mission.id,
          'user_id': userId,
          'share_token': shareToken,
          'report_type': 'complete',
        });
      }

      final url =
          'https://www.checksfleet.com/rapport-inspection/$shareToken';
      final uri = Uri.parse(url);

      try {
        await url_launcher.launchUrl(uri,
            mode: url_launcher.LaunchMode.externalApplication);
      } catch (_) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: const Text("Impossible d'ouvrir le navigateur"),
              backgroundColor: PremiumTheme.accentRed),
        );
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
            content: Text('Erreur: ${ErrorHelper.cleanError(e)}'),
            backgroundColor: PremiumTheme.accentRed),
      );
    }
  }
}

// ============================================================
//  MISSION TILE — carte moderne, theme clair
// ============================================================
class _MissionTile extends StatelessWidget {
  final Mission mission;
  final VoidCallback onTap;
  final VoidCallback onAction;
  final VoidCallback? onReport;
  final VoidCallback? onInvoice;

  const _MissionTile({
    required this.mission,
    required this.onTap,
    required this.onAction,
    this.onReport,
    this.onInvoice,
  });

  @override
  Widget build(BuildContext context) {
    final color = _MissionsScreenState.statusColor(mission.status);
    final df = DateFormat('dd MMM yyyy', 'fr_FR');

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE5E7EB)),
        boxShadow: [
          BoxShadow(
            color: color.withValues(alpha: 0.08),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(16),
          child: Column(
            children: [
              // ---- Header: ref + badge + chevron ----
              Container(
                padding: const EdgeInsets.fromLTRB(16, 14, 12, 10),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.04),
                  borderRadius: const BorderRadius.vertical(
                      top: Radius.circular(16)),
                ),
                child: Row(
                  children: [
                    // Status dot
                    Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                        color: color,
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: color.withValues(alpha: 0.4),
                            blurRadius: 4,
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 10),
                    // Reference
                    Expanded(
                      child: Text(
                        mission.reference ?? 'Mission',
                        style: PremiumTheme.label.copyWith(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    // Status badge
                    _badge(color),
                    const SizedBox(width: 6),
                    Icon(Icons.chevron_right_rounded,
                        color: PremiumTheme.textTertiary, size: 22),
                  ],
                ),
              ),
              // ---- Body ----
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 14),
                child: Column(
                  children: [
                    // Vehicle row
                    _vehicleRow(),
                    const SizedBox(height: 12),
                    // Route
                    _routeRow(),
                    // Mandataire + date
                    if (mission.mandataireName != null &&
                        mission.mandataireName!.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(top: 10),
                        child: _mandataireRow(),
                      ),
                    // Price + date row
                    Padding(
                      padding: const EdgeInsets.only(top: 10),
                      child: _infoRow(),
                    ),
                    // Action buttons
                    const SizedBox(height: 12),
                    _actions(context, color),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _badge(Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            _MissionsScreenState.statusIcon(mission.status),
            size: 12,
            color: color,
          ),
          const SizedBox(width: 4),
          Text(
            _MissionsScreenState.statusLabel(mission.status),
            style: TextStyle(
                color: color,
                fontSize: 11,
                fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }

  Widget _vehicleRow() {
    final hasVehicle = mission.vehicleBrand != null ||
        mission.vehicleModel != null;
    if (!hasVehicle) return const SizedBox.shrink();
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(6),
          decoration: BoxDecoration(
            color: PremiumTheme.primaryTeal.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(Icons.directions_car_rounded,
              color: PremiumTheme.primaryTeal, size: 18),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Text(
            '${mission.vehicleBrand ?? ''} ${mission.vehicleModel ?? ''}'
                .trim(),
            style: PremiumTheme.body.copyWith(
              fontWeight: FontWeight.w600,
              fontSize: 14,
            ),
          ),
        ),
        if (mission.vehiclePlate != null)
          Container(
            padding:
                const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: const Color(0xFFF3F4F6),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: const Color(0xFFE5E7EB)),
            ),
            child: Text(
              mission.vehiclePlate!,
              style: PremiumTheme.caption.copyWith(
                fontWeight: FontWeight.w700,
                letterSpacing: 1.2,
                color: PremiumTheme.textPrimary,
                fontSize: 12,
              ),
            ),
          ),
      ],
    );
  }

  Widget _routeRow() {
    final from =
        mission.pickupCity ?? mission.pickupAddress ?? 'Depart';
    final to = mission.deliveryCity ??
        mission.deliveryAddress ??
        'Arrivee';
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: Row(
        children: [
          // From
          _routeDot(PremiumTheme.accentGreen),
          const SizedBox(width: 8),
          Expanded(
            child: Text(from,
                style: PremiumTheme.bodySmall
                    .copyWith(fontSize: 13, fontWeight: FontWeight.w500),
                maxLines: 1,
                overflow: TextOverflow.ellipsis),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8),
            child: Icon(Icons.arrow_forward_rounded,
                color: PremiumTheme.textTertiary, size: 16),
          ),
          // To
          _routeDot(PremiumTheme.primaryBlue),
          const SizedBox(width: 8),
          Expanded(
            child: Text(to,
                style: PremiumTheme.bodySmall
                    .copyWith(fontSize: 13, fontWeight: FontWeight.w500),
                maxLines: 1,
                overflow: TextOverflow.ellipsis),
          ),
        ],
      ),
    );
  }

  Widget _routeDot(Color color) {
    return Container(
      width: 10,
      height: 10,
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.2),
        shape: BoxShape.circle,
        border: Border.all(color: color, width: 2),
      ),
    );
  }

  Widget _mandataireRow() {
    return Row(
      children: [
        Icon(Icons.person_outline_rounded,
            color: PremiumTheme.primaryPurple, size: 16),
        const SizedBox(width: 6),
        Text(
          mission.mandataireName!,
          style: PremiumTheme.bodySmall.copyWith(
            color: PremiumTheme.primaryPurple,
            fontWeight: FontWeight.w500,
            fontSize: 13,
          ),
        ),
        if (mission.mandataireCompany != null &&
            mission.mandataireCompany!.isNotEmpty) ...[
          Text(' — ',
              style: PremiumTheme.caption
                  .copyWith(color: PremiumTheme.textTertiary)),
          Flexible(
            child: Text(
              mission.mandataireCompany!,
              style: PremiumTheme.caption
                  .copyWith(color: PremiumTheme.textSecondary),
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ],
    );
  }

  Widget _infoRow() {
    final df = DateFormat('dd/MM/yy');
    return Row(
      children: [
        if (mission.pickupDate != null) ...[
          Icon(Icons.calendar_today_rounded,
              size: 13, color: PremiumTheme.textTertiary),
          const SizedBox(width: 4),
          Text(
            df.format(mission.pickupDate!),
            style: PremiumTheme.caption
                .copyWith(fontSize: 12, color: PremiumTheme.textSecondary),
          ),
        ],
        const Spacer(),
        if (mission.price != null && mission.price! > 0)
          Container(
            padding:
                const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: PremiumTheme.accentGreen.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                  color:
                      PremiumTheme.accentGreen.withValues(alpha: 0.25)),
            ),
            child: Text(
              '${mission.price!.toStringAsFixed(0)} EUR',
              style: TextStyle(
                color: PremiumTheme.accentGreen,
                fontWeight: FontWeight.w700,
                fontSize: 13,
              ),
            ),
          ),
      ],
    );
  }

  Widget _actions(BuildContext context, Color color) {
    return Row(
      children: [
        if (mission.status == 'pending')
          Expanded(
            child: _actionButton(
              icon: Icons.play_arrow_rounded,
              label: 'Inspection depart',
              color: PremiumTheme.primaryTeal,
              onTap: onAction,
            ),
          ),
        if (mission.status == 'in_progress')
          Expanded(
            child: _actionButton(
              icon: Icons.flag_rounded,
              label: 'Inspection arrivee',
              color: PremiumTheme.primaryBlue,
              onTap: onAction,
            ),
          ),
        if (mission.status == 'completed' && onReport != null) ...[
          Expanded(
            child: _actionButton(
              icon: Icons.description_rounded,
              label: 'Voir rapport',
              color: PremiumTheme.primaryBlue,
              onTap: onReport!,
            ),
          ),
          const SizedBox(width: 6),
        ],
        if (mission.status == 'completed' && onInvoice != null)
          Expanded(
            child: _actionButton(
              icon: Icons.receipt_long_rounded,
              label: 'Facture',
              color: PremiumTheme.accentGreen,
              onTap: onInvoice!,
            ),
          ),
        const SizedBox(width: 8),
        _actionButton(
          icon: Icons.open_in_new_rounded,
          label: 'Details',
          color: PremiumTheme.textSecondary,
          onTap: onTap,
          outlined: true,
        ),
      ],
    );
  }

  Widget _actionButton({
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback onTap,
    bool outlined = false,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding:
            const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: outlined
              ? Colors.transparent
              : color.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: outlined
                ? const Color(0xFFE5E7EB)
                : color.withValues(alpha: 0.2),
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          mainAxisSize: outlined ? MainAxisSize.min : MainAxisSize.max,
          children: [
            Icon(icon, color: color, size: 16),
            const SizedBox(width: 5),
            Text(
              label,
              style: TextStyle(
                  color: color,
                  fontSize: 12,
                  fontWeight: FontWeight.w600),
            ),
          ],
        ),
      ),
    );
  }
}

