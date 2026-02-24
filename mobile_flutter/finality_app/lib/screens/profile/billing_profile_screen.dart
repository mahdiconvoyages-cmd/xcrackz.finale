import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../main.dart';

/// Profil de Facturation — Page dédiée (style Premium)
///
/// Champs : Logo, Raison sociale, SIRET, Adresse, CP, Ville,
///          Email facturation, IBAN (opt), TVA (opt), Conditions de paiement.
///
/// Stocké dans profiles.billing_meta JSONB.
/// Requis AVANT d'accéder au CRM / Facturation.
class BillingProfileScreen extends StatefulWidget {
  const BillingProfileScreen({super.key});

  @override
  State<BillingProfileScreen> createState() => _BillingProfileScreenState();
}

class _BillingProfileScreenState extends State<BillingProfileScreen> {
  bool _loading = true;
  bool _saving = false;
  bool _success = false;
  String? _error;

  final _formKey = GlobalKey<FormState>();
  final _companyNameCtrl = TextEditingController();
  final _siretCtrl = TextEditingController();
  final _addressCtrl = TextEditingController();
  final _postalCodeCtrl = TextEditingController();
  final _cityCtrl = TextEditingController();
  final _billingEmailCtrl = TextEditingController();
  final _ibanCtrl = TextEditingController();
  final _tvaCtrl = TextEditingController();

  String _paymentTerms = 'Paiement à réception';
  final _paymentOptions = [
    'Paiement à réception',
    'Net 15 jours',
    'Net 30 jours',
    'Net 45 jours',
    'Net 60 jours',
  ];

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  @override
  void dispose() {
    _companyNameCtrl.dispose();
    _siretCtrl.dispose();
    _addressCtrl.dispose();
    _postalCodeCtrl.dispose();
    _cityCtrl.dispose();
    _billingEmailCtrl.dispose();
    _ibanCtrl.dispose();
    _tvaCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadProfile() async {
    setState(() => _loading = true);
    try {
      final userId = supabase.auth.currentUser?.id;
      if (userId == null) return;

      final data = await supabase
          .from('profiles')
          .select('company_name, company_siret, address, billing_meta')
          .eq('id', userId)
          .maybeSingle();

      if (data != null) {
        final meta = (data['billing_meta'] as Map<String, dynamic>?) ?? {};
        _companyNameCtrl.text = data['company_name'] ?? '';
        _siretCtrl.text = data['company_siret'] ?? '';
        _addressCtrl.text = meta['billing_address'] ?? data['address'] ?? '';
        _postalCodeCtrl.text = meta['billing_postal_code'] ?? '';
        _cityCtrl.text = meta['billing_city'] ?? '';
        _billingEmailCtrl.text = meta['billing_email'] ?? '';
        _ibanCtrl.text = meta['iban'] ?? '';
        _tvaCtrl.text = meta['tva_number'] ?? '';
        _paymentTerms = meta['payment_terms'] ?? 'Paiement à réception';
      }
    } catch (e) {
      debugPrint('Erreur chargement profil: $e');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  int get _completionPercent {
    int filled = 0;
    if (_companyNameCtrl.text.trim().isNotEmpty) filled++;
    if (_siretCtrl.text.trim().isNotEmpty) filled++;
    if (_addressCtrl.text.trim().isNotEmpty) filled++;
    if (_postalCodeCtrl.text.trim().isNotEmpty) filled++;
    if (_cityCtrl.text.trim().isNotEmpty) filled++;
    if (_billingEmailCtrl.text.trim().isNotEmpty) filled++;
    return ((filled / 6) * 100).round();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _saving = true;
      _error = null;
      _success = false;
    });

    try {
      final userId = supabase.auth.currentUser?.id;
      if (userId == null) throw Exception('Non connecté');

      final billingMeta = {
        'billing_address': _addressCtrl.text.trim(),
        'billing_postal_code': _postalCodeCtrl.text.trim(),
        'billing_city': _cityCtrl.text.trim(),
        'billing_email': _billingEmailCtrl.text.trim(),
        'iban': _ibanCtrl.text.trim(),
        'tva_number': _tvaCtrl.text.trim(),
        'payment_terms': _paymentTerms,
        'billing_profile_complete': true,
        'updated_at': DateTime.now().toIso8601String(),
      };

      await supabase.from('profiles').update({
        'company_name': _companyNameCtrl.text.trim(),
        'company_siret': _siretCtrl.text.replaceAll(' ', ''),
        'address': _addressCtrl.text.trim(),
        'billing_meta': billingMeta,
      }).eq('id', userId);

      setState(() => _success = true);
      Future.delayed(const Duration(seconds: 3), () {
        if (mounted) setState(() => _success = false);
      });
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('Profil Facturation'),
          backgroundColor: Colors.white,
          foregroundColor: Colors.black87,
          elevation: 0,
        ),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    final pct = _completionPercent;

    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        title: const Text(
          'Profil de Facturation',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        elevation: 0,
        backgroundColor: Colors.white,
        foregroundColor: Colors.black87,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // ── Completion bar ──
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.grey[200]!),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Complétion du profil',
                          style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                        ),
                        Text(
                          '$pct%',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: pct == 100
                                ? const Color(0xFF10B981)
                                : const Color(0xFF0066FF),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: LinearProgressIndicator(
                        value: pct / 100,
                        backgroundColor: Colors.grey[200],
                        color: pct == 100
                            ? const Color(0xFF10B981)
                            : pct >= 50
                                ? const Color(0xFF0066FF)
                                : const Color(0xFFF59E0B),
                        minHeight: 6,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      pct < 100
                          ? '⚠️ Complétez pour accéder au CRM et à la facturation'
                          : '✓ Profil complet — CRM et facturation débloqués',
                      style: TextStyle(
                        fontSize: 12,
                        color: pct == 100
                            ? const Color(0xFF10B981)
                            : const Color(0xFFF59E0B),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // ── Alerts ──
              if (_error != null)
                Container(
                  padding: const EdgeInsets.all(12),
                  margin: const EdgeInsets.only(bottom: 12),
                  decoration: BoxDecoration(
                    color: Colors.red[50],
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.red[200]!),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.error_outline, color: Colors.red, size: 20),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _error!,
                          style: const TextStyle(fontSize: 13, color: Colors.red),
                        ),
                      ),
                    ],
                  ),
                ),
              if (_success)
                Container(
                  padding: const EdgeInsets.all(12),
                  margin: const EdgeInsets.only(bottom: 12),
                  decoration: BoxDecoration(
                    color: Colors.green[50],
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.green[200]!),
                  ),
                  child: const Row(
                    children: [
                      Icon(Icons.check_circle, color: Color(0xFF10B981), size: 20),
                      SizedBox(width: 8),
                      Text(
                        'Profil enregistré avec succès !',
                        style: TextStyle(fontSize: 13, color: Color(0xFF065F46)),
                      ),
                    ],
                  ),
                ),

              // ── Section 1: Identité ──
              _buildSection(
                icon: Icons.business,
                iconColor: const Color(0xFF0066FF),
                title: 'Identité entreprise',
                children: [
                  _buildField(
                    controller: _companyNameCtrl,
                    label: 'Raison sociale *',
                    icon: Icons.badge,
                    hint: 'Ma Société SAS',
                    validator: (v) => (v == null || v.trim().isEmpty)
                        ? 'Raison sociale requise'
                        : null,
                  ),
                  const SizedBox(height: 12),
                  _buildField(
                    controller: _siretCtrl,
                    label: 'SIRET *',
                    icon: Icons.numbers,
                    hint: '123 456 789 00012',
                    maxLength: 17,
                    keyboardType: TextInputType.number,
                    validator: (v) {
                      if (v == null || v.trim().isEmpty) return 'SIRET requis';
                      final clean = v.replaceAll(' ', '');
                      if (clean.length != 14) return '14 chiffres requis';
                      if (!RegExp(r'^\d{14}$').hasMatch(clean)) {
                        return 'SIRET invalide';
                      }
                      return null;
                    },
                    helperText: '14 chiffres — vérification automatique',
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // ── Section 2: Adresse ──
              _buildSection(
                icon: Icons.location_on,
                iconColor: const Color(0xFF14B8A6),
                title: 'Adresse du siège',
                children: [
                  _buildField(
                    controller: _addressCtrl,
                    label: 'Adresse *',
                    icon: Icons.home,
                    hint: '123 rue de la Paix',
                    validator: (v) => (v == null || v.trim().isEmpty)
                        ? 'Adresse requise'
                        : null,
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        flex: 2,
                        child: _buildField(
                          controller: _postalCodeCtrl,
                          label: 'Code postal *',
                          icon: Icons.pin_drop,
                          hint: '75001',
                          maxLength: 5,
                          keyboardType: TextInputType.number,
                          validator: (v) => (v == null || v.trim().isEmpty)
                              ? 'Requis'
                              : null,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        flex: 3,
                        child: _buildField(
                          controller: _cityCtrl,
                          label: 'Ville *',
                          icon: Icons.location_city,
                          hint: 'Paris',
                          validator: (v) => (v == null || v.trim().isEmpty)
                              ? 'Ville requise'
                              : null,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // ── Section 3: Contact facturation ──
              _buildSection(
                icon: Icons.email,
                iconColor: const Color(0xFFF59E0B),
                title: 'Contact facturation',
                children: [
                  _buildField(
                    controller: _billingEmailCtrl,
                    label: 'Email de facturation *',
                    icon: Icons.alternate_email,
                    hint: 'facturation@masociete.fr',
                    keyboardType: TextInputType.emailAddress,
                    validator: (v) {
                      if (v == null || v.trim().isEmpty) return 'Email requis';
                      if (!RegExp(r'^[^@]+@[^@]+\.[^@]+').hasMatch(v)) {
                        return 'Email invalide';
                      }
                      return null;
                    },
                    helperText: 'Apparaîtra sur vos documents',
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // ── Section 4: Bancaire & TVA ──
              _buildSection(
                icon: Icons.credit_card,
                iconColor: const Color(0xFF10B981),
                title: 'Bancaire & TVA',
                badge: 'Optionnel',
                children: [
                  _buildField(
                    controller: _ibanCtrl,
                    label: 'IBAN',
                    icon: Icons.account_balance,
                    hint: 'FR76 1234 5678 9012 3456 7890 123',
                    helperText: 'Apparaîtra sur vos factures',
                  ),
                  const SizedBox(height: 12),
                  _buildField(
                    controller: _tvaCtrl,
                    label: 'N° TVA intracommunautaire',
                    icon: Icons.receipt_long,
                    hint: 'FR 12 345678901',
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    value: _paymentTerms,
                    decoration: InputDecoration(
                      labelText: 'Conditions de paiement',
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      prefixIcon: const Icon(Icons.timer),
                    ),
                    items: _paymentOptions
                        .map((o) => DropdownMenuItem(value: o, child: Text(o)))
                        .toList(),
                    onChanged: (v) => setState(() => _paymentTerms = v!),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // ── Save button ──
              ElevatedButton(
                onPressed: _saving ? null : _save,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF0066FF),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.all(16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  elevation: 2,
                  disabledBackgroundColor: Colors.grey[300],
                ),
                child: _saving
                    ? const SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(
                          color: Colors.white,
                          strokeWidth: 2.5,
                        ),
                      )
                    : const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.save, size: 20),
                          SizedBox(width: 8),
                          Text(
                            'Enregistrer le profil',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
              ),
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }

  // ── Helpers ──

  Widget _buildSection({
    required IconData icon,
    required Color iconColor,
    required String title,
    required List<Widget> children,
    String? badge,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey[200]!),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: iconColor, size: 20),
              const SizedBox(width: 8),
              Text(
                title,
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.bold,
                ),
              ),
              if (badge != null) ...[
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 2,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.grey[100],
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    badge,
                    style: TextStyle(fontSize: 11, color: Colors.grey[500]),
                  ),
                ),
              ],
            ],
          ),
          const SizedBox(height: 16),
          ...children,
        ],
      ),
    );
  }

  Widget _buildField({
    required TextEditingController controller,
    required String label,
    required IconData icon,
    String? hint,
    String? helperText,
    int? maxLength,
    TextInputType? keyboardType,
    String? Function(String?)? validator,
  }) {
    return TextFormField(
      controller: controller,
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        helperText: helperText,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
        prefixIcon: Icon(icon),
        counterText: '',
      ),
      maxLength: maxLength,
      keyboardType: keyboardType,
      validator: validator,
      onChanged: (_) => setState(() {}),
    );
  }
}

/// Vérifie si le profil de facturation est complet.
/// Usage: `final complete = await BillingProfileHelper.isComplete();`
class BillingProfileHelper {
  static Future<bool> isComplete() async {
    try {
      final userId = Supabase.instance.client.auth.currentUser?.id;
      if (userId == null) return false;

      final data = await Supabase.instance.client
          .from('profiles')
          .select('company_name, company_siret, billing_meta')
          .eq('id', userId)
          .maybeSingle();

      if (data == null) return false;
      final meta = (data['billing_meta'] as Map<String, dynamic>?) ?? {};

      return (data['company_name'] ?? '').toString().trim().isNotEmpty &&
          (data['company_siret'] ?? '').toString().trim().isNotEmpty &&
          (meta['billing_address'] ?? '').toString().trim().isNotEmpty &&
          (meta['billing_postal_code'] ?? '').toString().trim().isNotEmpty &&
          (meta['billing_city'] ?? '').toString().trim().isNotEmpty &&
          (meta['billing_email'] ?? '').toString().trim().isNotEmpty;
    } catch (_) {
      return false;
    }
  }
}
