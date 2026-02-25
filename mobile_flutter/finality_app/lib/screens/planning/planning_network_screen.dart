// ===========================================================================
// PlanningNetworkScreen — Hub Réseau Planning
//
// Philosophie : un convoyeur a UNE vraie question après chaque livraison :
//   "Comment je rentre ?"
//
// Cet écran répond à ça en 2 secondes.
// Il ne remplace pas BlaBlaCar — il s'intègre dans le workflow mission.
//
// Structure :
//   - Bandeau "Trouver un lift" (CTA principal)
//   - Mes offres actives (auto-créées depuis les missions)
//   - Mes matchs en cours (conducteur ou passager)
//   - Mes demandes en attente
// ===========================================================================

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'retour_lift_screen.dart';
import '_offer_publish_sheet.dart';
import '_match_chat_sheet.dart';

// ── Couleurs ──────────────────────────────────────────────────────────────────

const _kTeal   = Color(0xFF0D9488);
const _kTealBg = Color(0xFFE6FFFA);
const _kAmber  = Color(0xFFF59E0B);
const _kGreen  = Color(0xFF10B981);
const _kRed    = Color(0xFFEF4444);
const _kBlue   = Color(0xFF3B82F6);
const _kDark   = Color(0xFF0F172A);
const _kGray   = Color(0xFF64748B);
const _kBorder = Color(0xFFE2E8F0);
const _kScaffold = Color(0xFFF8FAFC);

// ── Helpers ───────────────────────────────────────────────────────────────────

String _fmt(String? d) {
  if (d == null) return '';
  try {
    final dt = DateTime.parse(d);
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final diff = DateTime(dt.year, dt.month, dt.day).difference(today).inDays;
    if (diff == 0) return "Aujourd'hui";
    if (diff == 1) return 'Demain';
    if (diff == -1) return 'Hier';
    return DateFormat('EEE d MMM', 'fr_FR').format(dt);
  } catch (_) { return d; }
}

const _matchStatusCfg = {
  'proposed':   (label: '⏳ En attente', bg: Color(0xFFFEF3C7), fg: Color(0xFFD97706)),
  'accepted':   (label: '✅ Confirmé',   bg: Color(0xFFD1FAE5), fg: Color(0xFF059669)),
  'in_transit': (label: '🚗 En route',   bg: Color(0xFFDBEAFE), fg: Color(0xFF2563EB)),
  'completed':  (label: '🏁 Terminé',   bg: Color(0xFFEDE9FE), fg: Color(0xFF7C3AED)),
  'declined':   (label: '❌ Refusé',     bg: Color(0xFFFEE2E2), fg: Color(0xFFDC2626)),
  'cancelled':  (label: '🚫 Annulé',    bg: Color(0xFFF3F4F6), fg: Color(0xFF6B7280)),
};

// ── Screen ────────────────────────────────────────────────────────────────────

class PlanningNetworkScreen extends StatefulWidget {
  const PlanningNetworkScreen({super.key});

  @override
  State<PlanningNetworkScreen> createState() => _PlanningNetworkScreenState();
}

class _PlanningNetworkScreenState extends State<PlanningNetworkScreen> {
  final _sb = Supabase.instance.client;

  List<Map<String, dynamic>> _myOffers   = [];
  List<Map<String, dynamic>> _myMatches  = [];
  List<Map<String, dynamic>> _myRequests = [];
  bool _loading = true;

  String get _uid => _sb.auth.currentUser?.id ?? '';

  @override
  void initState() {
    super.initState();
    _load();
    _subscribeRealtime();
  }

  RealtimeChannel? _channel;

  void _subscribeRealtime() {
    _channel = _sb.channel('planning_hub')
      ..onPostgresChanges(
        event: PostgresChangeEvent.all,
        schema: 'public',
        table: 'ride_matches',
        callback: (_) => _load(),
      )
      ..subscribe();
  }

  @override
  void dispose() {
    _channel?.unsubscribe();
    super.dispose();
  }

  Future<void> _load() async {
    if (_uid.isEmpty) return;
    setState(() => _loading = true);
    try {
      final results = await Future.wait([
        // Mes offres actives
        _sb.from('ride_offers')
           .select('*')
           .eq('user_id', _uid)
           .inFilter('status', ['active', 'en_route'])
           .gte('departure_date', DateFormat('yyyy-MM-dd').format(DateTime.now()))
           .order('departure_date'),
        // Mes matchs (conducteur ou passager)
        _sb.from('ride_matches')
           .select('*, ride_offers(*), ride_requests(*)')
           .or('driver_id.eq.$_uid,passenger_id.eq.$_uid')
           .inFilter('status', ['proposed', 'accepted', 'in_transit'])
           .order('created_at', ascending: false),
        // Mes demandes actives
        _sb.from('ride_requests')
           .select('*')
           .eq('user_id', _uid)
           .eq('status', 'active')
           .gte('needed_date', DateFormat('yyyy-MM-dd').format(DateTime.now()))
           .order('needed_date'),
      ]);
      if (!mounted) return;
      setState(() {
        _myOffers   = List<Map<String, dynamic>>.from(results[0]);
        _myMatches  = List<Map<String, dynamic>>.from(results[1]);
        _myRequests = List<Map<String, dynamic>>.from(results[2]);
        _loading    = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  // ── Build ──────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _kScaffold,
      body: RefreshIndicator(
        color: _kTeal,
        onRefresh: _load,
        child: CustomScrollView(
          slivers: [
            _buildAppBar(),
            SliverToBoxAdapter(child: _buildCTA()),
            if (_myMatches.isNotEmpty) ...[
              _buildSection('Matchs en cours', Icons.handshake_outlined, _kBlue,
                  _myMatches.map((m) => _MatchTile(
                    match: m,
                    myUid: _uid,
                    onTap: () => _openChat(m),
                    onAccept: m['driver_id'] == _uid && m['status'] == 'proposed'
                        ? () => _updateMatch(m['id'], 'accepted')
                        : null,
                    onDecline: m['driver_id'] == _uid && m['status'] == 'proposed'
                        ? () => _updateMatch(m['id'], 'declined')
                        : null,
                  )).toList()),
            ],
            if (_myOffers.isNotEmpty)
              _buildSection('Mes offres actives', Icons.directions_car, _kTeal,
                  _myOffers.map((o) => _OfferTile(
                    offer: o,
                    onCancel: () => _cancelOffer(o['id']),
                  )).toList()),
            if (_myRequests.isNotEmpty)
              _buildSection('Mes demandes de lift', Icons.hail, _kAmber,
                  _myRequests.map((r) => _RequestTile(
                    request: r,
                    onCancel: () => _cancelRequest(r['id']),
                    onSearch: () => _openLiftSearch(fromCity: r['pickup_city'], toCity: r['destination_city']),
                  )).toList()),
            if (!_loading && _myMatches.isEmpty && _myOffers.isEmpty && _myRequests.isEmpty)
              SliverFillRemaining(
                hasScrollBody: false,
                child: _EmptyHub(onSearch: () => _openLiftSearch()),
              ),
            const SliverToBoxAdapter(child: SizedBox(height: 24)),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _publishOffer,
        backgroundColor: _kTeal,
        icon: const Icon(Icons.add),
        label: const Text('Publier une offre'),
      ),
    );
  }

  // ── AppBar ─────────────────────────────────────────────────────────────────

  SliverAppBar _buildAppBar() {
    return SliverAppBar(
      expandedHeight: 110,
      pinned: true,
      backgroundColor: _kTeal,
      foregroundColor: Colors.white,
      actions: [
        IconButton(
          icon: const Icon(Icons.refresh_rounded),
          onPressed: _load,
          tooltip: 'Actualiser',
        ),
      ],
      flexibleSpace: FlexibleSpaceBar(
        background: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [Color(0xFF0D9488), Color(0xFF0891B2)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
          child: SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 14),
              child: Align(
                alignment: Alignment.bottomLeft,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: const [
                    Text('Réseau Lifts', style: TextStyle(
                        color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold)),
                    SizedBox(height: 2),
                    Text('Convoyeurs qui se rendent service',
                        style: TextStyle(color: Colors.white70, fontSize: 13)),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  // ── CTA principal ──────────────────────────────────────────────────────────

  Widget _buildCTA() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
      child: GestureDetector(
        onTap: () => _openLiftSearch(),
        child: Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF0D9488), Color(0xFF0891B2)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(18),
            boxShadow: [
              BoxShadow(
                color: _kTeal.withOpacity(0.3),
                blurRadius: 12,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: const Text('🚗', style: TextStyle(fontSize: 28)),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: const [
                    Text('Tu viens de livrer ?',
                        style: TextStyle(color: Colors.white,
                            fontSize: 16, fontWeight: FontWeight.bold)),
                    SizedBox(height: 3),
                    Text('Trouve un convoyeur qui passe par ta ville',
                        style: TextStyle(color: Colors.white70, fontSize: 13)),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: const Text('Chercher',
                    style: TextStyle(color: _kTeal,
                        fontWeight: FontWeight.bold, fontSize: 13)),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ── Section helper ──────────────────────────────────────────────────────────

  SliverList _buildSection(String title, IconData icon, Color color, List<Widget> items) {
    return SliverList(
      delegate: SliverChildListDelegate([
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
          child: Row(
            children: [
              Icon(icon, size: 18, color: color),
              const SizedBox(width: 8),
              Text(title,
                  style: const TextStyle(
                      fontSize: 15, fontWeight: FontWeight.bold, color: _kDark)),
            ],
          ),
        ),
        ...items,
      ]),
    );
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  void _openLiftSearch({String? fromCity, String? toCity}) {
    Navigator.push(context, MaterialPageRoute(
      builder: (_) => RetourLiftScreen(fromCity: fromCity, toCity: toCity),
    ));
  }

  void _openChat(Map<String, dynamic> match) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => MatchChatSheet(match: match, myUid: _uid),
    );
  }

  Future<void> _updateMatch(String matchId, String status) async {
    await _sb.from('ride_matches').update({'status': status}).eq('id', matchId);
    _load();
  }

  Future<void> _cancelOffer(String offerId) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Retirer l\'offre ?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Non')),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: FilledButton.styleFrom(backgroundColor: _kRed),
            child: const Text('Retirer'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    await _sb.from('ride_offers').update({'status': 'cancelled'}).eq('id', offerId);
    _load();
  }

  Future<void> _cancelRequest(String requestId) async {
    await _sb.from('ride_requests').update({'status': 'cancelled'}).eq('id', requestId);
    _load();
  }

  void _publishOffer() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => OfferPublishSheet(
        onPublished: _load,
        userId: _uid,
      ),
    );
  }
}

// ── Tuile Match ───────────────────────────────────────────────────────────────

class _MatchTile extends StatelessWidget {
  final Map<String, dynamic> match;
  final String myUid;
  final VoidCallback onTap;
  final VoidCallback? onAccept;
  final VoidCallback? onDecline;

  const _MatchTile({
    required this.match,
    required this.myUid,
    required this.onTap,
    this.onAccept,
    this.onDecline,
  });

  @override
  Widget build(BuildContext context) {
    final status = match['status'] as String? ?? 'proposed';
    final cfg = _matchStatusCfg[status]
        ?? (label: status, bg: const Color(0xFFF3F4F6), fg: _kGray);
    final isDriver    = match['driver_id'] == myUid;
    final pickup      = match['pickup_city']  as String? ?? '—';
    final dropoff     = match['dropoff_city'] as String? ?? '—';
    final offer       = (match['ride_offers'] as Map?) ?? {};
    final depDate     = offer['departure_date'] as String?;
    final depTime     = (offer['departure_time'] as String? ?? '').replaceAll(RegExp(r':\d{2}$'), '');

    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.fromLTRB(16, 0, 16, 10),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: _kBorder),
          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 6)],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
                  decoration: BoxDecoration(
                    color: cfg.bg,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(cfg.label,
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: cfg.fg)),
                ),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
                  decoration: BoxDecoration(
                    color: isDriver ? _kTealBg : const Color(0xFFEFF6FF),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    isDriver ? '🚗 Je conduis' : '🧍 Je suis passager',
                    style: TextStyle(
                        fontSize: 11, fontWeight: FontWeight.w600,
                        color: isDriver ? _kTeal : _kBlue),
                  ),
                ),
                const Spacer(),
                const Icon(Icons.chat_bubble_outline, size: 18, color: _kGray),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                const Icon(Icons.trip_origin, size: 13, color: _kTeal),
                const SizedBox(width: 6),
                Text(pickup, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                  child: const Icon(Icons.arrow_forward, size: 13, color: _kGray),
                ),
                const Icon(Icons.location_on, size: 13, color: _kRed),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(dropoff,
                      style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                      overflow: TextOverflow.ellipsis),
                ),
                if (depDate != null || depTime.isNotEmpty)
                  Text(
                    '${_fmt(depDate)}${depTime.isNotEmpty ? " $depTime" : ""}',
                    style: const TextStyle(fontSize: 12, color: _kGray),
                  ),
              ],
            ),
            if (onAccept != null || onDecline != null) ...[
              const SizedBox(height: 10),
              Row(
                children: [
                  if (onDecline != null)
                    Expanded(
                      child: OutlinedButton(
                        onPressed: onDecline,
                        style: OutlinedButton.styleFrom(
                          foregroundColor: _kRed,
                          side: const BorderSide(color: _kRed),
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        child: const Text('Refuser'),
                      ),
                    ),
                  if (onAccept != null && onDecline != null)
                    const SizedBox(width: 8),
                  if (onAccept != null)
                    Expanded(
                      child: FilledButton(
                        onPressed: onAccept,
                        style: FilledButton.styleFrom(
                          backgroundColor: _kGreen,
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        child: const Text('Accepter'),
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
}

// ── Tuile Offre ────────────────────────────────────────────────────────────────

class _OfferTile extends StatelessWidget {
  final Map<String, dynamic> offer;
  final VoidCallback onCancel;

  const _OfferTile({required this.offer, required this.onCancel});

  @override
  Widget build(BuildContext context) {
    final origin  = offer['origin_city']      as String? ?? '—';
    final dest    = offer['destination_city'] as String? ?? '—';
    final depDate = offer['departure_date']   as String?;
    final depTime = (offer['departure_time']  as String? ?? '').replaceAll(RegExp(r':\d{2}$'), '');
    final seats   = (offer['seats_available'] as num?)?.toInt() ?? 1;
    final missionLinkage = offer['mission_id'] != null;

    return Container(
      margin: const EdgeInsets.fromLTRB(16, 0, 16, 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: _kBorder),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 6)],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: _kTealBg,
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(Icons.directions_car, color: _kTeal, size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text('$origin → $dest',
                        style: const TextStyle(
                            fontWeight: FontWeight.bold, fontSize: 14, color: _kDark)),
                    if (missionLinkage) ...[
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: _kTealBg,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: const Text('auto', style: TextStyle(fontSize: 10, color: _kTeal)),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 3),
                Text(
                  '${_fmt(depDate)}${depTime.isNotEmpty ? " à $depTime" : ""} · $seats place${seats > 1 ? "s" : ""}',
                  style: const TextStyle(fontSize: 12, color: _kGray),
                ),
              ],
            ),
          ),
          IconButton(
            onPressed: onCancel,
            icon: const Icon(Icons.close, size: 18, color: _kGray),
            tooltip: 'Retirer',
          ),
        ],
      ),
    );
  }
}

// ── Tuile Demande ──────────────────────────────────────────────────────────────

class _RequestTile extends StatelessWidget {
  final Map<String, dynamic> request;
  final VoidCallback onCancel;
  final VoidCallback onSearch;

  const _RequestTile({
    required this.request,
    required this.onCancel,
    required this.onSearch,
  });

  @override
  Widget build(BuildContext context) {
    final pickup  = request['pickup_city']     as String? ?? '—';
    final dest    = request['destination_city'] as String? ?? '—';
    final date    = request['needed_date']     as String?;

    return Container(
      margin: const EdgeInsets.fromLTRB(16, 0, 16, 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: _kBorder),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: const Color(0xFFFEF3C7),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(Icons.hail, color: _kAmber, size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('$pickup → $dest',
                    style: const TextStyle(
                        fontWeight: FontWeight.bold, fontSize: 14, color: _kDark)),
                const SizedBox(height: 3),
                Text(_fmt(date), style: const TextStyle(fontSize: 12, color: _kGray)),
              ],
            ),
          ),
          TextButton(
            onPressed: onSearch,
            child: const Text('Chercher', style: TextStyle(color: _kTeal, fontSize: 13)),
          ),
          IconButton(
            onPressed: onCancel,
            icon: const Icon(Icons.close, size: 18, color: _kGray),
          ),
        ],
      ),
    );
  }
}

// ── État vide ──────────────────────────────────────────────────────────────────

class _EmptyHub extends StatelessWidget {
  final VoidCallback onSearch;
  const _EmptyHub({required this.onSearch});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 80, height: 80,
            decoration: BoxDecoration(
              color: _kTealBg,
              borderRadius: BorderRadius.circular(40),
            ),
            child: const Center(
              child: Text('🚗', style: TextStyle(fontSize: 36)),
            ),
          ),
          const SizedBox(height: 20),
          const Text('Tout est calme pour l\'instant',
              style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: _kDark)),
          const SizedBox(height: 8),
          const Text(
            'Tes offres et demandes de lift\napparaîtront ici.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 14, color: _kGray, height: 1.5),
          ),
          const SizedBox(height: 24),
          FilledButton.icon(
            onPressed: onSearch,
            icon: const Icon(Icons.search),
            label: const Text('Chercher un lift maintenant'),
            style: FilledButton.styleFrom(
              backgroundColor: _kTeal,
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            ),
          ),
        ],
      ),
    );
  }
}
