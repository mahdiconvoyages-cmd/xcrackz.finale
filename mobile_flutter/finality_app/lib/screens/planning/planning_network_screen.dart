// ============================================================================
// Réseau Planning V2 — Covoiturage Intelligent entre Convoyeurs
// Carte live + Conducteur/Piéton + Matching IA route-based
// Tables V2: ride_offers, ride_requests, ride_matches, ride_messages, active_drivers_on_road
// ============================================================================

import 'dart:convert';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:http/http.dart' as http;
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../onboarding/location_onboarding_screen.dart';
import '../../services/planning_location_service.dart';

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

  // Data
  List<Map<String, dynamic>> _myOffers = [];
  List<Map<String, dynamic>> _allOffers = [];
  List<Map<String, dynamic>> _myRequests = [];
  List<Map<String, dynamic>> _allRequests = [];
  List<Map<String, dynamic>> _matches = [];
  List<Map<String, dynamic>> _liveDrivers = [];
  bool _loading = true;
  bool _showOnboarding = false;
  int _pendingMatchCount = 0;

  // Realtime channels
  RealtimeChannel? _offersChannel;
  RealtimeChannel? _requestsChannel;
  RealtimeChannel? _matchesChannel;

  String get _userId => _supabase.auth.currentUser?.id ?? '';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _checkOnboarding();
    _loadData();
    _initLocationService();
    _subscribeRealtime();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _offersChannel?.unsubscribe();
    _requestsChannel?.unsubscribe();
    _matchesChannel?.unsubscribe();
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
  // DATA LOADING
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
        // 1: All active offers (not mine)
        _supabase
            .from('ride_offers')
            .select('*, profiles!ride_offers_user_id_fkey(first_name, last_name, company_name, phone)')
            .neq('user_id', _userId)
            .inFilter('status', ['active', 'en_route'])
            .order('departure_date', ascending: true),
        // 2: My requests
        _supabase
            .from('ride_requests')
            .select('*')
            .eq('user_id', _userId)
            .order('created_at', ascending: false),
        // 3: All active requests (not mine)
        _supabase
            .from('ride_requests')
            .select('*, profiles!ride_requests_user_id_fkey(first_name, last_name, company_name, phone)')
            .neq('user_id', _userId)
            .eq('status', 'active')
            .order('needed_date', ascending: true),
        // 4: My matches
        _supabase
            .from('ride_matches')
            .select('*, ride_offers(*), ride_requests(*)')
            .or('driver_id.eq.$_userId,passenger_id.eq.$_userId')
            .order('created_at', ascending: false),
        // 5: Live drivers on road
        _supabase.from('active_drivers_on_road').select('*'),
      ]);

      final matchesList =
          List<Map<String, dynamic>>.from(results[4] as List? ?? []);
      final pending = matchesList
          .where((m) =>
              m['status'] == 'proposed' && m['passenger_id'] == _userId)
          .length;

      if (mounted) {
        setState(() {
          _myOffers =
              List<Map<String, dynamic>>.from(results[0] as List? ?? []);
          _allOffers =
              List<Map<String, dynamic>>.from(results[1] as List? ?? []);
          _myRequests =
              List<Map<String, dynamic>>.from(results[2] as List? ?? []);
          _allRequests =
              List<Map<String, dynamic>>.from(results[3] as List? ?? []);
          _matches = matchesList;
          _liveDrivers =
              List<Map<String, dynamic>>.from(results[5] as List? ?? []);
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
  // REALTIME SUBSCRIPTIONS
  // ============================================================================

  void _subscribeRealtime() {
    _offersChannel = _supabase
        .channel('ride-offers-changes')
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'ride_offers',
          callback: (_) => _loadData(),
        )
        .subscribe();

    _requestsChannel = _supabase
        .channel('ride-requests-changes')
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'ride_requests',
          callback: (_) => _loadData(),
        )
        .subscribe();

    _matchesChannel = _supabase
        .channel('ride-matches-changes')
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

  Future<void> _runMatchingForRequest(String requestId) async {
    try {
      final results = await _supabase.rpc('find_ride_matches_for_request',
          params: {'p_request_id': requestId});
      
      final matches = List<Map<String, dynamic>>.from(results as List? ?? []);
      int inserted = 0;
      
      for (final match in matches) {
        try {
          await _supabase.from('ride_matches').upsert({
            'offer_id': match['offer_id'],
            'request_id': requestId,
            'driver_id': match['driver_id'],
            'passenger_id': _userId,
            'pickup_city': match['pickup_city'],
            'dropoff_city': match['dropoff_city'],
            'detour_km': match['detour_km'],
            'distance_covered_km': match['distance_covered_km'],
            'match_score': match['match_score'],
            'match_type': match['match_type'],
            'status': 'proposed',
          }, onConflict: 'offer_id,request_id');
          inserted++;
        } catch (_) {}
      }
      
      await _loadData();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(inserted > 0
                ? '🎯 $inserted match${inserted > 1 ? 's' : ''} trouvé${inserted > 1 ? 's' : ''} ! Vérifiez l\'onglet Mes Matchs.'
                : '😕 Aucun match trouvé pour le moment. Réessayez plus tard.'),
            backgroundColor: inserted > 0 ? const Color(0xFF10B981) : const Color(0xFFF59E0B),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur matching: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  Future<void> _deleteOffer(String id) async {
    await _supabase.from('ride_offers').delete().eq('id', id);
    _loadData();
  }

  Future<void> _toggleOfferPause(String id, String currentStatus) async {
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
            expandedHeight: 160,
            floating: false,
            pinned: true,
            backgroundColor: const Color(0xFF6366F1),
            flexibleSpace: FlexibleSpaceBar(
              background: Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      Color(0xFF6366F1),
                      Color(0xFF8B5CF6),
                      Color(0xFFEC4899),
                    ],
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
                              '🚗 Réseau Covoiturage',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 22,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                            const Spacer(),
                            if (_pendingMatchCount > 0)
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF59E0B),
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
                        // Quick stats row
                        Row(
                          children: [
                            _QuickStat(
                              value: '${_myOffers.length}',
                              label: 'Offres',
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
                              value:
                                  '${_matches.where((m) => m['status'] == 'accepted').length}',
                              label: 'Matchs',
                              icon: Icons.handshake,
                            ),
                            const SizedBox(width: 12),
                            _QuickStat(
                              value: '${_liveDrivers.length}',
                              label: 'En route',
                              icon: Icons.gps_fixed,
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
          // Pinned TabBar
          SliverPersistentHeader(
            pinned: true,
            delegate: _TabBarDelegate(
              TabBar(
                controller: _tabController,
                labelColor: const Color(0xFF6366F1),
                unselectedLabelColor: Colors.grey,
                indicatorColor: const Color(0xFF6366F1),
                indicatorWeight: 3,
                labelStyle: const TextStyle(
                    fontWeight: FontWeight.w700, fontSize: 12),
                tabs: [
                  const Tab(
                      icon: Icon(Icons.map, size: 18), text: 'Carte Live'),
                  const Tab(
                      icon: Icon(Icons.directions_car, size: 18),
                      text: 'Conducteurs'),
                  const Tab(
                      icon: Icon(Icons.directions_walk, size: 18),
                      text: 'Passagers'),
                  Tab(
                    icon: Badge(
                      isLabelVisible: _pendingMatchCount > 0,
                      label: Text('$_pendingMatchCount',
                          style: const TextStyle(fontSize: 9)),
                      child: const Icon(Icons.handshake, size: 18),
                    ),
                    text: 'Mes Matchs',
                  ),
                ],
              ),
            ),
          ),
        ],
        body: _loading
            ? const Center(
                child:
                    CircularProgressIndicator(color: Color(0xFF6366F1)))
            : TabBarView(
                controller: _tabController,
                children: [
                  _LiveTab(
                    drivers: _liveDrivers,
                    offers: _allOffers,
                    userId: _userId,
                    onRefresh: _loadData,
                  ),
                  _OffersTab(
                    myOffers: _myOffers,
                    allOffers: _allOffers,
                    onDelete: _deleteOffer,
                    onTogglePause: _toggleOfferPause,
                    onCreate: () => _showCreateOfferDialog(),
                    onRefresh: _loadData,
                  ),
                  _RequestsTab(
                    myRequests: _myRequests,
                    allRequests: _allRequests,
                    onDelete: _deleteRequest,
                    onMatch: _runMatchingForRequest,
                    onCreate: () => _showCreateRequestDialog(),
                    onRefresh: _loadData,
                  ),
                  _MatchesTab(
                    matches: _matches,
                    userId: _userId,
                    onRespond: _respondToMatch,
                    onRefresh: _loadData,
                  ),
                ],
              ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showCreateChoiceSheet,
        backgroundColor: const Color(0xFF6366F1),
        icon: const Icon(Icons.add, color: Colors.white),
        label: const Text('Publier',
            style:
                TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
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
                iconColor: const Color(0xFF10B981),
                title: 'J\'offre une place 🚗',
                subtitle: 'J\'ai un véhicule à convoyer et une place libre',
                onTap: () {
                  Navigator.pop(context);
                  _showCreateOfferDialog();
                },
              ),
              const SizedBox(height: 12),
              _ChoiceCard(
                icon: Icons.directions_walk,
                iconColor: const Color(0xFF3B82F6),
                title: 'Je cherche un lift 🚶',
                subtitle: 'Je dois rejoindre un point ou rentrer à ma base',
                onTap: () {
                  Navigator.pop(context);
                  _showCreateRequestDialog();
                },
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }

  void _showCreateOfferDialog() {
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

  void _showCreateRequestDialog() {
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

  const _QuickStat({
    required this.value,
    required this.label,
    required this.icon,
  });

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
                    color: Colors.white,
                    fontWeight: FontWeight.w900,
                    fontSize: 16)),
            Text(label,
                style:
                    const TextStyle(color: Colors.white60, fontSize: 10)),
          ],
        ),
      ),
    );
  }
}

// ============================================================================
// CHOICE CARD (for bottom sheet)
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
                      style: const TextStyle(
                          fontWeight: FontWeight.bold, fontSize: 15)),
                  const SizedBox(height: 2),
                  Text(subtitle,
                      style:
                          const TextStyle(color: Colors.grey, fontSize: 12)),
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
  Widget build(
      BuildContext context, double shrinkOffset, bool overlapsContent) {
    return Container(color: Colors.white, child: tabBar);
  }

  @override
  bool shouldRebuild(covariant _TabBarDelegate oldDelegate) => false;
}

// ============================================================================
// LIVE TAB — Active drivers on road + all offers
// ============================================================================

class _LiveTab extends StatefulWidget {
  final List<Map<String, dynamic>> drivers;
  final List<Map<String, dynamic>> offers;
  final String userId;
  final Future<void> Function() onRefresh;

  const _LiveTab({
    required this.drivers,
    required this.offers,
    required this.userId,
    required this.onRefresh,
  });

  @override
  State<_LiveTab> createState() => _LiveTabState();
}

class _LiveTabState extends State<_LiveTab> {
  final MapController _mapController = MapController();
  final TextEditingController _fromCtrl = TextEditingController();
  final TextEditingController _toCtrl = TextEditingController();
  List<Map<String, String>> _fromSugs = [];
  List<Map<String, String>> _toSugs = [];
  bool _showFromSug = false;
  bool _showToSug = false;
  LatLng? _filterFrom;
  LatLng? _filterTo;
  String? _filterFromCity;
  String? _filterToCity;
  bool _filterActive = false;
  Map<String, dynamic>? _selectedDriver;
  bool _showList = false;

  Future<List<Map<String, String>>> _geocode(String q) async {
    if (q.length < 2) return [];
    try {
      final res = await http.get(Uri.parse(
          'https://api-adresse.data.gouv.fr/search/?q=${Uri.encodeComponent(q)}&type=municipality&limit=5'));
      if (res.statusCode != 200) return [];
      final data = jsonDecode(res.body);
      return ((data['features'] ?? []) as List).map<Map<String, String>>((f) {
        final props = f['properties'] ?? {};
        final coords = f['geometry']?['coordinates'] ?? [0, 0];
        return {
          'label': '${props['label'] ?? ''} (${props['postcode'] ?? ''})',
          'city': (props['city'] ?? props['label'] ?? '').toString(),
          'lat': coords[1].toString(),
          'lng': coords[0].toString(),
        };
      }).toList();
    } catch (_) {
      return [];
    }
  }

  double _haversineKm(double lat1, double lng1, double lat2, double lng2) {
    const R = 6371.0;
    final dLat = (lat2 - lat1) * pi / 180;
    final dLng = (lng2 - lng1) * pi / 180;
    final a = sin(dLat / 2) * sin(dLat / 2) +
        cos(lat1 * pi / 180) * cos(lat2 * pi / 180) * sin(dLng / 2) * sin(dLng / 2);
    return R * 2 * atan2(sqrt(a), sqrt(1 - a));
  }

  List<Map<String, dynamic>> get _filteredDrivers {
    if (!_filterActive) return widget.drivers;
    return widget.drivers.where((d) {
      bool matchFrom = true, matchTo = true;
      final lat = (d['current_lat'] as num?)?.toDouble();
      final lng = (d['current_lng'] as num?)?.toDouble();
      if (_filterFrom != null && lat != null && lng != null) {
        matchFrom = _haversineKm(lat, lng, _filterFrom!.latitude, _filterFrom!.longitude) < 60 ||
            (d['pickup_city']?.toString().toLowerCase().contains(_filterFromCity?.toLowerCase() ?? '') ?? false);
      }
      if (_filterTo != null) {
        matchTo = d['delivery_city']?.toString().toLowerCase().contains(_filterToCity?.toLowerCase() ?? '') ?? false;
      }
      return matchFrom && matchTo;
    }).toList();
  }

  void _handleSearch() {
    if (_filterFrom == null && _filterTo == null) return;
    setState(() => _filterActive = true);
    if (_filterFrom != null && _filterTo != null) {
      _mapController.fitCamera(CameraFit.bounds(
        bounds: LatLngBounds(_filterFrom!, _filterTo!),
        padding: const EdgeInsets.all(80),
      ));
    } else if (_filterFrom != null) {
      _mapController.move(_filterFrom!, 10);
    }
  }

  void _clearFilter() {
    setState(() {
      _filterActive = false;
      _filterFrom = null;
      _filterTo = null;
      _filterFromCity = null;
      _filterToCity = null;
      _fromCtrl.clear();
      _toCtrl.clear();
      _selectedDriver = null;
    });
    _mapController.move(const LatLng(46.603354, 1.888334), 6);
  }

  @override
  void dispose() {
    _fromCtrl.dispose();
    _toCtrl.dispose();
    _mapController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final drivers = _filteredDrivers;
    final resultCount = drivers.length;

    return Column(
      children: [
        // Search bar
        Container(
          margin: const EdgeInsets.fromLTRB(12, 8, 12, 0),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.08), blurRadius: 10)],
          ),
          child: Column(
            children: [
              // From
              _buildSearchField(_fromCtrl, '🟢 Départ...', _fromSugs, _showFromSug, (q) async {
                final sugs = await _geocode(q);
                setState(() { _fromSugs = sugs; _showFromSug = sugs.isNotEmpty; });
              }, (s) {
                setState(() {
                  _fromCtrl.text = s['city']!;
                  _filterFromCity = s['city'];
                  _filterFrom = LatLng(double.parse(s['lat']!), double.parse(s['lng']!));
                  _showFromSug = false;
                });
                _mapController.move(_filterFrom!, 10);
              }, () => setState(() => _showFromSug = false)),
              const SizedBox(height: 8),
              // To
              _buildSearchField(_toCtrl, '🔵 Arrivée...', _toSugs, _showToSug, (q) async {
                final sugs = await _geocode(q);
                setState(() { _toSugs = sugs; _showToSug = sugs.isNotEmpty; });
              }, (s) {
                setState(() {
                  _toCtrl.text = s['city']!;
                  _filterToCity = s['city'];
                  _filterTo = LatLng(double.parse(s['lat']!), double.parse(s['lng']!));
                  _showToSug = false;
                });
              }, () => setState(() => _showToSug = false)),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: (_filterFrom != null || _filterTo != null) ? _handleSearch : null,
                      icon: const Icon(Icons.search, size: 18),
                      label: const Text('Rechercher'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF6366F1),
                        foregroundColor: Colors.white,
                        disabledBackgroundColor: Colors.grey.shade300,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                    ),
                  ),
                  if (_filterActive) ...[
                    const SizedBox(width: 8),
                    OutlinedButton.icon(
                      onPressed: _clearFilter,
                      icon: const Icon(Icons.close, size: 16),
                      label: const Text('Effacer'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.red,
                        side: const BorderSide(color: Colors.red),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 12),
                      ),
                    ),
                  ],
                ],
              ),
              if (_filterActive)
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: resultCount > 0 ? const Color(0xFFEEF2FF) : const Color(0xFFFEE2E2),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          resultCount > 0
                              ? '$resultCount résultat${resultCount > 1 ? 's' : ''} trouvé${resultCount > 1 ? 's' : ''}'
                              : 'Aucun résultat',
                          style: TextStyle(
                            fontSize: 12, fontWeight: FontWeight.bold,
                            color: resultCount > 0 ? const Color(0xFF4338CA) : const Color(0xFFDC2626),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
            ],
          ),
        ),

        // Toggle Map / List
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          child: Row(
            children: [
              _ToggleChip(label: 'Carte', icon: Icons.map, selected: !_showList, onTap: () => setState(() => _showList = false)),
              const SizedBox(width: 8),
              _ToggleChip(label: 'Liste', icon: Icons.list, selected: _showList, onTap: () => setState(() => _showList = true)),
              const Spacer(),
              Text('${drivers.length} conducteur${drivers.length != 1 ? 's' : ''}',
                  style: const TextStyle(fontSize: 12, color: Colors.grey)),
            ],
          ),
        ),

        // Map or List
        Expanded(
          child: _showList
              ? _buildListView(drivers)
              : _buildMapView(drivers),
        ),

        // Selected driver bottom sheet
        if (_selectedDriver != null)
          _buildDriverBottomSheet(),
      ],
    );
  }

  Widget _buildSearchField(
    TextEditingController ctrl,
    String placeholder,
    List<Map<String, String>> suggestions,
    bool showSugs,
    void Function(String) onChanged,
    void Function(Map<String, String>) onSelect,
    VoidCallback onDismiss,
  ) {
    return Column(
      children: [
        Container(
          decoration: BoxDecoration(
            color: Colors.grey.shade50,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.grey.shade200),
          ),
          child: TextField(
            controller: ctrl,
            decoration: InputDecoration(
              hintText: placeholder,
              hintStyle: const TextStyle(fontSize: 14),
              border: InputBorder.none,
              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              suffixIcon: ctrl.text.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.close, size: 18),
                      onPressed: () { ctrl.clear(); onDismiss(); },
                    )
                  : null,
            ),
            onChanged: onChanged,
          ),
        ),
        if (showSugs)
          Container(
            margin: const EdgeInsets.only(top: 2),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(10),
              boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 8)],
            ),
            child: Column(
              children: suggestions.map((s) => InkWell(
                onTap: () => onSelect(s),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  child: Row(
                    children: [
                      const Icon(Icons.place, size: 16, color: Colors.grey),
                      const SizedBox(width: 8),
                      Expanded(child: Text(s['label'] ?? '', style: const TextStyle(fontSize: 13))),
                    ],
                  ),
                ),
              )).toList(),
            ),
          ),
      ],
    );
  }

  Widget _buildMapView(List<Map<String, dynamic>> drivers) {
    final markers = <Marker>[];

    for (final d in drivers) {
      final lat = (d['current_lat'] as num?)?.toDouble();
      final lng = (d['current_lng'] as num?)?.toDouble();
      if (lat == null || lng == null) continue;

      final freshness = d['freshness'] ?? '';
      final isLive = freshness == 'live' || freshness == 'recent';
      final seats = d['seats_available'] as int? ?? 0;
      final hasSeats = seats > 0;

      markers.add(Marker(
        point: LatLng(lat, lng),
        width: 50, height: 50,
        child: GestureDetector(
          onTap: () => setState(() => _selectedDriver = d),
          child: Stack(
            clipBehavior: Clip.none,
            children: [
              Container(
                width: 40, height: 40,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: isLive ? (hasSeats ? const Color(0xFF10B981) : const Color(0xFF0066FF)) : const Color(0xFF94A3B8),
                  border: Border.all(color: Colors.white, width: 3),
                  boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.2), blurRadius: 6)],
                ),
                child: const Icon(Icons.directions_car, size: 20, color: Colors.white),
              ),
              if (hasSeats)
                Positioned(
                  top: -4, right: -4,
                  child: Container(
                    width: 22, height: 22,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: const Color(0xFFF59E0B),
                      border: Border.all(color: Colors.white, width: 2),
                    ),
                    child: Center(
                      child: Text('$seats', style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w800)),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ));
    }

    // Search area circles
    final circles = <CircleMarker>[];
    if (_filterActive) {
      if (_filterFrom != null) {
        circles.add(CircleMarker(
          point: _filterFrom!,
          radius: 60000,
          useRadiusInMeter: true,
          color: const Color(0xFF10B981).withValues(alpha: 0.08),
          borderColor: const Color(0xFF10B981),
          borderStrokeWidth: 2,
        ));
      }
      if (_filterTo != null) {
        circles.add(CircleMarker(
          point: _filterTo!,
          radius: 60000,
          useRadiusInMeter: true,
          color: const Color(0xFF0066FF).withValues(alpha: 0.08),
          borderColor: const Color(0xFF0066FF),
          borderStrokeWidth: 2,
        ));
      }
    }

    return FlutterMap(
      mapController: _mapController,
      options: const MapOptions(
        initialCenter: LatLng(46.603354, 1.888334),
        initialZoom: 6,
      ),
      children: [
        TileLayer(
          urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          userAgentPackageName: 'com.checksfleet.app',
        ),
        if (circles.isNotEmpty)
          CircleLayer(circles: circles),
        if (_filterActive && _filterFrom != null && _filterTo != null)
          PolylineLayer(polylines: <Polyline>[
            Polyline(
              points: [_filterFrom!, _filterTo!],
              color: const Color(0xFF6366F1).withValues(alpha: 0.4),
              strokeWidth: 2,
              pattern: StrokePattern.dashed(segments: [10, 8]),
            ),
          ]),
        MarkerLayer(markers: markers),
      ],
    );
  }

  Widget _buildListView(List<Map<String, dynamic>> drivers) {
    if (drivers.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 80, height: 80,
              decoration: BoxDecoration(color: const Color(0xFFE0E7FF), borderRadius: BorderRadius.circular(40)),
              child: const Icon(Icons.gps_fixed, size: 40, color: Color(0xFF6366F1)),
            ),
            const SizedBox(height: 16),
            const Text('Aucun conducteur trouvé', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            if (_filterActive)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: TextButton.icon(
                  onPressed: _clearFilter,
                  icon: const Icon(Icons.close, size: 16),
                  label: const Text('Effacer le filtre'),
                ),
              ),
          ],
        ),
      );
    }
    return RefreshIndicator(
      onRefresh: widget.onRefresh,
      child: ListView.builder(
        padding: const EdgeInsets.all(12),
        itemCount: drivers.length,
        itemBuilder: (_, i) => _LiveDriverCard(driver: drivers[i]),
      ),
    );
  }

  Widget _buildDriverBottomSheet() {
    final d = _selectedDriver!;
    final name = '${d['first_name'] ?? ''} ${d['last_name'] ?? ''}'.trim();
    final company = d['company_name'] ?? '';
    final seats = d['seats_available'] as int? ?? 0;
    final freshness = d['freshness'] ?? '';

    return Container(
      margin: const EdgeInsets.all(12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.15), blurRadius: 16, offset: const Offset(0, -4))],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 10, height: 10,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: freshness == 'live' ? const Color(0xFF10B981) : const Color(0xFFF59E0B),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(child: Text(name.isNotEmpty ? name : 'Conducteur',
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16))),
              if (seats > 0)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(color: const Color(0xFFD1FAE5), borderRadius: BorderRadius.circular(12)),
                  child: Text('$seats place${seats > 1 ? 's' : ''}',
                      style: const TextStyle(color: Color(0xFF059669), fontWeight: FontWeight.bold, fontSize: 12)),
                ),
              const SizedBox(width: 8),
              GestureDetector(
                onTap: () => setState(() => _selectedDriver = null),
                child: const Icon(Icons.close, size: 20, color: Colors.grey),
              ),
            ],
          ),
          if (company.isNotEmpty) Text(company, style: const TextStyle(color: Colors.grey, fontSize: 13)),
          const SizedBox(height: 10),
          Row(
            children: [
              const Icon(Icons.place, size: 14, color: Color(0xFF10B981)),
              const SizedBox(width: 4),
              Text(d['pickup_city'] ?? '', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
              const SizedBox(width: 4),
              const Icon(Icons.arrow_forward, size: 12, color: Colors.grey),
              const SizedBox(width: 4),
              const Icon(Icons.place, size: 14, color: Color(0xFFEF4444)),
              const SizedBox(width: 4),
              Flexible(child: Text(d['delivery_city'] ?? '', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13))),
            ],
          ),
          const SizedBox(height: 6),
          Text('${d['vehicle_brand'] ?? ''} ${d['vehicle_model'] ?? ''} · ${d['reference'] ?? ''}',
              style: const TextStyle(color: Colors.grey, fontSize: 12)),
        ],
      ),
    );
  }
}

class _ToggleChip extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;
  const _ToggleChip({required this.label, required this.icon, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: selected ? const Color(0xFF6366F1) : Colors.grey.shade100,
          borderRadius: BorderRadius.circular(10),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 16, color: selected ? Colors.white : Colors.grey),
            const SizedBox(width: 6),
            Text(label, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600,
                color: selected ? Colors.white : Colors.grey.shade600)),
          ],
        ),
      ),
    );
  }
}

// ============================================================================
// LIVE DRIVER CARD
// ============================================================================

class _LiveDriverCard extends StatelessWidget {
  final Map<String, dynamic> driver;
  const _LiveDriverCard({required this.driver});

  @override
  Widget build(BuildContext context) {
    final name =
        '${driver['first_name'] ?? ''} ${driver['last_name'] ?? ''}'
            .trim();
    final company = driver['company_name'] ?? '';
    final vehicle =
        '${driver['vehicle_brand'] ?? ''} ${driver['vehicle_model'] ?? ''}'
            .trim();
    final pickup = driver['pickup_city'] ?? '';
    final delivery = driver['delivery_city'] ?? '';
    final speed = (driver['speed'] ?? 0).toStringAsFixed(0);
    final seats = driver['seats_available'];
    final freshness = driver['freshness'] ?? '';
    final isFresh = freshness == 'live' || freshness == 'recent';

    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(
          color: isFresh
              ? const Color(0xFF10B981).withValues(alpha: 0.4)
              : Colors.grey.shade200,
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 10,
                  height: 10,
                  decoration: BoxDecoration(
                    color: isFresh
                        ? const Color(0xFF10B981)
                        : const Color(0xFFF59E0B),
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    name.isNotEmpty ? name : 'Conducteur',
                    style: const TextStyle(
                        fontWeight: FontWeight.bold, fontSize: 14),
                  ),
                ),
                if (seats != null && seats > 0)
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: const Color(0xFFD1FAE5),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      '$seats place${seats > 1 ? 's' : ''}',
                      style: const TextStyle(
                        color: Color(0xFF059669),
                        fontWeight: FontWeight.bold,
                        fontSize: 11,
                      ),
                    ),
                  ),
              ],
            ),
            if (company.isNotEmpty) ...[
              const SizedBox(height: 2),
              Text(company,
                  style: const TextStyle(color: Colors.grey, fontSize: 12)),
            ],
            const SizedBox(height: 8),
            // Route
            Row(
              children: [
                const Icon(Icons.place, size: 14, color: Color(0xFF10B981)),
                const SizedBox(width: 4),
                Flexible(
                    child: Text(pickup,
                        style: const TextStyle(
                            fontWeight: FontWeight.w600, fontSize: 13))),
                const SizedBox(width: 4),
                const Icon(Icons.arrow_forward,
                    size: 12, color: Colors.grey),
                const SizedBox(width: 4),
                const Icon(Icons.place, size: 14, color: Color(0xFFEF4444)),
                const SizedBox(width: 4),
                Flexible(
                    child: Text(delivery,
                        style: const TextStyle(
                            fontWeight: FontWeight.w600, fontSize: 13))),
              ],
            ),
            const SizedBox(height: 6),
            // Info chips
            Wrap(
              spacing: 8,
              runSpacing: 4,
              children: [
                if (vehicle.isNotEmpty)
                  _InfoChip(icon: Icons.directions_car, text: vehicle),
                _InfoChip(icon: Icons.speed, text: '$speed km/h'),
                _InfoChip(
                    icon: Icons.access_time,
                    text: _freshnessLabel(freshness)),
              ],
            ),
          ],
        ),
      ),
    );
  }

  String _freshnessLabel(String freshness) {
    switch (freshness) {
      case 'live':
        return 'En direct';
      case 'recent':
        return 'Récent';
      case 'stale':
        return 'Pas à jour';
      default:
        return freshness;
    }
  }
}

// ============================================================================
// OFFERS TAB — Conducteurs
// ============================================================================

class _OffersTab extends StatelessWidget {
  final List<Map<String, dynamic>> myOffers;
  final List<Map<String, dynamic>> allOffers;
  final Future<void> Function(String) onDelete;
  final Future<void> Function(String, String) onTogglePause;
  final VoidCallback onCreate;
  final Future<void> Function() onRefresh;

  const _OffersTab({
    required this.myOffers,
    required this.allOffers,
    required this.onDelete,
    required this.onTogglePause,
    required this.onCreate,
    required this.onRefresh,
  });

  @override
  Widget build(BuildContext context) {
    if (myOffers.isEmpty && allOffers.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: const Color(0xFFD1FAE5),
                borderRadius: BorderRadius.circular(40),
              ),
              child: const Icon(Icons.directions_car,
                  size: 40, color: Color(0xFF10B981)),
            ),
            const SizedBox(height: 16),
            const Text('Aucune offre de trajet',
                style:
                    TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            const Text(
              'Les conducteurs qui offrent une place\napparaîtront ici.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: onCreate,
              icon: const Icon(Icons.add),
              label: const Text('J\'offre une place'),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF10B981),
                foregroundColor: Colors.white,
                padding:
                    const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14)),
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
          if (myOffers.isNotEmpty) ...[
            _SectionHeader(
                title: '🚗 Mes offres', count: myOffers.length),
            const SizedBox(height: 8),
            ...myOffers.map((o) => _OfferCard(
                offer: o,
                onTogglePause: () => onTogglePause(o['id'], o['status'] ?? 'active'),
                isMine: true,
                onDelete: () => onDelete(o['id']))),
            const SizedBox(height: 20),
          ],
          if (allOffers.isNotEmpty) ...[
            _SectionHeader(
                title: '🌐 Offres du réseau', count: allOffers.length),
            const SizedBox(height: 8),
            ...allOffers.map((o) => _OfferCard(offer: o, isMine: false)),
          ],
        ],
      ),
    );
  }
}

// ============================================================================
// OFFER CARD
// ============================================================================

class _OfferCard extends StatelessWidget {
  final Map<String, dynamic> offer;
  final bool isMine;
  final VoidCallback? onDelete;
  final VoidCallback? onTogglePause;

  const _OfferCard({
    required this.offer,
    required this.isMine,
    this.onDelete,
    this.onTogglePause,
  });

  @override
  Widget build(BuildContext context) {
    final profile = offer['profiles'] as Map<String, dynamic>?;
    final name = isMine
        ? 'Mon offre'
        : '${profile?['first_name'] ?? ''} ${profile?['last_name'] ?? ''}'
            .trim();
    final company = profile?['company_name'] ?? '';
    final status = offer['status'] ?? 'active';

    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: isMine
            ? BorderSide(
                color: const Color(0xFF10B981).withValues(alpha: 0.4),
                width: 1.5)
            : BorderSide.none,
      ),
      elevation: isMine ? 3 : 1,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Row(
              children: [
                if (!isMine) ...[
                  CircleAvatar(
                    radius: 18,
                    backgroundColor: const Color(0xFF10B981),
                    child: Text(
                      name.isNotEmpty ? name[0].toUpperCase() : '?',
                      style: const TextStyle(
                          color: Colors.white, fontWeight: FontWeight.bold),
                    ),
                  ),
                  const SizedBox(width: 10),
                ],
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        name.isNotEmpty ? name : 'Conducteur',
                        style: const TextStyle(
                            fontWeight: FontWeight.bold, fontSize: 14),
                      ),
                      if (company.isNotEmpty)
                        Text(company,
                            style: const TextStyle(
                                color: Colors.grey, fontSize: 12)),
                    ],
                  ),
                ),
                _StatusBadge(status: status),
              ],
            ),
            const SizedBox(height: 10),
            // Route
            Row(
              children: [
                const Icon(Icons.place,
                    size: 14, color: Color(0xFF10B981)),
                const SizedBox(width: 4),
                Flexible(
                    child: Text(offer['origin_city'] ?? '',
                        style: const TextStyle(
                            fontWeight: FontWeight.w600, fontSize: 13))),
                const SizedBox(width: 4),
                const Icon(Icons.arrow_forward,
                    size: 12, color: Colors.grey),
                const SizedBox(width: 4),
                const Icon(Icons.place,
                    size: 14, color: Color(0xFFEF4444)),
                const SizedBox(width: 4),
                Flexible(
                    child: Text(offer['destination_city'] ?? '',
                        style: const TextStyle(
                            fontWeight: FontWeight.w600, fontSize: 13))),
              ],
            ),
            if (offer['needs_return'] == true &&
                offer['return_to_city'] != null) ...[
              const SizedBox(height: 4),
              Row(
                children: [
                  const SizedBox(width: 18),
                  const Icon(Icons.subdirectory_arrow_right,
                      size: 14, color: Color(0xFF3B82F6)),
                  const SizedBox(width: 4),
                  const Icon(Icons.home,
                      size: 14, color: Color(0xFF3B82F6)),
                  const SizedBox(width: 4),
                  Text(
                    'Retour → ${offer['return_to_city']}',
                    style: const TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 12,
                      color: Color(0xFF3B82F6),
                    ),
                  ),
                ],
              ),
            ],
            const SizedBox(height: 8),
            // Details
            Wrap(
              spacing: 10,
              runSpacing: 4,
              children: [
                _InfoChip(
                    icon: Icons.calendar_today,
                    text: _formatDate(offer['departure_date'])),
                if (offer['departure_time'] != null)
                  _InfoChip(
                      icon: Icons.access_time,
                      text: (offer['departure_time'] ?? '')
                          .toString()
                          .substring(0, 5)),
                _InfoChip(
                    icon: Icons.event_seat,
                    text:
                        '${offer['seats_available'] ?? 1} place${(offer['seats_available'] ?? 1) > 1 ? 's' : ''}'),
                _InfoChip(
                    icon: Icons.directions_car,
                    text: _vehicleLabel(offer['vehicle_type'])),
                if ((offer['max_detour_km'] ?? 0) > 0)
                  _InfoChip(
                      icon: Icons.swap_horiz,
                      text:
                          'Détour max ${offer['max_detour_km']}km'),
              ],
            ),
            if (isMine && onDelete != null) ...[
              const SizedBox(height: 10),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  if (onTogglePause != null)
                    Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: _ActionChip(
                        icon: status == 'paused' ? Icons.play_arrow : Icons.pause,
                        label: status == 'paused' ? 'Réactiver' : 'Pause',
                        color: status == 'paused' ? const Color(0xFF10B981) : const Color(0xFFF59E0B),
                        onTap: onTogglePause!,
                      ),
                    ),
                  _ActionChip(
                    icon: Icons.delete_outline,
                    label: 'Supprimer',
                    color: const Color(0xFFEF4444),
                    onTap: () async {
                      final confirm = await showDialog<bool>(
                        context: context,
                        builder: (_) => AlertDialog(
                          title: const Text('Supprimer ?'),
                          content: const Text(
                              'Cette offre sera définitivement supprimée.'),
                          actions: [
                            TextButton(
                                onPressed: () =>
                                    Navigator.pop(context, false),
                                child: const Text('Annuler')),
                            TextButton(
                                onPressed: () =>
                                    Navigator.pop(context, true),
                                child: const Text('Supprimer',
                                    style: TextStyle(color: Colors.red))),
                          ],
                        ),
                      );
                      if (confirm == true) onDelete!();
                    },
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  String _formatDate(String? date) {
    if (date == null) return '';
    try {
      return DateFormat('EEE d MMM', 'fr_FR')
          .format(DateTime.parse(date));
    } catch (_) {
      return date;
    }
  }

  String _vehicleLabel(String? type) {
    switch (type) {
      case 'car':
        return 'Voiture';
      case 'utility':
        return 'Utilitaire';
      case 'truck':
        return 'Poids lourd';
      case 'motorcycle':
        return 'Moto';
      default:
        return 'Véhicule';
    }
  }
}

// ============================================================================
// REQUESTS TAB — Passagers
// ============================================================================

class _RequestsTab extends StatelessWidget {
  final List<Map<String, dynamic>> myRequests;
  final List<Map<String, dynamic>> allRequests;
  final Future<void> Function(String) onDelete;
  final Future<void> Function(String) onMatch;
  final VoidCallback onCreate;
  final Future<void> Function() onRefresh;

  const _RequestsTab({
    required this.myRequests,
    required this.allRequests,
    required this.onDelete,
    required this.onMatch,
    required this.onCreate,
    required this.onRefresh,
  });

  @override
  Widget build(BuildContext context) {
    if (myRequests.isEmpty && allRequests.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: const Color(0xFFDBEAFE),
                borderRadius: BorderRadius.circular(40),
              ),
              child: const Icon(Icons.directions_walk,
                  size: 40, color: Color(0xFF3B82F6)),
            ),
            const SizedBox(height: 16),
            const Text('Aucune demande de lift',
                style:
                    TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            const Text(
              'Les passagers qui cherchent un lift\napparaîtront ici.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: onCreate,
              icon: const Icon(Icons.add),
              label: const Text('Je cherche un lift'),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF3B82F6),
                foregroundColor: Colors.white,
                padding:
                    const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14)),
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
          if (myRequests.isNotEmpty) ...[
            _SectionHeader(
                title: '🚶 Mes demandes', count: myRequests.length),
            const SizedBox(height: 8),
            ...myRequests.map((r) => _RequestCard(
                  request: r,
                  isMine: true,
                  onDelete: () => onDelete(r['id']),
                  onMatch: () => onMatch(r['id']),
                )),
            const SizedBox(height: 20),
          ],
          if (allRequests.isNotEmpty) ...[
            _SectionHeader(
                title: '🌐 Demandes du réseau',
                count: allRequests.length),
            const SizedBox(height: 8),
            ...allRequests
                .map((r) => _RequestCard(request: r, isMine: false)),
          ],
        ],
      ),
    );
  }
}

// ============================================================================
// REQUEST CARD
// ============================================================================

class _RequestCard extends StatelessWidget {
  final Map<String, dynamic> request;
  final bool isMine;
  final VoidCallback? onDelete;
  final VoidCallback? onMatch;

  const _RequestCard({
    required this.request,
    required this.isMine,
    this.onDelete,
    this.onMatch,
  });

  @override
  Widget build(BuildContext context) {
    final profile = request['profiles'] as Map<String, dynamic>?;
    final name = isMine
        ? 'Ma demande'
        : '${profile?['first_name'] ?? ''} ${profile?['last_name'] ?? ''}'
            .trim();
    final company = profile?['company_name'] ?? '';
    final requestType = request['request_type'] ?? 'custom';

    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: isMine
            ? BorderSide(
                color: const Color(0xFF3B82F6).withValues(alpha: 0.4),
                width: 1.5)
            : BorderSide.none,
      ),
      elevation: isMine ? 3 : 1,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Row(
              children: [
                if (!isMine) ...[
                  CircleAvatar(
                    radius: 18,
                    backgroundColor: const Color(0xFF3B82F6),
                    child: Text(
                      name.isNotEmpty ? name[0].toUpperCase() : '?',
                      style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold),
                    ),
                  ),
                  const SizedBox(width: 10),
                ],
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        name.isNotEmpty ? name : 'Passager',
                        style: const TextStyle(
                            fontWeight: FontWeight.bold, fontSize: 14),
                      ),
                      if (company.isNotEmpty)
                        Text(company,
                            style: const TextStyle(
                                color: Colors.grey, fontSize: 12)),
                    ],
                  ),
                ),
                _RequestTypeBadge(type: requestType),
              ],
            ),
            const SizedBox(height: 10),
            // Route
            Row(
              children: [
                const Icon(Icons.my_location,
                    size: 14, color: Color(0xFF3B82F6)),
                const SizedBox(width: 4),
                Flexible(
                    child: Text(request['pickup_city'] ?? '',
                        style: const TextStyle(
                            fontWeight: FontWeight.w600, fontSize: 13))),
                const SizedBox(width: 4),
                const Icon(Icons.arrow_forward,
                    size: 12, color: Colors.grey),
                const SizedBox(width: 4),
                const Icon(Icons.flag,
                    size: 14, color: Color(0xFFEF4444)),
                const SizedBox(width: 4),
                Flexible(
                    child: Text(request['destination_city'] ?? '',
                        style: const TextStyle(
                            fontWeight: FontWeight.w600, fontSize: 13))),
              ],
            ),
            const SizedBox(height: 8),
            // Details
            Wrap(
              spacing: 10,
              runSpacing: 4,
              children: [
                _InfoChip(
                    icon: Icons.calendar_today,
                    text: _formatDate(request['needed_date'])),
                if (request['time_window_start'] != null)
                  _InfoChip(
                      icon: Icons.access_time,
                      text:
                          '${(request['time_window_start'] ?? '').toString().substring(0, 5)} - ${(request['time_window_end'] ?? '').toString().substring(0, 5)}'),
                if (request['accept_partial'] == true)
                  _InfoChip(
                      icon: Icons.check_circle_outline,
                      text: 'Partiel OK'),
              ],
            ),
            if (isMine) ...[
              const SizedBox(height: 10),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  if (onMatch != null)
                    _ActionChip(
                      icon: Icons.bolt,
                      label: 'Matcher IA',
                      color: const Color(0xFFF59E0B),
                      onTap: onMatch!,
                    ),
                  const SizedBox(width: 8),
                  if (onDelete != null)
                    _ActionChip(
                      icon: Icons.delete_outline,
                      label: 'Supprimer',
                      color: const Color(0xFFEF4444),
                      onTap: () async {
                        final confirm = await showDialog<bool>(
                          context: context,
                          builder: (_) => AlertDialog(
                            title: const Text('Supprimer ?'),
                            content: const Text(
                                'Cette demande sera définitivement supprimée.'),
                            actions: [
                              TextButton(
                                  onPressed: () =>
                                      Navigator.pop(context, false),
                                  child: const Text('Annuler')),
                              TextButton(
                                  onPressed: () =>
                                      Navigator.pop(context, true),
                                  child: const Text('Supprimer',
                                      style:
                                          TextStyle(color: Colors.red))),
                            ],
                          ),
                        );
                        if (confirm == true) onDelete!();
                      },
                    ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  String _formatDate(String? date) {
    if (date == null) return '';
    try {
      return DateFormat('EEE d MMM', 'fr_FR')
          .format(DateTime.parse(date));
    } catch (_) {
      return date;
    }
  }
}

// ============================================================================
// MATCHES TAB with enrichment + chat
// ============================================================================

class _MatchesTab extends StatefulWidget {
  final List<Map<String, dynamic>> matches;
  final String userId;
  final Future<void> Function(String, String) onRespond;
  final Future<void> Function() onRefresh;

  const _MatchesTab({
    required this.matches,
    required this.userId,
    required this.onRespond,
    required this.onRefresh,
  });

  @override
  State<_MatchesTab> createState() => _MatchesTabState();
}

class _MatchesTabState extends State<_MatchesTab> {
  final _supabase = Supabase.instance.client;
  final Map<String, Map<String, dynamic>> _profiles = {};

  @override
  void initState() {
    super.initState();
    _enrichMatches();
  }

  @override
  void didUpdateWidget(_MatchesTab old) {
    super.didUpdateWidget(old);
    if (old.matches.length != widget.matches.length) _enrichMatches();
  }

  Future<void> _enrichMatches() async {
    final userIds = <String>{};
    for (final m in widget.matches) {
      final otherId = m['driver_id'] == widget.userId
          ? m['passenger_id']
          : m['driver_id'];
      if (otherId != null && !_profiles.containsKey(otherId)) {
        userIds.add(otherId);
      }
    }

    if (userIds.isNotEmpty) {
      final profiles = await _supabase
          .from('profiles')
          .select('id, first_name, last_name, company_name, phone, email')
          .inFilter('id', userIds.toList());
      for (final p in (profiles as List? ?? [])) {
        _profiles[p['id']] = p;
      }
    }
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    if (widget.matches.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: const Color(0xFFFEF3C7),
                borderRadius: BorderRadius.circular(40),
              ),
              child: const Icon(Icons.handshake,
                  size: 40, color: Color(0xFFF59E0B)),
            ),
            const SizedBox(height: 16),
            const Text('Aucun match trouvé',
                style:
                    TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            const Text(
              'Publiez une offre ou une demande puis\nlancez le matching IA !',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: widget.onRefresh,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: widget.matches.length,
        itemBuilder: (context, index) {
          final m = widget.matches[index];
          final score = m['match_score'] ?? 0;
          final matchType = m['match_type'] ?? 'on_route';
          final status = m['status'] ?? 'proposed';
          final isProposed = status == 'proposed';
          final isAccepted = status == 'accepted';
          final isInTransit = status == 'in_transit';
          final isCompleted = status == 'completed';
          final isCancelled = status == 'cancelled';
          final isDeclined = status == 'declined';
          final isDriver = m['driver_id'] == widget.userId;

          final otherId =
              isDriver ? m['passenger_id'] : m['driver_id'];
          final profile = _profiles[otherId];
          final otherName = profile != null
              ? '${profile['first_name'] ?? ''} ${profile['last_name'] ?? ''}'
                  .trim()
              : '';

          final typeInfo = _matchTypeInfo(matchType);

          return Card(
            margin: const EdgeInsets.only(bottom: 12),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
              side: BorderSide(
                color: isProposed
                    ? const Color(0xFFFCD34D)
                    : isInTransit
                        ? const Color(0xFF818CF8)
                        : isCompleted
                            ? const Color(0xFFA78BFA)
                            : (isAccepted
                                ? const Color(0xFF6EE7B7)
                                : Colors.grey.shade200),
                width: isProposed || isAccepted || isInTransit ? 2 : 1,
              ),
            ),
            elevation: isProposed ? 4 : 1,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Role badge + status
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: isDriver
                              ? const Color(0xFFD1FAE5)
                              : const Color(0xFFDBEAFE),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          isDriver ? '🚗 Conducteur' : '🚶 Passager',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: isDriver
                                ? const Color(0xFF059669)
                                : const Color(0xFF2563EB),
                          ),
                        ),
                      ),
                      const Spacer(),
                      _MatchStatusBadge(status: status),
                    ],
                  ),
                  const SizedBox(height: 10),
                  // Other user info
                  if (profile != null) ...[
                    Row(
                      children: [
                        CircleAvatar(
                          radius: 18,
                          backgroundColor: const Color(0xFF6366F1),
                          child: Text(
                            otherName.isNotEmpty
                                ? otherName
                                    .split(' ')
                                    .map((w) =>
                                        w.isNotEmpty ? w[0] : '')
                                    .take(2)
                                    .join()
                                    .toUpperCase()
                                : '?',
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 12,
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment:
                                CrossAxisAlignment.start,
                            children: [
                              Text(otherName,
                                  style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 14)),
                              if (profile['company_name'] != null &&
                                  profile['company_name']
                                      .toString()
                                      .isNotEmpty)
                                Text(profile['company_name'],
                                    style: const TextStyle(
                                        color: Colors.grey,
                                        fontSize: 12)),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const Divider(height: 18),
                  ],

                  // Route context
                  if (m['pickup_city'] != null ||
                      m['dropoff_city'] != null)
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: Colors.grey.shade50,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              const Icon(Icons.pin_drop,
                                  size: 14, color: Color(0xFF6366F1)),
                              const SizedBox(width: 4),
                              if (m['pickup_city'] != null)
                                Flexible(
                                    child: Text(m['pickup_city'],
                                        style: const TextStyle(
                                            fontWeight: FontWeight.w600,
                                            fontSize: 13))),
                              if (m['pickup_city'] != null &&
                                  m['dropoff_city'] != null) ...[
                                const SizedBox(width: 4),
                                const Icon(Icons.arrow_forward,
                                    size: 12, color: Colors.grey),
                                const SizedBox(width: 4),
                              ],
                              if (m['dropoff_city'] != null)
                                Flexible(
                                    child: Text(m['dropoff_city'],
                                        style: const TextStyle(
                                            fontWeight: FontWeight.w600,
                                            fontSize: 13))),
                            ],
                          ),
                          if (m['rendezvous_address'] != null) ...[
                            const SizedBox(height: 6),
                            Row(
                              children: [
                                const Icon(Icons.location_on,
                                    size: 14,
                                    color: Color(0xFF10B981)),
                                const SizedBox(width: 4),
                                Flexible(
                                    child: Text(
                                  'RDV: ${m['rendezvous_address']}',
                                  style: const TextStyle(
                                      fontSize: 12,
                                      color: Color(0xFF10B981)),
                                )),
                              ],
                            ),
                          ],
                        ],
                      ),
                    ),
                  const SizedBox(height: 10),

                  // Type & Score
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(
                          color: typeInfo.bgColor,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(typeInfo.icon,
                                size: 14,
                                color: typeInfo.textColor),
                            const SizedBox(width: 4),
                            Text(typeInfo.label,
                                style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.bold,
                                    color: typeInfo.textColor)),
                          ],
                        ),
                      ),
                      const Spacer(),
                      Row(
                        children: List.generate(
                            5,
                            (i) => Icon(
                                  Icons.star_rounded,
                                  size: 18,
                                  color: i < (score / 20).ceil()
                                      ? const Color(0xFFFBBF24)
                                      : Colors.grey.shade300,
                                )),
                      ),
                      const SizedBox(width: 6),
                      Text('$score%',
                          style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 13)),
                    ],
                  ),
                  const SizedBox(height: 8),

                  // Details
                  Row(
                    children: [
                      if ((m['detour_km'] ?? 0) > 0)
                        _MatchDetail(
                          icon: Icons.alt_route,
                          label:
                              '${(m['detour_km'] ?? 0).toStringAsFixed(1)} km détour',
                          color: const Color(0xFFF59E0B),
                        ),
                      if ((m['distance_covered_km'] ?? 0) > 0) ...[
                        const SizedBox(width: 12),
                        _MatchDetail(
                          icon: Icons.route,
                          label:
                              '${(m['distance_covered_km'] ?? 0).toStringAsFixed(1)} km couverts',
                          color: const Color(0xFF10B981),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 14),

                  // Status badges
                  if (isInTransit)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEEF2FF),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.navigation, size: 14, color: Color(0xFF6366F1)),
                          SizedBox(width: 6),
                          Text('En cours de trajet...', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF6366F1))),
                        ],
                      ),
                    ),
                  if (isCompleted)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF3E8FF),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.emoji_events, size: 14, color: Color(0xFF8B5CF6)),
                          SizedBox(width: 6),
                          Text('Trajet terminé', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF8B5CF6))),
                        ],
                      ),
                    ),
                  if (isCancelled)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFEF3C7),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.cancel, size: 14, color: Color(0xFFD97706)),
                          SizedBox(width: 6),
                          Text('Annulé', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFFD97706))),
                        ],
                      ),
                    ),
                  if (isDeclined)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFEE2E2),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.block, size: 14, color: Color(0xFFDC2626)),
                          SizedBox(width: 6),
                          Text('Décliné', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFFDC2626))),
                        ],
                      ),
                    ),
                  if (isInTransit || isCompleted || isCancelled || isDeclined)
                    const SizedBox(height: 14),

                  // Actions — Proposed
                  if (isProposed && !isDriver)
                    Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        OutlinedButton.icon(
                          onPressed: () =>
                              widget.onRespond(m['id'], 'declined'),
                          icon: const Icon(Icons.close, size: 16),
                          label: const Text('Décliner'),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: Colors.grey,
                            side: const BorderSide(color: Colors.grey),
                            shape: RoundedRectangleBorder(
                                borderRadius:
                                    BorderRadius.circular(12)),
                          ),
                        ),
                        const SizedBox(width: 8),
                        ElevatedButton.icon(
                          onPressed: () =>
                              widget.onRespond(m['id'], 'accepted'),
                          icon: const Icon(Icons.check, size: 16),
                          label: const Text('Accepter'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF10B981),
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(
                                borderRadius:
                                    BorderRadius.circular(12)),
                          ),
                        ),
                      ],
                    ),

                  // Actions — Accepted
                  if (isAccepted) ...[
                    if (isDriver)
                      ElevatedButton.icon(
                        onPressed: () =>
                            widget.onRespond(m['id'], 'in_transit'),
                        icon: const Icon(Icons.navigation, size: 16),
                        label: const Text('Démarrer le trajet'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF6366F1),
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12)),
                          minimumSize: const Size(double.infinity, 42),
                        ),
                      ),
                    if (isDriver) const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: ElevatedButton.icon(
                            onPressed: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => _RideChatScreen(
                                    matchId: m['id'],
                                    otherUserName: otherName,
                                    otherUserCompany: profile?['company_name'] ?? '',
                                    otherUserPhone: profile?['phone'] ?? '',
                                    otherUserEmail: profile?['email'] ?? '',
                                    pickupCity: m['pickup_city'],
                                    dropoffCity: m['dropoff_city'],
                                  ),
                                ),
                              );
                            },
                            icon: const Icon(Icons.chat_bubble_rounded, size: 16),
                            label: const Text('Discuter'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF6366F1),
                              foregroundColor: Colors.white,
                              shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12)),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        OutlinedButton.icon(
                          onPressed: () {
                            showDialog(
                              context: context,
                              builder: (ctx) => AlertDialog(
                                title: const Text('Annuler le trajet ?'),
                                content: const Text('Cette action est irréversible. La place sera restituée.'),
                                actions: [
                                  TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Non')),
                                  TextButton(
                                    onPressed: () { Navigator.pop(ctx); widget.onRespond(m['id'], 'cancelled'); },
                                    child: const Text('Oui, annuler', style: TextStyle(color: Colors.red)),
                                  ),
                                ],
                              ),
                            );
                          },
                          icon: const Icon(Icons.close, size: 16),
                          label: const Text('Annuler'),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: Colors.red,
                            side: const BorderSide(color: Colors.red),
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12)),
                          ),
                        ),
                      ],
                    ),
                  ],

                  // Actions — In Transit
                  if (isInTransit) ...[
                    ElevatedButton.icon(
                      onPressed: () {
                        widget.onRespond(m['id'], 'completed');
                        _showRatingDialog(context, m, isDriver);
                      },
                      icon: const Icon(Icons.check_circle, size: 16),
                      label: const Text('Terminer le trajet'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF10B981),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12)),
                        minimumSize: const Size(double.infinity, 42),
                      ),
                    ),
                    const SizedBox(height: 8),
                    ElevatedButton.icon(
                      onPressed: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => _RideChatScreen(
                              matchId: m['id'],
                              otherUserName: otherName,
                              otherUserCompany: profile?['company_name'] ?? '',
                              otherUserPhone: profile?['phone'] ?? '',
                              otherUserEmail: profile?['email'] ?? '',
                              pickupCity: m['pickup_city'],
                              dropoffCity: m['dropoff_city'],
                            ),
                          ),
                        );
                      },
                      icon: const Icon(Icons.chat_bubble_rounded, size: 16),
                      label: const Text('Discuter'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF6366F1).withValues(alpha: 0.15),
                        foregroundColor: const Color(0xFF6366F1),
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12)),
                        minimumSize: const Size(double.infinity, 42),
                      ),
                    ),
                  ],

                  // Actions — Completed (rate)
                  if (isCompleted)
                    ElevatedButton.icon(
                      onPressed: () => _showRatingDialog(context, m, isDriver),
                      icon: const Icon(Icons.star, size: 16),
                      label: const Text('Noter le trajet'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFF59E0B),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12)),
                        minimumSize: const Size(double.infinity, 42),
                      ),
                    ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  void _showRatingDialog(BuildContext context, Map<String, dynamic> match, bool isDriver) {
    int stars = 5;
    final badges = <String>[];
    final commentCtrl = TextEditingController();
    final badgeOptions = [
      {'id': 'punctual', 'label': '⏰ Ponctuel'},
      {'id': 'friendly', 'label': '😊 Sympathique'},
      {'id': 'safe_driver', 'label': '🛡️ Conduite sûre'},
      {'id': 'clean_vehicle', 'label': '✨ Véhicule propre'},
      {'id': 'good_communication', 'label': '💬 Bonne com.'},
    ];

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: Column(
            children: [
              Container(
                width: 56, height: 56,
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF3C7),
                  borderRadius: BorderRadius.circular(28),
                ),
                child: const Icon(Icons.star, size: 32, color: Color(0xFFF59E0B)),
              ),
              const SizedBox(height: 12),
              const Text('Noter ce trajet', textAlign: TextAlign.center),
            ],
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Stars
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: List.generate(5, (i) => GestureDetector(
                    onTap: () => setDialogState(() => stars = i + 1),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 4),
                      child: Icon(
                        i < stars ? Icons.star : Icons.star_border,
                        size: 36,
                        color: i < stars ? const Color(0xFFF59E0B) : Colors.grey.shade300,
                      ),
                    ),
                  )),
                ),
                const SizedBox(height: 16),
                // Badges
                Wrap(
                  spacing: 8, runSpacing: 8,
                  children: badgeOptions.map((b) {
                    final selected = badges.contains(b['id']);
                    return GestureDetector(
                      onTap: () => setDialogState(() {
                        if (selected) badges.remove(b['id']); else badges.add(b['id']!);
                      }),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: selected ? const Color(0xFFEEF2FF) : Colors.grey.shade100,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: selected ? const Color(0xFF6366F1) : Colors.transparent, width: 2),
                        ),
                        child: Text(b['label']!, style: TextStyle(
                          fontSize: 12, fontWeight: FontWeight.w600,
                          color: selected ? const Color(0xFF6366F1) : Colors.grey.shade600,
                        )),
                      ),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: commentCtrl,
                  decoration: InputDecoration(
                    hintText: 'Commentaire (optionnel)',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  ),
                  maxLines: 2,
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Plus tard'),
            ),
            ElevatedButton.icon(
              onPressed: () async {
                final supabase = Supabase.instance.client;
                final userId = supabase.auth.currentUser?.id;
                if (userId == null) return;
                final ratedId = isDriver ? match['passenger_id'] : match['driver_id'];
                await supabase.from('ride_ratings').upsert({
                  'match_id': match['id'],
                  'rater_id': userId,
                  'rated_id': ratedId,
                  'rating': stars,
                  'badges': badges,
                  'comment': commentCtrl.text.isEmpty ? null : commentCtrl.text,
                }, onConflict: 'match_id,rater_id');
                if (ctx.mounted) Navigator.pop(ctx);
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('⭐ Merci pour votre note !'), backgroundColor: Color(0xFFF59E0B)),
                  );
                }
              },
              icon: const Icon(Icons.star, size: 16),
              label: const Text('Envoyer'),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFF59E0B),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  _MatchTypeInfo _matchTypeInfo(String type) {
    switch (type) {
      case 'on_route':
        return _MatchTypeInfo('Sur la route', Icons.route,
            const Color(0xFFD1FAE5), const Color(0xFF059669));
      case 'small_detour':
        return _MatchTypeInfo('Petit détour', Icons.alt_route,
            const Color(0xFFDBEAFE), const Color(0xFF2563EB));
      case 'partial':
        return _MatchTypeInfo('Trajet partiel', Icons.trending_up,
            const Color(0xFFFEF3C7), const Color(0xFFD97706));
      case 'return_match':
        return _MatchTypeInfo('Retour', Icons.replay,
            const Color(0xFFF3E8FF), const Color(0xFF7C3AED));
      default:
        return _MatchTypeInfo('Match', Icons.bolt,
            const Color(0xFFF3E8FF), const Color(0xFF7C3AED));
    }
  }
}

class _MatchTypeInfo {
  final String label;
  final IconData icon;
  final Color bgColor;
  final Color textColor;
  _MatchTypeInfo(this.label, this.icon, this.bgColor, this.textColor);
}

// ============================================================================
// CHAT SCREEN — Full-page chat using ride_messages
// ============================================================================

class _RideChatScreen extends StatefulWidget {
  final String matchId;
  final String otherUserName;
  final String otherUserCompany;
  final String otherUserPhone;
  final String otherUserEmail;
  final String? pickupCity;
  final String? dropoffCity;

  const _RideChatScreen({
    required this.matchId,
    required this.otherUserName,
    required this.otherUserCompany,
    required this.otherUserPhone,
    required this.otherUserEmail,
    this.pickupCity,
    this.dropoffCity,
  });

  @override
  State<_RideChatScreen> createState() => _RideChatScreenState();
}

class _RideChatScreenState extends State<_RideChatScreen> {
  final _supabase = Supabase.instance.client;
  final _controller = TextEditingController();
  final _scrollController = ScrollController();
  List<Map<String, dynamic>> _messages = [];
  RealtimeChannel? _channel;
  bool _loading = true;

  String get _userId => _supabase.auth.currentUser?.id ?? '';

  @override
  void initState() {
    super.initState();
    _loadMessages();
    _subscribeRealtime();
  }

  @override
  void dispose() {
    _channel?.unsubscribe();
    _controller.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _loadMessages() async {
    final res = await _supabase
        .from('ride_messages')
        .select('*')
        .eq('match_id', widget.matchId)
        .order('created_at', ascending: true);

    setState(() {
      _messages =
          List<Map<String, dynamic>>.from(res as List? ?? []);
      _loading = false;
    });

    // Mark as read
    await _supabase
        .from('ride_messages')
        .update({'is_read': true})
        .eq('match_id', widget.matchId)
        .neq('sender_id', _userId);

    _scrollToBottom();
  }

  void _subscribeRealtime() {
    _channel = _supabase
        .channel('ride-chat-${widget.matchId}')
        .onPostgresChanges(
          event: PostgresChangeEvent.insert,
          schema: 'public',
          table: 'ride_messages',
          filter: PostgresChangeFilter(
            type: PostgresChangeFilterType.eq,
            column: 'match_id',
            value: widget.matchId,
          ),
          callback: (payload) {
            final msg = payload.newRecord;
            setState(() => _messages.add(msg));
            _scrollToBottom();
            if (msg['sender_id'] != _userId) {
              _supabase
                  .from('ride_messages')
                  .update({'is_read': true}).eq('id', msg['id']);
            }
          },
        )
        .subscribe();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _sendMessage() async {
    final text = _controller.text.trim();
    if (text.isEmpty) return;
    _controller.clear();

    await _supabase.from('ride_messages').insert({
      'match_id': widget.matchId,
      'sender_id': _userId,
      'content': text,
    });
  }

  void _showContactInfo() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
          borderRadius:
              BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 20),
            Row(
              children: [
                CircleAvatar(
                  radius: 28,
                  backgroundColor: const Color(0xFF6366F1),
                  child: Text(
                    widget.otherUserName.isNotEmpty
                        ? widget.otherUserName
                            .split(' ')
                            .map((w) => w.isNotEmpty ? w[0] : '')
                            .take(2)
                            .join()
                        : '?',
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 18,
                    ),
                  ),
                ),
                const SizedBox(width: 14),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(widget.otherUserName,
                        style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 18)),
                    if (widget.otherUserCompany.isNotEmpty)
                      Text(widget.otherUserCompany,
                          style: const TextStyle(
                              color: Colors.grey, fontSize: 14)),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 20),
            if (widget.otherUserPhone.isNotEmpty) ...[
              ListTile(
                leading: const Icon(Icons.phone,
                    color: Color(0xFF10B981)),
                title: Text(widget.otherUserPhone),
                subtitle: const Text('Appeler'),
                contentPadding: EdgeInsets.zero,
                onTap: () => launchUrl(Uri.parse('tel:${widget.otherUserPhone}')),
              ),
              ListTile(
                leading: const Icon(Icons.chat,
                    color: Color(0xFF25D366)),
                title: const Text('WhatsApp'),
                subtitle: Text(widget.otherUserPhone),
                contentPadding: EdgeInsets.zero,
                onTap: () {
                  final phone = widget.otherUserPhone.replaceAll(RegExp(r'[^0-9+]'), '');
                  final waPhone = phone.startsWith('+') ? phone.substring(1) : (phone.startsWith('0') ? '33${phone.substring(1)}' : phone);
                  launchUrl(Uri.parse('https://wa.me/$waPhone'), mode: LaunchMode.externalApplication);
                },
              ),
            ],
            if (widget.otherUserEmail.isNotEmpty)
              ListTile(
                leading: const Icon(Icons.email,
                    color: Color(0xFF3B82F6)),
                title: Text(widget.otherUserEmail),
                subtitle: const Text('Envoyer un email'),
                contentPadding: EdgeInsets.zero,
                onTap: () => launchUrl(Uri.parse('mailto:${widget.otherUserEmail}')),
              ),
            const SizedBox(height: 12),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: const Color(0xFF6366F1),
        foregroundColor: Colors.white,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              widget.otherUserName.isNotEmpty
                  ? widget.otherUserName
                  : 'Chat',
              style: const TextStyle(
                  fontSize: 16, fontWeight: FontWeight.bold),
            ),
            if (widget.otherUserCompany.isNotEmpty)
              Text(widget.otherUserCompany,
                  style: const TextStyle(
                      fontSize: 12, color: Colors.white70)),
          ],
        ),
        actions: [
          IconButton(
            onPressed: _showContactInfo,
            icon: const Icon(Icons.person_outline),
            tooltip: 'Coordonnées',
          ),
        ],
      ),
      body: Column(
        children: [
          // Context bar
          if (widget.pickupCity != null ||
              widget.dropoffCity != null)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(
                  horizontal: 16, vertical: 8),
              color: const Color(0xFFEEF2FF),
              child: Row(
                children: [
                  const Icon(Icons.route,
                      size: 14, color: Color(0xFF6366F1)),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      '${widget.pickupCity ?? '?'} → ${widget.dropoffCity ?? '?'}',
                      style: const TextStyle(
                        fontSize: 12,
                        color: Color(0xFF6366F1),
                        fontWeight: FontWeight.w600,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ),

          // Messages
          Expanded(
            child: _loading
                ? const Center(
                    child: CircularProgressIndicator(
                        color: Color(0xFF6366F1)))
                : _messages.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.chat_bubble_outline,
                                size: 48, color: Colors.grey),
                            const SizedBox(height: 12),
                            Text(
                              'Démarrez la conversation avec\n${widget.otherUserName}',
                              textAlign: TextAlign.center,
                              style:
                                  const TextStyle(color: Colors.grey),
                            ),
                            const SizedBox(height: 4),
                            const Text(
                              'Coordonnez votre point de rendez-vous',
                              style: TextStyle(
                                  color: Colors.grey, fontSize: 12),
                            ),
                          ],
                        ),
                      )
                    : ListView.builder(
                        controller: _scrollController,
                        padding: const EdgeInsets.all(16),
                        itemCount: _messages.length,
                        itemBuilder: (context, index) {
                          final msg = _messages[index];
                          final isMe =
                              msg['sender_id'] == _userId;

                          return Padding(
                            padding:
                                const EdgeInsets.only(bottom: 8),
                            child: Align(
                              alignment: isMe
                                  ? Alignment.centerRight
                                  : Alignment.centerLeft,
                              child: Container(
                                constraints: BoxConstraints(
                                    maxWidth:
                                        MediaQuery.of(context)
                                                .size
                                                .width *
                                            0.75),
                                padding:
                                    const EdgeInsets.symmetric(
                                        horizontal: 14,
                                        vertical: 10),
                                decoration: BoxDecoration(
                                  color: isMe
                                      ? const Color(0xFF6366F1)
                                      : Colors.white,
                                  borderRadius: BorderRadius.only(
                                    topLeft:
                                        const Radius.circular(16),
                                    topRight:
                                        const Radius.circular(16),
                                    bottomLeft: isMe
                                        ? const Radius.circular(
                                            16)
                                        : const Radius.circular(4),
                                    bottomRight: isMe
                                        ? const Radius.circular(4)
                                        : const Radius.circular(
                                            16),
                                  ),
                                  border: isMe
                                      ? null
                                      : Border.all(
                                          color: Colors
                                              .grey.shade200),
                                  boxShadow: [
                                    BoxShadow(
                                      color: Colors.black
                                          .withValues(alpha: 0.05),
                                      blurRadius: 3,
                                      offset: const Offset(0, 1),
                                    ),
                                  ],
                                ),
                                child: Column(
                                  crossAxisAlignment:
                                      CrossAxisAlignment.end,
                                  children: [
                                    Text(
                                      msg['content'] ?? '',
                                      style: TextStyle(
                                        color: isMe
                                            ? Colors.white
                                            : Colors.black87,
                                        fontSize: 14,
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      _formatTime(
                                          msg['created_at']),
                                      style: TextStyle(
                                        color: isMe
                                            ? Colors.white60
                                            : Colors.grey,
                                        fontSize: 10,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          );
                        },
                      ),
          ),

          // Input
          Container(
            padding: const EdgeInsets.fromLTRB(16, 8, 8, 8),
            decoration: BoxDecoration(
              color: Colors.white,
              border: Border(
                  top: BorderSide(color: Colors.grey.shade200)),
            ),
            child: SafeArea(
              top: false,
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _controller,
                      decoration: InputDecoration(
                        hintText: 'Écrire un message...',
                        hintStyle:
                            const TextStyle(color: Colors.grey),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(24),
                          borderSide: BorderSide(
                              color: Colors.grey.shade300),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(24),
                          borderSide: BorderSide(
                              color: Colors.grey.shade300),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(24),
                          borderSide: const BorderSide(
                              color: Color(0xFF6366F1)),
                        ),
                        contentPadding:
                            const EdgeInsets.symmetric(
                                horizontal: 16, vertical: 10),
                        isDense: true,
                      ),
                      textInputAction: TextInputAction.send,
                      onSubmitted: (_) => _sendMessage(),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    decoration: const BoxDecoration(
                      color: Color(0xFF6366F1),
                      shape: BoxShape.circle,
                    ),
                    child: IconButton(
                      onPressed: _sendMessage,
                      icon: const Icon(Icons.send_rounded,
                          color: Colors.white, size: 20),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _formatTime(String? timestamp) {
    if (timestamp == null) return '';
    try {
      final dt = DateTime.parse(timestamp).toLocal();
      return '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
    } catch (_) {
      return '';
    }
  }
}

// ============================================================================
// CREATE OFFER SCREEN (Conducteur: j'offre une place)
// ============================================================================

class _CreateOfferScreen extends StatefulWidget {
  final String userId;
  final Future<void> Function() onCreated;

  const _CreateOfferScreen({
    required this.userId,
    required this.onCreated,
  });

  @override
  State<_CreateOfferScreen> createState() =>
      _CreateOfferScreenState();
}

class _CreateOfferScreenState extends State<_CreateOfferScreen> {
  final _supabase = Supabase.instance.client;

  DateTime _date = DateTime.now();
  TimeOfDay _departureTime = const TimeOfDay(hour: 8, minute: 0);
  String _originCity = '';
  double? _originLat, _originLng;
  String _destCity = '';
  double? _destLat, _destLng;
  bool _needsReturn = false;
  String _returnCity = '';
  double? _returnLat;
  // ignore: unused_field
  double? _returnLng;
  int _seats = 1;
  int _maxDetour = 15;
  String _vehicleType = 'car';
  String _notes = '';
  bool _saving = false;

  List<Map<String, dynamic>> _originSuggestions = [];
  List<Map<String, dynamic>> _destSuggestions = [];
  List<Map<String, dynamic>> _returnSuggestions = [];
  bool _showOriginDrop = false,
      _showDestDrop = false,
      _showReturnDrop = false;

  Future<List<Map<String, dynamic>>> _geocode(String query) async {
    if (query.length < 2) return [];
    try {
      final res = await http.get(Uri.parse(
          'https://api-adresse.data.gouv.fr/search/?q=${Uri.encodeComponent(query)}&type=municipality&limit=5'));
      final data = json.decode(res.body);
      return (data['features'] as List? ?? [])
          .map<Map<String, dynamic>>((f) => {
                'label':
                    '${f['properties']['label']} (${f['properties']['postcode']})',
                'city': f['properties']['city'] ??
                    f['properties']['label'],
                'postcode': f['properties']['postcode'] ?? '',
                'lat': f['geometry']['coordinates'][1],
                'lng': f['geometry']['coordinates'][0],
              })
          .toList();
    } catch (_) {
      return [];
    }
  }

  Future<void> _submit() async {
    if (_originCity.isEmpty || _destCity.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text(
                'Renseignez les villes de départ et d\'arrivée')),
      );
      return;
    }

    setState(() => _saving = true);

    try {
      if (_originLat == null) {
        final geo = await _geocode(_originCity);
        if (geo.isNotEmpty) {
          _originLat = geo[0]['lat'];
          _originLng = geo[0]['lng'];
        }
      }
      if (_destLat == null) {
        final geo = await _geocode(_destCity);
        if (geo.isNotEmpty) {
          _destLat = geo[0]['lat'];
          _destLng = geo[0]['lng'];
        }
      }
      if (_needsReturn &&
          _returnCity.isNotEmpty &&
          _returnLat == null) {
        final geo = await _geocode(_returnCity);
        if (geo.isNotEmpty) {
          _returnLat = geo[0]['lat'];
          _returnLng = geo[0]['lng'];
        }
      }

      final timeStr =
          '${_departureTime.hour.toString().padLeft(2, '0')}:${_departureTime.minute.toString().padLeft(2, '0')}';

      await _supabase.from('ride_offers').insert({
        'user_id': widget.userId,
        'origin_city': _originCity,
        'origin_lat': _originLat,
        'origin_lng': _originLng,
        'destination_city': _destCity,
        'destination_lat': _destLat,
        'destination_lng': _destLng,
        'departure_date': DateFormat('yyyy-MM-dd').format(_date),
        'departure_time': timeStr,
        'seats_available': _seats,
        'max_detour_km': _maxDetour,
        'vehicle_type': _vehicleType,
        'needs_return': _needsReturn,
        'return_to_city':
            _needsReturn && _returnCity.isNotEmpty
                ? _returnCity
                : null,
        'notes': _notes.isNotEmpty ? _notes : null,
        'status': 'active',
      });

      await widget.onCreated();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text('Erreur: $e'),
              backgroundColor: Colors.red),
        );
      }
    }

    if (mounted) setState(() => _saving = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('J\'offre une place 🚗',
            style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: const Color(0xFF10B981),
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Info card
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFFD1FAE5),
                borderRadius: BorderRadius.circular(14),
              ),
              child: const Row(
                children: [
                  Icon(Icons.info_outline,
                      color: Color(0xFF059669), size: 20),
                  SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'Vous avez un véhicule à convoyer et un siège libre.\nUn collègue peut monter avec vous !',
                      style: TextStyle(
                          fontSize: 13, color: Color(0xFF059669)),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Date
            _buildLabel('Date de départ'),
            _buildDatePicker(),
            const SizedBox(height: 18),

            // Departure time
            _buildLabel('Heure de départ'),
            _buildTimePicker(
                _departureTime,
                (t) => setState(() => _departureTime = t)),
            const SizedBox(height: 18),

            // Origin
            _buildLabel('Ville de départ *'),
            _buildCityField(
              value: _originCity,
              hasGeo: _originLat != null,
              suggestions: _originSuggestions,
              showDropdown: _showOriginDrop,
              onChanged: (v) async {
                _originCity = v;
                _originLat = null;
                _originLng = null;
                final r = await _geocode(v);
                setState(() {
                  _originSuggestions = r;
                  _showOriginDrop = r.isNotEmpty;
                });
              },
              onSelect: (s) => setState(() {
                _originCity = s['city'];
                _originLat = s['lat'];
                _originLng = s['lng'];
                _showOriginDrop = false;
              }),
            ),
            const SizedBox(height: 18),

            // Destination
            _buildLabel('Ville d\'arrivée *'),
            _buildCityField(
              value: _destCity,
              hasGeo: _destLat != null,
              suggestions: _destSuggestions,
              showDropdown: _showDestDrop,
              onChanged: (v) async {
                _destCity = v;
                _destLat = null;
                _destLng = null;
                final r = await _geocode(v);
                setState(() {
                  _destSuggestions = r;
                  _showDestDrop = r.isNotEmpty;
                });
              },
              onSelect: (s) => setState(() {
                _destCity = s['city'];
                _destLat = s['lat'];
                _destLng = s['lng'];
                _showDestDrop = false;
              }),
            ),
            const SizedBox(height: 18),

            // Seats
            _buildLabel('Places disponibles'),
            Row(
              children: List.generate(4, (i) {
                final n = i + 1;
                return Padding(
                  padding: const EdgeInsets.only(right: 10),
                  child: ChoiceChip(
                    label: Text('$n'),
                    selected: _seats == n,
                    onSelected: (_) =>
                        setState(() => _seats = n),
                    selectedColor: const Color(0xFF10B981),
                    labelStyle: TextStyle(
                      color:
                          _seats == n ? Colors.white : Colors.black,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                );
              }),
            ),
            const SizedBox(height: 18),

            // Max detour
            _buildLabel('Détour maximum: $_maxDetour km'),
            Slider(
              value: _maxDetour.toDouble(),
              min: 0,
              max: 50,
              divisions: 10,
              label: '$_maxDetour km',
              activeColor: const Color(0xFF10B981),
              onChanged: (v) =>
                  setState(() => _maxDetour = v.round()),
            ),
            const SizedBox(height: 18),

            // Vehicle type
            _buildLabel('Type de véhicule'),
            DropdownButtonFormField<String>(
              initialValue: _vehicleType,
              items: const [
                DropdownMenuItem(
                    value: 'car', child: Text('Voiture')),
                DropdownMenuItem(
                    value: 'utility', child: Text('Utilitaire')),
                DropdownMenuItem(
                    value: 'truck', child: Text('Poids lourd')),
                DropdownMenuItem(
                    value: 'motorcycle', child: Text('Moto')),
              ],
              onChanged: (v) =>
                  setState(() => _vehicleType = v ?? 'car'),
              decoration: _inputDecoration(null),
            ),
            const SizedBox(height: 18),

            // Return trip
            SwitchListTile(
              title: const Text(
                'Je reviens à vide après ce convoyage',
                style: TextStyle(
                    fontSize: 14, fontWeight: FontWeight.w500),
              ),
              subtitle: _needsReturn
                  ? const Text(
                      'Un collègue pourrait vous accompagner au retour',
                      style: TextStyle(
                          fontSize: 12, color: Colors.grey))
                  : null,
              value: _needsReturn,
              activeThumbColor: const Color(0xFF10B981),
              onChanged: (v) => setState(() {
                _needsReturn = v;
                if (!v) {
                  _returnCity = '';
                  _returnLat = null;
                  _returnLng = null;
                }
              }),
              contentPadding: EdgeInsets.zero,
            ),
            if (_needsReturn) ...[
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFDBEAFE),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                      color: const Color(0xFF3B82F6)
                          .withValues(alpha: 0.3)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.home,
                            size: 16, color: Color(0xFF3B82F6)),
                        SizedBox(width: 6),
                        Text('Ville de retour',
                            style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF3B82F6))),
                      ],
                    ),
                    const SizedBox(height: 8),
                    _buildCityField(
                      value: _returnCity,
                      hasGeo: _returnLat != null,
                      suggestions: _returnSuggestions,
                      showDropdown: _showReturnDrop,
                      onChanged: (v) async {
                        _returnCity = v;
                        _returnLat = null;
                        _returnLng = null;
                        final r = await _geocode(v);
                        if (mounted) {
                          setState(() {
                            _returnSuggestions = r;
                            _showReturnDrop = r.isNotEmpty;
                          });
                        }
                      },
                      onSelect: (s) => setState(() {
                        _returnCity = s['city'];
                        _returnLat = s['lat'];
                        _returnLng = s['lng'];
                        _showReturnDrop = false;
                      }),
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 18),

            // Notes
            _buildLabel('Notes (optionnel)'),
            TextFormField(
              onChanged: (v) => _notes = v,
              maxLines: 3,
              decoration:
                  _inputDecoration('Infos complémentaires...'),
            ),
            const SizedBox(height: 24),

            // Submit
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _saving ? null : _submit,
                icon: _saving
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white))
                    : const Icon(Icons.directions_car),
                label: Text(
                  _saving ? 'Publication...' : 'Publier mon offre',
                  style: const TextStyle(
                      fontWeight: FontWeight.bold, fontSize: 15),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF10B981),
                  foregroundColor: Colors.white,
                  padding:
                      const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14)),
                  elevation: 4,
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
        child: Text(text,
            style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: Color(0xFF374151))),
      );

  InputDecoration _inputDecoration(String? hint) =>
      InputDecoration(
        hintText: hint,
        filled: true,
        fillColor: Colors.grey.shade50,
        border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: BorderSide(color: Colors.grey.shade300)),
        enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: BorderSide(color: Colors.grey.shade300)),
        focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: const BorderSide(
                color: Color(0xFF10B981), width: 2)),
        contentPadding: const EdgeInsets.symmetric(
            horizontal: 16, vertical: 14),
      );

  Widget _buildDatePicker() => InkWell(
        onTap: () async {
          final picked = await showDatePicker(
            context: context,
            initialDate: _date,
            firstDate: DateTime.now(),
            lastDate:
                DateTime.now().add(const Duration(days: 365)),
          );
          if (picked != null) setState(() => _date = picked);
        },
        child: Container(
          padding: const EdgeInsets.symmetric(
              horizontal: 16, vertical: 14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: Colors.grey.shade300),
          ),
          child: Row(
            children: [
              const Icon(Icons.calendar_today,
                  size: 18, color: Color(0xFF10B981)),
              const SizedBox(width: 10),
              Text(
                DateFormat('EEEE d MMMM yyyy', 'fr_FR')
                    .format(_date),
                style: const TextStyle(
                    fontSize: 14, fontWeight: FontWeight.w500),
              ),
            ],
          ),
        ),
      );

  Widget _buildTimePicker(
          TimeOfDay time, ValueChanged<TimeOfDay> onChanged) =>
      InkWell(
        onTap: () async {
          final picked = await showTimePicker(
              context: context, initialTime: time);
          if (picked != null) onChanged(picked);
        },
        child: Container(
          padding: const EdgeInsets.symmetric(
              horizontal: 16, vertical: 14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: Colors.grey.shade300),
            color: Colors.grey.shade50,
          ),
          child: Row(
            children: [
              const Icon(Icons.access_time,
                  size: 18, color: Color(0xFF10B981)),
              const SizedBox(width: 10),
              Text(
                '${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}',
                style: const TextStyle(
                    fontSize: 14, fontWeight: FontWeight.w500),
              ),
            ],
          ),
        ),
      );

  Widget _buildCityField({
    required String value,
    required bool hasGeo,
    required List<Map<String, dynamic>> suggestions,
    required bool showDropdown,
    required ValueChanged<String> onChanged,
    required ValueChanged<Map<String, dynamic>> onSelect,
  }) =>
      Column(
        children: [
          TextFormField(
            initialValue: value.isEmpty ? null : value,
            onChanged: onChanged,
            decoration: _inputDecoration('Tapez une ville...')
                .copyWith(
              prefixIcon: Icon(Icons.place,
                  color: hasGeo
                      ? const Color(0xFF10B981)
                      : Colors.grey,
                  size: 20),
              suffixIcon: hasGeo
                  ? const Icon(Icons.check_circle,
                      color: Color(0xFF10B981), size: 20)
                  : null,
            ),
          ),
          if (showDropdown && suggestions.isNotEmpty)
            Container(
              margin: const EdgeInsets.only(top: 4),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.grey.shade200),
                boxShadow: [
                  BoxShadow(
                      color: Colors.black.withValues(alpha: 0.1),
                      blurRadius: 8)
                ],
              ),
              child: Column(
                children: suggestions
                    .map((s) => ListTile(
                          dense: true,
                          title: Text(s['label'],
                              style:
                                  const TextStyle(fontSize: 13)),
                          onTap: () => onSelect(s),
                        ))
                    .toList(),
              ),
            ),
        ],
      );
}

// ============================================================================
// CREATE REQUEST SCREEN (Piéton: je cherche un lift)
// ============================================================================

class _CreateRequestScreen extends StatefulWidget {
  final String userId;
  final Future<void> Function() onCreated;

  const _CreateRequestScreen({
    required this.userId,
    required this.onCreated,
  });

  @override
  State<_CreateRequestScreen> createState() =>
      _CreateRequestScreenState();
}

class _CreateRequestScreenState
    extends State<_CreateRequestScreen> {
  final _supabase = Supabase.instance.client;

  DateTime _date = DateTime.now();
  TimeOfDay _timeStart = const TimeOfDay(hour: 8, minute: 0);
  TimeOfDay _timeEnd = const TimeOfDay(hour: 18, minute: 0);
  String _pickupCity = '';
  double? _pickupLat, _pickupLng;
  String _destCity = '';
  double? _destLat, _destLng;
  String _requestType = 'return';
  bool _acceptPartial = true;
  int _maxDetour = 15;
  String _notes = '';
  bool _saving = false;

  List<Map<String, dynamic>> _pickupSuggestions = [];
  List<Map<String, dynamic>> _destSuggestions = [];
  bool _showPickupDrop = false, _showDestDrop = false;

  Future<List<Map<String, dynamic>>> _geocode(String query) async {
    if (query.length < 2) return [];
    try {
      final res = await http.get(Uri.parse(
          'https://api-adresse.data.gouv.fr/search/?q=${Uri.encodeComponent(query)}&type=municipality&limit=5'));
      final data = json.decode(res.body);
      return (data['features'] as List? ?? [])
          .map<Map<String, dynamic>>((f) => {
                'label':
                    '${f['properties']['label']} (${f['properties']['postcode']})',
                'city': f['properties']['city'] ??
                    f['properties']['label'],
                'postcode': f['properties']['postcode'] ?? '',
                'lat': f['geometry']['coordinates'][1],
                'lng': f['geometry']['coordinates'][0],
              })
          .toList();
    } catch (_) {
      return [];
    }
  }

  Future<void> _submit() async {
    if (_pickupCity.isEmpty || _destCity.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text(
                'Renseignez les villes de prise en charge et de destination')),
      );
      return;
    }
    setState(() => _saving = true);

    try {
      if (_pickupLat == null) {
        final geo = await _geocode(_pickupCity);
        if (geo.isNotEmpty) {
          _pickupLat = geo[0]['lat'];
          _pickupLng = geo[0]['lng'];
        }
      }
      if (_destLat == null) {
        final geo = await _geocode(_destCity);
        if (geo.isNotEmpty) {
          _destLat = geo[0]['lat'];
          _destLng = geo[0]['lng'];
        }
      }

      final startStr =
          '${_timeStart.hour.toString().padLeft(2, '0')}:${_timeStart.minute.toString().padLeft(2, '0')}';
      final endStr =
          '${_timeEnd.hour.toString().padLeft(2, '0')}:${_timeEnd.minute.toString().padLeft(2, '0')}';

      await _supabase.from('ride_requests').insert({
        'user_id': widget.userId,
        'pickup_city': _pickupCity,
        'pickup_lat': _pickupLat,
        'pickup_lng': _pickupLng,
        'destination_city': _destCity,
        'destination_lat': _destLat,
        'destination_lng': _destLng,
        'needed_date': DateFormat('yyyy-MM-dd').format(_date),
        'time_window_start': startStr,
        'time_window_end': endStr,
        'request_type': _requestType,
        'accept_partial': _acceptPartial,
        'max_detour_km': _maxDetour,
        'notes': _notes.isNotEmpty ? _notes : null,
        'status': 'active',
      });

      await widget.onCreated();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text('Erreur: $e'),
              backgroundColor: Colors.red),
        );
      }
    }
    if (mounted) setState(() => _saving = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Je cherche un lift 🚶',
            style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: const Color(0xFF3B82F6),
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Info card
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFFDBEAFE),
                borderRadius: BorderRadius.circular(14),
              ),
              child: const Row(
                children: [
                  Icon(Icons.info_outline,
                      color: Color(0xFF2563EB), size: 20),
                  SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'Vous avez besoin de rejoindre un point\nou de rentrer à votre base.\nUn collègue peut vous emmener !',
                      style: TextStyle(
                          fontSize: 13, color: Color(0xFF2563EB)),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Request type
            _buildLabel('Type de demande'),
            DropdownButtonFormField<String>(
              initialValue: _requestType,
              items: const [
                DropdownMenuItem(
                    value: 'return',
                    child: Text('🏠 Retour à ma base')),
                DropdownMenuItem(
                    value: 'pickup_point',
                    child: Text(
                        '📍 Rejoindre un point de prise en charge')),
                DropdownMenuItem(
                    value: 'custom',
                    child: Text('🔀 Trajet personnalisé')),
              ],
              onChanged: (v) =>
                  setState(() => _requestType = v ?? 'return'),
              decoration: _inputDecoration(null),
            ),
            const SizedBox(height: 18),

            // Date
            _buildLabel('Date souhaitée'),
            _buildDatePicker(),
            const SizedBox(height: 18),

            // Time window
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildLabel('Heure min'),
                      _buildTimePicker(_timeStart,
                          (t) => setState(() => _timeStart = t)),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildLabel('Heure max'),
                      _buildTimePicker(_timeEnd,
                          (t) => setState(() => _timeEnd = t)),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 18),

            // Pickup
            _buildLabel('Ville de prise en charge *'),
            _buildCityField(
              value: _pickupCity,
              hasGeo: _pickupLat != null,
              suggestions: _pickupSuggestions,
              showDropdown: _showPickupDrop,
              onChanged: (v) async {
                _pickupCity = v;
                _pickupLat = null;
                _pickupLng = null;
                final r = await _geocode(v);
                setState(() {
                  _pickupSuggestions = r;
                  _showPickupDrop = r.isNotEmpty;
                });
              },
              onSelect: (s) => setState(() {
                _pickupCity = s['city'];
                _pickupLat = s['lat'];
                _pickupLng = s['lng'];
                _showPickupDrop = false;
              }),
            ),
            const SizedBox(height: 18),

            // Destination
            _buildLabel('Destination *'),
            _buildCityField(
              value: _destCity,
              hasGeo: _destLat != null,
              suggestions: _destSuggestions,
              showDropdown: _showDestDrop,
              onChanged: (v) async {
                _destCity = v;
                _destLat = null;
                _destLng = null;
                final r = await _geocode(v);
                setState(() {
                  _destSuggestions = r;
                  _showDestDrop = r.isNotEmpty;
                });
              },
              onSelect: (s) => setState(() {
                _destCity = s['city'];
                _destLat = s['lat'];
                _destLng = s['lng'];
                _showDestDrop = false;
              }),
            ),
            const SizedBox(height: 18),

            // Max detour
            _buildLabel('Détour acceptable: $_maxDetour km'),
            Slider(
              value: _maxDetour.toDouble(),
              min: 0,
              max: 50,
              divisions: 10,
              label: '$_maxDetour km',
              activeColor: const Color(0xFF3B82F6),
              onChanged: (v) =>
                  setState(() => _maxDetour = v.round()),
            ),
            const SizedBox(height: 18),

            // Accept partial
            SwitchListTile(
              title: const Text(
                'Accepter un trajet partiel',
                style: TextStyle(
                    fontSize: 14, fontWeight: FontWeight.w500),
              ),
              subtitle: const Text(
                'Un conducteur peut vous rapprocher même s\'il ne va pas exactement à votre destination',
                style:
                    TextStyle(fontSize: 12, color: Colors.grey),
              ),
              value: _acceptPartial,
              activeThumbColor: const Color(0xFF3B82F6),
              onChanged: (v) =>
                  setState(() => _acceptPartial = v),
              contentPadding: EdgeInsets.zero,
            ),
            const SizedBox(height: 18),

            // Notes
            _buildLabel('Notes (optionnel)'),
            TextFormField(
              onChanged: (v) => _notes = v,
              maxLines: 3,
              decoration: _inputDecoration(
                  'Précisions sur votre besoin...'),
            ),
            const SizedBox(height: 24),

            // Submit
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _saving ? null : _submit,
                icon: _saving
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white))
                    : const Icon(Icons.directions_walk),
                label: Text(
                  _saving
                      ? 'Publication...'
                      : 'Publier ma demande',
                  style: const TextStyle(
                      fontWeight: FontWeight.bold, fontSize: 15),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF3B82F6),
                  foregroundColor: Colors.white,
                  padding:
                      const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14)),
                  elevation: 4,
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
        child: Text(text,
            style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: Color(0xFF374151))),
      );

  InputDecoration _inputDecoration(String? hint) =>
      InputDecoration(
        hintText: hint,
        filled: true,
        fillColor: Colors.grey.shade50,
        border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: BorderSide(color: Colors.grey.shade300)),
        enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: BorderSide(color: Colors.grey.shade300)),
        focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: const BorderSide(
                color: Color(0xFF3B82F6), width: 2)),
        contentPadding: const EdgeInsets.symmetric(
            horizontal: 16, vertical: 14),
      );

  Widget _buildDatePicker() => InkWell(
        onTap: () async {
          final picked = await showDatePicker(
            context: context,
            initialDate: _date,
            firstDate: DateTime.now(),
            lastDate:
                DateTime.now().add(const Duration(days: 365)),
          );
          if (picked != null) setState(() => _date = picked);
        },
        child: Container(
          padding: const EdgeInsets.symmetric(
              horizontal: 16, vertical: 14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: Colors.grey.shade300),
          ),
          child: Row(
            children: [
              const Icon(Icons.calendar_today,
                  size: 18, color: Color(0xFF3B82F6)),
              const SizedBox(width: 10),
              Text(
                DateFormat('EEEE d MMMM yyyy', 'fr_FR')
                    .format(_date),
                style: const TextStyle(
                    fontSize: 14, fontWeight: FontWeight.w500),
              ),
            ],
          ),
        ),
      );

  Widget _buildTimePicker(
          TimeOfDay time, ValueChanged<TimeOfDay> onChanged) =>
      InkWell(
        onTap: () async {
          final picked = await showTimePicker(
              context: context, initialTime: time);
          if (picked != null) onChanged(picked);
        },
        child: Container(
          padding: const EdgeInsets.symmetric(
              horizontal: 16, vertical: 14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: Colors.grey.shade300),
            color: Colors.grey.shade50,
          ),
          child: Row(
            children: [
              const Icon(Icons.access_time,
                  size: 18, color: Color(0xFF3B82F6)),
              const SizedBox(width: 10),
              Text(
                '${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}',
                style: const TextStyle(
                    fontSize: 14, fontWeight: FontWeight.w500),
              ),
            ],
          ),
        ),
      );

  Widget _buildCityField({
    required String value,
    required bool hasGeo,
    required List<Map<String, dynamic>> suggestions,
    required bool showDropdown,
    required ValueChanged<String> onChanged,
    required ValueChanged<Map<String, dynamic>> onSelect,
  }) =>
      Column(
        children: [
          TextFormField(
            initialValue: value.isEmpty ? null : value,
            onChanged: onChanged,
            decoration: _inputDecoration('Tapez une ville...')
                .copyWith(
              prefixIcon: Icon(Icons.place,
                  color: hasGeo
                      ? const Color(0xFF10B981)
                      : Colors.grey,
                  size: 20),
              suffixIcon: hasGeo
                  ? const Icon(Icons.check_circle,
                      color: Color(0xFF10B981), size: 20)
                  : null,
            ),
          ),
          if (showDropdown && suggestions.isNotEmpty)
            Container(
              margin: const EdgeInsets.only(top: 4),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.grey.shade200),
                boxShadow: [
                  BoxShadow(
                      color: Colors.black.withValues(alpha: 0.1),
                      blurRadius: 8)
                ],
              ),
              child: Column(
                children: suggestions
                    .map((s) => ListTile(
                          dense: true,
                          title: Text(s['label'],
                              style:
                                  const TextStyle(fontSize: 13)),
                          onTap: () => onSelect(s),
                        ))
                    .toList(),
              ),
            ),
        ],
      );
}

// ============================================================================
// SHARED WIDGETS
// ============================================================================

class _SectionHeader extends StatelessWidget {
  final String title;
  final int count;
  const _SectionHeader({required this.title, required this.count});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Text(title,
            style: const TextStyle(
                fontWeight: FontWeight.bold, fontSize: 15)),
        const Spacer(),
        Container(
          padding: const EdgeInsets.symmetric(
              horizontal: 8, vertical: 2),
          decoration: BoxDecoration(
            color: Colors.grey.shade200,
            borderRadius: BorderRadius.circular(10),
          ),
          child: Text('$count',
              style: const TextStyle(
                  fontWeight: FontWeight.bold, fontSize: 12)),
        ),
      ],
    );
  }
}

class _StatusBadge extends StatelessWidget {
  final String status;
  const _StatusBadge({required this.status});

  @override
  Widget build(BuildContext context) {
    Color bg, fg;
    String label;
    switch (status) {
      case 'active':
        bg = const Color(0xFFD1FAE5);
        fg = const Color(0xFF059669);
        label = 'Active';
        break;
      case 'paused':
        bg = const Color(0xFFFEF3C7);
        fg = const Color(0xFFD97706);
        label = '⏸ En pause';
        break;
      case 'in_transit':
        bg = const Color(0xFFEEF2FF);
        fg = const Color(0xFF6366F1);
        label = 'En trajet';
        break;
      case 'matched':
        bg = const Color(0xFFD1FAE5);
        fg = const Color(0xFF059669);
        label = 'Matché';
        break;
      case 'en_route':
        bg = const Color(0xFFDBEAFE);
        fg = const Color(0xFF2563EB);
        label = 'En route';
        break;
      case 'completed':
        bg = const Color(0xFFF3F4F6);
        fg = Colors.grey;
        label = 'Terminé';
        break;
      case 'cancelled':
        bg = const Color(0xFFFEE2E2);
        fg = const Color(0xFFDC2626);
        label = 'Annulé';
        break;
      case 'expired':
        bg = const Color(0xFFFEE2E2);
        fg = const Color(0xFFDC2626);
        label = 'Expiré';
        break;
      default:
        bg = Colors.grey.shade200;
        fg = Colors.grey;
        label = status;
        break;
    }
    return Container(
      padding:
          const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
          color: bg, borderRadius: BorderRadius.circular(20)),
      child: Text(label,
          style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.bold,
              color: fg)),
    );
  }
}

class _RequestTypeBadge extends StatelessWidget {
  final String type;
  const _RequestTypeBadge({required this.type});

  @override
  Widget build(BuildContext context) {
    Color bg, fg;
    IconData icon;
    String label;
    switch (type) {
      case 'return':
        bg = const Color(0xFFDBEAFE);
        fg = const Color(0xFF2563EB);
        icon = Icons.home;
        label = 'Retour';
        break;
      case 'pickup_point':
        bg = const Color(0xFFFEF3C7);
        fg = const Color(0xFFD97706);
        icon = Icons.pin_drop;
        label = 'Pickup';
        break;
      default:
        bg = const Color(0xFFF3E8FF);
        fg = const Color(0xFF7C3AED);
        icon = Icons.swap_horiz;
        label = 'Custom';
        break;
    }
    return Container(
      padding:
          const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
          color: bg, borderRadius: BorderRadius.circular(20)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: fg),
          const SizedBox(width: 3),
          Text(label,
              style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  color: fg)),
        ],
      ),
    );
  }
}

class _MatchStatusBadge extends StatelessWidget {
  final String status;
  const _MatchStatusBadge({required this.status});

  @override
  Widget build(BuildContext context) {
    Color bg, fg;
    String label;
    switch (status) {
      case 'proposed':
        bg = const Color(0xFFFEF3C7);
        fg = const Color(0xFFD97706);
        label = '⏳ Proposé';
        break;
      case 'accepted':
        bg = const Color(0xFFD1FAE5);
        fg = const Color(0xFF059669);
        label = '✅ Accepté';
        break;
      case 'declined':
        bg = const Color(0xFFFEE2E2);
        fg = const Color(0xFFDC2626);
        label = 'Décliné';
        break;
      case 'completed':
        bg = const Color(0xFFF3F4F6);
        fg = Colors.grey;
        label = 'Terminé';
        break;
      default:
        bg = Colors.grey.shade200;
        fg = Colors.grey;
        label = status;
        break;
    }
    return Container(
      padding:
          const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
          color: bg, borderRadius: BorderRadius.circular(10)),
      child: Text(label,
          style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.bold,
              color: fg)),
    );
  }
}

class _InfoChip extends StatelessWidget {
  final IconData icon;
  final String text;
  const _InfoChip({required this.icon, required this.text});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 13, color: Colors.grey),
        const SizedBox(width: 4),
        Text(text,
            style:
                const TextStyle(fontSize: 12, color: Colors.grey)),
      ],
    );
  }
}

class _MatchDetail extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  const _MatchDetail(
      {required this.icon, required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 14, color: color),
        const SizedBox(width: 4),
        Text(label,
            style: TextStyle(
                fontSize: 12, color: Colors.grey.shade700)),
      ],
    );
  }
}

class _ActionChip extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _ActionChip({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.symmetric(
            horizontal: 12, vertical: 7),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 14, color: color),
            const SizedBox(width: 4),
            Text(label,
                style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: color)),
          ],
        ),
      ),
    );
  }
}
