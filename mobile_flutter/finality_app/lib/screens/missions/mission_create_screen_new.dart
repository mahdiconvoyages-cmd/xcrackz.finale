import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:intl/intl.dart';
import '../../services/address_autocomplete_service.dart';
import '../../theme/premium_theme.dart';

/// Écran de création de mission identique au web
/// Design moderne et responsive pour Samsung Android
class MissionCreateScreenNew extends StatefulWidget {
  const MissionCreateScreenNew({super.key});

  @override
  State<MissionCreateScreenNew> createState() => _MissionCreateScreenNewState();
}

class _MissionCreateScreenNewState extends State<MissionCreateScreenNew> {
  final _formKey = GlobalKey<FormState>();
  final supabase = Supabase.instance.client;
  final AddressAutocompleteService _addressService = AddressAutocompleteService();
  
  bool _isLoading = false;
  int _currentStep = 0;

  // Étape 1: Informations véhicule
  final _brandController = TextEditingController();
  final _modelController = TextEditingController();
  final _plateController = TextEditingController();
  final _vinController = TextEditingController();
  String _vehicleType = 'VL'; // VL, VU, PL
  int? _vehicleYear;

  // Étape 2: Départ
  final _pickupAddressController = TextEditingController();
  double? _pickupLat;
  double? _pickupLng;
  DateTime? _pickupDate;
  TimeOfDay? _pickupTime;
  final _pickupContactNameController = TextEditingController();
  final _pickupContactPhoneController = TextEditingController();

  // Étape 3: Arrivée
  final _deliveryAddressController = TextEditingController();
  double? _deliveryLat;
  double? _deliveryLng;
  DateTime? _deliveryDate;
  TimeOfDay? _deliveryTime;
  final _deliveryContactNameController = TextEditingController();
  final _deliveryContactPhoneController = TextEditingController();

  // Étape 4: Détails supplémentaires
  final _clientNameController = TextEditingController();
  final _clientPhoneController = TextEditingController();
  final _clientEmailController = TextEditingController();
  final _priceController = TextEditingController();
  final _notesController = TextEditingController();
  final _specialInstructionsController = TextEditingController();

  @override
  void dispose() {
    _brandController.dispose();
    _modelController.dispose();
    _plateController.dispose();
    _vinController.dispose();
    _pickupAddressController.dispose();
    _pickupContactNameController.dispose();
    _pickupContactPhoneController.dispose();
    _deliveryAddressController.dispose();
    _deliveryContactNameController.dispose();
    _deliveryContactPhoneController.dispose();
    _clientNameController.dispose();
    _clientPhoneController.dispose();
    _clientEmailController.dispose();
    _priceController.dispose();
    _notesController.dispose();
    _specialInstructionsController.dispose();
    super.dispose();
  }

  bool _canProceed() {
    switch (_currentStep) {
      case 0: // Véhicule
        return _brandController.text.isNotEmpty &&
            _modelController.text.isNotEmpty;
      case 1: // Départ
        return _pickupAddressController.text.isNotEmpty &&
            _pickupLat != null &&
            _pickupDate != null;
      case 2: // Arrivée
        return _deliveryAddressController.text.isNotEmpty &&
            _deliveryLat != null &&
            _deliveryDate != null;
      case 3: // Détails
        return true; // Optionnel
      default:
        return false;
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate() || !_canProceed()) {
      _showError('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setState(() => _isLoading = true);

    try {
      final userId = supabase.auth.currentUser?.id;
      if (userId == null) throw 'Non authentifié';

      // Combiner date et heure
      DateTime? pickupDateTime;
      if (_pickupDate != null && _pickupTime != null) {
        pickupDateTime = DateTime(
          _pickupDate!.year,
          _pickupDate!.month,
          _pickupDate!.day,
          _pickupTime!.hour,
          _pickupTime!.minute,
        );
      }

      DateTime? deliveryDateTime;
      if (_deliveryDate != null && _deliveryTime != null) {
        deliveryDateTime = DateTime(
          _deliveryDate!.year,
          _deliveryDate!.month,
          _deliveryDate!.day,
          _deliveryTime!.hour,
          _deliveryTime!.minute,
        );
      }

      // Générer référence unique
      final reference = 'MSN${DateTime.now().millisecondsSinceEpoch.toString().substring(5)}';

      final missionData = {
        'user_id': userId,
        'reference': reference,
        'status': 'pending',
        'vehicle_brand': _brandController.text,
        'vehicle_model': _modelController.text,
        'vehicle_plate': _plateController.text.isNotEmpty ? _plateController.text : null,
        'vehicle_vin': _vinController.text.isNotEmpty ? _vinController.text : null,
        'vehicle_type': _vehicleType,
        'vehicle_year': _vehicleYear,
        'pickup_address': _pickupAddressController.text,
        'pickup_lat': _pickupLat,
        'pickup_lng': _pickupLng,
        'pickup_date': pickupDateTime?.toIso8601String(),
        'pickup_contact_name': _pickupContactNameController.text.isNotEmpty ? _pickupContactNameController.text : null,
        'pickup_contact_phone': _pickupContactPhoneController.text.isNotEmpty ? _pickupContactPhoneController.text : null,
        'delivery_address': _deliveryAddressController.text,
        'delivery_lat': _deliveryLat,
        'delivery_lng': _deliveryLng,
        'delivery_date': deliveryDateTime?.toIso8601String(),
        'delivery_contact_name': _deliveryContactNameController.text.isNotEmpty ? _deliveryContactNameController.text : null,
        'delivery_contact_phone': _deliveryContactPhoneController.text.isNotEmpty ? _deliveryContactPhoneController.text : null,
        'client_name': _clientNameController.text.isNotEmpty ? _clientNameController.text : null,
        'client_phone': _clientPhoneController.text.isNotEmpty ? _clientPhoneController.text : null,
        'client_email': _clientEmailController.text.isNotEmpty ? _clientEmailController.text : null,
        'price': _priceController.text.isNotEmpty ? double.tryParse(_priceController.text) : null,
        'notes': _notesController.text.isNotEmpty ? _notesController.text : null,
        'special_instructions': _specialInstructionsController.text.isNotEmpty ? _specialInstructionsController.text : null,
      };

      await supabase.from('missions').insert(missionData);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('✅ Mission créée avec succès'),
            backgroundColor: Color(0xFF10B981),
          ),
        );
        Navigator.pop(context, true);
      }
    } catch (e) {
      _showError('Erreur: $e');
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  void _showError(String message) {
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(message),
          backgroundColor: const Color(0xFFEF4444),
        ),
      );
    }
  }

  Future<void> _selectDate(BuildContext context, bool isPickup) async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: DateTime.now(),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.dark(
              primary: Color(0xFF14B8A6),
              onPrimary: Colors.white,
              surface: Color(0xFF1F2937),
              onSurface: Colors.white,
            ),
          ),
          child: child!,
        );
      },
    );

    if (picked != null) {
      setState(() {
        if (isPickup) {
          _pickupDate = picked;
        } else {
          _deliveryDate = picked;
        }
      });
    }
  }

  Future<void> _selectTime(BuildContext context, bool isPickup) async {
    final TimeOfDay? picked = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.now(),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.dark(
              primary: Color(0xFF14B8A6),
              onPrimary: Colors.white,
              surface: Color(0xFF1F2937),
              onSurface: Colors.white,
            ),
          ),
          child: child!,
        );
      },
    );

    if (picked != null) {
      setState(() {
        if (isPickup) {
          _pickupTime = picked;
        } else {
          _deliveryTime = picked;
        }
      });
    }
  }

  Future<void> _searchAddress(BuildContext context, bool isPickup) async {
    final controller = isPickup ? _pickupAddressController : _deliveryAddressController;
    
    if (controller.text.isEmpty) {
      _showError('Entrez une adresse pour rechercher');
      return;
    }

    try {
      final suggestions = await AddressAutocompleteService.searchAddresses(controller.text);
      
      if (!mounted) return;
      
      if (suggestions.isEmpty) {
        _showError('Aucune adresse trouvée');
        return;
      }

      // Afficher les résultats
      final selected = await showModalBottomSheet<AddressSuggestion>(
        context: context,
        backgroundColor: const Color(0xFF1F2937),
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        builder: (context) => Container(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Sélectionnez une adresse',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 16),
              ...suggestions.map((suggestion) => ListTile(
                leading: const Icon(Icons.location_on, color: Color(0xFF14B8A6)),
                title: Text(
                  suggestion.label,
                  style: const TextStyle(color: Colors.white),
                ),
                onTap: () => Navigator.pop(context, suggestion),
              )).toList(),
            ],
          ),
        ),
      );

      if (selected != null) {
        setState(() {
          controller.text = selected.label;
          if (isPickup) {
            _pickupLat = selected.latitude;
            _pickupLng = selected.longitude;
          } else {
            _deliveryLat = selected.latitude;
            _deliveryLng = selected.longitude;
          }
        });
      }
    } catch (e) {
      _showError('Erreur de recherche: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: Icon(Icons.close, color: PremiumTheme.textPrimary),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          'Nouvelle mission',
          style: TextStyle(
            color: PremiumTheme.textPrimary,
            fontSize: 20,
            fontWeight: FontWeight.bold,
          ),
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(56),
          child: Container(
            color: const Color(0xFF1E293B),
            child: Row(
              children: List.generate(4, (index) {
                final isActive = index == _currentStep;
                final isCompleted = index < _currentStep;
                
                return Expanded(
                  child: Container(
                    margin: const EdgeInsets.symmetric(horizontal: 4, vertical: 8),
                    child: Column(
                      children: [
                        Container(
                          height: 4,
                          decoration: BoxDecoration(
                            color: isCompleted || isActive
                                ? const Color(0xFF14B8A6)
                                : const Color(0xFF334155),
                            borderRadius: BorderRadius.circular(2),
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          _getStepTitle(index),
                          style: TextStyle(
                            color: isActive
                                ? const Color(0xFF14B8A6)
                                : Colors.white54,
                            fontSize: 11,
                            fontWeight: isActive ? FontWeight.w600 : FontWeight.normal,
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ),
                  ),
                );
              }),
            ),
          ),
        ),
      ),
      body: _isLoading
          ? const Center(
              child: CircularProgressIndicator(color: Color(0xFF14B8A6)),
            )
          : Form(
              key: _formKey,
              child: Column(
                children: [
                  Expanded(
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.all(16),
                      child: _buildStepContent(),
                    ),
                  ),
                  _buildNavigationButtons(),
                ],
              ),
            ),
    );
  }

  String _getStepTitle(int index) {
    switch (index) {
      case 0:
        return 'Véhicule';
      case 1:
        return 'Départ';
      case 2:
        return 'Arrivée';
      case 3:
        return 'Détails';
      default:
        return '';
    }
  }

  Widget _buildStepContent() {
    switch (_currentStep) {
      case 0:
        return _buildVehicleStep();
      case 1:
        return _buildPickupStep();
      case 2:
        return _buildDeliveryStep();
      case 3:
        return _buildDetailsStep();
      default:
        return const SizedBox();
    }
  }

  Widget _buildVehicleStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          '🚗 Informations du véhicule',
          style: TextStyle(
            color: Colors.white,
            fontSize: 24,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 24),

        // Type de véhicule
        const Text(
          'Type de véhicule *',
          style: TextStyle(
            color: Color(0xFF14B8A6),
            fontSize: 14,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            _buildVehicleTypeChip('VL', 'Voiture'),
            const SizedBox(width: 8),
            _buildVehicleTypeChip('VU', 'Utilitaire'),
            const SizedBox(width: 8),
            _buildVehicleTypeChip('PL', 'Poids lourd'),
          ],
        ),
        const SizedBox(height: 24),

        // Marque
        _buildTextField(
          controller: _brandController,
          label: 'Marque *',
          hint: 'Ex: Renault, Peugeot...',
          icon: Icons.directions_car,
          required: true,
        ),
        const SizedBox(height: 16),

        // Modèle
        _buildTextField(
          controller: _modelController,
          label: 'Modèle *',
          hint: 'Ex: Clio, 308...',
          icon: Icons.directions_car_outlined,
          required: true,
        ),
        const SizedBox(height: 16),

        // Immatriculation
        _buildTextField(
          controller: _plateController,
          label: 'Immatriculation',
          hint: 'Ex: AB-123-CD',
          icon: Icons.pin,
          textCapitalization: TextCapitalization.characters,
        ),
        const SizedBox(height: 16),

        // VIN
        _buildTextField(
          controller: _vinController,
          label: 'Numéro VIN',
          hint: 'Numéro de série du véhicule',
          icon: Icons.confirmation_number,
          textCapitalization: TextCapitalization.characters,
        ),
        const SizedBox(height: 16),

        // Année
        const Text(
          'Année de mise en circulation',
          style: TextStyle(
            color: Color(0xFF14B8A6),
            fontSize: 14,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 8),
        DropdownButtonFormField<int>(
          value: _vehicleYear,
          dropdownColor: const Color(0xFF1E293B),
          decoration: _inputDecoration(
            hint: 'Sélectionner l\'année',
            icon: Icons.calendar_today,
          ),
          style: const TextStyle(color: Colors.white),
          items: List.generate(
            50,
            (index) {
              final year = DateTime.now().year - index;
              return DropdownMenuItem(
                value: year,
                child: Text(year.toString()),
              );
            },
          ),
          onChanged: (value) => setState(() => _vehicleYear = value),
        ),
      ],
    );
  }

  Widget _buildPickupStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          '📍 Lieu de départ',
          style: TextStyle(
            color: Colors.white,
            fontSize: 24,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 24),

        // Adresse
        const Text(
          'Adresse de départ *',
          style: TextStyle(
            color: Color(0xFF14B8A6),
            fontSize: 14,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _pickupAddressController,
          style: const TextStyle(color: Colors.white),
          decoration: _inputDecoration(
            hint: 'Entrez une adresse...',
            icon: Icons.location_on,
          ).copyWith(
            suffixIcon: IconButton(
              icon: const Icon(Icons.search, color: Color(0xFF14B8A6)),
              onPressed: () => _searchAddress(context, true),
            ),
          ),
        ),
        if (_pickupLat != null) ...[
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFF14B8A6).withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: const Color(0xFF14B8A6).withOpacity(0.3)),
            ),
            child: Row(
              children: [
                const Icon(Icons.check_circle, color: Color(0xFF14B8A6), size: 20),
                const SizedBox(width: 8),
                const Expanded(
                  child: Text(
                    'Adresse validée',
                    style: TextStyle(color: Color(0xFF14B8A6), fontSize: 13),
                  ),
                ),
              ],
            ),
          ),
        ],
        const SizedBox(height: 24),

        // Date et heure
        Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Date *',
                    style: TextStyle(
                      color: Color(0xFF14B8A6),
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 8),
                  InkWell(
                    onTap: () => _selectDate(context, true),
                    child: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: const Color(0xFF1E293B),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFF334155)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.calendar_today, color: Color(0xFF14B8A6), size: 20),
                          const SizedBox(width: 12),
                          Text(
                            _pickupDate != null
                                ? DateFormat('dd/MM/yyyy').format(_pickupDate!)
                                : 'Sélectionner',
                            style: TextStyle(
                              color: _pickupDate != null ? Colors.white : Colors.white54,
                              fontSize: 15,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Heure',
                    style: TextStyle(
                      color: Color(0xFF14B8A6),
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 8),
                  InkWell(
                    onTap: () => _selectTime(context, true),
                    child: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: const Color(0xFF1E293B),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFF334155)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.access_time, color: Color(0xFF14B8A6), size: 20),
                          const SizedBox(width: 12),
                          Text(
                            _pickupTime != null
                                ? _pickupTime!.format(context)
                                : 'Optionnel',
                            style: TextStyle(
                              color: _pickupTime != null ? Colors.white : Colors.white54,
                              fontSize: 15,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 24),

        // Contact
        const Text(
          'Contact au départ',
          style: TextStyle(
            color: Colors.white,
            fontSize: 16,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 12),
        _buildTextField(
          controller: _pickupContactNameController,
          label: 'Nom du contact',
          hint: 'Nom complet',
          icon: Icons.person,
        ),
        const SizedBox(height: 16),
        _buildTextField(
          controller: _pickupContactPhoneController,
          label: 'Téléphone',
          hint: '06 XX XX XX XX',
          icon: Icons.phone,
          keyboardType: TextInputType.phone,
        ),
      ],
    );
  }

  Widget _buildDeliveryStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          '🎯 Lieu d\'arrivée',
          style: TextStyle(
            color: Colors.white,
            fontSize: 24,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 24),

        // Adresse
        const Text(
          'Adresse d\'arrivée *',
          style: TextStyle(
            color: Color(0xFF14B8A6),
            fontSize: 14,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _deliveryAddressController,
          style: const TextStyle(color: Colors.white),
          decoration: _inputDecoration(
            hint: 'Entrez une adresse...',
            icon: Icons.location_on,
          ).copyWith(
            suffixIcon: IconButton(
              icon: const Icon(Icons.search, color: Color(0xFF14B8A6)),
              onPressed: () => _searchAddress(context, false),
            ),
          ),
        ),
        if (_deliveryLat != null) ...[
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFF14B8A6).withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: const Color(0xFF14B8A6).withOpacity(0.3)),
            ),
            child: Row(
              children: [
                const Icon(Icons.check_circle, color: Color(0xFF14B8A6), size: 20),
                const SizedBox(width: 8),
                const Expanded(
                  child: Text(
                    'Adresse validée',
                    style: TextStyle(color: Color(0xFF14B8A6), fontSize: 13),
                  ),
                ),
              ],
            ),
          ),
        ],
        const SizedBox(height: 24),

        // Date et heure
        Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Date *',
                    style: TextStyle(
                      color: Color(0xFF14B8A6),
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 8),
                  InkWell(
                    onTap: () => _selectDate(context, false),
                    child: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: const Color(0xFF1E293B),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFF334155)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.calendar_today, color: Color(0xFF14B8A6), size: 20),
                          const SizedBox(width: 12),
                          Text(
                            _deliveryDate != null
                                ? DateFormat('dd/MM/yyyy').format(_deliveryDate!)
                                : 'Sélectionner',
                            style: TextStyle(
                              color: _deliveryDate != null ? Colors.white : Colors.white54,
                              fontSize: 15,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Heure',
                    style: TextStyle(
                      color: Color(0xFF14B8A6),
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 8),
                  InkWell(
                    onTap: () => _selectTime(context, false),
                    child: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: const Color(0xFF1E293B),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFF334155)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.access_time, color: Color(0xFF14B8A6), size: 20),
                          const SizedBox(width: 12),
                          Text(
                            _deliveryTime != null
                                ? _deliveryTime!.format(context)
                                : 'Optionnel',
                            style: TextStyle(
                              color: _deliveryTime != null ? Colors.white : Colors.white54,
                              fontSize: 15,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 24),

        // Contact
        const Text(
          'Contact à l\'arrivée',
          style: TextStyle(
            color: Colors.white,
            fontSize: 16,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 12),
        _buildTextField(
          controller: _deliveryContactNameController,
          label: 'Nom du contact',
          hint: 'Nom complet',
          icon: Icons.person,
        ),
        const SizedBox(height: 16),
        _buildTextField(
          controller: _deliveryContactPhoneController,
          label: 'Téléphone',
          hint: '06 XX XX XX XX',
          icon: Icons.phone,
          keyboardType: TextInputType.phone,
        ),
      ],
    );
  }

  Widget _buildDetailsStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          '📋 Détails supplémentaires',
          style: TextStyle(
            color: Colors.white,
            fontSize: 24,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 8),
        const Text(
          'Ces informations sont optionnelles',
          style: TextStyle(
            color: Colors.white54,
            fontSize: 14,
          ),
        ),
        const SizedBox(height: 24),

        // Informations client
        const Text(
          'Informations client',
          style: TextStyle(
            color: Colors.white,
            fontSize: 16,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 12),
        _buildTextField(
          controller: _clientNameController,
          label: 'Nom du client',
          hint: 'Nom complet',
          icon: Icons.person_outline,
        ),
        const SizedBox(height: 16),
        _buildTextField(
          controller: _clientPhoneController,
          label: 'Téléphone',
          hint: '06 XX XX XX XX',
          icon: Icons.phone_outlined,
          keyboardType: TextInputType.phone,
        ),
        const SizedBox(height: 16),
        _buildTextField(
          controller: _clientEmailController,
          label: 'Email',
          hint: 'email@exemple.com',
          icon: Icons.email_outlined,
          keyboardType: TextInputType.emailAddress,
        ),
        const SizedBox(height: 24),

        // Prix
        _buildTextField(
          controller: _priceController,
          label: 'Prix de la mission',
          hint: 'Ex: 250',
          icon: Icons.euro,
          keyboardType: TextInputType.number,
          suffix: '€',
        ),
        const SizedBox(height: 24),

        // Notes
        _buildTextField(
          controller: _notesController,
          label: 'Notes internes',
          hint: 'Notes personnelles (non visibles par le client)',
          icon: Icons.note_outlined,
          maxLines: 3,
        ),
        const SizedBox(height: 16),

        // Instructions spéciales
        _buildTextField(
          controller: _specialInstructionsController,
          label: 'Instructions spéciales',
          hint: 'Consignes particulières pour cette mission',
          icon: Icons.info_outline,
          maxLines: 3,
        ),
      ],
    );
  }

  Widget _buildVehicleTypeChip(String value, String label) {
    final isSelected = _vehicleType == value;
    return Expanded(
      child: InkWell(
        onTap: () => setState(() => _vehicleType = value),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: isSelected ? const Color(0xFF14B8A6) : const Color(0xFF1E293B),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isSelected ? const Color(0xFF14B8A6) : const Color(0xFF334155),
              width: 2,
            ),
          ),
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              color: isSelected ? Colors.white : Colors.white70,
              fontSize: 13,
              fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required String hint,
    required IconData icon,
    bool required = false,
    TextInputType keyboardType = TextInputType.text,
    TextCapitalization textCapitalization = TextCapitalization.none,
    int maxLines = 1,
    String? suffix,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          required ? '$label *' : label,
          style: const TextStyle(
            color: Color(0xFF14B8A6),
            fontSize: 14,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: controller,
          style: const TextStyle(color: Colors.white, fontSize: 15),
          keyboardType: keyboardType,
          textCapitalization: textCapitalization,
          maxLines: maxLines,
          decoration: _inputDecoration(
            hint: hint,
            icon: icon,
          ).copyWith(
            suffixText: suffix,
            suffixStyle: const TextStyle(
              color: Colors.white70,
              fontSize: 15,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ],
    );
  }

  InputDecoration _inputDecoration({
    required String hint,
    required IconData icon,
  }) {
    return InputDecoration(
      hintText: hint,
      hintStyle: const TextStyle(color: Colors.white38, fontSize: 14),
      prefixIcon: Icon(icon, color: const Color(0xFF14B8A6), size: 22),
      filled: true,
      fillColor: const Color(0xFF1E293B),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFF334155)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFF334155)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFF14B8A6), width: 2),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
    );
  }

  Widget _buildNavigationButtons() {
    final canProceed = _canProceed();

    return SafeArea(
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: const Color(0xFF1E293B),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.2),
              blurRadius: 10,
              offset: const Offset(0, -5),
            ),
          ],
        ),
        child: Row(
          children: [
            if (_currentStep > 0)
              Expanded(
                child: OutlinedButton(
                  onPressed: () => setState(() => _currentStep--),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.white,
                    side: const BorderSide(color: Color(0xFF334155)),
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: const Text(
                    'Précédent',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                  ),
                ),
              ),
            if (_currentStep > 0) const SizedBox(width: 12),
            Expanded(
              flex: _currentStep == 0 ? 1 : 1,
              child: ElevatedButton(
                onPressed: canProceed
                    ? () {
                        if (_currentStep < 3) {
                          setState(() => _currentStep++);
                        } else {
                          _submit();
                        }
                      }
                    : null,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF14B8A6),
                  foregroundColor: Colors.white,
                  disabledBackgroundColor: const Color(0xFF334155),
                  disabledForegroundColor: Colors.white38,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: Text(
                  _currentStep < 3 ? 'Continuer' : 'Créer la mission',
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
