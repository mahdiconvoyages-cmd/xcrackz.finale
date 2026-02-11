import 'dart:math';
import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../../theme/premium_theme.dart';

/// QR Code Scanner — PremiumTheme Light Design
class ScanQRScreen extends StatefulWidget {
  const ScanQRScreen({super.key});

  @override
  State<ScanQRScreen> createState() => _ScanQRScreenState();
}

class _ScanQRScreenState extends State<ScanQRScreen>
    with SingleTickerProviderStateMixin {
  final MobileScannerController _ctrl = MobileScannerController(
    detectionSpeed: DetectionSpeed.normal,
    facing: CameraFacing.back,
  );
  bool _scanned = false;
  bool _torch = false;
  late AnimationController _anim;

  @override
  void initState() {
    super.initState();
    _anim = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat(reverse: true);
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
      'type': 'QR',
      'value': bc.first.rawValue,
      'format': bc.first.format.name,
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          // Camera
          MobileScanner(controller: _ctrl, onDetect: _onDetect),

          // Overlay
          CustomPaint(
            size: Size.infinite,
            painter: _QROverlayPainter(_anim),
          ),

          // Top bar
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              child: Row(
                children: [
                  _circleBtn(Icons.arrow_back_rounded, () => Navigator.pop(context)),
                  const Spacer(),
                  _circleBtn(
                    _torch ? Icons.flash_off_rounded : Icons.flash_on_rounded,
                    () {
                      _ctrl.toggleTorch();
                      setState(() => _torch = !_torch);
                    },
                  ),
                  const SizedBox(width: 8),
                  _circleBtn(Icons.flip_camera_ios_rounded, () => _ctrl.switchCamera()),
                ],
              ),
            ),
          ),

          // Bottom instruction
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: Container(
              padding: EdgeInsets.fromLTRB(
                  24, 28, 24, MediaQuery.of(context).padding.bottom + 24),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [Colors.transparent, Colors.black.withValues(alpha: .85)],
                ),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                    decoration: BoxDecoration(
                      color: PremiumTheme.primaryTeal.withValues(alpha: .15),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: PremiumTheme.primaryTeal.withValues(alpha: .3)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.qr_code_scanner_rounded,
                            color: PremiumTheme.primaryTeal, size: 22),
                        const SizedBox(width: 12),
                        const Text(
                          'Placez le QR code dans le cadre',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
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

// ── Animated QR Overlay ────────────────────────────────────────
class _QROverlayPainter extends CustomPainter {
  final Animation<double> animation;
  _QROverlayPainter(this.animation) : super(repaint: animation);

  @override
  void paint(Canvas canvas, Size size) {
    final side = size.width * 0.68;
    final left = (size.width - side) / 2;
    final top = (size.height - side) / 2 - 40;
    final rect = Rect.fromLTWH(left, top, side, side);

    // Dim overlay
    canvas.drawPath(
      Path()
        ..addRect(Rect.fromLTWH(0, 0, size.width, size.height))
        ..addRRect(RRect.fromRectAndRadius(rect, const Radius.circular(20)))
        ..fillType = PathFillType.evenOdd,
      Paint()..color = Colors.black.withValues(alpha: .55),
    );

    // Corner brackets
    final cornerLen = 32.0;
    final r = 8.0;
    final p = Paint()
      ..color = const Color(0xFF14B8A6)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 4
      ..strokeCap = StrokeCap.round;

    // top-left
    canvas.drawPath(
      Path()
        ..moveTo(left, top + cornerLen)
        ..lineTo(left, top + r)
        ..arcToPoint(Offset(left + r, top), radius: Radius.circular(r))
        ..lineTo(left + cornerLen, top),
      p,
    );
    // top-right
    canvas.drawPath(
      Path()
        ..moveTo(left + side - cornerLen, top)
        ..lineTo(left + side - r, top)
        ..arcToPoint(Offset(left + side, top + r), radius: Radius.circular(r))
        ..lineTo(left + side, top + cornerLen),
      p,
    );
    // bottom-left
    canvas.drawPath(
      Path()
        ..moveTo(left, top + side - cornerLen)
        ..lineTo(left, top + side - r)
        ..arcToPoint(Offset(left + r, top + side), radius: Radius.circular(r))
        ..lineTo(left + cornerLen, top + side),
      p,
    );
    // bottom-right
    canvas.drawPath(
      Path()
        ..moveTo(left + side - cornerLen, top + side)
        ..lineTo(left + side - r, top + side)
        ..arcToPoint(Offset(left + side, top + side - r), radius: Radius.circular(r))
        ..lineTo(left + side, top + side - cornerLen),
      p,
    );

    // Animated scan line
    final lineY = top + animation.value * side;
    final gradient = LinearGradient(
      colors: [
        Colors.transparent,
        const Color(0xFF14B8A6).withValues(alpha: .7),
        Colors.transparent,
      ],
    );
    canvas.drawLine(
      Offset(left + 12, lineY),
      Offset(left + side - 12, lineY),
      Paint()
        ..shader = gradient.createShader(Rect.fromLTWH(left, lineY, side, 1))
        ..strokeWidth = 2.5,
    );
  }

  @override
  bool shouldRepaint(covariant _QROverlayPainter old) => true;
}
