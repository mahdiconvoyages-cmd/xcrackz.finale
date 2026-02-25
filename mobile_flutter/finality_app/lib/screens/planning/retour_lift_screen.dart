// ===========================================================================
// RetourLiftScreen — "Je suis coincé, qui passe par ici ?"
//
// Déclenchement : après mission completed OU accès manuel depuis le planning.
// Logique simple :
//   1. Je suis à [fromCity]
//   2. Je veux aller à [toCity] (ma base ou la ville du prochain pickup)
//   3. Voici les convoyeurs qui font ce trajet aujourd'hui ou demain
//   4. Un tap → demande envoyée, le conducteur confirme
// ===========================================================================

import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:http/http.dart' as http;
import 'package:geolocator/geolocator.dart';
import '../../widgets/city_search_field.dart';
import '../../services/lift_notification_service.dart';

// ── Couleurs ─────────────────────────────────────────────────────────────────

const _kTeal   = Color(0xFF0D9488);
const _kTealBg = Color(0xFFE6FFFA);
const _kAmber  = Color(0xFFF59E0B);
const _kGreen  = Color(0xFF10B981);
const _kRed    = Color(0xFFEF4444);
const _kDark   = Color(0xFF0F172A);
const _kGray   = Color(0xFF64748B);
const _kBorder = Color(0xFFE2E8F0);
const _kCard   = Color(0xFFFFFFFF);

// ── Helpers ──────────────────────────────────────────────────────────────────

/// Safe substring for time strings - returns "HH:mm" or empty
String _safeTime(String? t) {
  if (t == null || t.isEmpty) return '';
  return t.length >= 5 ? t.substring(0, 5) : t;
}

String _timeAgo(String? iso) {
  if (iso == null) return '';
  final d = DateTime.tryParse(iso);
  if (d == null) return '';
  final diff = DateTime.now().difference(d);
  if (diff.inMinutes < 60) return 'il y a ${diff.inMinutes}min';
  if (diff.inHours < 24) return 'il y a ${diff.inHours}h';
  return 'il y a ${diff.inDays}j';
}

String _formatDate(String? d) {
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
  } catch (_) {
    return d;
  }
}

Future<Map<String, dynamic>?> _geocodeCity(String city) async {
  try {
    final res = await http.get(Uri.parse(
        'https://api-adresse.data.gouv.fr/search/?q=${Uri.encodeComponent(city)}&type=municipality&limit=1'));
    if (res.statusCode != 200) return null;
    final data = jsonDecode(res.body) as Map;
    final features = (data['features'] as List?) ?? [];
    if (features.isEmpty) return null;
    final f = features.first as Map;
    final coords = f['geometry']?['coordinates'] as List?;
    if (coords == null || coords.length < 2) return null;
    return {'lat': (coords[1] as num).toDouble(), 'lng': (coords[0] as num).toDouble()};
  } catch (_) {
    return null;
  }
}

// ── Entrée publique ──────────────────────────────────────────────────────────

class RetourLiftScreen extends StatefulWidget {
  /// Ville de départ (ville de livraison de la mission ou saisie manuelle)
  final String? fromCity;
  /// Ville d'arrivée suggérée (base du convoyeur ou prochain pickup)
  final String? toCity;
  /// ID de la mission source (pour lier la ride_request)
  final String? missionId;

  const RetourLiftScreen({
    super.key,
    this.fromCity,
    this.toCity,
    this.missionId,
  });

  @override
  State<RetourLiftScreen> createState() => _RetourLiftScreenState();
}

class _RetourLiftScreenState extends State<RetourLiftScreen>
    with SingleTickerProviderStateMixin {
  final _supabase = Supabase.instance.client;

  late TextEditingController _fromCtrl;
  late TextEditingController _toCtrl;

  // Résultats
  List<Map<String, dynamic>> _offers = [];
  List<Map<String, dynamic>> _myMatches = [];
  bool _loading = false;
  bool _searched = false;
  bool _geoLoading = false;

  // Date sélectionnée
  DateTime _selectedDate = DateTime.now();

  // Onglet (lifts dispo / mes matchs)
  late TabController _tab;

  String get _userId => _supabase.auth.currentUser?.id ?? '';

  RealtimeChannel? _realtimeChannel;

  @override
  void initState() {
    super.initState();
    _fromCtrl = TextEditingController(text: widget.fromCity ?? '');
    _toCtrl   = TextEditingController(text: widget.toCity ?? '');
    _tab = TabController(length: 2, vsync: this);
    _loadMyMatches();
    _subscribeRealtime();
    // Lancer la recherche automatiquement si les villes sont préfillées
    if ((widget.fromCity ?? '').isNotEmpty) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _search());
    }
  }

  /// Écoute les changements sur ride_matches pour rafraîchir automatiquement
  void _subscribeRealtime() {
    if (_userId.isEmpty) return;
    _realtimeChannel = _supabase.channel('retour_lift_$_userId')
      ..onPostgresChanges(
        event: PostgresChangeEvent.all,
        schema: 'public',
        table: 'ride_matches',
        filter: PostgresChangeFilter(
            type: PostgresChangeFilterType.eq,
            column: 'passenger_id',
            value: _userId),
        callback: (_) => _loadMyMatches(),
      )
      ..subscribe();
  }

  @override
  void dispose() {
    _realtimeChannel?.unsubscribe();
    _fromCtrl.dispose();
    _toCtrl.dispose();
    _tab.dispose();
    super.dispose();
  }

  // ── Géolocalisation — remplir la ville de départ ──────────────────────────

  Future<void> _useMyLocation() async {
    setState(() => _geoLoading = true);
    try {
      LocationPermission perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) {
        perm = await Geolocator.requestPermission();
      }
      if (perm == LocationPermission.denied || perm == LocationPermission.deniedForever) {
        if (mounted) _showSnack('Active la localisation dans les réglages', isError: true);
        return;
      }
      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.medium,
          timeLimit: Duration(seconds: 10),
        ),
      );
      // Reverse geocoding via api-adresse.data.gouv.fr
      final res = await http.get(Uri.parse(
          'https://api-adresse.data.gouv.fr/reverse/?lon=${pos.longitude}&lat=${pos.latitude}&type=municipality&limit=1'));
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body) as Map;
        final features = (data['features'] as List?) ?? [];
        if (features.isNotEmpty) {
          final city = features.first['properties']?['city'] as String? ?? '';
          if (city.isNotEmpty && mounted) {
            _fromCtrl.text = city;
            _showSnack('📍 Position détectée : $city');
            _search();
            return;
          }
        }
      }
      if (mounted) _showSnack('Ville non trouvée pour ta position', isError: true);
    } catch (e) {
      if (mounted) _showSnack('Erreur GPS: $e', isError: true);
    } finally {
      if (mounted) setState(() => _geoLoading = false);
    }
  }

  // ── Chargement des matchs en cours ───────────────────────────────────────

  Future<void> _loadMyMatches() async {
    if (_userId.isEmpty) return;
    try {
      final data = await _supabase
          .from('ride_matches')
          .select('*, ride_offers(*)')
          .eq('passenger_id', _userId)
          .inFilter('status', ['proposed', 'accepted', 'in_transit'])
          .order('created_at', ascending: false);
      if (mounted) setState(() => _myMatches = List<Map<String, dynamic>>.from(data));
    } catch (_) {}
  }

  // ── Recherche des offres disponibles ─────────────────────────────────────

  Future<void> _search() async {
    final from = _fromCtrl.text.trim();
    if (from.isEmpty) {
      _showSnack('Indique depuis quelle ville tu pars', isError: true);
      return;
    }
    setState(() { _loading = true; _searched = true; });

    try {
      final dateStr = DateFormat('yyyy-MM-dd').format(_selectedDate);
      final to = _toCtrl.text.trim();
      final fromKey = from.split(' ').first;

      // ── Requête principale : offres qui PARTENT de ma ville ───────────────
      var q = _supabase
          .from('ride_offers')
          .select('''
            *,
            profile:profiles!user_id(
              id, first_name, last_name, avatar_url,
              company_name
            ),
            ratings:ride_ratings(rating)
          ''')
          .neq('user_id', _userId)
          .inFilter('status', ['active', 'en_route'])
          .eq('departure_date', dateStr)
          .gt('seats_available', 0)
          .ilike('origin_city', '%$fromKey%');

      final mainData  = await q.order('departure_time', ascending: true);
      List<Map<String, dynamic>> offers = List<Map<String, dynamic>>.from(mainData);

      // ── Requête axe : offres qui ARRIVENT dans ma ville (passagers pris en route) ─
      // Marquées 'axis:true' pour afficher "En passage"
      if (from.length >= 3) {
        try {
          final axisData = await _supabase
              .from('ride_offers')
              .select('''
                *,
                profile:profiles!user_id(
                  id, first_name, last_name, avatar_url,
                  company_name
                ),
                ratings:ride_ratings(rating)
              ''')
              .neq('user_id', _userId)
              .inFilter('status', ['active', 'en_route'])
              .eq('departure_date', dateStr)
              .gt('seats_available', 0)
              .ilike('destination_city', '%$fromKey%')
              .order('departure_time', ascending: true);

          for (final o in axisData as List) {
            final dup = offers.any((e) => e['id'] == o['id']);
            if (!dup) {
              offers.add(Map<String, dynamic>.from(o as Map)..['_is_axis'] = true);
            }
          }
        } catch (_) {}
      }

      // ── Tri : offres vers la bonne destination en premier ─────────────────
      if (to.isNotEmpty) {
        offers.sort((a, b) {
          int score(Map m) {
            final dest = (m['destination_city'] as String? ?? '').toLowerCase();
            final isAxis = m['_is_axis'] == true;
            if (dest.contains(to.toLowerCase())) return isAxis ? 1 : 0;
            return isAxis ? 3 : 2;
          }
          return score(a).compareTo(score(b));
        });
      }

      if (mounted) setState(() { _offers = offers; _loading = false; });
    } catch (e) {
      if (mounted) {
        setState(() => _loading = false);
        _showSnack('Erreur : $e', isError: true);
      }
    }
  }

  // ── Demander un lift ──────────────────────────────────────────────────────

  Future<void> _requestLift(Map<String, dynamic> offer) async {
    // ── Empêcher les demandes en double sur la même offre ──
    try {
      final existing = await _supabase
          .from('ride_matches')
          .select('id')
          .eq('offer_id', offer['id'])
          .eq('passenger_id', _userId)
          .inFilter('status', ['proposed', 'accepted', 'in_transit'])
          .maybeSingle();
      if (existing != null) {
        if (mounted) _showSnack('Tu as déjà une demande en cours pour ce lift', isError: true);
        return;
      }
    } catch (_) {}

    final confirmed = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _RequestBottomSheet(offer: offer),
    );
    if (confirmed != true || !mounted) return;

    setState(() => _loading = true);
    try {
      // Chercher ou créer une ride_request pour ce besoin
      final requestData = await _supabase.from('ride_requests').upsert({
        'user_id': _userId,
        'completed_mission_id': widget.missionId,
        'pickup_city': _fromCtrl.text.trim(),
        'destination_city': _toCtrl.text.trim().isEmpty
            ? offer['destination_city']
            : _toCtrl.text.trim(),
        'needed_date': DateFormat('yyyy-MM-dd').format(_selectedDate),
        'status': 'active',
        'request_type': 'return',
        'notes': 'Retour depuis ${_fromCtrl.text.trim()}',
      }, onConflict: 'user_id, needed_date, pickup_city').select().single();

      // Créer le match
      await _supabase.from('ride_matches').insert({
        'offer_id': offer['id'],
        'request_id': requestData['id'],
        'driver_id': offer['user_id'],
        'passenger_id': _userId,
        'pickup_city': _fromCtrl.text.trim(),
        'dropoff_city': _toCtrl.text.trim().isEmpty
            ? offer['destination_city']
            : _toCtrl.text.trim(),
        'status': 'proposed',
      });

      // Envoyer notification push au conducteur
      try {
        await LiftNotificationService().sendPushToDriver(
          driverUserId: offer['user_id'] as String,
          pickupCity: _fromCtrl.text.trim(),
          dropoffCity: _toCtrl.text.trim().isEmpty
              ? (offer['destination_city'] as String? ?? '')
              : _toCtrl.text.trim(),
        );
      } catch (_) {}

      await _loadMyMatches();
      if (mounted) {
        _tab.animateTo(1); // Aller sur l'onglet "Mes matchs"
        _showSnack('✅ Demande envoyée ! En attente de confirmation');
      }
    } catch (e) {
      if (mounted) _showSnack('Erreur : $e', isError: true);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _showSnack(String msg, {bool isError = false}) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(msg),
      backgroundColor: isError ? _kRed : _kGreen,
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
    ));
  }

  // ── UI ────────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: NestedScrollView(
        headerSliverBuilder: (_, __) => [_buildAppBar()],
        body: Column(
          children: [
            _buildSearchPanel(),
            _buildTabBar(),
            Expanded(
              child: TabBarView(
                controller: _tab,
                children: [
                  _buildOffersList(),
                  _buildMatchesList(),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── AppBar ────────────────────────────────────────────────────────────────

  SliverAppBar _buildAppBar() {
    return SliverAppBar(
      expandedHeight: 120,
      pinned: true,
      backgroundColor: _kTeal,
      foregroundColor: Colors.white,
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
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
              child: Align(
                alignment: Alignment.bottomLeft,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      '🚗 Trouver un lift',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Trouve un convoyeur qui passe par ta ville',
                      style: TextStyle(color: Colors.white.withOpacity(0.85), fontSize: 13),
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

  // ── Panneau de recherche ──────────────────────────────────────────────────

  Widget _buildSearchPanel() {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Ligne Depuis → Vers
          Row(
            children: [
              Expanded(child: CitySearchField(
                controller: _fromCtrl,
                hint: 'Depuis…',
                icon: Icons.my_location,
                onSubmitted: _search,
              )),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8),
                child: Icon(Icons.arrow_forward, color: _kGray, size: 20),
              ),
              Expanded(child: CitySearchField(
                controller: _toCtrl,
                hint: 'Vers (optionnel)',
                icon: Icons.location_on_outlined,
                onSubmitted: _search,
              )),
            ],
          ),
          // Bouton GPS rapide
          if (_fromCtrl.text.isEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: GestureDetector(
                onTap: _geoLoading ? null : _useMyLocation,
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (_geoLoading)
                      const SizedBox(width: 14, height: 14,
                        child: CircularProgressIndicator(strokeWidth: 2, color: _kTeal))
                    else
                      const Icon(Icons.gps_fixed, size: 14, color: _kTeal),
                    const SizedBox(width: 6),
                    const Text('Utiliser ma position actuelle',
                        style: TextStyle(fontSize: 13, color: _kTeal, fontWeight: FontWeight.w500)),
                  ],
                ),
              ),
            ),
          const SizedBox(height: 10),
          // Ligne date + bouton recherche
          Row(
            children: [
              _DateChip(
                date: _selectedDate,
                onTap: () async {
                  final d = await showDatePicker(
                    context: context,
                    initialDate: _selectedDate,
                    firstDate: DateTime.now().subtract(const Duration(days: 1)),
                    lastDate: DateTime.now().add(const Duration(days: 30)),
                    locale: const Locale('fr', 'FR'),
                  );
                  if (d != null && mounted) {
                    setState(() => _selectedDate = d);
                    _search();
                  }
                },
              ),
              const SizedBox(width: 10),
              Expanded(
                child: FilledButton.icon(
                  onPressed: _loading ? null : _search,
                  icon: _loading
                      ? const SizedBox(width: 16, height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Icon(Icons.search, size: 18),
                  label: Text(_loading ? 'Recherche…' : 'Chercher'),
                  style: FilledButton.styleFrom(
                    backgroundColor: _kTeal,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ── TabBar ────────────────────────────────────────────────────────────────

  Widget _buildTabBar() {
    return Container(
      color: Colors.white,
      child: TabBar(
        controller: _tab,
        labelColor: _kTeal,
        unselectedLabelColor: _kGray,
        indicatorColor: _kTeal,
        indicatorWeight: 2.5,
        tabs: [
          Tab(
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Text('Lifts disponibles'),
                if (_offers.isNotEmpty) ...[
                  const SizedBox(width: 6),
                  _CountBadge(_offers.length, _kTeal),
                ],
              ],
            ),
          ),
          Tab(
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Text('Mes demandes'),
                if (_myMatches.isNotEmpty) ...[
                  const SizedBox(width: 6),
                  _CountBadge(_myMatches.length, _kAmber),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ── Liste des offres ─────────────────────────────────────────────────────

  Widget _buildOffersList() {
    if (!_searched && !_loading) {
      return _EmptyState(
        icon: Icons.search,
        title: 'Lance une recherche',
        subtitle: "Indique ta ville de départ et clique sur Chercher",
      );
    }
    if (_loading) {
      return const Center(child: CircularProgressIndicator(color: _kTeal));
    }
    if (_offers.isEmpty) {
      return _EmptyState(
        icon: Icons.directions_car_outlined,
        title: 'Aucun lift disponible',
        subtitle: "Essaie une autre date ou publie toi-même une demande",
        action: TextButton.icon(
          onPressed: _publishRequest,
          icon: const Icon(Icons.add, color: _kTeal),
          label: const Text('Publier ma demande', style: TextStyle(color: _kTeal)),
        ),
      );
    }

    return RefreshIndicator(
      color: _kTeal,
      onRefresh: _search,
      child: ListView.builder(
        padding: EdgeInsets.fromLTRB(12, 12, 12, 12 + MediaQuery.of(context).padding.bottom),
        itemCount: _offers.length,
        itemBuilder: (_, i) => _OfferCard(
          offer: _offers[i],
          toCity: _toCtrl.text.trim(),
          onRequest: () => _requestLift(_offers[i]),
        ),
      ),
    );
  }

  // ── Liste des matchs ─────────────────────────────────────────────────────

  Widget _buildMatchesList() {
    if (_myMatches.isEmpty) {
      return _EmptyState(
        icon: Icons.handshake_outlined,
        title: 'Aucune demande en cours',
        subtitle: 'Tes demandes de lift apparaîtront ici',
      );
    }
    return ListView.builder(
      padding: EdgeInsets.fromLTRB(12, 12, 12, 12 + MediaQuery.of(context).padding.bottom),
      itemCount: _myMatches.length,
      itemBuilder: (_, i) => _MatchCard(
        match: _myMatches[i],
        onCancel: () => _cancelMatch(_myMatches[i]),
      ),
    );
  }

  // ── Publier une demande ──────────────────────────────────────────────────

  Future<void> _publishRequest() async {
    final from = _fromCtrl.text.trim();
    final to   = _toCtrl.text.trim();
    if (from.isEmpty) {
      _showSnack('Indique ta ville de départ', isError: true);
      return;
    }
    setState(() => _loading = true);
    try {
      await _supabase.from('ride_requests').insert({
        'user_id': _userId,
        'completed_mission_id': widget.missionId,
        'pickup_city': from,
        'destination_city': to.isEmpty ? 'Flexible' : to,
        'needed_date': DateFormat('yyyy-MM-dd').format(_selectedDate),
        'status': 'active',
        'request_type': 'return',
        'notes': 'Retour depuis $from${to.isNotEmpty ? " vers $to" : ""}',
      });
      await _loadMyMatches();
      if (mounted) {
        _tab.animateTo(1);
        _showSnack('✅ Demande publiée ! Les conducteurs peuvent te contacter');
      }
    } catch (e) {
      if (mounted) _showSnack('Erreur : $e', isError: true);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _cancelMatch(Map<String, dynamic> match) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Annuler la demande ?'),
        content: const Text('Le conducteur sera informé de l\'annulation.'),
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
    await _supabase.from('ride_matches').update({'status': 'cancelled'}).eq('id', match['id']);
    await _loadMyMatches();
    if (mounted) _showSnack('Demande annulée');
  }
}

// ── Widgets utilitaires ──────────────────────────────────────────────────────

class _DateChip extends StatelessWidget {
  final DateTime date;
  final VoidCallback onTap;

  const _DateChip({required this.date, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final diff = DateTime(date.year, date.month, date.day).difference(today).inDays;
    final label = diff == 0 ? "Aujourd'hui" : diff == 1 ? "Demain" : DateFormat('d MMM', 'fr_FR').format(date);

    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          border: Border.all(color: _kBorder),
          borderRadius: BorderRadius.circular(12),
          color: const Color(0xFFF8FAFC),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.calendar_today_outlined, size: 16, color: _kGray),
            const SizedBox(width: 6),
            Text(label, style: const TextStyle(
              fontSize: 13, fontWeight: FontWeight.w600, color: _kDark)),
          ],
        ),
      ),
    );
  }
}

class _CountBadge extends StatelessWidget {
  final int count;
  final Color color;
  const _CountBadge(this.count, this.color);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
      decoration: BoxDecoration(
        color: color.withOpacity(0.15),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        '$count',
        style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: color),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final Widget? action;

  const _EmptyState({
    required this.icon,
    required this.title,
    required this.subtitle,
    this.action,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 72, height: 72,
              decoration: BoxDecoration(
                color: const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(36),
              ),
              child: Icon(icon, size: 36, color: const Color(0xFFCBD5E1)),
            ),
            const SizedBox(height: 16),
            Text(title, style: const TextStyle(
                fontSize: 16, fontWeight: FontWeight.bold, color: _kDark)),
            const SizedBox(height: 6),
            Text(subtitle, textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 13, color: _kGray, height: 1.4)),
            if (action != null) ...[const SizedBox(height: 12), action!],
          ],
        ),
      ),
    );
  }
}

// ── Carte offre de lift ──────────────────────────────────────────────────────

class _OfferCard extends StatelessWidget {
  final Map<String, dynamic> offer;
  final String toCity;
  final VoidCallback onRequest;

  const _OfferCard({
    required this.offer,
    required this.toCity,
    required this.onRequest,
  });

  double get _avgRating {
    final ratings = (offer['ratings'] as List?) ?? [];
    if (ratings.isEmpty) return 0;
    final sum = ratings.fold<double>(0, (s, r) => s + ((r['rating'] as num?)?.toDouble() ?? 0));
    return sum / ratings.length;
  }

  @override
  Widget build(BuildContext context) {
    final profile = (offer['profile'] as Map?) ?? {};
    final firstName = profile['first_name'] as String? ?? '';
    final lastName  = profile['last_name']  as String? ?? '';
    final company   = profile['company_name'] as String? ?? '';
    final name = '$firstName $lastName'.trim().isEmpty ? company : '$firstName $lastName'.trim();
    final avatar    = profile['avatar_url']  as String?;

    final origin = offer['origin_city']      as String? ?? '—';
    final dest   = offer['destination_city'] as String? ?? '—';
    final depDate = offer['departure_date']  as String?;
    final depTime = offer['departure_time']  as String? ?? '';
    final seats   = (offer['seats_available'] as num?)?.toInt() ?? 1;
    final vehicleType = offer['vehicle_type'] as String? ?? 'car';
    final notes   = offer['notes'] as String? ?? '';

    // Est-ce que la destination correspond ?
    final isDirectMatch = toCity.isNotEmpty &&
        dest.toLowerCase().contains(toCity.toLowerCase().split(' ').first.toLowerCase());
    final isAxis = offer['_is_axis'] == true;

    const vehicleEmoji = {
      'car': '🚗', 'van': '🚐', 'truck': '🚛', 'suv': '🏎️', 'motorcycle': '🏍️',
    };

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: _kCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: isDirectMatch ? _kTeal.withOpacity(0.4) : _kBorder),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: [
          // Badge "Trajet direct" si destination correspond
          if (isDirectMatch)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              decoration: const BoxDecoration(
                color: _kTealBg,
                borderRadius: BorderRadius.only(
                  topLeft: Radius.circular(16),
                  topRight: Radius.circular(16),
                ),
              ),
              child: const Row(
                children: [
                  Icon(Icons.verified, size: 14, color: _kTeal),
                  SizedBox(width: 6),
                  Text('Trajet direct vers ta destination',
                      style: TextStyle(fontSize: 12, color: _kTeal, fontWeight: FontWeight.w600)),
                ],
              ),
            ),
          // Badge "En passage" pour les offres en axe
          if (!isDirectMatch && isAxis)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 5),
              decoration: BoxDecoration(
                color: const Color(0xFFFFF7ED),
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(16),
                  topRight: Radius.circular(16),
                ),
                border: Border.all(color: const Color(0xFFFED7AA), width: 0),
              ),
              child: const Row(
                children: [
                  Icon(Icons.alt_route, size: 14, color: Color(0xFFF59E0B)),
                  SizedBox(width: 6),
                  Text('En passage par ta ville — déviation possible',
                      style: TextStyle(fontSize: 12, color: Color(0xFFD97706),
                          fontWeight: FontWeight.w600)),
                ],
              ),
            ),

          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Conducteur
                Row(
                  children: [
                    _Avatar(url: avatar, name: name),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(name.isEmpty ? 'Convoyeur' : name,
                              style: const TextStyle(
                                  fontWeight: FontWeight.bold, fontSize: 15, color: _kDark)),
                          if (_avgRating > 0)
                            Row(children: [
                              const Icon(Icons.star_rounded, size: 14, color: _kAmber),
                              const SizedBox(width: 3),
                              Text(_avgRating.toStringAsFixed(1),
                                  style: const TextStyle(fontSize: 12, color: _kGray)),
                            ]),
                        ],
                      ),
                    ),
                    // Véhicule + heure
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(vehicleEmoji[vehicleType] ?? '🚗',
                            style: const TextStyle(fontSize: 22)),
                        if (depTime.isNotEmpty)
                          Text(_safeTime(depTime),
                              style: const TextStyle(
                                  fontSize: 14, fontWeight: FontWeight.bold, color: _kDark)),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // Trajet
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(_formatDate(depDate),
                                style: const TextStyle(fontSize: 11, color: _kGray)),
                            const SizedBox(height: 2),
                            Text(origin,
                                style: const TextStyle(
                                    fontWeight: FontWeight.w600, fontSize: 14, color: _kDark)),
                          ],
                        ),
                      ),
                      Column(
                        children: [
                          Container(
                            width: 40, height: 1.5,
                            color: _kGray.withOpacity(0.3),
                          ),
                          const Icon(Icons.arrow_forward,
                              size: 14, color: _kGray),
                        ],
                      ),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text('$seats place${seats > 1 ? 's' : ''}',
                                style: const TextStyle(fontSize: 11, color: _kGray)),
                            const SizedBox(height: 2),
                            Text(dest,
                                style: const TextStyle(
                                    fontWeight: FontWeight.w600, fontSize: 14, color: _kDark),
                                textAlign: TextAlign.end),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),

                if (notes.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Text(notes,
                      style: const TextStyle(fontSize: 12, color: _kGray, fontStyle: FontStyle.italic),
                      maxLines: 2, overflow: TextOverflow.ellipsis),
                ],

                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: onRequest,
                    icon: const Icon(Icons.send_rounded, size: 16),
                    label: const Text('Demander un lift',
                        style: TextStyle(fontWeight: FontWeight.w600)),
                    style: FilledButton.styleFrom(
                      backgroundColor: _kTeal,
                      padding: const EdgeInsets.symmetric(vertical: 13),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ── Carte match en cours ─────────────────────────────────────────────────────

class _MatchCard extends StatelessWidget {
  final Map<String, dynamic> match;
  final VoidCallback onCancel;

  const _MatchCard({required this.match, required this.onCancel});

  static const _statusCfg = {
    'proposed':   (label: '⏳ En attente', bg: Color(0xFFFEF3C7), fg: Color(0xFFD97706)),
    'accepted':   (label: '✅ Confirmé',   bg: Color(0xFFD1FAE5), fg: Color(0xFF059669)),
    'in_transit': (label: '🚗 En route',   bg: Color(0xFFDBEAFE), fg: Color(0xFF2563EB)),
    'cancelled':  (label: '❌ Annulé',     bg: Color(0xFFFEE2E2), fg: Color(0xFFDC2626)),
  };

  @override
  Widget build(BuildContext context) {
    final status = match['status'] as String? ?? 'proposed';
    final cfg = _statusCfg[status] ?? (label: status, bg: const Color(0xFFF3F4F6), fg: _kGray);
    final pickup  = match['pickup_city']  as String? ?? '—';
    final dropoff = match['dropoff_city'] as String? ?? '—';
    final offer   = (match['ride_offers'] as Map?) ?? {};
    final depTime = offer['departure_time'] as String? ?? '';
    final depDate = offer['departure_date'] as String?;

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: _kCard,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: _kBorder),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 6, offset: const Offset(0, 2)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: cfg.bg,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(cfg.label,
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: cfg.fg)),
              ),
              const Spacer(),
              if (depDate != null)
                Text(_formatDate(depDate),
                    style: const TextStyle(fontSize: 12, color: _kGray)),
              if (depTime.isNotEmpty) ...[
                const SizedBox(width: 6),
                Text(_safeTime(depTime),
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: _kDark)),
              ],
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              const Icon(Icons.my_location, size: 14, color: _kTeal),
              const SizedBox(width: 6),
              Text(pickup, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8),
                child: Icon(Icons.arrow_forward, size: 14, color: _kGray),
              ),
              const Icon(Icons.location_on, size: 14, color: _kRed),
              const SizedBox(width: 6),
              Expanded(
                child: Text(dropoff,
                    style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                    overflow: TextOverflow.ellipsis),
              ),
            ],
          ),
          if (status == 'proposed') ...[
            const SizedBox(height: 10),
            Align(
              alignment: Alignment.centerRight,
              child: TextButton.icon(
                onPressed: onCancel,
                icon: const Icon(Icons.close, size: 16, color: _kGray),
                label: const Text('Annuler', style: TextStyle(color: _kGray, fontSize: 13)),
                style: TextButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

// ── Avatar ───────────────────────────────────────────────────────────────────

class _Avatar extends StatelessWidget {
  final String? url;
  final String name;
  const _Avatar({this.url, required this.name});

  @override
  Widget build(BuildContext context) {
    final initials = name.trim().isEmpty
        ? '?'
        : name.trim().split(' ').map((w) => w.isEmpty ? '' : w[0].toUpperCase()).take(2).join();
    return CircleAvatar(
      radius: 22,
      backgroundColor: _kTeal.withOpacity(0.15),
      backgroundImage: (url != null && url!.isNotEmpty) ? NetworkImage(url!) : null,
      child: (url == null || url!.isEmpty)
          ? Text(initials, style: const TextStyle(color: _kTeal, fontWeight: FontWeight.bold, fontSize: 13))
          : null,
    );
  }
}

// ── BottomSheet : confirmation de la demande ─────────────────────────────────

class _RequestBottomSheet extends StatelessWidget {
  final Map<String, dynamic> offer;
  const _RequestBottomSheet({required this.offer});

  @override
  Widget build(BuildContext context) {
    final profile = (offer['profile'] as Map?) ?? {};
    final firstName = profile['first_name'] as String? ?? '';
    final lastName  = profile['last_name']  as String? ?? '';
    final name = '$firstName $lastName'.trim().isEmpty ? 'ce convoyeur' : '$firstName $lastName'.trim();
    final origin = offer['origin_city'] as String? ?? '—';
    final dest   = offer['destination_city'] as String? ?? '—';
    final depTime = offer['departure_time'] as String? ?? '';

    return Container(
      margin: const EdgeInsets.all(16),
      padding: EdgeInsets.fromLTRB(24, 24, 24, 24 + MediaQuery.of(context).padding.bottom),
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
              const Text('🚗', style: TextStyle(fontSize: 28)),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Demander un lift à $name',
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: _kDark)),
                    Text('$origin → $dest${depTime.isNotEmpty ? " à ${_safeTime(depTime)}" : ""}',
                        style: const TextStyle(fontSize: 13, color: _kGray)),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: _kTealBg,
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Row(
              children: [
                Icon(Icons.info_outline, size: 16, color: _kTeal),
                SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Le conducteur sera notifié et devra confirmer ta demande.',
                    style: TextStyle(fontSize: 13, color: _kTeal, height: 1.4),
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
                  onPressed: () => Navigator.pop(context, false),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text('Annuler'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: FilledButton.icon(
                  onPressed: () => Navigator.pop(context, true),
                  icon: const Icon(Icons.send_rounded, size: 16),
                  label: const Text('Envoyer'),
                  style: FilledButton.styleFrom(
                    backgroundColor: _kTeal,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
