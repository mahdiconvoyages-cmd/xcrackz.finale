import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:intl/intl.dart';
import '../onboarding/location_onboarding_screen.dart';
import '../../services/planning_location_service.dart';

/// Réseau Planning - Synchronisation de trajets entre convoyeurs
/// Aucun transport, paiement ou responsabilité légale - coordination pure
class PlanningNetworkScreen extends StatefulWidget {
  const PlanningNetworkScreen({super.key});

  @override
  State<PlanningNetworkScreen> createState() => _PlanningNetworkScreenState();
}

class _PlanningNetworkScreenState extends State<PlanningNetworkScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _supabase = Supabase.instance.client;
  final _locationService = PlanningLocationService();

  List<Map<String, dynamic>> _myPlannings = [];
  List<Map<String, dynamic>> _allPlannings = [];
  List<Map<String, dynamic>> _matches = [];
  List<Map<String, dynamic>> _notifications = [];
  Map<String, dynamic>? _stats;
  bool _loading = true;
  bool _showOnboarding = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _checkOnboarding();
    _loadData();
    _initLocationService();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _checkOnboarding() async {
    final completed = await LocationOnboardingScreen.isCompleted();
    if (!completed && mounted) {
      setState(() => _showOnboarding = true);
    }
  }

  Future<void> _initLocationService() async {
    await _locationService.initNotifications();
    await _locationService.startTracking();
  }

  Future<void> _loadNotifications() async {
    if (_userId.isEmpty) return;
    try {
      final res = await _supabase
          .from('planning_notifications')
          .select('*')
          .eq('user_id', _userId)
          .eq('is_read', false)
          .order('created_at', ascending: false)
          .limit(20);
      if (mounted) setState(() => _notifications = List<Map<String, dynamic>>.from(res as List? ?? []));
    } catch (_) {}
  }

  String get _userId => _supabase.auth.currentUser?.id ?? '';

  Future<void> _loadData() async {
    if (_userId.isEmpty) return;
    setState(() => _loading = true);

    try {
      final now = DateTime.now();
      final today = DateFormat('yyyy-MM-dd').format(now);

      final results = await Future.wait([
        _supabase
            .from('convoy_plannings')
            .select('*, waypoints:planning_waypoints(*)')
            .eq('user_id', _userId)
            .order('planning_date', ascending: false),
        _supabase
            .from('convoy_plannings')
            .select('*')
            .eq('status', 'published')
            .gte('planning_date', today)
            .order('planning_date', ascending: true),
        _supabase
            .from('planning_matches')
            .select('*')
            .or('user_a_id.eq.$_userId,user_b_id.eq.$_userId')
            .order('match_score', ascending: false),
        _supabase
            .from('planning_stats')
            .select('*')
            .eq('user_id', _userId)
            .eq('month', now.month)
            .eq('year', now.year)
            .maybeSingle(),
      ]);

      setState(() {
        _myPlannings = List<Map<String, dynamic>>.from(results[0] as List? ?? []);
        _allPlannings = List<Map<String, dynamic>>.from(results[1] as List? ?? []);
        _matches = List<Map<String, dynamic>>.from(results[2] as List? ?? []);
        _stats = results[3] as Map<String, dynamic>?;
        _loading = false;
      });
      await _loadNotifications();
    } catch (e) {
      debugPrint('Error loading planning data: $e');
      setState(() => _loading = false);
    }
  }

  Future<void> _runAIMatching(String planningId) async {
    try {
      final data = await _supabase.rpc('find_planning_matches', params: {'p_planning_id': planningId});
      
      for (final match in (data as List? ?? [])) {
        await _supabase.from('planning_matches').upsert({
          'planning_a_id': planningId,
          'planning_b_id': match['matched_planning_id'],
          'user_a_id': _userId,
          'user_b_id': match['matched_user_id'],
          'match_score': match['match_score'],
          'match_type': match['match_type'],
          'distance_km': match['distance_km'],
          'time_overlap_minutes': match['time_overlap_minutes'],
          'potential_km_saved': match['potential_km_saved'],
        });
      }

      await _loadData();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('${(data as List?)?.length ?? 0} match(s) trouvé(s)'),
            backgroundColor: const Color(0xFF6366F1),
          ),
        );
      }
    } catch (e) {
      debugPrint('AI Matching error: $e');
    }
  }

  Future<void> _deletePlanning(String id) async {
    await _supabase.from('convoy_plannings').delete().eq('id', id);
    await _loadData();
  }

  Future<void> _respondToMatch(String matchId, String response) async {
    await _supabase.from('planning_matches').update({'status': response}).eq('id', matchId);
    
    if (response == 'accepted') {
      final match = _matches.firstWhere((m) => m['id'] == matchId, orElse: () => {});
      if (match.isNotEmpty) {
        await _supabase.rpc('upsert_planning_stats', params: {
          'p_user_id': _userId,
          'p_km_saved': (match['potential_km_saved'] ?? 0).toDouble(),
          'p_hours_saved': ((match['time_overlap_minutes'] ?? 0) / 60).toDouble(),
          'p_match_accepted': true,
        });
      }
    }
    await _loadData();
  }

  @override
  Widget build(BuildContext context) {
    // Onboarding gate - show location tutorial if not completed
    if (_showOnboarding) {
      return LocationOnboardingScreen(
        onCompleted: () {
          setState(() => _showOnboarding = false);
          _initLocationService();
        },
      );
    }

    final pendingCount = _matches.where((m) => m['status'] == 'pending').length;
    final unreadNotifs = _notifications.length;

    return Scaffold(
      body: NestedScrollView(
        headerSliverBuilder: (context, innerBoxIsScrolled) => [
          // Header gradient
          SliverToBoxAdapter(
            child: Container(
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [Color(0xFF6366F1), Color(0xFF9333EA), Color(0xFFEC4899)],
                  begin: Alignment.centerLeft,
                  end: Alignment.centerRight,
                ),
              ),
              child: SafeArea(
                bottom: false,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          IconButton(
                            onPressed: () => Navigator.pop(context),
                            icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white, size: 20),
                          ),
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.2),
                              borderRadius: BorderRadius.circular(14),
                            ),
                            child: const Icon(Icons.share_rounded, color: Colors.white, size: 22),
                          ),
                          const SizedBox(width: 12),
                          const Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('Réseau Planning',
                                    style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: Colors.white)),
                                Text('Synchronisez vos trajets',
                                    style: TextStyle(fontSize: 13, color: Colors.white70)),
                              ],
                            ),
                          ),
                          // Notification bell
                          Stack(
                            children: [
                              IconButton(
                                onPressed: () => _showNotificationsSheet(context),
                                icon: const Icon(Icons.notifications_outlined, color: Colors.white, size: 24),
                              ),
                              if (unreadNotifs > 0)
                                Positioned(
                                  right: 4, top: 4,
                                  child: Container(
                                    padding: const EdgeInsets.all(4),
                                    decoration: const BoxDecoration(color: Color(0xFFEF4444), shape: BoxShape.circle),
                                    child: Text('$unreadNotifs', style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
                                  ),
                                ),
                            ],
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      // Quick stats
                      Row(
                        children: [
                          _QuickStat(label: 'Actifs', value: '${_myPlannings.where((p) => p['status'] == 'published').length}', icon: Icons.calendar_today),
                          _QuickStat(label: 'Matchs', value: '${_matches.length}', icon: Icons.bolt),
                          _QuickStat(label: 'En ligne', value: '${_allPlannings.length}', icon: Icons.people),
                          _QuickStat(label: 'KM éco.', value: '${(_stats?['km_saved'] ?? 0).round()}', icon: Icons.eco),
                        ],
                      ),
                      const SizedBox(height: 16),
                    ],
                  ),
                ),
              ),
            ),
          ),
          // Tabs
          SliverPersistentHeader(
            pinned: true,
            delegate: _TabBarDelegate(
              TabBar(
                controller: _tabController,
                isScrollable: true,
                tabAlignment: TabAlignment.start,
                labelColor: const Color(0xFF6366F1),
                unselectedLabelColor: Colors.grey,
                indicatorColor: const Color(0xFF6366F1),
                indicatorWeight: 3,
                labelStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                tabs: [
                  const Tab(text: 'Mes Plannings'),
                  Tab(child: Row(mainAxisSize: MainAxisSize.min, children: [
                    const Text('Matching IA'),
                    if (pendingCount > 0) ...[
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(color: const Color(0xFFEF4444), borderRadius: BorderRadius.circular(10)),
                        child: Text('$pendingCount', style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ])),
                  const Tab(text: 'Réseau Carte'),
                  const Tab(text: 'Statistiques'),
                ],
              ),
            ),
          ),
        ],
        body: _loading
            ? const Center(child: CircularProgressIndicator(color: Color(0xFF6366F1)))
            : TabBarView(
                controller: _tabController,
                children: [
                  _PlanningsTab(
                    plannings: _myPlannings,
                    onDelete: _deletePlanning,
                    onMatch: _runAIMatching,
                    onCreateNew: () => _showCreateDialog(context),
                    onRefresh: _loadData,
                  ),
                  _MatchesTab(
                    matches: _matches,
                    onRespond: _respondToMatch,
                    onRefresh: _loadData,
                  ),
                  _NetworkListTab(plannings: _allPlannings, userId: _userId),
                  _StatsTab(stats: _stats),
                ],
              ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showCreateDialog(context),
        backgroundColor: const Color(0xFF6366F1),
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add),
        label: const Text('Publier', style: TextStyle(fontWeight: FontWeight.bold)),
      ),
    );
  }

  void _showNotificationsSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => DraggableScrollableSheet(
        initialChildSize: 0.5,
        maxChildSize: 0.85,
        minChildSize: 0.3,
        expand: false,
        builder: (context, scrollController) => Column(
          children: [
            Container(
              margin: const EdgeInsets.only(top: 12),
              width: 40, height: 4,
              decoration: BoxDecoration(color: Colors.grey[300], borderRadius: BorderRadius.circular(2)),
            ),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  const Icon(Icons.notifications, color: Color(0xFF6366F1)),
                  const SizedBox(width: 8),
                  const Text('Notifications', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  const Spacer(),
                  if (_notifications.isNotEmpty)
                    TextButton(
                      onPressed: () async {
                        for (final n in _notifications) {
                          await _supabase.from('planning_notifications').update({'is_read': true}).eq('id', n['id']);
                        }
                        setState(() => _notifications.clear());
                        if (context.mounted) Navigator.pop(context);
                      },
                      child: const Text('Tout marquer lu'),
                    ),
                ],
              ),
            ),
            const Divider(height: 1),
            Expanded(
              child: _notifications.isEmpty
                  ? const Center(child: Text('Aucune notification', style: TextStyle(color: Colors.grey)))
                  : ListView.separated(
                      controller: scrollController,
                      itemCount: _notifications.length,
                      separatorBuilder: (_, __) => const Divider(height: 1),
                      itemBuilder: (_, i) {
                        final n = _notifications[i];
                        final type = n['type'] ?? '';
                        IconData icon;
                        Color color;
                        switch (type) {
                          case 'new_match':
                            icon = Icons.bolt;
                            color = const Color(0xFFF59E0B);
                            break;
                          case 'match_accepted':
                            icon = Icons.check_circle;
                            color = const Color(0xFF10B981);
                            break;
                          case 'match_declined':
                            icon = Icons.cancel;
                            color = const Color(0xFFEF4444);
                            break;
                          case 'new_message':
                            icon = Icons.chat_bubble;
                            color = const Color(0xFF6366F1);
                            break;
                          default:
                            icon = Icons.info;
                            color = Colors.grey;
                        }
                        return ListTile(
                          leading: CircleAvatar(
                            backgroundColor: color.withValues(alpha: 0.15),
                            child: Icon(icon, color: color, size: 20),
                          ),
                          title: Text(n['title'] ?? '', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                          subtitle: Text(n['body'] ?? '', style: const TextStyle(fontSize: 12)),
                          trailing: Text(
                            _timeAgo(n['created_at']),
                            style: const TextStyle(fontSize: 11, color: Colors.grey),
                          ),
                          onTap: () async {
                            await _supabase.from('planning_notifications').update({'is_read': true}).eq('id', n['id']);
                            setState(() => _notifications.removeAt(i));
                            if (context.mounted) Navigator.pop(context);
                            // Navigate to matches tab if match notification
                            if (type == 'new_match' || type == 'match_accepted' || type == 'match_declined') {
                              _tabController.animateTo(1);
                            } else if (type == 'new_message') {
                              _tabController.animateTo(1);
                            }
                          },
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }

  String _timeAgo(String? dateStr) {
    if (dateStr == null) return '';
    try {
      final date = DateTime.parse(dateStr);
      final diff = DateTime.now().difference(date);
      if (diff.inMinutes < 1) return 'À l\'instant';
      if (diff.inMinutes < 60) return 'Il y a ${diff.inMinutes}min';
      if (diff.inHours < 24) return 'Il y a ${diff.inHours}h';
      return 'Il y a ${diff.inDays}j';
    } catch (_) {
      return '';
    }
  }

  void _showCreateDialog(BuildContext context) {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => _CreatePlanningScreen(
        userId: _userId,
        onCreated: (id) async {
          Navigator.pop(context);
          await _loadData();
          await _runAIMatching(id);
        },
      )),
    );
  }
}

// ============================================================================
// Quick stat widget
// ============================================================================

class _QuickStat extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;

  const _QuickStat({required this.label, required this.value, required this.icon});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 4),
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.15),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          children: [
            Icon(icon, color: Colors.white70, size: 16),
            const SizedBox(height: 4),
            Text(value, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 16)),
            Text(label, style: const TextStyle(color: Colors.white60, fontSize: 10)),
          ],
        ),
      ),
    );
  }
}

// ============================================================================
// Tab bar delegate
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
// PLANNINGS TAB
// ============================================================================

class _PlanningsTab extends StatelessWidget {
  final List<Map<String, dynamic>> plannings;
  final Future<void> Function(String) onDelete;
  final Future<void> Function(String) onMatch;
  final VoidCallback onCreateNew;
  final Future<void> Function() onRefresh;

  const _PlanningsTab({
    required this.plannings,
    required this.onDelete,
    required this.onMatch,
    required this.onCreateNew,
    required this.onRefresh,
  });

  @override
  Widget build(BuildContext context) {
    if (plannings.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 80, height: 80,
                decoration: BoxDecoration(color: const Color(0xFFE0E7FF), borderRadius: BorderRadius.circular(40)),
                child: const Icon(Icons.calendar_today, size: 40, color: Color(0xFF6366F1)),
              ),
              const SizedBox(height: 16),
              const Text('Aucun planning publié', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              const Text('Publiez votre premier trajet pour que l\'IA trouve des synergies.', textAlign: TextAlign.center, style: TextStyle(color: Colors.grey)),
              const SizedBox(height: 24),
              ElevatedButton.icon(
                onPressed: onCreateNew,
                icon: const Icon(Icons.add),
                label: const Text('Publier un planning'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF6366F1),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
              ),
            ],
          ),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: onRefresh,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: plannings.length,
        itemBuilder: (context, index) {
          final p = plannings[index];
          final status = p['status'] ?? 'draft';
          final isPublished = status == 'published';
          final waypoints = (p['waypoints'] as List?)?.length ?? 0;

          // Expiration logic
          final expiresAt = p['expires_at'] != null ? DateTime.tryParse(p['expires_at'].toString()) : null;
          final isExpired = expiresAt != null && DateTime.now().isAfter(expiresAt);
          final isExpiringSoon = expiresAt != null && !isExpired && expiresAt.difference(DateTime.now()).inMinutes < 60;

          return Card(
            margin: const EdgeInsets.only(bottom: 12),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            elevation: 2,
            child: Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(16),
                border: isExpired ? Border.all(color: const Color(0xFFEF4444).withValues(alpha: 0.5), width: 1.5)
                    : isExpiringSoon ? Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.5), width: 1.5)
                    : null,
              ),
              child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Header row
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          p['title'] ?? 'Sans titre',
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      if (isExpired)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(color: const Color(0xFFFEE2E2), borderRadius: BorderRadius.circular(20)),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.timer_off, size: 12, color: Color(0xFFDC2626)),
                              SizedBox(width: 3),
                              Text('Expiré', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFFDC2626))),
                            ],
                          ),
                        )
                      else if (isExpiringSoon)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(color: const Color(0xFFFEF3C7), borderRadius: BorderRadius.circular(20)),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.timer, size: 12, color: Color(0xFFD97706)),
                              const SizedBox(width: 3),
                              Text('${expiresAt!.difference(DateTime.now()).inMinutes}min',
                                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFFD97706))),
                            ],
                          ),
                        )
                      else
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: isPublished ? const Color(0xFFD1FAE5) : const Color(0xFFFEE2E2),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          isPublished ? 'Publié' : (status == 'cancelled' ? 'Annulé' : status),
                          style: TextStyle(
                            fontSize: 11, fontWeight: FontWeight.bold,
                            color: isPublished ? const Color(0xFF059669) : const Color(0xFFDC2626),
                          ),
                        ),
                      ),
                      if (p['is_return_trip'] == true) ...[
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(color: const Color(0xFFDBEAFE), borderRadius: BorderRadius.circular(20)),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.replay, size: 12, color: Color(0xFF2563EB)),
                              SizedBox(width: 3),
                              Text('Retour', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF2563EB))),
                            ],
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 10),
                  // Route
                  Row(
                    children: [
                      const Icon(Icons.place, size: 16, color: Color(0xFF6366F1)),
                      const SizedBox(width: 4),
                      Text(p['origin_city'] ?? '', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                      const SizedBox(width: 4),
                      const Icon(Icons.arrow_forward, size: 14, color: Colors.grey),
                      if (waypoints > 0) ...[
                        const SizedBox(width: 4),
                        Text('$waypoints étape${waypoints > 1 ? 's' : ''}', style: const TextStyle(fontSize: 12, color: Colors.grey)),
                        const SizedBox(width: 4),
                        const Icon(Icons.arrow_forward, size: 14, color: Colors.grey),
                      ],
                      const SizedBox(width: 4),
                      Text(p['destination_city'] ?? '', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                    ],
                  ),
                  const SizedBox(height: 8),
                  // Details
                  Wrap(
                    spacing: 12,
                    runSpacing: 4,
                    children: [
                      _DetailChip(icon: Icons.calendar_today, text: _formatDate(p['planning_date'])),
                      _DetailChip(icon: Icons.access_time, text: '${(p['start_time'] ?? '').toString().substring(0, 5)} - ${(p['end_time'] ?? '').toString().substring(0, 5)}'),
                      if ((p['flexibility_minutes'] ?? 0) > 0)
                        _DetailChip(icon: Icons.swap_horiz, text: '±${p['flexibility_minutes']}min'),
                    ],
                  ),
                  // Expiration countdown bar
                  if (expiresAt != null && !isExpired) ...[
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: isExpiringSoon ? const Color(0xFFFEF3C7) : const Color(0xFFF0F9FF),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.schedule, size: 14, color: isExpiringSoon ? const Color(0xFFD97706) : const Color(0xFF0284C7)),
                          const SizedBox(width: 6),
                          Text(
                            'Expire ${_formatCountdown(expiresAt)}',
                            style: TextStyle(
                              fontSize: 12, fontWeight: FontWeight.w600,
                              color: isExpiringSoon ? const Color(0xFFD97706) : const Color(0xFF0284C7),
                            ),
                          ),
                          const Spacer(),
                          if (waypoints > 0)
                            Text('Visible sur ${waypoints + 1} ville${waypoints > 0 ? 's' : ''}',
                                style: TextStyle(fontSize: 11, color: Colors.grey[600])),
                        ],
                      ),
                    ),
                  ] else if (isExpired && waypoints > 0) ...[
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF0FDF4),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.location_on, size: 14, color: Color(0xFF16A34A)),
                          const SizedBox(width: 6),
                          Text('Encore visible sur $waypoints étape${waypoints > 1 ? 's' : ''} retour',
                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF16A34A))),
                        ],
                      ),
                    ),
                  ],
                  const SizedBox(height: 12),
                  // Actions
                  Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      _ActionChip(
                        icon: Icons.bolt,
                        label: 'Matcher',
                        color: const Color(0xFFF59E0B),
                        onTap: () => onMatch(p['id']),
                      ),
                      const SizedBox(width: 8),
                      _ActionChip(
                        icon: Icons.delete_outline,
                        label: 'Supprimer',
                        color: const Color(0xFFEF4444),
                        onTap: () async {
                          final confirm = await showDialog<bool>(
                            context: context,
                            builder: (_) => AlertDialog(
                              title: const Text('Supprimer ?'),
                              content: const Text('Ce planning sera définitivement supprimé.'),
                              actions: [
                                TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Annuler')),
                                TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Supprimer', style: TextStyle(color: Colors.red))),
                              ],
                            ),
                          );
                          if (confirm == true) onDelete(p['id']);
                        },
                      ),
                    ],
                  ),
                ],
              ),
            ),
            ),
          );
        },
      ),
    );
  }

  String _formatDate(String? date) {
    if (date == null) return '';
    try {
      return DateFormat('EEE d MMM', 'fr_FR').format(DateTime.parse(date));
    } catch (_) {
      return date;
    }
  }

  String _formatCountdown(DateTime expiresAt) {
    final diff = expiresAt.difference(DateTime.now());
    if (diff.inDays > 0) return 'dans ${diff.inDays}j ${diff.inHours % 24}h';
    if (diff.inHours > 0) return 'dans ${diff.inHours}h ${diff.inMinutes % 60}min';
    return 'dans ${diff.inMinutes}min';
  }
}

// ============================================================================
// MATCHES TAB - Enhanced with user info + chat
// ============================================================================

class _MatchesTab extends StatefulWidget {
  final List<Map<String, dynamic>> matches;
  final Future<void> Function(String, String) onRespond;
  final Future<void> Function() onRefresh;

  const _MatchesTab({required this.matches, required this.onRespond, required this.onRefresh});

  @override
  State<_MatchesTab> createState() => _MatchesTabState();
}

class _MatchesTabState extends State<_MatchesTab> {
  final _supabase = Supabase.instance.client;
  final Map<String, Map<String, dynamic>> _profiles = {};
  final Map<String, Map<String, dynamic>> _plannings = {};
  bool _enriched = false;

  String get _userId => _supabase.auth.currentUser?.id ?? '';

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
    for (final m in widget.matches) {
      final otherUserId = m['user_a_id'] == _userId ? m['user_b_id'] : m['user_a_id'];
      final otherPlanningId = m['user_a_id'] == _userId ? m['planning_b_id'] : m['planning_a_id'];

      if (!_profiles.containsKey(otherUserId)) {
        final res = await _supabase.from('profiles')
            .select('first_name, last_name, company_name, phone, email')
            .eq('id', otherUserId).maybeSingle();
        if (res != null) _profiles[otherUserId] = res;
      }
      if (!_plannings.containsKey(otherPlanningId)) {
        final res = await _supabase.from('convoy_plannings')
            .select('*').eq('id', otherPlanningId).maybeSingle();
        if (res != null) _plannings[otherPlanningId] = res;
      }
    }
    if (mounted) setState(() => _enriched = true);
  }

  @override
  Widget build(BuildContext context) {
    if (widget.matches.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 80, height: 80,
              decoration: BoxDecoration(color: const Color(0xFFFEF3C7), borderRadius: BorderRadius.circular(40)),
              child: const Icon(Icons.bolt, size: 40, color: Color(0xFFF59E0B)),
            ),
            const SizedBox(height: 16),
            const Text('Aucun match trouvé', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            const Text('Publiez un planning et lancez le matching IA.', style: TextStyle(color: Colors.grey)),
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
          final type = m['match_type'] ?? 'time_overlap';
          final status = m['status'] ?? 'pending';
          final isPending = status == 'pending';
          final isAccepted = status == 'accepted';

          final otherUserId = m['user_a_id'] == _userId ? m['user_b_id'] : m['user_a_id'];
          final otherPlanningId = m['user_a_id'] == _userId ? m['planning_b_id'] : m['planning_a_id'];
          final profile = _profiles[otherUserId];
          final planning = _plannings[otherPlanningId];

          final typeInfo = _matchTypeInfo(type);

          return Card(
            margin: const EdgeInsets.only(bottom: 12),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
              side: BorderSide(
                color: isPending ? const Color(0xFFFCD34D) : (isAccepted ? const Color(0xFF6EE7B7) : Colors.grey.shade200),
                width: isPending || isAccepted ? 2 : 1,
              ),
            ),
            elevation: isPending ? 4 : 1,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Other user info
                  if (profile != null) ...[
                    Row(
                      children: [
                        CircleAvatar(
                          radius: 20,
                          backgroundColor: const Color(0xFF6366F1),
                          child: Text(
                            '${(profile['first_name'] ?? '?')[0]}${(profile['last_name'] ?? '?')[0]}',
                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '${profile['first_name'] ?? ''} ${profile['last_name'] ?? ''}',
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                overflow: TextOverflow.ellipsis,
                              ),
                              if (profile['company_name'] != null && profile['company_name'].toString().isNotEmpty)
                                Text(profile['company_name'], style: const TextStyle(fontSize: 12, color: Colors.grey)),
                            ],
                          ),
                        ),
                        if (isAccepted)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(color: const Color(0xFFD1FAE5), borderRadius: BorderRadius.circular(10)),
                            child: const Text('✅ Accepté', style: TextStyle(color: Color(0xFF059669), fontWeight: FontWeight.bold, fontSize: 11)),
                          ),
                        if (status == 'declined')
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(color: const Color(0xFFFEE2E2), borderRadius: BorderRadius.circular(10)),
                            child: const Text('Décliné', style: TextStyle(color: Color(0xFFDC2626), fontWeight: FontWeight.bold, fontSize: 11)),
                          ),
                      ],
                    ),
                    const Divider(height: 20),
                  ],

                  // Other planning route
                  if (planning != null) ...[
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
                              const Icon(Icons.route, size: 14, color: Color(0xFF6366F1)),
                              const SizedBox(width: 6),
                              const Text('Son trajet', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Color(0xFF6366F1))),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Row(
                            children: [
                              const Icon(Icons.place, size: 14, color: Color(0xFF10B981)),
                              const SizedBox(width: 4),
                              Flexible(child: Text(planning['origin_city'] ?? '', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13))),
                              const SizedBox(width: 4),
                              const Icon(Icons.arrow_forward, size: 12, color: Colors.grey),
                              const SizedBox(width: 4),
                              const Icon(Icons.place, size: 14, color: Color(0xFFEF4444)),
                              const SizedBox(width: 4),
                              Flexible(child: Text(planning['destination_city'] ?? '', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13))),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Wrap(
                            spacing: 12,
                            children: [
                              Row(mainAxisSize: MainAxisSize.min, children: [
                                const Icon(Icons.calendar_today, size: 11, color: Colors.grey),
                                const SizedBox(width: 3),
                                Text(
                                  planning['planning_date'] != null
                                      ? DateFormat('d MMM yyyy', 'fr_FR').format(DateTime.parse(planning['planning_date']))
                                      : '',
                                  style: const TextStyle(fontSize: 11, color: Colors.grey),
                                ),
                              ]),
                              Row(mainAxisSize: MainAxisSize.min, children: [
                                const Icon(Icons.access_time, size: 11, color: Colors.grey),
                                const SizedBox(width: 3),
                                Text(
                                  '${(planning['start_time'] ?? '').toString().substring(0, 5)} - ${(planning['end_time'] ?? '').toString().substring(0, 5)}',
                                  style: const TextStyle(fontSize: 11, color: Colors.grey),
                                ),
                              ]),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 10),
                  ],

                  // Type & Score
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(color: typeInfo.bgColor, borderRadius: BorderRadius.circular(20)),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(typeInfo.icon, size: 14, color: typeInfo.textColor),
                            const SizedBox(width: 4),
                            Text(typeInfo.label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: typeInfo.textColor)),
                          ],
                        ),
                      ),
                      const Spacer(),
                      Row(
                        children: List.generate(5, (i) => Icon(
                          Icons.star_rounded,
                          size: 18,
                          color: i < (score / 20).ceil() ? const Color(0xFFFBBF24) : Colors.grey.shade300,
                        )),
                      ),
                      const SizedBox(width: 6),
                      Text('$score%', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                    ],
                  ),
                  const SizedBox(height: 12),
                  // Details
                  Row(
                    children: [
                      _MatchDetail(icon: Icons.navigation, label: '${(m['distance_km'] ?? 0).toStringAsFixed(1)} km', color: const Color(0xFF3B82F6)),
                      const SizedBox(width: 12),
                      _MatchDetail(icon: Icons.access_time, label: '${m['time_overlap_minutes'] ?? 0} min', color: const Color(0xFF8B5CF6)),
                      const SizedBox(width: 12),
                      _MatchDetail(icon: Icons.eco, label: '${(m['potential_km_saved'] ?? 0).toStringAsFixed(0)} km éco.', color: const Color(0xFF10B981)),
                    ],
                  ),
                  const SizedBox(height: 14),
                  // Actions
                  if (isPending)
                    Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        OutlinedButton.icon(
                          onPressed: () => widget.onRespond(m['id'], 'declined'),
                          icon: const Icon(Icons.close, size: 16),
                          label: const Text('Décliner'),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: Colors.grey,
                            side: const BorderSide(color: Colors.grey),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                        ),
                        const SizedBox(width: 8),
                        ElevatedButton.icon(
                          onPressed: () => widget.onRespond(m['id'], 'accepted'),
                          icon: const Icon(Icons.check, size: 16),
                          label: const Text('Accepter'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF10B981),
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                        ),
                      ],
                    ),
                  if (isAccepted)
                    ElevatedButton.icon(
                      onPressed: () {
                        Navigator.push(context, MaterialPageRoute(
                          builder: (_) => _PlanningChatScreen(
                            matchId: m['id'],
                            otherUserName: '${profile?['first_name'] ?? ''} ${profile?['last_name'] ?? ''}'.trim(),
                            otherUserCompany: profile?['company_name'] ?? '',
                            otherUserPhone: profile?['phone'] ?? '',
                            otherUserEmail: profile?['email'] ?? '',
                            otherPlanning: planning,
                          ),
                        ));
                      },
                      icon: const Icon(Icons.chat_bubble_rounded, size: 16),
                      label: const Text('Discuter'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF6366F1),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
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

  _MatchTypeInfo _matchTypeInfo(String type) {
    switch (type) {
      case 'same_route':
        return _MatchTypeInfo('Même trajet', Icons.route, const Color(0xFFD1FAE5), const Color(0xFF059669));
      case 'return_opportunity':
        return _MatchTypeInfo('Opportunité retour', Icons.replay, const Color(0xFFDBEAFE), const Color(0xFF2563EB));
      case 'nearby_route':
        return _MatchTypeInfo('Trajet proche', Icons.near_me, const Color(0xFFFEF3C7), const Color(0xFFD97706));
      default:
        return _MatchTypeInfo('Créneau compatible', Icons.access_time, const Color(0xFFF3E8FF), const Color(0xFF7C3AED));
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

class _MatchDetail extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  const _MatchDetail({required this.icon, required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 14, color: color),
        const SizedBox(width: 4),
        Text(label, style: TextStyle(fontSize: 12, color: Colors.grey.shade700)),
      ],
    );
  }
}

// ============================================================================
// CHAT SCREEN - Full-page chat between matched convoyeurs
// ============================================================================

class _PlanningChatScreen extends StatefulWidget {
  final String matchId;
  final String otherUserName;
  final String otherUserCompany;
  final String otherUserPhone;
  final String otherUserEmail;
  final Map<String, dynamic>? otherPlanning;

  const _PlanningChatScreen({
    required this.matchId,
    required this.otherUserName,
    required this.otherUserCompany,
    required this.otherUserPhone,
    required this.otherUserEmail,
    this.otherPlanning,
  });

  @override
  State<_PlanningChatScreen> createState() => _PlanningChatScreenState();
}

class _PlanningChatScreenState extends State<_PlanningChatScreen> {
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
        .from('planning_messages')
        .select('*')
        .eq('match_id', widget.matchId)
        .order('created_at', ascending: true);

    setState(() {
      _messages = List<Map<String, dynamic>>.from(res as List? ?? []);
      _loading = false;
    });

    // Mark as read
    await _supabase
        .from('planning_messages')
        .update({'is_read': true})
        .eq('match_id', widget.matchId)
        .neq('sender_id', _userId);

    _scrollToBottom();
  }

  void _subscribeRealtime() {
    _channel = _supabase
        .channel('chat-${widget.matchId}')
        .onPostgresChanges(
          event: PostgresChangeEvent.insert,
          schema: 'public',
          table: 'planning_messages',
          filter: PostgresChangeFilter(type: PostgresChangeFilterType.eq, column: 'match_id', value: widget.matchId),
          callback: (payload) {
            final msg = payload.newRecord;
            setState(() => _messages.add(msg));
            _scrollToBottom();
            // Mark as read
            if (msg['sender_id'] != _userId) {
              _supabase.from('planning_messages').update({'is_read': true}).eq('id', msg['id']);
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

    await _supabase.from('planning_messages').insert({
      'match_id': widget.matchId,
      'sender_id': _userId,
      'content': text,
    });
  }

  void _showContactInfo() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2))),
            ),
            const SizedBox(height: 20),
            Row(
              children: [
                CircleAvatar(
                  radius: 28,
                  backgroundColor: const Color(0xFF6366F1),
                  child: Text(
                    widget.otherUserName.isNotEmpty ? widget.otherUserName.split(' ').map((w) => w.isNotEmpty ? w[0] : '').take(2).join() : '?',
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18),
                  ),
                ),
                const SizedBox(width: 14),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(widget.otherUserName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                    if (widget.otherUserCompany.isNotEmpty)
                      Text(widget.otherUserCompany, style: const TextStyle(color: Colors.grey, fontSize: 14)),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 20),
            if (widget.otherUserPhone.isNotEmpty)
              ListTile(
                leading: const Icon(Icons.phone, color: Color(0xFF10B981)),
                title: Text(widget.otherUserPhone),
                subtitle: const Text('Téléphone'),
                contentPadding: EdgeInsets.zero,
                // tapping would require url_launcher, so we just display
              ),
            if (widget.otherUserEmail.isNotEmpty)
              ListTile(
                leading: const Icon(Icons.email, color: Color(0xFF3B82F6)),
                title: Text(widget.otherUserEmail),
                subtitle: const Text('Email'),
                contentPadding: EdgeInsets.zero,
              ),
            const SizedBox(height: 12),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final planning = widget.otherPlanning;

    return Scaffold(
      appBar: AppBar(
        backgroundColor: const Color(0xFF6366F1),
        foregroundColor: Colors.white,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(widget.otherUserName.isNotEmpty ? widget.otherUserName : 'Chat', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            if (widget.otherUserCompany.isNotEmpty)
              Text(widget.otherUserCompany, style: const TextStyle(fontSize: 12, color: Colors.white70)),
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
          // Planning context bar
          if (planning != null)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              color: const Color(0xFFEEF2FF),
              child: Row(
                children: [
                  const Icon(Icons.route, size: 14, color: Color(0xFF6366F1)),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      '${planning['origin_city'] ?? ''} → ${planning['destination_city'] ?? ''} • ${planning['planning_date'] != null ? DateFormat('d MMM', 'fr_FR').format(DateTime.parse(planning['planning_date'])) : ''}',
                      style: const TextStyle(fontSize: 12, color: Color(0xFF6366F1), fontWeight: FontWeight.w600),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ),

          // Messages
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator(color: Color(0xFF6366F1)))
                : _messages.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.chat_bubble_outline, size: 48, color: Colors.grey),
                            const SizedBox(height: 12),
                            Text('Démarrez la conversation avec\n${widget.otherUserName}',
                                textAlign: TextAlign.center, style: const TextStyle(color: Colors.grey)),
                            const SizedBox(height: 4),
                            const Text('Coordonnez votre trajet ensemble', style: TextStyle(color: Colors.grey, fontSize: 12)),
                          ],
                        ),
                      )
                    : ListView.builder(
                        controller: _scrollController,
                        padding: const EdgeInsets.all(16),
                        itemCount: _messages.length,
                        itemBuilder: (context, index) {
                          final msg = _messages[index];
                          final isMe = msg['sender_id'] == _userId;

                          return Padding(
                            padding: const EdgeInsets.only(bottom: 8),
                            child: Align(
                              alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
                              child: Container(
                                constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
                                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                                decoration: BoxDecoration(
                                  color: isMe ? const Color(0xFF6366F1) : Colors.white,
                                  borderRadius: BorderRadius.only(
                                    topLeft: const Radius.circular(16),
                                    topRight: const Radius.circular(16),
                                    bottomLeft: isMe ? const Radius.circular(16) : const Radius.circular(4),
                                    bottomRight: isMe ? const Radius.circular(4) : const Radius.circular(16),
                                  ),
                                  border: isMe ? null : Border.all(color: Colors.grey.shade200),
                                  boxShadow: [
                                    BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 3, offset: const Offset(0, 1)),
                                  ],
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  children: [
                                    Text(
                                      msg['content'] ?? '',
                                      style: TextStyle(color: isMe ? Colors.white : Colors.black87, fontSize: 14),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      _formatTime(msg['created_at']),
                                      style: TextStyle(color: isMe ? Colors.white60 : Colors.grey, fontSize: 10),
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
              border: Border(top: BorderSide(color: Colors.grey.shade200)),
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
                        hintStyle: const TextStyle(color: Colors.grey),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(24), borderSide: BorderSide(color: Colors.grey.shade300)),
                        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(24), borderSide: BorderSide(color: Colors.grey.shade300)),
                        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(24), borderSide: const BorderSide(color: Color(0xFF6366F1))),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
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
                      icon: const Icon(Icons.send_rounded, color: Colors.white, size: 20),
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
// NETWORK LIST TAB (replaces map for mobile)
// ============================================================================

class _NetworkListTab extends StatelessWidget {
  final List<Map<String, dynamic>> plannings;
  final String userId;

  const _NetworkListTab({required this.plannings, required this.userId});

  @override
  Widget build(BuildContext context) {
    if (plannings.isEmpty) {
      return const Center(child: Text('Aucun planning publié sur le réseau'));
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: plannings.length + 1, // +1 for legend
      itemBuilder: (context, index) {
        if (index == 0) {
          return Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: Colors.grey.shade200),
            ),
            child: Row(
              children: [
                const Text('Légende : ', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                const SizedBox(width: 8),
                Container(width: 10, height: 10, decoration: BoxDecoration(color: const Color(0xFF6366F1), borderRadius: BorderRadius.circular(5))),
                const SizedBox(width: 4),
                const Text('Mes trajets', style: TextStyle(fontSize: 12)),
                const SizedBox(width: 12),
                Container(width: 10, height: 10, decoration: BoxDecoration(color: const Color(0xFF10B981), borderRadius: BorderRadius.circular(5))),
                const SizedBox(width: 4),
                const Text('Autres', style: TextStyle(fontSize: 12)),
                const Spacer(),
                Text('${plannings.length} plannings', style: const TextStyle(fontSize: 11, color: Colors.grey)),
              ],
            ),
          );
        }

        final p = plannings[index - 1];
        final isMine = p['user_id'] == userId;

        return Card(
          margin: const EdgeInsets.only(bottom: 8),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
            side: BorderSide(color: isMine ? const Color(0xFF6366F1).withValues(alpha: 0.3) : Colors.grey.shade200),
          ),
          color: isMine ? const Color(0xFFEEF2FF) : Colors.white,
          child: ListTile(
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            leading: Container(
              width: 8, height: 40,
              decoration: BoxDecoration(
                color: isMine ? const Color(0xFF6366F1) : const Color(0xFF10B981),
                borderRadius: BorderRadius.circular(4),
              ),
            ),
            title: Text(
              '${p['origin_city'] ?? '?'} → ${p['destination_city'] ?? '?'}',
              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
            ),
            subtitle: Text(
              '${_formatDateShort(p['planning_date'])} · ${(p['start_time'] ?? '').toString().substring(0, 5)}',
              style: const TextStyle(fontSize: 12),
            ),
            trailing: isMine
                ? Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(color: const Color(0xFF6366F1), borderRadius: BorderRadius.circular(8)),
                    child: const Text('MOI', style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
                  )
                : null,
          ),
        );
      },
    );
  }

  String _formatDateShort(String? date) {
    if (date == null) return '';
    try {
      return DateFormat('d MMM', 'fr_FR').format(DateTime.parse(date));
    } catch (_) {
      return date;
    }
  }
}

// ============================================================================
// STATS TAB
// ============================================================================

class _StatsTab extends StatelessWidget {
  final Map<String, dynamic>? stats;
  const _StatsTab({required this.stats});

  @override
  Widget build(BuildContext context) {
    final kpis = [
      _KPI('Plannings publiés', '${stats?['plannings_published'] ?? 0}', Icons.calendar_today, const Color(0xFF6366F1)),
      _KPI('Matchs trouvés', '${stats?['matches_found'] ?? 0}', Icons.bolt, const Color(0xFFF59E0B)),
      _KPI('Matchs acceptés', '${stats?['matches_accepted'] ?? 0}', Icons.check_circle, const Color(0xFF10B981)),
      _KPI('KM économisés', '${(stats?['km_saved'] ?? 0).round()} km', Icons.route, const Color(0xFF3B82F6)),
      _KPI('Heures gagnées', '${(stats?['hours_saved'] ?? 0).toStringAsFixed(1)} h', Icons.access_time, const Color(0xFF8B5CF6)),
      _KPI('Trajets vides évités', '${stats?['empty_trips_avoided'] ?? 0}', Icons.block, const Color(0xFF14B8A6)),
      _KPI('CO₂ économisé', '${(stats?['co2_saved_kg'] ?? 0).toStringAsFixed(1)} kg', Icons.eco, const Color(0xFF22C55E)),
    ];

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // KPI Grid
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2, mainAxisSpacing: 12, crossAxisSpacing: 12, childAspectRatio: 1.5,
          ),
          itemCount: kpis.length,
          itemBuilder: (context, index) {
            final kpi = kpis[index];
            return Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.grey.shade200),
                boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 8, offset: const Offset(0, 2))],
              ),
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(color: kpi.color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(10)),
                    child: Icon(kpi.icon, size: 18, color: kpi.color),
                  ),
                  const Spacer(),
                  Text(kpi.value, style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: Colors.grey.shade800)),
                  Text(kpi.label, style: const TextStyle(fontSize: 11, color: Colors.grey)),
                ],
              ),
            );
          },
        ),
        const SizedBox(height: 20),
        // Environmental impact card
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            gradient: const LinearGradient(colors: [Color(0xFF10B981), Color(0xFF14B8A6)]),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                children: [
                  Icon(Icons.eco, color: Colors.white, size: 24),
                  SizedBox(width: 8),
                  Text('Impact environnemental', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w900)),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  _ImpactCard('${(stats?['co2_saved_kg'] ?? 0).toStringAsFixed(1)}', 'kg CO₂ évités'),
                  _ImpactCard('${(stats?['km_saved'] ?? 0).round()}', 'km inutiles'),
                  _ImpactCard('${stats?['empty_trips_avoided'] ?? 0}', 'trajets vides'),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),
        // Legal disclaimer
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.grey.shade50,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Colors.grey.shade200),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(Icons.info_outline, color: Color(0xFF3B82F6), size: 20),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  'Ce service est limité à la coordination de planning entre convoyeurs. '
                  'Aucun transport, paiement ou responsabilité légale n\'est impliqué.',
                  style: TextStyle(fontSize: 12, color: Colors.grey.shade600, height: 1.4),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _KPI {
  final String label;
  final String value;
  final IconData icon;
  final Color color;
  _KPI(this.label, this.value, this.icon, this.color);
}

class _ImpactCard extends StatelessWidget {
  final String value;
  final String label;
  const _ImpactCard(this.value, this.label);

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 4),
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.2),
          borderRadius: BorderRadius.circular(14),
        ),
        child: Column(
          children: [
            Text(value, style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w900)),
            const SizedBox(height: 2),
            Text(label, style: const TextStyle(color: Colors.white70, fontSize: 10), textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }
}

// ============================================================================
// DETAIL CHIP
// ============================================================================

class _DetailChip extends StatelessWidget {
  final IconData icon;
  final String text;
  const _DetailChip({required this.icon, required this.text});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 13, color: Colors.grey),
        const SizedBox(width: 4),
        Text(text, style: const TextStyle(fontSize: 12, color: Colors.grey)),
      ],
    );
  }
}

// ============================================================================
// ACTION CHIP
// ============================================================================

class _ActionChip extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;
  const _ActionChip({required this.icon, required this.label, required this.color, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 14, color: color),
            const SizedBox(width: 4),
            Text(label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: color)),
          ],
        ),
      ),
    );
  }
}

// ============================================================================
// CREATE PLANNING SCREEN
// ============================================================================

class _CreatePlanningScreen extends StatefulWidget {
  final String userId;
  final Future<void> Function(String) onCreated;

  const _CreatePlanningScreen({required this.userId, required this.onCreated});

  @override
  State<_CreatePlanningScreen> createState() => _CreatePlanningScreenState();
}

class _CreatePlanningScreenState extends State<_CreatePlanningScreen> {
  final _supabase = Supabase.instance.client;
  final _formKey = GlobalKey<FormState>();
  
  String _title = '';
  DateTime _date = DateTime.now();
  TimeOfDay _startTime = const TimeOfDay(hour: 8, minute: 0);
  TimeOfDay _endTime = const TimeOfDay(hour: 18, minute: 0);
  int _flexibility = 30;
  String _originCity = '';
  double? _originLat, _originLng;
  String? _originPostalCode;
  String _destCity = '';
  double? _destLat, _destLng;
  String? _destPostalCode;
  bool _isReturnTrip = false;
  String _vehicleCategory = 'all';
  String _notes = '';
  bool _saving = false;

  List<Map<String, dynamic>> _originSuggestions = [];
  List<Map<String, dynamic>> _destSuggestions = [];
  bool _showOriginDropdown = false;
  bool _showDestDropdown = false;

  Future<List<Map<String, dynamic>>> _geocode(String query) async {
    if (query.length < 2) return [];
    try {
      final res = await http.get(Uri.parse('https://api-adresse.data.gouv.fr/search/?q=${Uri.encodeComponent(query)}&type=municipality&limit=5'));
      final data = json.decode(res.body);
      return (data['features'] as List? ?? []).map<Map<String, dynamic>>((f) => {
        'label': '${f['properties']['label']} (${f['properties']['postcode']})',
        'city': f['properties']['city'] ?? f['properties']['label'],
        'postcode': f['properties']['postcode'] ?? '',
        'lat': f['geometry']['coordinates'][1],
        'lng': f['geometry']['coordinates'][0],
      }).toList();
    } catch (e) {
      return [];
    }
  }

  Future<void> _submit() async {
    if (_originCity.isEmpty || _destCity.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Veuillez renseigner les villes de départ et d\'arrivée')),
      );
      return;
    }

    setState(() => _saving = true);

    try {
      // Auto-geocode if needed
      if (_originLat == null) {
        final geo = await _geocode(_originCity);
        if (geo.isNotEmpty) {
          _originLat = geo[0]['lat'];
          _originLng = geo[0]['lng'];
          _originPostalCode = geo[0]['postcode'];
        }
      }
      if (_destLat == null) {
        final geo = await _geocode(_destCity);
        if (geo.isNotEmpty) {
          _destLat = geo[0]['lat'];
          _destLng = geo[0]['lng'];
          _destPostalCode = geo[0]['postcode'];
        }
      }

      final startStr = '${_startTime.hour.toString().padLeft(2, '0')}:${_startTime.minute.toString().padLeft(2, '0')}';
      final endStr = '${_endTime.hour.toString().padLeft(2, '0')}:${_endTime.minute.toString().padLeft(2, '0')}';

      final result = await _supabase.from('convoy_plannings').insert({
        'user_id': widget.userId,
        'title': _title.isNotEmpty ? _title : '$_originCity → $_destCity',
        'planning_date': DateFormat('yyyy-MM-dd').format(_date),
        'start_time': startStr,
        'end_time': endStr,
        'flexibility_minutes': _flexibility,
        'origin_city': _originCity,
        'origin_postal_code': _originPostalCode,
        'origin_lat': _originLat,
        'origin_lng': _originLng,
        'destination_city': _destCity,
        'destination_postal_code': _destPostalCode,
        'destination_lat': _destLat,
        'destination_lng': _destLng,
        'is_return_trip': _isReturnTrip,
        'vehicle_category': _vehicleCategory,
        'notes': _notes.isNotEmpty ? _notes : null,
        'status': 'published',
      }).select('id').single();

      await _supabase.rpc('upsert_planning_stats', params: {
        'p_user_id': widget.userId,
        'p_km_saved': 0.0,
        'p_hours_saved': 0.0,
        'p_match_accepted': false,
      });

      await widget.onCreated(result['id']);
    } catch (e) {
      debugPrint('Error creating planning: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur: $e'), backgroundColor: Colors.red),
        );
      }
    }

    if (mounted) setState(() => _saving = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Nouveau planning', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: const Color(0xFF6366F1),
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Title
              _buildLabel('Titre (optionnel)'),
              TextFormField(
                onChanged: (v) => _title = v,
                decoration: _inputDecoration('Ex: Convoyage Paris → Lyon'),
              ),
              const SizedBox(height: 18),

              // Date
              _buildLabel('Date'),
              InkWell(
                onTap: () async {
                  final picked = await showDatePicker(
                    context: context,
                    initialDate: _date,
                    firstDate: DateTime.now(),
                    lastDate: DateTime.now().add(const Duration(days: 365)),
                  );
                  if (picked != null) setState(() => _date = picked);
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: Colors.grey.shade300),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.calendar_today, size: 18, color: Color(0xFF6366F1)),
                      const SizedBox(width: 10),
                      Text(DateFormat('EEEE d MMMM yyyy', 'fr_FR').format(_date),
                          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 18),

              // Times
              Row(
                children: [
                  Expanded(child: _buildTimePicker('Début', _startTime, (t) => setState(() => _startTime = t))),
                  const SizedBox(width: 12),
                  Expanded(child: _buildTimePicker('Fin', _endTime, (t) => setState(() => _endTime = t))),
                ],
              ),
              const SizedBox(height: 18),

              // Origin
              _buildLabel('Ville de départ *'),
              _buildCityField(
                value: _originCity,
                hasGeo: _originLat != null,
                suggestions: _originSuggestions,
                showDropdown: _showOriginDropdown,
                onChanged: (v) async {
                  _originCity = v;
                  _originLat = null; _originLng = null;
                  final results = await _geocode(v);
                  setState(() { _originSuggestions = results; _showOriginDropdown = results.isNotEmpty; });
                },
                onSelect: (s) {
                  setState(() {
                    _originCity = s['city'];
                    _originPostalCode = s['postcode'];
                    _originLat = s['lat'];
                    _originLng = s['lng'];
                    _showOriginDropdown = false;
                  });
                },
              ),
              const SizedBox(height: 18),

              // Destination
              _buildLabel('Ville d\'arrivée *'),
              _buildCityField(
                value: _destCity,
                hasGeo: _destLat != null,
                suggestions: _destSuggestions,
                showDropdown: _showDestDropdown,
                onChanged: (v) async {
                  _destCity = v;
                  _destLat = null; _destLng = null;
                  final results = await _geocode(v);
                  setState(() { _destSuggestions = results; _showDestDropdown = results.isNotEmpty; });
                },
                onSelect: (s) {
                  setState(() {
                    _destCity = s['city'];
                    _destPostalCode = s['postcode'];
                    _destLat = s['lat'];
                    _destLng = s['lng'];
                    _showDestDropdown = false;
                  });
                },
              ),
              const SizedBox(height: 18),

              // Flexibility
              _buildLabel('Flexibilité horaire'),
              DropdownButtonFormField<int>(
                value: _flexibility,
                items: const [
                  DropdownMenuItem(value: 0, child: Text('Horaire fixe')),
                  DropdownMenuItem(value: 15, child: Text('± 15 min')),
                  DropdownMenuItem(value: 30, child: Text('± 30 min')),
                  DropdownMenuItem(value: 60, child: Text('± 1 heure')),
                  DropdownMenuItem(value: 120, child: Text('± 2 heures')),
                ],
                onChanged: (v) => setState(() => _flexibility = v ?? 30),
                decoration: _inputDecoration(null),
              ),
              const SizedBox(height: 18),

              // Vehicle category
              _buildLabel('Type de véhicule'),
              DropdownButtonFormField<String>(
                value: _vehicleCategory,
                items: const [
                  DropdownMenuItem(value: 'all', child: Text('Tous véhicules')),
                  DropdownMenuItem(value: 'car', child: Text('Voiture')),
                  DropdownMenuItem(value: 'utility', child: Text('Utilitaire')),
                  DropdownMenuItem(value: 'truck', child: Text('Poids lourd')),
                  DropdownMenuItem(value: 'motorcycle', child: Text('Moto')),
                ],
                onChanged: (v) => setState(() => _vehicleCategory = v ?? 'all'),
                decoration: _inputDecoration(null),
              ),
              const SizedBox(height: 18),

              // Return trip toggle
              SwitchListTile(
                title: const Text('Trajet retour (je reviens à vide)', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
                value: _isReturnTrip,
                activeColor: const Color(0xFF6366F1),
                onChanged: (v) => setState(() => _isReturnTrip = v),
                contentPadding: EdgeInsets.zero,
              ),
              const SizedBox(height: 8),

              // Notes
              _buildLabel('Notes'),
              TextFormField(
                onChanged: (v) => _notes = v,
                maxLines: 3,
                decoration: _inputDecoration('Informations complémentaires...'),
              ),
              const SizedBox(height: 24),

              // Submit
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: _saving ? null : _submit,
                  icon: _saving
                      ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Icon(Icons.share),
                  label: Text(_saving ? 'Publication...' : 'Publier le planning',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF6366F1),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    elevation: 4,
                  ),
                ),
              ),
              const SizedBox(height: 40),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildLabel(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Text(text, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF374151))),
    );
  }

  InputDecoration _inputDecoration(String? hint) {
    return InputDecoration(
      hintText: hint,
      filled: true,
      fillColor: Colors.grey.shade50,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide(color: Colors.grey.shade300)),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide(color: Colors.grey.shade300)),
      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: Color(0xFF6366F1), width: 2)),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    );
  }

  Widget _buildTimePicker(String label, TimeOfDay time, ValueChanged<TimeOfDay> onChanged) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildLabel(label),
        InkWell(
          onTap: () async {
            final picked = await showTimePicker(context: context, initialTime: time);
            if (picked != null) onChanged(picked);
          },
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: Colors.grey.shade300),
              color: Colors.grey.shade50,
            ),
            child: Row(
              children: [
                const Icon(Icons.access_time, size: 18, color: Color(0xFF6366F1)),
                const SizedBox(width: 10),
                Text('${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}',
                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildCityField({
    required String value,
    required bool hasGeo,
    required List<Map<String, dynamic>> suggestions,
    required bool showDropdown,
    required ValueChanged<String> onChanged,
    required ValueChanged<Map<String, dynamic>> onSelect,
  }) {
    return Column(
      children: [
        TextFormField(
          initialValue: value.isEmpty ? null : value,
          onChanged: onChanged,
          decoration: _inputDecoration('Tapez une ville...').copyWith(
            prefixIcon: Icon(Icons.place, color: hasGeo ? const Color(0xFF10B981) : Colors.grey, size: 20),
            suffixIcon: hasGeo ? const Icon(Icons.check_circle, color: Color(0xFF10B981), size: 20) : null,
          ),
        ),
        if (showDropdown && suggestions.isNotEmpty)
          Container(
            margin: const EdgeInsets.only(top: 4),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.grey.shade200),
              boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 8)],
            ),
            child: Column(
              children: suggestions.map((s) => ListTile(
                dense: true,
                title: Text(s['label'], style: const TextStyle(fontSize: 13)),
                onTap: () => onSelect(s),
              )).toList(),
            ),
          ),
      ],
    );
  }
}
