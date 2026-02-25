import 'package:flutter/material.dart';

/// Widget qui affiche une image de guidage pour la prise de photo d'inspection
/// selon le type de véhicule (VL/VU/PL) et l'angle demandé
class VehiclePhotoGuide extends StatelessWidget {
  final String vehicleType; // 'VL', 'VU', 'PL'
  final String photoType; // 'front', 'back', 'left_front', etc.
  final bool isCaptured;
  final String? capturedPhotoPath;
  final VoidCallback? onTap;

  const VehiclePhotoGuide({
    super.key,
    required this.vehicleType,
    required this.photoType,
    this.isCaptured = false,
    this.capturedPhotoPath,
    this.onTap,
  });

  /// Mapping des types de photos vers les noms de fichiers d'images
  /// Chaque type de véhicule a ses propres images extérieures
  /// Les images intérieur et tableau de bord restent identiques pour tous
  static const Map<String, Map<String, String>> _vehiclePhotos = {
    'VL': {
      'front': 'avant.png',
      'back': 'arriere.png',
      'left_front': 'lateral_gauche_avant.png',
      'left_back': 'laterale_gauche_arriere.png',
      'right_front': 'lateraldroit_avant.png',
      'right_back': 'lateral_droit_arriere.png',
      'interior': 'interieur_avant.png',
      'dashboard': 'tableau_de_bord.png',
    },
    'VU': {
      // VU utilise les images Master/Van
      'front': 'master_avant.png',
      'back': 'master_avg_2.png',
      'left_front': 'master_lateral_gauche_avant.png',
      'left_back': 'master_lateral_gauche_arriere.png',
      'right_front': 'master_lateral_droit_avant.png',
      'right_back': 'master_lateral_droit_arriere.png',
      'interior': 'interieur_avant.png',
      'dashboard': 'tableau_de_bord.png',
    },
    'PL': {
      // PL utilise les images Scania
      'front': 'scania-avant.png',
      'back': 'scania-arriere.png',
      'left_front': 'scania-lateral-gauche-avant.png',
      'left_back': 'scania-lateral-gauche-arriere.png',
      'right_front': 'scania-lateral-droit-avant.png',
      'right_back': 'scania-lateral-droit-arriere.png',
      'interior': 'interieur_avant.png',
      'dashboard': 'tableau_de_bord.png',
    },
  };

  /// Labels en français pour chaque type de photo
  static const Map<String, String> _photoLabels = {
    'front': 'Face avant',
    'back': 'Face arrière',
    'left_front': 'Latéral gauche avant',
    'left_back': 'Latéral gauche arrière',
    'right_front': 'Latéral droit avant',
    'right_back': 'Latéral droit arrière',
    'interior': 'Intérieur',
    'dashboard': 'Tableau de bord',
    'trunk': 'Coffre',
    'damage': 'Dommage',
  };

  String? _getImagePath() {
    final vehiclePhotos = _vehiclePhotos[vehicleType.toUpperCase()];
    if (vehiclePhotos == null) return null;
    
    final imageName = vehiclePhotos[photoType];
    if (imageName == null) return null;
    
    return 'assets/vehicles/$imageName';
  }

  String get _label => _photoLabels[photoType] ?? photoType;

  @override
  Widget build(BuildContext context) {
    final imagePath = _getImagePath();
    
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isCaptured ? Colors.green : Colors.grey.shade300,
            width: isCaptured ? 3 : 2,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.1),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: Stack(
            children: [
              // Image de guidage ou icône caméra
              if (!isCaptured) ...[
                // Image de guidage
                if (imagePath != null)
                  Positioned.fill(
                    child: Image.asset(
                      imagePath,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) {
                        return _buildCameraIcon();
                      },
                    ),
                  )
                else
                  _buildCameraIcon(),
                  
                // Overlay semi-transparent
                Positioned.fill(
                  child: Container(
                    color: Colors.white.withValues(alpha: 0.3),
                  ),
                ),
              ] else if (capturedPhotoPath != null) ...[
                // Photo capturée
                Positioned.fill(
                  child: Image.network(
                    capturedPhotoPath!,
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) {
                      return Container(
                        color: Colors.grey.shade200,
                        child: const Icon(
                          Icons.image_not_supported,
                          size: 48,
                          color: Colors.grey,
                        ),
                      );
                    },
                    loadingBuilder: (context, child, loadingProgress) {
                      if (loadingProgress == null) return child;
                      return Center(
                        child: CircularProgressIndicator(
                          value: loadingProgress.expectedTotalBytes != null
                              ? loadingProgress.cumulativeBytesLoaded /
                                  loadingProgress.expectedTotalBytes!
                              : null,
                        ),
                      );
                    },
                  ),
                ),
              ],

              // Label
              Positioned(
                bottom: 0,
                left: 0,
                right: 0,
                child: Container(
                  padding: const EdgeInsets.all(8),
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
                  child: Text(
                    _label,
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),
              ),

              // Badge de validation
              if (isCaptured)
                Positioned(
                  top: 8,
                  right: 8,
                  child: Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: Colors.green,
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.3),
                          blurRadius: 4,
                        ),
                      ],
                    ),
                    child: const Icon(
                      Icons.check,
                      color: Colors.white,
                      size: 20,
                    ),
                  ),
                ),

              // Icône caméra si pas capturée
              if (!isCaptured)
                Positioned(
                  top: 8,
                  right: 8,
                  child: Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: Theme.of(context).primaryColor,
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.2),
                          blurRadius: 4,
                        ),
                      ],
                    ),
                    child: const Icon(
                      Icons.camera_alt,
                      color: Colors.white,
                      size: 20,
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCameraIcon() {
    return Container(
      color: Colors.grey.shade100,
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.camera_alt,
              size: 48,
              color: Colors.grey.shade400,
            ),
            const SizedBox(height: 8),
            Text(
              'Appuyez pour\nprendre une photo',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: Colors.grey.shade600,
                fontSize: 12,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Widget pour afficher une grille de photos de guidage
class VehiclePhotosGrid extends StatelessWidget {
  final String vehicleType;
  final Map<String, String?> capturedPhotos; // photoType -> photoUrl
  final Function(String photoType) onPhotoTap;
  final List<String> requiredPhotoTypes;

  const VehiclePhotosGrid({
    super.key,
    required this.vehicleType,
    required this.capturedPhotos,
    required this.onPhotoTap,
    this.requiredPhotoTypes = const [
      'front',
      'back',
      'left_front',
      'left_back',
      'right_front',
      'right_back',
    ],
  });

  @override
  Widget build(BuildContext context) {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: 16,
        mainAxisSpacing: 16,
        childAspectRatio: 1,
      ),
      itemCount: requiredPhotoTypes.length,
      itemBuilder: (context, index) {
        final photoType = requiredPhotoTypes[index];
        final capturedPhotoPath = capturedPhotos[photoType];
        final isCaptured = capturedPhotoPath != null;

        return VehiclePhotoGuide(
          vehicleType: vehicleType,
          photoType: photoType,
          isCaptured: isCaptured,
          capturedPhotoPath: capturedPhotoPath,
          onTap: () => onPhotoTap(photoType),
        );
      },
    );
  }
}
