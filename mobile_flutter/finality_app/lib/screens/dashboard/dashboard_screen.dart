import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:intl/intl.dart';
import '../../l10n/app_localizations.dart';
import '../../services/realtime_service.dart';
import '../../utils/logger.dart';
import '../profile/profile_screen.dart';
import '../../theme/premium_theme.dart';
import '../../widgets/premium/premium_widgets.dart';
import '../missions/mission_create_screen_new.dart';
import '../crm/crm_screen.dart';

class DashboardScreen extends StatefulWidget {
  final VoidCallback? onNavigateToMissions;
  const DashboardScreen({super.key, this.onNavigateToMissions});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> 
    with SingleTickerProviderStateMixin {
  SupabaseClient get supabase => Supabase.instance.client;
  final RealtimeService _realtimeService = RealtimeService();
  late AnimationController _animationController;

  bool _isLoading = true;
  String _firstName = '';
  String _lastName = '';
  int _credits = 0;
  DateTime? _subscriptionEndDate;
  bool _hasActiveSubscription = false;
  String _plan = 'FREE';
  int _daysRemaining = 0;
  bool _isEmailVerified = false;

  // Stats
  int _activeMissions = 0;
  int _completedMissions = 0;
  int _totalMissions = 0;
  int _totalContacts = 0;
  double _completionRate = 0.0;

  // Real recent activity
  List<Map<String, dynamic>> _recentActivity = [];

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    );
    _loadDashboardData();
    _animationController.forward();

    // Subscribe to realtime changes
    final userId = supabase.auth.currentUser?.id;
    if (userId != null) {
      _realtimeService.subscribeCredits(
        userId: userId,
        onChange: (newCredits) {
          if (mounted) setState(() => _credits = newCredits);
        },
      );
    }
  }

  @override
  void dispose() {
    _animationController.dispose();
    _realtimeService.unsubscribeAll();
    super.dispose();
  }

  Future<void> _loadDashboardData() async {
    if (!mounted) return;
    setState(() => _isLoading = true);

    try {
      final userId = supabase.auth.currentUser?.id;
      if (userId == null) {
        if (mounted) setState(() => _isLoading = false);
        return;
      }

      // Check email verification status
      final currentUser = supabase.auth.currentUser;
      _isEmailVerified = currentUser?.emailConfirmedAt != null;

      // Load profile, subscription and stats in parallel
      final results = await Future.wait<dynamic>([
        supabase
            .from('profiles')
            .select('first_name, last_name, credits')
            .eq('id', userId)
            .maybeSingle(),
        supabase
            .from('subscriptions')
            .select('plan, status, current_period_end, auto_renew')
            .eq('user_id', userId)
            .eq('status', 'active')
            .maybeSingle(),
        supabase.rpc('get_dashboard_stats', params: {'p_user_id': userId}),
      ]);

      final profile = results[0] as Map<String, dynamic>?;
      final subscription = results[1] as Map<String, dynamic>?;
      final statsRes = results[2];

      if (profile != null) {
        _firstName = profile['first_name'] ?? '';
        _lastName = profile['last_name'] ?? '';
        _credits = profile['credits'] ?? 0;
      }

      if (subscription != null) {
        _plan = (subscription['plan'] ?? 'free').toString().toUpperCase();
        _hasActiveSubscription = true;
        
        if (subscription['current_period_end'] != null) {
          _subscriptionEndDate = DateTime.parse(subscription['current_period_end']);
          _daysRemaining = _subscriptionEndDate!.difference(DateTime.now()).inDays;
        } else {
          // New user — subscription has no end date yet (welcome period)
          // Set 30 days from account creation as default
          final createdAt = currentUser?.createdAt;
          if (createdAt != null) {
            final created = DateTime.parse(createdAt);
            _subscriptionEndDate = created.add(const Duration(days: 30));
            _daysRemaining = _subscriptionEndDate!.difference(DateTime.now()).inDays;
          } else {
            _daysRemaining = 30;
          }
        }
      } else {
        _plan = 'FREE';
        _hasActiveSubscription = true; // New users have a welcome period
        _daysRemaining = 30;
      }

      // Stats already loaded via Future.wait above

      if (statsRes != null) {
        _totalMissions = statsRes['total_missions'] ?? 0;
        _activeMissions = statsRes['active_missions'] ?? 0;
        _completedMissions = statsRes['completed_missions'] ?? 0;
        _completionRate = (statsRes['completion_rate'] ?? 0).toDouble();
        _totalContacts = statsRes['total_contacts'] ?? 0;
      }

      // Load REAL recent activity (last 5 events across missions, contacts, inspections)
      await _loadRecentActivity(userId);

      if (mounted) setState(() => _isLoading = false);
    } catch (e) {
      logger.e('Erreur chargement dashboard: $e');
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _loadRecentActivity(String userId) async {
    try {
      final List<Map<String, dynamic>> activities = [];

      // Fetch recent missions (last 5)
      try {
        final missions = await supabase
            .from('missions')
            .select('id, reference, status, pickup_city, delivery_city, created_at, updated_at')
            .or('user_id.eq.$userId,assigned_user_id.eq.$userId')
            .order('updated_at', ascending: false)
            .limit(5);

        for (final m in (missions as List)) {
          final status = m['status'] ?? 'pending';
          IconData icon;
          Color color;
          String title;

          switch (status) {
            case 'completed':
              icon = Icons.check_circle;
              color = PremiumTheme.accentGreen;
              title = 'Mission terminée';
              break;
            case 'in_progress':
              icon = Icons.local_shipping;
              color = PremiumTheme.primaryBlue;
              title = 'Mission en cours';
              break;
            case 'cancelled':
              icon = Icons.cancel;
              color = Colors.red;
              title = 'Mission annulée';
              break;
            default:
              icon = Icons.schedule;
              color = PremiumTheme.primaryPurple;
              title = 'Nouvelle mission';
          }

          final pickup = m['pickup_city'] ?? '';
          final delivery = m['delivery_city'] ?? '';
          final subtitle = (pickup.isNotEmpty && delivery.isNotEmpty)
              ? '$pickup → $delivery'
              : m['reference'] ?? 'Mission';

          activities.add({
            'icon': icon,
            'title': title,
            'subtitle': subtitle,
            'time': _formatTimeAgo(DateTime.tryParse(m['updated_at'] ?? m['created_at'] ?? '') ?? DateTime.now()),
            'color': color,
            'date': DateTime.tryParse(m['updated_at'] ?? m['created_at'] ?? '') ?? DateTime.now(),
          });
        }
      } catch (e) {
        logger.e('Erreur chargement missions récentes: $e');
      }

      // Fetch recent contacts (last 3)
      try {
        final contacts = await supabase
            .from('contacts')
            .select('id, name, type, created_at')
            .eq('user_id', userId)
            .order('created_at', ascending: false)
            .limit(3);

        for (final c in (contacts as List)) {
          activities.add({
            'icon': Icons.person_add,
            'title': c['type'] == 'driver' ? 'Nouveau chauffeur' : 'Nouveau contact',
            'subtitle': c['name'] ?? 'Contact',
            'time': _formatTimeAgo(DateTime.tryParse(c['created_at'] ?? '') ?? DateTime.now()),
            'color': PremiumTheme.primaryBlue,
            'date': DateTime.tryParse(c['created_at'] ?? '') ?? DateTime.now(),
          });
        }
      } catch (e) {
        logger.e('Erreur chargement contacts récents: $e');
      }

      // Fetch recent inspections (last 3) — column is inspector_id
      try {
        final inspections = await supabase
            .from('vehicle_inspections')
            .select('id, type, vehicle_brand, vehicle_model, created_at')
            .eq('inspector_id', userId)
            .order('created_at', ascending: false)
            .limit(3);

        for (final i in (inspections as List)) {
          final inspType = i['type'] ?? 'departure';
          activities.add({
            'icon': Icons.camera_alt,
            'title': inspType == 'departure' ? 'Inspection départ' : 'Inspection arrivée',
            'subtitle': '${i['vehicle_brand'] ?? ''} ${i['vehicle_model'] ?? ''}'.trim(),
            'time': _formatTimeAgo(DateTime.tryParse(i['created_at'] ?? '') ?? DateTime.now()),
            'color': inspType == 'departure' ? PremiumTheme.primaryPurple : PremiumTheme.primaryTeal,
            'date': DateTime.tryParse(i['created_at'] ?? '') ?? DateTime.now(),
          });
        }
      } catch (e) {
        logger.e('Erreur chargement inspections récentes: $e');
      }

      // Fetch recent invoices (last 3)
      try {
        final invoices = await supabase
            .from('invoices')
            .select('id, invoice_number, client_name, status, total, created_at, updated_at')
            .eq('user_id', userId)
            .order('updated_at', ascending: false)
            .limit(3);

        for (final inv in (invoices as List)) {
          final status = inv['status'] ?? 'draft';
          IconData icon;
          Color color;
          String title;

          switch (status) {
            case 'paid':
              icon = Icons.check_circle;
              color = PremiumTheme.accentGreen;
              title = 'Facture payée';
              break;
            case 'sent':
              icon = Icons.send;
              color = PremiumTheme.primaryBlue;
              title = 'Facture envoyée';
              break;
            case 'cancelled':
              icon = Icons.cancel;
              color = Colors.red;
              title = 'Facture annulée';
              break;
            default:
              icon = Icons.receipt_long;
              color = PremiumTheme.primaryPurple;
              title = 'Nouvelle facture';
          }

          final total = (inv['total'] ?? 0).toDouble();
          activities.add({
            'icon': icon,
            'title': title,
            'subtitle': '${inv['client_name'] ?? 'Client'} · ${total.toStringAsFixed(2)}€',
            'time': _formatTimeAgo(DateTime.tryParse(inv['updated_at'] ?? inv['created_at'] ?? '') ?? DateTime.now()),
            'color': color,
            'date': DateTime.tryParse(inv['updated_at'] ?? inv['created_at'] ?? '') ?? DateTime.now(),
          });
        }
      } catch (e) {
        logger.e('Erreur chargement factures récentes: $e');
      }

      // Sort all by date descending, take top 5
      activities.sort((a, b) => (b['date'] as DateTime).compareTo(a['date'] as DateTime));
      _recentActivity = activities.take(5).toList();
    } catch (e) {
      logger.e('Erreur chargement activité récente: $e');
      _recentActivity = [];
    }
  }

  String _formatTimeAgo(DateTime date) {
    final now = DateTime.now();
    final diff = now.difference(date);

    if (diff.inMinutes < 1) return 'À l\'instant';
    if (diff.inMinutes < 60) return 'Il y a ${diff.inMinutes}min';
    if (diff.inHours < 24) return 'Il y a ${diff.inHours}h';
    if (diff.inDays == 1) return 'Hier';
    if (diff.inDays < 7) return 'Il y a ${diff.inDays}j';
    if (diff.inDays < 30) return 'Il y a ${(diff.inDays / 7).floor()} sem.';
    return DateFormat('dd/MM/yy').format(date);
  }

  @override
  Widget build(BuildContext context) {
    final user = supabase.auth.currentUser;
    final l10n = AppLocalizations.of(context);
    final greeting = _getGreeting(context);

    return Scaffold(
      backgroundColor: PremiumTheme.lightBg,
      body: _isLoading
          ? _buildLoadingState()
          : RefreshIndicator(
              onRefresh: _loadDashboardData,
              backgroundColor: Colors.white,
              color: PremiumTheme.primaryBlue,
              child: CustomScrollView(
                slivers: [
                  // App Bar simplifié et compact
                  SliverAppBar(
                    expandedHeight: 100,
                    floating: false,
                    pinned: true,
                    elevation: 0,
                    shadowColor: Colors.transparent,
                    flexibleSpace: FlexibleSpaceBar(
                      background: Container(
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                            colors: [
                              Colors.white,
                              Color(0xFFF5F9FF),
                              Color(0xFFEFF6FF),
                            ],
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.05),
                              blurRadius: 10,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: SafeArea(
                          child: Padding(
                            padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisAlignment: MainAxisAlignment.end,
                              children: [
                                Row(
                                  children: [
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            greeting,
                                            style: PremiumTheme.bodySmall.copyWith(
                                              color: PremiumTheme.textSecondary,
                                              fontSize: 12,
                                              fontWeight: FontWeight.w500,
                                              shadows: [
                                                Shadow(
                                                  color: Colors.black.withValues(alpha: 0.1),
                                                  offset: const Offset(0, 1),
                                                  blurRadius: 2,
                                                ),
                                              ],
                                            ),
                                          ),
                                          const SizedBox(height: 2),
                                          Text(
                                            _firstName.isNotEmpty
                                                ? '$_firstName $_lastName'
                                                : user?.email ?? l10n.user,
                                            style: PremiumTheme.heading3.copyWith(
                                              color: PremiumTheme.textPrimary,
                                              fontSize: 18,
                                              fontWeight: FontWeight.bold,
                                              shadows: [
                                                Shadow(
                                                  color: Colors.black.withValues(alpha: 0.15),
                                                  offset: const Offset(0, 1),
                                                  blurRadius: 3,
                                                ),
                                              ],
                                            ),
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ],
                                      ),
                                    ),
                                    IconButton(
                                      icon: const Icon(Icons.person, color: PremiumTheme.primaryBlue, size: 22),
                                      onPressed: () {
                                        Navigator.push(
                                          context,
                                          MaterialPageRoute(
                                            builder: (context) => const ProfileScreen(),
                                          ),
                                        );
                                      },
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

                  // Content
                  SliverPadding(
                    padding: const EdgeInsets.all(16),
                    sliver: SliverList(
                      delegate: SliverChildListDelegate([
                        // Crédits et Abonnement
                        _buildCreditsCard(l10n),
                        const SizedBox(height: 16),

                        // Stats rapides
                        Row(
                          children: [
                            Expanded(
                              child: _buildQuickStat(
                                icon: Icons.assignment,
                                label: l10n.activeMissions,
                                value: _activeMissions.toString(),
                                color: PremiumTheme.primaryTeal,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: _buildQuickStat(
                                icon: Icons.check_circle,
                                label: l10n.completed,
                                value: _completedMissions.toString(),
                                color: PremiumTheme.accentGreen,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),

                        Row(
                          children: [
                            Expanded(
                              child: _buildQuickStat(
                                icon: Icons.people,
                                label: l10n.clients,
                                value: _totalContacts.toString(),
                                color: PremiumTheme.primaryBlue,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: _buildQuickStat(
                                icon: Icons.trending_up,
                                label: l10n.successRate,
                                value: '${_completionRate.toStringAsFixed(0)}%',
                                color: PremiumTheme.primaryPurple,
                              ),
                            ),
                          ],
                        ),

                        const SizedBox(height: 24),

                        // Graphique de progression
                        _buildProgressChart(l10n),

                        const SizedBox(height: 24),

                        // Actions rapides
                        _buildQuickActions(l10n),

                        const SizedBox(height: 24),

                        // Activité récente
                        _buildRecentActivity(l10n),

                        const SizedBox(height: 32),
                      ]),
                    ),
                  ),
                ],
              ),
            ),
    );
  }

  Widget _buildLoadingState() {
    return CustomScrollView(
      slivers: [
        SliverAppBar(
          expandedHeight: 200,
          backgroundColor: PremiumTheme.primaryTeal,
        ),
        SliverPadding(
          padding: const EdgeInsets.all(16),
          sliver: SliverList(
            delegate: SliverChildListDelegate([
              const ShimmerLoading(width: double.infinity, height: 120),
              const SizedBox(height: 16),
              Row(
                children: [
                  const Expanded(child: ShimmerLoading(width: double.infinity, height: 100)),
                  const SizedBox(width: 12),
                  const Expanded(child: ShimmerLoading(width: double.infinity, height: 100)),
                ],
              ),
            ]),
          ),
        ),
      ],
    );
  }

  Widget _buildCreditsCard(AppLocalizations l10n) {
    final isExpiringSoon = _daysRemaining < 7 && _daysRemaining > 0;
    final isExpired = _daysRemaining <= 0 && _hasActiveSubscription;
    final needsEmailVerification = !_isEmailVerified;

    return FadeInAnimation(
      delay: Duration.zero,
      child: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: needsEmailVerification
                ? [const Color(0xFF6366F1), const Color(0xFF8B5CF6)] // Indigo/violet for verification
                : isExpired 
                    ? [PremiumTheme.accentRed.withValues(alpha: 0.9), PremiumTheme.accentRed]
                    : isExpiringSoon
                        ? [PremiumTheme.accentAmber.withValues(alpha: 0.9), PremiumTheme.accentAmber]
                        : [PremiumTheme.primaryTeal, PremiumTheme.primaryBlue],
          ),
          borderRadius: BorderRadius.circular(PremiumTheme.radiusLG),
          boxShadow: [
            BoxShadow(
              color: (isExpired ? PremiumTheme.accentRed : PremiumTheme.primaryTeal).withValues(alpha: 0.4),
              blurRadius: 24,
              offset: const Offset(0, 10),
              spreadRadius: 2,
            ),
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.08),
              blurRadius: 8,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      l10n.creditsAvailable,
                      style: PremiumTheme.bodySmall.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 0.5,
                        shadows: [
                          Shadow(
                            color: Colors.black.withValues(alpha: 0.3),
                            offset: const Offset(0, 2),
                            blurRadius: 4,
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Text(
                          _credits.toString(),
                          style: PremiumTheme.heading1.copyWith(
                            fontSize: 48,
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            shadows: [
                              Shadow(
                                color: Colors.black.withValues(alpha: 0.4),
                                offset: const Offset(0, 3),
                                blurRadius: 8,
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        Icon(
                          Icons.account_balance_wallet,
                          color: Colors.white,
                          size: 32,
                          shadows: [
                            Shadow(
                              color: Colors.black.withValues(alpha: 0.3),
                              offset: const Offset(0, 2),
                              blurRadius: 4,
                            ),
                          ],
                        ),
                      ],
                    ),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.3),
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.2),
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Text(
                    _plan,
                    style: PremiumTheme.body.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 0.8,
                      shadows: [
                        Shadow(
                          color: Colors.black.withValues(alpha: 0.3),
                          offset: const Offset(0, 1),
                          blurRadius: 2,
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
            // Email verification banner
            if (needsEmailVerification) ...[  
              const SizedBox(height: 16),
              Divider(color: Colors.white.withValues(alpha: 0.3)),
              const SizedBox(height: 16),
              Row(
                children: [
                  const Icon(
                    Icons.email_outlined,
                    color: Colors.white,
                    size: 24,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Activez votre compte',
                          style: PremiumTheme.body.copyWith(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Validez votre adresse email pour profiter de votre mois de bienvenue et de vos 10 crédits offerts !',
                          style: PremiumTheme.bodySmall.copyWith(
                            color: Colors.white.withValues(alpha: 0.9),
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  ElevatedButton.icon(
                    onPressed: () async {
                      // Resend verification email
                      try {
                        final email = supabase.auth.currentUser?.email;
                        if (email != null) {
                          await supabase.auth.resend(
                            type: OtpType.signup,
                            email: email,
                          );
                          if (mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('Email de vérification renvoyé !'),
                                backgroundColor: Color(0xFF10B981),
                              ),
                            );
                          }
                        }
                      } catch (e) {
                        if (mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('Erreur: $e'),
                              backgroundColor: Colors.red,
                            ),
                          );
                        }
                      }
                    },
                    icon: const Icon(Icons.send, size: 16),
                    label: const Text('Renvoyer', style: TextStyle(fontSize: 12)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: const Color(0xFF6366F1),
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                ],
              ),
            ] else if (_hasActiveSubscription) ...[
              const SizedBox(height: 16),
              Divider(color: Colors.white.withValues(alpha: 0.3)),
              const SizedBox(height: 16),
              Row(
                children: [
                  Icon(
                    isExpired
                        ? Icons.error
                        : isExpiringSoon
                            ? Icons.warning
                            : Icons.calendar_today,
                    color: Colors.white,
                    size: 20,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          isExpired
                              ? l10n.subscriptionExpired
                              : isExpiringSoon
                                  ? l10n.expiresShort
                                  : l10n.subscriptionActive,
                          style: PremiumTheme.bodySmall.copyWith(
                            color: Colors.white,
                            fontWeight: FontWeight.w600,
                            shadows: [
                              Shadow(
                                color: Colors.black.withValues(alpha: 0.3),
                                offset: const Offset(0, 1),
                                blurRadius: 2,
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          isExpired
                              ? l10n.renewNow
                              : '$_daysRemaining ${l10n.daysRemaining}',
                          style: PremiumTheme.body.copyWith(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            shadows: [
                              Shadow(
                                color: Colors.black.withValues(alpha: 0.4),
                                offset: const Offset(0, 2),
                                blurRadius: 4,
                              ),
                            ],
                          ),
                        ),
                        if (_subscriptionEndDate != null) ...[
                          const SizedBox(height: 4),
                          Text(
                            'Expire le ${DateFormat('dd/MM/yyyy').format(_subscriptionEndDate!)}',
                            style: PremiumTheme.bodySmall.copyWith(
                              color: Colors.white.withValues(alpha: 0.8),
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                  ElevatedButton(
                    onPressed: () {
                      Navigator.of(context).pushNamed('/subscription');
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: isExpired 
                          ? PremiumTheme.accentRed 
                          : PremiumTheme.primaryTeal,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: Text(isExpired ? l10n.renew : l10n.manage),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildQuickStat({
    required IconData icon,
    required String label,
    required String value,
    required Color color,
  }) {
    return FadeInAnimation(
      delay: const Duration(milliseconds: 100),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(PremiumTheme.radiusLG),
          border: Border.all(
            color: color.withValues(alpha: 0.3),
            width: 1.5,
          ),
          boxShadow: [
            BoxShadow(
              color: color.withValues(alpha: 0.15),
              blurRadius: 12,
              offset: const Offset(0, 6),
              spreadRadius: 1,
            ),
          ],
        ),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [color.withValues(alpha: 0.15), color.withValues(alpha: 0.05)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: color.withValues(alpha: 0.3),
                    width: 1,
                  ),
                ),
                child: Icon(icon, color: color, size: 26),
              ),
              const SizedBox(height: 12),
              Text(
                value,
                style: PremiumTheme.heading2.copyWith(
                  fontSize: 26,
                  fontWeight: FontWeight.bold,
                  color: color,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                label,
                style: PremiumTheme.bodySmall.copyWith(
                  color: PremiumTheme.textSecondary,
                  fontWeight: FontWeight.w600,
                  fontSize: 12,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildProgressChart(AppLocalizations l10n) {
    return FadeInAnimation(
      delay: const Duration(milliseconds: 200),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(PremiumTheme.radiusLG),
          border: Border.all(
            color: PremiumTheme.primaryBlue.withValues(alpha: 0.2),
            width: 1.5,
          ),
          boxShadow: [
            BoxShadow(
              color: PremiumTheme.primaryBlue.withValues(alpha: 0.1),
              blurRadius: 12,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      gradient: PremiumTheme.primaryGradient,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.trending_up, color: Colors.white, size: 20),
                  ),
                  const SizedBox(width: 12),
                  Text(
                    l10n.missionsProgress,
                    style: PremiumTheme.heading4.copyWith(
                      color: PremiumTheme.textPrimary,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              Container(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(8),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.1),
                      blurRadius: 4,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    if (_completedMissions > 0)
                      Expanded(
                        flex: _completedMissions,
                        child: Container(
                          height: 10,
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              colors: [PremiumTheme.accentGreen, PremiumTheme.primaryTeal],
                            ),
                            borderRadius: const BorderRadius.horizontal(left: Radius.circular(5)),
                          ),
                        ),
                      ),
                    if (_activeMissions > 0)
                      Expanded(
                        flex: _activeMissions,
                        child: Container(
                          height: 10,
                          color: PremiumTheme.accentAmber,
                        ),
                      ),
                    if (_totalMissions - _completedMissions - _activeMissions > 0)
                      Expanded(
                        flex: _totalMissions - _completedMissions - _activeMissions,
                        child: Container(
                          height: 10,
                          decoration: BoxDecoration(
                            color: PremiumTheme.textSecondary.withValues(alpha: 0.2),
                            borderRadius: BorderRadius.horizontal(right: Radius.circular(5)),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _buildLegendItem(l10n.completed, PremiumTheme.accentGreen, _completedMissions),
                  _buildLegendItem(l10n.inProgress, PremiumTheme.accentAmber, _activeMissions),
                  _buildLegendItem(l10n.pending, Colors.grey.shade400, _totalMissions - _completedMissions - _activeMissions),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildLegendItem(String label, Color color, int value) {
    return Row(
      children: [
        Container(
          width: 14,
          height: 14,
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(
                color: color.withValues(alpha: 0.4),
                blurRadius: 4,
                offset: const Offset(0, 2),
              ),
            ],
          ),
        ),
        const SizedBox(width: 8),
        Text(
          '$label ($value)',
          style: PremiumTheme.bodySmall.copyWith(
            color: PremiumTheme.textSecondary,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }

  Widget _buildQuickActions(AppLocalizations l10n) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          l10n.quickActions,
          style: PremiumTheme.heading4,
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: _buildActionButton(
                icon: Icons.add,
                label: l10n.newMission,
                gradient: [PremiumTheme.primaryTeal, PremiumTheme.primaryBlue],
                onTap: () {
                  Navigator.push(context, MaterialPageRoute(
                    builder: (_) => const MissionCreateScreenNew(),
                  ));
                },
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildActionButton(
                icon: Icons.person_add,
                label: l10n.newContact,
                gradient: [PremiumTheme.primaryIndigo, PremiumTheme.primaryPurple],
                onTap: () {
                  Navigator.push(context, MaterialPageRoute(
                    builder: (_) => const CRMScreen(),
                  ));
                },
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildActionButton({
    required IconData icon,
    required String label,
    required List<Color> gradient,
    required VoidCallback onTap,
  }) {
    return FadeInAnimation(
      delay: const Duration(milliseconds: 300),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(PremiumTheme.radiusMD),
        child: Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: gradient,
            ),
            borderRadius: BorderRadius.circular(PremiumTheme.radiusMD),
            boxShadow: [
              BoxShadow(
                color: gradient[0].withValues(alpha: 0.4),
                blurRadius: 16,
                offset: const Offset(0, 8),
                spreadRadius: 1,
              ),
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.1),
                blurRadius: 4,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Column(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: Colors.white, size: 32),
              ),
              const SizedBox(height: 12),
              Text(
                label,
                style: PremiumTheme.bodySmall.copyWith(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  shadows: [
                    Shadow(
                      color: Colors.black.withValues(alpha: 0.3),
                      offset: const Offset(0, 2),
                      blurRadius: 4,
                    ),
                  ],
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildRecentActivity(AppLocalizations l10n) {
    return FadeInAnimation(
      delay: const Duration(milliseconds: 400),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(PremiumTheme.radiusLG),
          border: Border.all(
            color: PremiumTheme.primaryPurple.withValues(alpha: 0.2),
            width: 1.5,
          ),
          boxShadow: [
            BoxShadow(
              color: PremiumTheme.primaryPurple.withValues(alpha: 0.1),
              blurRadius: 12,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: [PremiumTheme.primaryPurple, PremiumTheme.primaryIndigo],
                          ),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(Icons.history, color: Colors.white, size: 20),
                      ),
                      const SizedBox(width: 12),
                      Text(
                        l10n.recentActivity,
                        style: PremiumTheme.heading4.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  TextButton(
                    onPressed: () {
                      widget.onNavigateToMissions?.call();
                    },
                    child: Text(
                      l10n.seeAll,
                      style: PremiumTheme.bodySmall.copyWith(
                        color: PremiumTheme.primaryTeal,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              if (_recentActivity.isEmpty)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 24),
                  child: Center(
                    child: Column(
                      children: [
                        Icon(Icons.inbox_outlined, size: 40, color: Colors.grey.shade300),
                        const SizedBox(height: 8),
                        Text(
                          'Aucune activité récente',
                          style: PremiumTheme.bodySmall.copyWith(color: PremiumTheme.textSecondary),
                        ),
                      ],
                    ),
                  ),
                )
              else
                ...(_recentActivity.map((a) => _buildActivityItem(
                  icon: a['icon'] as IconData,
                  title: a['title'] as String,
                  subtitle: a['subtitle'] as String,
                  time: a['time'] as String,
                  color: a['color'] as Color,
                ))),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildActivityItem({
    required IconData icon,
    required String title,
    required String subtitle,
    required String time,
    required Color color,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.grey.shade50,
        borderRadius: BorderRadius.circular(12),
        border: Border(
          left: BorderSide(color: color, width: 3),
        ),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [color.withValues(alpha: 0.2), color.withValues(alpha: 0.1)],
              ),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: color.withValues(alpha: 0.3)),
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title, 
                  style: PremiumTheme.body.copyWith(
                    color: PremiumTheme.textPrimary,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: PremiumTheme.bodySmall.copyWith(
                    color: PremiumTheme.textSecondary,
                  ),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              time,
              style: PremiumTheme.bodySmall.copyWith(
                color: color,
                fontWeight: FontWeight.w500,
                fontSize: 11,
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _getGreeting(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final hour = DateTime.now().hour;
    if (hour < 12) return l10n.goodMorning;
    if (hour < 18) return l10n.goodAfternoon;
    return l10n.goodEvening;
  }
}
