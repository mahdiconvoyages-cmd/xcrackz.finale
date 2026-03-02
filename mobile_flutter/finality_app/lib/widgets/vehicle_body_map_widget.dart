import 'package:flutter/material.dart';
import '../../theme/premium_theme.dart';

/// Vehicle body zones for damage marking
enum VehicleZone {
  frontLeft('Avant gauche', 'front_left'),
  frontCenter('Pare-chocs avant', 'front_center'),
  frontRight('Avant droit', 'front_right'),
  leftFront('Aile avant gauche', 'left_front'),
  leftRear('Aile arrière gauche', 'left_rear'),
  rightFront('Aile avant droite', 'right_front'),
  rightRear('Aile arrière droite', 'right_rear'),
  rearLeft('Arrière gauche', 'rear_left'),
  rearCenter('Pare-chocs arrière', 'rear_center'),
  rearRight('Arrière droit', 'rear_right'),
  roof('Toit', 'roof'),
  hood('Capot', 'hood'),
  trunk('Coffre', 'trunk'),
  windshield('Pare-brise', 'windshield'),
  rearWindow('Lunette arrière', 'rear_window');

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

/// Interactive vehicle body map widget for marking damages
class VehicleBodyMapWidget extends StatefulWidget {
  final List<DamageEntry> damages;
  final ValueChanged<List<DamageEntry>> onDamagesChanged;

  const VehicleBodyMapWidget({
    super.key,
    required this.damages,
    required this.onDamagesChanged,
  });

  @override
  State<VehicleBodyMapWidget> createState() => _VehicleBodyMapWidgetState();
}

class _VehicleBodyMapWidgetState extends State<VehicleBodyMapWidget> {
  VehicleZone? _selectedZone;

  // Zone hit areas: Map<VehicleZone, Rect> relative to a 300x500 canvas
  static const _canvasWidth = 300.0;
  static const _canvasHeight = 500.0;

  static final Map<VehicleZone, Rect> _zoneRects = {
    VehicleZone.frontCenter:   const Rect.fromLTWH(90, 10, 120, 40),
    VehicleZone.frontLeft:     const Rect.fromLTWH(30, 20, 60, 50),
    VehicleZone.frontRight:    const Rect.fromLTWH(210, 20, 60, 50),
    VehicleZone.windshield:    const Rect.fromLTWH(70, 55, 160, 50),
    VehicleZone.hood:          const Rect.fromLTWH(70, 105, 160, 60),
    VehicleZone.leftFront:     const Rect.fromLTWH(20, 80, 50, 100),
    VehicleZone.rightFront:    const Rect.fromLTWH(230, 80, 50, 100),
    VehicleZone.roof:          const Rect.fromLTWH(70, 170, 160, 120),
    VehicleZone.leftRear:      const Rect.fromLTWH(20, 280, 50, 100),
    VehicleZone.rightRear:     const Rect.fromLTWH(230, 280, 50, 100),
    VehicleZone.trunk:         const Rect.fromLTWH(70, 340, 160, 60),
    VehicleZone.rearWindow:    const Rect.fromLTWH(70, 400, 160, 40),
    VehicleZone.rearLeft:      const Rect.fromLTWH(30, 430, 60, 50),
    VehicleZone.rearCenter:    const Rect.fromLTWH(90, 445, 120, 40),
    VehicleZone.rearRight:     const Rect.fromLTWH(210, 430, 60, 50),
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
          title: Text(zone.label, style: const TextStyle(fontSize: 16)),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Type de dommage', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: DamageType.values.map((type) {
                    final isSelected = selectedType == type;
                    return GestureDetector(
                      onTap: () => setDialogState(() => selectedType = type),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        decoration: BoxDecoration(
                          color: isSelected ? type.color.withValues(alpha: 0.2) : Colors.grey.shade100,
                          borderRadius: BorderRadius.circular(20),
                          border: isSelected ? Border.all(color: type.color, width: 2) : null,
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(type.icon, size: 16, color: isSelected ? type.color : Colors.grey),
                            const SizedBox(width: 4),
                            Text(
                              type.label,
                              style: TextStyle(
                                color: isSelected ? type.color : Colors.grey.shade700,
                                fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
                                fontSize: 12,
                              ),
                            ),
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

                // Show existing damages for this zone
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
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(d.type.label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: d.type.color)),
                              if (d.comment.isNotEmpty)
                                Text(d.comment, style: const TextStyle(fontSize: 11, color: Colors.grey)),
                            ],
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.delete, size: 18, color: Colors.red),
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(maxWidth: 28, maxHeight: 28),
                          onPressed: () {
                            final updated = List<DamageEntry>.from(widget.damages)
                              ..remove(d);
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
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Annuler'),
            ),
            ElevatedButton(
              onPressed: () {
                Navigator.pop(ctx, DamageEntry(
                  zone: zone,
                  type: selectedType,
                  comment: commentController.text.trim(),
                ));
              },
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
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: PremiumTheme.cardBackground,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: PremiumTheme.cardBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.directions_car, color: PremiumTheme.primaryBlue, size: 22),
              const SizedBox(width: 8),
              const Text(
                'Carte des dommages',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const Spacer(),
              if (widget.damages.isNotEmpty)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.red.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    '${widget.damages.length} dommage${widget.damages.length > 1 ? 's' : ''}',
                    style: const TextStyle(
                      color: Colors.red,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            'Tapez sur une zone du véhicule pour marquer un dommage',
            style: TextStyle(color: PremiumTheme.textSecondary, fontSize: 12),
          ),
          const SizedBox(height: 16),

          // Vehicle body map
          Center(
            child: SizedBox(
              width: _canvasWidth,
              height: _canvasHeight,
              child: LayoutBuilder(
                builder: (context, constraints) {
                  final scaleX = constraints.maxWidth / _canvasWidth;
                  final scaleY = constraints.maxHeight / _canvasHeight;

                  return Stack(
                    children: [
                      // Vehicle outline (custom paint)
                      CustomPaint(
                        size: Size(constraints.maxWidth, constraints.maxHeight),
                        painter: _VehicleOutlinePainter(),
                      ),

                      // Zone tap areas
                      ..._zoneRects.entries.map((entry) {
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
                                borderRadius: BorderRadius.circular(6),
                                border: Border.all(
                                  color: hasDamage
                                      ? Colors.red.withValues(alpha: 0.6)
                                      : isSelected
                                          ? PremiumTheme.primaryBlue
                                          : Colors.grey.withValues(alpha: 0.3),
                                  width: hasDamage ? 2 : 1,
                                ),
                              ),
                              child: Center(
                                child: hasDamage
                                    ? Container(
                                        width: 22,
                                        height: 22,
                                        decoration: const BoxDecoration(
                                          color: Colors.red,
                                          shape: BoxShape.circle,
                                        ),
                                        child: Center(
                                          child: Text(
                                            count.toString(),
                                            style: const TextStyle(
                                              color: Colors.white,
                                              fontSize: 11,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                        ),
                                      )
                                    : Icon(
                                        Icons.add_circle_outline,
                                        size: 16,
                                        color: Colors.grey.withValues(alpha: 0.4),
                                      ),
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
          ),

          // Damage list
          if (widget.damages.isNotEmpty) ...[
            const SizedBox(height: 20),
            const Divider(),
            const SizedBox(height: 12),
            const Text(
              'Liste des dommages',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 8),
            ...widget.damages.asMap().entries.map((entry) {
              final d = entry.value;
              return Container(
                margin: const EdgeInsets.only(bottom: 8),
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
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '${d.zone.label} — ${d.type.label}',
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          if (d.comment.isNotEmpty)
                            Text(
                              d.comment,
                              style: TextStyle(
                                fontSize: 11,
                                color: PremiumTheme.textSecondary,
                              ),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close, size: 18, color: Colors.red),
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(maxWidth: 28, maxHeight: 28),
                      onPressed: () {
                        final updated = List<DamageEntry>.from(widget.damages)
                          ..removeAt(entry.key);
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

/// Custom painter for vehicle outline (top-down view)
class _VehicleOutlinePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.grey.shade300
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2;

    final fillPaint = Paint()
      ..color = Colors.grey.shade50
      ..style = PaintingStyle.fill;

    final scaleX = size.width / 300;
    final scaleY = size.height / 500;

    // Vehicle body outline
    final bodyPath = Path();
    // Start from front center
    bodyPath.moveTo(80 * scaleX, 50 * scaleY);
    // Front curve
    bodyPath.quadraticBezierTo(150 * scaleX, 5 * scaleY, 220 * scaleX, 50 * scaleY);
    // Right side
    bodyPath.lineTo(250 * scaleX, 80 * scaleY);
    bodyPath.lineTo(260 * scaleX, 120 * scaleY);
    bodyPath.lineTo(260 * scaleX, 380 * scaleY);
    bodyPath.lineTo(250 * scaleX, 420 * scaleY);
    // Rear curve
    bodyPath.lineTo(220 * scaleX, 450 * scaleY);
    bodyPath.quadraticBezierTo(150 * scaleX, 490 * scaleY, 80 * scaleX, 450 * scaleY);
    // Left side
    bodyPath.lineTo(50 * scaleX, 420 * scaleY);
    bodyPath.lineTo(40 * scaleX, 380 * scaleY);
    bodyPath.lineTo(40 * scaleX, 120 * scaleY);
    bodyPath.lineTo(50 * scaleX, 80 * scaleY);
    bodyPath.close();

    canvas.drawPath(bodyPath, fillPaint);
    canvas.drawPath(bodyPath, paint);

    // Windshield
    final windshieldPath = Path();
    windshieldPath.moveTo(85 * scaleX, 65 * scaleY);
    windshieldPath.lineTo(215 * scaleX, 65 * scaleY);
    windshieldPath.lineTo(225 * scaleX, 105 * scaleY);
    windshieldPath.lineTo(75 * scaleX, 105 * scaleY);
    windshieldPath.close();
    canvas.drawPath(windshieldPath, Paint()
      ..color = Colors.blue.shade50
      ..style = PaintingStyle.fill);
    canvas.drawPath(windshieldPath, paint);

    // Rear window
    final rearWindowPath = Path();
    rearWindowPath.moveTo(85 * scaleX, 440 * scaleY);
    rearWindowPath.lineTo(215 * scaleX, 440 * scaleY);
    rearWindowPath.lineTo(225 * scaleX, 400 * scaleY);
    rearWindowPath.lineTo(75 * scaleX, 400 * scaleY);
    rearWindowPath.close();
    canvas.drawPath(rearWindowPath, Paint()
      ..color = Colors.blue.shade50
      ..style = PaintingStyle.fill);
    canvas.drawPath(rearWindowPath, paint);

    // Wheels (left front, right front, left rear, right rear)
    final wheelPaint = Paint()
      ..color = Colors.grey.shade400
      ..style = PaintingStyle.fill;
    // Left front wheel
    canvas.drawRRect(RRect.fromRectAndRadius(
      Rect.fromLTWH(25 * scaleX, 100 * scaleY, 18 * scaleX, 50 * scaleY),
      Radius.circular(6 * scaleX),
    ), wheelPaint);
    // Right front wheel
    canvas.drawRRect(RRect.fromRectAndRadius(
      Rect.fromLTWH(257 * scaleX, 100 * scaleY, 18 * scaleX, 50 * scaleY),
      Radius.circular(6 * scaleX),
    ), wheelPaint);
    // Left rear wheel
    canvas.drawRRect(RRect.fromRectAndRadius(
      Rect.fromLTWH(25 * scaleX, 340 * scaleY, 18 * scaleX, 50 * scaleY),
      Radius.circular(6 * scaleX),
    ), wheelPaint);
    // Right rear wheel
    canvas.drawRRect(RRect.fromRectAndRadius(
      Rect.fromLTWH(257 * scaleX, 340 * scaleY, 18 * scaleX, 50 * scaleY),
      Radius.circular(6 * scaleX),
    ), wheelPaint);

    // Side mirrors
    final mirrorPaint = Paint()
      ..color = Colors.grey.shade400
      ..style = PaintingStyle.fill;
    canvas.drawOval(Rect.fromLTWH(28 * scaleX, 72 * scaleY, 14 * scaleX, 10 * scaleY), mirrorPaint);
    canvas.drawOval(Rect.fromLTWH(258 * scaleX, 72 * scaleY, 14 * scaleX, 10 * scaleY), mirrorPaint);

    // Direction labels
    final textPainter = TextPainter(textDirection: TextDirection.ltr);
    
    // AVANT label
    textPainter.text = TextSpan(
      text: 'AVANT',
      style: TextStyle(color: Colors.grey.shade500, fontSize: 10 * scaleX, fontWeight: FontWeight.bold),
    );
    textPainter.layout();
    textPainter.paint(canvas, Offset((150 - textPainter.width / 2 / scaleX) * scaleX, 0));

    // ARRIÈRE label
    textPainter.text = TextSpan(
      text: 'ARRIÈRE',
      style: TextStyle(color: Colors.grey.shade500, fontSize: 10 * scaleX, fontWeight: FontWeight.bold),
    );
    textPainter.layout();
    textPainter.paint(canvas, Offset((150 - textPainter.width / 2 / scaleX) * scaleX, 488 * scaleY));
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
