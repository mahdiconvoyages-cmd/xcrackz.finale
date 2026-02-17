import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:intl/intl.dart';
import '../../services/subscription_service.dart';
import '../../models/user_subscription.dart';

class SubscriptionScreen extends StatefulWidget {
  const SubscriptionScreen({super.key});

  @override
  State<SubscriptionScreen> createState() => _SubscriptionScreenState();
}

class _SubscriptionScreenState extends State<SubscriptionScreen> {
  final SubscriptionService _subscriptionService = SubscriptionService();
  UserSubscription? _currentSubscription;
  bool _isLoading = true;
  String? _error;

  final List<Map<String, dynamic>> _plans = [
    {
      'id': 'free',
      'name': 'Gratuit',
      'price': 0.0,
      'period': 'month',
      'features': [
        '5 missions par mois',
        '2 inspections par mois',
        'Support par email',
        'Accès basique au scanner',
      ],
      'color': Colors.grey,
      'icon': Icons.card_giftcard,
    },
    {
      'id': 'essentiel',
      'name': 'Essentiel',
      'price': 10.0,
      'period': 'month',
      'features': [
        '10 crédits par mois',
        'Plateforme complète',
        'Rapports PDF',
        'CRM intégré',
        'Scanner professionnel',
        'Support par email',
      ],
      'color': Colors.blue,
      'icon': Icons.stars,
    },
    {
      'id': 'pro',
      'name': 'Pro',
      'price': 20.0,
      'period': 'month',
      'features': [
        '20 crédits par mois',
        'Assistant IA inclus',
        'Scanner avancé OCR',
        'Optimisation des trajets',
        'Rapports avancés',
        'Support prioritaire',
      ],
      'color': Colors.purple,
      'icon': Icons.workspace_premium,
      'popular': true,
    },
    {
      'id': 'business',
      'name': 'Business',
      'price': 50.0,
      'period': 'month',
      'features': [
        '100 crédits par mois',
        'Frais de mise en service offerts',
        'Gestion de flotte / équipes',
        'Volume important',
        'Support téléphonique',
        'Toutes les fonctionnalités Pro',
      ],
      'color': Colors.amber,
      'icon': Icons.business,
    },
  ];

  @override
  void initState() {
    super.initState();
    _loadSubscription();
  }

  Future<void> _loadSubscription() async {
    setState(() => _isLoading = true);

    try {
      final userId = Supabase.instance.client.auth.currentUser?.id;
      if (userId == null) {
        throw Exception('Utilisateur non connecté');
      }

      final subscription = await _subscriptionService.getActiveSubscription(userId);
      if (!mounted) return;
      setState(() {
        _currentSubscription = subscription;
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Abonnements'),
        centerTitle: true,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.error_outline, size: 64, color: Colors.red),
                      const SizedBox(height: 16),
                      Text('Erreur: $_error'),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: _loadSubscription,
                        child: const Text('Réessayer'),
                      ),
                    ],
                  ),
                )
              : SingleChildScrollView(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (_currentSubscription != null)
                        _buildCurrentSubscription(),
                      const SizedBox(height: 24),
                      _buildPlansSection(),
                    ],
                  ),
                ),
    );
  }

  Widget _buildCurrentSubscription() {
    final subscription = _currentSubscription!;
    final isActive = subscription.status == 'active';
    final endDate = subscription.endDate;

    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: isActive
              ? [Colors.green.shade400, Colors.green.shade600]
              : [Colors.grey.shade400, Colors.grey.shade600],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.1),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  isActive ? Icons.check_circle : Icons.info_outline,
                  color: Colors.white,
                  size: 32,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Abonnement ${subscription.planName ?? 'Actuel'}',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      isActive ? 'Actif' : subscription.status.toUpperCase(),
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          if (endDate != null) ...[
            Row(
              children: [
                const Icon(Icons.calendar_today, color: Colors.white, size: 16),
                const SizedBox(width: 8),
                Text(
                  'Expire le ${DateFormat('dd/MM/yyyy').format(endDate)}',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 14,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
          ],
          if (subscription.creditsPerMonth != null)
            Row(
              children: [
                const Icon(Icons.stars, color: Colors.white, size: 16),
                const SizedBox(width: 8),
                Text(
                  '${subscription.creditsPerMonth} crédits/mois',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 14,
                  ),
                ),
              ],
            ),
          if (subscription.autoRenew == true) ...[
            const SizedBox(height: 12),
            Row(
              children: [
                const Icon(Icons.sync, color: Colors.white, size: 16),
                const SizedBox(width: 8),
                const Text(
                  'Renouvellement automatique activé',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 14,
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildPlansSection() {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Plans disponibles',
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Choisissez le plan qui correspond à vos besoins',
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey,
            ),
          ),
          const SizedBox(height: 24),
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _plans.length,
            itemBuilder: (context, index) {
              return _buildPlanCard(_plans[index]);
            },
          ),
        ],
      ),
    );
  }

  Widget _buildPlanCard(Map<String, dynamic> plan) {
    final isCurrentPlan = _currentSubscription?.planName?.toLowerCase() == 
                          plan['name'].toString().toLowerCase();
    final isPopular = plan['popular'] == true;

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        border: Border.all(
          color: isCurrentPlan 
              ? Colors.green 
              : isPopular 
                  ? plan['color'] 
                  : Colors.grey.shade300,
          width: isCurrentPlan || isPopular ? 2 : 1,
        ),
        borderRadius: BorderRadius.circular(16),
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: [
          if (isPopular)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 8),
              decoration: BoxDecoration(
                color: plan['color'],
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(16),
                  topRight: Radius.circular(16),
                ),
              ),
              child: const Text(
                '⭐ POPULAIRE',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                ),
              ),
            ),
          Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: plan['color'].withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(
                        plan['icon'],
                        color: plan['color'],
                        size: 32,
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Text(
                                plan['name'],
                                style: const TextStyle(
                                  fontSize: 22,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              if (isCurrentPlan) ...[
                                const SizedBox(width: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 8,
                                    vertical: 4,
                                  ),
                                  decoration: BoxDecoration(
                                    color: Colors.green,
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: const Text(
                                    'ACTUEL',
                                    style: TextStyle(
                                      color: Colors.white,
                                      fontSize: 10,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                              ],
                            ],
                          ),
                          const SizedBox(height: 4),
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text(
                                '${plan['price'].toStringAsFixed(2)}€',
                                style: TextStyle(
                                  fontSize: 28,
                                  fontWeight: FontWeight.bold,
                                  color: plan['color'],
                                ),
                              ),
                              const SizedBox(width: 4),
                              Text(
                                '/${plan['period'] == 'month' ? 'mois' : 'an'}',
                                style: const TextStyle(
                                  fontSize: 14,
                                  color: Colors.grey,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                ...plan['features'].map<Widget>((feature) {
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Row(
                      children: [
                        Icon(
                          Icons.check_circle,
                          color: plan['color'],
                          size: 20,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            feature,
                            style: const TextStyle(fontSize: 14),
                          ),
                        ),
                      ],
                    ),
                  );
                }).toList(),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: isCurrentPlan
                        ? null
                        : () => _handleSubscribe(plan['id']),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: isCurrentPlan ? Colors.grey : plan['color'],
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      elevation: isCurrentPlan ? 0 : 2,
                    ),
                    child: Text(
                      isCurrentPlan ? 'Plan actuel' : 'Choisir ce plan',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
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

  Future<void> _handleSubscribe(String planId) async {
    // Afficher un dialogue informatif
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Abonnement'),
        content: const Text(
          'Le système de paiement en ligne sera disponible prochainement.\n\n'
          'Pour souscrire à un abonnement dès maintenant, contactez-nous :\n'
          '• Email : contact@checksfleet.com\n'
          '• Tél : +33 6 83 39 74 61',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Fermer'),
          ),
        ],
      ),
    );
  }
}
