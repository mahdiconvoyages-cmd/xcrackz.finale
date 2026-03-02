import 'package:flutter/material.dart';
import '../../theme/premium_theme.dart';

/// Types de véhicule supportés
enum VehicleType {
  berline('Berline', Icons.directions_car),
  suv('SUV / Crossover', Icons.directions_car_filled),
  utilitaire('Utilitaire', Icons.local_shipping),
  camion('Camion / PL', Icons.fire_truck);

  final String label;
  final IconData icon;
  const VehicleType(this.label, this.icon);
}

/// Vehicle body zones — 27 zones complètes
enum VehicleZone {
  // Avant
  frontBumper('Pare-chocs avant', 'front_bumper'),
  frontLeftCorner('Coin avant gauche', 'front_left_corner'),
  frontRightCorner('Coin avant droit', 'front_right_corner'),
  hood('Capot', 'hood'),
  windshield('Pare-brise', 'windshield'),
  leftHeadlight('Phare gauche', 'left_headlight'),
  rightHeadlight('Phare droit', 'right_headlight'),

  // Latéral gauche
  leftFrontFender('Aile avant gauche', 'left_front_fender'),
  leftFrontDoor('Portière AV gauche', 'left_front_door'),
  leftRearDoor('Portière AR gauche', 'left_rear_door'),
  leftRearFender('Aile arrière gauche', 'left_rear_fender'),
  leftMirror('Rétroviseur gauche', 'left_mirror'),
  leftSill('Bas de caisse gauche', 'left_sill'),

  // Latéral droit
  rightFrontFender('Aile avant droite', 'right_front_fender'),
  rightFrontDoor('Portière AV droite', 'right_front_door'),
  rightRearDoor('Portière AR droite', 'right_rear_door'),
  rightRearFender('Aile arrière droite', 'right_rear_fender'),
  rightMirror('Rétroviseur droit', 'right_mirror'),
  rightSill('Bas de caisse droit', 'right_sill'),

  // Toit
  roof('Toit', 'roof'),

  // Arrière
  rearBumper('Pare-chocs arrière', 'rear_bumper'),
  rearLeftCorner('Coin arrière gauche', 'rear_left_corner'),
  rearRightCorner('Coin arrière droit', 'rear_right_corner'),
  trunk('Coffre / Hayon', 'trunk'),
  rearWindow('Lunette arrière', 'rear_window'),
  leftTaillight('Feu arrière gauche', 'left_taillight'),
  rightTaillight('Feu arrière droit', 'right_taillight');

  final String label;
  final String key;
  const VehicleZone(this.label, this.key);
}

/// Types de dommages
enum DamageType {
  scratch('Rayure', Icons.linear_scale, Colors.orange),
  dent('Bosse', Icons.circle, Colors.red),
  crack('Fissure', Icons.broken_image, Colors.purple),
  broken('Cassé', Icons.cancel, Colors.red),
  paint('Peinture', Icons.format_paint, Colors.blue),
  missing('Manquant', Icons.remove_circle, Colors.brown),
  other('Autre', Icons.more_horiz, Colors.grey);

  final String label;
  final IconData icon;
  final Color color;
  const DamageType(this.label, this.icon, this.color);
}

/// A single damage entry
class DamageEntry {
  final VehicleZone zone;
  final DamageType type;
  final String comment;

  DamageEntry({required this.zone, required this.type, this.comment = ''});

  Map<String, dynamic> toMap() => {
    'zone': zone.key,
    'zone_label': zone.label,
    'damage_type': type.name,
    'damage_label': type.label,
    'comment': comment,
  };
}

/// Vues du véhicule
enum _ViewType {
  top('Vue de dessus', Icons.crop_square),
  leftSide('Côté gauche', Icons.arrow_back),
  rightSide('Côté droit', Icons.arrow_forward),
  front('Vue avant', Icons.north),
  rear('Vue arrière', Icons.south);

  final String label;
  final IconData icon;
  const _ViewType(this.label, this.icon);
}

/// Interactive vehicle body map widget for marking damages — Multi-view
class VehicleBodyMapWidget extends StatefulWidget {
  final List<DamageEntry> damages;
  final ValueChanged<List<DamageEntry>> onDamagesChanged;
  final VehicleType vehicleType;

  const VehicleBodyMapWidget({
    super.key,
    required this.damages,
    required this.onDamagesChanged,
    this.vehicleType = VehicleType.berline,
  });

  @override
  State<VehicleBodyMapWidget> createState() => _VehicleBodyMapWidgetState();
}

class _VehicleBodyMapWidgetState extends State<VehicleBodyMapWidget> {
  late final PageController _pageController;
  _ViewType _currentView = _ViewType.top;
  VehicleZone? _selectedZone;

  static const _canvasWidth = 300.0;
  static const _canvasHeight = 420.0;

  @override
  void initState() {
    super.initState();
    _pageController = PageController(initialPage: _ViewType.values.indexOf(_ViewType.top));
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  void _animateToView(_ViewType view) {
    _pageController.animateToPage(
      _ViewType.values.indexOf(view),
      duration: const Duration(milliseconds: 600),
      curve: Curves.easeInOutCubicEmphasized,
    );
    setState(() => _currentView = view);
  }

  // ── Zone hit areas per view ──

  static final Map<_ViewType, Map<VehicleZone, Rect>> _viewZoneRects = {
    _ViewType.top: {
      VehicleZone.frontBumper:      const Rect.fromLTWH(90, 5, 120, 30),
      VehicleZone.frontLeftCorner:  const Rect.fromLTWH(40, 10, 50, 35),
      VehicleZone.frontRightCorner: const Rect.fromLTWH(210, 10, 50, 35),
      VehicleZone.leftHeadlight:    const Rect.fromLTWH(45, 35, 35, 25),
      VehicleZone.rightHeadlight:   const Rect.fromLTWH(220, 35, 35, 25),
      VehicleZone.windshield:       const Rect.fromLTWH(70, 50, 160, 40),
      VehicleZone.hood:             const Rect.fromLTWH(70, 90, 160, 45),
      VehicleZone.leftMirror:       const Rect.fromLTWH(22, 60, 20, 14),
      VehicleZone.rightMirror:      const Rect.fromLTWH(258, 60, 20, 14),
      VehicleZone.leftFrontFender:  const Rect.fromLTWH(30, 75, 40, 50),
      VehicleZone.rightFrontFender: const Rect.fromLTWH(230, 75, 40, 50),
      VehicleZone.leftFrontDoor:    const Rect.fromLTWH(30, 130, 40, 60),
      VehicleZone.rightFrontDoor:   const Rect.fromLTWH(230, 130, 40, 60),
      VehicleZone.roof:             const Rect.fromLTWH(70, 140, 160, 100),
      VehicleZone.leftRearDoor:     const Rect.fromLTWH(30, 195, 40, 60),
      VehicleZone.rightRearDoor:    const Rect.fromLTWH(230, 195, 40, 60),
      VehicleZone.leftRearFender:   const Rect.fromLTWH(30, 260, 40, 50),
      VehicleZone.rightRearFender:  const Rect.fromLTWH(230, 260, 40, 50),
      VehicleZone.trunk:            const Rect.fromLTWH(70, 285, 160, 45),
      VehicleZone.rearWindow:       const Rect.fromLTWH(70, 330, 160, 35),
      VehicleZone.rearLeftCorner:   const Rect.fromLTWH(40, 355, 50, 35),
      VehicleZone.rearRightCorner:  const Rect.fromLTWH(210, 355, 50, 35),
      VehicleZone.rearBumper:       const Rect.fromLTWH(90, 385, 120, 30),
      VehicleZone.leftTaillight:    const Rect.fromLTWH(45, 360, 35, 25),
      VehicleZone.rightTaillight:   const Rect.fromLTWH(220, 360, 35, 25),
    },
    _ViewType.leftSide: {
      VehicleZone.frontBumper:      const Rect.fromLTWH(5, 250, 35, 80),
      VehicleZone.leftHeadlight:    const Rect.fromLTWH(5, 215, 35, 40),
      VehicleZone.leftFrontFender:  const Rect.fromLTWH(40, 200, 55, 90),
      VehicleZone.leftFrontDoor:    const Rect.fromLTWH(95, 130, 55, 170),
      VehicleZone.leftRearDoor:     const Rect.fromLTWH(150, 130, 55, 170),
      VehicleZone.leftRearFender:   const Rect.fromLTWH(205, 200, 55, 90),
      VehicleZone.leftTaillight:    const Rect.fromLTWH(260, 215, 35, 40),
      VehicleZone.rearBumper:       const Rect.fromLTWH(260, 250, 35, 80),
      VehicleZone.leftMirror:       const Rect.fromLTWH(78, 140, 20, 30),
      VehicleZone.leftSill:         const Rect.fromLTWH(70, 305, 160, 25),
      VehicleZone.windshield:       const Rect.fromLTWH(80, 80, 50, 55),
      VehicleZone.rearWindow:       const Rect.fromLTWH(185, 80, 45, 55),
      VehicleZone.roof:             const Rect.fromLTWH(130, 60, 55, 40),
      VehicleZone.hood:             const Rect.fromLTWH(30, 180, 65, 25),
      VehicleZone.trunk:            const Rect.fromLTWH(225, 180, 40, 25),
    },
    _ViewType.rightSide: {
      VehicleZone.frontBumper:      const Rect.fromLTWH(260, 250, 35, 80),
      VehicleZone.rightHeadlight:   const Rect.fromLTWH(260, 215, 35, 40),
      VehicleZone.rightFrontFender: const Rect.fromLTWH(205, 200, 55, 90),
      VehicleZone.rightFrontDoor:   const Rect.fromLTWH(150, 130, 55, 170),
      VehicleZone.rightRearDoor:    const Rect.fromLTWH(95, 130, 55, 170),
      VehicleZone.rightRearFender:  const Rect.fromLTWH(40, 200, 55, 90),
      VehicleZone.rightTaillight:   const Rect.fromLTWH(5, 215, 35, 40),
      VehicleZone.rearBumper:       const Rect.fromLTWH(5, 250, 35, 80),
      VehicleZone.rightMirror:      const Rect.fromLTWH(202, 140, 20, 30),
      VehicleZone.rightSill:        const Rect.fromLTWH(70, 305, 160, 25),
      VehicleZone.windshield:       const Rect.fromLTWH(185, 80, 45, 55),
      VehicleZone.rearWindow:       const Rect.fromLTWH(80, 80, 50, 55),
      VehicleZone.roof:             const Rect.fromLTWH(130, 60, 55, 40),
      VehicleZone.hood:             const Rect.fromLTWH(225, 180, 40, 25),
      VehicleZone.trunk:            const Rect.fromLTWH(30, 180, 65, 25),
    },
    _ViewType.front: {
      VehicleZone.frontBumper:      const Rect.fromLTWH(60, 290, 180, 45),
      VehicleZone.hood:             const Rect.fromLTWH(70, 195, 160, 60),
      VehicleZone.windshield:       const Rect.fromLTWH(75, 85, 150, 105),
      VehicleZone.roof:             const Rect.fromLTWH(85, 20, 130, 60),
      VehicleZone.leftHeadlight:    const Rect.fromLTWH(30, 252, 55, 38),
      VehicleZone.rightHeadlight:   const Rect.fromLTWH(215, 252, 55, 38),
      VehicleZone.leftFrontFender:  const Rect.fromLTWH(25, 195, 50, 60),
      VehicleZone.rightFrontFender: const Rect.fromLTWH(225, 195, 50, 60),
      VehicleZone.leftMirror:       const Rect.fromLTWH(20, 130, 30, 40),
      VehicleZone.rightMirror:      const Rect.fromLTWH(250, 130, 30, 40),
      VehicleZone.frontLeftCorner:  const Rect.fromLTWH(30, 290, 35, 45),
      VehicleZone.frontRightCorner: const Rect.fromLTWH(235, 290, 35, 45),
    },
    _ViewType.rear: {
      VehicleZone.rearBumper:       const Rect.fromLTWH(60, 290, 180, 45),
      VehicleZone.trunk:            const Rect.fromLTWH(70, 195, 160, 60),
      VehicleZone.rearWindow:       const Rect.fromLTWH(75, 85, 150, 105),
      VehicleZone.roof:             const Rect.fromLTWH(85, 20, 130, 60),
      VehicleZone.leftTaillight:    const Rect.fromLTWH(30, 252, 55, 38),
      VehicleZone.rightTaillight:   const Rect.fromLTWH(215, 252, 55, 38),
      VehicleZone.leftRearFender:   const Rect.fromLTWH(25, 195, 50, 60),
      VehicleZone.rightRearFender:  const Rect.fromLTWH(225, 195, 50, 60),
      VehicleZone.rearLeftCorner:   const Rect.fromLTWH(30, 290, 35, 45),
      VehicleZone.rearRightCorner:  const Rect.fromLTWH(235, 290, 35, 45),
    },
  };

  bool _hasZoneDamage(VehicleZone zone) {
    return widget.damages.any((d) => d.zone == zone);
  }

  int _zoneDamageCount(VehicleZone zone) {
    return widget.damages.where((d) => d.zone == zone).length;
  }

  void _onZoneTap(VehicleZone zone) {
    setState(() => _selectedZone = zone);
    _showDamageDialog(zone);
  }

  void _showDamageDialog(VehicleZone zone) async {
    DamageType selectedType = DamageType.scratch;
    final commentController = TextEditingController();

    final result = await showDialog<DamageEntry>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Text(zone.label, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Type de dommage', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: DamageType.values.map((type) {
                    final isSelected = selectedType == type;
                    return GestureDetector(
                      onTap: () => setDialogState(() => selectedType = type),
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
                              fontSize: 11,
                            )),
                          ],
                        ),
                      ),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 16),
                const Text('Commentaire', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                const SizedBox(height: 8),
                TextField(
                  controller: commentController,
                  decoration: InputDecoration(
                    hintText: 'Décrivez le dommage...',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  maxLines: 2,
                ),
                // Existing damages for this zone
                if (widget.damages.where((d) => d.zone == zone).isNotEmpty) ...[
                  const SizedBox(height: 16),
                  const Divider(),
                  const SizedBox(height: 8),
                  const Text('Dommages existants', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.red)),
                  const SizedBox(height: 8),
                  ...widget.damages.where((d) => d.zone == zone).map((d) => Container(
                    margin: const EdgeInsets.only(bottom: 6),
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: d.type.color.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      children: [
                        Icon(d.type.icon, size: 16, color: d.type.color),
                        const SizedBox(width: 8),
                        Expanded(child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(d.type.label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: d.type.color)),
                            if (d.comment.isNotEmpty)
                              Text(d.comment, style: const TextStyle(fontSize: 11, color: Colors.grey)),
                          ],
                        )),
                        IconButton(
                          icon: const Icon(Icons.delete, size: 18, color: Colors.red),
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(maxWidth: 28, maxHeight: 28),
                          onPressed: () {
                            final updated = List<DamageEntry>.from(widget.damages)..remove(d);
                            widget.onDamagesChanged(updated);
                            Navigator.pop(ctx);
                          },
                        ),
                      ],
                    ),
                  )),
                ],
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Annuler')),
            ElevatedButton(
              onPressed: () => Navigator.pop(ctx, DamageEntry(
                zone: zone,
                type: selectedType,
                comment: commentController.text.trim(),
              )),
              style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
              child: const Text('Ajouter', style: TextStyle(color: Colors.white)),
            ),
          ],
        ),
      ),
    );

    commentController.dispose();
    setState(() => _selectedZone = null);

    if (result != null) {
      final updated = List<DamageEntry>.from(widget.damages)..add(result);
      widget.onDamagesChanged(updated);
    }
  }

  @override
  Widget build(BuildContext context) {
    final totalDamages = widget.damages.length;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: PremiumTheme.cardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: PremiumTheme.slate300),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            children: [
              Icon(Icons.directions_car, color: PremiumTheme.primaryBlue, size: 22),
              const SizedBox(width: 8),
              const Expanded(child: Text(
                'Carte des dommages',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              )),
              if (totalDamages > 0)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.red.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    '$totalDamages dommage${totalDamages > 1 ? 's' : ''}',
                    style: const TextStyle(color: Colors.red, fontSize: 12, fontWeight: FontWeight.w600),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            'Sélectionnez une vue, puis tapez sur une zone',
            style: TextStyle(color: PremiumTheme.textSecondary, fontSize: 12),
          ),
          const SizedBox(height: 12),

          // View selector tabs
          SizedBox(
            height: 36,
            child: ListView(
              scrollDirection: Axis.horizontal,
              children: _ViewType.values.map((view) {
                final isActive = _currentView == view;
                final viewZones = _viewZoneRects[view]?.keys.toSet() ?? {};
                final viewDamageCount = widget.damages.where((d) => viewZones.contains(d.zone)).length;

                return Padding(
                  padding: const EdgeInsets.only(right: 6),
                  child: GestureDetector(
                    onTap: () => _animateToView(view),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: isActive ? PremiumTheme.primaryBlue : PremiumTheme.cardBgLight,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: isActive ? PremiumTheme.primaryBlue : const Color(0xFFE5E7EB),
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(view.icon, size: 14,
                            color: isActive ? Colors.white : PremiumTheme.textSecondary),
                          const SizedBox(width: 4),
                          Text(view.label, style: TextStyle(
                            color: isActive ? Colors.white : PremiumTheme.textSecondary,
                            fontSize: 11,
                            fontWeight: isActive ? FontWeight.bold : FontWeight.w500,
                          )),
                          if (viewDamageCount > 0) ...[
                            const SizedBox(width: 4),
                            Container(
                              width: 16, height: 16,
                              decoration: BoxDecoration(
                                color: isActive ? Colors.white : Colors.red,
                                shape: BoxShape.circle,
                              ),
                              child: Center(child: Text(
                                viewDamageCount.toString(),
                                style: TextStyle(
                                  color: isActive ? PremiumTheme.primaryBlue : Colors.white,
                                  fontSize: 9, fontWeight: FontWeight.bold,
                                ),
                              )),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 12),

          // Vehicle map canvas (PageView for swipe animation)
          SizedBox(
            height: _canvasHeight + 20,
            child: PageView.builder(
              controller: _pageController,
              onPageChanged: (index) => setState(() => _currentView = _ViewType.values[index]),
              itemCount: _ViewType.values.length,
              itemBuilder: (context, index) {
                final view = _ViewType.values[index];
                
                return Center(
                  child: SizedBox(
                    width: _canvasWidth,
                    height: _canvasHeight,
                    child: LayoutBuilder(
                      builder: (context, constraints) {
                        final scaleX = constraints.maxWidth / _canvasWidth;
                        final scaleY = constraints.maxHeight / _canvasHeight;
                        final zones = _viewZoneRects[view] ?? {}; // Use zones for THIS view

                        return Stack(
                          children: [
                            // Vehicle outline
                            CustomPaint(
                              size: Size(constraints.maxWidth, constraints.maxHeight),
                              painter: _VehiclePainter(
                                viewType: view, // Pass THIS view
                                vehicleType: widget.vehicleType,
                              ),
                            ),
                            // Zone tap areas
                            ...zones.entries.map((entry) {
                              final zone = entry.key;
                              final rect = entry.value;
                              final hasDamage = _hasZoneDamage(zone);
                              final count = _zoneDamageCount(zone);
                              final isSelected = _selectedZone == zone;

                              return Positioned(
                                left: rect.left * scaleX,
                                top: rect.top * scaleY,
                                width: rect.width * scaleX,
                                height: rect.height * scaleY,
                                child: GestureDetector(
                                  onTap: () => _onZoneTap(zone),
                                  child: Container(
                                    decoration: BoxDecoration(
                                      color: hasDamage
                                          ? Colors.red.withValues(alpha: 0.25)
                                          : isSelected
                                              ? PremiumTheme.primaryBlue.withValues(alpha: 0.15)
                                              : Colors.transparent,
                                      borderRadius: BorderRadius.circular(4),
                                      border: Border.all(
                                        color: hasDamage
                                            ? Colors.red.withValues(alpha: 0.6)
                                            : isSelected
                                                ? PremiumTheme.primaryBlue
                                                : Colors.grey.withValues(alpha: 0.25),
                                        width: hasDamage ? 2 : 1,
                                      ),
                                    ),
                                    child: Center(
                                      child: hasDamage
                                          ? Container(
                                              width: 20, height: 20,
                                              decoration: const BoxDecoration(
                                                color: Colors.red, shape: BoxShape.circle,
                                              ),
                                              child: Center(child: Text(
                                                count.toString(),
                                                style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                                              )),
                                            )
                                          : Icon(Icons.add_circle_outline, size: 14,
                                              color: Colors.grey.withValues(alpha: 0.35)),
                                    ),
                                  ),
                                ),
                              );
                            }),
                          ],
                        );
                      },
                    ),
                  ),
                );
              },
            ),
          ),

          // Damage list
          if (widget.damages.isNotEmpty) ...[
            const SizedBox(height: 16),
            const Divider(),
            const SizedBox(height: 10),
            const Text('Liste des dommages', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            ...widget.damages.asMap().entries.map((entry) {
              final d = entry.value;
              return Container(
                margin: const EdgeInsets.only(bottom: 6),
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: d.type.color.withValues(alpha: 0.06),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: d.type.color.withValues(alpha: 0.2)),
                ),
                child: Row(
                  children: [
                    Icon(d.type.icon, size: 18, color: d.type.color),
                    const SizedBox(width: 10),
                    Expanded(child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('${d.zone.label} — ${d.type.label}',
                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                        if (d.comment.isNotEmpty)
                          Text(d.comment, style: TextStyle(
                            fontSize: 11, color: PremiumTheme.textSecondary,
                          ), maxLines: 2, overflow: TextOverflow.ellipsis),
                      ],
                    )),
                    IconButton(
                      icon: const Icon(Icons.close, size: 18, color: Colors.red),
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(maxWidth: 28, maxHeight: 28),
                      onPressed: () {
                        final updated = List<DamageEntry>.from(widget.damages)..removeAt(entry.key);
                        widget.onDamagesChanged(updated);
                      },
                    ),
                  ],
                ),
              );
            }),
          ],
        ],
      ),
    );
  }
}

// ═══════════════════════════════════════════════════
//  Custom painter — draws vehicle outline per view
// ═══════════════════════════════════════════════════

class _VehiclePainter extends CustomPainter {
  final _ViewType viewType;
  final VehicleType vehicleType;

  _VehiclePainter({required this.viewType, required this.vehicleType});

  @override
  void paint(Canvas canvas, Size size) {
    switch (viewType) {
      case _ViewType.top:
        _paintTopView(canvas, size);
        break;
      case _ViewType.leftSide:
        _paintSideView(canvas, size, isLeft: true);
        break;
      case _ViewType.rightSide:
        _paintSideView(canvas, size, isLeft: false);
        break;
      case _ViewType.front:
        _paintFrontRearView(canvas, size, isFront: true);
        break;
      case _ViewType.rear:
        _paintFrontRearView(canvas, size, isFront: false);
        break;
    }
  }

  // ── Top View ──
  void _paintTopView(Canvas canvas, Size size) {
    if (vehicleType == VehicleType.utilitaire) {
      _paintTopViewVan(canvas, size);
    } else if (vehicleType == VehicleType.camion) {
      _paintTopViewTruck(canvas, size);
    } else {
      _paintTopViewSedan(canvas, size); // Default Berline/SUV
    }
  }

  // ── Side View ──
  void _paintSideView(Canvas canvas, Size size, {required bool isLeft}) {
    if (vehicleType == VehicleType.utilitaire) {
      _paintSideViewVan(canvas, size, isLeft: isLeft);
    } else if (vehicleType == VehicleType.camion) {
      _paintSideViewTruck(canvas, size, isLeft: isLeft);
    } else {
      _paintSideViewSedan(canvas, size, isLeft: isLeft);
    }
  }

  // ── Front / Rear View ──
  void _paintFrontRearView(Canvas canvas, Size size, {required bool isFront}) {
    if (vehicleType == VehicleType.utilitaire) {
      _paintFrontRearViewVan(canvas, size, isFront: isFront);
    } else if (vehicleType == VehicleType.camion) {
      _paintFrontRearViewTruck(canvas, size, isFront: isFront);
    } else {
      _paintFrontRearViewSedan(canvas, size, isFront: isFront);
    }
  }

  // ══════════════════════════════════════════════════════════
  // BERLINE / SUV (Standard Car) - The Premium Glossy Sedan
  // ══════════════════════════════════════════════════════════

  void _paintTopViewSedan(Canvas canvas, Size size) {
    final sx = size.width / 300;
    final sy = size.height / 420;

    final stroke = Paint()
      ..color = const Color(0xFF94A3B8) // Slate 400
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5;

    // Gradient fill for body
    final bodyFill = Paint()
      ..shader = LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [const Color(0xFFF1F5F9), const Color(0xFFE2E8F0)], // Slate 100-200
      ).createShader(Rect.fromLTWH(0, 0, size.width, size.height))
      ..style = PaintingStyle.fill;

    final glassFill = Paint()
      ..color = const Color(0xFFE0F2FE).withValues(alpha: 0.8) // Sky 100
      ..style = PaintingStyle.fill;

    // Realistic Berline/Sedan Top Shape
    final body = Path()
      ..moveTo(90 * sx, 15 * sy) // Front center nose
      ..quadraticBezierTo(150 * sx, 5 * sy, 210 * sx, 15 * sy) // Front curve
      ..quadraticBezierTo(250 * sx, 30 * sy, 250 * sx, 90 * sy) // Front right corner to wheel wheel
      // Right side
      ..lineTo(255 * sx, 100 * sy) // Bump out for wheel
      ..lineTo(255 * sx, 300 * sy) // Side
      ..lineTo(250 * sx, 310 * sy) // Bump in for rear wheel
      // Rear right
      ..quadraticBezierTo(250 * sx, 380 * sy, 210 * sx, 395 * sy)
      // Rear center
      ..quadraticBezierTo(150 * sx, 405 * sy, 90 * sx, 395 * sy)
      // Rear left
      ..quadraticBezierTo(50 * sx, 380 * sy, 50 * sx, 310 * sy)
      // Left side
      ..lineTo(45 * sx, 300 * sy) // Bump in
      ..lineTo(45 * sx, 100 * sy) // Side
      ..lineTo(50 * sx, 90 * sy) // Bump out
      // Front left
      ..quadraticBezierTo(50 * sx, 30 * sy, 90 * sx, 15 * sy)
      ..close();

    // Shadow
    canvas.drawPath(
      body.shift(const Offset(0, 4)),
      Paint()..color = Colors.black.withValues(alpha: 0.05)..maskFilter = const MaskFilter.blur(BlurStyle.normal, 4),
    );

    canvas.drawPath(body, bodyFill);
    canvas.drawPath(body, stroke);

    // Windshield - curved
    final ws = Path()
      ..moveTo(80 * sx, 75 * sy)
      ..quadraticBezierTo(150 * sx, 65 * sy, 220 * sx, 75 * sy) // Top curve
      ..lineTo(230 * sx, 110 * sy) // Side
      ..quadraticBezierTo(150 * sx, 100 * sy, 70 * sx, 110 * sy) // Bottom curve
      ..close();
    canvas.drawPath(ws, glassFill);
    canvas.drawPath(ws, stroke);

    // Rear window
    final rw = Path()
      ..moveTo(75 * sx, 310 * sy)
      ..quadraticBezierTo(150 * sx, 305 * sy, 225 * sx, 310 * sy)
      ..lineTo(215 * sx, 345 * sy)
      ..quadraticBezierTo(150 * sx, 350 * sy, 85 * sx, 345 * sy)
      ..close();
    canvas.drawPath(rw, glassFill);
    canvas.drawPath(rw, stroke);

    // Roof definition
    final roof = Path()
      ..moveTo(70 * sx, 110 * sy)
      ..lineTo(230 * sx, 110 * sy)
      ..lineTo(225 * sx, 310 * sy)
      ..lineTo(75 * sx, 310 * sy)
      ..close();
    canvas.drawPath(roof, Paint()..color = Colors.white.withValues(alpha: 0.3)..style = PaintingStyle.fill); 
    // Just a highlight, no stroke

    // Hood lines
    final hoodStroke = Paint()..color = const Color(0xFFCBD5E1)..style = PaintingStyle.stroke..strokeWidth = 1;
    canvas.drawPath(Path()..moveTo(80 * sx, 75 * sy)..quadraticBezierTo(60 * sx, 40 * sy, 90 * sx, 15 * sy), hoodStroke);
    canvas.drawPath(Path()..moveTo(220 * sx, 75 * sy)..quadraticBezierTo(240 * sx, 40 * sy, 210 * sx, 15 * sy), hoodStroke);

    // Trunk lines
    canvas.drawPath(Path()..moveTo(85 * sx, 345 * sy)..lineTo(85 * sx, 395 * sy), hoodStroke);
    canvas.drawPath(Path()..moveTo(215 * sx, 345 * sy)..lineTo(215 * sx, 395 * sy), hoodStroke);

    // Side mirrors - aerodynamic
    final mirrorFill = Paint()..color = const Color(0xFFCBD5E1)..style = PaintingStyle.fill;
    // Left
    canvas.drawPath(Path()
      ..moveTo(50 * sx, 85 * sy)
      ..lineTo(20 * sx, 80 * sy)
      ..quadraticBezierTo(15 * sx, 90 * sy, 20 * sx, 100 * sy)
      ..lineTo(50 * sx, 95 * sy)
      ..close(), mirrorFill);
    canvas.drawPath(Path() // Right
      ..moveTo(250 * sx, 85 * sy)
      ..lineTo(280 * sx, 80 * sy)
      ..quadraticBezierTo(285 * sx, 90 * sy, 280 * sx, 100 * sy)
      ..lineTo(250 * sx, 95 * sy)
      ..close(), mirrorFill);

    // Headlights
    final lightColor = Colors.white.withValues(alpha: 0.6);
    canvas.drawPath(Path()..addOval(Rect.fromLTWH(55 * sx, 20 * sy, 30 * sx, 15 * sy)), Paint()..color = lightColor);
    canvas.drawPath(Path()..addOval(Rect.fromLTWH(215 * sx, 20 * sy, 30 * sx, 15 * sy)), Paint()..color = lightColor);
    
    // Taillights
    final tailColor = const Color(0xFFFECACA).withValues(alpha: 0.7); // Red 200
    canvas.drawPath(Path()..addOval(Rect.fromLTWH(55 * sx, 385 * sy, 30 * sx, 10 * sy)), Paint()..color = tailColor);
    canvas.drawPath(Path()..addOval(Rect.fromLTWH(215 * sx, 385 * sy, 30 * sx, 10 * sy)), Paint()..color = tailColor);

    // Labels
    _drawLabel(canvas, 'AVANT', 150 * sx, 0, size, 10 * sx);
    _drawLabel(canvas, 'ARRIÈRE', 150 * sx, 408 * sy, size, 10 * sx);
    _drawLabel(canvas, 'G', 12 * sx, 200 * sy, size, 10 * sx);
    _drawLabel(canvas, 'D', 285 * sx, 200 * sy, size, 10 * sx);
  }

  // ══════════════════════════════════════════════════════════
  // BERLINE / SUV Side & Front/Rear
  // ══════════════════════════════════════════════════════════

  void _paintSideViewSedan(Canvas canvas, Size size, {required bool isLeft}) {
    final sx = size.width / 300;
    final sy = size.height / 420;

    final stroke = Paint()
      ..color = const Color(0xFF94A3B8)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5;

    final bodyFill = Paint()
      ..shader = LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: [const Color(0xFFF1F5F9), const Color(0xFFE2E8F0)],
      ).createShader(Rect.fromLTWH(0, 0, size.width, size.height))
      ..style = PaintingStyle.fill;

    final glassFill = Paint()..color = const Color(0xFFE0F2FE).withValues(alpha: 0.8)..style = PaintingStyle.fill;

    // Side Profile Path
    final body = Path();
    // Start bottom front wheel well
    body.moveTo(55 * sx, 310 * sy); 
    // Front bumper up
    body.quadraticBezierTo(10 * sx, 310 * sy, 10 * sx, 280 * sy); // Bump curve
    body.lineTo(10 * sx, 240 * sy); // Front face
    body.quadraticBezierTo(20 * sx, 210 * sy, 50 * sx, 200 * sy); // Hood start
    body.lineTo(80 * sx, 190 * sy); // Hood line
    // Windshield
    body.lineTo(110 * sx, 130 * sy); // A-Pillar
    // Roof
    body.quadraticBezierTo(150 * sx, 115 * sy, 190 * sx, 130 * sy); // Roof curve
    // Rear window
    body.lineTo(240 * sx, 190 * sy); // C-Pillar
    // Trunk
    body.lineTo(270 * sx, 200 * sy); // Trunk flat
    body.quadraticBezierTo(290 * sx, 210 * sy, 290 * sx, 250 * sy); // Rear drop
    body.lineTo(290 * sx, 280 * sy); // Rear bumper
    // Bottom
    body.quadraticBezierTo(290 * sx, 310 * sy, 245 * sx, 310 * sy); // Rear bottom corner
    // Wheels and bottom line handled separately or hole
    body.lineTo(55 * sx, 310 * sy); 
    body.close();

    // Wheel Wells (Holes in body look better usually, or just painted over)
    // We will paint body then paint wheel wells on top for 2D look

    // Shadow
    canvas.drawPath(
      body.shift(const Offset(0, 4)),
      Paint()..color = Colors.black.withValues(alpha: 0.05)..maskFilter = const MaskFilter.blur(BlurStyle.normal, 4),
    );

    canvas.drawPath(body, bodyFill);
    canvas.drawPath(body, stroke);
    
    // Windows 
    final windows = Path();
    windows.moveTo(115 * sx, 135 * sy);
    windows.lineTo(185 * sx, 135 * sy); // Top
    windows.lineTo(235 * sx, 190 * sy); // Back
    windows.lineTo(85 * sx, 190 * sy); // Front
    windows.close();
    canvas.drawPath(windows, glassFill);
    canvas.drawPath(windows, stroke);
    
    // Door separation
    canvas.drawLine(Offset(150 * sx, 135 * sy), Offset(150 * sx, 310 * sy), stroke);

    // Wheels
    final wheelPaint = Paint()..color = const Color(0xFF334155)..style = PaintingStyle.fill; // Slate 700
    final rimPaint = Paint()..color = const Color(0xFF94A3B8)..style = PaintingStyle.stroke..strokeWidth = 4;
    
    // Front Wheel
    canvas.drawCircle(Offset(75 * sx, 310 * sy), 26 * sx, wheelPaint);
    canvas.drawCircle(Offset(75 * sx, 310 * sy), 16 * sx, rimPaint);
    
    // Rear Wheel
    canvas.drawCircle(Offset(225 * sx, 310 * sy), 26 * sx, wheelPaint);
    canvas.drawCircle(Offset(225 * sx, 310 * sy), 16 * sx, rimPaint);

    // Lights
    // Headlight
    canvas.drawPath(Path()..moveTo(10 * sx, 240 * sy)..lineTo(30 * sx, 240 * sy)..lineTo(25 * sx, 255 * sy)..lineTo(12 * sx, 255 * sy)..close(),
       Paint()..color = Colors.white.withValues(alpha: 0.5));
    // Taillight
    canvas.drawPath(Path()..moveTo(290 * sx, 240 * sy)..lineTo(270 * sx, 240 * sy)..lineTo(275 * sx, 255 * sy)..lineTo(288 * sx, 255 * sy)..close(),
       Paint()..color = Colors.red.withValues(alpha: 0.5));

    // Mirror — positioned near A-pillar
    canvas.drawOval(Rect.fromLTWH(95 * sx, 175 * sy, 20 * sx, 12 * sy), Paint()..color = const Color(0xFF64748B));
    
    // Labels
    _drawLabel(canvas, isLeft ? 'CÔTÉ GAUCHE' : 'CÔTÉ DROIT', 150 * sx, 380 * sy, size, 10 * sx);
    _drawLabel(canvas, 'AV', 30 * sx, 360 * sy, size, 9 * sx);
    _drawLabel(canvas, 'AR', 270 * sx, 360 * sy, size, 9 * sx);
  }

  void _paintFrontRearViewSedan(Canvas canvas, Size size, {required bool isFront}) {
    final sx = size.width / 300;
    final sy = size.height / 420;

    final stroke = Paint()
      ..color = const Color(0xFF94A3B8)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5;

    final bodyFill = Paint()
      ..shader = LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: [const Color(0xFFF1F5F9), const Color(0xFFE2E8F0)],
      ).createShader(Rect.fromLTWH(0, 0, size.width, size.height))
      ..style = PaintingStyle.fill;
      
   final glassFill = Paint()..color = const Color(0xFFE0F2FE).withValues(alpha: 0.8)..style = PaintingStyle.fill;

    // Boxy-ish shape for front/rear
    final body = Path()
      ..moveTo(50 * sx, 320 * sy) // Bottom left tire area
      ..lineTo(40 * sx, 280 * sy) // Bumper corner low
      ..lineTo(40 * sx, 200 * sy) // Side
      ..quadraticBezierTo(50 * sx, 120 * sy, 90 * sx, 90 * sy) // Roof curve up
      ..lineTo(210 * sx, 90 * sy) // Roof top
      ..quadraticBezierTo(250 * sx, 120 * sy, 260 * sx, 200 * sy) // Roof curve down
      ..lineTo(260 * sx, 280 * sy) // Side
      ..lineTo(250 * sx, 320 * sy) // Bottom right
      ..close();

    // Shadow
    canvas.drawPath(
      body.shift(const Offset(0, 4)),
      Paint()..color = Colors.black.withValues(alpha: 0.05)..maskFilter = const MaskFilter.blur(BlurStyle.normal, 4),
    );

    canvas.drawPath(body, bodyFill);
    canvas.drawPath(body, stroke);

    // Windshield
    final glass = Path()
      ..moveTo(70 * sx, 180 * sy)
      ..quadraticBezierTo(150 * sx, 170 * sy, 230 * sx, 180 * sy)
      ..lineTo(220 * sx, 100 * sy)
      ..quadraticBezierTo(150 * sx, 90 * sy, 80 * sx, 100 * sy)
      ..close();
    canvas.drawPath(glass, glassFill);
    canvas.drawPath(glass, stroke);
    
    if (isFront) {
        // Grille
        final grille = Path()..addRRect(RRect.fromRectAndRadius(Rect.fromLTWH(100 * sx, 250 * sy, 100 * sx, 30 * sy), Radius.circular(4)));
        canvas.drawPath(grille, Paint()..color = const Color(0xFF334155)..style = PaintingStyle.fill);
        
        // Headlights
        canvas.drawPath(Path()..addOval(Rect.fromLTWH(50 * sx, 240 * sy, 40 * sx, 30 * sy)), Paint()..color = Colors.white.withValues(alpha: 0.8));
        canvas.drawPath(Path()..addOval(Rect.fromLTWH(50 * sx, 240 * sy, 40 * sx, 30 * sy)), stroke);
        
        canvas.drawPath(Path()..addOval(Rect.fromLTWH(210 * sx, 240 * sy, 40 * sx, 30 * sy)), Paint()..color = Colors.white.withValues(alpha: 0.8));
        canvas.drawPath(Path()..addOval(Rect.fromLTWH(210 * sx, 240 * sy, 40 * sx, 30 * sy)), stroke);
    } else {
        // Trunk License Plate Area
        final plate = Path()..addRect(Rect.fromLTWH(110 * sx, 240 * sy, 80 * sx, 25 * sy));
        canvas.drawPath(plate, stroke);
        
        // Taillights
        canvas.drawPath(Path()..addOval(Rect.fromLTWH(50 * sx, 240 * sy, 40 * sx, 25 * sy)), Paint()..color = const Color(0xFFEF4444).withValues(alpha: 0.8));
        canvas.drawPath(Path()..addOval(Rect.fromLTWH(210 * sx, 240 * sy, 40 * sx, 25 * sy)), Paint()..color = const Color(0xFFEF4444).withValues(alpha: 0.8));
    }
    
    // Wheels (Front/Rear view shows tires at bottom)
    final tirePaint = Paint()..color = const Color(0xFF334155);
    canvas.drawRect(Rect.fromLTWH(45 * sx, 300 * sy, 25 * sx, 40 * sy), tirePaint);
    canvas.drawRect(Rect.fromLTWH(230 * sx, 300 * sy, 25 * sx, 40 * sy), tirePaint);

    // Mirrors
    canvas.drawOval(Rect.fromLTWH(20 * sx, 160 * sy, 30 * sx, 20 * sy), Paint()..color = const Color(0xFF94A3B8));
    canvas.drawOval(Rect.fromLTWH(250 * sx, 160 * sy, 30 * sx, 20 * sy), Paint()..color = const Color(0xFF94A3B8));

    // Labels
    _drawLabel(canvas, isFront ? 'VUE AVANT' : 'VUE ARRIÈRE', 150 * sx, 375 * sy, size, 10 * sx);
    _drawLabel(canvas, 'G', 20 * sx, 200 * sy, size, 10 * sx);
    _drawLabel(canvas, 'D', 280 * sx, 200 * sy, size, 10 * sx);
  }

  // ══════════════════════════════════════════════════════════
  // VAN / UTILITAIRE Painter (Renault Master / Sprinter)
  // ══════════════════════════════════════════════════════════

  void _paintTopViewVan(Canvas canvas, Size size) {
    final sx = size.width / 300;
    final sy = size.height / 420;
    
    final stroke = Paint()
      ..color = const Color(0xFF94A3B8)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5;

    final bodyFill = Paint()
      ..color = const Color(0xFFF8FAFC) // White Van
      ..style = PaintingStyle.fill;
      
    final glassFill = Paint()..color = const Color(0xFFE0F2FE).withValues(alpha: 0.8)..style = PaintingStyle.fill;

    // Boxy Shape
    final body = Path()
      ..moveTo(80 * sx, 30 * sy) // Front left
      ..quadraticBezierTo(150 * sx, 10 * sy, 220 * sx, 30 * sy) // Front nose
      ..lineTo(235 * sx, 45 * sy) // Front corner
      ..lineTo(235 * sx, 395 * sy) // Side right
      ..lineTo(65 * sx, 395 * sy) // Rear
      ..lineTo(65 * sx, 45 * sy) // Side left
      ..close();

    // Shadow
    canvas.drawPath(body.shift(const Offset(0, 4)), Paint()..color = Colors.black.withValues(alpha: 0.05)..maskFilter = const MaskFilter.blur(BlurStyle.normal, 4));

    canvas.drawPath(body, bodyFill);
    canvas.drawPath(body, stroke);

    // Windshield - Large & High
    final ws = Path()
      ..moveTo(70 * sx, 65 * sy)
      ..quadraticBezierTo(150 * sx, 55 * sy, 230 * sx, 65 * sy)
      ..lineTo(230 * sx, 95 * sy)
      ..quadraticBezierTo(150 * sx, 90 * sy, 70 * sx, 95 * sy)
      ..close();
    canvas.drawPath(ws, glassFill);
    canvas.drawPath(ws, stroke);

    // Roof Ribs (typical on vans)
    final ribPaint = Paint()..color = const Color(0xFFE2E8F0)..style = PaintingStyle.stroke..strokeWidth = 1;
    for (var i = 120; i < 380; i += 40) {
      canvas.drawLine(Offset(75 * sx, i.toDouble() * sy), Offset(225 * sx, i.toDouble() * sy), ribPaint);
    }
    
    // Rear Doors Line
    canvas.drawLine(Offset(150 * sx, 395 * sy), Offset(150 * sx, 380 * sy), stroke);

    // Mirrors - Large vertical mirrors
    final mirrorFill = Paint()..color = const Color(0xFF334155)..style = PaintingStyle.fill;
    canvas.drawRect(Rect.fromLTWH(45 * sx, 70 * sy, 15 * sx, 25 * sy), mirrorFill);
    canvas.drawRect(Rect.fromLTWH(240 * sx, 70 * sy, 15 * sx, 25 * sy), mirrorFill);

    // Labels
    _drawLabel(canvas, 'AVANT', 150 * sx, 0, size, 10 * sx);
    _drawLabel(canvas, 'ARRIÈRE', 150 * sx, 408 * sy, size, 10 * sx);
    _drawLabel(canvas, 'G', 20 * sx, 200 * sy, size, 10 * sx);
    _drawLabel(canvas, 'D', 280 * sx, 200 * sy, size, 10 * sx);
  }

  void _paintSideViewVan(Canvas canvas, Size size, {required bool isLeft}) {
    final sx = size.width / 300;
    final sy = size.height / 420;
    
    final stroke = Paint()..color = const Color(0xFF94A3B8)..style = PaintingStyle.stroke..strokeWidth = 1.5;
    final bodyFill = Paint()..color = const Color(0xFFF8FAFC)..style = PaintingStyle.fill;
    final glassFill = Paint()..color = const Color(0xFFE0F2FE).withValues(alpha: 0.8)..style = PaintingStyle.fill;
    
    // Tall Box Profile
    final body = Path()
      ..moveTo(40 * sx, 310 * sy) // Front wheel well front
      ..lineTo(20 * sx, 310 * sy) // Bumper bottom
      ..lineTo(20 * sx, 230 * sy) // Front face vertical
      ..lineTo(50 * sx, 170 * sy) // Hood slope
      ..lineTo(80 * sx, 120 * sy) // Windshield
      ..lineTo(290 * sx, 120 * sy) // Roof flat
      ..lineTo(290 * sx, 310 * sy) // Rear vertical
      ..lineTo(245 * sx, 310 * sy) // Rear bottom
      ..moveTo(205 * sx, 310 * sy) // Rear wheel well
      ..lineTo(80 * sx, 310 * sy)
      ..close(); // Needs wheel wells

     // Shadow
    canvas.drawPath(body.shift(const Offset(0, 4)), Paint()..color = Colors.black.withValues(alpha: 0.05)..maskFilter = const MaskFilter.blur(BlurStyle.normal, 4));

    canvas.drawPath(body, bodyFill);
    canvas.drawPath(body, stroke);
    
    // Side Window (Cab only typically)
    final cabWindow = Path()
      ..moveTo(85 * sx, 125 * sy)
      ..lineTo(140 * sx, 125 * sy)
      ..lineTo(140 * sx, 180 * sy)
      ..lineTo(85 * sx, 180 * sy)
      ..close();
    canvas.drawPath(cabWindow, glassFill);
    canvas.drawPath(cabWindow, stroke);

    // Sliding Door Guide
    canvas.drawLine(Offset(150 * sx, 200 * sy), Offset(270 * sx, 200 * sy), Paint()..color = const Color(0xFFCBD5E1)..strokeWidth=2);

    // Rub strips
    canvas.drawLine(Offset(20 * sx, 260 * sy), Offset(290 * sx, 260 * sy), Paint()..color = const Color(0xFF334155)..strokeWidth=3);

    // Wheels
    final wheelPaint = Paint()..color = const Color(0xFF334155)..style = PaintingStyle.fill;
    canvas.drawCircle(Offset(60 * sx, 310 * sy), 26 * sx, wheelPaint);
    canvas.drawCircle(Offset(225 * sx, 310 * sy), 26 * sx, wheelPaint);

    // Labels
    _drawLabel(canvas, isLeft ? 'CÔTÉ GAUCHE' : 'CÔTÉ DROIT', 150 * sx, 380 * sy, size, 10 * sx);
    _drawLabel(canvas, 'AV', 30 * sx, 360 * sy, size, 9 * sx);
    _drawLabel(canvas, 'AR', 270 * sx, 360 * sy, size, 9 * sx);
  }

  void _paintFrontRearViewVan(Canvas canvas, Size size, {required bool isFront}) {
    final sx = size.width / 300;
    final sy = size.height / 420;
    
    final stroke = Paint()..color = const Color(0xFF94A3B8)..style = PaintingStyle.stroke..strokeWidth = 1.5;
    final bodyFill = Paint()..color = const Color(0xFFF8FAFC)..style = PaintingStyle.fill;

    // Tall Rectangle
    final body = Path()
      ..addRRect(RRect.fromRectAndRadius(Rect.fromLTWH(50 * sx, 60 * sy, 200 * sx, 260 * sy), Radius.circular(8 * sx)));

    // Shadow
    canvas.drawPath(body.shift(const Offset(0, 4)), Paint()..color = Colors.black.withValues(alpha: 0.05)..maskFilter = const MaskFilter.blur(BlurStyle.normal, 4));

    canvas.drawPath(body, bodyFill);
    canvas.drawPath(body, stroke);
    
    if (isFront) {
      // Windshield
      canvas.drawRect(Rect.fromLTWH(60 * sx, 70 * sy, 180 * sx, 80 * sy), Paint()..color = const Color(0xFFE0F2FE).withValues(alpha: 0.8));
      
      // Grille
      canvas.drawRRect(RRect.fromRectAndRadius(Rect.fromLTWH(80 * sx, 220 * sy, 140 * sx, 40 * sy), Radius.circular(4)), Paint()..color = const Color(0xFF334155));
      
      // Headlights
      canvas.drawRect(Rect.fromLTWH(55 * sx, 200 * sy, 30 * sx, 40 * sy), Paint()..color=Colors.white.withValues(alpha: 0.8));
      canvas.drawRect(Rect.fromLTWH(215 * sx, 200 * sy, 30 * sx, 40 * sy), Paint()..color=Colors.white.withValues(alpha: 0.8));
      
      // Mirrors (Big ears)
      canvas.drawRect(Rect.fromLTWH(20 * sx, 120 * sy, 25 * sx, 60 * sy), Paint()..color = const Color(0xFF334155));
      canvas.drawRect(Rect.fromLTWH(255 * sx, 120 * sy, 25 * sx, 60 * sy), Paint()..color = const Color(0xFF334155));

    } else {
      // Rear Doors windows
      canvas.drawRect(Rect.fromLTWH(60 * sx, 80 * sy, 85 * sx, 100 * sy), Paint()..color = const Color(0xFFE0F2FE).withValues(alpha: 0.8));
      canvas.drawRect(Rect.fromLTWH(155 * sx, 80 * sy, 85 * sx, 100 * sy), Paint()..color = const Color(0xFFE0F2FE).withValues(alpha: 0.8));
      
      // Center line
      canvas.drawLine(Offset(150 * sx, 60 * sy), Offset(150 * sx, 320 * sy), stroke);
      
      // Taillights (Vertical)
      canvas.drawRect(Rect.fromLTWH(50 * sx, 200 * sy, 15 * sx, 60 * sy), Paint()..color=Colors.red.withValues(alpha: 0.8));
      canvas.drawRect(Rect.fromLTWH(235 * sx, 200 * sy, 15 * sx, 60 * sy), Paint()..color=Colors.red.withValues(alpha: 0.8));
    }
    
    // Tires
    canvas.drawRect(Rect.fromLTWH(55 * sx, 320 * sy, 30 * sx, 20 * sy), Paint()..color = const Color(0xFF334155));
    canvas.drawRect(Rect.fromLTWH(215 * sx, 320 * sy, 30 * sx, 20 * sy), Paint()..color = const Color(0xFF334155));
    
    // Labels
    _drawLabel(canvas, isFront ? 'VUE AVANT' : 'VUE ARRIÈRE', 150 * sx, 375 * sy, size, 10 * sx);
  }


  // ══════════════════════════════════════════════════════════
  // TRUCK / POIDS LOURD Painter (Box Truck)
  // ══════════════════════════════════════════════════════════

  void _paintTopViewTruck(Canvas canvas, Size size) {
    final sx = size.width / 300;
    final sy = size.height / 420;
    
    final stroke = Paint()..color = const Color(0xFF94A3B8)..style = PaintingStyle.stroke..strokeWidth = 1.5;
    final cabFill = Paint()..color = Colors.white..style = PaintingStyle.fill;
    final boxFill = Paint()..color = const Color(0xFFE2E8F0)..style = PaintingStyle.fill; // Grey box

    // CAB
    final cab = Path()..addRect(Rect.fromLTWH(60 * sx, 20 * sy, 180 * sx, 80 * sy));
    canvas.drawPath(cab, cabFill);
    canvas.drawPath(cab, stroke);

    // BOX (Cargo)
    final box = Path()..addRect(Rect.fromLTWH(40 * sx, 110 * sy, 220 * sx, 290 * sy));
    // Shadow
    canvas.drawPath(box.shift(const Offset(0, 4)), Paint()..color = Colors.black.withValues(alpha: 0.05)..maskFilter = const MaskFilter.blur(BlurStyle.normal, 4));

    canvas.drawPath(box, boxFill);
    canvas.drawPath(box, stroke);
    
    // Connection
    canvas.drawLine(Offset(150 * sx, 100 * sy), Offset(150 * sx, 110 * sy), stroke);

    // Labels
    _drawLabel(canvas, 'CABINE', 150 * sx, 50 * sy, size, 10 * sx);
    _drawLabel(canvas, 'CAISSE', 150 * sx, 250 * sy, size, 16 * sx);
  }

  void _paintSideViewTruck(Canvas canvas, Size size, {required bool isLeft}) {
    final sx = size.width / 300;
    final sy = size.height / 420;
    
    final stroke = Paint()..color = const Color(0xFF94A3B8)..style = PaintingStyle.stroke..strokeWidth = 1.5;
    final cabFill = Paint()..color = Colors.white..style = PaintingStyle.fill;
    final boxFill = Paint()..color = const Color(0xFFE2E8F0)..style = PaintingStyle.fill;

    // CAB (Front)
    final cab = Path()
      ..moveTo(20 * sx, 310 * sy) // Bumper
      ..lineTo(20 * sx, 150 * sy) // Face
      ..lineTo(80 * sx, 150 * sy) // Roof
      ..lineTo(80 * sx, 310 * sy) // Back of cab
      ..close();
    canvas.drawPath(cab, cabFill);
    canvas.drawPath(cab, stroke);
    
    // BOX (Cargo)
    final box = Path()..addRect(Rect.fromLTWH(95 * sx, 120 * sy, 195 * sx, 190 * sy));
    canvas.drawPath(box, boxFill);
    canvas.drawPath(box, stroke);
    
    // Wheels
    final wheelPaint = Paint()..color = const Color(0xFF334155)..style = PaintingStyle.fill;
    canvas.drawCircle(Offset(55 * sx, 310 * sy), 28 * sx, wheelPaint); // Front
    canvas.drawCircle(Offset(220 * sx, 310 * sy), 28 * sx, wheelPaint); // Rear 1
    canvas.drawCircle(Offset(260 * sx, 310 * sy), 28 * sx, wheelPaint); // Rear 2
    
    // Labels
    _drawLabel(canvas, isLeft ? 'CÔTÉ GAUCHE' : 'CÔTÉ DROIT', 150 * sx, 380 * sy, size, 10 * sx);
  }

  void _paintFrontRearViewTruck(Canvas canvas, Size size, {required bool isFront}) {
     final sx = size.width / 300;
    final sy = size.height / 420;
    final stroke = Paint()..color = const Color(0xFF94A3B8)..style = PaintingStyle.stroke..strokeWidth = 1.5;

    if (isFront) {
        // Cab Front Face - Tall and wide
        final cab = Rect.fromLTWH(50 * sx, 80 * sy, 200 * sx, 220 * sy);
        canvas.drawRect(cab, Paint()..color = Colors.white);
        canvas.drawRect(cab, stroke);
        
        // Windshield
        canvas.drawRect(Rect.fromLTWH(60 * sx, 90 * sy, 180 * sx, 80 * sy), Paint()..color = const Color(0xFFE0F2FE).withValues(alpha: 0.8));
        
        // Grille
        canvas.drawRect(Rect.fromLTWH(80 * sx, 200 * sy, 140 * sx, 60 * sy), Paint()..color = const Color(0xFF334155));

    } else {
        // Box Rear Face - Tall Square
        final box = Rect.fromLTWH(40 * sx, 60 * sy, 220 * sx, 240 * sy);
        canvas.drawRect(box, Paint()..color = const Color(0xFFE2E8F0));
        canvas.drawRect(box, stroke);
        
        // Roll-up door slats
        for(var i=60; i<300; i+=20) {
            canvas.drawLine(Offset(40 * sx, i.toDouble() * sy), Offset(260 * sx, i.toDouble() * sy), stroke);
        }
    }
    
    // Wheels
    final wheelPaint = Paint()..color = const Color(0xFF334155)..style = PaintingStyle.fill;
    canvas.drawRect(Rect.fromLTWH(40 * sx, 300 * sy, 40 * sx, 30 * sy), wheelPaint);
    canvas.drawRect(Rect.fromLTWH(220 * sx, 300 * sy, 40 * sx, 30 * sy), wheelPaint);
    
    // Labels
    _drawLabel(canvas, isFront ? 'VUE AVANT' : 'VUE ARRIERE', 150 * sx, 375 * sy, size, 10 * sx);
  }

  void _drawLabel(Canvas canvas, String text, double cx, double y, Size size, double fontSize) {
    final tp = TextPainter(
      text: TextSpan(
        text: text,
        style: TextStyle(color: const Color(0xFF64748B), fontSize: fontSize, fontWeight: FontWeight.w600), // Slate 500
      ),
      textDirection: TextDirection.ltr,
    );
    tp.layout();
    tp.paint(canvas, Offset(cx - tp.width / 2, y));
  }

  @override
  bool shouldRepaint(covariant _VehiclePainter old) =>
      old.viewType != viewType || old.vehicleType != vehicleType;
}
