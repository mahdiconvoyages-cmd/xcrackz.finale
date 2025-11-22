import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'dart:io';
import 'dart:typed_data';
import 'dart:convert';
import '../../widgets/signature_pad_widget.dart';
import '../../widgets/inspection_report_link_dialog.dart';
import '../document_scanner/document_scanner_screen.dart';
import '../../theme/premium_theme.dart';
import '../../widgets/premium/premium_widgets.dart';

/// Écran d'inspection d'arrivée moderne avec 8 photos obligatoires
/// Compatible avec les tables Expo mobile (vehicle_inspections + inspection_photos)
class InspectionArrivalScreen extends StatefulWidget {
  final String missionId;

  const InspectionArrivalScreen({
    super.key,
    required this.missionId,
  });

  @override
  State<InspectionArrivalScreen> createState() =>
      _InspectionArrivalScreenState();
}

class _InspectionArrivalScreenState extends State<InspectionArrivalScreen>
    with SingleTickerProviderStateMixin {
  final ImagePicker _picker = ImagePicker();
  final supabase = Supabase.instance.client;

  int _currentStep = 0;
  bool _isLoading = false;
  String _vehicleType = 'VL'; // VL, VU, ou PL

  // Step 1: KM, Carburant, Tableau de bord
  String? _dashboardPhoto;
  final _kmController = TextEditingController();
  double _fuelLevel = 50;

  // Step 2: 8 Photos obligatoires avec guidage (initialisé selon le type de véhicule)
  late List<PhotoGuide> _photoGuides;

  final List<String?> _photos = List.filled(8, null);
  final List<String> _photoDamages = List.filled(8, 'RAS');

  // Photos optionnelles (10 max, apparaissent progressivement)
  final List<String?> _optionalPhotos = List.filled(10, null);
  final List<String> _optionalPhotoDamages = List.filled(10, 'RAS');

  // Step 3: Check-list d'arrivée (spécifique arrivée)
  bool _isVehicleClean = false;
  bool _allKeysReturned = false;
  bool _documentsReturned = false;
  String? _fuelDiscrepancy;
  final _observationsController = TextEditingController();

  // Step 4: Signatures
  Uint8List? _driverSignature;
  Uint8List? _clientSignature;
  final _clientNameController = TextEditingController();
  String _driverName = 'Convoyeur'; // Nom par défaut au lieu de vide

  // Step 5: Documents (optionnel)
  final List<String> _scannedDocuments = [];

  @override
  void initState() {
    super.initState();
    _initializePhotoGuides(); // Initialiser avec VL par défaut
    _loadMissionDetails();
    _loadDriverName();
  }

  Future<void> _loadDriverName() async {
    try {
      final userId = supabase.auth.currentUser?.id;
      if (userId != null) {
        final response = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', userId)
            .maybeSingle();
        
        if (response != null && mounted) {
          setState(() {
            _driverName = '${response['first_name'] ?? ''} ${response['last_name'] ?? ''}'.trim();
          });
        }
      }
    } catch (e) {
      debugPrint('Error loading driver name: $e');
    }
  }

  /// Initialiser les guides photos selon le type de véhicule
  /// Chaque type a ses propres images extérieures, intérieur identique pour tous
  void _initializePhotoGuides() {
    _photoGuides = [
      PhotoGuide(
        label: 'Avant',
        icon: Icons.directions_car,
        description: 'Vue de face du véhicule',
        image: _vehicleType == 'PL'
            ? 'assets/vehicles/scania-avant.png'
            : _vehicleType == 'VU'
            ? 'assets/vehicles/master avant.png'
            : 'assets/vehicles/avant.png',
      ),
      PhotoGuide(
        label: 'Avant gauche',
        icon: Icons.format_indent_increase,
        description: 'Angle avant latéral gauche',
        image: _vehicleType == 'PL'
            ? 'assets/vehicles/scania-lateral-gauche-avant.png'
            : _vehicleType == 'VU'
            ? 'assets/vehicles/master lateral gauche avant.png'
            : 'assets/vehicles/lateral gauche avant.png',
      ),
      PhotoGuide(
        label: 'Arrière gauche',
        icon: Icons.format_indent_decrease,
        description: 'Angle arrière latéral gauche',
        image: _vehicleType == 'PL'
            ? 'assets/vehicles/scania-lateral-gauche-arriere.png'
            : _vehicleType == 'VU'
            ? 'assets/vehicles/master lateral gauche arriere.png'
            : 'assets/vehicles/laterale gauche arriere.png',
      ),
      PhotoGuide(
        label: 'Arrière',
        icon: Icons.directions_car,
        description: 'Vue arrière du véhicule',
        image: _vehicleType == 'PL'
            ? 'assets/vehicles/scania-arriere.png'
            : _vehicleType == 'VU'
            ? 'assets/vehicles/master avg (2).png'
            : 'assets/vehicles/arriere.png',
      ),
      PhotoGuide(
        label: 'Arrière droit',
        icon: Icons.format_indent_decrease,
        description: 'Angle arrière latéral droit',
        image: _vehicleType == 'PL'
            ? 'assets/vehicles/scania-lateral-droit-arriere.png'
            : _vehicleType == 'VU'
            ? 'assets/vehicles/master lateral droit arriere.png'
            : 'assets/vehicles/lateral droit arriere.png',
      ),
      PhotoGuide(
        label: 'Avant droit',
        icon: Icons.format_indent_increase,
        description: 'Angle avant latéral droit',
        image: _vehicleType == 'PL'
            ? 'assets/vehicles/scania-lateral-droit-avant.png'
            : _vehicleType == 'VU'
            ? 'assets/vehicles/master lateral droit avant.png'
            : 'assets/vehicles/lateraldroit avant.png',
      ),
      PhotoGuide(
        label: 'Intérieur avant',
        icon: Icons.airline_seat_recline_normal,
        description: 'Sièges avant et habitacle',
        image: 'assets/vehicles/interieur_avant.png', // Identique pour tous
      ),
      PhotoGuide(
        label: 'Intérieur arrière',
        icon: Icons.weekend,
        description: 'Sièges arrière et espace passagers',
        image: 'assets/vehicles/interieur_arriere.png', // Identique pour tous
      ),
    ];
  }

  Future<void> _loadMissionDetails() async {
    // Charger le type de véhicule depuis la mission
    try {
      final response = await supabase
          .from('missions')
          .select('vehicle_type')
          .eq('id', widget.missionId)
          .maybeSingle();

      if (response != null && response['vehicle_type'] != null) {
        setState(() {
          _vehicleType = response['vehicle_type'].toString().toUpperCase();
          _initializePhotoGuides(); // Réinitialiser avec les bonnes images selon le type
        });
        debugPrint('✅ INSPECTION ARRIVAL: Vehicle type loaded = $_vehicleType');
      }
    } catch (e) {
      debugPrint('⚠️ INSPECTION ARRIVAL: Error loading vehicle type: $e');
    }
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
      default:
        return '';
    }
  }

  Widget _buildProgressIndicator() {
    final progress = (_currentStep + 1) / 5;
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            PremiumTheme.cardBg,
            PremiumTheme.cardBg.withOpacity(0.8),
          ],
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.2),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          // Circular progress ring
          SizedBox(
            width: 60,
            height: 60,
            child: Stack(
              alignment: Alignment.center,
              children: [
                ProgressRing(
                  progress: progress,
                  size: 60,
                  strokeWidth: 4,
                  color: PremiumTheme.primaryTeal,
                ),
                Text(
                  '${_currentStep + 1}/5',
                  style: PremiumTheme.body.copyWith(
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 16),
          // Step labels
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _getStepTitle(_currentStep),
                  style: PremiumTheme.body.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  _getStepDescription(_currentStep),
                  style: PremiumTheme.bodySmall.copyWith(
                    color: PremiumTheme.textSecondary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: PremiumTheme.darkBg,
      body: Column(
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
                          onPressed: () => Navigator.pop(context),
                        ),
                        Expanded(
                          child: Text(
                            'Inspection d\'arrivée',
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
            child: _isLoading
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        ShimmerLoading(
                          width: MediaQuery.of(context).size.width - 48,
                          height: 200,
                          borderRadius: PremiumTheme.radiusXL,
                        ),
                        const SizedBox(height: 16),
                        Text(
                          'Finalisation de l\'inspection...',
                          style: PremiumTheme.body,
                        ),
                      ],
                    ),
                  )
                : _buildStepContent(),
          ),

          // Navigation buttons avec SafeArea
          SafeArea(
            child: Container(
              padding: const EdgeInsets.fromLTRB(24, 16, 24, 24),
              decoration: const BoxDecoration(
                color: Color(0xFF1e293b),
                border: Border(
                  top: BorderSide(color: Color(0xFF334155), width: 1),
                ),
              ),
              child: Row(
                children: [
                  // Previous button
                  if (_currentStep > 0)
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => setState(() => _currentStep--),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: const Color(0xFF14B8A6),
                          side: const BorderSide(color: Color(0xFF14B8A6)),
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                        child: const Text('Précédent'),
                      ),
                    ),
                  if (_currentStep > 0) const SizedBox(width: 16),

                  // Next/Submit button
                  Expanded(
                    child: ElevatedButton(
                      onPressed: _canContinue()
                          ? (_currentStep < 4
                              ? () => setState(() => _currentStep++)
                              : _submitInspection)
                          : null,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF14B8A6),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                      child: Text(
                        _currentStep < 4 ? 'Suivant' : 'Terminer l\'inspection',
                        style: const TextStyle(fontWeight: FontWeight.w600),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
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

  Future<void> _takePhoto(int index, bool isOptional) async {
    try {
      final XFile? image = await _picker.pickImage(
        source: ImageSource.camera,
        imageQuality: 85,
        maxWidth: 1920,
        maxHeight: 1080,
      );

      if (image != null) {
        setState(() {
          if (isOptional) {
            _optionalPhotos[index] = image.path;
          } else {
            _photos[index] = image.path;
          }
        });
      }
    } catch (e) {
      _showError('Erreur lors de la capture: $e');
    }
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
        setState(() {
          _dashboardPhoto = image.path;
        });
      }
    } catch (e) {
      _showError('Erreur lors de la capture: $e');
    }
  }

  bool _canContinue() {
    switch (_currentStep) {
      case 0:
        return _dashboardPhoto != null && _kmController.text.isNotEmpty;
      case 1:
        return _photos.every((photo) => photo != null);
      case 2:
        return _allKeysReturned && _documentsReturned;
      case 3:
        return _driverSignature != null &&
            _clientSignature != null &&
            _clientNameController.text.isNotEmpty;
      case 4:
        return true; // Documents optionnels
      default:
        return false;
    }
  }

  Future<void> _submitInspection() async {
    if (!_canContinue()) {
      _showError('Veuillez compléter toutes les étapes obligatoires');
      return;
    }

    setState(() => _isLoading = true);

    try {
      final userId = supabase.auth.currentUser?.id;
      if (userId == null) throw Exception('Utilisateur non connecté');

      // 1. Créer l'inspection d'arrivée
      final inspectionResponse = await supabase.from('vehicle_inspections').insert({
        'mission_id': widget.missionId,
        'inspector_id': userId,
        'inspection_type': 'arrival',
        'status': 'completed',
        'mileage_km': int.tryParse(_kmController.text) ?? 0,
        'fuel_level': _fuelLevel.round(),
        'vehicle_info': {
          'vehicle_clean': _isVehicleClean,
          'keys_returned': _allKeysReturned,
          'documents_returned': _documentsReturned,
          'fuel_discrepancy': _fuelDiscrepancy,
        },
        'notes': _observationsController.text,
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
        'created_at': DateTime.now().toIso8601String(),
      }).select().single();

      final inspectionId = inspectionResponse['id'];

      // 2. Upload et sauvegarder toutes les photos
      final allPhotos = [
        if (_dashboardPhoto != null)
          {'path': _dashboardPhoto!, 'type': 'dashboard_arrival', 'index': -1},
        ..._photos.asMap().entries.where((e) => e.value != null).map((e) => {
              'path': e.value!,
              'type': '${_photoGuides[e.key].label}_arrival',
              'index': e.key,
            }),
        ..._optionalPhotos.asMap().entries.where((e) => e.value != null).map((e) => {
              'path': e.value!,
              'type': 'Photo optionnelle ${e.key + 1}_arrival',
              'index': e.key + 8,
            }),
      ];

      for (final photo in allPhotos) {
        final file = File(photo['path'] as String);
        final bytes = await file.readAsBytes();
        final photoType = (photo['type'] as String).replaceAll(' ', '_').replaceAll('é', 'e').replaceAll('è', 'e');
        final fileName =
            'inspection_arrival_${inspectionId}_${photoType}_${DateTime.now().millisecondsSinceEpoch}.jpg';
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
          'taken_at': DateTime.now().toIso8601String(),
        });
      }

      // 4. Sauvegarder les documents scannés
      for (final docPath in _scannedDocuments) {
        final file = File(docPath);
        final bytes = await file.readAsBytes();
        final fileName =
            'arrival_doc_${inspectionId}_${DateTime.now().millisecondsSinceEpoch}.jpg';
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
          'document_type': 'arrival_document',
          'created_at': DateTime.now().toIso8601String(),
        });
      }

      // 5. Mettre à jour le statut de la mission
      await supabase.from('missions').update({
        'status': 'completed',
        'updated_at': DateTime.now().toIso8601String(),
      }).eq('id', widget.missionId);

      setState(() => _isLoading = false);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('✅ Inspection d\'arrivée terminée avec succès'),
            backgroundColor: Color(0xFF14B8A6),
            behavior: SnackBarBehavior.floating,
          ),
        );

        Navigator.of(context).popUntil((route) => route.isFirst);
      }
    } catch (e) {
      setState(() => _isLoading = false);
      _showError('Erreur lors de la soumission: $e');
    }
  }

  void _showError(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: const Color(0xFFEF4444),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  Widget _buildStepContent() {
    switch (_currentStep) {
      case 0:
        return _buildKmFuelStep();
      case 1:
        return _buildPhotosStep();
      case 2:
        return _buildArrivalChecklistStep();
      case 3:
        return _buildSignaturesStep();
      case 4:
        return _buildDocumentsStep();
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
          // Title
          const Text(
            '📊 État final du véhicule',
            style: TextStyle(
              color: Colors.white,
              fontSize: 24,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Photographiez le tableau de bord et renseignez le kilométrage final',
            style: TextStyle(
              color: Colors.white70,
              fontSize: 14,
            ),
          ),
          const SizedBox(height: 32),

          // Dashboard photo
          GestureDetector(
            onTap: _takeDashboardPhoto,
            child: Container(
              height: 200,
              decoration: BoxDecoration(
                color: const Color(0xFF1e293b),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: _dashboardPhoto != null
                      ? const Color(0xFF14B8A6)
                      : const Color(0xFF475569),
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
                  : const Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.camera_alt,
                          size: 48,
                          color: Color(0xFF64748B),
                        ),
                        SizedBox(height: 16),
                        Text(
                          'Photographier le tableau de bord',
                          style: TextStyle(
                            color: Color(0xFF64748B),
                            fontSize: 16,
                          ),
                        ),
                      ],
                    ),
            ),
          ),
          const SizedBox(height: 32),

          // KM input
          const Text(
            'Kilométrage à l\'arrivée',
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
            style: const TextStyle(color: Colors.white, fontSize: 16),
            decoration: InputDecoration(
              hintText: 'Ex: 125000',
              hintStyle: const TextStyle(color: Colors.white38),
              suffixText: 'km',
              suffixStyle: const TextStyle(color: Color(0xFF14B8A6)),
              filled: true,
              fillColor: const Color(0xFF1e293b),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: Color(0xFF475569)),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: Color(0xFF475569)),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: Color(0xFF14B8A6), width: 2),
              ),
            ),
          ),
          const SizedBox(height: 32),

          // Fuel level
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
              color: const Color(0xFF1e293b),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFF475569)),
            ),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'E',
                      style: TextStyle(color: Color(0xFFEF4444), fontSize: 18),
                    ),
                    Text(
                      '${_fuelLevel.round()}%',
                      style: const TextStyle(
                        color: Color(0xFF14B8A6),
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const Text(
                      'F',
                      style: TextStyle(color: Color(0xFF10B981), fontSize: 18),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                SliderTheme(
                  data: SliderTheme.of(context).copyWith(
                    trackHeight: 8,
                    thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 12),
                  ),
                  child: Slider(
                    value: _fuelLevel,
                    min: 0,
                    max: 100,
                    divisions: 20,
                    activeColor: const Color(0xFF14B8A6),
                    inactiveColor: const Color(0xFF475569),
                    onChanged: (value) => setState(() => _fuelLevel = value),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPhotosStep() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            '📸 Photos obligatoires (8/8)',
            style: TextStyle(
              color: Colors.white,
              fontSize: 24,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Prenez une photo de chaque angle pour documenter l\'état d\'arrivée',
            style: TextStyle(
              color: Colors.white70,
              fontSize: 14,
            ),
          ),
          const SizedBox(height: 24),

          // Photos grid
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              childAspectRatio: 0.8,
              crossAxisSpacing: 16,
              mainAxisSpacing: 16,
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
        ],
      ),
    );
  }

  Widget _buildPhotoCard(int index, bool isOptional) {
    final String label;
    final IconData icon;
    final String? photoPath;
    final String damage;
    final String? guideImage;
    
    if (isOptional) {
      label = 'Photo optionnelle ${index + 1}';
      icon = Icons.add_a_photo;
      photoPath = _optionalPhotos[index];
      damage = _optionalPhotoDamages[index];
      guideImage = null;
    } else {
      final guide = _photoGuides[index];
      label = guide.label;
      icon = guide.icon;
      photoPath = _photos[index];
      damage = _photoDamages[index];
      guideImage = guide.image;
    }
    
    final hasPhoto = photoPath != null;

    return GestureDetector(
      onTap: () => _takePhoto(index, isOptional),
      child: Container(
        decoration: BoxDecoration(
          color: const Color(0xFF1e293b),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: hasPhoto ? const Color(0xFF14B8A6) : const Color(0xFF475569),
            width: 2,
          ),
        ),
        child: Column(
          children: [
            // Photo area
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
                    : guideImage != null
                        ? Stack(
                            children: [
                              Opacity(
                                opacity: 0.3,
                                child: guideImage.endsWith('.svg')
                                    ? SvgPicture.asset(
                                        guideImage,
                                        fit: BoxFit.cover,
                                      )
                                    : Image.asset(
                                        guideImage,
                                        fit: BoxFit.cover,
                                      ),
                              ),
                              Center(
                                child: Icon(
                                  Icons.camera_alt,
                                  size: 32,
                                  color: Colors.white.withOpacity(0.7),
                                ),
                              ),
                            ],
                          )
                        : Center(
                            child: Icon(
                              icon,
                              size: 48,
                              color: const Color(0xFF374151),
                            ),
                          ),
              ),
            ),

            // Label and damage selector
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                children: [
                  Text(
                    label,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 8),
                  if (hasPhoto)
                    DropdownButton<String>(
                      value: isOptional ? _optionalPhotoDamages[index] : _photoDamages[index],
                      dropdownColor: const Color(0xFF1e293b),
                      style: const TextStyle(color: Colors.white, fontSize: 12),
                      underline: const SizedBox(),
                      isExpanded: true,
                      items: ['RAS', 'Rayures', 'Cassé', 'Abimé']
                          .map((damage) => DropdownMenuItem(
                                value: damage,
                                child: Text(damage),
                              ))
                          .toList(),
                      onChanged: (value) {
                        if (value != null) {
                          setState(() {
                            if (isOptional) {
                              _optionalPhotoDamages[index] = value;
                            } else {
                              _photoDamages[index] = value;
                            }
                          });
                        }
                      },
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildArrivalChecklistStep() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            '✅ Vérifications d\'arrivée',
            style: TextStyle(
              color: Colors.white,
              fontSize: 24,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Vérifiez que tout est en ordre avant de finaliser',
            style: TextStyle(
              color: Colors.white70,
              fontSize: 14,
            ),
          ),
          const SizedBox(height: 32),

          // Vehicle clean check
          _buildCheckItem(
            'Véhicule nettoyé',
            'Le véhicule a été nettoyé avant restitution',
            _isVehicleClean,
            (value) => setState(() => _isVehicleClean = value),
          ),
          const SizedBox(height: 16),

          // Keys returned
          _buildCheckItem(
            'Clés restituées',
            'Toutes les clés ont été remises',
            _allKeysReturned,
            (value) => setState(() => _allKeysReturned = value),
          ),
          const SizedBox(height: 16),

          // Documents returned
          _buildCheckItem(
            'Documents restituées',
            'Carte grise, papiers du véhicule remis',
            _documentsReturned,
            (value) => setState(() => _documentsReturned = value),
          ),
          const SizedBox(height: 32),

          // Fuel discrepancy
          const Text(
            'Différence de carburant',
            style: TextStyle(
              color: Color(0xFF14B8A6),
              fontSize: 16,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            value: _fuelDiscrepancy,
            decoration: InputDecoration(
              filled: true,
              fillColor: const Color(0xFF1e293b),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: Color(0xFF475569)),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: Color(0xFF475569)),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: Color(0xFF14B8A6), width: 2),
              ),
            ),
            dropdownColor: const Color(0xFF1e293b),
            style: const TextStyle(color: Colors.white),
            items: [
              'Aucune différence',
              'Moins de carburant',
              'Plus de carburant',
              'Réservoir vide',
            ].map((item) => DropdownMenuItem(
              value: item,
              child: Text(item),
            )).toList(),
            onChanged: (value) => setState(() => _fuelDiscrepancy = value),
          ),
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
            style: const TextStyle(color: Colors.white),
            decoration: InputDecoration(
              hintText: 'Notes particulières, incidents, remarques...',
              hintStyle: const TextStyle(color: Colors.white38),
              filled: true,
              fillColor: const Color(0xFF1e293b),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: Color(0xFF475569)),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: Color(0xFF475569)),
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

  Widget _buildCheckItem(
    String title,
    String description,
    bool value,
    ValueChanged<bool> onChanged,
  ) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF1e293b),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: value ? const Color(0xFF14B8A6) : const Color(0xFF475569),
        ),
      ),
      child: Row(
        children: [
          Checkbox(
            value: value,
            activeColor: const Color(0xFF14B8A6),
            onChanged: (val) => onChanged(val ?? false),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  description,
                  style: const TextStyle(
                    color: Colors.white70,
                    fontSize: 14,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSignaturesStep() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            '✍️ Signatures de restitution',
            style: TextStyle(
              color: Colors.white,
              fontSize: 24,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Signatures du client et du convoyeur pour finaliser',
            style: TextStyle(
              color: Colors.white70,
              fontSize: 14,
            ),
          ),
          const SizedBox(height: 32),

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
            style: const TextStyle(color: Colors.white, fontSize: 16),
            decoration: InputDecoration(
              hintText: 'Nom complet du client',
              hintStyle: const TextStyle(color: Colors.white38),
              filled: true,
              fillColor: const Color(0xFF1e293b),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: Color(0xFF475569)),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: Color(0xFF475569)),
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
            style: const TextStyle(
              color: Colors.white70,
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
              color: const Color(0xFF1e293b),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: signature != null
                    ? const Color(0xFF14B8A6)
                    : const Color(0xFF475569),
                width: 2,
              ),
            ),
            child: signature != null
                ? Stack(
                    children: [
                      Center(
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(10),
                          child: Image.memory(
                            signature,
                            fit: BoxFit.contain,
                            width: double.infinity,
                            height: double.infinity,
                          ),
                        ),
                      ),
                      Positioned(
                        top: 8,
                        right: 8,
                        child: GestureDetector(
                          onTap: onClear,
                          child: Container(
                            padding: const EdgeInsets.all(4),
                            decoration: const BoxDecoration(
                              color: Color(0xFFEF4444),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(
                              Icons.close,
                              color: Colors.white,
                              size: 16,
                            ),
                          ),
                        ),
                      ),
                    ],
                  )
                : const Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.draw,
                        size: 48,
                        color: Color(0xFF64748B),
                      ),
                      SizedBox(height: 16),
                      Text(
                        'Appuyer pour signer',
                        style: TextStyle(
                          color: Color(0xFF64748B),
                          fontSize: 16,
                        ),
                      ),
                    ],
                  ),
          ),
        ),
      ],
    );
  }

  Widget _buildDocumentsStep() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            '📄 Documents complémentaires',
            style: TextStyle(
              color: Colors.white,
              fontSize: 24,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Scanner des documents supplémentaires si nécessaire (optionnel)',
            style: TextStyle(
              color: Colors.white70,
              fontSize: 14,
            ),
          ),
          const SizedBox(height: 32),

          // Scan button
          ElevatedButton.icon(
            onPressed: () async {
              final result = await Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => DocumentScannerScreen(
                    inspectionId: 'arrival_${widget.missionId}',
                  ),
                ),
              );
              if (result != null && result is String) {
                setState(() {
                  _scannedDocuments.add(result);
                });
              }
            },
            icon: const Icon(Icons.document_scanner),
            label: const Text('Scanner un document'),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF14B8A6),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
          const SizedBox(height: 24),

          // Scanned documents
          if (_scannedDocuments.isNotEmpty) ...[
            const Text(
              'Documents scannés',
              style: TextStyle(
                color: Color(0xFF14B8A6),
                fontSize: 16,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 16),
            ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _scannedDocuments.length,
              itemBuilder: (context, index) {
                return Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1e293b),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFF475569)),
                  ),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.description,
                        color: Color(0xFF14B8A6),
                        size: 24,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          'Document ${index + 1}',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 16,
                          ),
                        ),
                      ),
                      IconButton(
                        onPressed: () {
                          setState(() {
                            _scannedDocuments.removeAt(index);
                          });
                        },
                        icon: const Icon(
                          Icons.delete,
                          color: Color(0xFFEF4444),
                          size: 20,
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
          ],
        ],
      ),
    );
  }

  @override
  void dispose() {
    _kmController.dispose();
    _observationsController.dispose();
    _clientNameController.dispose();
    super.dispose();
  }
}

class PhotoGuide {
  final String label;
  final IconData icon;
  final String description;
  final String? image;

  const PhotoGuide({
    required this.label,
    required this.icon,
    required this.description,
    this.image,
  });
}

class SignaturePadDialog extends StatelessWidget {
  final String title;
  final String subtitle;

  const SignaturePadDialog({
    super.key,
    required this.title,
    this.subtitle = '',
  });

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: const Color(0xFF1e293b),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              title,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.w600,
              ),
            ),
            if (subtitle.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(
                subtitle,
                style: const TextStyle(
                  color: Colors.white70,
                  fontSize: 14,
                ),
              ),
            ],
            const SizedBox(height: 24),
            SignaturePadWidget(
              title: title,
              onSaved: (signature) {
                Navigator.pop(context, signature);
              },
            ),
          ],
        ),
      ),
    );
  }
}

