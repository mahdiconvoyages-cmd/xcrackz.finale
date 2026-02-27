import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart' as url_launcher;
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:intl/intl.dart';
import '../../models/mission.dart';
import '../../services/mission_service.dart';
import '../../theme/premium_theme.dart';
import '../invoices/invoice_form_screen.dart';
import '../../utils/error_helper.dart';
import '../../widgets/premium/premium_widgets.dart';
import 'mission_detail_screen.dart';
import '../inspections/inspection_departure_screen.dart';
import '../inspections/inspection_arrival_screen.dart';
import '../../widgets/empty_state_widget.dart';
import '../../utils/logger.dart';

class MissionsScreen extends StatefulWidget {
  const MissionsScreen({super.key});

  @override
  State<MissionsScreen> createState() => _MissionsScreenState();
}

class _MissionsScreenState extends State<MissionsScreen>
    with SingleTickerProviderStateMixin {
  final MissionService _missionService = MissionService();
  final supabase = Supabase.instance.client;
  List<Mission> _missions = [];
  bool _isLoading = true;
  bool _isLoadingMore = false;
  bool _hasMore = true;
  static const int _pageSize = 50;
  late TabController _tabController;
  final _joinCodeController = TextEditingController();
  final _searchController = TextEditingController();
  String _searchQuery = '';
  RealtimeChannel? _missionsChannel;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _tabController.addListener(() {
      if (!_tabController.indexIsChanging && mounted) setState(() {});
    });
    _loadMissions();
    _subscribeRealtime();
  }

  void _subscribeRealtime() {
    final userId = supabase.auth.currentUser?.id;
    if (userId == null) return;
    _missionsChannel = supabase
        .channel('missions_realtime')
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'missions',
          filter: PostgresChangeFilter(
            type: PostgresChangeFilterType.eq,
            column: 'user_id',
            value: userId,
          ),
          callback: (payload) {
            logger.d('🔄 Realtime missions update (owner): ${payload.eventType}');
            _loadMissions();
          },
        )
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'missions',
          filter: PostgresChangeFilter(
            type: PostgresChangeFilterType.eq,
            column: 'assigned_user_id',
            value: userId,
          ),
          callback: (payload) {
            logger.d('🔄 Realtime missions update (assigned): ${payload.eventType}');
            _loadMissions();
          },
        )
        .subscribe();
  }

  @override
  void dispose() {
    _missionsChannel?.unsubscribe();
    _tabController.dispose();
    _joinCodeController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadMissions() async {
    if (!mounted) return;
    setState(() {
      _isLoading = true;
      _hasMore = true;
    });
    try {
      final missions = await _missionService.getMissions(limit: _pageSize);
      if (!mounted) return;
      setState(() {
        _missions = missions;
        _hasMore = missions.length >= _pageSize;
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

  Future<void> _loadMoreMissions() async {
    if (_isLoadingMore || !_hasMore) return;
    setState(() => _isLoadingMore = true);
    try {
      final more = await _missionService.getMissions(
        limit: _pageSize,
        offset: _missions.length,
      );
      if (!mounted) return;
      setState(() {
        _missions.addAll(more);
        _hasMore = more.length >= _pageSize;
        _isLoadingMore = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _isLoadingMore = false);
    }
  }

  List<Mission> _filtered(String status) {
    var list = _missions.where((m) => m.status == status).toList();
    if (_searchQuery.isNotEmpty) {
      final q = _searchQuery.toLowerCase();
      list = list.where((m) {
        return (m.reference ?? '').toLowerCase().contains(q) ||
            (m.mandataireCompany ?? '').toLowerCase().contains(q) ||
            (m.mandataireName ?? '').toLowerCase().contains(q) ||
            (m.pickupCity ?? '').toLowerCase().contains(q) ||
            (m.deliveryCity ?? '').toLowerCase().contains(q) ||
            (m.pickupAddress ?? '').toLowerCase().contains(q) ||
            (m.deliveryAddress ?? '').toLowerCase().contains(q) ||
            (m.vehicleBrand ?? '').toLowerCase().contains(q) ||
            (m.vehicleModel ?? '').toLowerCase().contains(q) ||
            (m.vehiclePlate ?? '').toLowerCase().contains(q);
      }).toList();
    }
    return list;
  }

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
          _buildSearchBar(),
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

  // =========== SEARCH BAR ===========
  Widget _buildSearchBar() {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: TextField(
        controller: _searchController,
        style: PremiumTheme.body.copyWith(fontSize: 14),
        decoration: InputDecoration(
          hintText: 'Rechercher (ref, ville, immat...)',
          hintStyle: PremiumTheme.bodySmall.copyWith(color: PremiumTheme.textTertiary),
          prefixIcon: const Icon(Icons.search, size: 20, color: Colors.grey),
          suffixIcon: _searchQuery.isNotEmpty
              ? IconButton(
                  icon: const Icon(Icons.clear, size: 18),
                  onPressed: () {
                    _searchController.clear();
                    setState(() => _searchQuery = '');
                  },
                )
              : null,
          border: InputBorder.none,
          isDense: true,
          contentPadding: const EdgeInsets.symmetric(vertical: 12),
        ),
        onChanged: (val) => setState(() => _searchQuery = val),
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
        itemCount: missions.length + (_hasMore ? 1 : 0),
        itemBuilder: (_, i) {
          if (i == missions.length) {
            // "Load more" button
            return Padding(
              padding: const EdgeInsets.symmetric(vertical: 16),
              child: Center(
                child: _isLoadingMore
                    ? const CircularProgressIndicator()
                    : TextButton.icon(
                        onPressed: _loadMoreMissions,
                        icon: const Icon(Icons.expand_more_rounded),
                        label: const Text('Charger plus'),
                      ),
              ),
            );
          }
          return FadeInAnimation(
          delay: Duration(milliseconds: 50 * i.clamp(0, 8)),
          child: _MissionTile(
            mission: missions[i],
            onTap: () => _openDetail(missions[i]),
            onAction: () => _handleAction(missions[i]),
            onViewDepartureReport: missions[i].status == 'in_progress'
                ? () => _viewReport(missions[i])
                : null,
            onReport: missions[i].status == 'completed'
                ? () => _viewReport(missions[i])
                : null,
            onInvoice: missions[i].status == 'completed'
                ? () => _createInvoice(missions[i])
                : null,
          ),
        );
        },
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
            : 'Aucune mission terminée';
    return EmptyStateWidget(
      icon: icon,
      color: color,
      title: label,
      subtitle: 'Tirez vers le bas pour actualiser',
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
      // Mission en attente → Vérifier date puis ouvrir inspection de départ
      try {
        // Vérifier si la mission est prévue pour aujourd'hui
        if (mission.pickupDate != null) {
          final now = DateTime.now();
          final pickup = mission.pickupDate!;
          final isToday = pickup.year == now.year &&
              pickup.month == now.month &&
              pickup.day == now.day;
          if (!isToday) {
            if (!mounted) return;
            final confirm = await showDialog<bool>(
              context: context,
              builder: (_) => AlertDialog(
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16)),
                title: const Text('Date differente'),
                content: Text(
                    'Cette mission est prevue pour le ${DateFormat('dd/MM/yyyy').format(pickup)}, '
                    'pas pour aujourd\'hui.\n\nVoulez-vous continuer quand meme ?'),
                actions: [
                  TextButton(
                    onPressed: () => Navigator.pop(context, false),
                    child: const Text('Non'),
                  ),
                  ElevatedButton(
                    onPressed: () => Navigator.pop(context, true),
                    style: ElevatedButton.styleFrom(
                        backgroundColor: PremiumTheme.primaryBlue),
                    child: const Text('Oui, continuer',
                        style: TextStyle(color: Colors.white)),
                  ),
                ],
              ),
            );
            if (confirm != true) return;
            if (!mounted) return;
          }
        }

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
        // La mission passera en in_progress uniquement après soumission de l'inspection de départ
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
      // Mission en cours → Vérifier si inspection depart faite d'abord
      try {
        final depExists = await supabase
            .from('vehicle_inspections')
            .select('id')
            .eq('mission_id', mission.id)
            .eq('inspection_type', 'departure')
            .maybeSingle();

        if (depExists == null) {
          // Inspection de depart pas encore faite → l'ouvrir
          if (!mounted) return;
          Navigator.push(
            context,
            MaterialPageRoute(
                builder: (_) =>
                    InspectionDepartureScreen(missionId: mission.id)),
          ).then((_) => _loadMissions());
          return;
        }

        // Inspection depart faite → ouvrir inspection arrivee
        final arrExists = await supabase
            .from('vehicle_inspections')
            .select('id')
            .eq('mission_id', mission.id)
            .eq('inspection_type', 'arrival')
            .maybeSingle();
        if (arrExists != null) {
          // Arrivée faite → vérifier si restitution requise
          if (mission.hasRestitution) {
            // Check restitution inspections
            final restDepExists = await supabase
                .from('vehicle_inspections')
                .select('id')
                .eq('mission_id', mission.id)
                .eq('inspection_type', 'restitution_departure')
                .maybeSingle();
            if (restDepExists == null) {
              // Open restitution departure
              if (!mounted) return;
              Navigator.push(
                context,
                MaterialPageRoute(
                    builder: (_) =>
                        InspectionDepartureScreen(missionId: mission.id, isRestitution: true)),
              ).then((_) => _loadMissions());
              return;
            }
            final restArrExists = await supabase
                .from('vehicle_inspections')
                .select('id')
                .eq('mission_id', mission.id)
                .eq('inspection_type', 'restitution_arrival')
                .maybeSingle();
            if (restArrExists == null) {
              // Open restitution arrival
              if (!mounted) return;
              Navigator.push(
                context,
                MaterialPageRoute(
                    builder: (_) =>
                        InspectionArrivalScreen(missionId: mission.id, isRestitution: true)),
              ).then((_) => _loadMissions());
              return;
            }
          }
          if (!mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
                content: const Text("Toutes les inspections sont terminées"),
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
      MaterialPageRoute(builder: (_) => InvoiceFormScreen(mission: mission)),
    );
  }

  // =========== VOIR LE RAPPORT (CORRIGE) ===========
  Future<void> _viewReport(Mission mission) async {
    try {
      // Déterminer le type de rapport selon le statut
      final reportType = mission.status == 'completed' ? 'arrival' : 'departure';

      final inspection = await supabase
          .from('vehicle_inspections')
          .select('id')
          .eq('mission_id', mission.id)
          .eq('inspection_type', reportType)
          .maybeSingle();

      if (inspection == null) {
        // Fallback: chercher n'importe quelle inspection
        final anyInspection = await supabase
            .from('vehicle_inspections')
            .select('id')
            .eq('mission_id', mission.id)
            .order('created_at', ascending: false)
            .limit(1)
            .maybeSingle();
        if (anyInspection == null) {
          if (!mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
                content: const Text(
                    'Aucune inspection trouvee pour cette mission'),
                backgroundColor: PremiumTheme.accentAmber),
          );
          return;
        }
      }

      // Chercher le share token du bon type
      final shareRow = await supabase
          .from('inspection_report_shares')
          .select('share_token')
          .eq('mission_id', mission.id)
          .eq('report_type', reportType)
          .maybeSingle();

      String? shareToken = shareRow?['share_token'] as String?;

      // Fallback: chercher departure si arrival pas trouvé
      if (shareToken == null && reportType == 'arrival') {
        final fallbackRow = await supabase
            .from('inspection_report_shares')
            .select('share_token')
            .eq('mission_id', mission.id)
            .eq('report_type', 'departure')
            .maybeSingle();
        shareToken = fallbackRow?['share_token'] as String?;
      }

      if (shareToken == null || shareToken.isEmpty) {
        shareToken =
            '${DateTime.now().millisecondsSinceEpoch.toRadixString(36)}${mission.id.substring(0, 8)}';
        final userId = supabase.auth.currentUser?.id;
        await supabase.from('inspection_report_shares').upsert({
          'mission_id': mission.id,
          'user_id': userId,
          'share_token': shareToken,
          'report_type': reportType,
          'is_active': true,
        }, onConflict: 'mission_id,report_type');
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
//  MISSION TILE — carte premium avec accent latéral
// ============================================================
class _MissionTile extends StatelessWidget {
  final Mission mission;
  final VoidCallback onTap;
  final VoidCallback onAction;
  final VoidCallback? onReport;
  final VoidCallback? onViewDepartureReport;
  final VoidCallback? onInvoice;

  const _MissionTile({
    required this.mission,
    required this.onTap,
    required this.onAction,
    this.onReport,
    this.onViewDepartureReport,
    this.onInvoice,
  });

  @override
  Widget build(BuildContext context) {
    final color = _MissionsScreenState.statusColor(mission.status);
    final df = DateFormat('dd MMM yyyy', 'fr_FR');

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        boxShadow: [
          BoxShadow(
            color: color.withValues(alpha: 0.10),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(18),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(18),
          child: IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // ── Left accent stripe ──
                Container(
                  width: 5,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [color, color.withValues(alpha: 0.4)],
                    ),
                    borderRadius: const BorderRadius.only(
                      topLeft: Radius.circular(18),
                      bottomLeft: Radius.circular(18),
                    ),
                  ),
                ),
                // ── Card body ──
                Expanded(
                  child: Column(
                    children: [
                      // ── Header ──
                      Container(
                        padding: const EdgeInsets.fromLTRB(14, 12, 12, 10),
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: [
                              color.withValues(alpha: 0.06),
                              Colors.white,
                            ],
                            begin: Alignment.centerLeft,
                            end: Alignment.centerRight,
                          ),
                          borderRadius: const BorderRadius.only(
                            topRight: Radius.circular(18),
                          ),
                        ),
                        child: Row(
                          children: [
                            // Animated status indicator
                            Container(
                              width: 32,
                              height: 32,
                              decoration: BoxDecoration(
                                gradient: LinearGradient(
                                  colors: [color, color.withValues(alpha: 0.7)],
                                ),
                                borderRadius: BorderRadius.circular(10),
                                boxShadow: [
                                  BoxShadow(
                                    color: color.withValues(alpha: 0.30),
                                    blurRadius: 8,
                                    offset: const Offset(0, 2),
                                  ),
                                ],
                              ),
                              child: Icon(
                                _MissionsScreenState.statusIcon(mission.status),
                                size: 16,
                                color: Colors.white,
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    mission.reference ?? 'Mission',
                                    style: PremiumTheme.label.copyWith(
                                      fontSize: 15,
                                      fontWeight: FontWeight.w800,
                                      letterSpacing: 0.3,
                                    ),
                                  ),
                                  if (mission.pickupDate != null)
                                    Padding(
                                      padding: const EdgeInsets.only(top: 2),
                                      child: Text(
                                        df.format(mission.pickupDate!),
                                        style: PremiumTheme.caption.copyWith(
                                          fontSize: 11,
                                          color: PremiumTheme.textTertiary,
                                        ),
                                      ),
                                    ),
                                ],
                              ),
                            ),
                            _badge(color),
                            const SizedBox(width: 4),
                            Container(
                              padding: const EdgeInsets.all(4),
                              decoration: BoxDecoration(
                                color: Colors.grey.shade100,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Icon(Icons.chevron_right_rounded,
                                  color: PremiumTheme.textTertiary, size: 18),
                            ),
                          ],
                        ),
                      ),
                      // ── Body ──
                      Padding(
                        padding: const EdgeInsets.fromLTRB(14, 10, 14, 12),
                        child: Column(
                          children: [
                            // Vehicle row
                            _vehicleRow(),
                            const SizedBox(height: 10),
                            // Restitution badge
                            if (mission.hasRestitution)
                              Padding(
                                padding: const EdgeInsets.only(bottom: 10),
                                child: _restitutionBadge(),
                              ),
                            // Route (vertical timeline)
                            _routeTimeline(),
                            // Mandataire
                            if (mission.mandataireName != null &&
                                mission.mandataireName!.isNotEmpty)
                              Padding(
                                padding: const EdgeInsets.only(top: 10),
                                child: _mandataireRow(),
                              ),
                            // Price row
                            if (mission.price != null && mission.price! > 0)
                              Padding(
                                padding: const EdgeInsets.only(top: 10),
                                child: _priceRow(),
                              ),
                            // Actions
                            const SizedBox(height: 12),
                            _actions(context, color),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _badge(Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [color.withValues(alpha: 0.15), color.withValues(alpha: 0.08)],
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.25)),
      ),
      child: Text(
        _MissionsScreenState.statusLabel(mission.status),
        style: TextStyle(
            color: color,
            fontSize: 11,
            fontWeight: FontWeight.w700),
      ),
    );
  }

  Widget _vehicleRow() {
    final hasVehicle = mission.vehicleBrand != null ||
        mission.vehicleModel != null;
    if (!hasVehicle) return const SizedBox.shrink();
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            PremiumTheme.primaryTeal.withValues(alpha: 0.06),
            PremiumTheme.primaryTeal.withValues(alpha: 0.02),
          ],
        ),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: PremiumTheme.primaryTeal.withValues(alpha: 0.12)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [PremiumTheme.primaryTeal, PremiumTheme.primaryTeal.withValues(alpha: 0.7)],
              ),
              borderRadius: BorderRadius.circular(10),
              boxShadow: [
                BoxShadow(
                  color: PremiumTheme.primaryTeal.withValues(alpha: 0.25),
                  blurRadius: 6,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: const Icon(Icons.directions_car_rounded,
                color: Colors.white, size: 18),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${mission.vehicleBrand ?? ''} ${mission.vehicleModel ?? ''}'
                      .trim(),
                  style: PremiumTheme.body.copyWith(
                    fontWeight: FontWeight.w700,
                    fontSize: 14,
                  ),
                ),
                if (mission.vehicleType != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 2),
                    child: Text(
                      mission.vehicleType!,
                      style: PremiumTheme.caption.copyWith(
                        fontSize: 11,
                        color: PremiumTheme.textTertiary,
                      ),
                    ),
                  ),
              ],
            ),
          ),
          if (mission.vehiclePlate != null)
            Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFFD1D5DB), width: 1.5),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.04),
                    blurRadius: 4,
                    offset: const Offset(0, 1),
                  ),
                ],
              ),
              child: Text(
                mission.vehiclePlate!,
                style: PremiumTheme.caption.copyWith(
                  fontWeight: FontWeight.w800,
                  letterSpacing: 1.3,
                  color: PremiumTheme.textPrimary,
                  fontSize: 12,
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _restitutionBadge() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [const Color(0xFFFFF3E0), const Color(0xFFFFF8E1)],
        ),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFFE65100).withValues(alpha: 0.25)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              color: const Color(0xFFE65100).withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(6),
            ),
            child: const Icon(Icons.swap_horiz_rounded, size: 16, color: Color(0xFFE65100)),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Aller-Retour (Restitution)',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFFE65100),
                  ),
                ),
                if (mission.restitutionVehicleBrand != null || mission.restitutionVehiclePlate != null || mission.vehicleBrand != null || mission.vehiclePlate != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 3),
                    child: Text(
                      [
                        mission.restitutionVehicleBrand ?? mission.vehicleBrand,
                        mission.restitutionVehicleModel ?? mission.vehicleModel,
                        if (mission.restitutionVehiclePlate != null || mission.vehiclePlate != null)
                          '· ${mission.restitutionVehiclePlate ?? mission.vehiclePlate}',
                      ].where((e) => e != null).join(' '),
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w500,
                        color: const Color(0xFFE65100).withValues(alpha: 0.8),
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _routeTimeline() {
    final from = mission.pickupCity ?? mission.pickupAddress ?? 'Depart';
    final to = mission.deliveryCity ?? mission.deliveryAddress ?? 'Arrivee';
    final fromName = mission.pickupContactName;
    final toName = mission.deliveryContactName;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: Column(
        children: [
          // Departure point
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Column(
                children: [
                  Container(
                    width: 24,
                    height: 24,
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [PremiumTheme.accentGreen, PremiumTheme.accentGreen.withValues(alpha: 0.7)],
                      ),
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: PremiumTheme.accentGreen.withValues(alpha: 0.30),
                          blurRadius: 6,
                        ),
                      ],
                    ),
                    child: const Icon(Icons.arrow_upward_rounded, size: 14, color: Colors.white),
                  ),
                  // Dashed line
                  Container(
                    width: 2,
                    height: 20,
                    margin: const EdgeInsets.symmetric(vertical: 4),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          PremiumTheme.accentGreen.withValues(alpha: 0.4),
                          PremiumTheme.primaryBlue.withValues(alpha: 0.4),
                        ],
                      ),
                      borderRadius: BorderRadius.circular(1),
                    ),
                  ),
                ],
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('DÉPART',
                      style: TextStyle(
                        fontSize: 9,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 1.2,
                        color: PremiumTheme.accentGreen,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(from,
                        style: PremiumTheme.body.copyWith(
                            fontSize: 13, fontWeight: FontWeight.w600),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis),
                    if (fromName != null && fromName.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(top: 3),
                        child: Row(
                          children: [
                            Icon(Icons.person_rounded,
                                color: PremiumTheme.accentGreen.withValues(alpha: 0.6), size: 12),
                            const SizedBox(width: 4),
                            Expanded(
                              child: Text(fromName,
                                  style: PremiumTheme.caption.copyWith(
                                    fontSize: 11,
                                    color: PremiumTheme.textSecondary,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis),
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ),
          // Arrival point
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 24,
                height: 24,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [PremiumTheme.primaryBlue, PremiumTheme.primaryBlue.withValues(alpha: 0.7)],
                  ),
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: PremiumTheme.primaryBlue.withValues(alpha: 0.30),
                      blurRadius: 6,
                    ),
                  ],
                ),
                child: const Icon(Icons.arrow_downward_rounded, size: 14, color: Colors.white),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('ARRIVÉE',
                      style: TextStyle(
                        fontSize: 9,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 1.2,
                        color: PremiumTheme.primaryBlue,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(to,
                        style: PremiumTheme.body.copyWith(
                            fontSize: 13, fontWeight: FontWeight.w600),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis),
                    if (toName != null && toName.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(top: 3),
                        child: Row(
                          children: [
                            Icon(Icons.person_rounded,
                                color: PremiumTheme.primaryBlue.withValues(alpha: 0.6), size: 12),
                            const SizedBox(width: 4),
                            Expanded(
                              child: Text(toName,
                                  style: PremiumTheme.caption.copyWith(
                                    fontSize: 11,
                                    color: PremiumTheme.textSecondary,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis),
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _mandataireRow() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: PremiumTheme.primaryPurple.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        children: [
          Icon(Icons.business_rounded,
              color: PremiumTheme.primaryPurple, size: 16),
          const SizedBox(width: 8),
          Text(
            mission.mandataireName!,
            style: PremiumTheme.bodySmall.copyWith(
              color: PremiumTheme.primaryPurple,
              fontWeight: FontWeight.w600,
              fontSize: 12,
            ),
          ),
          if (mission.mandataireCompany != null &&
              mission.mandataireCompany!.isNotEmpty) ...[
            Text(' · ',
                style: PremiumTheme.caption
                    .copyWith(color: PremiumTheme.primaryPurple.withValues(alpha: 0.5))),
            Flexible(
              child: Text(
                mission.mandataireCompany!,
                style: PremiumTheme.caption.copyWith(
                  color: PremiumTheme.primaryPurple.withValues(alpha: 0.7),
                  fontSize: 12,
                ),
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _priceRow() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            PremiumTheme.accentGreen.withValues(alpha: 0.08),
            PremiumTheme.primaryTeal.withValues(alpha: 0.04),
          ],
        ),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: PremiumTheme.accentGreen.withValues(alpha: 0.15),
        ),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              color: PremiumTheme.accentGreen.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Icon(Icons.euro_rounded,
                color: PremiumTheme.accentGreen, size: 14),
          ),
          const SizedBox(width: 8),
          Text(
            'Prix',
            style: PremiumTheme.caption.copyWith(
              color: PremiumTheme.textSecondary,
              fontSize: 12,
            ),
          ),
          const Spacer(),
          Text(
            '${mission.price!.toStringAsFixed(0)} €',
            style: TextStyle(
              color: PremiumTheme.accentGreen,
              fontWeight: FontWeight.w800,
              fontSize: 16,
              letterSpacing: 0.5,
            ),
          ),
        ],
      ),
    );
  }

  Widget _actions(BuildContext context, Color color) {
    return Row(
      children: [
        if (mission.status == 'pending')
          Expanded(
            child: _actionButton(
              icon: Icons.play_arrow_rounded,
              label: 'Demarrer',
              colors: [PremiumTheme.primaryTeal, const Color(0xFF0F9D7A)],
              onTap: onAction,
            ),
          ),
        if (mission.status == 'in_progress') ...[
          Expanded(
            child: _actionButton(
              icon: Icons.flag_rounded,
              label: 'Inspection',
              colors: [PremiumTheme.primaryBlue, const Color(0xFF0052CC)],
              onTap: onAction,
            ),
          ),
          if (onViewDepartureReport != null) ...[
            const SizedBox(width: 6),
            Expanded(
              child: _actionButton(
                icon: Icons.description_rounded,
                label: 'Rapport',
                colors: [PremiumTheme.primaryTeal, const Color(0xFF0F9D7A)],
                onTap: onViewDepartureReport!,
              ),
            ),
          ],
        ],
        if (mission.status == 'completed' && onReport != null) ...[
          Expanded(
            child: _actionButton(
              icon: Icons.description_rounded,
              label: 'Rapport',
              colors: [PremiumTheme.primaryBlue, const Color(0xFF0052CC)],
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
              colors: [PremiumTheme.accentGreen, const Color(0xFF059669)],
              onTap: onInvoice!,
            ),
          ),
        const SizedBox(width: 6),
        _detailButton(onTap),
      ],
    );
  }

  Widget _actionButton({
    required IconData icon,
    required String label,
    required List<Color> colors,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding:
            const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: colors,
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(12),
          boxShadow: [
            BoxShadow(
              color: colors[0].withValues(alpha: 0.30),
              blurRadius: 8,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: Colors.white, size: 16),
            const SizedBox(width: 5),
            Text(
              label,
              style: const TextStyle(
                  color: Colors.white,
                  fontSize: 12,
                  fontWeight: FontWeight.w700),
            ),
          ],
        ),
      ),
    );
  }

  Widget _detailButton(VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: Colors.grey.shade100,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFE5E7EB)),
        ),
        child: Icon(Icons.open_in_new_rounded,
            color: PremiumTheme.textSecondary, size: 16),
      ),
    );
  }
}

