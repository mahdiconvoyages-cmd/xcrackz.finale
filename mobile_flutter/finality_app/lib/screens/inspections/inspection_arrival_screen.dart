import 'package:flutter/material.dart';
import 'dart:async';
import 'package:flutter_svg/flutter_svg.dart';
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

/// Écran d'inspection d'arrivée moderne avec 8 photos obligatoires
/// Compatible avec les tables Expo mobile (vehicle_inspections + inspection_photos)
class InspectionArrivalScreen extends StatefulWidget {
  final String missionId;
  final bool isRestitution;

  const InspectionArrivalScreen({
    super.key,
    required this.missionId,
    this.isRestitution = false,
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
  bool _isSubmitting = false;
  String _vehicleType = 'VL'; // VL, VU, ou PL

  // Step 1: KM, Carburant, Tableau de bord, Propreté
  String? _dashboardPhoto;
  final _kmController = TextEditingController();
  double _fuelLevel = 50;
  String _internalCleanliness = 'propre';
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

  // Step 3: Check-list d'arrivée (spécifique arrivée)
  String _vehicleCondition = 'Bon'; // État général (Excellent/Bon/Moyen/Mauvais)
  bool _allKeysReturned = false;
  bool _documentsReturned = false;
  bool _isVehicleLoaded = false;
  String? _loadedVehiclePhoto; // Photo obligatoire quand véhicule chargé
  final _observationsController = TextEditingController();

  // Photos de départ pour comparaison
  Map<int, String> _departurePhotoUrls = {}; // index -> url

  // Step 4: Signatures
  Uint8List? _driverSignature;
  Uint8List? _clientSignature;
  final _clientNameController = TextEditingController();
  String _driverName = 'Convoyeur'; // Nom par défaut au lieu de vide

  // Step 5: Documents (optionnel)
  final List<Map<String, String>> _namedDocuments = [];

  // Expenses
  final List<Map<String, dynamic>> _expenses = [];
  static const _expenseTypes = [
    'Péage',
    'Carburant',
    'Parking',
    'Repas',
    'Hébergement',
    'Transport retour',
    'Autre',
  ];

  // Body map damages tracked by VehicleBodyMapWidget callback
  List<DamageEntry> _bodyMapDamages = [];

  @override
  void initState() {
    super.initState();
    _initializePhotoGuides();
    _loadMissionDetails();
    _loadDriverName();
    _loadDraft();
    _loadDeparturePhotos();
    // Listeners pour rafraîchir le bouton Suivant en temps réel
    _kmController.addListener(_onFieldChanged);
    _clientNameController.addListener(_onFieldChanged);
  }

  void _onFieldChanged() {
    if (mounted) setState(() {});
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
  void _initializePhotoGuides() {
    _photoGuides = buildPhotoGuides(_vehicleType);
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
        if (!mounted) return;
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

  /// Charger les photos de départ pour comparaison
  Future<void> _loadDeparturePhotos() async {
    try {
      // Trouver l'inspection de départ pour cette mission
      final departure = await supabase
          .from('vehicle_inspections')
          .select('id')
          .eq('mission_id', widget.missionId)
          .inFilter('inspection_type', ['departure', 'restitution_departure'])
          .eq('status', 'completed')
          .order('created_at', ascending: false)
          .limit(1)
          .maybeSingle();

      if (departure == null) return;

      // Charger les photos de départ
      final photos = await supabase
          .from('inspection_photos_v2')
          .select('photo_type, full_url')
          .eq('inspection_id', departure['id']);

      if (!mounted) return;

      final Map<int, String> urls = {};
      for (final photo in photos) {
        final type = photo['photo_type'] as String? ?? '';
        final url = photo['full_url'] as String? ?? '';
        if (url.isEmpty || type.contains('_arrival')) continue;

        // Mapper le type de photo à un index
        for (int i = 0; i < _photoGuides.length; i++) {
          if (type == _photoGuides[i].label) {
            urls[i] = url;
            break;
          }
        }
      }

      setState(() => _departurePhotoUrls = urls);
      debugPrint('📸 Loaded ${urls.length} departure photos for comparison');
    } catch (e) {
      debugPrint('⚠️ Error loading departure photos: $e');
    }
  }

  // --- Brouillon auto-save ---
  String get _draftKey => 'inspection_draft_arrival_${widget.missionId}';

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
        'allKeysReturned': _allKeysReturned,
        'documentsReturned': _documentsReturned,
        'isVehicleLoaded': _isVehicleLoaded,
        'observations': _observationsController.text,
        'clientName': _clientNameController.text,
      };
      await prefs.setString(_draftKey, jsonEncode(draft));
      debugPrint('💾 Brouillon arrivée sauvegardé (étape $_currentStep)');
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
        _allKeysReturned = draft['allKeysReturned'] ?? false;
        _documentsReturned = draft['documentsReturned'] ?? false;
        _isVehicleLoaded = draft['isVehicleLoaded'] ?? false;
        if (draft['observations'] != null) _observationsController.text = draft['observations'];
        if (draft['clientName'] != null) _clientNameController.text = draft['clientName'];
      });
      debugPrint('📂 Brouillon arrivée restauré (étape $_currentStep)');
    } catch (e) {
      debugPrint('⚠️ Erreur chargement brouillon: $e');
    }
  }

  Future<void> _clearDraft() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_draftKey);
      debugPrint('🗑️ Brouillon arrivée supprimé');
    } catch (e) {
      debugPrint('⚠️ Erreur suppression brouillon: $e');
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
            child: _buildStepContent(),
          ),

          // Navigation buttons avec SafeArea
          SafeArea(
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
                  // Previous button
                  if (_currentStep > 0)
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () => setState(() => _currentStep--),
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

                  // Next/Submit button
                  Expanded(
                    child: Container(
                      decoration: _canContinue() ? BoxDecoration(
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
                        onPressed: _canContinue()
                            ? (_currentStep < 5
                                ? () { setState(() => _currentStep++); _saveDraft(); }
                                : _submitInspection)
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
                          backgroundColor: _canContinue() ? Colors.transparent : null,
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
          ),
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
              // Header
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
                        Text(
                          guide.label,
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          guide.description,
                          style: TextStyle(
                            fontSize: 13,
                            color: Colors.grey.shade600,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Reference image
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
                      // Angle guide overlay
                      Positioned(
                        bottom: 0,
                        left: 0,
                        right: 0,
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 12),
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              begin: Alignment.bottomCenter,
                              end: Alignment.topCenter,
                              colors: [
                                Colors.black.withValues(alpha: 0.7),
                                Colors.transparent,
                              ],
                            ),
                          ),
                          child: const Text(
                            '📐 Prenez la photo sous cet angle',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                            ),
                            textAlign: TextAlign.center,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

              const SizedBox(height: 16),

              // Tips
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
                        style: TextStyle(
                          color: Colors.orange.shade900,
                          fontSize: 12,
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 16),

              // Buttons
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

  bool _canContinue() {
    switch (_currentStep) {
      case 0:
        return _dashboardPhoto != null && _kmController.text.isNotEmpty;
      case 1:
        if (!_photos.every((photo) => photo != null)) return false;
        // Vérifier que chaque dommage ≠ RAS a un commentaire
        for (int i = 0; i < 8; i++) {
          if (_photoDamages[i] != 'RAS' && _photoComments[i].trim().isEmpty) return false;
        }
        for (int i = 0; i < 10; i++) {
          if (_optionalPhotos[i] != null && _optionalPhotoDamages[i] != 'RAS' && _optionalPhotoComments[i].trim().isEmpty) return false;
        }
        return true;
      case 2:
        if (_isVehicleLoaded && _loadedVehiclePhoto == null) return false;
        return _allKeysReturned && _documentsReturned;
      case 3:
        return _driverSignature != null &&
            _clientSignature != null &&
            _clientNameController.text.isNotEmpty;
      case 4:
        return true; // Documents optionnels
      case 5:
        return true; // Récapitulatif
      default:
        return false;
    }
  }

  /// Normalise les types de frais FR vers les clés DB
  String _normalizeExpenseType(String type) {
    const mapping = {
      'Péage': 'peage',
      'Carburant': 'carburant',
      'Parking': 'parking',
      'Repas': 'repas',
      'Hébergement': 'hebergement',
      'Transport retour': 'transport',
      'Autre': 'autre',
    };
    return mapping[type] ?? type.toLowerCase().replaceAll(RegExp(r'[éè]'), 'e').replaceAll(' ', '_');
  }

  Future<void> _submitInspection() async {
    if (!_canContinue()) {
      _showError('Veuillez compléter toutes les étapes obligatoires');
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      final userId = supabase.auth.currentUser?.id;
      if (userId == null) throw Exception('Utilisateur non connecté');

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

      // 1. Créer l'inspection d'arrivée
      final now = DateTime.now().toUtc().toIso8601String();
      final inspectionResponse = await supabase.from('vehicle_inspections').insert({
        'mission_id': widget.missionId,
        'inspector_id': userId,
        'inspection_type': widget.isRestitution ? 'restitution_arrival' : 'arrival',
        'status': 'completed',
        'completed_at': now,
        'mileage_km': int.tryParse(_kmController.text) ?? 0,
        'fuel_level': _fuelLevel.round(),
        'overall_condition': _vehicleCondition.toLowerCase(),
        'internal_cleanliness': _internalCleanliness,
        'external_cleanliness': _externalCleanliness,
        'latitude': gpsLat,
        'longitude': gpsLng,
        'vehicle_info': {
          'keys_returned': _allKeysReturned,
          'documents_returned': _documentsReturned,
          'is_loaded': _isVehicleLoaded,
          'has_loaded_photo': _loadedVehiclePhoto != null,
        },
        'notes': _observationsController.text.isNotEmpty ? _observationsController.text : null,
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
        'created_at': now,
      }).select().single();

      final inspectionId = inspectionResponse['id'];

      // 2. Upload et sauvegarder toutes les photos (parallèle par batch de 3)
      final allPhotos = <Map<String, dynamic>>[
        if (_dashboardPhoto != null)
          {'path': _dashboardPhoto!, 'type': 'dashboard_arrival', 'index': -1, 'damage': 'RAS', 'comment': '', 'lat': null, 'lng': null, 'takenAt': null},
        if (_loadedVehiclePhoto != null)
          {'path': _loadedVehiclePhoto!, 'type': 'loaded_vehicle_arrival', 'index': -2, 'damage': 'RAS', 'comment': '', 'lat': null, 'lng': null, 'takenAt': null},
        ..._photos.asMap().entries.where((e) => e.value != null).map((e) => {
              'path': e.value!,
              'type': '${_photoGuides[e.key].label}_arrival',
              'index': e.key,
              'damage': _photoDamages[e.key],
              'comment': _photoComments[e.key],
              'lat': _photoLatitudes[e.key],
              'lng': _photoLongitudes[e.key],
              'takenAt': _photoTimestamps[e.key]?.toIso8601String(),
            }),
        ..._optionalPhotos.asMap().entries.where((e) => e.value != null).map((e) => {
              'path': e.value!,
              'type': 'Photo optionnelle ${e.key + 1}_arrival',
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
              'inspection_arrival_${inspectionId}_${photoType}_${DateTime.now().millisecondsSinceEpoch}_${photo['index']}.jpg';
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

      // 4. Sauvegarder les documents scannés avec noms personnalisés
      for (final doc in _namedDocuments) {
        final docPath = doc['url'] ?? '';
        final file = File(docPath);
        if (!file.existsSync()) {
          debugPrint('⚠️ Document file missing: $docPath');
          continue;
        }
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
          'document_type': 'custom',
          'document_title': doc['title'] ?? 'Document',
        });
      }

      // 4b. Sauvegarder les frais/dépenses
      for (final expense in _expenses) {
        // Normaliser le type pour correspondre à la contrainte DB
        final rawType = (expense['type'] as String?) ?? 'autre';
        final normalizedType = _normalizeExpenseType(rawType);
        await supabase.from('inspection_expenses').insert({
          'inspection_id': inspectionId,
          'expense_type': normalizedType,
          'amount': expense['amount'],
          'description': expense['description'],
        });
      }

      // 4c. Sauvegarder les dommages du body map
      for (final damage in _bodyMapDamages) {
        await supabase.from('inspection_damages').insert({
          'inspection_id': inspectionId,
          'damage_type': damage.type.name,
          'severity': 'moderate',
          'location': damage.zone.key,
          'description': '${damage.zone.label} — ${damage.type.label}${damage.comment.isNotEmpty ? ': ${damage.comment}' : ''}',
          'detected_by': 'manual',
        });
      }
      debugPrint('✅ STEP 4c OK: ${_bodyMapDamages.length} damages saved');

      // 5. Check if this is restitution arrival or regular arrival with restitution pending
      if (widget.isRestitution) {
        // Restitution arrival → mark mission as completed
        await supabase.from('missions').update({
          'status': 'completed',
          'updated_at': DateTime.now().toUtc().toIso8601String(),
        }).eq('id', widget.missionId);
      } else {
        // Regular arrival → check if mission has restitution
        final missionData = await supabase
            .from('missions')
            .select('has_restitution')
            .eq('id', widget.missionId)
            .single();
        final hasRestitution = missionData['has_restitution'] == true;

        if (!hasRestitution) {
          // No restitution → mark completed
          await supabase.from('missions').update({
            'status': 'completed',
            'updated_at': DateTime.now().toUtc().toIso8601String(),
          }).eq('id', widget.missionId);
        }
        // If has restitution, don't mark completed — user needs to do restitution inspections
      }

      // 6. Créer ou mettre à jour le token de partage dans inspection_report_shares
      final reportType = widget.isRestitution ? 'restitution_complete' : 'complete';
      final shareToken = '${DateTime.now().millisecondsSinceEpoch.toRadixString(36)}${userId.substring(0, 8)}';
      await supabase.from('inspection_report_shares').upsert({
        'mission_id': widget.missionId,
        'share_token': shareToken,
        'user_id': userId,
        'report_type': reportType,
        'is_active': true,
      }, onConflict: 'mission_id,report_type');

      if (mounted) setState(() => _isSubmitting = false);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(widget.isRestitution
                ? '✅ Inspection d\'arrivée restitution terminée'
                : '✅ Inspection d\'arrivée terminée avec succès'),
            backgroundColor: const Color(0xFF14B8A6),
            behavior: SnackBarBehavior.floating,
          ),
        );

        // Proposer de partager le rapport avec le signataire
        await showDialog(
          context: context,
          barrierDismissible: false,
          builder: (ctx) => InspectionReportLinkDialog(
            shareToken: shareToken,
            reportType: widget.isRestitution ? 'restitution_arrival' : 'arrival',
          ),
        );

        if (!widget.isRestitution && mounted) {
          // Check if restitution is needed
          final missionCheck = await supabase
              .from('missions')
              .select('has_restitution')
              .eq('id', widget.missionId)
              .single();
          if (missionCheck['has_restitution'] == true && mounted) {
            // Inform user that restitution inspections are needed next
            await showDialog(
              context: context,
              barrierDismissible: false,
              builder: (ctx) => AlertDialog(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                title: Row(
                  children: [
                    Icon(Icons.swap_horiz_rounded, color: const Color(0xFFE65100), size: 28),
                    const SizedBox(width: 10),
                    const Expanded(child: Text('Restitution', style: TextStyle(fontWeight: FontWeight.bold))),
                  ],
                ),
                content: const Text(
                  'L\'inspection d\'arrivée est terminée.\n\n'
                  'Cette mission inclut une restitution (aller-retour). '
                  'Vous pourrez lancer l\'inspection de départ restitution '
                  'depuis les détails de la mission une fois sur place.',
                ),
                actions: [
                  ElevatedButton(
                    onPressed: () => Navigator.pop(ctx),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFE65100),
                    ),
                    child: const Text('Compris', style: TextStyle(color: Colors.white)),
                  ),
                ],
              ),
            );
          }
        }

        // Push notification for completed inspection
        NotificationService().showMissionNotification(
          title: 'Inspection d\'arrivée terminée',
          body: 'L\'inspection d\'arrivée a été enregistrée avec succès',
          payload: 'mission:${widget.missionId}',
        );

        if (mounted) Navigator.pop(context, true);
        _clearDraft();
      }
    } catch (e) {
      if (mounted) setState(() => _isSubmitting = false);
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

  /// Afficher la photo de départ pour comparaison côte à côte
  void _showDeparturePhotoComparison(int index) {
    final departureUrl = _departurePhotoUrls[index];
    if (departureUrl == null) return;
    final arrivalPath = _photos[index];
    final label = _photoGuides[index].label;

    showDialog(
      context: context,
      builder: (ctx) => Dialog(
        backgroundColor: PremiumTheme.cardBg,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Comparaison: $label', style: TextStyle(
                color: PremiumTheme.textPrimary,
                fontSize: 16,
                fontWeight: FontWeight.bold,
              )),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: Column(
                      children: [
                        const Text('Départ', style: TextStyle(
                          color: Color(0xFF14B8A6),
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        )),
                        const SizedBox(height: 8),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: Image.network(
                            departureUrl,
                            height: 200,
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) => Container(
                              height: 200,
                              color: const Color(0xFFE5E7EB),
                              child: const Center(child: Icon(Icons.broken_image, size: 32)),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      children: [
                        const Text('Arrivée', style: TextStyle(
                          color: Color(0xFFF59E0B),
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        )),
                        const SizedBox(height: 8),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: arrivalPath != null
                              ? Image.file(File(arrivalPath), height: 200, fit: BoxFit.cover)
                              : Container(
                                  height: 200,
                                  color: const Color(0xFFE5E7EB),
                                  child: const Center(
                                    child: Text('Pas encore prise', style: TextStyle(color: Color(0xFF9CA3AF), fontSize: 12)),
                                  ),
                                ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Fermer', style: TextStyle(color: Color(0xFF14B8A6))),
              ),
            ],
          ),
        ),
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
                      const Text(
                        'État final du véhicule',
                        style: TextStyle(
                          color: PremiumTheme.textPrimary,
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 2),
                      const Text(
                        'Photographiez le tableau de bord et renseignez le kilométrage final',
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
                color: PremiumTheme.cardBg,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: _dashboardPhoto != null
                      ? const Color(0xFF14B8A6)
                      : const Color(0xFFE5E7EB),
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
                          color: Color(0xFFD1D5DB),
                        ),
                        SizedBox(height: 16),
                        Text(
                          'Photographier le tableau de bord',
                          style: TextStyle(
                            color: PremiumTheme.textSecondary,
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
            style: TextStyle(color: PremiumTheme.textPrimary, fontSize: 16),
            decoration: InputDecoration(
              hintText: 'Ex: 125000',
              hintStyle: const TextStyle(color: PremiumTheme.textTertiary),
              suffixText: 'km',
              suffixStyle: const TextStyle(color: Color(0xFF14B8A6)),
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
              color: PremiumTheme.cardBg,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE5E7EB)),
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
                    inactiveColor: const Color(0xFFE5E7EB),
                    onChanged: (value) => setState(() => _fuelLevel = value),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 32),

          // Propreté intérieure
          _buildCleanlinessSelector('Propreté intérieure', _internalCleanliness, (v) => setState(() => _internalCleanliness = v)),
          const SizedBox(height: 24),

          // Propreté extérieure
          _buildCleanlinessSelector('Propreté extérieure', _externalCleanliness, (v) => setState(() => _externalCleanliness = v)),
        ],
      ),
    );
  }

  Widget _buildPhotosStep() {
    final missingCount = _photos.where((p) => p == null).length;
    final takenCount = 8 - missingCount;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header with progress info
          Row(
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
                    const Text(
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
          const SizedBox(height: 20),

          // Photos grid
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              childAspectRatio: 0.65,
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
    final String? guideImage;
    
    if (isOptional) {
      label = 'Photo optionnelle ${index + 1}';
      icon = Icons.add_a_photo;
      photoPath = _optionalPhotos[index];
      guideImage = null;
    } else {
      final guide = _photoGuides[index];
      label = guide.label;
      icon = guide.icon;
      photoPath = _photos[index];
      guideImage = guide.image;
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
                                  color: Colors.white.withValues(alpha: 0.7),
                                ),
                              ),
                            ],
                          )
                        : Center(
                            child: Icon(
                              icon,
                              size: 48,
                              color: const Color(0xFFD1D5DB),
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
                    style: TextStyle(
                      color: PremiumTheme.textPrimary,
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  // Bouton comparaison départ
                  if (!isOptional && _departurePhotoUrls.containsKey(index))
                    GestureDetector(
                      onTap: () => _showDeparturePhotoComparison(index),
                      child: Container(
                        margin: const EdgeInsets.only(top: 4),
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: const Color(0xFF14B8A6).withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: const Color(0xFF14B8A6), width: 1),
                        ),
                        child: const Text('📷 Voir départ', style: TextStyle(fontSize: 10, color: Color(0xFF14B8A6), fontWeight: FontWeight.w600)),
                      ),
                    ),
                  const SizedBox(height: 8),
                  if (hasPhoto)
                    DropdownButton<String>(
                      value: isOptional ? _optionalPhotoDamages[index] : _photoDamages[index],
                      dropdownColor: PremiumTheme.cardBg,
                      style: TextStyle(color: PremiumTheme.textPrimary, fontSize: 12),
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
                              if (value == 'RAS') _optionalPhotoComments[index] = '';
                            } else {
                              _photoDamages[index] = value;
                              if (value == 'RAS') _photoComments[index] = '';
                            }
                          });
                        }
                      },
                    ),
                  // Champ commentaire obligatoire si dommage ≠ RAS
                  if (hasPhoto && (isOptional ? _optionalPhotoDamages[index] : _photoDamages[index]) != 'RAS') ...[
                    const SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFEF3C7),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: const Color(0xFFF59E0B)),
                      ),
                      child: TextField(
                        decoration: InputDecoration(
                          hintText: 'Commentaire obligatoire...',
                          hintStyle: TextStyle(color: Colors.orange.shade300, fontSize: 11),
                          border: InputBorder.none,
                          isDense: true,
                          contentPadding: EdgeInsets.zero,
                        ),
                        style: const TextStyle(fontSize: 11, color: Colors.black87),
                        maxLines: 2,
                        onChanged: (val) {
                          if (isOptional) {
                            _optionalPhotoComments[index] = val;
                          } else {
                            _photoComments[index] = val;
                          }
                        },
                      ),
                    ),
                  ],
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
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Vérifications d\'arrivée',
                        style: TextStyle(
                          color: PremiumTheme.textPrimary,
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 2),
                      const Text(
                        'Vérifiez que tout est en ordre avant de finaliser',
                        style: TextStyle(color: PremiumTheme.textSecondary, fontSize: 13),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 28),

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
            'Documents restitués',
            'Carte grise, papiers du véhicule remis',
            _documentsReturned,
            (value) => setState(() => _documentsReturned = value),
          ),
          const SizedBox(height: 16),

          // Véhicule chargé
          _buildCheckItem(
            'Véhicule chargé',
            'Le véhicule contient des objets/cargaison',
            _isVehicleLoaded,
            (value) => setState(() {
              _isVehicleLoaded = value;
              if (!value) _loadedVehiclePhoto = null;
            }),
          ),
          if (_isVehicleLoaded) ..._buildLoadedVehiclePhotoSection(),
          const SizedBox(height: 32),

          // Carte des dommages (body map)
          VehicleBodyMapWidget(
            damages: _bodyMapDamages,
            onDamagesChanged: (damages) {
              setState(() => _bodyMapDamages = damages);
            },
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
            style: TextStyle(color: PremiumTheme.textPrimary),
            decoration: InputDecoration(
              hintText: 'Notes particulières, incidents, remarques...',
              hintStyle: const TextStyle(color: PremiumTheme.textTertiary),
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

  Widget _buildCheckItem(
    String title,
    String description,
    bool value,
    ValueChanged<bool> onChanged,
  ) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: PremiumTheme.cardBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: value ? const Color(0xFF14B8A6) : const Color(0xFFE5E7EB),
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
                  style: TextStyle(
                    color: PremiumTheme.textPrimary,
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  description,
                  style: TextStyle(
                    color: PremiumTheme.textSecondary,
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

  Widget _buildCleanlinessSelector(String label, String value, ValueChanged<String> onChanged) {
    const levels = ['très sale', 'sale', 'correct', 'propre', 'très propre'];
    const icons = [Icons.sentiment_very_dissatisfied, Icons.sentiment_dissatisfied, Icons.sentiment_neutral, Icons.sentiment_satisfied, Icons.sentiment_very_satisfied];
    const colors = [Color(0xFFEF4444), Color(0xFFF97316), Color(0xFFF59E0B), Color(0xFF10B981), Color(0xFF14B8A6)];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: TextStyle(
          color: PremiumTheme.textPrimary,
          fontSize: 14,
          fontWeight: FontWeight.w600,
        )),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: List.generate(levels.length, (i) {
            final selected = value == levels[i];
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
        ),
      ],
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
                      const Text(
                        'Signatures',
                        style: TextStyle(
                          color: PremiumTheme.textPrimary,
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 2),
                      const Text(
                        'Signatures du client et du convoyeur pour finaliser',
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
              hintStyle: const TextStyle(color: PremiumTheme.textTertiary),
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
            style: const TextStyle(
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
                        color: Color(0xFFD1D5DB),
                      ),
                      SizedBox(height: 16),
                      Text(
                        'Appuyer pour signer',
                        style: TextStyle(
                          color: PremiumTheme.textSecondary,
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

          _buildRecapSection('🚗 Compteur & Carburant', [
            _buildRecapRow('Kilométrage', '${_kmController.text} km'),
            _buildRecapRow('Carburant', '${_fuelLevel.toInt()}%'),
            _buildRecapRow('Propreté intérieure', cleanlinessLabel(_internalCleanliness)),
            _buildRecapRow('Propreté extérieure', cleanlinessLabel(_externalCleanliness)),
            _buildRecapRow('Photo tableau de bord', _dashboardPhoto != null ? '✅' : '❌'),
          ]),
          const SizedBox(height: 16),

          _buildRecapSection('📸 Photos', [
            _buildRecapRow('Photos obligatoires', '$photoCount/8'),
            _buildRecapRow('Photos optionnelles', '$optionalPhotoCount'),
            _buildRecapRow('Dommages signalés', '$damageCount'),
          ]),
          const SizedBox(height: 16),

          _buildRecapSection('📋 État du véhicule', [
            _buildRecapRow('État général', _vehicleCondition),
            _buildRecapRow('Clés restituées', _allKeysReturned ? '✅ Oui' : '❌ Non'),
            _buildRecapRow('Documents restitués', _documentsReturned ? '✅ Oui' : '❌ Non'),
            _buildRecapRow('Véhicule chargé', _isVehicleLoaded ? '✅ Oui' : '❌ Non'),
            if (_bodyMapDamages.isNotEmpty)
              _buildRecapRow('Dommages carte', '${_bodyMapDamages.length}'),
            if (_observationsController.text.isNotEmpty)
              _buildRecapRow('Observations', _observationsController.text),
          ]),
          const SizedBox(height: 16),

          _buildRecapSection('✍️ Signatures', [
            _buildRecapRow('Signature convoyeur', _driverSignature != null ? '✅' : '❌'),
            _buildRecapRow('Signature client', _clientSignature != null ? '✅' : '❌'),
            _buildRecapRow('Nom client', _clientNameController.text.isNotEmpty ? _clientNameController.text : '—'),
          ]),
          const SizedBox(height: 16),

          _buildRecapSection('📄 Documents', [
            _buildRecapRow('Documents scannés', '$docCount'),
          ]),
          const SizedBox(height: 16),

          if (_expenses.isNotEmpty)
            _buildRecapSection('💰 Frais de mission', [
              ..._expenses.map((e) => _buildRecapRow(
                e['type'] ?? 'Frais',
                '${(e['amount'] ?? 0).toStringAsFixed(2)} €',
              )),
              _buildRecapRow('Total',
                '${_expenses.fold<double>(0.0, (sum, e) => sum + ((e['amount'] ?? 0) as num).toDouble()).toStringAsFixed(2)} €',
              ),
            ]),

          const SizedBox(height: 32),

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
                  child: const Icon(Icons.description, color: Color(0xFF14B8A6), size: 24),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Documents',
                        style: TextStyle(
                          color: PremiumTheme.textPrimary,
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 2),
                      const Text(
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
            onPressed: () => _scanNamedDocument(),
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

          // Document list with names
          if (_namedDocuments.isNotEmpty) ...[
            Text(
              'Documents scannés (${_namedDocuments.length})',
              style: const TextStyle(
                color: Color(0xFF14B8A6),
                fontSize: 16,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 16),
            ..._namedDocuments.asMap().entries.map((entry) {
              final doc = entry.value;
              return Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: PremiumTheme.cardBgLight,
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
                            style: const TextStyle(
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
                        setState(() {
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

          const SizedBox(height: 32),

          // ── Section Frais / Dépenses ──
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  const Color(0xFFF59E0B).withValues(alpha: 0.08),
                  const Color(0xFFF59E0B).withValues(alpha: 0.02),
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.2)),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF59E0B).withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.receipt, color: Color(0xFFF59E0B), size: 24),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Frais de mission',
                        style: TextStyle(
                          color: PremiumTheme.textPrimary,
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Ajoutez vos dépenses (optionnel)',
                        style: TextStyle(color: PremiumTheme.textSecondary, fontSize: 13),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          ElevatedButton.icon(
            onPressed: _addExpense,
            icon: const Icon(Icons.add_circle_outline),
            label: const Text('Ajouter un frais'),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFF59E0B),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),

          if (_expenses.isNotEmpty) ...[
            const SizedBox(height: 16),
            Text(
              'Frais ajoutés (${_expenses.length})',
              style: const TextStyle(
                color: Color(0xFFF59E0B),
                fontSize: 16,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 12),
            ..._expenses.asMap().entries.map((entry) {
              final expense = entry.value;
              return Container(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: PremiumTheme.cardBg,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFE5E7EB)),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 42,
                      height: 42,
                      decoration: BoxDecoration(
                        color: const Color(0xFFF59E0B).withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(Icons.receipt, color: Color(0xFFF59E0B), size: 20),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            expense['type'] ?? 'Frais',
                            style: const TextStyle(
                              color: PremiumTheme.textPrimary,
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          if ((expense['description'] ?? '').toString().isNotEmpty)
                            Text(
                              expense['description'],
                              style: TextStyle(
                                color: PremiumTheme.textSecondary,
                                fontSize: 12,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                        ],
                      ),
                    ),
                    Text(
                      '${(expense['amount'] ?? 0).toStringAsFixed(2)} €',
                      style: const TextStyle(
                        color: PremiumTheme.textPrimary,
                        fontSize: 15,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(width: 4),
                    IconButton(
                      onPressed: () {
                        setState(() => _expenses.removeAt(entry.key));
                      },
                      icon: const Icon(Icons.delete_outline, color: Color(0xFFEF4444), size: 20),
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(maxWidth: 32, maxHeight: 32),
                    ),
                  ],
                ),
              );
            }),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              decoration: BoxDecoration(
                color: const Color(0xFFF59E0B).withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Total frais',
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  Text(
                    '${_expenses.fold<double>(0.0, (sum, e) => sum + ((e['amount'] ?? 0) as num).toDouble()).toStringAsFixed(2)} €',
                    style: const TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFFF59E0B),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Future<void> _scanNamedDocument() async {
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
            hintText: 'Ex: Bon de livraison, PV de réception...',
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
          inspectionId: 'arrival_${widget.missionId}',
        ),
      ),
    );

    if (result != null && result is String) {
      setState(() {
        _namedDocuments.add({'url': result, 'title': docName});
      });
    }
  }

  Future<void> _addExpense() async {
    String selectedType = _expenseTypes.first;
    final amountController = TextEditingController();
    final descController = TextEditingController();

    final expense = await showDialog<Map<String, dynamic>>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Text('Ajouter un frais'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Type de frais', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: _expenseTypes.map((type) {
                    final isSelected = selectedType == type;
                    return GestureDetector(
                      onTap: () => setDialogState(() => selectedType = type),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                        decoration: BoxDecoration(
                          color: isSelected ? const Color(0xFFF59E0B) : Colors.grey.shade100,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          type,
                          style: TextStyle(
                            color: isSelected ? Colors.white : Colors.grey.shade700,
                            fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
                            fontSize: 13,
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 16),
                const Text('Montant (€)', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                const SizedBox(height: 8),
                TextField(
                  controller: amountController,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  decoration: InputDecoration(
                    hintText: '0.00',
                    prefixText: '€ ',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
                const SizedBox(height: 16),
                const Text('Description (optionnel)', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                const SizedBox(height: 8),
                TextField(
                  controller: descController,
                  decoration: InputDecoration(
                    hintText: 'Ex: Autoroute A6, Station Total...',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Annuler'),
            ),
            ElevatedButton(
              onPressed: () {
                final amount = double.tryParse(amountController.text.replaceAll(',', '.'));
                if (amount == null || amount <= 0) return;
                Navigator.pop(ctx, {
                  'type': selectedType,
                  'amount': amount,
                  'description': descController.text.trim(),
                });
              },
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFF59E0B)),
              child: const Text('Ajouter', style: TextStyle(color: Colors.white)),
            ),
          ],
        ),
      ),
    );

    amountController.dispose();
    descController.dispose();

    if (expense != null) {
      setState(() => _expenses.add(expense));
    }
  }

  @override
  void dispose() {
    unawaited(_saveDraft());
    _kmController.removeListener(_onFieldChanged);
    _clientNameController.removeListener(_onFieldChanged);
    _kmController.dispose();
    _observationsController.dispose();
    _clientNameController.dispose();
    super.dispose();
  }
}
