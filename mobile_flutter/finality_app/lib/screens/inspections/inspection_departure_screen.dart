import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:path_provider/path_provider.dart';
import 'dart:io';
import 'dart:typed_data';
import 'dart:convert';
import '../../widgets/inspection_report_link_dialog.dart';
import '../document_scanner/document_scanner_screen.dart';
import '../../theme/premium_theme.dart';
import '../../widgets/premium/premium_widgets.dart';
import 'widgets/inspection_shared_widgets.dart';

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
  bool _isLoading = false;
  bool _isSubmitting = false;
  String _vehicleType = 'VL'; // VL, VU, ou PL

  // Step 1: KM, Carburant, Tableau de bord
  String? _dashboardPhoto;
  final _kmController = TextEditingController();
  double _fuelLevel = 50;

  // Step 2: 8 Photos obligatoires avec guidage (initialisé selon le type de véhicule)
  late List<PhotoGuide> _photoGuides;

  final List<String?> _photos = List.filled(8, null);
  final List<String> _photoDamages = List.filled(8, 'RAS');
  final List<String> _photoComments = List.filled(8, '');

  // Photos optionnelles (10 max, apparaissent progressivement)
  final List<String?> _optionalPhotos = List.filled(10, null);
  final List<String> _optionalPhotoDamages = List.filled(10, 'RAS');
  final List<String> _optionalPhotoComments = List.filled(10, '');

  // Step 3: État du véhicule & Checklist
  String _vehicleCondition = 'Bon';
  int _numberOfKeys = 2;
  bool _hasSecurityKit = false;
  bool _hasSpareWheel = false;
  bool _hasInflationKit = false;
  bool _hasFuelCard = false;
  bool _isVehicleLoaded = false;
  bool _hasConfidedObject = false;
  final _confidedObjectController = TextEditingController();

  // Step 4: Signatures
  Uint8List? _driverSignature;
  Uint8List? _clientSignature;
  final _clientNameController = TextEditingController();
  String _driverName = 'Convoyeur'; // Nom par défaut au lieu de vide

  // Step 5: Documents avec nom manuel (optionnel)
  final List<Map<String, String>> _namedDocuments = []; // {url, title}

  @override
  void initState() {
    super.initState();
    _initializePhotoGuides();
    _loadMissionDetails();
    _loadDriverName();
    // Listeners pour rafraîchir le bouton Suivant en temps réel
    _kmController.addListener(_onFieldChanged);
    _clientNameController.addListener(_onFieldChanged);
  }

  void _onFieldChanged() {
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    _kmController.removeListener(_onFieldChanged);
    _clientNameController.removeListener(_onFieldChanged);
    _kmController.dispose();
    _confidedObjectController.dispose();
    _clientNameController.dispose();
    super.dispose();
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
          if (isOptional) {
            _optionalPhotos[index] = safePath;
          } else {
            _photos[index] = safePath;
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
        // Vérifier que chaque dommage ≠ RAS a un commentaire
        for (int i = 0; i < 8; i++) {
          if (_photoDamages[i] != 'RAS' && _photoComments[i].trim().isEmpty) return false;
        }
        // Vérifier les photos optionnelles avec dommage
        for (int i = 0; i < 10; i++) {
          if (_optionalPhotos[i] != null && _optionalPhotoDamages[i] != 'RAS' && _optionalPhotoComments[i].trim().isEmpty) return false;
        }
        return true;
      case 2:
        return true; // Checklist optionnelle
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

  Future<void> _submit() async {
    if (!_canProceed()) {
      _showError('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      final userId = supabase.auth.currentUser?.id;
      if (userId == null) throw 'Utilisateur non connecté';

      // 1. Créer l'inspection dans vehicle_inspections
      debugPrint('📝 STEP 1: Creating vehicle_inspection...');
      final mileageKm = int.tryParse(_kmController.text) ?? 0;
      final inspectionData = {
        'mission_id': widget.missionId,
        'inspector_id': userId,
        'inspection_type': widget.isRestitution ? 'restitution_departure' : 'departure',
        'status': 'completed',
        'mileage_km': mileageKm,
        'fuel_level': _fuelLevel.toInt(),
        'overall_condition': _vehicleCondition.toLowerCase(),
        'vehicle_info': {
          'keys_count': _numberOfKeys,
          'has_security_kit': _hasSecurityKit,
          'has_spare_wheel': _hasSpareWheel,
          'has_inflation_kit': _hasInflationKit,
          'has_fuel_card': _hasFuelCard,
          'is_loaded': _isVehicleLoaded,
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
          {'path': _dashboardPhoto!, 'type': 'dashboard', 'index': -1, 'damage': 'RAS', 'comment': ''},
        ..._photos.asMap().entries.where((e) => e.value != null).map((e) => {
              'path': e.value!,
              'type': _photoGuides[e.key].label,
              'index': e.key,
              'damage': _photoDamages[e.key],
              'comment': _photoComments[e.key],
            }),
        ..._optionalPhotos.asMap().entries.where((e) => e.value != null).map((e) => {
              'path': e.value!,
              'type': 'Photo optionnelle ${e.key + 1}',
              'index': e.key + 8,
              'damage': _optionalPhotoDamages[e.key],
              'comment': _optionalPhotoComments[e.key],
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
            'taken_at': DateTime.now().toUtc().toIso8601String(),
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

        if (mounted) Navigator.pop(context, true);
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
    final progress = (_currentStep + 1) / 5;
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            PremiumTheme.cardBg,
            PremiumTheme.cardBg.withValues(alpha: 0.8),
          ],
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.2),
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
          Text(
            '📊 État initial du véhicule',
            style: TextStyle(
              color: PremiumTheme.textPrimary,
              fontSize: 24,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Photographiez le tableau de bord et renseignez le kilométrage',
            style: TextStyle(
              color: PremiumTheme.textSecondary,
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
        ],
      ),
    );
  }

  Widget _buildPhotosStep() {
    final missingCount = _photos.where((p) => p == null).length;

    return Column(
      children: [
        // Header
        Container(
          padding: const EdgeInsets.all(24),
          color: PremiumTheme.cardBg,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '📸 Photos du véhicule',
                style: TextStyle(
                  color: PremiumTheme.textPrimary,
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                missingCount > 0
                    ? '⚠️ Il manque $missingCount photo${missingCount > 1 ? 's' : ''} obligatoire${missingCount > 1 ? 's' : ''}'
                    : '✅ Toutes les photos sont prises',
                style: TextStyle(
                  color: missingCount > 0
                      ? const Color(0xFFF59E0B)
                      : const Color(0xFF14B8A6),
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
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
              color: Colors.black.withOpacity(0.05),
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
                                  color: PremiumTheme.primaryTeal.withOpacity(0.7),
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
                      },
                    ),
                    // Commentaire obligatoire si dommage ≠ RAS
                    if (damage != 'RAS') ...[
                      const SizedBox(height: 6),
                      TextField(
                        style: TextStyle(color: PremiumTheme.textPrimary, fontSize: 11),
                        maxLines: 2,
                        decoration: InputDecoration(
                          hintText: 'Décrivez le dommage...',
                          hintStyle: TextStyle(color: PremiumTheme.textTertiary, fontSize: 11),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                          filled: true,
                          fillColor: const Color(0xFFFEF3C7),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(6),
                            borderSide: const BorderSide(color: Color(0xFFF59E0B)),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(6),
                            borderSide: const BorderSide(color: Color(0xFFF59E0B)),
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(6),
                            borderSide: const BorderSide(color: Color(0xFFEF4444), width: 2),
                          ),
                        ),
                        onChanged: (value) {
                          if (isOptional) {
                            _optionalPhotoComments[index] = value;
                          } else {
                            _photoComments[index] = value;
                          }
                          setState(() {}); // Refresh _canProceed
                        },
                        controller: null, // Stateless — uses onChanged
                      ),
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

  Widget _buildChecklistStep() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Title
          Text(
            '✅ État et équipements',
            style: TextStyle(
              color: PremiumTheme.textPrimary,
              fontSize: 24,
              fontWeight: FontWeight.bold,
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
            (value) => setState(() => _isVehicleLoaded = value),
          ),
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
        ],
      ),
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

  Widget _buildSignaturesStep() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '✍️ Signatures',
            style: TextStyle(
              color: PremiumTheme.textPrimary,
              fontSize: 24,
              fontWeight: FontWeight.bold,
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

  Widget _buildDocumentsStep() {
    return StatefulBuilder(
      builder: (context, setModalState) => SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '📄 Documents',
              style: TextStyle(
                color: PremiumTheme.textPrimary,
                fontSize: 24,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Scannez les documents du véhicule et nommez-les librement',
              style: TextStyle(
                color: PremiumTheme.textSecondary,
                fontSize: 14,
              ),
            ),
            const SizedBox(height: 32),

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
        padding: const EdgeInsets.fromLTRB(24, 16, 24, 24),
        decoration: const BoxDecoration(
          color: PremiumTheme.cardBg,
          border: Border(
            top: BorderSide(color: Color(0xFFE5E7EB), width: 1),
          ),
        ),
        child: Row(
          children: [
            if (_currentStep > 0)
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: () {
                    setState(() => _currentStep--);
                  },
                  icon: const Icon(Icons.arrow_back),
                  label: const Text('Précédent'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: PremiumTheme.cardBgLight,
                    foregroundColor: PremiumTheme.textPrimary,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                      side: const BorderSide(color: Color(0xFFE5E7EB)),
                    ),
                  ),
                ),
              ),
            if (_currentStep > 0) const SizedBox(width: 12),
            Expanded(
              flex: _currentStep == 0 ? 1 : 1,
              child: ElevatedButton.icon(
                onPressed: canProceed
                    ? () {
                        if (_currentStep < 4) {
                          setState(() => _currentStep++);
                        } else {
                          _submit();
                        }
                      }
                    : null,
                icon: _isSubmitting && _currentStep == 4
                    ? const SizedBox(
                        width: 18, height: 18,
                        child: CircularProgressIndicator(
                            color: Colors.white, strokeWidth: 2))
                    : Icon(
                        _currentStep < 4 ? Icons.arrow_forward : Icons.check,
                      ),
                label: Text(_currentStep < 4 ? 'Suivant' : (_isSubmitting ? 'Envoi en cours…' : 'Terminer')),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF14B8A6),
                  foregroundColor: Colors.white,
                  disabledBackgroundColor: const Color(0xFFD1D5DB),
                  disabledForegroundColor: const Color(0xFF9CA3AF),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
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
