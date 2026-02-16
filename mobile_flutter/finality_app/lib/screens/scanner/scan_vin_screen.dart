import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../theme/premium_theme.dart';

/// VIN Scanner / Input — PremiumTheme Light Design
class ScanVINScreen extends StatefulWidget {
  const ScanVINScreen({super.key});

  @override
  State<ScanVINScreen> createState() => _ScanVINScreenState();
}

class _ScanVINScreenState extends State<ScanVINScreen> {
  final _ctl = TextEditingController();
  final _key = GlobalKey<FormState>();
  bool _busy = false;

  @override
  void dispose() {
    _ctl.dispose();
    super.dispose();
  }

  String? _validate(String? v) {
    if (v == null || v.isEmpty) return 'VIN requis';
    final vin = v.replaceAll(' ', '').toUpperCase();
    if (vin.length != 17) return 'Le VIN doit contenir 17 caracteres';
    if (vin.contains(RegExp(r'[IOQ]'))) return 'Le VIN ne peut contenir I, O ou Q';
    if (!RegExp(r'^[A-HJ-NPR-Z0-9]{17}$').hasMatch(vin)) return 'VIN invalide';
    return null;
  }

  Map<String, String> _decode(String vin) {
    final v = vin.toUpperCase();
    return {
      'vin': v,
      'wmi': v.substring(0, 3),
      'vds': v.substring(3, 9),
      'vis': v.substring(9, 17),
      'year_code': v[9],
      'plant_code': v[10],
      'serial': v.substring(11, 17),
    };
  }

  Future<void> _submit() async {
    if (!_key.currentState!.validate()) return;
    setState(() => _busy = true);
    await Future.delayed(const Duration(milliseconds: 400));
    if (!mounted) return;
    final vin = _ctl.text.replaceAll(' ', '').toUpperCase();
    setState(() => _busy = false);
    Navigator.pop(context, _decode(vin));
  }

  Future<void> _paste() async {
    final data = await Clipboard.getData('text/plain');
    if (data?.text != null) _ctl.text = data!.text!;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: PremiumTheme.lightBg,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        foregroundColor: PremiumTheme.textPrimary,
        title: const Text('Scanner VIN',
            style: TextStyle(fontWeight: FontWeight.w700)),
        actions: [
          IconButton(
            icon: const Icon(Icons.info_outline_rounded),
            tooltip: 'Informations',
            onPressed: _showInfo,
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _key,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Hero illustration
              Container(
                padding: const EdgeInsets.symmetric(vertical: 32),
                decoration: BoxDecoration(
                  gradient: PremiumTheme.tealGradient,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Column(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(18),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: .15),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.directions_car_rounded,
                          color: Colors.white, size: 48),
                    ),
                    const SizedBox(height: 16),
                    const Text('Saisissez le VIN du vehicule',
                        style: TextStyle(
                            color: Colors.white,
                            fontSize: 18,
                            fontWeight: FontWeight.w700)),
                    const SizedBox(height: 6),
                    Text('17 caracteres alphanumeriques',
                        style: TextStyle(
                            color: Colors.white.withValues(alpha: .7),
                            fontSize: 13)),
                  ],
                ),
              ),

              const SizedBox(height: 28),

              // VIN input
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                        color: Colors.black.withValues(alpha: .04),
                        blurRadius: 12,
                        offset: const Offset(0, 4)),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color:
                                PremiumTheme.primaryBlue.withValues(alpha: .1),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: const Icon(Icons.pin_rounded,
                              color: PremiumTheme.primaryBlue, size: 20),
                        ),
                        const SizedBox(width: 10),
                        const Text('Numero VIN',
                            style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w700,
                                color: PremiumTheme.textPrimary)),
                      ],
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _ctl,
                      validator: _validate,
                      textCapitalization: TextCapitalization.characters,
                      maxLength: 17,
                      inputFormatters: [
                        FilteringTextInputFormatter.allow(
                            RegExp(r'[A-HJ-NPR-Z0-9a-hj-npr-z0-9]')),
                        _UpperCaseFmt(),
                      ],
                      style: const TextStyle(
                        fontSize: 20,
                        letterSpacing: 3,
                        fontWeight: FontWeight.w700,
                        fontFamily: 'monospace',
                        color: PremiumTheme.textPrimary,
                      ),
                      decoration: InputDecoration(
                        hintText: '1HGBH41JXMN109186',
                        hintStyle: TextStyle(
                          color: PremiumTheme.textTertiary.withValues(alpha: .5),
                          fontSize: 18,
                          letterSpacing: 2,
                        ),
                        filled: true,
                        fillColor: PremiumTheme.lightBg,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide.none,
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(
                              color: PremiumTheme.primaryBlue, width: 2),
                        ),
                        errorBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(
                              color: PremiumTheme.accentRed, width: 1.5),
                        ),
                        contentPadding: const EdgeInsets.symmetric(
                            horizontal: 16, vertical: 16),
                        suffixIcon: IconButton(
                          icon: const Icon(Icons.content_paste_rounded,
                              color: PremiumTheme.primaryTeal),
                          tooltip: 'Coller',
                          onPressed: _paste,
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 20),

              // Tips card
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: PremiumTheme.accentAmber.withValues(alpha: .08),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                      color: PremiumTheme.accentAmber.withValues(alpha: .2)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.lightbulb_rounded,
                            color: PremiumTheme.accentAmber, size: 20),
                        const SizedBox(width: 8),
                        const Text('Conseils',
                            style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                                color: PremiumTheme.textPrimary)),
                      ],
                    ),
                    const SizedBox(height: 10),
                    _tip('Le VIN contient exactement 17 caracteres'),
                    _tip('Pas de lettres I, O ou Q dans un VIN'),
                    _tip('Verifiez deux fois pour eviter les erreurs'),
                  ],
                ),
              ),

              const SizedBox(height: 28),

              // Submit button
              SizedBox(
                height: 52,
                child: ElevatedButton.icon(
                  onPressed: _busy ? null : _submit,
                  icon: _busy
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: Colors.white),
                        )
                      : const Icon(Icons.check_circle_rounded,
                          color: Colors.white),
                  label: Text(
                    _busy ? 'Validation...' : 'Valider le VIN',
                    style: const TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.w700),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: PremiumTheme.primaryTeal,
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14)),
                    elevation: 0,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _tip(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('  •  ',
              style:
                  TextStyle(color: PremiumTheme.textSecondary, fontSize: 13)),
          Expanded(
            child: Text(text,
                style: const TextStyle(
                    color: PremiumTheme.textSecondary, fontSize: 13)),
          ),
        ],
      ),
    );
  }

  void _showInfo() {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: Colors.white,
        shape:
            RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: PremiumTheme.primaryTeal.withValues(alpha: .1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.info_rounded,
                  color: PremiumTheme.primaryTeal, size: 22),
            ),
            const SizedBox(width: 10),
            const Text('A propos du VIN',
                style: TextStyle(
                    fontSize: 17, fontWeight: FontWeight.w700)),
          ],
        ),
        content: const SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'Le VIN (Vehicle Identification Number) est un code unique de 17 caracteres qui identifie chaque vehicule.',
                style: TextStyle(fontSize: 14, color: PremiumTheme.textSecondary),
              ),
              SizedBox(height: 16),
              Text('Ou trouver le VIN ?',
                  style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
              SizedBox(height: 8),
              Text('• Carte grise', style: TextStyle(fontSize: 13, color: PremiumTheme.textSecondary)),
              Text('• Pare-brise cote conducteur', style: TextStyle(fontSize: 13, color: PremiumTheme.textSecondary)),
              Text('• Montant de porte cote conducteur', style: TextStyle(fontSize: 13, color: PremiumTheme.textSecondary)),
              Text('• Compartiment moteur', style: TextStyle(fontSize: 13, color: PremiumTheme.textSecondary)),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Fermer',
                style: TextStyle(color: PremiumTheme.primaryTeal)),
          ),
        ],
      ),
    );
  }
}

class _UpperCaseFmt extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(
          TextEditingValue old, TextEditingValue val) =>
      TextEditingValue(
        text: val.text.toUpperCase(),
        selection: val.selection,
      );
}
