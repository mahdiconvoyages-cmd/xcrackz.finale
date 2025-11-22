import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class ScanVINScreen extends StatefulWidget {
  const ScanVINScreen({super.key});

  @override
  State<ScanVINScreen> createState() => _ScanVINScreenState();
}

class _ScanVINScreenState extends State<ScanVINScreen> {
  final _vinController = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _isValidating = false;

  @override
  void dispose() {
    _vinController.dispose();
    super.dispose();
  }

  String? _validateVIN(String? value) {
    if (value == null || value.isEmpty) {
      return 'VIN requis';
    }

    // Remove spaces and convert to uppercase
    final vin = value.replaceAll(' ', '').toUpperCase();

    // VIN must be exactly 17 characters
    if (vin.length != 17) {
      return 'Le VIN doit contenir exactement 17 caractères';
    }

    // VIN cannot contain I, O, or Q
    if (vin.contains(RegExp(r'[IOQ]'))) {
      return 'Le VIN ne peut pas contenir I, O ou Q';
    }

    // VIN should only contain alphanumeric characters
    if (!RegExp(r'^[A-HJ-NPR-Z0-9]{17}$').hasMatch(vin)) {
      return 'VIN invalide';
    }

    return null;
  }

  Map<String, String> _decodeVIN(String vin) {
    final vinUpper = vin.toUpperCase();
    
    return {
      'vin': vinUpper,
      'wmi': vinUpper.substring(0, 3), // World Manufacturer Identifier
      'vds': vinUpper.substring(3, 9), // Vehicle Descriptor Section
      'vis': vinUpper.substring(9, 17), // Vehicle Identifier Section
      'year_code': vinUpper[9], // Model year
      'plant_code': vinUpper[10], // Manufacturing plant
      'serial': vinUpper.substring(11, 17), // Serial number
    };
  }

  Future<void> _submitVIN() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isValidating = true);

    // Simulate validation delay
    await Future.delayed(const Duration(milliseconds: 500));

    if (!mounted) return;

    final vin = _vinController.text.replaceAll(' ', '').toUpperCase();
    final decodedVIN = _decodeVIN(vin);

    setState(() => _isValidating = false);

    Navigator.pop(context, decodedVIN);
  }

  void _pasteFromClipboard() async {
    final clipboardData = await Clipboard.getData('text/plain');
    if (clipboardData?.text != null) {
      _vinController.text = clipboardData!.text!;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Scanner VIN'),
        actions: [
          IconButton(
            icon: const Icon(Icons.info_outline),
            onPressed: () {
              showDialog(
                context: context,
                builder: (context) => AlertDialog(
                  title: const Text('À propos du VIN'),
                  content: const SingleChildScrollView(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          'Le VIN (Vehicle Identification Number) est un code unique de 17 caractères qui identifie chaque véhicule.',
                          style: TextStyle(fontSize: 14),
                        ),
                        SizedBox(height: 16),
                        Text(
                          'Où trouver le VIN ?',
                          style: TextStyle(fontWeight: FontWeight.bold),
                        ),
                        SizedBox(height: 8),
                        Text('• Carte grise (certificat d\'immatriculation)'),
                        Text('• Pare-brise côté conducteur'),
                        Text('• Montant de porte côté conducteur'),
                        Text('• Compartiment moteur'),
                        SizedBox(height: 16),
                        Text(
                          'Le VIN ne contient jamais les lettres I, O ou Q.',
                          style: TextStyle(
                            fontSize: 12,
                            fontStyle: FontStyle.italic,
                          ),
                        ),
                      ],
                    ),
                  ),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.pop(context),
                      child: const Text('Fermer'),
                    ),
                  ],
                ),
              );
            },
            tooltip: 'Informations',
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Illustration
              Container(
                height: 200,
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.primaryContainer,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.directions_car,
                      size: 80,
                      color: Theme.of(context).colorScheme.onPrimaryContainer,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Saisissez le VIN du véhicule',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: Theme.of(context).colorScheme.onPrimaryContainer,
                      ),
                    ),
                  ],
                ),
              ),
              
              const SizedBox(height: 32),
              
              // VIN input
              TextFormField(
                controller: _vinController,
                decoration: InputDecoration(
                  labelText: 'Numéro VIN',
                  hintText: 'Ex: 1HGBH41JXMN109186',
                  border: const OutlineInputBorder(),
                  prefixIcon: const Icon(Icons.pin),
                  suffixIcon: IconButton(
                    icon: const Icon(Icons.content_paste),
                    onPressed: _pasteFromClipboard,
                    tooltip: 'Coller',
                  ),
                ),
                textCapitalization: TextCapitalization.characters,
                maxLength: 17,
                validator: _validateVIN,
                inputFormatters: [
                  FilteringTextInputFormatter.allow(RegExp(r'[A-HJ-NPR-Z0-9]')),
                  UpperCaseTextFormatter(),
                ],
                style: const TextStyle(
                  fontSize: 18,
                  letterSpacing: 2,
                  fontFamily: 'monospace',
                ),
              ),
              
              const SizedBox(height: 16),
              
              // Info card
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(
                            Icons.lightbulb_outline,
                            color: Theme.of(context).colorScheme.primary,
                          ),
                          const SizedBox(width: 8),
                          Text(
                            'Conseils',
                            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                  fontWeight: FontWeight.bold,
                                ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      const Text('• Le VIN contient exactement 17 caractères'),
                      const Text('• Pas de lettres I, O ou Q dans un VIN'),
                      const Text('• Vérifiez deux fois pour éviter les erreurs'),
                    ],
                  ),
                ),
              ),
              
              const SizedBox(height: 32),
              
              // Submit button
              FilledButton.icon(
                onPressed: _isValidating ? null : _submitVIN,
                icon: _isValidating
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Icon(Icons.check),
                label: Text(_isValidating ? 'Validation...' : 'Valider le VIN'),
                style: FilledButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class UpperCaseTextFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    return TextEditingValue(
      text: newValue.text.toUpperCase(),
      selection: newValue.selection,
    );
  }
}
