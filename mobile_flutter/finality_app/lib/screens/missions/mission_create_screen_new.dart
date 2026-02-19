import 'dart:async';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:intl/intl.dart';
import '../../models/mission.dart';
import '../../services/address_autocomplete_service.dart';
import '../../services/subscription_service.dart';
import '../../services/credits_service.dart';
import '../../theme/premium_theme.dart';

/// Ecran de creation de mission — version moderne / theme clair
/// 3 etapes : Donneur d'ordre + Vehicule -> Enlevement -> Livraison + Options
class MissionCreateScreenNew extends StatefulWidget {
  final Mission? existingMission;

  const MissionCreateScreenNew({super.key, this.existingMission});

  @override
  State<MissionCreateScreenNew> createState() =>
      _MissionCreateScreenNewState();
}

class _MissionCreateScreenNewState extends State<MissionCreateScreenNew> {
  final _formKey = GlobalKey<FormState>();
  final supabase = Supabase.instance.client;
  final SubscriptionService _subscriptionService = SubscriptionService();
  final CreditsService _creditsService = CreditsService();

  bool _isLoading = false;
  bool _hasActiveSubscription = false;
  int _availableCredits = 0;
  int _currentStep = 0;

  // -- Etape 1 : Donneur d'ordre + Vehicule --
  final _mandataireNameController = TextEditingController();
  final _mandataireCompanyController = TextEditingController();
  final _brandController = TextEditingController();
  final _modelController = TextEditingController();
  final _plateController = TextEditingController();
  final _vinController = TextEditingController();
  String _vehicleType = 'VL';

  // -- Etape 2 : Enlevement --
  final _pickupAddressController = TextEditingController();
  final _pickupCityController = TextEditingController();
  final _pickupPostcodeController = TextEditingController();
  final _pickupContactNameController = TextEditingController();
  final _pickupContactPhoneController = TextEditingController();
  double? _pickupLat;
  double? _pickupLng;
  DateTime? _pickupDate;
  TimeOfDay? _pickupTime;

  // -- Etape 3 : Livraison + Options --
  final _deliveryAddressController = TextEditingController();
  final _deliveryCityController = TextEditingController();
  final _deliveryPostcodeController = TextEditingController();
  final _deliveryContactNameController = TextEditingController();
  final _deliveryContactPhoneController = TextEditingController();
  double? _deliveryLat;
  double? _deliveryLng;
  DateTime? _deliveryDate;
  TimeOfDay? _deliveryTime;
  final _priceController = TextEditingController();
  final _notesController = TextEditingController();

  // -- Restitution --
  bool _hasRestitution = false;
  bool _restitutionPickupSameAsDelivery = true;
  bool _restitutionDeliverySameAsPickup = true;
  final _restitutionVehicleBrandController = TextEditingController();
  final _restitutionVehicleModelController = TextEditingController();
  final _restitutionVehiclePlateController = TextEditingController();
  final _restitutionPickupAddressController = TextEditingController();
  final _restitutionPickupCityController = TextEditingController();
  final _restitutionPickupPostcodeController = TextEditingController();
  final _restitutionPickupContactNameController = TextEditingController();
  final _restitutionPickupContactPhoneController = TextEditingController();
  double? _restitutionPickupLat;
  double? _restitutionPickupLng;
  DateTime? _restitutionPickupDate;
  TimeOfDay? _restitutionPickupTime;
  final _restitutionDeliveryAddressController = TextEditingController();
  final _restitutionDeliveryCityController = TextEditingController();
  final _restitutionDeliveryPostcodeController = TextEditingController();
  final _restitutionDeliveryContactNameController = TextEditingController();
  final _restitutionDeliveryContactPhoneController = TextEditingController();
  double? _restitutionDeliveryLat;
  double? _restitutionDeliveryLng;
  DateTime? _restitutionDeliveryDate;
  TimeOfDay? _restitutionDeliveryTime;

  // Autocompletion
  List<AddressSuggestion> _pickupSuggestions = [];
  List<AddressSuggestion> _deliverySuggestions = [];
  List<AddressSuggestion> _restitutionPickupSuggestions = [];
  List<AddressSuggestion> _restitutionDeliverySuggestions = [];
  Timer? _pickupDebounce;
  Timer? _deliveryDebounce;
  Timer? _restitutionPickupDebounce;
  Timer? _restitutionDeliveryDebounce;
  bool _showPickupSuggestions = false;
  bool _showDeliverySuggestions = false;
  bool _showRestitutionPickupSuggestions = false;
  bool _showRestitutionDeliverySuggestions = false;

  int get _requiredCredits => _hasRestitution ? 2 : 1;

  bool get _isEditing => widget.existingMission != null;

  @override
  void initState() {
    super.initState();
    _checkSubscription();
    // Prefill fields if editing
    if (_isEditing) {
      _prefillFromMission(widget.existingMission!);
    }
    // Listeners pour rafraîchir le bouton Continuer en temps réel
    for (final c in [
      _mandataireNameController, _mandataireCompanyController,
      _brandController, _modelController, _plateController, _vinController,
      _pickupAddressController, _pickupCityController,
      _pickupPostcodeController,
      _pickupContactNameController, _pickupContactPhoneController,
      _deliveryAddressController, _deliveryCityController,
      _deliveryPostcodeController,
      _deliveryContactNameController, _deliveryContactPhoneController,
      _priceController, _notesController,
      _restitutionPickupAddressController, _restitutionPickupCityController,
      _restitutionPickupPostcodeController,
      _restitutionPickupContactNameController, _restitutionPickupContactPhoneController,
      _restitutionDeliveryAddressController, _restitutionDeliveryCityController,
      _restitutionDeliveryPostcodeController,
      _restitutionDeliveryContactNameController, _restitutionDeliveryContactPhoneController,
    ]) {
      c.addListener(_onFieldChanged);
    }
  }

  void _onFieldChanged() {
    if (mounted) setState(() {});
  }

  Future<void> _checkSubscription() async {
    final userId = supabase.auth.currentUser?.id;
    if (userId == null) return;
    try {
      final hasActive =
          await _subscriptionService.hasActiveSubscription(userId);
      final userCredits = await _creditsService.getUserCredits(userId);
      if (mounted) {
        setState(() {
          _hasActiveSubscription = hasActive;
          _availableCredits = userCredits.credits;
        });
      }
      if ((!hasActive || userCredits.credits <= 0) && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(!hasActive
                ? 'Abonnement expire. Renouvelez pour creer des missions.'
                : 'Plus de credits disponibles. (${userCredits.credits})'),
            backgroundColor: PremiumTheme.accentAmber,
            duration: const Duration(seconds: 4),
          ),
        );
      }
    } catch (e) {
      debugPrint('Error checking subscription: $e');
    }
  }

  void _prefillFromMission(Mission m) {
    _mandataireNameController.text = m.mandataireName ?? '';
    _mandataireCompanyController.text = m.mandataireCompany ?? '';
    _brandController.text = m.vehicleBrand ?? '';
    _modelController.text = m.vehicleModel ?? '';
    _plateController.text = m.vehiclePlate ?? '';
    _vinController.text = m.vehicleVin ?? '';
    _vehicleType = m.vehicleType ?? 'VL';

    // Pickup - parse city/postal from address if available
    _pickupCityController.text = m.pickupCity ?? '';
    _pickupPostcodeController.text = m.pickupPostalCode ?? '';
    // Extract street part from full address (before the city)
    final pickupFull = m.pickupAddress ?? '';
    final pickupCitySuffix = '${m.pickupPostalCode ?? ''} ${m.pickupCity ?? ''}'.trim();
    _pickupAddressController.text = pickupFull.replaceAll(', $pickupCitySuffix', '').trim();
    _pickupLat = m.pickupLat;
    _pickupLng = m.pickupLng;
    _pickupDate = m.pickupDate;
    if (m.pickupDate != null) {
      _pickupTime = TimeOfDay(hour: m.pickupDate!.hour, minute: m.pickupDate!.minute);
    }
    _pickupContactNameController.text = m.pickupContactName ?? '';
    _pickupContactPhoneController.text = m.pickupContactPhone ?? '';

    // Delivery
    _deliveryCityController.text = m.deliveryCity ?? '';
    _deliveryPostcodeController.text = m.deliveryPostalCode ?? '';
    final deliveryFull = m.deliveryAddress ?? '';
    final deliveryCitySuffix = '${m.deliveryPostalCode ?? ''} ${m.deliveryCity ?? ''}'.trim();
    _deliveryAddressController.text = deliveryFull.replaceAll(', $deliveryCitySuffix', '').trim();
    _deliveryLat = m.deliveryLat;
    _deliveryLng = m.deliveryLng;
    _deliveryDate = m.deliveryDate;
    if (m.deliveryDate != null) {
      _deliveryTime = TimeOfDay(hour: m.deliveryDate!.hour, minute: m.deliveryDate!.minute);
    }
    _deliveryContactNameController.text = m.deliveryContactName ?? '';
    _deliveryContactPhoneController.text = m.deliveryContactPhone ?? '';

    _priceController.text = m.price != null ? m.price.toString() : '';
    _notesController.text = m.notes ?? '';
    _hasRestitution = m.hasRestitution;
  }

  @override
  void dispose() {
    _pickupDebounce?.cancel();
    _deliveryDebounce?.cancel();
    _restitutionPickupDebounce?.cancel();
    _restitutionDeliveryDebounce?.cancel();
    for (final c in [
      _mandataireNameController, _mandataireCompanyController,
      _brandController, _modelController, _plateController, _vinController,
      _pickupAddressController, _pickupCityController,
      _pickupPostcodeController,
      _pickupContactNameController, _pickupContactPhoneController,
      _deliveryAddressController, _deliveryCityController,
      _deliveryPostcodeController,
      _deliveryContactNameController, _deliveryContactPhoneController,
      _priceController, _notesController,
      _restitutionPickupAddressController, _restitutionPickupCityController,
      _restitutionPickupPostcodeController,
      _restitutionPickupContactNameController, _restitutionPickupContactPhoneController,
      _restitutionDeliveryAddressController, _restitutionDeliveryCityController,
      _restitutionDeliveryPostcodeController,
      _restitutionDeliveryContactNameController, _restitutionDeliveryContactPhoneController,
    ]) {
      c.removeListener(_onFieldChanged);
      c.dispose();
    }
    super.dispose();
  }

  // -- Autocompletion adresses --
  void _onAddressChanged(String value, bool isPickup) {
    final debounce = isPickup ? _pickupDebounce : _deliveryDebounce;
    debounce?.cancel();
    if (value.length < 3) {
      setState(() {
        if (isPickup) {
          _pickupSuggestions = [];
          _showPickupSuggestions = false;
        } else {
          _deliverySuggestions = [];
          _showDeliverySuggestions = false;
        }
      });
      return;
    }
    final timer = Timer(const Duration(milliseconds: 300), () async {
      final suggestions =
          await AddressAutocompleteService.searchAddresses(value);
      if (mounted) {
        setState(() {
          if (isPickup) {
            _pickupSuggestions = suggestions;
            _showPickupSuggestions = suggestions.isNotEmpty;
          } else {
            _deliverySuggestions = suggestions;
            _showDeliverySuggestions = suggestions.isNotEmpty;
          }
        });
      }
    });
    if (isPickup) {
      _pickupDebounce = timer;
    } else {
      _deliveryDebounce = timer;
    }
  }

  void _selectSuggestion(AddressSuggestion s, bool isPickup) {
    setState(() {
      if (isPickup) {
        _pickupAddressController.text = s.name;
        _pickupCityController.text = s.city;
        _pickupPostcodeController.text = s.postcode;
        _pickupLat = s.latitude;
        _pickupLng = s.longitude;
        _pickupSuggestions = [];
        _showPickupSuggestions = false;
      } else {
        _deliveryAddressController.text = s.name;
        _deliveryCityController.text = s.city;
        _deliveryPostcodeController.text = s.postcode;
        _deliveryLat = s.latitude;
        _deliveryLng = s.longitude;
        _deliverySuggestions = [];
        _showDeliverySuggestions = false;
      }
    });
  }

  // -- Autocompletion restitution --
  void _onRestitutionAddressChanged(String value, bool isPickup) {
    final debounce = isPickup ? _restitutionPickupDebounce : _restitutionDeliveryDebounce;
    debounce?.cancel();
    if (value.length < 3) {
      setState(() {
        if (isPickup) {
          _restitutionPickupSuggestions = [];
          _showRestitutionPickupSuggestions = false;
        } else {
          _restitutionDeliverySuggestions = [];
          _showRestitutionDeliverySuggestions = false;
        }
      });
      return;
    }
    final timer = Timer(const Duration(milliseconds: 300), () async {
      final suggestions =
          await AddressAutocompleteService.searchAddresses(value);
      if (mounted) {
        setState(() {
          if (isPickup) {
            _restitutionPickupSuggestions = suggestions;
            _showRestitutionPickupSuggestions = suggestions.isNotEmpty;
          } else {
            _restitutionDeliverySuggestions = suggestions;
            _showRestitutionDeliverySuggestions = suggestions.isNotEmpty;
          }
        });
      }
    });
    if (isPickup) {
      _restitutionPickupDebounce = timer;
    } else {
      _restitutionDeliveryDebounce = timer;
    }
  }

  void _selectRestitutionSuggestion(AddressSuggestion s, bool isPickup) {
    setState(() {
      if (isPickup) {
        _restitutionPickupAddressController.text = s.name;
        _restitutionPickupCityController.text = s.city;
        _restitutionPickupPostcodeController.text = s.postcode;
        _restitutionPickupLat = s.latitude;
        _restitutionPickupLng = s.longitude;
        _restitutionPickupSuggestions = [];
        _showRestitutionPickupSuggestions = false;
      } else {
        _restitutionDeliveryAddressController.text = s.name;
        _restitutionDeliveryCityController.text = s.city;
        _restitutionDeliveryPostcodeController.text = s.postcode;
        _restitutionDeliveryLat = s.latitude;
        _restitutionDeliveryLng = s.longitude;
        _restitutionDeliverySuggestions = [];
        _showRestitutionDeliverySuggestions = false;
      }
    });
  }

  // -- Validation --
  bool _canProceed() {
    switch (_currentStep) {
      case 0:
        return _mandataireNameController.text.isNotEmpty &&
            _brandController.text.isNotEmpty &&
            _modelController.text.isNotEmpty;
      case 1:
        return _pickupAddressController.text.isNotEmpty &&
            _pickupCityController.text.isNotEmpty &&
            _pickupContactNameController.text.isNotEmpty &&
            _pickupDate != null;
      case 2:
        // Livraison base requise
        final deliveryOk = _deliveryAddressController.text.isNotEmpty &&
            _deliveryCityController.text.isNotEmpty &&
            _deliveryContactNameController.text.isNotEmpty &&
            _deliveryDate != null;
        if (!deliveryOk) return false;
        // Si restitution activée, vérifier les champs restitution
        if (_hasRestitution) {
          if (_restitutionPickupDate == null) return false;
          if (!_restitutionPickupSameAsDelivery &&
              (_restitutionPickupAddressController.text.isEmpty ||
               _restitutionPickupCityController.text.isEmpty)) return false;
          if (!_restitutionDeliverySameAsPickup &&
              (_restitutionDeliveryAddressController.text.isEmpty ||
               _restitutionDeliveryCityController.text.isEmpty)) return false;
        }
        return true;
      default:
        return false;
    }
  }

  // -- Soumission --
  Future<void> _submit() async {
    if (!_canProceed()) {
      _showError('Veuillez remplir tous les champs obligatoires');
      return;
    }
    if (!_isEditing && !_hasActiveSubscription) {
      _showError('Abonnement expire. Veuillez le renouveler.');
      return;
    }
    if (!_isEditing && _availableCredits < _requiredCredits) {
      _showError('Pas assez de credits. Necessaire: $_requiredCredits, disponibles: $_availableCredits');
      return;
    }

    setState(() => _isLoading = true);
    try {
      final userId = supabase.auth.currentUser?.id;
      if (userId == null) throw 'Non authentifie';

      DateTime? pickupDT;
      if (_pickupDate != null) {
        pickupDT = DateTime(
          _pickupDate!.year,
          _pickupDate!.month,
          _pickupDate!.day,
          _pickupTime?.hour ?? 0,
          _pickupTime?.minute ?? 0,
        );
      }
      DateTime? deliveryDT;
      if (_deliveryDate != null) {
        deliveryDT = DateTime(
          _deliveryDate!.year,
          _deliveryDate!.month,
          _deliveryDate!.day,
          _deliveryTime?.hour ?? 0,
          _deliveryTime?.minute ?? 0,
        );
      }

      final ref =
          'MSN${DateTime.now().millisecondsSinceEpoch.toString().substring(5)}';
      final pickupAddr =
          '${_pickupAddressController.text}, ${_pickupPostcodeController.text} ${_pickupCityController.text}';
      final deliveryAddr =
          '${_deliveryAddressController.text}, ${_deliveryPostcodeController.text} ${_deliveryCityController.text}';

      final data = <String, dynamic>{
        'user_id': userId,
        'reference': ref,
        'status': 'pending',
        'mandataire_name':
            _mandataireNameController.text.trim().isNotEmpty
                ? _mandataireNameController.text.trim()
                : null,
        'mandataire_company':
            _mandataireCompanyController.text.trim().isNotEmpty
                ? _mandataireCompanyController.text.trim()
                : null,
        'vehicle_brand': _brandController.text.trim(),
        'vehicle_model': _modelController.text.trim(),
        'vehicle_plate': _plateController.text.trim().isNotEmpty
            ? _plateController.text.trim().toUpperCase()
            : null,
        'vehicle_vin': _vinController.text.trim().isNotEmpty
            ? _vinController.text.trim().toUpperCase()
            : null,
        'vehicle_type': _vehicleType,
        'pickup_address': pickupAddr,
        'pickup_city': _pickupCityController.text.trim(),
        'pickup_postal_code': _pickupPostcodeController.text.trim(),
        'pickup_lat': _pickupLat,
        'pickup_lng': _pickupLng,
        'pickup_date': pickupDT?.toIso8601String(),
        'pickup_contact_name':
            _pickupContactNameController.text.trim().isNotEmpty
                ? _pickupContactNameController.text.trim()
                : null,
        'pickup_contact_phone':
            _pickupContactPhoneController.text.trim().isNotEmpty
                ? _pickupContactPhoneController.text.trim()
                : null,
        'delivery_address': deliveryAddr,
        'delivery_city': _deliveryCityController.text.trim(),
        'delivery_postal_code':
            _deliveryPostcodeController.text.trim(),
        'delivery_lat': _deliveryLat,
        'delivery_lng': _deliveryLng,
        'delivery_date': deliveryDT?.toIso8601String(),
        'delivery_contact_name':
            _deliveryContactNameController.text.trim().isNotEmpty
                ? _deliveryContactNameController.text.trim()
                : null,
        'delivery_contact_phone':
            _deliveryContactPhoneController.text.trim().isNotEmpty
                ? _deliveryContactPhoneController.text.trim()
                : null,
        'price': _priceController.text.isNotEmpty
            ? double.tryParse(_priceController.text)
            : null,
        'notes': _notesController.text.trim().isNotEmpty
            ? _notesController.text.trim()
            : null,
        'has_restitution': _hasRestitution,
      };

      // Ajouter les champs restitution si activée
      if (_hasRestitution) {
        // Adresse de départ restitution
        String restPickupAddr;
        String restPickupCity;
        String restPickupPostal;
        double? restPickupLat;
        double? restPickupLng;
        String? restPickupContactName;
        String? restPickupContactPhone;

        if (_restitutionPickupSameAsDelivery) {
          restPickupAddr = deliveryAddr;
          restPickupCity = _deliveryCityController.text.trim();
          restPickupPostal = _deliveryPostcodeController.text.trim();
          restPickupLat = _deliveryLat;
          restPickupLng = _deliveryLng;
          restPickupContactName = _deliveryContactNameController.text.trim().isNotEmpty
              ? _deliveryContactNameController.text.trim() : null;
          restPickupContactPhone = _deliveryContactPhoneController.text.trim().isNotEmpty
              ? _deliveryContactPhoneController.text.trim() : null;
        } else {
          restPickupAddr = '${_restitutionPickupAddressController.text}, ${_restitutionPickupPostcodeController.text} ${_restitutionPickupCityController.text}';
          restPickupCity = _restitutionPickupCityController.text.trim();
          restPickupPostal = _restitutionPickupPostcodeController.text.trim();
          restPickupLat = _restitutionPickupLat;
          restPickupLng = _restitutionPickupLng;
          restPickupContactName = _restitutionPickupContactNameController.text.trim().isNotEmpty
              ? _restitutionPickupContactNameController.text.trim() : null;
          restPickupContactPhone = _restitutionPickupContactPhoneController.text.trim().isNotEmpty
              ? _restitutionPickupContactPhoneController.text.trim() : null;
        }

        // Adresse de livraison restitution
        String restDeliveryAddr;
        String restDeliveryCity;
        String restDeliveryPostal;
        double? restDeliveryLat;
        double? restDeliveryLng;
        String? restDeliveryContactName;
        String? restDeliveryContactPhone;

        if (_restitutionDeliverySameAsPickup) {
          restDeliveryAddr = pickupAddr;
          restDeliveryCity = _pickupCityController.text.trim();
          restDeliveryPostal = _pickupPostcodeController.text.trim();
          restDeliveryLat = _pickupLat;
          restDeliveryLng = _pickupLng;
          restDeliveryContactName = _pickupContactNameController.text.trim().isNotEmpty
              ? _pickupContactNameController.text.trim() : null;
          restDeliveryContactPhone = _pickupContactPhoneController.text.trim().isNotEmpty
              ? _pickupContactPhoneController.text.trim() : null;
        } else {
          restDeliveryAddr = '${_restitutionDeliveryAddressController.text}, ${_restitutionDeliveryPostcodeController.text} ${_restitutionDeliveryCityController.text}';
          restDeliveryCity = _restitutionDeliveryCityController.text.trim();
          restDeliveryPostal = _restitutionDeliveryPostcodeController.text.trim();
          restDeliveryLat = _restitutionDeliveryLat;
          restDeliveryLng = _restitutionDeliveryLng;
          restDeliveryContactName = _restitutionDeliveryContactNameController.text.trim().isNotEmpty
              ? _restitutionDeliveryContactNameController.text.trim() : null;
          restDeliveryContactPhone = _restitutionDeliveryContactPhoneController.text.trim().isNotEmpty
              ? _restitutionDeliveryContactPhoneController.text.trim() : null;
        }

        DateTime? restPickupDT;
        if (_restitutionPickupDate != null) {
          restPickupDT = DateTime(
            _restitutionPickupDate!.year,
            _restitutionPickupDate!.month,
            _restitutionPickupDate!.day,
            _restitutionPickupTime?.hour ?? 0,
            _restitutionPickupTime?.minute ?? 0,
          );
        }
        DateTime? restDeliveryDT;
        if (_restitutionDeliveryDate != null) {
          restDeliveryDT = DateTime(
            _restitutionDeliveryDate!.year,
            _restitutionDeliveryDate!.month,
            _restitutionDeliveryDate!.day,
            _restitutionDeliveryTime?.hour ?? 0,
            _restitutionDeliveryTime?.minute ?? 0,
          );
        }

        data.addAll({
          'restitution_pickup_address': restPickupAddr,
          'restitution_pickup_city': restPickupCity,
          'restitution_pickup_postal_code': restPickupPostal,
          'restitution_pickup_lat': restPickupLat,
          'restitution_pickup_lng': restPickupLng,
          'restitution_pickup_date': restPickupDT?.toIso8601String(),
          'restitution_pickup_contact_name': restPickupContactName,
          'restitution_pickup_contact_phone': restPickupContactPhone,
          'restitution_delivery_address': restDeliveryAddr,
          'restitution_delivery_city': restDeliveryCity,
          'restitution_delivery_postal_code': restDeliveryPostal,
          'restitution_delivery_lat': restDeliveryLat,
          'restitution_delivery_lng': restDeliveryLng,
          'restitution_delivery_date': restDeliveryDT?.toIso8601String(),
          'restitution_delivery_contact_name': restDeliveryContactName,
          'restitution_delivery_contact_phone': restDeliveryContactPhone,
          'restitution_vehicle_brand': _restitutionVehicleBrandController.text.trim().isNotEmpty ? _restitutionVehicleBrandController.text.trim() : null,
          'restitution_vehicle_model': _restitutionVehicleModelController.text.trim().isNotEmpty ? _restitutionVehicleModelController.text.trim() : null,
          'restitution_vehicle_plate': _restitutionVehiclePlateController.text.trim().isNotEmpty ? _restitutionVehiclePlateController.text.trim() : null,
        });
      }

      if (_isEditing) {
        // Update existing mission
        data.remove('user_id');
        data.remove('reference');
        data.remove('status');
        await supabase
            .from('missions')
            .update(data)
            .eq('id', widget.existingMission!.id);
      } else {
        // Deduire les credits AVANT l'insert (atomique, évite les missions gratuites)
        await _creditsService.spendCredits(
          userId: userId,
          amount: _requiredCredits,
          description: 'Création mission $ref${_hasRestitution ? ' + restitution' : ''}',
          referenceType: 'mission',
        );

        // Insérer la mission après déduction réussie
        await supabase.from('missions').insert(data);
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(_isEditing
                ? 'Mission modifiee avec succes'
                : 'Mission creee avec succes ($_requiredCredits credit${_requiredCredits > 1 ? 's' : ''} deduit${_requiredCredits > 1 ? 's' : ''})'),
            backgroundColor: PremiumTheme.accentGreen,
          ),
        );
        Navigator.pop(context, true);
      }
    } catch (e) {
      _showError('Erreur: $e');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _showError(String msg) {
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
            content: Text(msg),
            backgroundColor: PremiumTheme.accentRed),
      );
    }
  }

  Future<void> _selectDate(bool isPickup) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime.now(),
      firstDate: DateTime.now().subtract(const Duration(days: 1)),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      builder: (ctx, child) => Theme(
        data: Theme.of(ctx).copyWith(
          colorScheme: ColorScheme.light(
            primary: PremiumTheme.primaryBlue,
            onPrimary: Colors.white,
            surface: Colors.white,
            onSurface: PremiumTheme.textPrimary,
          ),
          dialogBackgroundColor: Colors.white,
        ),
        child: child!,
      ),
    );
    if (picked != null && mounted) {
      setState(() {
        if (isPickup) _pickupDate = picked;
        else _deliveryDate = picked;
      });
    }
  }

  Future<void> _selectTime(bool isPickup) async {
    final picked = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.now(),
      builder: (ctx, child) => Theme(
        data: Theme.of(ctx).copyWith(
          colorScheme: ColorScheme.light(
            primary: PremiumTheme.primaryBlue,
            onPrimary: Colors.white,
            surface: Colors.white,
            onSurface: PremiumTheme.textPrimary,
          ),
          dialogBackgroundColor: Colors.white,
        ),
        child: child!,
      ),
    );
    if (picked != null && mounted) {
      setState(() {
        if (isPickup) _pickupTime = picked;
        else _deliveryTime = picked;
      });
    }
  }

  // -- Date/heure restitution --
  Future<void> _selectRestitutionDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _deliveryDate ?? DateTime.now(),
      firstDate: DateTime.now().subtract(const Duration(days: 1)),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      builder: (ctx, child) => Theme(
        data: Theme.of(ctx).copyWith(
          colorScheme: const ColorScheme.light(
            primary: Color(0xFFE65100),
            onPrimary: Colors.white,
            surface: Colors.white,
          ),
          dialogBackgroundColor: Colors.white,
        ),
        child: child!,
      ),
    );
    if (picked != null && mounted) {
      setState(() => _restitutionPickupDate = picked);
    }
  }

  Future<void> _selectRestitutionTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.now(),
      builder: (ctx, child) => Theme(
        data: Theme.of(ctx).copyWith(
          colorScheme: const ColorScheme.light(
            primary: Color(0xFFE65100),
            onPrimary: Colors.white,
            surface: Colors.white,
          ),
          dialogBackgroundColor: Colors.white,
        ),
        child: child!,
      ),
    );
    if (picked != null && mounted) {
      setState(() => _restitutionPickupTime = picked);
    }
  }

  Widget _restitutionDateTimeRow() {
    final date = _restitutionPickupDate;
    final time = _restitutionPickupTime;
    return Row(
      children: [
        Expanded(
          child: _dateTile(
            'Date *',
            date != null
                ? DateFormat('dd/MM/yyyy').format(date)
                : 'Selectionner',
            Icons.calendar_today_rounded,
            _selectRestitutionDate,
            const Color(0xFFE65100),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _dateTile(
            'Heure',
            time?.format(context) ?? 'Optionnel',
            Icons.access_time_rounded,
            _selectRestitutionTime,
            const Color(0xFFBF360C),
          ),
        ),
      ],
    );
  }

  // ==============================================
  //  BUILD
  // ==============================================
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: PremiumTheme.lightBg,
      appBar: AppBar(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: Icon(Icons.close_rounded,
              color: PremiumTheme.textPrimary),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          _isEditing ? 'Modifier la mission' : 'Nouvelle mission',
          style: PremiumTheme.heading4.copyWith(fontSize: 18),
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(56),
          child: _buildStepper(),
        ),
      ),
      body: _isLoading
          ? Center(
              child: CircularProgressIndicator(
                  color: PremiumTheme.primaryBlue))
          : Form(
              key: _formKey,
              child: Column(
                children: [
                  Expanded(
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.all(16),
                      child: _buildCurrentStep(),
                    ),
                  ),
                  _buildNavButtons(),
                ],
              ),
            ),
    );
  }

  // -- Stepper indicator --
  Widget _buildStepper() {
    const labels = ['Vehicule', 'Enlevement', 'Livraison'];
    const icons = [
      Icons.directions_car_rounded,
      Icons.upload_rounded,
      Icons.download_rounded,
    ];
    const colors = [
      PremiumTheme.primaryTeal,
      PremiumTheme.accentGreen,
      PremiumTheme.primaryBlue,
    ];

    return Container(
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
      child: Row(
        children: List.generate(3, (i) {
          final active = i == _currentStep;
          final done = i < _currentStep;
          final col = active || done ? colors[i] : PremiumTheme.textTertiary;
          return Expanded(
            child: Padding(
              padding: EdgeInsets.only(
                  left: i == 0 ? 0 : 6, right: i == 2 ? 0 : 6),
              child: Column(
                children: [
                  // Progress bar
                  Container(
                    height: 4,
                    decoration: BoxDecoration(
                      color: done
                          ? col
                          : active
                              ? col.withValues(alpha: 0.5)
                              : const Color(0xFFE5E7EB),
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      if (done)
                        Icon(Icons.check_circle_rounded,
                            color: col, size: 16)
                      else
                        Icon(icons[i], color: col, size: 16),
                      const SizedBox(width: 4),
                      Text(
                        labels[i],
                        style: TextStyle(
                          color: col,
                          fontSize: 12,
                          fontWeight:
                              active ? FontWeight.w700 : FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          );
        }),
      ),
    );
  }

  Widget _buildCurrentStep() {
    switch (_currentStep) {
      case 0:
        return _buildStep1();
      case 1:
        return _buildStep2();
      case 2:
        return _buildStep3();
      default:
        return const SizedBox();
    }
  }

  // ==============================================
  //  ETAPE 1 : MANDATAIRE + VEHICULE
  // ==============================================
  Widget _buildStep1() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionCard(
          icon: Icons.person_outline_rounded,
          title: "Donneur d'ordre",
          color: PremiumTheme.primaryPurple,
          children: [
            _field(_mandataireNameController, "Nom du donneur d'ordre *",
                Icons.person_rounded,
                isRequired: true),
            const SizedBox(height: 12),
            _field(_mandataireCompanyController, 'Société',
                Icons.business_rounded),
          ],
        ),
        const SizedBox(height: 16),
        _sectionCard(
          icon: Icons.directions_car_rounded,
          title: 'Vehicule',
          color: PremiumTheme.primaryTeal,
          children: [
            _vehicleTypeSelector(),
            const SizedBox(height: 16),
            _field(_brandController, 'Marque *',
                Icons.directions_car_rounded,
                isRequired: true),
            const SizedBox(height: 12),
            _field(_modelController, 'Modele *',
                Icons.directions_car_filled_rounded,
                isRequired: true),
            const SizedBox(height: 12),
            _field(
                _plateController, 'Immatriculation', Icons.pin_rounded,
                caps: true),
            const SizedBox(height: 12),
            _field(_vinController, 'Numero VIN',
                Icons.confirmation_number_rounded,
                caps: true),
          ],
        ),
      ],
    );
  }

  // ==============================================
  //  ETAPE 2 : ENLEVEMENT
  // ==============================================
  Widget _buildStep2() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionCard(
          icon: Icons.upload_rounded,
          title: "Lieu d'enlevement",
          color: PremiumTheme.accentGreen,
          children: [
            _field(
              _pickupAddressController,
              'Adresse *',
              Icons.location_on_rounded,
              isRequired: true,
              onChanged: (v) => _onAddressChanged(v, true),
            ),
            if (_showPickupSuggestions)
              _suggestionsList(_pickupSuggestions, true),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  flex: 2,
                  child: _field(_pickupPostcodeController,
                      'Code postal', Icons.markunread_mailbox_rounded),
                ),
                const SizedBox(width: 12),
                Expanded(
                  flex: 3,
                  child: _field(_pickupCityController, 'Ville *',
                      Icons.location_city_rounded,
                      isRequired: true),
                ),
              ],
            ),
            const SizedBox(height: 16),
            _dateTimeRow(true),
          ],
        ),
        const SizedBox(height: 16),
        _sectionCard(
          icon: Icons.person_pin_rounded,
          title: 'Expediteur (contact sur place)',
          color: PremiumTheme.accentGreen,
          children: [
            _field(_pickupContactNameController,
                "Nom de l'expediteur *", Icons.person_rounded,
                isRequired: true),
            const SizedBox(height: 12),
            _field(_pickupContactPhoneController, 'Telephone',
                Icons.phone_rounded,
                keyboard: TextInputType.phone),
          ],
        ),
      ],
    );
  }

  // ==============================================
  //  ETAPE 3 : LIVRAISON + OPTIONS
  // ==============================================
  Widget _buildStep3() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionCard(
          icon: Icons.download_rounded,
          title: 'Lieu de livraison',
          color: PremiumTheme.primaryBlue,
          children: [
            _field(
              _deliveryAddressController,
              'Adresse *',
              Icons.location_on_rounded,
              isRequired: true,
              onChanged: (v) => _onAddressChanged(v, false),
            ),
            if (_showDeliverySuggestions)
              _suggestionsList(_deliverySuggestions, false),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  flex: 2,
                  child: _field(_deliveryPostcodeController,
                      'Code postal', Icons.markunread_mailbox_rounded),
                ),
                const SizedBox(width: 12),
                Expanded(
                  flex: 3,
                  child: _field(_deliveryCityController, 'Ville *',
                      Icons.location_city_rounded,
                      isRequired: true),
                ),
              ],
            ),
            const SizedBox(height: 16),
            _dateTimeRow(false),
          ],
        ),
        const SizedBox(height: 16),
        _sectionCard(
          icon: Icons.person_pin_rounded,
          title: 'Receptionnaire (contact sur place)',
          color: PremiumTheme.primaryBlue,
          children: [
            _field(_deliveryContactNameController,
                'Nom du receptionnaire *', Icons.person_rounded,
                isRequired: true),
            const SizedBox(height: 12),
            _field(_deliveryContactPhoneController, 'Telephone',
                Icons.phone_rounded,
                keyboard: TextInputType.phone),
          ],
        ),
        const SizedBox(height: 16),
        _sectionCard(
          icon: Icons.tune_rounded,
          title: 'Options',
          color: PremiumTheme.primaryIndigo,
          children: [
            _field(_priceController, 'Prix (EUR)',
                Icons.euro_rounded,
                keyboard: TextInputType.number),
            const SizedBox(height: 12),
            _field(_notesController, 'Notes internes',
                Icons.note_alt_rounded,
                maxLines: 3),
          ],
        ),
        const SizedBox(height: 16),

        // ====== RESTITUTION ======
        _sectionCard(
          icon: Icons.replay_rounded,
          title: 'Restitution',
          color: const Color(0xFFE65100),
          children: [
            // Toggle
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: Text(
                'Ajouter une restitution',
                style: PremiumTheme.heading4.copyWith(fontSize: 15),
              ),
              subtitle: Text(
                _hasRestitution
                    ? 'Trajet retour inclus (2 credits)'
                    : 'Aller simple (1 credit)',
                style: PremiumTheme.bodySmall.copyWith(
                  color: _hasRestitution
                      ? const Color(0xFFE65100)
                      : PremiumTheme.textTertiary,
                  fontSize: 13,
                ),
              ),
              value: _hasRestitution,
              activeColor: const Color(0xFFE65100),
              onChanged: (v) => setState(() => _hasRestitution = v),
            ),

            if (_hasRestitution) ...[
              const Divider(height: 24),

              // --- Vehicule restitution ---
              Text('Véhicule restitution',
                  style: PremiumTheme.heading4.copyWith(
                      fontSize: 14, color: const Color(0xFFE65100))),
              const SizedBox(height: 8),
              const SizedBox(height: 8),
              _field(
                  _restitutionVehicleBrandController,
                  'Marque du véhicule',
                  Icons.directions_car_rounded),
              const SizedBox(height: 8),
              _field(
                  _restitutionVehicleModelController,
                  'Modèle',
                  Icons.car_repair_rounded),
              const SizedBox(height: 8),
              _field(
                  _restitutionVehiclePlateController,
                  'Immatriculation *',
                  Icons.confirmation_number_rounded,
                  isRequired: true),

              const SizedBox(height: 16),

              // --- Depart restitution ---
              Text('Depart restitution',
                  style: PremiumTheme.heading4.copyWith(
                      fontSize: 14, color: const Color(0xFFE65100))),
              const SizedBox(height: 8),
              CheckboxListTile(
                contentPadding: EdgeInsets.zero,
                dense: true,
                activeColor: const Color(0xFFE65100),
                title: Text(
                  'Meme adresse que la livraison',
                  style: PremiumTheme.bodySmall
                      .copyWith(fontSize: 14),
                ),
                value: _restitutionPickupSameAsDelivery,
                onChanged: (v) => setState(
                    () => _restitutionPickupSameAsDelivery = v ?? true),
              ),
              if (!_restitutionPickupSameAsDelivery) ...[
                const SizedBox(height: 8),
                _field(
                  _restitutionPickupAddressController,
                  'Adresse de depart *',
                  Icons.location_on_rounded,
                  isRequired: true,
                  onChanged: (v) =>
                      _onRestitutionAddressChanged(v, true),
                ),
                if (_showRestitutionPickupSuggestions)
                  _suggestionsList(
                      _restitutionPickupSuggestions, true,
                      isRestitution: true),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      flex: 2,
                      child: _field(
                          _restitutionPickupPostcodeController,
                          'Code postal',
                          Icons.markunread_mailbox_rounded),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      flex: 3,
                      child: _field(
                          _restitutionPickupCityController,
                          'Ville *',
                          Icons.location_city_rounded,
                          isRequired: true),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                _field(
                    _restitutionPickupContactNameController,
                    'Contact sur place',
                    Icons.person_rounded),
                const SizedBox(height: 8),
                _field(
                    _restitutionPickupContactPhoneController,
                    'Telephone',
                    Icons.phone_rounded,
                    keyboard: TextInputType.phone),
              ],

              const SizedBox(height: 16),

              // --- Date restitution ---
              Text('Date de restitution *',
                  style: PremiumTheme.heading4.copyWith(
                      fontSize: 14, color: const Color(0xFFE65100))),
              const SizedBox(height: 8),
              _restitutionDateTimeRow(),

              const SizedBox(height: 16),

              // --- Livraison restitution ---
              Text('Livraison restitution',
                  style: PremiumTheme.heading4.copyWith(
                      fontSize: 14, color: const Color(0xFFE65100))),
              const SizedBox(height: 8),
              CheckboxListTile(
                contentPadding: EdgeInsets.zero,
                dense: true,
                activeColor: const Color(0xFFE65100),
                title: Text(
                  "Meme adresse que l'enlevement",
                  style: PremiumTheme.bodySmall
                      .copyWith(fontSize: 14),
                ),
                value: _restitutionDeliverySameAsPickup,
                onChanged: (v) => setState(
                    () => _restitutionDeliverySameAsPickup = v ?? true),
              ),
              if (!_restitutionDeliverySameAsPickup) ...[
                const SizedBox(height: 8),
                _field(
                  _restitutionDeliveryAddressController,
                  'Adresse de livraison *',
                  Icons.location_on_rounded,
                  isRequired: true,
                  onChanged: (v) =>
                      _onRestitutionAddressChanged(v, false),
                ),
                if (_showRestitutionDeliverySuggestions)
                  _suggestionsList(
                      _restitutionDeliverySuggestions, false,
                      isRestitution: true),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      flex: 2,
                      child: _field(
                          _restitutionDeliveryPostcodeController,
                          'Code postal',
                          Icons.markunread_mailbox_rounded),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      flex: 3,
                      child: _field(
                          _restitutionDeliveryCityController,
                          'Ville *',
                          Icons.location_city_rounded,
                          isRequired: true),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                _field(
                    _restitutionDeliveryContactNameController,
                    'Contact sur place',
                    Icons.person_rounded),
                const SizedBox(height: 8),
                _field(
                    _restitutionDeliveryContactPhoneController,
                    'Telephone',
                    Icons.phone_rounded,
                    keyboard: TextInputType.phone),
              ],
            ],
          ],
        ),
      ],
    );
  }

  // ==============================================
  //  WIDGETS REUTILISABLES
  // ==============================================
  Widget _sectionCard({
    required IconData icon,
    required String title,
    required Color color,
    required List<Widget> children,
  }) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha: 0.2)),
        boxShadow: [
          BoxShadow(
            color: color.withValues(alpha: 0.06),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
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
                  color: color.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, color: color, size: 20),
              ),
              const SizedBox(width: 10),
              Text(
                title,
                style: PremiumTheme.heading4.copyWith(
                  color: color,
                  fontSize: 16,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          ...children,
        ],
      ),
    );
  }

  Widget _field(
    TextEditingController ctrl,
    String label,
    IconData icon, {
    bool isRequired = false,
    TextInputType keyboard = TextInputType.text,
    bool caps = false,
    int maxLines = 1,
    void Function(String)? onChanged,
  }) {
    return TextField(
      controller: ctrl,
      style: PremiumTheme.body.copyWith(fontSize: 15),
      keyboardType: keyboard,
      textCapitalization:
          caps ? TextCapitalization.characters : TextCapitalization.none,
      maxLines: maxLines,
      onChanged: onChanged,
      decoration: InputDecoration(
        labelText: label,
        labelStyle: PremiumTheme.bodySmall.copyWith(
          color: isRequired
              ? PremiumTheme.primaryBlue
              : PremiumTheme.textTertiary,
          fontSize: 14,
        ),
        prefixIcon: Icon(icon,
            color: PremiumTheme.primaryBlue.withValues(alpha: 0.6),
            size: 20),
        filled: true,
        fillColor: const Color(0xFFF8FAFC),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFFE5E7EB)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFFE5E7EB)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide:
              BorderSide(color: PremiumTheme.primaryBlue, width: 2),
        ),
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      ),
    );
  }

  Widget _vehicleTypeSelector() {
    return Row(
      children: [
        _typeChip('VL', 'Voiture', Icons.directions_car_rounded),
        const SizedBox(width: 8),
        _typeChip('VU', 'Utilitaire', Icons.local_shipping_rounded),
        const SizedBox(width: 8),
        _typeChip('PL', 'Poids lourd', Icons.fire_truck_rounded),
      ],
    );
  }

  Widget _typeChip(String value, String label, IconData icon) {
    final sel = _vehicleType == value;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _vehicleType = value),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: sel
                ? PremiumTheme.primaryBlue.withValues(alpha: 0.08)
                : const Color(0xFFF8FAFC),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: sel
                  ? PremiumTheme.primaryBlue
                  : const Color(0xFFE5E7EB),
              width: sel ? 2 : 1,
            ),
          ),
          child: Column(
            children: [
              Icon(icon,
                  color: sel
                      ? PremiumTheme.primaryBlue
                      : PremiumTheme.textTertiary,
                  size: 22),
              const SizedBox(height: 4),
              Text(
                label,
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: sel
                      ? PremiumTheme.primaryBlue
                      : PremiumTheme.textSecondary,
                  fontSize: 12,
                  fontWeight: sel ? FontWeight.w700 : FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _dateTimeRow(bool isPickup) {
    final date = isPickup ? _pickupDate : _deliveryDate;
    final time = isPickup ? _pickupTime : _deliveryTime;
    return Row(
      children: [
        Expanded(
          child: _dateTile(
            'Date *',
            date != null
                ? DateFormat('dd/MM/yyyy').format(date)
                : 'Selectionner',
            Icons.calendar_today_rounded,
            () => _selectDate(isPickup),
            PremiumTheme.primaryBlue,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _dateTile(
            'Heure',
            time?.format(context) ?? 'Optionnel',
            Icons.access_time_rounded,
            () => _selectTime(isPickup),
            PremiumTheme.primaryIndigo,
          ),
        ),
      ],
    );
  }

  Widget _dateTile(String label, String value, IconData icon,
      VoidCallback onTap, Color color) {
    final hasValue =
        !value.contains('Selectionner') && !value.contains('Optionnel');
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: PremiumTheme.caption.copyWith(
            color: PremiumTheme.primaryBlue,
            fontWeight: FontWeight.w600,
            fontSize: 13,
          ),
        ),
        const SizedBox(height: 6),
        InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(12),
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: hasValue
                  ? color.withValues(alpha: 0.05)
                  : const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: hasValue
                    ? color.withValues(alpha: 0.3)
                    : const Color(0xFFE5E7EB),
              ),
            ),
            child: Row(
              children: [
                Icon(icon,
                    color: hasValue ? color : PremiumTheme.textTertiary,
                    size: 18),
                const SizedBox(width: 10),
                Text(
                  value,
                  style: PremiumTheme.bodySmall.copyWith(
                    color: hasValue
                        ? PremiumTheme.textPrimary
                        : PremiumTheme.textTertiary,
                    fontWeight:
                        hasValue ? FontWeight.w600 : FontWeight.normal,
                    fontSize: 14,
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _suggestionsList(
      List<AddressSuggestion> suggestions, bool isPickup,
      {bool isRestitution = false}) {
    return Container(
      margin: const EdgeInsets.only(top: 4),
      constraints: const BoxConstraints(maxHeight: 200),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE5E7EB)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.08),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: ListView.separated(
        shrinkWrap: true,
        itemCount: suggestions.length,
        separatorBuilder: (_, __) =>
            Divider(height: 1, color: Colors.grey.shade100),
        itemBuilder: (_, i) => ListTile(
          dense: true,
          leading: Icon(Icons.location_on_rounded,
              color: isRestitution
                  ? const Color(0xFFE65100)
                  : PremiumTheme.primaryBlue,
              size: 18),
          title: Text(
            suggestions[i].label,
            style: PremiumTheme.bodySmall.copyWith(fontSize: 13),
          ),
          onTap: () => isRestitution
              ? _selectRestitutionSuggestion(suggestions[i], isPickup)
              : _selectSuggestion(suggestions[i], isPickup),
        ),
      ),
    );
  }

  Widget _buildNavButtons() {
    final ok = _canProceed();
    final isLast = _currentStep == 2;
    return SafeArea(
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.06),
              blurRadius: 12,
              offset: const Offset(0, -4),
            ),
          ],
        ),
        child: Row(
          children: [
            if (_currentStep > 0)
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => setState(() => _currentStep--),
                  icon: const Icon(Icons.arrow_back_rounded, size: 18),
                  label: const Text('Precedent'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: PremiumTheme.textSecondary,
                    side:
                        const BorderSide(color: Color(0xFFE5E7EB)),
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ),
            if (_currentStep > 0) const SizedBox(width: 12),
            Expanded(
              flex: _currentStep > 0 ? 1 : 2,
              child: ElevatedButton.icon(
                onPressed: ok
                    ? () {
                        if (!isLast) {
                          setState(() => _currentStep++);
                        } else {
                          _submit();
                        }
                      }
                    : null,
                icon: Icon(
                  isLast
                      ? Icons.check_circle_rounded
                      : Icons.arrow_forward_rounded,
                  size: 18,
                ),
                label: Text(isLast ? (_isEditing ? 'Enregistrer' : 'Creer la mission') : 'Continuer'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: isLast
                      ? PremiumTheme.accentGreen
                      : PremiumTheme.primaryBlue,
                  foregroundColor: Colors.white,
                  disabledBackgroundColor: const Color(0xFFE5E7EB),
                  disabledForegroundColor: PremiumTheme.textTertiary,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
