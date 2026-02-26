import 'package:flutter/material.dart';
import 'dart:typed_data';
import '../../../widgets/signature_pad_widget.dart';
import '../../../theme/premium_theme.dart';

/// Guide photo avec label, icône, description et image de référence
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

/// Dialog de signature (convoyeur ou client)
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
      backgroundColor: PremiumTheme.cardBg,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              title,
              style: const TextStyle(
                color: PremiumTheme.textPrimary,
                fontSize: 18,
                fontWeight: FontWeight.w600,
              ),
            ),
            if (subtitle.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(
                subtitle,
                style: const TextStyle(
                  color: PremiumTheme.textSecondary,
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

/// Initialise les 8 guides photos selon le type de véhicule (VL, VU, PL)
List<PhotoGuide> buildPhotoGuides(String vehicleType) {
  return [
    PhotoGuide(
      label: 'Avant',
      icon: Icons.directions_car,
      description: 'Vue de face du véhicule',
      image: vehicleType == 'PL'
          ? 'assets/vehicles/scania-avant.png'
          : vehicleType == 'VU'
              ? 'assets/vehicles/master_avant.png'
              : 'assets/vehicles/avant.png',
    ),
    PhotoGuide(
      label: 'Avant gauche',
      icon: Icons.format_indent_increase,
      description: 'Angle avant latéral gauche',
      image: vehicleType == 'PL'
          ? 'assets/vehicles/scania-lateral-gauche-avant.png'
          : vehicleType == 'VU'
              ? 'assets/vehicles/master_lateral_gauche_avant.png'
              : 'assets/vehicles/lateral_gauche_avant.png',
    ),
    PhotoGuide(
      label: 'Arrière gauche',
      icon: Icons.format_indent_decrease,
      description: 'Angle arrière latéral gauche',
      image: vehicleType == 'PL'
          ? 'assets/vehicles/scania-lateral-gauche-arriere.png'
          : vehicleType == 'VU'
              ? 'assets/vehicles/master_lateral_gauche_arriere.png'
              : 'assets/vehicles/laterale_gauche_arriere.png',
    ),
    PhotoGuide(
      label: 'Arrière',
      icon: Icons.directions_car,
      description: 'Vue arrière du véhicule',
      image: vehicleType == 'PL'
          ? 'assets/vehicles/scania-arriere.png'
          : vehicleType == 'VU'
              ? 'assets/vehicles/master_avg_2.png'
              : 'assets/vehicles/arriere.png',
    ),
    PhotoGuide(
      label: 'Arrière droit',
      icon: Icons.format_indent_decrease,
      description: 'Angle arrière latéral droit',
      image: vehicleType == 'PL'
          ? 'assets/vehicles/scania-lateral-droit-arriere.png'
          : vehicleType == 'VU'
              ? 'assets/vehicles/master_lateral_droit_arriere.png'
              : 'assets/vehicles/lateral_droit_arriere.png',
    ),
    PhotoGuide(
      label: 'Avant droit',
      icon: Icons.format_indent_increase,
      description: 'Angle avant latéral droit',
      image: vehicleType == 'PL'
          ? 'assets/vehicles/scania-lateral-droit-avant.png'
          : vehicleType == 'VU'
              ? 'assets/vehicles/master_lateral_droit_avant.png'
              : 'assets/vehicles/lateraldroit_avant.png',
    ),
    const PhotoGuide(
      label: 'Intérieur avant',
      icon: Icons.airline_seat_recline_normal,
      description: 'Sièges avant et habitacle',
      image: 'assets/vehicles/interieur_avant.png',
    ),
    const PhotoGuide(
      label: 'Intérieur arrière',
      icon: Icons.weekend,
      description: 'Sièges arrière et espace passagers',
      image: 'assets/vehicles/interieur_arriere.png',
    ),
  ];
}
