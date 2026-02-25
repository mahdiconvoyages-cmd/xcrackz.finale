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
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'retour_lift_screen.dart';
import '_offer_publish_sheet.dart';
import '_match_chat_sheet.dart';
import '../../services/lift_notification_service.dart';
import '../../services/ride_tracking_service.dart';

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
  final _liftNotif = LiftNotificationService();
  final _tracking = RideTrackingService();

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
    _liftNotif.initialize();
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
    _liftNotif.dispose();
    _tracking.dispose();
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
        // Mes demandes actives (incluant urgentes)
        _sb.from('ride_requests')
           .select('*')
           .eq('user_id', _uid)
           .inFilter('status', ['active', 'urgent'])
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
    final bottomPad = MediaQuery.of(context).padding.bottom;
    return Scaffold(
      backgroundColor: _kScaffold,
      body: RefreshIndicator(
        color: _kTeal,
        onRefresh: _load,
        child: CustomScrollView(
          slivers: [
            _buildAppBar(),
            if (_loading)
              const SliverToBoxAdapter(
                child: Padding(
                  padding: EdgeInsets.only(top: 40),
                  child: Center(child: CircularProgressIndicator(color: _kTeal)),
                ),
              ),
            if (!_loading) SliverToBoxAdapter(child: _buildCTA()),
            if (!_loading && _myMatches.isNotEmpty) ...[
              _buildSection('Matchs en cours', Icons.handshake_outlined, _kBlue,
                  _myMatches.map((m) => _MatchTile(
                    match: m,
                    myUid: _uid,
                    onTap: () => _openChat(m),
                    onAccept: m['driver_id'] == _uid && m['status'] == 'proposed'
                        ? () => _updateMatch(m['id'], 'accepted', match: m)
                        : null,
                    onDecline: m['driver_id'] == _uid && m['status'] == 'proposed'
                        ? () => _updateMatch(m['id'], 'declined', match: m)
                        : null,
                    onStartTransit: m['driver_id'] == _uid && m['status'] == 'accepted'
                        ? () => _startTransit(m)
                        : null,
                    onCancelAccepted: m['driver_id'] == _uid && m['status'] == 'accepted'
                        ? () => _cancelAcceptedMatch(m)
                        : null,
                    onMarkCompleted: m['status'] == 'in_transit'
                        ? () => _completeTransit(m)
                        : null,
                  )).toList()),
            ],
            if (!_loading && _myOffers.isNotEmpty)
              _buildSection('Mes offres actives', Icons.directions_car, _kTeal,
                  _myOffers.map((o) => _OfferTile(
                    offer: o,
                    onCancel: () => _cancelOffer(o['id']),
                  )).toList()),
            if (!_loading && _myRequests.isNotEmpty)
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
            // Extra padding so last item is not hidden behind FAB + Samsung nav bar
            SliverToBoxAdapter(child: SizedBox(height: 80 + bottomPad)),
          ],
        ),
      ),
      floatingActionButton: Padding(
        padding: EdgeInsets.only(bottom: bottomPad > 0 ? bottomPad - 8 : 0),
        child: FloatingActionButton.extended(
          onPressed: _publishOffer,
          backgroundColor: _kTeal,
          icon: const Icon(Icons.add),
          label: const Text('Publier une offre'),
        ),
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerFloat,
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

  // ── GPS Tracking : démarrer / terminer le trajet ────────────────────────

  Future<void> _startTransit(Map<String, dynamic> match) async {
    HapticFeedback.heavyImpact();
    final matchId = match['id'] as String;
    final passengerId = match['passenger_id'] as String?;
    final pickup = match['pickup_city'] as String? ?? '';
    final dropoff = match['dropoff_city'] as String? ?? '';

    // Démarrer le tracking GPS
    final ok = await _tracking.startTracking(matchId);
    if (!ok && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Active la localisation pour partager ta position'),
          backgroundColor: _kRed,
        ),
      );
      return;
    }

    // Mettre à jour le statut en DB
    await _sb.from('ride_matches').update({
      'status': 'in_transit',
      'started_at': DateTime.now().toUtc().toIso8601String(),
    }).eq('id', matchId);

    // Notifier le passager
    if (passengerId != null) {
      try {
        await _sb.functions.invoke('send-lift-notification', body: {
          'to_user_id': passengerId,
          'title': '🚗 Ton lift est en route !',
          'body': '$pickup → $dropoff · Le conducteur a démarré le trajet.',
          'data': {'type': 'in_transit', 'match_id': matchId},
        });
      } catch (e) {
        debugPrint('Erreur notification lift: $e');
      }
    }
    _load();
  }

  Future<void> _completeTransit(Map<String, dynamic> match) async {
    HapticFeedback.mediumImpact();
    final matchId = match['id'] as String;

    // Arrêter le tracking GPS
    await _tracking.stopTracking();

    // Mettre à jour le statut
    await _sb.from('ride_matches').update({
      'status': 'completed',
      'completed_at': DateTime.now().toUtc().toIso8601String(),
    }).eq('id', matchId);

    // Notation
    final driverId = match['driver_id'] as String?;
    final passengerId = match['passenger_id'] as String?;
    final pickup = match['pickup_city'] as String? ?? '';
    final dropoff = match['dropoff_city'] as String? ?? '';
    final toRate = _uid == driverId ? passengerId : driverId;
    if (toRate != null && mounted) {
      await _rateMatch(matchId, toRate, pickup, dropoff);
    }
    _load();
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

  Future<void> _updateMatch(String matchId, String status, {Map<String, dynamic>? match}) async {
    HapticFeedback.mediumImpact();
    await _sb.from('ride_matches').update({'status': status}).eq('id', matchId);
    // Notification push à l’autre partie
    if (match != null) {
      final passengerId = match['passenger_id'] as String?;
      final driverId    = match['driver_id']    as String?;
      final pickup      = match['pickup_city']  as String? ?? '';
      final dropoff     = match['dropoff_city'] as String? ?? '';
      if (status == 'accepted' && passengerId != null) {
        await _liftNotif.sendPushToPassenger(
            passengerUserId: passengerId, status: 'accepted',
            pickupCity: pickup, dropoffCity: dropoff);
      } else if (status == 'declined' && passengerId != null) {
        await _liftNotif.sendPushToPassenger(
            passengerUserId: passengerId, status: 'declined',
            pickupCity: pickup, dropoffCity: dropoff);
      }
      // Notation quand le lift est marqué terminé
      if (status == 'completed') {
        final toRate = _uid == driverId ? passengerId : driverId;
        if (toRate != null && mounted) await _rateMatch(matchId, toRate, pickup, dropoff);
      }
    }
    _load();
  }

  Future<void> _cancelOffer(String offerId) async {
    HapticFeedback.mediumImpact();
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Retirer l\'offre ?'),
        content: const Text(
          'Les passagers ayant un match accepté seront notifiés et leur demande passera en mode urgence.'),
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
    // Passe les demandes des passagers ayant un match accepté en mode urgence
    final affectedMatches = await _sb.from('ride_matches')
        .select('request_id')
        .eq('offer_id', offerId)
        .eq('status', 'accepted');
    for (final m in affectedMatches) {
      final requestId = m['request_id'] as String?;
      if (requestId != null) {
        await _sb.from('ride_requests')
            .update({'status': 'urgent'})
            .eq('id', requestId);
      }
    }
    await _sb.from('ride_matches').update({'status': 'cancelled'}).eq('offer_id', offerId);
    await _sb.from('ride_offers').update({'status': 'cancelled'}).eq('id', offerId);
    _load();
  }

  Future<void> _cancelRequest(String requestId) async {
    HapticFeedback.lightImpact();
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Annuler cette demande ?'),
        content: const Text('Tu ne recevras plus de propositions pour ce trajet.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Non')),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: FilledButton.styleFrom(backgroundColor: _kRed),
            child: const Text('Annuler'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    await _sb.from('ride_requests').update({'status': 'cancelled'}).eq('id', requestId);
    _load();
  }

  // ── Notation post-lift ──────────────────────────────────────────────────────

  Future<void> _rateMatch(
      String matchId, String ratedUserId, String pickup, String dropoff) async {
    int selectedRating = 5;
    String? comment;
    final ok = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setLocal) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
          title: const Text('\u2b50 Noté ce lift',
              style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('$pickup \u2192 $dropoff',
                  style: const TextStyle(fontSize: 13, color: Color(0xFF64748B))),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(5, (i) => GestureDetector(
                  onTap: () => setLocal(() => selectedRating = i + 1),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 4),
                    child: Icon(
                      i < selectedRating ? Icons.star_rounded : Icons.star_outline_rounded,
                      color: const Color(0xFFF59E0B),
                      size: 36,
                    ),
                  ),
                )),
              ),
              const SizedBox(height: 14),
              TextField(
                onChanged: (v) => comment = v,
                maxLines: 2,
                decoration: InputDecoration(
                  hintText: 'Un commentaire ? (optionnel)',
                  hintStyle: const TextStyle(fontSize: 13),
                  filled: true,
                  fillColor: const Color(0xFFF8FAFC),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                  ),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Passer'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(ctx, true),
              style: FilledButton.styleFrom(backgroundColor: _kTeal),
              child: const Text('Envoyer'),
            ),
          ],
        ),
      ),
    );
    if (ok != true) return;
    try {
      await _sb.from('ride_ratings').insert({
        'match_id':      matchId,
        'rater_id':      _uid,
        'rated_id':      ratedUserId,
        'rating':        selectedRating,
        if (comment != null && comment!.isNotEmpty) 'comment': comment,
      });
    } catch (e) {
      debugPrint('Erreur envoi note: $e');
    }
  }

  /// Annulation d'un match déjà accepté par le conducteur → la demande du passager
  /// repasse en mode urgence (prioritaire dans la recherche)
  Future<void> _cancelAcceptedMatch(Map<String, dynamic> match) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Annuler ce lift ?'),
        content: const Text(
          'La demande du passager passera en 🔴 mode urgence — elle apparaîtra en tête de liste pour les autres conducteurs.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Garder')),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: FilledButton.styleFrom(backgroundColor: _kRed),
            child: const Text('Annuler le lift'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    final requestId = match['request_id'] as String?;
    if (requestId != null) {
      await _sb.from('ride_requests')
          .update({'status': 'urgent'})
          .eq('id', requestId);
    }
    await _sb.from('ride_matches')
        .update({'status': 'cancelled'})
        .eq('id', match['id']);
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
  final VoidCallback? onStartTransit;
  final VoidCallback? onCancelAccepted;
  final VoidCallback? onMarkCompleted;

  const _MatchTile({
    required this.match,
    required this.myUid,
    required this.onTap,
    this.onAccept,
    this.onDecline,
    this.onStartTransit,
    this.onCancelAccepted,
    this.onMarkCompleted,
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
                  Flexible(
                    child: Text(
                      '${_fmt(depDate)}${depTime.isNotEmpty ? " $depTime" : ""}',
                      style: const TextStyle(fontSize: 12, color: _kGray),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
              ],
            ),
            // -- Démarrer le trajet (driver, accepted) --
            if (onStartTransit != null) ...[
              const SizedBox(height: 10),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: onStartTransit,
                  icon: const Icon(Icons.navigation_rounded, size: 16),
                  label: const Text('Démarrer le trajet'),
                  style: FilledButton.styleFrom(
                    backgroundColor: _kBlue,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                ),
              ),
            ],
            // -- ETA bar for passenger during in_transit --
            if (status == 'in_transit' && !isDriver) ...[
              const SizedBox(height: 8),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: const Color(0xFFEFF6FF),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: _kBlue.withOpacity(0.2)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.directions_car, size: 16, color: _kBlue),
                    const SizedBox(width: 8),
                    Text(
                      match['eta_minutes'] != null
                          ? '🚗 En route — ETA : ${match['eta_minutes']} min'
                          : '🚗 En route…',
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: _kBlue,
                      ),
                    ),
                  ],
                ),
              ),
            ],
            if (onCancelAccepted != null) ...[
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: onCancelAccepted,
                  icon: const Icon(Icons.cancel_outlined, size: 16),
                  label: const Text('Annuler le lift'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: _kRed,
                    side: const BorderSide(color: _kRed),
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                ),
              ),
            ],
            if (onMarkCompleted != null) ...[
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: onMarkCompleted,
                  icon: const Icon(Icons.flag_rounded, size: 16),
                  label: const Text('Marquer terminé'),
                  style: FilledButton.styleFrom(
                    backgroundColor: const Color(0xFF7C3AED),
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                ),
              ),
            ],
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
                    Flexible(
                      child: Text('$origin → $dest',
                          style: const TextStyle(
                              fontWeight: FontWeight.bold, fontSize: 14, color: _kDark),
                          overflow: TextOverflow.ellipsis),
                    ),
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
    final isUrgent = request['status'] == 'urgent';
    final pickup  = request['pickup_city']     as String? ?? '—';
    final dest    = request['destination_city'] as String? ?? '—';
    final date    = request['needed_date']     as String?;

    return Container(
      margin: const EdgeInsets.fromLTRB(16, 0, 16, 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isUrgent ? const Color(0xFFFFF7ED) : Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: isUrgent ? const Color(0xFFFB923C) : _kBorder, width: isUrgent ? 1.5 : 1),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: isUrgent ? const Color(0xFFFED7AA) : const Color(0xFFFEF3C7),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(isUrgent ? Icons.priority_high : Icons.hail,
                color: isUrgent ? _kRed : _kAmber, size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    if (isUrgent)
                      Container(
                        margin: const EdgeInsets.only(right: 6),
                        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                        decoration: BoxDecoration(
                          color: _kRed,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: const Text('URGENT',
                            style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold,
                                color: Colors.white, letterSpacing: 0.5)),
                      ),
                    Flexible(
                      child: Text('$pickup → $dest',
                          style: const TextStyle(
                              fontWeight: FontWeight.bold, fontSize: 14, color: _kDark),
                          overflow: TextOverflow.ellipsis),
                    ),
                  ],
                ),
                const SizedBox(height: 3),
                Text(
                  isUrgent ? '⚠️ Lift annulé — ${_fmt(date)}' : _fmt(date),
                  style: TextStyle(
                      fontSize: 12,
                      color: isUrgent ? const Color(0xFFC2410C) : _kGray,
                      fontWeight: isUrgent ? FontWeight.w600 : FontWeight.normal),
                ),
              ],
            ),
          ),
          TextButton(
            onPressed: onSearch,
            child: Text('Chercher',
                style: TextStyle(
                    color: isUrgent ? _kRed : _kTeal, fontSize: 13,
                    fontWeight: isUrgent ? FontWeight.bold : FontWeight.normal)),
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
