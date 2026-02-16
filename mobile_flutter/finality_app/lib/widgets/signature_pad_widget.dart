import 'package:flutter/material.dart';
import '../../utils/error_helper.dart';
import 'dart:typed_data';
import 'dart:ui' as ui;
import 'package:flutter/rendering.dart';

class SignaturePadWidget extends StatefulWidget {
  final ValueChanged<Uint8List?> onSaved;
  final String title;

  const SignaturePadWidget({
    super.key,
    required this.onSaved,
    this.title = 'Signature',
  });

  @override
  State<SignaturePadWidget> createState() => _SignaturePadWidgetState();
}

class _SignaturePadWidgetState extends State<SignaturePadWidget> {
  final List<Offset?> _points = [];
  final GlobalKey _signatureKey = GlobalKey();

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          widget.title,
          style: Theme.of(context).textTheme.titleMedium,
        ),
        const SizedBox(height: 16),
        Container(
          width: double.infinity,
          height: 200,
          decoration: BoxDecoration(
            border: Border.all(
              color: Theme.of(context).colorScheme.outline,
              width: 2,
            ),
            borderRadius: BorderRadius.circular(8),
            color: Colors.white,
          ),
          child: RepaintBoundary(
            key: _signatureKey,
            child: GestureDetector(
              onPanUpdate: (details) {
                setState(() {
                  RenderBox? renderBox = _signatureKey.currentContext?.findRenderObject() as RenderBox?;
                  if (renderBox != null) {
                    _points.add(renderBox.globalToLocal(details.globalPosition));
                  }
                });
              },
              onPanEnd: (details) {
                setState(() {
                  _points.add(null);
                });
              },
              child: CustomPaint(
                painter: _SignaturePainter(_points),
                size: Size.infinite,
              ),
            ),
          ),
        ),
        const SizedBox(height: 16),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
          children: [
            OutlinedButton.icon(
              onPressed: _clear,
              icon: const Icon(Icons.clear),
              label: const Text('Effacer'),
            ),
            FilledButton.icon(
              onPressed: _save,
              icon: const Icon(Icons.check),
              label: const Text('Valider'),
            ),
          ],
        ),
      ],
    );
  }

  void _clear() {
    setState(() {
      _points.clear();
    });
  }

  Future<void> _save() async {
    if (_points.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Veuillez signer avant de valider')),
      );
      return;
    }

    try {
      final RenderRepaintBoundary boundary =
          _signatureKey.currentContext!.findRenderObject() as RenderRepaintBoundary;
      final ui.Image image = await boundary.toImage(pixelRatio: 3.0);
      final ByteData? byteData =
          await image.toByteData(format: ui.ImageByteFormat.png);
      final Uint8List? pngBytes = byteData?.buffer.asUint8List();

      // Appeler le callback qui fermera le dialog depuis le parent
      widget.onSaved(pngBytes);
      // NE PAS faire Navigator.pop ici car onSaved le fait déjà!
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(ErrorHelper.cleanError(e))),
      );
    }
  }
}

class _SignaturePainter extends CustomPainter {
  final List<Offset?> points;

  _SignaturePainter(this.points);

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.black
      ..strokeCap = StrokeCap.round
      ..strokeWidth = 3.0;

    for (int i = 0; i < points.length - 1; i++) {
      if (points[i] != null && points[i + 1] != null) {
        canvas.drawLine(points[i]!, points[i + 1]!, paint);
      }
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) {
    return true;
  }
}

// Widget helper pour ouvrir le dialogue de signature
class SignatureDialogHelper {
  static Future<Uint8List?> show(BuildContext context, {String title = 'Signature'}) {
    Uint8List? signatureBytes;

    return showDialog<Uint8List?>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: SizedBox(
          width: double.maxFinite,
          child: SignaturePadWidget(
            title: '',
            onSaved: (bytes) {
              signatureBytes = bytes;
            },
          ),
        ),
      ),
    ).then((_) => signatureBytes);
  }
}

/// Dialog moderne pour signature - Compatible Samsung Android
class SignaturePadDialog extends StatefulWidget {
  final String title;
  final String? subtitle;

  const SignaturePadDialog({
    super.key,
    required this.title,
    this.subtitle,
  });

  @override
  State<SignaturePadDialog> createState() => _SignaturePadDialogState();
}

class _SignaturePadDialogState extends State<SignaturePadDialog> {
  final List<Offset?> _points = [];
  final GlobalKey _signatureKey = GlobalKey();
  bool _isSaving = false;

  @override
  Widget build(BuildContext context) {
    // Responsive: utiliser MediaQuery pour adapter la taille
    final screenWidth = MediaQuery.of(context).size.width;
    final screenHeight = MediaQuery.of(context).size.height;
    final isSmallScreen = screenWidth < 360;
    
    return Dialog(
      backgroundColor: const Color(0xFF0F172A),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Container(
        constraints: BoxConstraints(
          maxWidth: screenWidth * 0.95,
          maxHeight: screenHeight * 0.75,
        ),
        padding: EdgeInsets.all(isSmallScreen ? 12 : 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Header
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        widget.title,
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: isSmallScreen ? 16 : 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      if (widget.subtitle != null && widget.subtitle!.isNotEmpty) ...[
                        const SizedBox(height: 4),
                        Text(
                          widget.subtitle!,
                          style: const TextStyle(
                            color: Colors.white70,
                            fontSize: 14,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close, color: Colors.white70),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
            SizedBox(height: isSmallScreen ? 12 : 16),
            
            // Zone de signature - RESPONSIVE
            Container(
              width: double.infinity,
              height: isSmallScreen ? 180 : 220,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFF14B8A6), width: 2),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(10),
                child: RepaintBoundary(
                  key: _signatureKey,
                  child: GestureDetector(
                    onPanUpdate: (details) {
                      if (!_isSaving) {
                        setState(() {
                          RenderBox? renderBox = _signatureKey.currentContext?.findRenderObject() as RenderBox?;
                          if (renderBox != null) {
                            _points.add(renderBox.globalToLocal(details.globalPosition));
                          }
                        });
                      }
                    },
                    onPanEnd: (details) {
                      if (!_isSaving) {
                        setState(() => _points.add(null));
                      }
                    },
                    child: CustomPaint(
                      painter: _SignaturePainter(_points),
                      size: Size.infinite,
                    ),
                  ),
                ),
              ),
            ),
            SizedBox(height: isSmallScreen ? 12 : 16),
            
            // Boutons
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _isSaving ? null : () {
                      setState(() => _points.clear());
                    },
                    icon: const Icon(Icons.clear, size: 18),
                    label: Text(isSmallScreen ? 'Effacer' : 'Effacer'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.white70,
                      side: const BorderSide(color: Colors.white30),
                      padding: EdgeInsets.symmetric(
                        vertical: isSmallScreen ? 10 : 12,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: _isSaving ? null : _save,
                    icon: _isSaving
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              valueColor: AlwaysStoppedAnimation(Colors.white),
                            ),
                          )
                        : const Icon(Icons.check, size: 18),
                    label: Text(_isSaving ? 'En cours...' : 'Valider'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF14B8A6),
                      foregroundColor: Colors.white,
                      padding: EdgeInsets.symmetric(
                        vertical: isSmallScreen ? 10 : 12,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _save() async {
    if (_points.isEmpty || _points.every((p) => p == null)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Veuillez signer avant de valider'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    setState(() => _isSaving = true);

    try {
      // Attendre un frame pour que le setState soit appliqué
      await Future.delayed(const Duration(milliseconds: 50));
      
      final RenderRepaintBoundary? boundary =
          _signatureKey.currentContext?.findRenderObject() as RenderRepaintBoundary?;
      
      if (boundary == null) {
        throw Exception('Impossible de capturer la signature');
      }

      final ui.Image image = await boundary.toImage(pixelRatio: 2.0);
      final ByteData? byteData = await image.toByteData(format: ui.ImageByteFormat.png);
      final Uint8List? pngBytes = byteData?.buffer.asUint8List();

      if (pngBytes == null || pngBytes.isEmpty) {
        throw Exception('Signature vide');
      }

      if (!mounted) return;
      Navigator.pop(context, pngBytes);
    } catch (e) {
      debugPrint('❌ Erreur signature: $e');
      if (!mounted) return;
      
      setState(() => _isSaving = false);
      
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(ErrorHelper.cleanError(e)),
          backgroundColor: Colors.red,
          duration: const Duration(seconds: 3),
        ),
      );
    }
  }
}
