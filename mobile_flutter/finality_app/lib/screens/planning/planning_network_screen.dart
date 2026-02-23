// ============================================================================
// Réseau Planning V3 — Covoiturage Intelligent entre Convoyeurs
// 3 Onglets: Publier / Matchs & Chat / Historique
// PAS de carte, PAS de browsing — seulement ses propres offres/demandes
// Waypoints, lift retour auto, rating badges, chat inline
// Tables: ride_offers, ride_requests, ride_matches, ride_messages, ride_ratings
// ============================================================================

import 'dart:convert';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:http/http.dart' as http;
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../onboarding/location_onboarding_screen.dart';
import '../../services/planning_location_service.dart';

// ============================================================================
// CONSTANTS & HELPERS
// ============================================================================

const _kIndigo = Color(0xFF6366F1);
const _kPurple = Color(0xFF8B5CF6);
const _kBlue = Color(0xFF3B82F6);
const _kGreen = Color(0xFF10B981);
const _kAmber = Color(0xFFF59E0B);
const _kRed = Color(0xFFEF4444);
const _kDeepOrange = Color(0xFFEA580C);

const Map<String, String> _vehicleLabels = {
  'car': '🚗 Voiture',
  'van': '🚐 Utilitaire',
  'truck': '🚛 Camion',
  'suv': '🏎️ SUV',
  'motorcycle': '🏍️ Moto',
};

const Map<String, _MatchStatusCfg> _matchStatusCfg = {
  'proposed': _MatchStatusCfg('⏳ En attente', Color(0xFFFEF3C7), Color(0xFFD97706)),
  'accepted': _MatchStatusCfg('✅ Accepté', Color(0xFFD1FAE5), Color(0xFF059669)),
  'in_transit': _MatchStatusCfg('🚗 En route', Color(0xFFDBEAFE), Color(0xFF2563EB)),
  'completed': _MatchStatusCfg('🏁 Terminé', Color(0xFFEDE9FE), Color(0xFF7C3AED)),
  'declined': _MatchStatusCfg('❌ Décliné', Color(0xFFFEE2E2), Color(0xFFDC2626)),
  'cancelled': _MatchStatusCfg('🚫 Annulé', Color(0xFFF3F4F6), Color(0xFF6B7280)),
};

class _MatchStatusCfg {
  final String label;
  final Color bg;
  final Color color;
  const _MatchStatusCfg(this.label, this.bg, this.color);
}

const List<String> _badgeOptions = [
  '⏰ Ponctuel',
  '😊 Sympathique',
  '🛡️ Conduite sûre',
  '✨ Véhicule propre',
  '💬 Bonne com.',
];

String _formatDateLabel(String? dateStr) {
  if (dateStr == null) return '';
  try {
    final d = DateTime.parse(dateStr);
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final diff = DateTime(d.year, d.month, d.day).difference(today).inDays;
    if (diff == 0) return "Aujourd'hui";
    if (diff == 1) return 'Demain';
    if (diff == -1) return 'Hier';
    return DateFormat('EEE d MMM', 'fr_FR').format(d);
  } catch (_) {
    return dateStr;
  }
}

String _formatTime(String? t) {
  if (t == null || t.isEmpty) return '';
  final parts = t.split(':');
  if (parts.length >= 2) return '${parts[0]}h${parts[1]}';
  return t;
}

Future<List<Map<String, dynamic>>> _geocodeCity(String query) async {
  if (query.length < 2) return [];
  try {
    final res = await http.get(Uri.parse(
        'https://api-adresse.data.gouv.fr/search/?q=${Uri.encodeComponent(query)}&type=municipality&limit=5'));
    if (res.statusCode != 200) return [];
    final data = jsonDecode(res.body);
    return ((data['features'] ?? []) as List).map<Map<String, dynamic>>((f) {
      final props = f['properties'] ?? {};
      final coords = f['geometry']?['coordinates'] ?? [0, 0];
      return {
        'label': '${props['label'] ?? ''} (${props['postcode'] ?? ''})',
        'city': (props['city'] ?? props['label'] ?? '').toString(),
        'lat': (coords[1] as num).toDouble(),
        'lng': (coords[0] as num).toDouble(),
      };
    }).toList();
  } catch (_) {
    return [];
  }
}

// ============================================================================
// MAIN SCREEN
// ============================================================================

class PlanningNetworkScreen extends StatefulWidget {
  const PlanningNetworkScreen({super.key});

  @override
  State<PlanningNetworkScreen> createState() => _PlanningNetworkScreenState();
}

class _PlanningNetworkScreenState extends State<PlanningNetworkScreen>
    with SingleTickerProviderStateMixin {
  final _supabase = Supabase.instance.client;
  late TabController _tabController;

  // Data — V3: only own data, no browsing
  List<Map<String, dynamic>> _myOffers = [];
  List<Map<String, dynamic>> _myRequests = [];
  List<Map<String, dynamic>> _activeMatches = [];
  List<Map<String, dynamic>> _historyMatches = [];
  bool _loading = true;
  bool _showOnboarding = false;
  int _pendingMatchCount = 0;

  // Realtime
  RealtimeChannel? _realtimeChannel;

  String get _userId => _supabase.auth.currentUser?.id ?? '';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _checkOnboarding();
    _loadData();
    _initLocationService();
    _subscribeRealtime();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _realtimeChannel?.unsubscribe();
    super.dispose();
  }

  Future<void> _checkOnboarding() async {
    final completed = await LocationOnboardingScreen.isCompleted();
    if (!completed && mounted) setState(() => _showOnboarding = true);
  }

  Future<void> _initLocationService() async {
    await PlanningLocationService().initNotifications();
    await PlanningLocationService().startTracking();
  }

  // ============================================================================
  // DATA LOADING — V3: only own offers/requests, matches with other_user
  // ============================================================================

  Future<void> _loadData() async {
    if (_userId.isEmpty) return;
    setState(() => _loading = true);

    try {
      final results = await Future.wait([
        // 0: My offers
        _supabase
            .from('ride_offers')
            .select('*')
            .eq('user_id', _userId)
            .order('created_at', ascending: false),
        // 1: My requests
        _supabase
            .from('ride_requests')
            .select('*')
            .eq('user_id', _userId)
            .order('created_at', ascending: false),
        // 2: My matches (active: proposed, accepted, in_transit)
        _supabase
            .from('ride_matches')
            .select('*')
            .or('driver_id.eq.$_userId,passenger_id.eq.$_userId')
            .inFilter('status', ['proposed', 'accepted', 'in_transit'])
            .order('created_at', ascending: false),
        // 3: My matches (history: completed, declined, cancelled)
        _supabase
            .from('ride_matches')
            .select('*')
            .or('driver_id.eq.$_userId,passenger_id.eq.$_userId')
            .inFilter('status', ['completed', 'declined', 'cancelled'])
            .order('created_at', ascending: false),
      ]);

      final active = List<Map<String, dynamic>>.from(results[2] as List? ?? []);
      final history = List<Map<String, dynamic>>.from(results[3] as List? ?? []);

      // Load other_user profile for each match
      final allMatches = [...active, ...history];
      for (final m in allMatches) {
        final otherUserId = m['driver_id'] == _userId ? m['passenger_id'] : m['driver_id'];
        if (otherUserId != null) {
          try {
            final profile = await _supabase
                .from('profiles')
                .select('first_name, last_name, company_name, phone')
                .eq('id', otherUserId)
                .maybeSingle();
            m['other_user'] = profile;
          } catch (_) {}
        }
      }

      final pending = active
          .where((m) => m['status'] == 'proposed' && m['passenger_id'] == _userId)
          .length;

      if (mounted) {
        setState(() {
          _myOffers = List<Map<String, dynamic>>.from(results[0] as List? ?? []);
          _myRequests = List<Map<String, dynamic>>.from(results[1] as List? ?? []);
          _activeMatches = active;
          _historyMatches = history;
          _pendingMatchCount = pending;
          _loading = false;
        });
      }
    } catch (e) {
      debugPrint('Error loading data: $e');
      if (mounted) setState(() => _loading = false);
    }
  }

  // ============================================================================
  // REALTIME — single channel V3
  // ============================================================================

  void _subscribeRealtime() {
    _realtimeChannel = _supabase
        .channel('reseau-v3')
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'ride_offers',
          callback: (_) => _loadData(),
        )
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'ride_requests',
          callback: (_) => _loadData(),
        )
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'ride_matches',
          callback: (_) => _loadData(),
        )
        .subscribe();
  }

  // ============================================================================
  // ACTIONS
  // ============================================================================

  Future<void> _deleteOffer(String id) async {
    await _supabase.from('ride_offers').delete().eq('id', id);
    _loadData();
  }

  Future<void> _toggleOfferVisibility(String id, String currentStatus) async {
    final newStatus = currentStatus == 'paused' ? 'active' : 'paused';
    await _supabase.from('ride_offers').update({'status': newStatus}).eq('id', id);
    _loadData();
  }

  Future<void> _deleteRequest(String id) async {
    await _supabase.from('ride_requests').delete().eq('id', id);
    _loadData();
  }

  Future<void> _respondToMatch(String matchId, String newStatus) async {
    await _supabase
        .from('ride_matches')
        .update({'status': newStatus}).eq('id', matchId);
    _loadData();
  }

  Future<void> _rateMatch(String matchId, int rating, List<String> badges, String comment) async {
    try {
      // Find who to rate
      final match = [..._activeMatches, ..._historyMatches].firstWhere(
        (m) => m['id'] == matchId,
        orElse: () => {},
      );
      if (match.isEmpty) return;

      final ratedUserId = match['driver_id'] == _userId ? match['passenger_id'] : match['driver_id'];

      await _supabase.from('ride_ratings').insert({
        'match_id': matchId,
        'rater_id': _userId,
        'rated_user_id': ratedUserId,
        'rating': rating,
        'badges': badges,
        'comment': comment.isNotEmpty ? comment : null,
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('⭐ Merci pour votre avis !'),
            backgroundColor: _kGreen,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur: $e'), backgroundColor: _kRed),
        );
      }
    }
  }

  // ============================================================================
  // BUILD
  // ============================================================================

  @override
  Widget build(BuildContext context) {
    if (_showOnboarding) {
      return LocationOnboardingScreen(onCompleted: () {
        setState(() => _showOnboarding = false);
        _initLocationService();
      });
    }

    return Scaffold(
      body: NestedScrollView(
        headerSliverBuilder: (context, innerBoxIsScrolled) => [
          // Gradient header
          SliverAppBar(
            expandedHeight: 150,
            floating: false,
            pinned: true,
            backgroundColor: _kIndigo,
            flexibleSpace: FlexibleSpaceBar(
              background: Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [_kIndigo, _kPurple, Color(0xFFEC4899)],
                  ),
                ),
                child: SafeArea(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(20, 10, 20, 60),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Text(
                              '🚗 Réseau Planning V3',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 22,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                            const Spacer(),
                            if (_pendingMatchCount > 0)
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(
                                  color: _kAmber,
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                child: Text(
                                  '$_pendingMatchCount',
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 13,
                                  ),
                                ),
                              ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        const Text(
                          'Un siège libre = un convoyeur transporté',
                          style: TextStyle(color: Colors.white70, fontSize: 13),
                        ),
                        const SizedBox(height: 12),
                        // Quick stats
                        Row(
                          children: [
                            _QuickStat(
                              value: '${_myOffers.length}',
                              label: 'Trajets',
                              icon: Icons.directions_car,
                            ),
                            const SizedBox(width: 12),
                            _QuickStat(
                              value: '${_myRequests.length}',
                              label: 'Demandes',
                              icon: Icons.directions_walk,
                            ),
                            const SizedBox(width: 12),
                            _QuickStat(
                              value: '${_activeMatches.where((m) => m['status'] == 'accepted' || m['status'] == 'in_transit').length}',
                              label: 'Actifs',
                              icon: Icons.handshake,
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
          // Pinned TabBar — 3 tabs V3
          SliverPersistentHeader(
            pinned: true,
            delegate: _TabBarDelegate(
              TabBar(
                controller: _tabController,
                labelColor: _kIndigo,
                unselectedLabelColor: Colors.grey,
                indicatorColor: _kIndigo,
                indicatorWeight: 3,
                labelStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12),
                tabs: [
                  const Tab(icon: Icon(Icons.publish, size: 18), text: 'Publier'),
                  Tab(
                    icon: Badge(
                      isLabelVisible: _pendingMatchCount > 0,
                      label: Text('$_pendingMatchCount', style: const TextStyle(fontSize: 9)),
                      child: const Icon(Icons.handshake, size: 18),
                    ),
                    text: 'Matchs & Chat',
                  ),
                  const Tab(icon: Icon(Icons.history, size: 18), text: 'Historique'),
                ],
              ),
            ),
          ),
        ],
        body: _loading
            ? const Center(child: CircularProgressIndicator(color: _kIndigo))
            : TabBarView(
                controller: _tabController,
                children: [
                  // Tab 1: Publier
                  _PublishTab(
                    myOffers: _myOffers,
                    myRequests: _myRequests,
                    onDeleteOffer: _deleteOffer,
                    onToggleOffer: _toggleOfferVisibility,
                    onDeleteRequest: _deleteRequest,
                    onCreateOffer: () => _showCreateOfferScreen(),
                    onCreateRequest: () => _showCreateRequestScreen(),
                    onRefresh: _loadData,
                  ),
                  // Tab 2: Matchs & Chat
                  _MatchesTab(
                    matches: _activeMatches,
                    userId: _userId,
                    onRespond: _respondToMatch,
                    onRate: _rateMatch,
                    onRefresh: _loadData,
                  ),
                  // Tab 3: Historique
                  _HistoryTab(
                    historyMatches: _historyMatches,
                    userId: _userId,
                    onRate: _rateMatch,
                  ),
                ],
              ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showCreateChoiceSheet,
        backgroundColor: _kIndigo,
        icon: const Icon(Icons.add, color: Colors.white),
        label: const Text('Publier',
            style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
      ),
    );
  }

  // ============================================================================
  // BOTTOM SHEET: Choose role (Conducteur / Piéton)
  // ============================================================================

  void _showCreateChoiceSheet() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 20),
              const Text(
                'Que souhaitez-vous faire ?',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 6),
              const Text(
                'Choisissez votre rôle pour ce trajet',
                style: TextStyle(color: Colors.grey),
              ),
              const SizedBox(height: 24),
              _ChoiceCard(
                icon: Icons.directions_car,
                iconColor: _kGreen,
                title: 'Je conduis — Publier mon trajet 🚗',
                subtitle: 'J\'ai un véhicule à convoyer et une place libre',
                onTap: () {
                  Navigator.pop(context);
                  _showCreateOfferScreen();
                },
              ),
              const SizedBox(height: 12),
              _ChoiceCard(
                icon: Icons.directions_walk,
                iconColor: _kAmber,
                title: 'Je cherche un lift 🚶',
                subtitle: 'Je dois rejoindre un point ou rentrer à ma base',
                onTap: () {
                  Navigator.pop(context);
                  _showCreateRequestScreen();
                },
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }

  void _showCreateOfferScreen() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => _CreateOfferScreen(
          userId: _userId,
          onCreated: () async {
            Navigator.pop(context);
            await _loadData();
          },
        ),
      ),
    );
  }

  void _showCreateRequestScreen() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => _CreateRequestScreen(
          userId: _userId,
          onCreated: () async {
            Navigator.pop(context);
            await _loadData();
          },
        ),
      ),
    );
  }
}

// ============================================================================
// QUICK STAT WIDGET
// ============================================================================

class _QuickStat extends StatelessWidget {
  final String value;
  final String label;
  final IconData icon;

  const _QuickStat({required this.value, required this.label, required this.icon});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 6),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.15),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          children: [
            Icon(icon, color: Colors.white, size: 16),
            const SizedBox(height: 2),
            Text(value,
                style: const TextStyle(
                    color: Colors.white, fontWeight: FontWeight.w900, fontSize: 16)),
            Text(label,
                style: const TextStyle(color: Colors.white60, fontSize: 10)),
          ],
        ),
      ),
    );
  }
}

// ============================================================================
// CHOICE CARD
// ============================================================================

class _ChoiceCard extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  const _ChoiceCard({
    required this.icon,
    required this.iconColor,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: iconColor.withValues(alpha: 0.3)),
          color: iconColor.withValues(alpha: 0.05),
        ),
        child: Row(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: iconColor.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Icon(icon, color: iconColor, size: 24),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title,
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                  const SizedBox(height: 2),
                  Text(subtitle, style: const TextStyle(color: Colors.grey, fontSize: 12)),
                ],
              ),
            ),
            Icon(Icons.chevron_right, color: iconColor),
          ],
        ),
      ),
    );
  }
}

// ============================================================================
// TAB BAR DELEGATE
// ============================================================================

class _TabBarDelegate extends SliverPersistentHeaderDelegate {
  final TabBar tabBar;
  _TabBarDelegate(this.tabBar);

  @override
  double get minExtent => tabBar.preferredSize.height;
  @override
  double get maxExtent => tabBar.preferredSize.height;

  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) {
    return Container(color: Colors.white, child: tabBar);
  }

  @override
  bool shouldRebuild(covariant _TabBarDelegate oldDelegate) => false;
}

// ============================================================================
// PUBLISH TAB — My offers + My requests (no browsing)
// ============================================================================

class _PublishTab extends StatelessWidget {
  final List<Map<String, dynamic>> myOffers;
  final List<Map<String, dynamic>> myRequests;
  final Future<void> Function(String) onDeleteOffer;
  final Future<void> Function(String, String) onToggleOffer;
  final Future<void> Function(String) onDeleteRequest;
  final VoidCallback onCreateOffer;
  final VoidCallback onCreateRequest;
  final Future<void> Function() onRefresh;

  const _PublishTab({
    required this.myOffers,
    required this.myRequests,
    required this.onDeleteOffer,
    required this.onToggleOffer,
    required this.onDeleteRequest,
    required this.onCreateOffer,
    required this.onCreateRequest,
    required this.onRefresh,
  });

  @override
  Widget build(BuildContext context) {
    if (myOffers.isEmpty && myRequests.isEmpty) {
      return RefreshIndicator(
        onRefresh: onRefresh,
        child: ListView(
          children: [
            const SizedBox(height: 80),
            Center(
              child: Column(
                children: [
                  Container(
                    width: 80,
                    height: 80,
                    decoration: BoxDecoration(
                      color: _kIndigo.withValues(alpha: 0.1),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.directions_car, size: 40, color: _kIndigo),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'Aucun trajet publié',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 40),
                    child: Text(
                      'Publiez un trajet ou une demande de lift.\nLe matching automatique trouvera les convoyeurs compatibles.',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Colors.grey, fontSize: 14),
                    ),
                  ),
                  const SizedBox(height: 24),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      ElevatedButton.icon(
                        onPressed: onCreateOffer,
                        icon: const Icon(Icons.directions_car, size: 18),
                        label: const Text('Je conduis'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: _kIndigo,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                        ),
                      ),
                      const SizedBox(width: 12),
                      OutlinedButton.icon(
                        onPressed: onCreateRequest,
                        icon: const Icon(Icons.directions_walk, size: 18),
                        label: const Text('Je cherche'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: _kAmber,
                          side: const BorderSide(color: _kAmber),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: onRefresh,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // ── Mes trajets conducteur ──
          Row(
            children: [
              const Icon(Icons.directions_car, size: 18, color: _kIndigo),
              const SizedBox(width: 8),
              Text(
                'Mes trajets conducteur',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.grey.shade800),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: _kIndigo.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text('${myOffers.length}',
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: _kIndigo)),
              ),
              const Spacer(),
              TextButton.icon(
                onPressed: onCreateOffer,
                icon: const Icon(Icons.add, size: 16),
                label: const Text('Nouveau', style: TextStyle(fontSize: 12)),
                style: TextButton.styleFrom(foregroundColor: _kIndigo),
              ),
            ],
          ),
          const SizedBox(height: 8),
          if (myOffers.isEmpty)
            _EmptySection(
              text: 'Aucun trajet publié',
              actionLabel: 'Publier un trajet →',
              onAction: onCreateOffer,
            )
          else
            ...myOffers.map((o) => Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: _TripCard(
                    type: 'offer',
                    item: o,
                    onDelete: () => onDeleteOffer(o['id']),
                    onToggle: () => onToggleOffer(o['id'], o['status'] ?? 'active'),
                  ),
                )),

          const SizedBox(height: 24),

          // ── Mes demandes de lift ──
          Row(
            children: [
              const Icon(Icons.directions_walk, size: 18, color: _kAmber),
              const SizedBox(width: 8),
              Text(
                'Mes demandes de lift',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.grey.shade800),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: _kAmber.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text('${myRequests.length}',
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: _kAmber)),
              ),
              const Spacer(),
              TextButton.icon(
                onPressed: onCreateRequest,
                icon: const Icon(Icons.add, size: 16),
                label: const Text('Nouvelle', style: TextStyle(fontSize: 12)),
                style: TextButton.styleFrom(foregroundColor: _kAmber),
              ),
            ],
          ),
          const SizedBox(height: 8),
          if (myRequests.isEmpty)
            _EmptySection(
              text: 'Aucune demande de lift',
              actionLabel: 'Chercher un lift →',
              onAction: onCreateRequest,
            )
          else
            ...myRequests.map((r) => Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: _TripCard(
                    type: 'request',
                    item: r,
                    onDelete: () => onDeleteRequest(r['id']),
                  ),
                )),
          const SizedBox(height: 80), // space for FAB
        ],
      ),
    );
  }
}

// ============================================================================
// EMPTY SECTION
// ============================================================================

class _EmptySection extends StatelessWidget {
  final String text;
  final String actionLabel;
  final VoidCallback onAction;

  const _EmptySection({required this.text, required this.actionLabel, required this.onAction});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
      decoration: BoxDecoration(
        color: Colors.grey.shade50,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        children: [
          Text(text, style: const TextStyle(color: Colors.grey, fontSize: 14)),
          const SizedBox(height: 8),
          TextButton(
            onPressed: onAction,
            child: Text(actionLabel,
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
          ),
        ],
      ),
    );
  }
}

// ============================================================================
// TRIP CARD — Unified card for offers & requests (V3 with waypoints)
// ============================================================================

class _TripCard extends StatelessWidget {
  final String type;
  final Map<String, dynamic> item;
  final VoidCallback onDelete;
  final VoidCallback? onToggle;

  const _TripCard({
    required this.type,
    required this.item,
    required this.onDelete,
    this.onToggle,
  });

  @override
  Widget build(BuildContext context) {
    final isOffer = type == 'offer';
    final origin = isOffer ? item['origin_city'] : item['pickup_city'];
    final dest = item['destination_city'];
    final date = isOffer ? item['departure_date'] : item['needed_date'];
    final dateLabel = _formatDateLabel(date?.toString());
    final isToday = dateLabel == "Aujourd'hui";
    final isTomorrow = dateLabel == 'Demain';

    String timeStr = '';
    if (isOffer) {
      timeStr = item['departure_time'] != null ? _formatTime(item['departure_time']) : '';
      if (item['estimated_arrival_time'] != null) {
        timeStr += ' → ${_formatTime(item['estimated_arrival_time'])}';
      }
    } else {
      final s = _formatTime(item['time_window_start']?.toString());
      final e = _formatTime(item['time_window_end']?.toString());
      if (s.isNotEmpty && e.isNotEmpty) {
        timeStr = '$s — $e';
      } else if (s.isNotEmpty) {
        timeStr = 'à partir de $s';
      }
    }

    // Waypoints
    List<String> waypoints = [];
    final routeCities = item['route_cities'];
    if (routeCities != null && routeCities is List) {
      waypoints = routeCities
          .map<String>((c) => c is String ? c : (c is Map ? (c['city']?.toString() ?? '') : ''))
          .where((s) => s.isNotEmpty)
          .toList();
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: isOffer ? _kIndigo.withValues(alpha: 0.3) : _kAmber.withValues(alpha: 0.3),
          width: 2,
        ),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 8, offset: const Offset(0, 2)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Date + time badges
          Wrap(
            spacing: 6,
            runSpacing: 4,
            children: [
              _Badge(
                text: dateLabel,
                icon: Icons.calendar_today,
                bg: isToday
                    ? _kGreen.withValues(alpha: 0.1)
                    : isTomorrow
                        ? _kBlue.withValues(alpha: 0.1)
                        : Colors.grey.shade100,
                textColor: isToday
                    ? _kGreen
                    : isTomorrow
                        ? _kBlue
                        : Colors.grey.shade600,
              ),
              if (timeStr.isNotEmpty)
                _Badge(
                  text: timeStr,
                  icon: Icons.access_time,
                  bg: Colors.grey.shade100,
                  textColor: Colors.grey.shade600,
                ),
              if (isOffer && item['status'] == 'paused')
                const _Badge(
                  text: '⏸ En pause',
                  bg: Color(0xFFFEF3C7),
                  textColor: Color(0xFFD97706),
                ),
              if (isOffer && (item['seats_available'] ?? 0) > 0)
                _Badge(
                  text: '🪑 ${item['seats_available']} place${(item['seats_available'] ?? 0) > 1 ? 's' : ''}',
                  bg: _kAmber.withValues(alpha: 0.1),
                  textColor: _kAmber,
                ),
            ],
          ),
          const SizedBox(height: 12),

          // Route: origin → (waypoints) → destination
          Row(
            children: [
              Container(
                width: 10,
                height: 10,
                decoration: const BoxDecoration(color: _kGreen, shape: BoxShape.circle),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  origin?.toString() ?? '',
                  style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                ),
              ),
              if (waypoints.isEmpty) ...[
                const Icon(Icons.arrow_forward, size: 16, color: Colors.grey),
                const SizedBox(width: 4),
                Container(
                  width: 10,
                  height: 10,
                  decoration: const BoxDecoration(color: _kBlue, shape: BoxShape.circle),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    dest?.toString() ?? '',
                    style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                  ),
                ),
              ],
            ],
          ),

          // Waypoints
          if (waypoints.isNotEmpty) ...[
            Container(
              margin: const EdgeInsets.only(left: 5, top: 4),
              padding: const EdgeInsets.only(left: 12),
              decoration: BoxDecoration(
                border: Border(
                  left: BorderSide(color: Colors.grey.shade300, width: 2, style: BorderStyle.solid),
                ),
              ),
              child: Column(
                children: [
                  ...waypoints.map((wp) => Padding(
                        padding: const EdgeInsets.symmetric(vertical: 4),
                        child: Row(
                          children: [
                            Container(
                              width: 6,
                              height: 6,
                              decoration: const BoxDecoration(color: _kAmber, shape: BoxShape.circle),
                            ),
                            const SizedBox(width: 8),
                            Text(wp, style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
                          ],
                        ),
                      )),
                  Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Row(
                      children: [
                        Container(
                          width: 10,
                          height: 10,
                          decoration: const BoxDecoration(color: _kBlue, shape: BoxShape.circle),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          dest?.toString() ?? '',
                          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],

          const SizedBox(height: 10),

          // Extra info
          Wrap(
            spacing: 12,
            runSpacing: 4,
            children: [
              if (isOffer && item['vehicle_type'] != null)
                Text(
                  _vehicleLabels[item['vehicle_type']] ?? item['vehicle_type'],
                  style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                ),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.navigation, size: 14, color: Colors.grey.shade400),
                  const SizedBox(width: 4),
                  Text(
                    'Flexible ${item['max_detour_km'] ?? 15}km',
                    style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                  ),
                ],
              ),
              if (!isOffer && item['accept_partial'] == true)
                const Text('Accepte un bout du trajet',
                    style: TextStyle(fontSize: 12, color: _kBlue)),
            ],
          ),

          // Auto-return indicator
          if (isOffer && item['needs_return'] == true && item['return_to_city'] != null)
            Container(
              margin: const EdgeInsets.only(top: 10),
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: _kPurple.withValues(alpha: 0.06),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.refresh, size: 14, color: _kPurple),
                  const SizedBox(width: 6),
                  Text(
                    'Lift retour auto → ${item['return_to_city']}',
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: _kPurple),
                  ),
                ],
              ),
            ),

          // Actions
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              if (isOffer && onToggle != null)
                _ActionBtn(
                  icon: item['status'] == 'paused' ? Icons.visibility : Icons.pause,
                  color: item['status'] == 'paused' ? _kGreen : _kAmber,
                  onTap: onToggle!,
                  tooltip: item['status'] == 'paused' ? 'Réactiver' : 'Mettre en pause',
                ),
              const SizedBox(width: 8),
              _ActionBtn(
                icon: Icons.delete_outline,
                color: _kRed,
                onTap: onDelete,
                tooltip: 'Supprimer',
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// ============================================================================
// BADGE WIDGET
// ============================================================================

class _Badge extends StatelessWidget {
  final String text;
  final IconData? icon;
  final Color bg;
  final Color textColor;

  const _Badge({required this.text, this.icon, required this.bg, required this.textColor});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 12, color: textColor),
            const SizedBox(width: 4),
          ],
          Text(text, style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: textColor)),
        ],
      ),
    );
  }
}

// ============================================================================
// ACTION BUTTON
// ============================================================================

class _ActionBtn extends StatelessWidget {
  final IconData icon;
  final Color color;
  final VoidCallback onTap;
  final String tooltip;

  const _ActionBtn({required this.icon, required this.color, required this.onTap, required this.tooltip});

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: tooltip,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(10),
        child: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, size: 18, color: color),
        ),
      ),
    );
  }
}

// ============================================================================
// MATCHES TAB — Active matches + inline Chat
// ============================================================================

class _MatchesTab extends StatefulWidget {
  final List<Map<String, dynamic>> matches;
  final String userId;
  final Future<void> Function(String, String) onRespond;
  final Future<void> Function(String, int, List<String>, String) onRate;
  final Future<void> Function() onRefresh;

  const _MatchesTab({
    required this.matches,
    required this.userId,
    required this.onRespond,
    required this.onRate,
    required this.onRefresh,
  });

  @override
  State<_MatchesTab> createState() => _MatchesTabState();
}

class _MatchesTabState extends State<_MatchesTab> {
  final _supabase = Supabase.instance.client;
  String? _chatMatchId;
  List<Map<String, dynamic>> _chatMessages = [];
  final TextEditingController _msgCtrl = TextEditingController();
  final ScrollController _chatScrollCtrl = ScrollController();
  RealtimeChannel? _chatChannel;
  String? _ratingMatchId;

  Future<void> _loadChat(String matchId) async {
    final data = await _supabase
        .from('ride_messages')
        .select('*')
        .eq('match_id', matchId)
        .order('created_at', ascending: true);
    final msgs = List<Map<String, dynamic>>.from(data as List? ?? []);

    // Mark as read
    if (msgs.isNotEmpty) {
      await _supabase
          .from('ride_messages')
          .update({'is_read': true})
          .eq('match_id', matchId)
          .neq('sender_id', widget.userId);
    }

    if (mounted) {
      setState(() => _chatMessages = msgs);
      _scrollToBottom();
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_chatScrollCtrl.hasClients) {
        _chatScrollCtrl.animateTo(
          _chatScrollCtrl.position.maxScrollExtent,
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOut,
        );
      }
    });
  }

  void _openChat(String matchId) {
    _chatChannel?.unsubscribe();
    setState(() => _chatMatchId = matchId);
    _loadChat(matchId);

    _chatChannel = _supabase
        .channel('ride-chat-$matchId')
        .onPostgresChanges(
          event: PostgresChangeEvent.insert,
          schema: 'public',
          table: 'ride_messages',
          filter: PostgresChangeFilter(type: PostgresChangeFilterType.eq, column: 'match_id', value: matchId),
          callback: (payload) {
            final msg = payload.newRecord;
            if (mounted) {
              setState(() => _chatMessages.add(msg));
              _scrollToBottom();
              // Mark as read
              if (msg['sender_id'] != widget.userId) {
                _supabase.from('ride_messages').update({'is_read': true}).eq('id', msg['id']);
              }
            }
          },
        )
        .subscribe();
  }

  void _closeChat() {
    _chatChannel?.unsubscribe();
    setState(() {
      _chatMatchId = null;
      _chatMessages = [];
    });
  }

  Future<void> _sendMessage() async {
    final text = _msgCtrl.text.trim();
    if (text.isEmpty || _chatMatchId == null) return;
    _msgCtrl.clear();
    await _supabase.from('ride_messages').insert({
      'match_id': _chatMatchId,
      'sender_id': widget.userId,
      'content': text,
    });
  }

  @override
  void dispose() {
    _chatChannel?.unsubscribe();
    _msgCtrl.dispose();
    _chatScrollCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (widget.matches.isEmpty) {
      return RefreshIndicator(
        onRefresh: widget.onRefresh,
        child: ListView(
          children: [
            const SizedBox(height: 80),
            Center(
              child: Column(
                children: [
                  Container(
                    width: 80,
                    height: 80,
                    decoration: BoxDecoration(
                      color: _kPurple.withValues(alpha: 0.1),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.flash_on, size: 40, color: _kPurple),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'Aucun match actif',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 40),
                    child: Text(
                      'Publiez un trajet ou une demande de lift.\nDès qu\'un trajet compatible est trouvé, votre match apparaîtra ici.',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Colors.grey, fontSize: 14),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }

    // If chat is open, show chat panel
    if (_chatMatchId != null) {
      return _buildChatPanel();
    }

    return RefreshIndicator(
      onRefresh: widget.onRefresh,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: widget.matches.length + 1,
        itemBuilder: (context, index) {
          if (index == widget.matches.length) return const SizedBox(height: 80);
          final m = widget.matches[index];
          return Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: _buildMatchCard(m),
          );
        },
      ),
    );
  }

  Widget _buildMatchCard(Map<String, dynamic> m) {
    final isDriver = m['driver_id'] == widget.userId;
    final cfg = _matchStatusCfg[m['status']] ?? _matchStatusCfg['proposed']!;
    final otherUser = m['other_user'] as Map<String, dynamic>?;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.grey.shade200),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 8, offset: const Offset(0, 2)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Other user info
          if (otherUser != null) ...[
            Row(
              children: [
                CircleAvatar(
                  radius: 20,
                  backgroundColor: _kIndigo,
                  child: Text(
                    '${(otherUser['first_name'] ?? '?')[0]}${(otherUser['last_name'] ?? '?')[0]}',
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${otherUser['first_name'] ?? ''} ${otherUser['last_name'] ?? ''}',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                      ),
                      if (otherUser['company_name'] != null)
                        Text(otherUser['company_name'],
                            style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: isDriver ? _kAmber.withValues(alpha: 0.1) : _kBlue.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    isDriver ? '🚶 Passager' : '🚗 Conducteur',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: isDriver ? _kAmber : _kBlue,
                    ),
                  ),
                ),
              ],
            ),
            Divider(color: Colors.grey.shade200, height: 24),
          ],

          // Route
          Row(
            children: [
              if (m['pickup_city'] != null) ...[
                Text(m['pickup_city'], style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
              ],
              const SizedBox(width: 8),
              const Icon(Icons.arrow_forward, size: 16, color: Colors.grey),
              const SizedBox(width: 8),
              if (m['dropoff_city'] != null) ...[
                Text(m['dropoff_city'], style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
              ],
            ],
          ),
          const SizedBox(height: 10),

          // Status + score
          Wrap(
            spacing: 8,
            runSpacing: 6,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: cfg.bg,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(cfg.label,
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: cfg.color)),
              ),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  ...List.generate(5, (i) {
                    final score = (m['match_score'] ?? 0) as num;
                    final starsFilled = (score / 20).ceil();
                    return Icon(
                      Icons.star,
                      size: 14,
                      color: i < starsFilled ? _kAmber : Colors.grey.shade300,
                    );
                  }),
                  const SizedBox(width: 4),
                  Text('${m['match_score'] ?? 0}%',
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                ],
              ),
            ],
          ),

          // Detour + distance
          if (m['detour_km'] != null || m['distance_covered_km'] != null) ...[
            const SizedBox(height: 8),
            Wrap(
              spacing: 16,
              children: [
                if (m['detour_km'] != null)
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.navigation, size: 14, color: _kBlue),
                      const SizedBox(width: 4),
                      Text(
                        'Détour: ${(m['detour_km'] as num).toStringAsFixed(1)}km',
                        style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                      ),
                    ],
                  ),
                if (m['distance_covered_km'] != null)
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.trending_up, size: 14, color: _kGreen),
                      const SizedBox(width: 4),
                      Text(
                        'Couvert: ${(m['distance_covered_km'] as num).toStringAsFixed(0)}km',
                        style: const TextStyle(fontSize: 12, color: _kGreen),
                      ),
                    ],
                  ),
              ],
            ),
          ],

          // Actions
          const SizedBox(height: 14),
          Container(
            padding: const EdgeInsets.only(top: 12),
            decoration: BoxDecoration(
              border: Border(top: BorderSide(color: Colors.grey.shade200)),
            ),
            child: Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                if (m['status'] == 'proposed') ...[
                  ElevatedButton.icon(
                    onPressed: () => widget.onRespond(m['id'], 'accepted'),
                    icon: const Icon(Icons.check, size: 16),
                    label: const Text('Accepter'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: _kGreen,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                    ),
                  ),
                  OutlinedButton.icon(
                    onPressed: () => widget.onRespond(m['id'], 'declined'),
                    icon: const Icon(Icons.close, size: 16),
                    label: const Text('Décliner'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.grey.shade600,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                    ),
                  ),
                ],
                if (m['status'] == 'accepted') ...[
                  if (isDriver)
                    ElevatedButton.icon(
                      onPressed: () => widget.onRespond(m['id'], 'in_transit'),
                      icon: const Icon(Icons.navigation, size: 16),
                      label: const Text('Démarrer'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: _kIndigo,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      ),
                    ),
                  ElevatedButton.icon(
                    onPressed: () => _openChat(m['id']),
                    icon: const Icon(Icons.chat_bubble, size: 16),
                    label: const Text('Discuter'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: _kIndigo.withValues(alpha: 0.1),
                      foregroundColor: _kIndigo,
                      elevation: 0,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                    ),
                  ),
                  TextButton.icon(
                    onPressed: () {
                      showDialog(
                        context: context,
                        builder: (_) => AlertDialog(
                          title: const Text('Annuler ce trajet ?'),
                          actions: [
                            TextButton(
                              onPressed: () => Navigator.pop(context),
                              child: const Text('Non'),
                            ),
                            TextButton(
                              onPressed: () {
                                Navigator.pop(context);
                                widget.onRespond(m['id'], 'cancelled');
                              },
                              child: const Text('Oui, annuler', style: TextStyle(color: _kRed)),
                            ),
                          ],
                        ),
                      );
                    },
                    icon: const Icon(Icons.close, size: 14, color: _kRed),
                    label: const Text('Annuler', style: TextStyle(fontSize: 12, color: _kRed)),
                  ),
                ],
                if (m['status'] == 'in_transit') ...[
                  ElevatedButton.icon(
                    onPressed: () {
                      widget.onRespond(m['id'], 'completed');
                      setState(() => _ratingMatchId = m['id']);
                    },
                    icon: const Icon(Icons.check, size: 16),
                    label: const Text('Arrivé — Terminer'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: _kGreen,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                    ),
                  ),
                  ElevatedButton.icon(
                    onPressed: () => _openChat(m['id']),
                    icon: const Icon(Icons.chat_bubble, size: 16),
                    label: const Text('Discuter'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: _kIndigo.withValues(alpha: 0.1),
                      foregroundColor: _kIndigo,
                      elevation: 0,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ============================================================================
  // CHAT PANEL
  // ============================================================================

  Widget _buildChatPanel() {
    final chatMatch = widget.matches.firstWhere(
      (m) => m['id'] == _chatMatchId,
      orElse: () => {},
    );
    if (chatMatch.isEmpty) {
      _closeChat();
      return const SizedBox();
    }

    final otherUser = chatMatch['other_user'] as Map<String, dynamic>?;

    return Column(
      children: [
        // Chat header
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: const BoxDecoration(
            gradient: LinearGradient(colors: [_kIndigo, _kPurple]),
          ),
          child: SafeArea(
            bottom: false,
            child: Row(
              children: [
                IconButton(
                  onPressed: _closeChat,
                  icon: const Icon(Icons.arrow_back, color: Colors.white),
                ),
                if (otherUser != null) ...[
                  CircleAvatar(
                    radius: 18,
                    backgroundColor: Colors.white24,
                    child: Text(
                      '${(otherUser['first_name'] ?? '?')[0]}${(otherUser['last_name'] ?? '?')[0]}',
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${otherUser['first_name'] ?? ''} ${otherUser['last_name'] ?? ''}',
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15),
                        ),
                        Text(
                          '${chatMatch['pickup_city'] ?? ''} → ${chatMatch['dropoff_city'] ?? ''}',
                          style: const TextStyle(color: Colors.white70, fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                ],
                if (otherUser?['phone'] != null)
                  IconButton(
                    onPressed: () => launchUrl(Uri.parse('tel:${otherUser!['phone']}')),
                    icon: const Icon(Icons.phone, color: Colors.white),
                  ),
              ],
            ),
          ),
        ),

        // Messages
        Expanded(
          child: Container(
            color: Colors.grey.shade50,
            child: _chatMessages.isEmpty
                ? Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.chat_bubble_outline, size: 48, color: _kIndigo.withValues(alpha: 0.3)),
                        const SizedBox(height: 12),
                        const Text('Organisez votre trajet ensemble',
                            style: TextStyle(fontWeight: FontWeight.w600)),
                        Text('Lieu de rendez-vous, heure précise, etc.',
                            style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
                      ],
                    ),
                  )
                : ListView.builder(
                    controller: _chatScrollCtrl,
                    padding: const EdgeInsets.all(16),
                    itemCount: _chatMessages.length,
                    itemBuilder: (context, index) {
                      final msg = _chatMessages[index];
                      final isMe = msg['sender_id'] == widget.userId;
                      return Align(
                        alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
                        child: Container(
                          margin: const EdgeInsets.only(bottom: 8),
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                          constraints: BoxConstraints(
                              maxWidth: MediaQuery.of(context).size.width * 0.75),
                          decoration: BoxDecoration(
                            color: isMe ? _kIndigo : Colors.white,
                            borderRadius: BorderRadius.only(
                              topLeft: const Radius.circular(16),
                              topRight: const Radius.circular(16),
                              bottomLeft: Radius.circular(isMe ? 16 : 4),
                              bottomRight: Radius.circular(isMe ? 4 : 16),
                            ),
                            border: isMe ? null : Border.all(color: Colors.grey.shade200),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text(
                                msg['content'] ?? '',
                                style: TextStyle(
                                  fontSize: 14,
                                  color: isMe ? Colors.white : Colors.grey.shade800,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                _formatChatTime(msg['created_at']),
                                style: TextStyle(
                                  fontSize: 10,
                                  color: isMe ? Colors.white60 : Colors.grey.shade400,
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
          ),
        ),

        // Input
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: Colors.white,
            border: Border(top: BorderSide(color: Colors.grey.shade200)),
          ),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _msgCtrl,
                  decoration: InputDecoration(
                    hintText: 'Écrire un message...',
                    hintStyle: TextStyle(color: Colors.grey.shade400, fontSize: 14),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(20),
                      borderSide: BorderSide(color: Colors.grey.shade300),
                    ),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  ),
                  onSubmitted: (_) => _sendMessage(),
                ),
              ),
              const SizedBox(width: 8),
              Container(
                decoration: const BoxDecoration(
                  color: _kIndigo,
                  shape: BoxShape.circle,
                ),
                child: IconButton(
                  onPressed: _sendMessage,
                  icon: const Icon(Icons.send, color: Colors.white, size: 20),
                ),
              ),
            ],
          ),
        ),

        // Rating modal
        if (_ratingMatchId != null)
          _RatingModalOverlay(
            matchId: _ratingMatchId!,
            onClose: () => setState(() => _ratingMatchId = null),
            onRate: widget.onRate,
          ),
      ],
    );
  }

  String _formatChatTime(String? ts) {
    if (ts == null) return '';
    try {
      final dt = DateTime.parse(ts);
      return '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
    } catch (_) {
      return '';
    }
  }
}

// ============================================================================
// HISTORY TAB — Past rides with ratings
// ============================================================================

class _HistoryTab extends StatefulWidget {
  final List<Map<String, dynamic>> historyMatches;
  final String userId;
  final Future<void> Function(String, int, List<String>, String) onRate;

  const _HistoryTab({
    required this.historyMatches,
    required this.userId,
    required this.onRate,
  });

  @override
  State<_HistoryTab> createState() => _HistoryTabState();
}

class _HistoryTabState extends State<_HistoryTab> {
  String? _ratingMatchId;

  @override
  Widget build(BuildContext context) {
    if (widget.historyMatches.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: Colors.grey.shade100,
                shape: BoxShape.circle,
              ),
              child: Icon(Icons.history, size: 40, color: Colors.grey.shade400),
            ),
            const SizedBox(height: 16),
            const Text(
              'Aucun historique',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              'Vos trajets terminés, annulés ou déclinés\napparaîtront ici.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey.shade500, fontSize: 14),
            ),
          ],
        ),
      );
    }

    return Stack(
      children: [
        ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: widget.historyMatches.length + 1,
          itemBuilder: (context, index) {
            if (index == widget.historyMatches.length) return const SizedBox(height: 80);
            final m = widget.historyMatches[index];
            return Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: _buildHistoryCard(m),
            );
          },
        ),
        if (_ratingMatchId != null)
          _RatingModalOverlay(
            matchId: _ratingMatchId!,
            onClose: () => setState(() => _ratingMatchId = null),
            onRate: widget.onRate,
          ),
      ],
    );
  }

  Widget _buildHistoryCard(Map<String, dynamic> m) {
    final isDriver = m['driver_id'] == widget.userId;
    final cfg = _matchStatusCfg[m['status']] ?? _matchStatusCfg['completed']!;
    final otherUser = m['other_user'] as Map<String, dynamic>?;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              if (otherUser != null) ...[
                CircleAvatar(
                  radius: 16,
                  backgroundColor: Colors.grey.shade400,
                  child: Text(
                    '${(otherUser['first_name'] ?? '?')[0]}${(otherUser['last_name'] ?? '?')[0]}',
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 10),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${otherUser['first_name'] ?? ''} ${otherUser['last_name'] ?? ''}',
                        style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                      ),
                      Text(
                        isDriver ? '(passager)' : '(conducteur)',
                        style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
                      ),
                    ],
                  ),
                ),
              ] else
                const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: cfg.bg,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(cfg.label,
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: cfg.color)),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Text(m['pickup_city'] ?? '', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
              const SizedBox(width: 8),
              const Icon(Icons.arrow_forward, size: 16, color: Colors.grey),
              const SizedBox(width: 8),
              Text(m['dropoff_city'] ?? '', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
              const Spacer(),
              Text(
                _formatHistoryDate(m['created_at']),
                style: TextStyle(fontSize: 11, color: Colors.grey.shade400),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              Text('Score: ${m['match_score'] ?? 0}%',
                  style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
              if (m['distance_covered_km'] != null)
                Text(' • ${(m['distance_covered_km'] as num).toStringAsFixed(0)}km couverts',
                    style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
            ],
          ),
          if (m['status'] == 'completed') ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.only(top: 10),
              decoration: BoxDecoration(
                border: Border(top: BorderSide(color: Colors.grey.shade200)),
              ),
              child: ElevatedButton.icon(
                onPressed: () => setState(() => _ratingMatchId = m['id']),
                icon: const Icon(Icons.star, size: 16),
                label: const Text('Noter ce trajet'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: _kAmber,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  String _formatHistoryDate(String? ts) {
    if (ts == null) return '';
    try {
      final dt = DateTime.parse(ts);
      return DateFormat('d MMM yyyy', 'fr_FR').format(dt);
    } catch (_) {
      return '';
    }
  }
}

// ============================================================================
// RATING MODAL OVERLAY
// ============================================================================

class _RatingModalOverlay extends StatefulWidget {
  final String matchId;
  final VoidCallback onClose;
  final Future<void> Function(String, int, List<String>, String) onRate;

  const _RatingModalOverlay({
    required this.matchId,
    required this.onClose,
    required this.onRate,
  });

  @override
  State<_RatingModalOverlay> createState() => _RatingModalOverlayState();
}

class _RatingModalOverlayState extends State<_RatingModalOverlay> {
  int _stars = 5;
  List<String> _badges = [];
  final TextEditingController _commentCtrl = TextEditingController();

  @override
  void dispose() {
    _commentCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: widget.onClose,
      child: Container(
        color: Colors.black.withValues(alpha: 0.4),
        child: Center(
          child: GestureDetector(
            onTap: () {}, // prevent closing
            child: Container(
              margin: const EdgeInsets.all(24),
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 64,
                      height: 64,
                      decoration: BoxDecoration(
                        color: _kAmber.withValues(alpha: 0.1),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.star, size: 32, color: _kAmber),
                    ),
                    const SizedBox(height: 12),
                    const Text('Noter ce trajet',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 4),
                    Text('Votre avis aide la communauté',
                        style: TextStyle(fontSize: 13, color: Colors.grey.shade500)),
                    const SizedBox(height: 20),

                    // Stars
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: List.generate(5, (i) {
                        return IconButton(
                          onPressed: () => setState(() => _stars = i + 1),
                          icon: Icon(
                            Icons.star,
                            size: 40,
                            color: i < _stars ? _kAmber : Colors.grey.shade300,
                          ),
                        );
                      }),
                    ),
                    const SizedBox(height: 16),

                    // Badges
                    Align(
                      alignment: Alignment.centerLeft,
                      child: Text('Points forts (optionnel)',
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.grey.shade600)),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: _badgeOptions.map((b) {
                        final selected = _badges.contains(b);
                        return GestureDetector(
                          onTap: () => setState(() {
                            if (selected) {
                              _badges.remove(b);
                            } else {
                              _badges.add(b);
                            }
                          }),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            decoration: BoxDecoration(
                              color: selected ? _kIndigo.withValues(alpha: 0.1) : Colors.grey.shade100,
                              borderRadius: BorderRadius.circular(20),
                              border: selected
                                  ? Border.all(color: _kIndigo.withValues(alpha: 0.4), width: 2)
                                  : null,
                            ),
                            child: Text(b,
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                  color: selected ? _kIndigo : Colors.grey.shade600,
                                )),
                          ),
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 16),

                    // Comment
                    TextField(
                      controller: _commentCtrl,
                      maxLines: 2,
                      decoration: InputDecoration(
                        hintText: 'Un commentaire ? (optionnel)',
                        hintStyle: TextStyle(fontSize: 13, color: Colors.grey.shade400),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                        contentPadding: const EdgeInsets.all(14),
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Buttons
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            onPressed: widget.onClose,
                            style: OutlinedButton.styleFrom(
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                              padding: const EdgeInsets.symmetric(vertical: 12),
                            ),
                            child: const Text('Plus tard'),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: ElevatedButton(
                            onPressed: () {
                              widget.onRate(widget.matchId, _stars, _badges, _commentCtrl.text);
                              widget.onClose();
                            },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: _kAmber,
                              foregroundColor: Colors.white,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                              padding: const EdgeInsets.symmetric(vertical: 12),
                            ),
                            child: const Text('Envoyer ★', style: TextStyle(fontWeight: FontWeight.bold)),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// ============================================================================
// CREATE OFFER SCREEN — V3 with waypoints + auto-return lift
// ============================================================================

class _CreateOfferScreen extends StatefulWidget {
  final String userId;
  final Future<void> Function() onCreated;

  const _CreateOfferScreen({required this.userId, required this.onCreated});

  @override
  State<_CreateOfferScreen> createState() => _CreateOfferScreenState();
}

class _CreateOfferScreenState extends State<_CreateOfferScreen> {
  final _supabase = Supabase.instance.client;

  // Origin
  String _originCity = '';
  Map<String, dynamic>? _originGeo;
  List<Map<String, dynamic>> _originSugs = [];
  bool _showOriginSugs = false;

  // Destination
  String _destCity = '';
  Map<String, dynamic>? _destGeo;
  List<Map<String, dynamic>> _destSugs = [];
  bool _showDestSugs = false;

  // Waypoints (V3 new)
  List<Map<String, dynamic>> _waypoints = []; // {city, lat, lng}
  String _wpInput = '';
  List<Map<String, dynamic>> _wpSugs = [];
  bool _showWpSugs = false;

  // Date / time
  DateTime _date = DateTime.now();
  TimeOfDay _departureTime = const TimeOfDay(hour: 8, minute: 0);
  TimeOfDay _latestDeparture = const TimeOfDay(hour: 10, minute: 0);
  String _arrivalTime = '';

  // Options
  int _seats = 1;
  int _maxDetour = 15;
  String _vehicleType = 'car';
  String _notes = '';

  // Auto-return (V3 new)
  bool _needsReturn = false;
  String _returnCity = '';
  Map<String, dynamic>? _returnGeo;
  List<Map<String, dynamic>> _returnSugs = [];
  bool _showReturnSugs = false;
  TimeOfDay _returnFrom = const TimeOfDay(hour: 14, minute: 0);
  TimeOfDay _returnTo = const TimeOfDay(hour: 20, minute: 0);

  bool _saving = false;
  String _error = '';

  void _searchOrigin(String q) async {
    setState(() {
      _originCity = q;
      _originGeo = null;
    });
    if (q.length >= 2) {
      final sugs = await _geocodeCity(q);
      if (mounted) setState(() { _originSugs = sugs; _showOriginSugs = sugs.isNotEmpty; });
    } else {
      setState(() { _originSugs = []; _showOriginSugs = false; });
    }
  }

  void _searchDest(String q) async {
    setState(() {
      _destCity = q;
      _destGeo = null;
    });
    if (q.length >= 2) {
      final sugs = await _geocodeCity(q);
      if (mounted) setState(() { _destSugs = sugs; _showDestSugs = sugs.isNotEmpty; });
    } else {
      setState(() { _destSugs = []; _showDestSugs = false; });
    }
  }

  void _searchWaypoint(String q) async {
    _wpInput = q;
    if (q.length >= 2) {
      final sugs = await _geocodeCity(q);
      if (mounted) setState(() { _wpSugs = sugs; _showWpSugs = sugs.isNotEmpty; });
    } else {
      setState(() { _wpSugs = []; _showWpSugs = false; });
    }
  }

  void _searchReturn(String q) async {
    setState(() {
      _returnCity = q;
      _returnGeo = null;
    });
    if (q.length >= 2) {
      final sugs = await _geocodeCity(q);
      if (mounted) setState(() { _returnSugs = sugs; _showReturnSugs = sugs.isNotEmpty; });
    } else {
      setState(() { _returnSugs = []; _showReturnSugs = false; });
    }
  }

  String _timeStr(TimeOfDay t) =>
      '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';

  Future<void> _submit() async {
    if (_originGeo == null || _destGeo == null) {
      setState(() => _error = 'Sélectionnez les villes de départ et d\'arrivée');
      return;
    }

    setState(() { _saving = true; _error = ''; });

    try {
      final routeCities = _waypoints
          .map((w) => {'city': w['city'], 'lat': w['lat'], 'lng': w['lng']})
          .toList();

      final offerError = await _supabase.from('ride_offers').insert({
        'user_id': widget.userId,
        'origin_city': _originGeo!['city'],
        'origin_lat': _originGeo!['lat'],
        'origin_lng': _originGeo!['lng'],
        'destination_city': _destGeo!['city'],
        'destination_lat': _destGeo!['lat'],
        'destination_lng': _destGeo!['lng'],
        'route_cities': routeCities,
        'departure_date': DateFormat('yyyy-MM-dd').format(_date),
        'departure_time': _timeStr(_departureTime),
        'estimated_arrival_time': _arrivalTime.isNotEmpty ? _arrivalTime : null,
        'seats_available': _seats,
        'max_detour_km': _maxDetour,
        'vehicle_type': _vehicleType,
        'needs_return': _needsReturn,
        'return_to_city': _needsReturn && _returnGeo != null ? _returnGeo!['city'] : null,
        'notes': _notes.isNotEmpty ? _notes : null,
        'status': 'active',
      }).select().maybeSingle();

      // Auto-create return lift request (V3)
      if (_needsReturn && _returnGeo != null && _destGeo != null) {
        await _supabase.from('ride_requests').insert({
          'user_id': widget.userId,
          'pickup_city': _destGeo!['city'],
          'pickup_lat': _destGeo!['lat'],
          'pickup_lng': _destGeo!['lng'],
          'destination_city': _returnGeo!['city'],
          'destination_lat': _returnGeo!['lat'],
          'destination_lng': _returnGeo!['lng'],
          'needed_date': DateFormat('yyyy-MM-dd').format(_date),
          'time_window_start': _timeStr(_returnFrom),
          'time_window_end': _timeStr(_returnTo),
          'max_detour_km': _maxDetour,
          'accept_partial': true,
          'request_type': 'return',
          'status': 'active',
          'notes': 'Retour automatique après livraison à ${_destGeo!['city']}',
        });
      }

      await widget.onCreated();
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    }

    if (mounted) setState(() => _saving = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Je conduis — Publier mon trajet',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        backgroundColor: _kIndigo,
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Info
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: _kIndigo.withValues(alpha: 0.06),
                borderRadius: BorderRadius.circular(14),
              ),
              child: const Row(
                children: [
                  Icon(Icons.info_outline, color: _kIndigo, size: 20),
                  SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'Proposez vos places libres. Le matching automatique trouvera les convoyeurs compatibles.',
                      style: TextStyle(fontSize: 12, color: _kIndigo),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Origin city
            _buildLabel('Ville de départ'),
            _CityInputField(
              value: _originCity,
              hasGeo: _originGeo != null,
              suggestions: _originSugs,
              showSugs: _showOriginSugs,
              onChanged: _searchOrigin,
              onSelect: (s) {
                setState(() {
                  _originGeo = s;
                  _originCity = s['city'];
                  _showOriginSugs = false;
                });
              },
              dotColor: _kGreen,
              placeholder: 'Ex: Paris, Lyon...',
            ),
            const SizedBox(height: 16),

            // Waypoints (V3 new)
            _buildLabel('Villes de passage (optionnel)'),
            const Text('Améliorent le matching avec les passagers sur votre route',
                style: TextStyle(fontSize: 11, color: Colors.grey)),
            const SizedBox(height: 8),
            if (_waypoints.isNotEmpty)
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: _waypoints.asMap().entries.map((e) {
                  return Chip(
                    avatar: const Icon(Icons.place, size: 14, color: _kAmber),
                    label: Text(e.value['city'], style: const TextStyle(fontSize: 12)),
                    backgroundColor: _kAmber.withValues(alpha: 0.08),
                    deleteIcon: const Icon(Icons.close, size: 14),
                    onDeleted: () => setState(() => _waypoints.removeAt(e.key)),
                  );
                }).toList(),
              ),
            _CityInputField(
              value: _wpInput,
              hasGeo: false,
              suggestions: _wpSugs,
              showSugs: _showWpSugs,
              onChanged: _searchWaypoint,
              onSelect: (s) {
                setState(() {
                  _waypoints.add({'city': s['city'], 'lat': s['lat'], 'lng': s['lng']});
                  _wpInput = '';
                  _wpSugs = [];
                  _showWpSugs = false;
                });
              },
              dotColor: _kAmber,
              placeholder: 'Ajouter une ville de passage...',
            ),
            const SizedBox(height: 16),

            // Destination city
            _buildLabel('Ville de livraison (arrivée)'),
            _CityInputField(
              value: _destCity,
              hasGeo: _destGeo != null,
              suggestions: _destSugs,
              showSugs: _showDestSugs,
              onChanged: _searchDest,
              onSelect: (s) {
                setState(() {
                  _destGeo = s;
                  _destCity = s['city'];
                  _showDestSugs = false;
                });
              },
              dotColor: _kBlue,
              placeholder: 'Ex: Marseille, Bordeaux...',
            ),
            const SizedBox(height: 20),

            // Date + time
            _buildLabel('Quand partez-vous ?'),
            Row(
              children: [
                Expanded(child: _buildDatePicker()),
                const SizedBox(width: 10),
                Expanded(child: _buildTimePicker('Départ', _departureTime, (t) => setState(() => _departureTime = t))),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(child: _buildTimePicker('Au plus tard', _latestDeparture, (t) => setState(() => _latestDeparture = t))),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Arrivée ≈', style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
                      const SizedBox(height: 4),
                      InkWell(
                        onTap: () async {
                          final t = await showTimePicker(
                            context: context,
                            initialTime: const TimeOfDay(hour: 12, minute: 0),
                          );
                          if (t != null) setState(() => _arrivalTime = _timeStr(t));
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: Colors.grey.shade300),
                            color: Colors.grey.shade50,
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.access_time, size: 16, color: _kIndigo),
                              const SizedBox(width: 6),
                              Text(
                                _arrivalTime.isNotEmpty ? _arrivalTime : '—',
                                style: const TextStyle(fontSize: 13),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),

            // Seats / detour / vehicle
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildLabel('Places'),
                      _buildDropdown<int>(
                        _seats,
                        [1, 2, 3, 4].map((n) => DropdownMenuItem(value: n, child: Text('$n'))).toList(),
                        (v) => setState(() => _seats = v!),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildLabel('Flexibilité'),
                      _buildDropdown<int>(
                        _maxDetour,
                        [5, 10, 15, 20, 30, 50].map((n) => DropdownMenuItem(value: n, child: Text('$n km'))).toList(),
                        (v) => setState(() => _maxDetour = v!),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildLabel('Véhicule'),
                      _buildDropdown<String>(
                        _vehicleType,
                        _vehicleLabels.entries.map((e) => DropdownMenuItem(value: e.key, child: Text(e.value, style: const TextStyle(fontSize: 12)))).toList(),
                        (v) => setState(() => _vehicleType = v!),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),

            // Auto-return (V3 new)
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: _needsReturn ? _kPurple.withValues(alpha: 0.04) : Colors.grey.shade50,
                borderRadius: BorderRadius.circular(16),
                border: _needsReturn
                    ? Border.all(color: _kPurple.withValues(alpha: 0.3), width: 2)
                    : null,
              ),
              child: Column(
                children: [
                  Row(
                    children: [
                      Switch(
                        value: _needsReturn,
                        onChanged: (v) => setState(() => _needsReturn = v),
                        activeColor: _kPurple,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Row(
                              children: [
                                Icon(Icons.refresh, size: 16, color: _kPurple),
                                SizedBox(width: 6),
                                Text('J\'ai besoin d\'un retour après livraison',
                                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                              ],
                            ),
                            Text('Une demande de lift sera automatiquement créée',
                                style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
                          ],
                        ),
                      ),
                    ],
                  ),
                  if (_needsReturn) ...[
                    const SizedBox(height: 16),
                    _buildLabel('Retour vers quelle ville ?'),
                    _CityInputField(
                      value: _returnCity,
                      hasGeo: _returnGeo != null,
                      suggestions: _returnSugs,
                      showSugs: _showReturnSugs,
                      onChanged: _searchReturn,
                      onSelect: (s) {
                        setState(() {
                          _returnGeo = s;
                          _returnCity = s['city'];
                          _showReturnSugs = false;
                        });
                      },
                      dotColor: _kPurple,
                      placeholder: 'Ex: Paris, base...',
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(child: _buildTimePicker('Disponible dès', _returnFrom, (t) => setState(() => _returnFrom = t))),
                        const SizedBox(width: 10),
                        Expanded(child: _buildTimePicker('Jusqu\'à', _returnTo, (t) => setState(() => _returnTo = t))),
                      ],
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Notes
            _buildLabel('Notes (optionnel)'),
            TextField(
              maxLines: 2,
              onChanged: (v) => _notes = v,
              decoration: InputDecoration(
                hintText: 'Infos utiles : autoroute ou nationale, pause prévue...',
                hintStyle: TextStyle(fontSize: 13, color: Colors.grey.shade400),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                contentPadding: const EdgeInsets.all(14),
              ),
            ),
            const SizedBox(height: 16),

            // Error
            if (_error.isNotEmpty)
              Container(
                padding: const EdgeInsets.all(12),
                margin: const EdgeInsets.only(bottom: 12),
                decoration: BoxDecoration(
                  color: _kRed.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: _kRed.withValues(alpha: 0.3)),
                ),
                child: Text(_error, style: const TextStyle(fontSize: 13, color: _kRed)),
              ),

            // Submit
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _originGeo != null && _destGeo != null && !_saving ? _submit : null,
                icon: _saving
                    ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Icon(Icons.directions_car),
                label: Text(
                  _saving
                      ? 'Publication...'
                      : 'Publier mon trajet${_needsReturn ? ' + demande de retour' : ''}',
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: _kIndigo,
                  foregroundColor: Colors.white,
                  disabledBackgroundColor: Colors.grey.shade300,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
              ),
            ),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  Widget _buildLabel(String text) => Padding(
        padding: const EdgeInsets.only(bottom: 6),
        child: Text(text, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.grey.shade700)),
      );

  Widget _buildDatePicker() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Date', style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
        const SizedBox(height: 4),
        InkWell(
          onTap: () async {
            final picked = await showDatePicker(
              context: context,
              initialDate: _date,
              firstDate: DateTime.now(),
              lastDate: DateTime.now().add(const Duration(days: 90)),
              locale: const Locale('fr'),
            );
            if (picked != null) setState(() => _date = picked);
          },
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.grey.shade300),
              color: Colors.grey.shade50,
            ),
            child: Row(
              children: [
                const Icon(Icons.calendar_today, size: 16, color: _kIndigo),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    DateFormat('EEE d MMM', 'fr_FR').format(_date),
                    style: const TextStyle(fontSize: 13),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildTimePicker(String label, TimeOfDay time, ValueChanged<TimeOfDay> onChanged) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
        const SizedBox(height: 4),
        InkWell(
          onTap: () async {
            final picked = await showTimePicker(context: context, initialTime: time);
            if (picked != null) onChanged(picked);
          },
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.grey.shade300),
              color: Colors.grey.shade50,
            ),
            child: Row(
              children: [
                const Icon(Icons.access_time, size: 16, color: _kIndigo),
                const SizedBox(width: 6),
                Text(_timeStr(time), style: const TextStyle(fontSize: 13)),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildDropdown<T>(T value, List<DropdownMenuItem<T>> items, ValueChanged<T?> onChanged) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade300),
        color: Colors.grey.shade50,
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<T>(
          value: value,
          items: items,
          onChanged: onChanged,
          isExpanded: true,
          style: const TextStyle(fontSize: 13, color: Colors.black87),
        ),
      ),
    );
  }
}

// ============================================================================
// CREATE REQUEST SCREEN — V3
// ============================================================================

class _CreateRequestScreen extends StatefulWidget {
  final String userId;
  final Future<void> Function() onCreated;

  const _CreateRequestScreen({required this.userId, required this.onCreated});

  @override
  State<_CreateRequestScreen> createState() => _CreateRequestScreenState();
}

class _CreateRequestScreenState extends State<_CreateRequestScreen> {
  final _supabase = Supabase.instance.client;

  String _pickupCity = '';
  Map<String, dynamic>? _pickupGeo;
  List<Map<String, dynamic>> _pickupSugs = [];
  bool _showPickupSugs = false;

  String _destCity = '';
  Map<String, dynamic>? _destGeo;
  List<Map<String, dynamic>> _destSugs = [];
  bool _showDestSugs = false;

  DateTime _date = DateTime.now();
  TimeOfDay _timeStart = const TimeOfDay(hour: 8, minute: 0);
  TimeOfDay _timeEnd = const TimeOfDay(hour: 18, minute: 0);
  int _maxDetour = 20;
  bool _acceptPartial = true;
  String _notes = '';
  bool _saving = false;
  String _error = '';

  void _searchPickup(String q) async {
    setState(() {
      _pickupCity = q;
      _pickupGeo = null;
    });
    if (q.length >= 2) {
      final sugs = await _geocodeCity(q);
      if (mounted) setState(() { _pickupSugs = sugs; _showPickupSugs = sugs.isNotEmpty; });
    } else {
      setState(() { _pickupSugs = []; _showPickupSugs = false; });
    }
  }

  void _searchDest(String q) async {
    setState(() {
      _destCity = q;
      _destGeo = null;
    });
    if (q.length >= 2) {
      final sugs = await _geocodeCity(q);
      if (mounted) setState(() { _destSugs = sugs; _showDestSugs = sugs.isNotEmpty; });
    } else {
      setState(() { _destSugs = []; _showDestSugs = false; });
    }
  }

  String _timeStr(TimeOfDay t) =>
      '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';

  Future<void> _submit() async {
    if (_pickupGeo == null || _destGeo == null) {
      setState(() => _error = 'Sélectionnez les villes de départ et de destination');
      return;
    }

    setState(() { _saving = true; _error = ''; });

    try {
      await _supabase.from('ride_requests').insert({
        'user_id': widget.userId,
        'pickup_city': _pickupGeo!['city'],
        'pickup_lat': _pickupGeo!['lat'],
        'pickup_lng': _pickupGeo!['lng'],
        'destination_city': _destGeo!['city'],
        'destination_lat': _destGeo!['lat'],
        'destination_lng': _destGeo!['lng'],
        'needed_date': DateFormat('yyyy-MM-dd').format(_date),
        'time_window_start': _timeStr(_timeStart),
        'time_window_end': _timeStr(_timeEnd),
        'max_detour_km': _maxDetour,
        'accept_partial': _acceptPartial,
        'request_type': 'custom',
        'status': 'active',
        'notes': _notes.isNotEmpty ? _notes : null,
      });

      await widget.onCreated();
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    }

    if (mounted) setState(() => _saving = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Je cherche un lift',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        backgroundColor: _kAmber,
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: _kAmber.withValues(alpha: 0.06),
                borderRadius: BorderRadius.circular(14),
              ),
              child: const Row(
                children: [
                  Icon(Icons.info_outline, color: _kAmber, size: 20),
                  SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'Un convoyeur passe peut-être par votre chemin. Publiez votre demande !',
                      style: TextStyle(fontSize: 12, color: _kAmber),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            _buildLabel('Où êtes-vous ?'),
            _CityInputField(
              value: _pickupCity,
              hasGeo: _pickupGeo != null,
              suggestions: _pickupSugs,
              showSugs: _showPickupSugs,
              onChanged: _searchPickup,
              onSelect: (s) {
                setState(() {
                  _pickupGeo = s;
                  _pickupCity = s['city'];
                  _showPickupSugs = false;
                });
              },
              dotColor: _kAmber,
              placeholder: 'Ville actuelle...',
            ),
            const SizedBox(height: 16),

            _buildLabel('Où voulez-vous aller ?'),
            _CityInputField(
              value: _destCity,
              hasGeo: _destGeo != null,
              suggestions: _destSugs,
              showSugs: _showDestSugs,
              onChanged: _searchDest,
              onSelect: (s) {
                setState(() {
                  _destGeo = s;
                  _destCity = s['city'];
                  _showDestSugs = false;
                });
              },
              dotColor: _kBlue,
              placeholder: 'Ville de destination...',
            ),
            const SizedBox(height: 20),

            _buildLabel('Quand êtes-vous disponible ?'),
            Row(
              children: [
                Expanded(child: _buildDatePicker()),
                const SizedBox(width: 10),
                Expanded(child: _buildTimePicker('À partir de', _timeStart, (t) => setState(() => _timeStart = t))),
                const SizedBox(width: 10),
                Expanded(child: _buildTimePicker('Jusqu\'à', _timeEnd, (t) => setState(() => _timeEnd = t))),
              ],
            ),
            const SizedBox(height: 20),

            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildLabel('Flexibilité trajet'),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.grey.shade300),
                          color: Colors.grey.shade50,
                        ),
                        child: DropdownButtonHideUnderline(
                          child: DropdownButton<int>(
                            value: _maxDetour,
                            items: [5, 10, 15, 20, 30, 50]
                                .map((n) => DropdownMenuItem(value: n, child: Text('$n km')))
                                .toList(),
                            onChanged: (v) => setState(() => _maxDetour = v!),
                            isExpanded: true,
                            style: const TextStyle(fontSize: 13, color: Colors.black87),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.only(top: 24),
                    child: Row(
                      children: [
                        Checkbox(
                          value: _acceptPartial,
                          onChanged: (v) => setState(() => _acceptPartial = v ?? true),
                          activeColor: _kBlue,
                        ),
                        const Expanded(
                          child: Text('Accepte un bout du trajet',
                              style: TextStyle(fontSize: 12)),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),

            _buildLabel('Notes (optionnel)'),
            TextField(
              maxLines: 2,
              onChanged: (v) => _notes = v,
              decoration: InputDecoration(
                hintText: 'Infos utiles pour le conducteur...',
                hintStyle: TextStyle(fontSize: 13, color: Colors.grey.shade400),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                contentPadding: const EdgeInsets.all(14),
              ),
            ),
            const SizedBox(height: 16),

            if (_error.isNotEmpty)
              Container(
                padding: const EdgeInsets.all(12),
                margin: const EdgeInsets.only(bottom: 12),
                decoration: BoxDecoration(
                  color: _kRed.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: _kRed.withValues(alpha: 0.3)),
                ),
                child: Text(_error, style: const TextStyle(fontSize: 13, color: _kRed)),
              ),

            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _pickupGeo != null && _destGeo != null && !_saving ? _submit : null,
                icon: _saving
                    ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Icon(Icons.directions_walk),
                label: Text(
                  _saving ? 'Publication...' : 'Publier ma demande de lift',
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: _kAmber,
                  foregroundColor: Colors.white,
                  disabledBackgroundColor: Colors.grey.shade300,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
              ),
            ),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  Widget _buildLabel(String text) => Padding(
        padding: const EdgeInsets.only(bottom: 6),
        child: Text(text, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.grey.shade700)),
      );

  Widget _buildDatePicker() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Date', style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
        const SizedBox(height: 4),
        InkWell(
          onTap: () async {
            final picked = await showDatePicker(
              context: context,
              initialDate: _date,
              firstDate: DateTime.now(),
              lastDate: DateTime.now().add(const Duration(days: 90)),
              locale: const Locale('fr'),
            );
            if (picked != null) setState(() => _date = picked);
          },
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.grey.shade300),
              color: Colors.grey.shade50,
            ),
            child: Row(
              children: [
                const Icon(Icons.calendar_today, size: 16, color: _kAmber),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    DateFormat('EEE d MMM', 'fr_FR').format(_date),
                    style: const TextStyle(fontSize: 13),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildTimePicker(String label, TimeOfDay time, ValueChanged<TimeOfDay> onChanged) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
        const SizedBox(height: 4),
        InkWell(
          onTap: () async {
            final picked = await showTimePicker(context: context, initialTime: time);
            if (picked != null) onChanged(picked);
          },
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.grey.shade300),
              color: Colors.grey.shade50,
            ),
            child: Row(
              children: [
                const Icon(Icons.access_time, size: 16, color: _kAmber),
                const SizedBox(width: 6),
                Text(
                  '${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}',
                  style: const TextStyle(fontSize: 13),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

// ============================================================================
// CITY INPUT FIELD — Reusable autocomplete
// ============================================================================

class _CityInputField extends StatelessWidget {
  final String value;
  final bool hasGeo;
  final List<Map<String, dynamic>> suggestions;
  final bool showSugs;
  final ValueChanged<String> onChanged;
  final ValueChanged<Map<String, dynamic>> onSelect;
  final Color dotColor;
  final String placeholder;

  const _CityInputField({
    required this.value,
    required this.hasGeo,
    required this.suggestions,
    required this.showSugs,
    required this.onChanged,
    required this.onSelect,
    required this.dotColor,
    required this.placeholder,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: Colors.grey.shade300),
            color: Colors.grey.shade50,
          ),
          child: Row(
            children: [
              const SizedBox(width: 14),
              Container(
                width: 10,
                height: 10,
                decoration: BoxDecoration(color: dotColor, shape: BoxShape.circle),
              ),
              Expanded(
                child: TextFormField(
                  initialValue: value.isNotEmpty ? value : null,
                  onChanged: onChanged,
                  decoration: InputDecoration(
                    hintText: placeholder,
                    hintStyle: TextStyle(fontSize: 13, color: Colors.grey.shade400),
                    border: InputBorder.none,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 14),
                    suffixIcon: hasGeo
                        ? const Icon(Icons.check_circle, color: _kGreen, size: 20)
                        : null,
                  ),
                ),
              ),
            ],
          ),
        ),
        if (showSugs && suggestions.isNotEmpty)
          Container(
            margin: const EdgeInsets.only(top: 4),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.grey.shade200),
              boxShadow: [
                BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 8),
              ],
            ),
            child: Column(
              children: suggestions.map((s) {
                return InkWell(
                  onTap: () => onSelect(s),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    child: Row(
                      children: [
                        Icon(Icons.place, size: 16, color: dotColor),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(s['label'] ?? '', style: const TextStyle(fontSize: 13)),
                        ),
                      ],
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
      ],
    );
  }
}
