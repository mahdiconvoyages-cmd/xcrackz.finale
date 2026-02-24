import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:permission_handler/permission_handler.dart';
import '../../theme/premium_theme.dart';

/// Barcode Scanner — PremiumTheme Light Design
class ScanBarcodeScreen extends StatefulWidget {
  const ScanBarcodeScreen({super.key});

  @override
  State<ScanBarcodeScreen> createState() => _ScanBarcodeScreenState();
}

class _ScanBarcodeScreenState extends State<ScanBarcodeScreen>
    with SingleTickerProviderStateMixin {
  final MobileScannerController _ctrl = MobileScannerController(
    detectionSpeed: DetectionSpeed.normal,
    facing: CameraFacing.back,
    formats: [
      BarcodeFormat.code128,
      BarcodeFormat.code39,
      BarcodeFormat.code93,
      BarcodeFormat.codabar,
      BarcodeFormat.ean13,
      BarcodeFormat.ean8,
      BarcodeFormat.upcA,
      BarcodeFormat.upcE,
    ],
  );
  bool _scanned = false;
  bool _torch = false;
  bool _cameraPermissionDenied = false;
  late AnimationController _anim;

  @override
  void initState() {
    super.initState();
    _anim = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat(reverse: true);
    _checkCameraPermission();
  }

  Future<void> _checkCameraPermission() async {
    final status = await Permission.camera.request();
    if (!mounted) return;
    if (status.isPermanentlyDenied) {
      setState(() => _cameraPermissionDenied = true);
    }
  }

  @override
  void dispose() {
    _anim.dispose();
    _ctrl.dispose();
    super.dispose();
  }

  void _onDetect(BarcodeCapture capture) {
    if (_scanned) return;
    final bc = capture.barcodes;
    if (bc.isEmpty || bc.first.rawValue == null) return;
    setState(() => _scanned = true);
    Navigator.pop(context, {
      'type': 'Barcode',
      'value': bc.first.rawValue,
      'format': bc.first.format.name,
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_cameraPermissionDenied) {
      return Scaffold(
        backgroundColor: Colors.black,
        body: SafeArea(
          child: Center(
            child: Padding(
              padding: const EdgeInsets.all(32),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.no_photography_rounded, color: Colors.white54, size: 64),
                  const SizedBox(height: 20),
                  const Text('Caméra non autorisée',
                      style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 12),
                  const Text('Activez la caméra dans Réglages > ChecksFleet > Caméra',
                      style: TextStyle(color: Colors.white60, fontSize: 14), textAlign: TextAlign.center),
                  const SizedBox(height: 24),
                  Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                    TextButton(onPressed: () => Navigator.pop(context),
                        child: const Text('Annuler', style: TextStyle(color: Colors.white54))),
                    const SizedBox(width: 16),
                    FilledButton(onPressed: () { openAppSettings(); },
                        child: const Text('Réglages')),
                  ]),
                ],
              ),
            ),
          ),
        ),
      );
    }
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          // Camera
          MobileScanner(controller: _ctrl, onDetect: _onDetect),

          // Overlay
          CustomPaint(
            size: Size.infinite,
            painter: _BarcodeOverlayPainter(_anim),
          ),

          // Top bar
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              child: Row(
                children: [
                  _circleBtn(Icons.arrow_back_rounded,
                      () => Navigator.pop(context)),
                  const Spacer(),
                  _circleBtn(
                    _torch
                        ? Icons.flash_off_rounded
                        : Icons.flash_on_rounded,
                    () {
                      _ctrl.toggleTorch();
                      setState(() => _torch = !_torch);
                    },
                  ),
                ],
              ),
            ),
          ),

          // Bottom info
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: Container(
              padding: EdgeInsets.fromLTRB(
                  24, 32, 24, MediaQuery.of(context).padding.bottom + 24),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.transparent,
                    Colors.black.withValues(alpha: .85)
                  ],
                ),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 20, vertical: 12),
                    decoration: BoxDecoration(
                      color: PremiumTheme.accentAmber.withValues(alpha: .15),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                          color:
                              PremiumTheme.accentAmber.withValues(alpha: .3)),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.barcode_reader,
                            color: PremiumTheme.accentAmber, size: 22),
                        SizedBox(width: 12),
                        Text(
                          'Alignez le code-barres dans la zone',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'EAN-13 / UPC / Code 128 / Code 39',
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: .5),
                      fontSize: 12,
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

  Widget _circleBtn(IconData icon, VoidCallback onTap) {
    return Material(
      color: Colors.black38,
      shape: const CircleBorder(),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(10),
          child: Icon(icon, color: Colors.white, size: 24),
        ),
      ),
    );
  }
}

// ── Animated Barcode Overlay ───────────────────────────────────
class _BarcodeOverlayPainter extends CustomPainter {
  final Animation<double> animation;
  _BarcodeOverlayPainter(this.animation) : super(repaint: animation);

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width * 0.82;
    final h = size.height * 0.14;
    final left = (size.width - w) / 2;
    final top = (size.height - h) / 2 - 30;
    final rect = Rect.fromLTWH(left, top, w, h);

    // Dim overlay
    canvas.drawPath(
      Path()
        ..addRect(Rect.fromLTWH(0, 0, size.width, size.height))
        ..addRRect(RRect.fromRectAndRadius(rect, const Radius.circular(14)))
        ..fillType = PathFillType.evenOdd,
      Paint()..color = Colors.black.withValues(alpha: .55),
    );

    // Border
    canvas.drawRRect(
      RRect.fromRectAndRadius(rect, const Radius.circular(14)),
      Paint()
        ..color = const Color(0xFFF59E0B).withValues(alpha: .5)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2,
    );

    // Corner highlights
    final cp = Paint()
      ..color = const Color(0xFFF59E0B)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 4
      ..strokeCap = StrokeCap.round;
    final cl = 24.0;

    // top-left
    canvas.drawLine(Offset(left, top + cl), Offset(left, top), cp);
    canvas.drawLine(Offset(left, top), Offset(left + cl, top), cp);
    // top-right
    canvas.drawLine(
        Offset(left + w - cl, top), Offset(left + w, top), cp);
    canvas.drawLine(
        Offset(left + w, top), Offset(left + w, top + cl), cp);
    // bottom-left
    canvas.drawLine(
        Offset(left, top + h - cl), Offset(left, top + h), cp);
    canvas.drawLine(
        Offset(left, top + h), Offset(left + cl, top + h), cp);
    // bottom-right
    canvas.drawLine(
        Offset(left + w - cl, top + h), Offset(left + w, top + h), cp);
    canvas.drawLine(
        Offset(left + w, top + h - cl), Offset(left + w, top + h), cp);

    // Animated scan line (horizontal sweep)
    final lineX = left + 10 + animation.value * (w - 20);
    canvas.drawLine(
      Offset(lineX, top + 6),
      Offset(lineX, top + h - 6),
      Paint()
        ..color = const Color(0xFFF59E0B).withValues(alpha: .8)
        ..strokeWidth = 2,
    );
  }

  @override
  bool shouldRepaint(covariant _BarcodeOverlayPainter old) => true;
}
