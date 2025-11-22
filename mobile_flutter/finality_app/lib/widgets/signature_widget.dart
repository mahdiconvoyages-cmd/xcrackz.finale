import 'package:flutter/material.dart';
import 'dart:ui' as ui;

class SignatureController extends ChangeNotifier {
  List<List<Offset?>> _paths = [];
  Color penColor;
  double penStrokeWidth;
  Color exportBackgroundColor;

  SignatureController({
    this.penColor = Colors.black,
    this.penStrokeWidth = 3.0,
    this.exportBackgroundColor = Colors.white,
  });

  List<List<Offset?>> get paths => _paths;

  bool get isEmpty => _paths.isEmpty || _paths.every((path) => path.isEmpty);
  bool get isNotEmpty => !isEmpty;

  void addPoint(Offset? point) {
    if (_paths.isEmpty) {
      _paths.add([]);
    }
    _paths.last.add(point);
    notifyListeners();
  }

  void startNewPath() {
    _paths.add([]);
  }

  void clear() {
    _paths = [];
    notifyListeners();
  }

  Future<ui.Image?> toImage() async {
    if (isEmpty) return null;

    final recorder = ui.PictureRecorder();
    final canvas = Canvas(recorder);
    final paint = Paint()
      ..color = penColor
      ..strokeCap = StrokeCap.round
      ..strokeWidth = penStrokeWidth;

    // Draw background
    canvas.drawRect(
      const Rect.fromLTWH(0, 0, 400, 200),
      Paint()..color = exportBackgroundColor,
    );

    // Draw paths
    for (var path in _paths) {
      for (int i = 0; i < path.length - 1; i++) {
        if (path[i] != null && path[i + 1] != null) {
          canvas.drawLine(path[i]!, path[i + 1]!, paint);
        }
      }
    }

    final picture = recorder.endRecording();
    return await picture.toImage(400, 200);
  }
}

class SignaturePainter extends CustomPainter {
  final SignatureController controller;

  SignaturePainter(this.controller) : super(repaint: controller);

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = controller.penColor
      ..strokeCap = StrokeCap.round
      ..strokeWidth = controller.penStrokeWidth;

    for (var path in controller.paths) {
      for (int i = 0; i < path.length - 1; i++) {
        if (path[i] != null && path[i + 1] != null) {
          canvas.drawLine(path[i]!, path[i + 1]!, paint);
        }
      }
    }
  }

  @override
  bool shouldRepaint(covariant SignaturePainter oldDelegate) => true;
}

class Signature extends StatefulWidget {
  final SignatureController controller;
  final Color backgroundColor;

  const Signature({
    super.key,
    required this.controller,
    this.backgroundColor = Colors.white,
  });

  @override
  State<Signature> createState() => _SignatureState();
}

class _SignatureState extends State<Signature> {
  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onPanStart: (details) {
        widget.controller.startNewPath();
        widget.controller.addPoint(details.localPosition);
      },
      onPanUpdate: (details) {
        widget.controller.addPoint(details.localPosition);
      },
      onPanEnd: (details) {
        widget.controller.addPoint(null);
      },
      child: Container(
        color: widget.backgroundColor,
        child: CustomPaint(
          painter: SignaturePainter(widget.controller),
          size: Size.infinite,
        ),
      ),
    );
  }
}
