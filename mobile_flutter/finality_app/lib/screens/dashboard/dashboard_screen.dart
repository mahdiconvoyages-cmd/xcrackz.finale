import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:intl/intl.dart';
import '../../services/realtime_service.dart';
import '../profile/profile_screen.dart';
import '../../theme/premium_theme.dart';
import '../../widgets/premium/premium_widgets.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> 
    with SingleTickerProviderStateMixin {
  final supabase = Supabase.instance.client;
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

  // Stats
  int _activeMissions = 0;
  int _completedMissions = 0;
  int _totalMissions = 0;
  int _totalContacts = 0;
  double _completionRate = 0.0;

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
    setState(() => _isLoading = true);

    try {
      final userId = supabase.auth.currentUser?.id;
      if (userId == null) return;

      // Load profile
      final profile = await supabase
          .from('profiles')
          .select('first_name, last_name, credits')
          .eq('id', userId)
          .maybeSingle();

      if (profile != null) {
        _firstName = profile['first_name'] ?? '';
        _lastName = profile['last_name'] ?? '';
        _credits = profile['credits'] ?? 0;
      }

      // Load subscription from subscriptions table
      final subscription = await supabase
          .from('subscriptions')
          .select('plan, status, current_period_end, auto_renew')
          .eq('user_id', userId)
          .eq('status', 'active')
          .maybeSingle();

      if (subscription != null) {
        _plan = (subscription['plan'] ?? 'free').toString().toUpperCase();
        _hasActiveSubscription = true;
        
        if (subscription['current_period_end'] != null) {
          _subscriptionEndDate = DateTime.parse(subscription['current_period_end']);
          _daysRemaining = _subscriptionEndDate!.difference(DateTime.now()).inDays;
        }
      } else {
        _plan = 'FREE';
        _hasActiveSubscription = false;
        _daysRemaining = 0;
      }

      // Load missions stats
      final missions = await supabase
          .from('missions')
          .select('status')
          .or('user_id.eq.$userId,assigned_user_id.eq.$userId');

      _totalMissions = missions.length;
      _activeMissions = missions.where((m) => m['status'] == 'in_progress').length;
      _completedMissions = missions.where((m) => m['status'] == 'completed').length;
      _completionRate = _totalMissions > 0 ? (_completedMissions / _totalMissions) * 100 : 0;

      // Load contacts
      final contacts = await supabase
          .from('contacts')
          .select('id')
          .eq('user_id', userId);
      _totalContacts = contacts.length;

      setState(() => _isLoading = false);
    } catch (e) {
      print('Erreur chargement dashboard: $e');
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = supabase.auth.currentUser;
    final greeting = _getGreeting();

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
                    flexibleSpace: FlexibleSpaceBar(
                      background: Container(
                        decoration: const BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                            colors: [
                              Colors.white,
                              Color(0xFFF5F9FF),
                              Color(0xFFEFF6FF),
                            ],
                          ),
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
                                            ),
                                          ),
                                          const SizedBox(height: 2),
                                          Text(
                                            _firstName.isNotEmpty
                                                ? '$_firstName $_lastName'
                                                : user?.email ?? 'Utilisateur',
                                            style: PremiumTheme.heading3.copyWith(
                                              color: PremiumTheme.textPrimary,
                                              fontSize: 18,
                                            ),
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ],
                                      ),
                                    ),
                                    IconButton(
                                      icon: Icon(Icons.person, color: PremiumTheme.primaryBlue, size: 22),
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
                        _buildCreditsCard(),
                        const SizedBox(height: 16),

                        // Stats rapides
                        Row(
                          children: [
                            Expanded(
                              child: _buildQuickStat(
                                icon: Icons.assignment,
                                label: 'Missions actives',
                                value: _activeMissions.toString(),
                                color: PremiumTheme.primaryTeal,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: _buildQuickStat(
                                icon: Icons.check_circle,
                                label: 'Complétées',
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
                                label: 'Contacts CRM',
                                value: _totalContacts.toString(),
                                color: PremiumTheme.primaryBlue,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: _buildQuickStat(
                                icon: Icons.trending_up,
                                label: 'Taux succès',
                                value: '${_completionRate.toStringAsFixed(0)}%',
                                color: PremiumTheme.primaryPurple,
                              ),
                            ),
                          ],
                        ),

                        const SizedBox(height: 24),

                        // Graphique de progression
                        _buildProgressChart(),

                        const SizedBox(height: 24),

                        // Actions rapides
                        _buildQuickActions(),

                        const SizedBox(height: 24),

                        // Activité récente
                        _buildRecentActivity(),

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
              ShimmerLoading(width: double.infinity, height: 120),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(child: ShimmerLoading(width: double.infinity, height: 100)),
                  const SizedBox(width: 12),
                  Expanded(child: ShimmerLoading(width: double.infinity, height: 100)),
                ],
              ),
            ]),
          ),
        ),
      ],
    );
  }

  Widget _buildCreditsCard() {
    final isExpiringSoon = _daysRemaining < 7 && _daysRemaining > 0;
    final isExpired = _daysRemaining <= 0 && _hasActiveSubscription;

    return FadeInAnimation(
      delay: Duration.zero,
      child: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: isExpired 
                ? [PremiumTheme.accentRed.withOpacity(0.8), PremiumTheme.accentRed]
                : isExpiringSoon
                    ? [PremiumTheme.accentAmber.withOpacity(0.8), PremiumTheme.accentAmber]
                    : [PremiumTheme.primaryTeal, PremiumTheme.primaryBlue],
          ),
          borderRadius: BorderRadius.circular(PremiumTheme.radiusLG),
          boxShadow: [
            BoxShadow(
              color: (isExpired ? PremiumTheme.accentRed : PremiumTheme.primaryTeal).withOpacity(0.3),
              blurRadius: 20,
              offset: const Offset(0, 8),
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
                      'Crédits disponibles',
                      style: PremiumTheme.bodySmall.copyWith(
                        color: Colors.white.withOpacity(0.9),
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
                          ),
                        ),
                        const SizedBox(width: 8),
                        Icon(
                          Icons.account_balance_wallet,
                          color: Colors.white.withOpacity(0.8),
                          size: 32,
                        ),
                      ],
                    ),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    _plan,
                    style: PremiumTheme.body.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
            if (_hasActiveSubscription) ...[
              const SizedBox(height: 16),
              Divider(color: Colors.white.withOpacity(0.3)),
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
                              ? 'Abonnement expiré'
                              : isExpiringSoon
                                  ? 'Expire bientôt'
                                  : 'Abonnement actif',
                          style: PremiumTheme.bodySmall.copyWith(
                            color: Colors.white.withOpacity(0.9),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          isExpired
                              ? 'Renouvelez dès maintenant'
                              : '$_daysRemaining jours restants',
                          style: PremiumTheme.body.copyWith(
                            color: Colors.white,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        if (_subscriptionEndDate != null) ...[
                          const SizedBox(height: 4),
                          Text(
                            'Expire le ${DateFormat('dd/MM/yyyy').format(_subscriptionEndDate!)}',
                            style: PremiumTheme.bodySmall.copyWith(
                              color: Colors.white.withOpacity(0.8),
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
                    child: Text(isExpired ? 'Renouveler' : 'Gérer'),
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
      child: PremiumCard(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: color, size: 28),
              ),
              const SizedBox(height: 12),
              Text(
                value,
                style: PremiumTheme.heading2.copyWith(
                  fontSize: 28,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                label,
                style: PremiumTheme.bodySmall.copyWith(
                  color: Colors.white60,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildProgressChart() {
    return FadeInAnimation(
      delay: const Duration(milliseconds: 200),
      child: PremiumCard(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Progression des missions',
                style: PremiumTheme.heading4,
              ),
              const SizedBox(height: 20),
              Row(
                children: [
                  Expanded(
                    flex: _completedMissions,
                    child: Container(
                      height: 8,
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [PremiumTheme.accentGreen, PremiumTheme.primaryTeal],
                        ),
                        borderRadius: BorderRadius.horizontal(left: Radius.circular(4)),
                      ),
                    ),
                  ),
                  if (_activeMissions > 0)
                    Expanded(
                      flex: _activeMissions,
                      child: Container(
                        height: 8,
                        color: PremiumTheme.accentAmber,
                      ),
                    ),
                  if (_totalMissions - _completedMissions - _activeMissions > 0)
                    Expanded(
                      flex: _totalMissions - _completedMissions - _activeMissions,
                      child: Container(
                        height: 8,
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.1),
                          borderRadius: BorderRadius.horizontal(right: Radius.circular(4)),
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _buildLegendItem('Complétées', PremiumTheme.accentGreen, _completedMissions),
                  _buildLegendItem('En cours', PremiumTheme.accentAmber, _activeMissions),
                  _buildLegendItem('Pending', Colors.white30, _totalMissions - _completedMissions - _activeMissions),
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
          width: 12,
          height: 12,
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
          ),
        ),
        const SizedBox(width: 8),
        Text(
          '$label ($value)',
          style: PremiumTheme.bodySmall.copyWith(
            color: Colors.white70,
          ),
        ),
      ],
    );
  }

  Widget _buildQuickActions() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Actions rapides',
          style: PremiumTheme.heading4,
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: _buildActionButton(
                icon: Icons.add,
                label: 'Nouvelle mission',
                gradient: [PremiumTheme.primaryTeal, PremiumTheme.primaryBlue],
                onTap: () {
                  // Navigate to create mission
                },
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildActionButton(
                icon: Icons.person_add,
                label: 'Nouveau contact',
                gradient: [PremiumTheme.primaryIndigo, PremiumTheme.primaryPurple],
                onTap: () {
                  // Navigate to add contact
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
            gradient: LinearGradient(colors: gradient),
            borderRadius: BorderRadius.circular(PremiumTheme.radiusMD),
            boxShadow: [
              BoxShadow(
                color: gradient[0].withOpacity(0.3),
                blurRadius: 12,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          child: Column(
            children: [
              Icon(icon, color: Colors.white, size: 32),
              const SizedBox(height: 8),
              Text(
                label,
                style: PremiumTheme.bodySmall.copyWith(
                  color: Colors.white,
                  fontWeight: FontWeight.w600,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildRecentActivity() {
    return FadeInAnimation(
      delay: const Duration(milliseconds: 400),
      child: PremiumCard(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Activité récente',
                    style: PremiumTheme.heading4,
                  ),
                  TextButton(
                    onPressed: () {},
                    child: Text(
                      'Voir tout',
                      style: PremiumTheme.bodySmall.copyWith(
                        color: PremiumTheme.primaryTeal,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              _buildActivityItem(
                icon: Icons.check_circle,
                title: 'Mission complétée',
                subtitle: 'Paris → Lyon',
                time: 'Il y a 2h',
                color: PremiumTheme.accentGreen,
              ),
              _buildActivityItem(
                icon: Icons.person_add,
                title: 'Nouveau contact',
                subtitle: 'Client ajouté au CRM',
                time: 'Il y a 5h',
                color: PremiumTheme.primaryBlue,
              ),
              _buildActivityItem(
                icon: Icons.camera_alt,
                title: 'Inspection départ',
                subtitle: 'Véhicule documenté',
                time: 'Hier',
                color: PremiumTheme.primaryPurple,
              ),
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
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: color.withOpacity(0.2),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: PremiumTheme.body),
                Text(
                  subtitle,
                  style: PremiumTheme.bodySmall.copyWith(
                    color: Colors.white60,
                  ),
                ),
              ],
            ),
          ),
          Text(
            time,
            style: PremiumTheme.bodySmall.copyWith(
              color: Colors.white38,
            ),
          ),
        ],
      ),
    );
  }

  String _getGreeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  }
}
