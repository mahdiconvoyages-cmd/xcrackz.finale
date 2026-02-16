import 'package:flutter/material.dart';
import '../screens/profile/billing_profile_screen.dart';

/// Widget qui bloque l'accès au contenu tant que le profil
/// de facturation n'est pas complet. Affiche un écran d'incitation.
class BillingGate extends StatefulWidget {
  final Widget child;
  const BillingGate({super.key, required this.child});

  @override
  State<BillingGate> createState() => _BillingGateState();
}

class _BillingGateState extends State<BillingGate> {
  bool _loading = true;
  bool _complete = false;

  @override
  void initState() {
    super.initState();
    _check();
  }

  Future<void> _check() async {
    final ok = await BillingProfileHelper.isComplete();
    if (mounted) {
      setState(() {
        _complete = ok;
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (!_complete) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 72,
                height: 72,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF0066FF), Color(0xFF5B8DEF)],
                  ),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: const Icon(
                  Icons.description_rounded,
                  color: Colors.white,
                  size: 36,
                ),
              ),
              const SizedBox(height: 24),
              const Text(
                'Profil de facturation requis',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 12),
              Text(
                'Complétez votre profil de facturation (raison sociale, SIRET, adresse...) pour accéder au CRM et à la facturation.',
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.grey[600],
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 28),
              ElevatedButton.icon(
                onPressed: () async {
                  await Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => const BillingProfileScreen(),
                    ),
                  );
                  // Re-check after returning
                  _check();
                },
                icon: const Icon(Icons.arrow_forward, size: 20),
                label: const Text(
                  'Compléter mon profil',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF0066FF),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 24,
                    vertical: 14,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  elevation: 2,
                ),
              ),
            ],
          ),
        ),
      );
    }

    return widget.child;
  }
}
