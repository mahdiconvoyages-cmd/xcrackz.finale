import 'package:flutter/material.dart';
import 'vehicle_body_map_widget.dart';

/// Mapping: each photo index → relevant vehicle zones
/// Photo 0: Avant → zones frontales
/// Photo 1: Avant gauche → avant + côté gauche
/// Photo 2: Arrière gauche → arrière + côté gauche
/// Photo 3: Arrière → zones arrière
/// Photo 4: Arrière droit → arrière + côté droit
/// Photo 5: Avant droit → avant + côté droit
/// Photo 6: Intérieur avant → habitacle (pas de zones extérieures)
/// Photo 7: Intérieur arrière → habitacle (pas de zones extérieures)
const Map<int, List<VehicleZone>> photoAngleZones = {
  0: [
    // Avant
    VehicleZone.frontBumper,
    VehicleZone.frontLeftCorner,
    VehicleZone.frontRightCorner,
    VehicleZone.hood,
    VehicleZone.windshield,
    VehicleZone.leftHeadlight,
    VehicleZone.rightHeadlight,
  ],
  1: [
    // Avant gauche
    VehicleZone.frontBumper,
    VehicleZone.frontLeftCorner,
    VehicleZone.leftHeadlight,
    VehicleZone.leftFrontFender,
    VehicleZone.leftFrontDoor,
    VehicleZone.leftMirror,
    VehicleZone.hood,
  ],
  2: [
    // Arrière gauche
    VehicleZone.rearLeftCorner,
    VehicleZone.leftTaillight,
    VehicleZone.leftRearDoor,
    VehicleZone.leftRearFender,
    VehicleZone.leftSill,
    VehicleZone.rearBumper,
    VehicleZone.trunk,
  ],
  3: [
    // Arrière
    VehicleZone.rearBumper,
    VehicleZone.rearLeftCorner,
    VehicleZone.rearRightCorner,
    VehicleZone.trunk,
    VehicleZone.rearWindow,
    VehicleZone.leftTaillight,
    VehicleZone.rightTaillight,
  ],
  4: [
    // Arrière droit
    VehicleZone.rearRightCorner,
    VehicleZone.rightTaillight,
    VehicleZone.rightRearDoor,
    VehicleZone.rightRearFender,
    VehicleZone.rightSill,
    VehicleZone.rearBumper,
    VehicleZone.trunk,
  ],
  5: [
    // Avant droit
    VehicleZone.frontBumper,
    VehicleZone.frontRightCorner,
    VehicleZone.rightHeadlight,
    VehicleZone.rightFrontFender,
    VehicleZone.rightFrontDoor,
    VehicleZone.rightMirror,
    VehicleZone.hood,
  ],
  // 6 & 7 : Intérieur → pas de zones carrosserie, on offre le toit + pare-brise
  6: [
    VehicleZone.windshield,
    VehicleZone.roof,
  ],
  7: [
    VehicleZone.rearWindow,
    VehicleZone.roof,
    VehicleZone.trunk,
  ],
};

/// Titres par angle photo
const Map<int, String> _photoAngleTitles = {
  0: '🚗 Vue Avant',
  1: '🚗 Avant Gauche',
  2: '🚗 Arrière Gauche',
  3: '🚗 Vue Arrière',
  4: '🚗 Arrière Droit',
  5: '🚗 Avant Droit',
  6: '🪑 Intérieur Avant',
  7: '🪑 Intérieur Arrière',
};

/// Dialog qui s'ouvre quand l'utilisateur signale un dommage sur une photo
/// Affiche les zones cliquables pertinentes pour cet angle de prise de vue
class PhotoDamageMapDialog extends StatefulWidget {
  final int photoIndex;
  final String photoLabel;
  final List<DamageEntry> existingDamages;

  const PhotoDamageMapDialog({
    super.key,
    required this.photoIndex,
    required this.photoLabel,
    this.existingDamages = const [],
  });

  @override
  State<PhotoDamageMapDialog> createState() => _PhotoDamageMapDialogState();
}

class _PhotoDamageMapDialogState extends State<PhotoDamageMapDialog> {
  late List<DamageEntry> _damages;
  VehicleZone? _selectedZone;

  @override
  void initState() {
    super.initState();
    _damages = List<DamageEntry>.from(widget.existingDamages);
  }

  List<VehicleZone> get _zones =>
      photoAngleZones[widget.photoIndex] ?? VehicleZone.values.toList();

  @override
  Widget build(BuildContext context) {
    final title = _photoAngleTitles[widget.photoIndex] ?? widget.photoLabel;

    return Dialog(
      insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: Container(
        constraints: const BoxConstraints(maxHeight: 600, maxWidth: 450),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // ── Header ──
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [Color(0xFFDC2626), Color(0xFFF97316)],
                ),
                borderRadius: BorderRadius.only(
                  topLeft: Radius.circular(20),
                  topRight: Radius.circular(20),
                ),
              ),
              child: Row(
                children: [
                  const Icon(Icons.warning_amber_rounded, color: Colors.white, size: 24),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          title,
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                          ),
                        ),
                        Text(
                          'Touchez les zones endommagées',
                          style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.85),
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (_damages.isNotEmpty)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.25),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        '${_damages.length}',
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                        ),
                      ),
                    ),
                ],
              ),
            ),

            // ── Zone chips ──
            Flexible(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Sélectionnez la zone endommagée :',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF374151),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: _zones.map((zone) {
                        final hasDamage = _damages.any((d) => d.zone == zone);
                        final isSelected = _selectedZone == zone;
                        return GestureDetector(
                          onTap: () => _openZoneDamageSheet(zone),
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 200),
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            decoration: BoxDecoration(
                              color: hasDamage
                                  ? const Color(0xFFFEE2E2)
                                  : isSelected
                                      ? const Color(0xFFEFF6FF)
                                      : const Color(0xFFF3F4F6),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: hasDamage
                                    ? const Color(0xFFEF4444)
                                    : isSelected
                                        ? const Color(0xFF3B82F6)
                                        : const Color(0xFFD1D5DB),
                                width: hasDamage ? 2 : 1,
                              ),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  hasDamage ? Icons.warning_rounded : Icons.touch_app_outlined,
                                  size: 16,
                                  color: hasDamage ? const Color(0xFFEF4444) : const Color(0xFF6B7280),
                                ),
                                const SizedBox(width: 6),
                                Text(
                                  zone.label,
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: hasDamage ? FontWeight.w700 : FontWeight.w500,
                                    color: hasDamage ? const Color(0xFFDC2626) : const Color(0xFF374151),
                                  ),
                                ),
                                if (hasDamage) ...[
                                  const SizedBox(width: 4),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFEF4444),
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: Text(
                                      '${_damages.where((d) => d.zone == zone).length}',
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 10,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ),
                        );
                      }).toList(),
                    ),

                    // ── Liste des dommages ajoutés ──
                    if (_damages.isNotEmpty) ...[
                      const SizedBox(height: 20),
                      const Divider(height: 1),
                      const SizedBox(height: 12),
                      const Text(
                        'Dommages signalés :',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFFDC2626),
                        ),
                      ),
                      const SizedBox(height: 8),
                      ..._damages.map((d) => Container(
                        margin: const EdgeInsets.only(bottom: 6),
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: d.type.color.withValues(alpha: 0.08),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: d.type.color.withValues(alpha: 0.3)),
                        ),
                        child: Row(
                          children: [
                            Icon(d.type.icon, size: 16, color: d.type.color),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    '${d.zone.label} — ${d.type.label}',
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                      color: d.type.color,
                                    ),
                                  ),
                                  if (d.comment.isNotEmpty)
                                    Text(
                                      d.comment,
                                      style: const TextStyle(fontSize: 11, color: Color(0xFF6B7280)),
                                    ),
                                ],
                              ),
                            ),
                            IconButton(
                              icon: const Icon(Icons.close, size: 18, color: Color(0xFFEF4444)),
                              padding: EdgeInsets.zero,
                              constraints: const BoxConstraints(maxWidth: 28, maxHeight: 28),
                              onPressed: () => setState(() => _damages.remove(d)),
                            ),
                          ],
                        ),
                      )),
                    ],
                  ],
                ),
              ),
            ),

            // ── Actions ──
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: const Color(0xFFF9FAFB),
                border: Border(top: BorderSide(color: Colors.grey.shade200)),
                borderRadius: const BorderRadius.only(
                  bottomLeft: Radius.circular(20),
                  bottomRight: Radius.circular(20),
                ),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.pop(context),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      child: const Text('Annuler'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () => Navigator.pop(context, _damages),
                      icon: const Icon(Icons.check, size: 18),
                      label: Text(
                        _damages.isEmpty ? 'Rien à signaler' : 'Valider (${_damages.length})',
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: _damages.isEmpty
                            ? const Color(0xFF10B981)
                            : const Color(0xFFEF4444),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Bottom sheet pour sélectionner le type + commentaire pour une zone
  void _openZoneDamageSheet(VehicleZone zone) async {
    setState(() => _selectedZone = zone);
    DamageType selectedType = DamageType.scratch;
    final commentController = TextEditingController();

    final result = await showModalBottomSheet<DamageEntry>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) => Padding(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 20,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Zone title
              Row(
                children: [
                  const Icon(Icons.location_on, color: Color(0xFFEF4444), size: 20),
                  const SizedBox(width: 8),
                  Text(
                    zone.label,
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Type selection
              const Text('Type de dommage', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: DamageType.values.map((type) {
                  final isSelected = selectedType == type;
                  return GestureDetector(
                    onTap: () => setSheetState(() => selectedType = type),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
                      decoration: BoxDecoration(
                        color: isSelected ? type.color.withValues(alpha: 0.2) : Colors.grey.shade100,
                        borderRadius: BorderRadius.circular(20),
                        border: isSelected ? Border.all(color: type.color, width: 2) : null,
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(type.icon, size: 14, color: isSelected ? type.color : Colors.grey),
                          const SizedBox(width: 4),
                          Text(type.label, style: TextStyle(
                            color: isSelected ? type.color : Colors.grey.shade700,
                            fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
                            fontSize: 12,
                          )),
                        ],
                      ),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 16),

              // Comment
              const Text('Commentaire (optionnel)', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
              TextField(
                controller: commentController,
                decoration: InputDecoration(
                  hintText: 'Décrivez le dommage...',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
                maxLines: 2,
              ),
              const SizedBox(height: 20),

              // Submit
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () => Navigator.pop(ctx, DamageEntry(
                    zone: zone,
                    type: selectedType,
                    comment: commentController.text.trim(),
                  )),
                  icon: const Icon(Icons.add, size: 18),
                  label: const Text('Ajouter ce dommage'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFEF4444),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );

    commentController.dispose();
    setState(() => _selectedZone = null);

    if (result != null) {
      setState(() => _damages.add(result));
    }
  }
}
