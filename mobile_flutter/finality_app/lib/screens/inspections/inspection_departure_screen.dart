import 'package:flutter/material.dart';
import 'dart:async';
import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:path_provider/path_provider.dart';
import 'package:geolocator/geolocator.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:io';
import 'dart:typed_data';
import 'dart:convert';
import '../../widgets/inspection_report_link_dialog.dart';
import '../document_scanner/document_scanner_screen.dart';
import '../../theme/premium_theme.dart';
import 'widgets/inspection_shared_widgets.dart';
import '../../services/notification_service.dart';
import '../../widgets/vehicle_body_map_widget.dart';
import '../../widgets/photo_damage_map_dialog.dart';

/// Écran d'inspection de départ moderne avec 8 photos obligatoires
/// Compatible avec les tables Expo mobile (vehicle_inspections + inspection_photos)
class InspectionDepartureScreen extends StatefulWidget {
  final String missionId;
  final bool isRestitution;

  const InspectionDepartureScreen({
    super.key,
    required this.missionId,
    this.isRestitution = false,
  });

  @override
  State<InspectionDepartureScreen> createState() =>
      _InspectionDepartureScreenState();
}

class _InspectionDepartureScreenState
    extends State<InspectionDepartureScreen> {
  final ImagePicker _picker = ImagePicker();
  final supabase = Supabase.instance.client;

  int _currentStep = 0;
  bool _isSubmitting = false;
  String _vehicleType = 'VL'; // VL, VU, ou PL

  // Step 1: KM, Carburant, Tableau de bord, Propreté
  String? _dashboardPhoto;
  final _kmController = TextEditingController();
  double _fuelLevel = 50;
  String _internalCleanliness = 'propre'; // très sale, sale, correct, propre, très propre
  String _externalCleanliness = 'propre';

  // Step 2: 8 Photos obligatoires avec guidage (initialisé selon le type de véhicule)
  late List<PhotoGuide> _photoGuides;

  final List<String?> _photos = List.filled(8, null);
  final List<String> _photoDamages = List.filled(8, 'RAS');
  final List<String> _photoComments = List.filled(8, '');

  // Photo metadata (GPS + timestamp par photo)
  final List<DateTime?> _photoTimestamps = List.filled(8, null);
  final List<double?> _photoLatitudes = List.filled(8, null);
  final List<double?> _photoLongitudes = List.filled(8, null);

  // Photos optionnelles (10 max, apparaissent progressivement)
  final List<String?> _optionalPhotos = List.filled(10, null);
  final List<String> _optionalPhotoDamages = List.filled(10, 'RAS');
  final List<String> _optionalPhotoComments = List.filled(10, '');
  final List<DateTime?> _optionalPhotoTimestamps = List.filled(10, null);
  final List<double?> _optionalPhotoLatitudes = List.filled(10, null);
  final List<double?> _optionalPhotoLongitudes = List.filled(10, null);

  // Step 3: État du véhicule & Checklist
  String _vehicleCondition = 'Bon';
  int _numberOfKeys = 2;
  bool _hasSecurityKit = false;
  bool _hasSpareWheel = false;
  bool _hasInflationKit = false;
  bool _hasFuelCard = false;
  bool _isVehicleLoaded = false;
  String? _loadedVehiclePhoto; // Photo obligatoire quand véhicule chargé
  bool _hasConfidedObject = false;
  final _confidedObjectController = TextEditingController();

  // Step 4: Signatures
  Uint8List? _driverSignature;
  Uint8List? _clientSignature;
  final _clientNameController = TextEditingController();
  String _driverName = 'Convoyeur'; // Nom par défaut au lieu de vide

  // Step 5: Documents avec nom manuel (optionnel)
  final List<Map<String, String>> _namedDocuments = []; // {url, title}

  // Body map damages — stockés par index photo
  // Clé = index photo (0-7 obligatoires, 8+ optionnelles)
  final Map<int, List<DamageEntry>> _photoDamageEntries = {};

  // Observations (notes de départ)
  final _observationsController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _initializePhotoGuides();
    _loadMissionDetails();
    _loadDriverName();
    _loadDraft();
    // Listeners pour rafraîchir le bouton Suivant en temps réel
    _kmController.addListener(_onFieldChanged);
    _clientNameController.addListener(_onFieldChanged);
  }

  void _onFieldChanged() {
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    // Fire-and-forget draft save — data is best-effort on dispose
    unawaited(_saveDraft());
    _kmController.removeListener(_onFieldChanged);
    _clientNameController.removeListener(_onFieldChanged);
    _kmController.dispose();
    _confidedObjectController.dispose();
    _clientNameController.dispose();
    _observationsController.dispose();
    super.dispose();
  }

  // --- Brouillon auto-save ---
  String get _draftKey => 'inspection_draft_departure_${widget.missionId}';

  Future<void> _saveDraft() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final draft = {
        'step': _currentStep,
        'km': _kmController.text,
        'fuel': _fuelLevel,
        'internalCleanliness': _internalCleanliness,
        'externalCleanliness': _externalCleanliness,
        'vehicleCondition': _vehicleCondition,
        'numberOfKeys': _numberOfKeys,
        'hasSecurityKit': _hasSecurityKit,
        'hasSpareWheel': _hasSpareWheel,
        'hasInflationKit': _hasInflationKit,
        'hasFuelCard': _hasFuelCard,
        'isVehicleLoaded': _isVehicleLoaded,
        'hasConfidedObject': _hasConfidedObject,
        'confidedObject': _confidedObjectController.text,
        'observations': _observationsController.text,
        'clientName': _clientNameController.text,
      };
      await prefs.setString(_draftKey, jsonEncode(draft));
      debugPrint('💾 Brouillon départ sauvegardé (étape $_currentStep)');
    } catch (e) {
      debugPrint('⚠️ Erreur sauvegarde brouillon: $e');
    }
  }

  Future<void> _loadDraft() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final draftJson = prefs.getString(_draftKey);
      if (draftJson == null) return;

      final draft = jsonDecode(draftJson) as Map<String, dynamic>;
      setState(() {
        _currentStep = draft['step'] ?? 0;
        if (draft['km'] != null && (draft['km'] as String).isNotEmpty) {
          _kmController.text = draft['km'];
        }
        _fuelLevel = (draft['fuel'] ?? 50).toDouble();
        _internalCleanliness = draft['internalCleanliness'] ?? 'propre';
        _externalCleanliness = draft['externalCleanliness'] ?? 'propre';
        _vehicleCondition = draft['vehicleCondition'] ?? 'Bon';
        _numberOfKeys = draft['numberOfKeys'] ?? 2;
        _hasSecurityKit = draft['hasSecurityKit'] ?? false;
        _hasSpareWheel = draft['hasSpareWheel'] ?? false;
        _hasInflationKit = draft['hasInflationKit'] ?? false;
        _hasFuelCard = draft['hasFuelCard'] ?? false;
        _isVehicleLoaded = draft['isVehicleLoaded'] ?? false;
        _hasConfidedObject = draft['hasConfidedObject'] ?? false;
        if (draft['confidedObject'] != null) _confidedObjectController.text = draft['confidedObject'];
        if (draft['observations'] != null) _observationsController.text = draft['observations'];
        if (draft['clientName'] != null) _clientNameController.text = draft['clientName'];
      });
      debugPrint('📂 Brouillon départ restauré (étape $_currentStep)');
    } catch (e) {
      debugPrint('⚠️ Erreur chargement brouillon: $e');
    }
  }

  Future<void> _clearDraft() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_draftKey);
      debugPrint('🗑️ Brouillon départ supprimé');
    } catch (e) {
      debugPrint('⚠️ Erreur suppression brouillon: $e');
    }
  }

  /// Initialiser les guides photos selon le type de véhicule
  void _initializePhotoGuides() {
    _photoGuides = buildPhotoGuides(_vehicleType);
  }

  /// Charger les détails de la mission pour obtenir le type de véhicule
  Future<void> _loadMissionDetails() async {
    try {
      final response = await supabase
          .from('missions')
          .select('vehicle_type')
          .eq('id', widget.missionId)
          .maybeSingle();

      if (response != null && response['vehicle_type'] != null) {
        if (!mounted) return;
        setState(() {
          _vehicleType = response['vehicle_type'].toString().toUpperCase();
          _initializePhotoGuides(); // Réinitialiser avec les bonnes images selon le type
        });
        debugPrint('✅ INSPECTION: Vehicle type loaded = $_vehicleType');
      }
    } catch (e) {
      debugPrint('⚠️ INSPECTION: Error loading vehicle type: $e');
    }
  }

  /// Charger le nom du convoyeur depuis profiles
  Future<void> _loadDriverName() async {
    try {
      final userId = supabase.auth.currentUser?.id;
      if (userId == null) return;

      final response = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', userId)
          .maybeSingle();

      if (response != null && mounted) {
        setState(() {
          _driverName = '${response['first_name'] ?? ''} ${response['last_name'] ?? ''}'.trim();
        });
        debugPrint('✅ INSPECTION: Driver name loaded = $_driverName');
      }
    } catch (e) {
      debugPrint('❌ INSPECTION: Error loading driver name: $e');
    }
  }

  int _getVisibleOptionalPhotosCount() {
    // Afficher progressivement les photos optionnelles
    for (int i = 0; i < 10; i++) {
      if (_optionalPhotos[i] == null) {
        return i + 1; // Afficher la suivante vide
      }
    }
    return 10; // Toutes prises
  }

  /// Copie le fichier image du cache vers un répertoire permanent
  /// pour éviter que Android ne supprime le fichier temporaire "scaled_"
  Future<String> _copyToSafeLocation(String sourcePath) async {
    final appDir = await getApplicationDocumentsDirectory();
    final inspDir = Directory('${appDir.path}/inspection_photos');
    if (!inspDir.existsSync()) {
      inspDir.createSync(recursive: true);
    }
    final fileName = 'photo_${DateTime.now().millisecondsSinceEpoch}.jpg';
    final destPath = '${inspDir.path}/$fileName';
    final sourceFile = File(sourcePath);
    if (sourceFile.existsSync()) {
      await sourceFile.copy(destPath);
      return destPath;
    }
    // Si le fichier source n'existe déjà plus, retourner le chemin original
    return sourcePath;
  }

  Future<void> _takePhoto(int index, bool isOptional) async {
    // Show guidance dialog for mandatory photos
    if (!isOptional && index < _photoGuides.length) {
      final guide = _photoGuides[index];
      final shouldProceed = await _showPhotoGuidance(guide);
      if (shouldProceed != true) return;
    }

    try {
      final XFile? image = await _picker.pickImage(
        source: ImageSource.camera,
        imageQuality: 85,
        maxWidth: 1920,
        maxHeight: 1080,
      );

      if (image != null) {
        // Capturer timestamp + GPS au moment de la prise
        final timestamp = DateTime.now().toUtc();
        double? lat;
        double? lng;
        try {
          final perm = await Geolocator.checkPermission();
          if (perm == LocationPermission.whileInUse || perm == LocationPermission.always) {
            final pos = await Geolocator.getCurrentPosition(
              desiredAccuracy: LocationAccuracy.high,
            ).timeout(const Duration(seconds: 5));
            lat = pos.latitude;
            lng = pos.longitude;
          }
        } catch (_) {}

        // Copier immédiatement vers un emplacement permanent
        final safePath = await _copyToSafeLocation(image.path);
        if (!mounted) return;
        setState(() {
          if (isOptional) {
            _optionalPhotos[index] = safePath;
            _optionalPhotoTimestamps[index] = timestamp;
            _optionalPhotoLatitudes[index] = lat;
            _optionalPhotoLongitudes[index] = lng;
          } else {
            _photos[index] = safePath;
            _photoTimestamps[index] = timestamp;
            _photoLatitudes[index] = lat;
            _photoLongitudes[index] = lng;
          }
        });
      }
    } catch (e) {
      _showError('Erreur lors de la capture: $e');
    }
  }

  /// Shows a photo guidance overlay before taking a photo
  Future<bool?> _showPhotoGuidance(PhotoGuide guide) async {
    return showDialog<bool>(
      context: context,
      builder: (ctx) => Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        child: Container(
          constraints: const BoxConstraints(maxWidth: 380),
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: const Color(0xFF14B8A6).withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(guide.icon, color: const Color(0xFF14B8A6), size: 24),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(guide.label, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 2),
                        Text(guide.description, style: TextStyle(fontSize: 13, color: Colors.grey.shade600)),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              if (guide.image != null)
                Container(
                  height: 200,
                  width: double.infinity,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: Colors.grey.shade200, width: 2),
                  ),
                  clipBehavior: Clip.antiAlias,
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      Image.asset(
                        guide.image!,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => Container(
                          color: Colors.grey.shade100,
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(guide.icon, size: 48, color: Colors.grey.shade400),
                              const SizedBox(height: 8),
                              Text(guide.label, style: TextStyle(color: Colors.grey.shade500)),
                            ],
                          ),
                        ),
                      ),
                      Positioned(
                        bottom: 0, left: 0, right: 0,
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 12),
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              begin: Alignment.bottomCenter,
                              end: Alignment.topCenter,
                              colors: [Colors.black.withValues(alpha: 0.7), Colors.transparent],
                            ),
                          ),
                          child: const Text(
                            '📐 Prenez la photo sous cet angle',
                            style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
                            textAlign: TextAlign.center,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF3C7),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.lightbulb_outline, color: Color(0xFFF59E0B), size: 20),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Conseil : Photographiez à environ 2m du véhicule, en lumière naturelle si possible.',
                        style: TextStyle(color: Colors.orange.shade900, fontSize: 12),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.pop(ctx, false),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: const Text('Annuler'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () => Navigator.pop(ctx, true),
                      icon: const Icon(Icons.camera_alt, size: 18),
                      label: const Text('Prendre'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF14B8A6),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _takeDashboardPhoto() async {
    try {
      final XFile? image = await _picker.pickImage(
        source: ImageSource.camera,
        imageQuality: 85,
        maxWidth: 1920,
        maxHeight: 1080,
      );

      if (image != null) {
        // Copier immédiatement vers un emplacement permanent
        final safePath = await _copyToSafeLocation(image.path);
        if (!mounted) return;
        setState(() {
          _dashboardPhoto = safePath;
        });
      }
    } catch (e) {
      _showError('Erreur lors de la capture: $e');
    }
  }

  bool _canProceed() {
    switch (_currentStep) {
      case 0:
        return _dashboardPhoto != null && _kmController.text.isNotEmpty;
      case 1:
        // Vérifier que les 8 photos sont prises
        if (!_photos.every((photo) => photo != null)) return false;
        // Vérifier que chaque dommage ≠ RAS a au moins une zone cochée sur le schéma
        for (int i = 0; i < 8; i++) {
          if (_photoDamages[i] != 'RAS' && (_photoDamageEntries[i]?.isEmpty ?? true)) return false;
        }
        // Vérifier les photos optionnelles
        for (int i = 0; i < 10; i++) {
          if (_optionalPhotos[i] != null && _optionalPhotoDamages[i] != 'RAS' && (_photoDamageEntries[i + 8]?.isEmpty ?? true)) return false;
        }
        return true;
      case 2:
        // Si véhicule chargé, photo obligatoire
        if (_isVehicleLoaded && _loadedVehiclePhoto == null) return false;
        return true;
      case 3:
        return _driverSignature != null &&
            _clientSignature != null &&
            _clientNameController.text.isNotEmpty;
      case 4:
        return true; // Documents optionnels
      case 5:
        return true; // Récapitulatif - toujours OK
      default:
        return false;
    }
  }

  Future<void> _submit() async {
    if (!_canProceed()) {
      _showError('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      final userId = supabase.auth.currentUser?.id;
      if (userId == null) throw 'Utilisateur non connecté';

      // 0. Capturer la position GPS
      debugPrint('📍 STEP 0: Capturing GPS position...');
      double? gpsLat;
      double? gpsLng;
      try {
        final perm = await Geolocator.checkPermission();
        if (perm == LocationPermission.whileInUse || perm == LocationPermission.always) {
          final pos = await Geolocator.getCurrentPosition(
            desiredAccuracy: LocationAccuracy.high,
          ).timeout(const Duration(seconds: 10));
          gpsLat = pos.latitude;
          gpsLng = pos.longitude;
          debugPrint('✅ GPS: $gpsLat, $gpsLng');
        }
      } catch (e) {
        debugPrint('⚠️ GPS capture failed (non-blocking): $e');
      }

      // 1. Créer l'inspection dans vehicle_inspections
      debugPrint('📝 STEP 1: Creating vehicle_inspection...');
      final mileageKm = int.tryParse(_kmController.text) ?? 0;
      final now = DateTime.now().toUtc().toIso8601String();
      final inspectionData = {
        'mission_id': widget.missionId,
        'inspector_id': userId,
        'inspection_type': widget.isRestitution ? 'restitution_departure' : 'departure',
        'status': 'completed',
        'completed_at': now,
        'mileage_km': mileageKm,
        'fuel_level': _fuelLevel.toInt(),
        'overall_condition': _vehicleCondition.toLowerCase(),
        'internal_cleanliness': _internalCleanliness,
        'external_cleanliness': _externalCleanliness,
        'notes': _observationsController.text.isNotEmpty ? _observationsController.text : null,
        'latitude': gpsLat,
        'longitude': gpsLng,
        'vehicle_info': {
          'keys_count': _numberOfKeys,
          'has_security_kit': _hasSecurityKit,
          'has_spare_wheel': _hasSpareWheel,
          'has_inflation_kit': _hasInflationKit,
          'has_fuel_card': _hasFuelCard,
          'is_loaded': _isVehicleLoaded,
          'has_loaded_photo': _loadedVehiclePhoto != null,
          'has_confided_object': _hasConfidedObject,
          'confided_object_description': _hasConfidedObject ? _confidedObjectController.text : null,
        },
        'inspector_signature': _driverSignature != null
            ? 'data:image/png;base64,${base64Encode(_driverSignature!)}'
            : null,
        'driver_signature': _driverSignature != null
            ? 'data:image/png;base64,${base64Encode(_driverSignature!)}'
            : null,
        'driver_name': _driverName,
        'client_signature': _clientSignature != null
            ? 'data:image/png;base64,${base64Encode(_clientSignature!)}'
            : null,
        'client_name': _clientNameController.text,
      };

      final inspectionResponse = await supabase
          .from('vehicle_inspections')
          .insert(inspectionData)
          .select('id')
          .single();

      final inspectionId = inspectionResponse['id'];
      debugPrint('✅ STEP 1 OK: inspectionId=$inspectionId');

      // 2. Upload photos vers inspection-photos bucket (parallèle par batch de 3)
      debugPrint('📸 STEP 2: Uploading photos...');
      final allPhotos = <Map<String, dynamic>>[
        if (_dashboardPhoto != null)
          {'path': _dashboardPhoto!, 'type': 'dashboard', 'index': -1, 'damage': 'RAS', 'comment': '', 'lat': null, 'lng': null, 'takenAt': null},
        if (_loadedVehiclePhoto != null)
          {'path': _loadedVehiclePhoto!, 'type': 'loaded_vehicle', 'index': -2, 'damage': 'RAS', 'comment': '', 'lat': null, 'lng': null, 'takenAt': null},
        ..._photos.asMap().entries.where((e) => e.value != null).map((e) => {
              'path': e.value!,
              'type': _photoGuides[e.key].label,
              'index': e.key,
              'damage': _photoDamages[e.key],
              'comment': _photoComments[e.key],
              'lat': _photoLatitudes[e.key],
              'lng': _photoLongitudes[e.key],
              'takenAt': _photoTimestamps[e.key]?.toIso8601String(),
            }),
        ..._optionalPhotos.asMap().entries.where((e) => e.value != null).map((e) => {
              'path': e.value!,
              'type': 'Photo optionnelle ${e.key + 1}',
              'index': e.key + 8,
              'damage': _optionalPhotoDamages[e.key],
              'comment': _optionalPhotoComments[e.key],
              'lat': _optionalPhotoLatitudes[e.key],
              'lng': _optionalPhotoLongitudes[e.key],
              'takenAt': _optionalPhotoTimestamps[e.key]?.toIso8601String(),
            }),
      ];

      // Upload par batch de 3 en parallèle
      for (int i = 0; i < allPhotos.length; i += 3) {
        final batch = allPhotos.skip(i).take(3);
        await Future.wait(batch.map((photo) async {
          final filePath = photo['path'] as String;
          final file = File(filePath);
          if (!file.existsSync()) {
            debugPrint('⚠️ Photo file missing: $filePath');
            return;
          }
          final bytes = await file.readAsBytes();
          final photoType = (photo['type'] as String).replaceAll(' ', '_').replaceAll('é', 'e').replaceAll('è', 'e');
          final fileName =
              'inspection_${inspectionId}_${photoType}_${DateTime.now().millisecondsSinceEpoch}_${photo['index']}.jpg';
          final storagePath = 'inspections/$userId/$fileName';

          await supabase.storage.from('inspection-photos').uploadBinary(
                storagePath,
                bytes,
                fileOptions: const FileOptions(upsert: true),
              );

          final publicUrl =
              supabase.storage.from('inspection-photos').getPublicUrl(storagePath);

          // 3. Enregistrer dans inspection_photos_v2
          await supabase.from('inspection_photos_v2').insert({
            'inspection_id': inspectionId,
            'full_url': publicUrl,
            'photo_type': photo['type'],
            'damage_status': photo['damage'],
            'damage_comment': (photo['damage'] != 'RAS' && (photo['comment'] as String).isNotEmpty) ? photo['comment'] : null,
            'taken_at': photo['takenAt'] ?? DateTime.now().toUtc().toIso8601String(),
            'latitude': photo['lat'],
            'longitude': photo['lng'],
          });
        }));
      }
      debugPrint('✅ STEP 2-3 OK: ${allPhotos.length} photos uploaded');

      // 4. Upload scanned documents avec noms personnalisés
      debugPrint('📄 STEP 4: Uploading documents...');
      for (final doc in _namedDocuments) {
        final docPath = doc['url'] ?? '';
        final file = File(docPath);
        if (!file.existsSync()) {
          debugPrint('⚠️ Document file missing: $docPath');
          continue;
        }
        final bytes = await file.readAsBytes();
        final fileName =
            'departure_doc_${inspectionId}_${DateTime.now().millisecondsSinceEpoch}.jpg';
        final storagePath = 'inspection-documents/$userId/$fileName';

        await supabase.storage.from('inspection-photos').uploadBinary(
              storagePath,
              bytes,
              fileOptions: const FileOptions(upsert: true),
            );

        final publicUrl =
            supabase.storage.from('inspection-photos').getPublicUrl(storagePath);

        await supabase.from('inspection_documents').insert({
          'inspection_id': inspectionId,
          'document_url': publicUrl,
          'document_type': 'custom',
          'document_title': doc['title'] ?? 'Document',
        });
      }
      debugPrint('✅ STEP 4 OK: ${_namedDocuments.length} documents uploaded');

      // 4b. Sauvegarder les dommages liés aux photos (body map intégré)
      final allDamages = _photoDamageEntries.values.expand((list) => list).toList();
      for (final damage in allDamages) {
        await supabase.from('inspection_damages').insert({
          'inspection_id': inspectionId,
          'damage_type': damage.type.name,
          'severity': 'moderate',
          'location': damage.zone.key,
          'description': '${damage.zone.label} — ${damage.type.label}${damage.comment.isNotEmpty ? ': ${damage.comment}' : ''}',
          'detected_by': 'manual',
        });
      }
      debugPrint('✅ STEP 4b OK: ${allDamages.length} damages saved');

      // 5. Mettre à jour le statut de la mission à 'in_progress' UNIQUEMENT après validation de l'inspection de départ
      if (!widget.isRestitution) {
        debugPrint('🔄 STEP 5: Updating mission status...');
        await supabase.from('missions').update({
          'status': 'in_progress',
        }).eq('id', widget.missionId);
        debugPrint('✅ STEP 5 OK');
      } else {
        debugPrint('⏭️ STEP 5: Restitution - mission status unchanged');
      }

      // 6. Créer ou mettre à jour le token de partage dans inspection_report_shares
      debugPrint('🔗 STEP 6: Creating share token...');
      final shareToken = '${DateTime.now().millisecondsSinceEpoch.toRadixString(36)}${userId.substring(0, 8)}';
      await supabase.from('inspection_report_shares').upsert({
        'mission_id': widget.missionId,
        'share_token': shareToken,
        'user_id': userId,
        'report_type': widget.isRestitution ? 'restitution_departure' : 'departure',
        'is_active': true,
      }, onConflict: 'mission_id,report_type');
      debugPrint('✅ STEP 6 OK');

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(widget.isRestitution
                ? '✅ Inspection de départ restitution enregistrée'
                : '✅ Inspection de départ enregistrée'),
            backgroundColor: const Color(0xFF14B8A6),
          ),
        );
        
        // Proposer de partager le rapport avec le signataire
        await showDialog(
          context: context,
          barrierDismissible: false,
          builder: (ctx) => InspectionReportLinkDialog(
            shareToken: shareToken,
            reportType: widget.isRestitution ? 'restitution_departure' : 'departure',
          ),
        );

        // Push notification for completed inspection
        NotificationService().showMissionNotification(
          title: 'Inspection de départ terminée',
          body: widget.isRestitution
              ? 'L\'inspection de départ restitution a été enregistrée avec succès'
              : 'L\'inspection de départ a été enregistrée avec succès',
          payload: 'mission:${widget.missionId}',
        );

        if (mounted) Navigator.pop(context, true);
        _clearDraft();
      }
    } catch (e) {
      debugPrint('❌ INSPECTION DEPARTURE ERROR: $e');
      _showError('Erreur: $e');
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
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

  @override
  Widget build(BuildContext context) {
    final hasProgress = _currentStep > 0 ||
        _dashboardPhoto != null ||
        _photos.any((p) => p != null) ||
        _kmController.text.isNotEmpty;

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) async {
        if (didPop) return;
        if (!hasProgress) { Navigator.pop(context); return; }
        final confirm = await showDialog<bool>(
          context: context,
          builder: (_) => AlertDialog(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            title: const Text('Quitter l\'inspection ?',
                style: TextStyle(fontWeight: FontWeight.bold)),
            content: const Text(
                'Votre progression sera perdue. Voulez-vous vraiment quitter ?'),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context, false),
                child: const Text('Continuer'),
              ),
              FilledButton(
                style: FilledButton.styleFrom(backgroundColor: Colors.red),
                onPressed: () => Navigator.pop(context, true),
                child: const Text('Quitter'),
              ),
            ],
          ),
        );
        if (confirm == true && context.mounted) Navigator.pop(context);
      },
      child: Scaffold(
      backgroundColor: PremiumTheme.lightBg,
      body: Stack(
        children: [
        Column(
        children: [
          // Header compact avec progress
          SafeArea(
            bottom: false,
            child: Container(
              decoration: BoxDecoration(
                gradient: PremiumTheme.tealGradient,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                    child: Row(
                      children: [
                        IconButton(
                          icon: const Icon(Icons.close, color: Colors.white, size: 22),
                          onPressed: () async {
                            if (!hasProgress) { Navigator.pop(context); return; }
                            final confirm = await showDialog<bool>(
                              context: context,
                              builder: (_) => AlertDialog(
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                                title: const Text('Quitter l\'inspection ?',
                                    style: TextStyle(fontWeight: FontWeight.bold)),
                                content: const Text(
                                    'Votre progression sera perdue. Voulez-vous vraiment quitter ?'),
                                actions: [
                                  TextButton(
                                    onPressed: () => Navigator.pop(context, false),
                                    child: const Text('Continuer'),
                                  ),
                                  FilledButton(
                                    style: FilledButton.styleFrom(backgroundColor: Colors.red),
                                    onPressed: () => Navigator.pop(context, true),
                                    child: const Text('Quitter'),
                                  ),
                                ],
                              ),
                            );
                            if (confirm == true && context.mounted) Navigator.pop(context);
                          },
                        ),
                        Expanded(
                          child: Text(
                            'Inspection de départ',
                            style: PremiumTheme.heading3.copyWith(
                              color: Colors.white,
                              fontSize: 17,
                            ),
                            textAlign: TextAlign.center,
                          ),
                        ),
                        const SizedBox(width: 48),
                      ],
                    ),
                  ),
                  _buildProgressIndicator(),
                ],
              ),
            ),
          ),

          // Content
          Expanded(
            child: _buildStepContent(),
          ),

          // Navigation buttons
          _buildNavigationButtons(),
        ],
      ),
        // Loading overlay pendant la soumission
        if (_isSubmitting)
          Container(
            color: Colors.black54,
            child: const Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  CircularProgressIndicator(color: Color(0xFF14B8A6), strokeWidth: 3),
                  SizedBox(height: 20),
                  Text('Envoi de l\'inspection en cours…',
                      style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w600)),
                  SizedBox(height: 8),
                  Text('Photos, signatures et documents',
                      style: TextStyle(color: Colors.white70, fontSize: 13)),
                ],
              ),
            ),
          ),
        ],
      ),
    ), // Scaffold
    ); // PopScope
  }

  Widget _buildProgressIndicator() {
    return Container(
      padding: const EdgeInsets.fromLTRB(24, 16, 24, 20),
      decoration: BoxDecoration(
        color: PremiumTheme.cardBg,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.08),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          // Step bars row with labels
          Row(
            children: List.generate(6, (i) {
              final isActive = i == _currentStep;
              final isCompleted = i < _currentStep;
              final labels = ['KM', 'Photos', 'État', 'Sign.', 'Docs', 'Recap'];
              return Expanded(
                child: Column(
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 300),
                            height: 4,
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(2),
                              gradient: isCompleted || isActive
                                  ? const LinearGradient(
                                      colors: [Color(0xFF14B8A6), Color(0xFF0D9488)],
                                    )
                                  : null,
                              color: isCompleted || isActive ? null : const Color(0xFFE5E7EB),
                            ),
                          ),
                        ),
                        if (i < 5) const SizedBox(width: 6),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      labels[i],
                      style: TextStyle(
                        fontSize: 9,
                        fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
                        color: isActive
                            ? const Color(0xFF14B8A6)
                            : isCompleted
                                ? PremiumTheme.textPrimary
                                : PremiumTheme.textSecondary,
                      ),
                    ),
                  ],
                ),
              );
            }),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              // Step number badge
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF14B8A6), Color(0xFF0D9488)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF14B8A6).withValues(alpha: 0.3),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Center(
                  child: Text(
                    '${_currentStep + 1}',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 14),
              // Step labels
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _getStepTitle(_currentStep),
                      style: PremiumTheme.body.copyWith(
                        fontWeight: FontWeight.w700,
                        fontSize: 15,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      _getStepDescription(_currentStep),
                      style: PremiumTheme.bodySmall.copyWith(
                        color: PremiumTheme.textSecondary,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
              // Mini progress
              Text(
                '${_currentStep + 1}/6',
                style: const TextStyle(
                  color: Color(0xFF14B8A6),
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  String _getStepTitle(int step) {
    switch (step) {
      case 0:
        return 'Étape 1: Compteur & Carburant';
      case 1:
        return 'Étape 2: Photos obligatoires (8)';
      case 2:
        return 'Étape 3: État du véhicule';
      case 3:
        return 'Étape 4: Signatures';
      case 4:
        return 'Étape 5: Documents (optionnel)';
      case 5:
        return 'Étape 6: Récapitulatif';
      default:
        return '';
    }
  }

  String _getStepDescription(int step) {
    switch (step) {
      case 0:
        return 'Kilométrage, niveau de carburant, tableau de bord';
      case 1:
        return 'Capturez les 8 vues requises du véhicule';
      case 2:
        return 'Checklist complète de l\'inspection';
      case 3:
        return 'Signatures convoyeur et client';
      case 4:
        return 'Scanner les documents nécessaires';
      case 5:
        return 'Vérifiez toutes les informations avant envoi';
      default:
        return '';
    }
  }

  Widget _buildStepContent() {
    switch (_currentStep) {
      case 0:
        return _buildKmFuelStep();
      case 1:
        return _buildPhotosStep();
      case 2:
        return _buildChecklistStep();
      case 3:
        return _buildSignaturesStep();
      case 4:
        return _buildDocumentsStep();
      case 5:
        return _buildRecapStep();
      default:
        return const SizedBox();
    }
  }

  Widget _buildKmFuelStep() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Title with icon card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  const Color(0xFF14B8A6).withValues(alpha: 0.08),
                  const Color(0xFF14B8A6).withValues(alpha: 0.02),
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFF14B8A6).withValues(alpha: 0.2)),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFF14B8A6).withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.speed, color: Color(0xFF14B8A6), size: 24),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'État initial du véhicule',
                        style: TextStyle(
                          color: PremiumTheme.textPrimary,
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Photographiez le tableau de bord et renseignez le kilométrage',
                        style: TextStyle(color: PremiumTheme.textSecondary, fontSize: 13),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 28),

          // Dashboard photo
          GestureDetector(
            onTap: _takeDashboardPhoto,
            child: Container(
              height: 200,
              decoration: BoxDecoration(
                color: const Color(0xFF1F2937),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: _dashboardPhoto != null
                      ? const Color(0xFF14B8A6)
                      : const Color(0xFF374151),
                  width: 2,
                ),
                image: _dashboardPhoto == null
                    ? const DecorationImage(
                        image: AssetImage('assets/vehicles/tableau_de_bord.png'),
                        fit: BoxFit.cover,
                        opacity: 0.3,
                      )
                    : null,
              ),
              child: _dashboardPhoto != null
                  ? ClipRRect(
                      borderRadius: BorderRadius.circular(14),
                      child: Image.file(
                        File(_dashboardPhoto!),
                        fit: BoxFit.cover,
                      ),
                    )
                  : Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(
                          Icons.camera_alt,
                          size: 48,
                          color: Color(0xFF14B8A6),
                        ),
                        const SizedBox(height: 12),
                        Text(
                          'Photo du tableau de bord',
                          style: TextStyle(
                            color: PremiumTheme.textPrimary,
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Appuyez pour prendre la photo',
                          style: TextStyle(
                            color: PremiumTheme.textSecondary,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
            ),
          ),
          const SizedBox(height: 32),

          // Kilométrage
          const Text(
            'Kilométrage',
            style: TextStyle(
              color: Color(0xFF14B8A6),
              fontSize: 16,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _kmController,
            keyboardType: TextInputType.number,
            style: TextStyle(color: PremiumTheme.textPrimary, fontSize: 18),
            decoration: InputDecoration(
              hintText: 'Ex: 125000',
              hintStyle: TextStyle(color: PremiumTheme.textTertiary),
              suffixText: 'km',
              suffixStyle: TextStyle(
                color: PremiumTheme.textSecondary,
                fontSize: 16,
              ),
              filled: true,
              fillColor: PremiumTheme.cardBg,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: Color(0xFF374151)),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: Color(0xFF374151)),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: Color(0xFF14B8A6), width: 2),
              ),
            ),
          ),
          const SizedBox(height: 32),

          // Niveau de carburant
          const Text(
            'Niveau de carburant',
            style: TextStyle(
              color: Color(0xFF14B8A6),
              fontSize: 16,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: PremiumTheme.cardBg,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE5E7EB)),
            ),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Icon(Icons.local_gas_station,
                        color: Color(0xFF14B8A6)),
                    Text(
                      '${_fuelLevel.toInt()}%',
                      style: TextStyle(
                        color: PremiumTheme.textPrimary,
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                SliderTheme(
                  data: SliderThemeData(
                    activeTrackColor: const Color(0xFF14B8A6),
                    inactiveTrackColor: const Color(0xFFE5E7EB),
                    thumbColor: const Color(0xFF14B8A6),
                    overlayColor: const Color(0xFF14B8A6).withValues(alpha: 0.2),
                    trackHeight: 8,
                    thumbShape:
                        const RoundSliderThumbShape(enabledThumbRadius: 12),
                  ),
                  child: Slider(
                    value: _fuelLevel,
                    min: 0,
                    max: 100,
                    divisions: 20,
                    onChanged: (value) {
                      setState(() => _fuelLevel = value);
                    },
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 32),

          // Propreté intérieure
          const Text(
            'Propreté intérieure',
            style: TextStyle(
              color: Color(0xFF14B8A6),
              fontSize: 16,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 12),
          _buildCleanlinessSelector(_internalCleanliness, (v) => setState(() => _internalCleanliness = v)),
          const SizedBox(height: 24),

          // Propreté extérieure
          const Text(
            'Propreté extérieure',
            style: TextStyle(
              color: Color(0xFF14B8A6),
              fontSize: 16,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 12),
          _buildCleanlinessSelector(_externalCleanliness, (v) => setState(() => _externalCleanliness = v)),
        ],
      ),
    );
  }

  Widget _buildPhotosStep() {
    final missingCount = _photos.where((p) => p == null).length;
    final takenCount = 8 - missingCount;

    return Column(
      children: [
        // Header with progress info
        Container(
          padding: const EdgeInsets.fromLTRB(24, 20, 24, 16),
          decoration: BoxDecoration(
            color: PremiumTheme.cardBg,
            border: const Border(bottom: BorderSide(color: Color(0xFFE5E7EB))),
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: missingCount > 0
                      ? const Color(0xFFF59E0B).withValues(alpha: 0.15)
                      : const Color(0xFF14B8A6).withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  missingCount > 0 ? Icons.camera_alt : Icons.check_circle,
                  color: missingCount > 0 ? const Color(0xFFF59E0B) : const Color(0xFF14B8A6),
                  size: 22,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Photos du véhicule',
                      style: TextStyle(
                        color: PremiumTheme.textPrimary,
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      missingCount > 0
                          ? 'Il manque $missingCount photo${missingCount > 1 ? 's' : ''} obligatoire${missingCount > 1 ? 's' : ''}'
                          : 'Toutes les photos sont prises !',
                      style: TextStyle(
                        color: missingCount > 0 ? const Color(0xFFF59E0B) : const Color(0xFF14B8A6),
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
              // Counter badge
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: missingCount > 0
                        ? [const Color(0xFFF59E0B), const Color(0xFFD97706)]
                        : [const Color(0xFF14B8A6), const Color(0xFF0D9488)],
                  ),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  '$takenCount/8',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
        ),

        // Photos grid
        Expanded(
          child: GridView.builder(
            padding: const EdgeInsets.all(16),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              childAspectRatio: 0.65,
            ),
            itemCount: 8 + _getVisibleOptionalPhotosCount(),
            itemBuilder: (context, index) {
              if (index < 8) {
                return _buildPhotoCard(index, false);
              } else {
                return _buildPhotoCard(index - 8, true);
              }
            },
          ),
        ),
      ],
    );
  }

  Widget _buildPhotoCard(int index, bool isOptional) {
    final String label;
    final IconData icon;
    final String? photoPath;
    final String damage;
    
    if (isOptional) {
      label = 'Photo optionnelle ${index + 1}';
      icon = Icons.add_a_photo;
      photoPath = _optionalPhotos[index];
      damage = _optionalPhotoDamages[index];
    } else {
      final guide = _photoGuides[index];
      label = guide.label;
      icon = guide.icon;
      photoPath = _photos[index];
      damage = _photoDamages[index];
    }
    
    final hasPhoto = photoPath != null;

    return GestureDetector(
      onTap: () => _takePhoto(index, isOptional),
      child: Container(
        decoration: BoxDecoration(
          color: PremiumTheme.cardBg,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: hasPhoto ? const Color(0xFF14B8A6) : const Color(0xFFE5E7EB),
            width: 2,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.05),
              blurRadius: 4,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Photo or placeholder
            Expanded(
              child: ClipRRect(
                borderRadius: const BorderRadius.vertical(
                  top: Radius.circular(14),
                ),
                child: hasPhoto
                    ? Image.file(
                        File(photoPath),
                        fit: BoxFit.cover,
                      )
                    : !isOptional && _photoGuides[index].image != null
                        ? Stack(
                            children: [
                              Opacity(
                                opacity: 0.3,
                                child: Image.asset(
                                  _photoGuides[index].image!,
                                  fit: BoxFit.cover,
                                ),
                              ),
                              Center(
                                child: Icon(
                                  Icons.camera_alt,
                                  size: 32,
                                  color: PremiumTheme.primaryTeal.withValues(alpha: 0.7),
                                ),
                              ),
                            ],
                          )
                        : Center(
                            child: Icon(
                              icon,
                              size: 48,
                              color: isOptional 
                                  ? const Color(0xFF6B7280)
                                  : const Color(0xFF374151),
                            ),
                          ),
              ),
            ),

            // Label and damage selector
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          label,
                          style: TextStyle(
                            color: isOptional ? PremiumTheme.textSecondary : PremiumTheme.textPrimary,
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      if (hasPhoto)
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 6,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: isOptional 
                                ? const Color(0xFF6B7280)
                                : const Color(0xFF14B8A6),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: const Icon(
                            Icons.check,
                            size: 12,
                            color: Colors.white,
                          ),
                        ),
                    ],
                  ),
                  if (hasPhoto) ...[
                    const SizedBox(height: 8),
                    DropdownButtonFormField<String>(
                      value: damage,
                      dropdownColor: PremiumTheme.cardBg,
                      style: TextStyle(
                        color: PremiumTheme.textPrimary,
                        fontSize: 12,
                      ),
                      decoration: InputDecoration(
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 4,
                        ),
                        filled: true,
                        fillColor: PremiumTheme.cardBgLight,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(6),
                          borderSide: const BorderSide(color: Color(0xFFE5E7EB)),
                        ),
                      ),
                      items: ['RAS', 'Rayures', 'Cassé', 'Abimé']
                          .map((damage) => DropdownMenuItem(
                                value: damage,
                                child: Text(
                                  damage,
                                  style: const TextStyle(fontSize: 11),
                                ),
                              ))
                          .toList(),
                      onChanged: (value) {
                        setState(() {
                          if (isOptional) {
                            _optionalPhotoDamages[index] = value ?? 'RAS';
                            if (value == 'RAS') _optionalPhotoComments[index] = '';
                          } else {
                            _photoDamages[index] = value ?? 'RAS';
                            if (value == 'RAS') _photoComments[index] = '';
                          }
                        });
                        // Si dommage signalé → ouvrir le schéma de la zone
                        if (value != null && value != 'RAS') {
                          final photoIdx = isOptional ? index + 8 : index;
                          _openPhotoDamageMap(photoIdx, isOptional ? 'Photo optionnelle ${index + 1}' : _photoGuides[index].label);
                        }
                      },
                    ),
                    // Badge dommages + bouton schéma si dommages signalés
                    if (damage != 'RAS') ...[
                      const SizedBox(height: 6),
                      _buildDamageMapButton(isOptional ? index + 8 : index, isOptional ? 'Photo optionnelle ${index + 1}' : _photoGuides[index].label),
                    ],
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Ouvre le dialog de schéma véhicule filtré par angle photo
  Future<void> _openPhotoDamageMap(int photoIndex, String photoLabel) async {
    final existing = _photoDamageEntries[photoIndex] ?? [];
    final result = await showDialog<List<DamageEntry>>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => PhotoDamageMapDialog(
        photoIndex: photoIndex,
        photoLabel: photoLabel,
        existingDamages: existing,
      ),
    );
    if (result != null) {
      setState(() {
        _photoDamageEntries[photoIndex] = result;
        // Mettre à jour le commentaire photo avec le résumé des dommages
        final summary = result.map((d) => '${d.zone.label}: ${d.type.label}').join(', ');
        if (photoIndex < 8) {
          _photoComments[photoIndex] = summary;
        } else {
          _optionalPhotoComments[photoIndex - 8] = summary;
        }
      });
    }
  }

  /// Bouton pour ouvrir/rouvrir le schéma de dommages d'une photo
  Widget _buildDamageMapButton(int photoIndex, String label) {
    final damages = _photoDamageEntries[photoIndex] ?? [];
    return GestureDetector(
      onTap: () => _openPhotoDamageMap(photoIndex, label),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: damages.isNotEmpty ? const Color(0xFFFEE2E2) : const Color(0xFFFEF3C7),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: damages.isNotEmpty ? const Color(0xFFEF4444) : const Color(0xFFF59E0B),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              damages.isNotEmpty ? Icons.warning_rounded : Icons.touch_app,
              size: 14,
              color: damages.isNotEmpty ? const Color(0xFFEF4444) : const Color(0xFFF59E0B),
            ),
            const SizedBox(width: 4),
            Flexible(
              child: Text(
                damages.isNotEmpty
                    ? '${damages.length} dommage(s) — Modifier'
                    : '📍 Localiser sur le schéma',
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w600,
                  color: damages.isNotEmpty ? const Color(0xFFDC2626) : const Color(0xFFD97706),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildChecklistStep() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Title card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  const Color(0xFF14B8A6).withValues(alpha: 0.08),
                  const Color(0xFF14B8A6).withValues(alpha: 0.02),
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFF14B8A6).withValues(alpha: 0.2)),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFF14B8A6).withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.checklist_rtl, color: Color(0xFF14B8A6), size: 24),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Text(
                    'État et équipements',
                    style: TextStyle(
                      color: PremiumTheme.textPrimary,
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Condition selector
          const Text(
            'État général du véhicule',
            style: TextStyle(
              color: Color(0xFF14B8A6),
              fontSize: 16,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 12,
            children: ['Excellent', 'Bon', 'Moyen', 'Mauvais']
                .map((condition) => ChoiceChip(
                      label: Text(condition),
                      selected: _vehicleCondition == condition,
                      onSelected: (selected) {
                        setState(() => _vehicleCondition = condition);
                      },
                      selectedColor: const Color(0xFF14B8A6),
                      backgroundColor: PremiumTheme.cardBgLight,
                      labelStyle: TextStyle(
                        color: _vehicleCondition == condition
                            ? Colors.white
                            : PremiumTheme.textPrimary,
                        fontWeight: FontWeight.w600,
                      ),
                    ))
                .toList(),
          ),
          const SizedBox(height: 32),

          // Number of keys
          const Text(
            'Nombre de clés',
            style: TextStyle(
              color: Color(0xFF14B8A6),
              fontSize: 16,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: PremiumTheme.cardBg,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE5E7EB)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Icon(Icons.vpn_key, color: Color(0xFF14B8A6)),
                Row(
                  children: [
                    IconButton(
                      onPressed: _numberOfKeys > 0
                          ? () => setState(() => _numberOfKeys--)
                          : null,
                      icon: const Icon(Icons.remove_circle_outline),
                      color: const Color(0xFF14B8A6),
                    ),
                    Text(
                      '$_numberOfKeys',
                      style: TextStyle(
                        color: PremiumTheme.textPrimary,
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    IconButton(
                      onPressed: () => setState(() => _numberOfKeys++),
                      icon: const Icon(Icons.add_circle_outline),
                      color: const Color(0xFF14B8A6),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Checklist
          const Text(
            'Équipements',
            style: TextStyle(
              color: Color(0xFF14B8A6),
              fontSize: 16,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 12),
          _buildChecklistItem(
            'Kit de sécurité',
            Icons.medical_services,
            _hasSecurityKit,
            (value) => setState(() => _hasSecurityKit = value),
          ),
          _buildChecklistItem(
            'Roue de secours',
            Icons.trip_origin,
            _hasSpareWheel,
            (value) => setState(() => _hasSpareWheel = value),
          ),
          _buildChecklistItem(
            'Kit de gonflage',
            Icons.air,
            _hasInflationKit,
            (value) => setState(() => _hasInflationKit = value),
          ),
          _buildChecklistItem(
            'Carte carburant',
            Icons.credit_card,
            _hasFuelCard,
            (value) => setState(() => _hasFuelCard = value),
          ),
          _buildChecklistItem(
            'Véhicule chargé',
            Icons.inventory_2,
            _isVehicleLoaded,
            (value) => setState(() {
              _isVehicleLoaded = value;
              if (!value) _loadedVehiclePhoto = null;
            }),
          ),
          if (_isVehicleLoaded) ..._buildLoadedVehiclePhotoSection(),
          _buildChecklistItem(
            'Objet confié',
            Icons.category,
            _hasConfidedObject,
            (value) => setState(() => _hasConfidedObject = value),
          ),
          if (_hasConfidedObject) ...[
            const SizedBox(height: 12),
            TextField(
              controller: _confidedObjectController,
              style: TextStyle(color: PremiumTheme.textPrimary),
              maxLines: 2,
              decoration: InputDecoration(
                hintText: 'Précisez l\'objet confié...',
                hintStyle: TextStyle(color: PremiumTheme.textTertiary),
                filled: true,
                fillColor: PremiumTheme.cardBg,
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
                      const BorderSide(color: Color(0xFF14B8A6), width: 2),
                ),
              ),
            ),
          ],
          const SizedBox(height: 32),

          // Observations
          const Text(
            'Observations',
            style: TextStyle(
              color: Color(0xFF14B8A6),
              fontSize: 16,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _observationsController,
            maxLines: 4,
            style: TextStyle(color: PremiumTheme.textPrimary),
            decoration: InputDecoration(
              hintText: 'Notes particulières, incidents, remarques...',
              hintStyle: TextStyle(color: PremiumTheme.textTertiary),
              filled: true,
              fillColor: PremiumTheme.cardBg,
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
                borderSide: const BorderSide(color: Color(0xFF14B8A6), width: 2),
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// Sélecteur de propreté (5 niveaux)
  Widget _buildCleanlinessSelector(String current, ValueChanged<String> onChanged) {
    const levels = ['très sale', 'sale', 'correct', 'propre', 'très propre'];
    const icons = [Icons.sentiment_very_dissatisfied, Icons.sentiment_dissatisfied, Icons.sentiment_neutral, Icons.sentiment_satisfied, Icons.sentiment_very_satisfied];
    const colors = [Color(0xFFEF4444), Color(0xFFF97316), Color(0xFFF59E0B), Color(0xFF10B981), Color(0xFF14B8A6)];
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: List.generate(levels.length, (i) {
        final selected = current == levels[i];
        return GestureDetector(
          onTap: () => onChanged(levels[i]),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: selected ? colors[i].withValues(alpha: 0.15) : PremiumTheme.cardBg,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: selected ? colors[i] : const Color(0xFFE5E7EB),
                width: selected ? 2 : 1,
              ),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(icons[i], color: selected ? colors[i] : PremiumTheme.textTertiary, size: 22),
                const SizedBox(height: 4),
                Text(
                  levels[i].substring(0, 1).toUpperCase() + levels[i].substring(1),
                  style: TextStyle(
                    color: selected ? colors[i] : PremiumTheme.textSecondary,
                    fontSize: 11,
                    fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        );
      }),
    );
  }

  Widget _buildChecklistItem(
    String label,
    IconData icon,
    bool value,
    Function(bool) onChanged,
  ) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: PremiumTheme.cardBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: CheckboxListTile(
        title: Text(
          label,
          style: TextStyle(color: PremiumTheme.textPrimary, fontSize: 14),
        ),
        secondary: Icon(icon, color: const Color(0xFF14B8A6)),
        value: value,
        onChanged: (val) => onChanged(val ?? false),
        activeColor: const Color(0xFF14B8A6),
        checkColor: Colors.white,
      ),
    );
  }

  List<Widget> _buildLoadedVehiclePhotoSection() {
    return [
      const SizedBox(height: 12),
      Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: const Color(0xFFFFF7ED),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFF59E0B), width: 1.5),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF59E0B).withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(Icons.camera_alt, color: Color(0xFFF59E0B), size: 20),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Photo du chargement',
                        style: TextStyle(
                          color: PremiumTheme.textPrimary,
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Obligatoire — Photographiez les objets chargés',
                        style: TextStyle(
                          color: PremiumTheme.textSecondary,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
                if (_loadedVehiclePhoto != null)
                  const Icon(Icons.check_circle, color: Color(0xFF14B8A6), size: 24),
              ],
            ),
            const SizedBox(height: 12),
            GestureDetector(
              onTap: _takeLoadedVehiclePhoto,
              child: Container(
                height: 180,
                decoration: BoxDecoration(
                  color: const Color(0xFF1F2937),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: _loadedVehiclePhoto != null
                        ? const Color(0xFF14B8A6)
                        : const Color(0xFFF59E0B),
                    width: 2,
                  ),
                ),
                child: _loadedVehiclePhoto != null
                    ? Stack(
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(10),
                            child: Image.file(
                              File(_loadedVehiclePhoto!),
                              width: double.infinity,
                              height: double.infinity,
                              fit: BoxFit.cover,
                            ),
                          ),
                          Positioned(
                            top: 8,
                            right: 8,
                            child: GestureDetector(
                              onTap: () => setState(() => _loadedVehiclePhoto = null),
                              child: Container(
                                padding: const EdgeInsets.all(6),
                                decoration: BoxDecoration(
                                  color: Colors.red.withValues(alpha: 0.9),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: const Icon(Icons.delete_outline, color: Colors.white, size: 18),
                              ),
                            ),
                          ),
                          Positioned(
                            bottom: 8,
                            left: 8,
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: const Color(0xFF14B8A6).withValues(alpha: 0.9),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: const Text(
                                '📦 Chargement',
                                style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
                              ),
                            ),
                          ),
                        ],
                      )
                    : Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.add_a_photo, size: 40, color: Color(0xFFF59E0B)),
                          const SizedBox(height: 8),
                          Text(
                            'Appuyez pour photographier le chargement',
                            style: TextStyle(
                              color: PremiumTheme.textSecondary,
                              fontSize: 13,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
              ),
            ),
          ],
        ),
      ),
    ];
  }

  Future<void> _takeLoadedVehiclePhoto() async {
    try {
      final XFile? image = await _picker.pickImage(
        source: ImageSource.camera,
        imageQuality: 85,
        maxWidth: 1920,
        maxHeight: 1080,
      );
      if (image != null) {
        final safePath = await _copyToSafeLocation(image.path);
        if (!mounted) return;
        setState(() {
          _loadedVehiclePhoto = safePath;
        });
      }
    } catch (e) {
      _showError('Erreur lors de la capture: $e');
    }
  }

  Widget _buildSignaturesStep() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Title card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  const Color(0xFF14B8A6).withValues(alpha: 0.08),
                  const Color(0xFF14B8A6).withValues(alpha: 0.02),
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFF14B8A6).withValues(alpha: 0.2)),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFF14B8A6).withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.draw, color: Color(0xFF14B8A6), size: 24),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Signatures',
                        style: TextStyle(
                          color: PremiumTheme.textPrimary,
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Signatures du client et du convoyeur',
                        style: TextStyle(color: PremiumTheme.textSecondary, fontSize: 13),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Client name
          const Text(
            'Nom du client',
            style: TextStyle(
              color: Color(0xFF14B8A6),
              fontSize: 16,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _clientNameController,
            style: TextStyle(color: PremiumTheme.textPrimary, fontSize: 16),
            decoration: InputDecoration(
              hintText: 'Nom complet du client',
              hintStyle: TextStyle(color: PremiumTheme.textTertiary),
              filled: true,
              fillColor: PremiumTheme.cardBg,
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
                borderSide: const BorderSide(color: Color(0xFF14B8A6), width: 2),
              ),
            ),
          ),
          const SizedBox(height: 32),

          // Client signature
          _buildSignatureCard(
            'Signature du client',
            _clientSignature,
            _clientNameController.text.isNotEmpty ? _clientNameController.text : 'Nom requis ci-dessus',
            () async {
              final signature = await showDialog<Uint8List>(
                context: context,
                builder: (context) => SignaturePadDialog(
                  title: 'Signature du client',
                  subtitle: _clientNameController.text,
                ),
              );
              if (signature != null) {
                setState(() => _clientSignature = signature);
              }
            },
            () => setState(() => _clientSignature = null),
          ),
          const SizedBox(height: 24),

          // Driver signature
          _buildSignatureCard(
            'Signature du convoyeur',
            _driverSignature,
            _driverName.isNotEmpty ? _driverName : 'Chargement...',
            () async {
              final signature = await showDialog<Uint8List>(
                context: context,
                builder: (context) => SignaturePadDialog(
                  title: 'Signature du convoyeur',
                  subtitle: _driverName,
                ),
              );
              if (signature != null) {
                setState(() => _driverSignature = signature);
              }
            },
            () => setState(() => _driverSignature = null),
          ),
        ],
      ),
    );
  }

  Widget _buildSignatureCard(
    String title,
    Uint8List? signature,
    String subtitle,
    VoidCallback onSign,
    VoidCallback onClear,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(
            color: Color(0xFF14B8A6),
            fontSize: 16,
            fontWeight: FontWeight.w600,
          ),
        ),
        if (subtitle.isNotEmpty) ...[
          const SizedBox(height: 4),
          Text(
            subtitle,
            style: TextStyle(
              color: PremiumTheme.textSecondary,
              fontSize: 14,
            ),
          ),
        ],
        const SizedBox(height: 12),
        GestureDetector(
          onTap: onSign,
          child: Container(
            height: 180,
            decoration: BoxDecoration(
              color: PremiumTheme.cardBg,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: signature != null
                    ? const Color(0xFF14B8A6)
                    : const Color(0xFFE5E7EB),
                width: 2,
              ),
            ),
            child: signature != null
                ? Stack(
                    children: [
                      Center(
                        child: Image.memory(
                          signature,
                          fit: BoxFit.contain,
                        ),
                      ),
                      Positioned(
                        top: 8,
                        right: 8,
                        child: IconButton(
                          onPressed: onClear,
                          icon: const Icon(
                            Icons.delete_outline,
                            color: Color(0xFFEF4444),
                          ),
                          style: IconButton.styleFrom(
                            backgroundColor: const Color(0xFF111827),
                          ),
                        ),
                      ),
                    ],
                  )
                : Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.draw,
                        size: 48,
                        color: PremiumTheme.textTertiary,
                      ),
                      const SizedBox(height: 12),
                      Text(
                        'Appuyez pour signer',
                        style: TextStyle(
                          color: PremiumTheme.textSecondary,
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

  Widget _buildRecapStep() {
    final photoCount = _photos.where((p) => p != null).length;
    final optionalPhotoCount = _optionalPhotos.where((p) => p != null).length;
    final damageCount = _photoDamages.where((d) => d != 'RAS').length +
        _optionalPhotoDamages.where((d) => d != 'RAS').length;
    final docCount = _namedDocuments.length;

    String cleanlinessLabel(String val) {
      switch (val) {
        case 'tres_propre': return 'Très propre';
        case 'propre': return 'Propre';
        case 'correct': return 'Correct';
        case 'sale': return 'Sale';
        case 'tres_sale': return 'Très sale';
        default: return val;
      }
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Title
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF14B8A6), Color(0xFF0D9488)],
              ),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Row(
              children: [
                const Icon(Icons.checklist_rounded, color: Colors.white, size: 32),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: const [
                      Text('Récapitulatif', style: TextStyle(
                        color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
                      SizedBox(height: 4),
                      Text('Vérifiez les informations avant envoi',
                        style: TextStyle(color: Colors.white70, fontSize: 14)),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Compteur & Carburant
          _buildRecapSection('🚗 Compteur & Carburant', [
            _buildRecapRow('Kilométrage', '${_kmController.text} km'),
            _buildRecapRow('Carburant', '${_fuelLevel.toInt()}%'),
            _buildRecapRow('Propreté intérieure', cleanlinessLabel(_internalCleanliness)),
            _buildRecapRow('Propreté extérieure', cleanlinessLabel(_externalCleanliness)),
            _buildRecapRow('Photo tableau de bord', _dashboardPhoto != null ? '✅' : '❌'),
          ]),
          const SizedBox(height: 16),

          // Photos
          _buildRecapSection('📸 Photos', [
            _buildRecapRow('Photos obligatoires', '$photoCount/8'),
            _buildRecapRow('Photos optionnelles', '$optionalPhotoCount'),
            _buildRecapRow('Dommages signalés', '$damageCount'),
          ]),
          const SizedBox(height: 16),

          // Checklist
          _buildRecapSection('📋 État du véhicule', [
            _buildRecapRow('Clés remises', '$_numberOfKeys clé(s)'),
            _buildRecapRow('Kit de sécurité', _hasSecurityKit ? '✅ Oui' : '❌ Non'),
            _buildRecapRow('Roue de secours', _hasSpareWheel ? '✅ Oui' : '❌ Non'),
            _buildRecapRow('Véhicule chargé', _isVehicleLoaded ? '✅ Oui' : '❌ Non'),
            _buildRecapRow('Objet confié', _hasConfidedObject ? '✅ Oui' : '❌ Non'),
            if (_photoDamageEntries.values.any((list) => list.isNotEmpty))
              _buildRecapRow('Dommages signalés', '${_photoDamageEntries.values.expand((l) => l).length}'),
            if (_observationsController.text.isNotEmpty)
              _buildRecapRow('Observations', _observationsController.text),
          ]),
          const SizedBox(height: 16),

          // Signatures
          _buildRecapSection('✍️ Signatures', [
            _buildRecapRow('Signature convoyeur', _driverSignature != null ? '✅' : '❌'),
            _buildRecapRow('Signature client', _clientSignature != null ? '✅' : '❌'),
            _buildRecapRow('Nom client', _clientNameController.text.isNotEmpty ? _clientNameController.text : '—'),
          ]),
          const SizedBox(height: 16),

          // Documents
          _buildRecapSection('📄 Documents', [
            _buildRecapRow('Documents scannés', '$docCount'),
          ]),
          const SizedBox(height: 32),

          // Warning
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFFFEF3C7),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFF59E0B)),
            ),
            child: Row(
              children: const [
                Icon(Icons.info_outline, color: Color(0xFFF59E0B), size: 24),
                SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Veuillez vérifier toutes les informations. Une fois envoyée, l\'inspection ne pourra plus être modifiée.',
                    style: TextStyle(color: Color(0xFF92400E), fontSize: 13),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRecapSection(String title, List<Widget> children) {
    return Container(
      decoration: BoxDecoration(
        color: PremiumTheme.cardBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: Text(title, style: TextStyle(
              color: PremiumTheme.textPrimary,
              fontSize: 16,
              fontWeight: FontWeight.bold,
            )),
          ),
          const Divider(height: 1),
          ...children,
        ],
      ),
    );
  }

  Widget _buildRecapRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Flexible(
            child: Text(label, style: TextStyle(
              color: PremiumTheme.textSecondary,
              fontSize: 14,
            )),
          ),
          const SizedBox(width: 16),
          Flexible(
            child: Text(value, style: TextStyle(
              color: PremiumTheme.textPrimary,
              fontSize: 14,
              fontWeight: FontWeight.w600,
            ), textAlign: TextAlign.end),
          ),
        ],
      ),
    );
  }

  Widget _buildDocumentsStep() {
    return StatefulBuilder(
      builder: (context, setModalState) => SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Title card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    const Color(0xFF14B8A6).withValues(alpha: 0.08),
                    const Color(0xFF14B8A6).withValues(alpha: 0.02),
                  ],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFF14B8A6).withValues(alpha: 0.2)),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: const Color(0xFF14B8A6).withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.description, color: Color(0xFF14B8A6), size: 24),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Documents',
                          style: TextStyle(
                            color: PremiumTheme.textPrimary,
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Scannez les documents du véhicule (optionnel)',
                          style: TextStyle(color: PremiumTheme.textSecondary, fontSize: 13),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 28),

            // Scan button
            ElevatedButton.icon(
              onPressed: () => _scanNamedDocument(setModalState),
              icon: const Icon(Icons.document_scanner),
              label: const Text('Scanner un document'),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF14B8A6),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Document list
            if (_namedDocuments.isNotEmpty) ...[
              Text(
                'Documents scannés (${_namedDocuments.length})',
                style: const TextStyle(
                  color: Color(0xFF14B8A6),
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 12),
              ..._namedDocuments.asMap().entries.map((entry) {
                final doc = entry.value;
                return Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: PremiumTheme.cardBg,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFE5E7EB)),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 48,
                        height: 48,
                        decoration: BoxDecoration(
                          color: const Color(0xFF14B8A6).withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(Icons.description, color: Color(0xFF14B8A6), size: 24),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              doc['title'] ?? 'Document',
                              style: TextStyle(
                                color: PremiumTheme.textPrimary,
                                fontSize: 15,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              'Document ${entry.key + 1}',
                              style: const TextStyle(
                                color: PremiumTheme.textTertiary,
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        onPressed: () {
                          setModalState(() {
                            _namedDocuments.removeAt(entry.key);
                          });
                        },
                        icon: const Icon(Icons.delete_outline, color: Color(0xFFEF4444)),
                      ),
                    ],
                  ),
                );
              }),
            ],
          ],
        ),
      ),
    );
  }

  Future<void> _scanNamedDocument(StateSetter setModalState) async {
    // 1. Demander le nom du document
    final nameController = TextEditingController();
    final docName = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Nom du document'),
        content: TextField(
          controller: nameController,
          autofocus: true,
          decoration: InputDecoration(
            hintText: 'Ex: Carte grise, Assurance, Bon de livraison...',
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Annuler'),
          ),
          ElevatedButton(
            onPressed: () {
              final name = nameController.text.trim();
              if (name.isNotEmpty) Navigator.pop(ctx, name);
            },
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF14B8A6)),
            child: const Text('Scanner', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
    nameController.dispose();
    if (docName == null || docName.isEmpty) return;

    // 2. Ouvrir le scanner
    final result = await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => DocumentScannerScreen(
          inspectionId: 'departure_${widget.missionId}',
        ),
      ),
    );

    if (result != null && result is String) {
      setModalState(() {
        _namedDocuments.add({'url': result, 'title': docName});
      });
    }
  }

  Widget _buildNavigationButtons() {
    final canProceed = _canProceed();

    return SafeArea(
      child: Container(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
        decoration: BoxDecoration(
          color: PremiumTheme.cardBg,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.06),
              blurRadius: 10,
              offset: const Offset(0, -4),
            ),
          ],
        ),
        child: Row(
          children: [
            if (_currentStep > 0)
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () {
                    setState(() => _currentStep--);
                  },
                  icon: const Icon(Icons.arrow_back_ios, size: 16),
                  label: const Text('Précédent'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: PremiumTheme.textPrimary,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    side: const BorderSide(color: Color(0xFFD1D5DB)),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                ),
              ),
            if (_currentStep > 0) const SizedBox(width: 12),
            Expanded(
              child: Container(
                decoration: canProceed ? BoxDecoration(
                  borderRadius: BorderRadius.circular(14),
                  gradient: _currentStep < 5
                      ? const LinearGradient(
                          colors: [Color(0xFF14B8A6), Color(0xFF0D9488)],
                        )
                      : const LinearGradient(
                          colors: [Color(0xFF10B981), Color(0xFF059669)],
                        ),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF14B8A6).withValues(alpha: 0.3),
                      blurRadius: 8,
                      offset: const Offset(0, 3),
                    ),
                  ],
                ) : null,
                child: ElevatedButton.icon(
                  onPressed: canProceed
                      ? () {
                          if (_currentStep < 5) {
                            setState(() => _currentStep++);
                            _saveDraft();
                          } else {
                            _submit();
                          }
                        }
                      : null,
                  icon: _isSubmitting && _currentStep == 5
                      ? const SizedBox(
                          width: 18, height: 18,
                          child: CircularProgressIndicator(
                              color: Colors.white, strokeWidth: 2))
                      : Icon(
                          _currentStep < 5 ? Icons.arrow_forward_ios : Icons.check_circle,
                          size: _currentStep < 5 ? 16 : 20,
                        ),
                  label: Text(
                    _currentStep < 5 ? 'Suivant' : (_isSubmitting ? 'Envoi...' : 'Terminer l\'inspection'),
                    style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: canProceed ? Colors.transparent : null,
                    foregroundColor: Colors.white,
                    disabledBackgroundColor: const Color(0xFFD1D5DB),
                    disabledForegroundColor: const Color(0xFF9CA3AF),
                    elevation: 0,
                    shadowColor: Colors.transparent,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
