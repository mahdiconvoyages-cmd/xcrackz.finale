import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:cunning_document_scanner/cunning_document_scanner.dart';
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as path;
import 'package:image/image.dart' as img;
import 'package:google_mlkit_text_recognition/google_mlkit_text_recognition.dart';

/// Professional document scanner matching web design
/// Uses Dynamsoft-like interface with teal accents (#14B8A6)
class DocumentScannerScreen extends StatefulWidget {
  final String? inspectionId;
  final Function(String documentPath, String? extractedText)? onDocumentScanned;

  const DocumentScannerScreen({
    super.key,
    this.inspectionId,
    this.onDocumentScanned,
  });

  @override
  State<DocumentScannerScreen> createState() => _DocumentScannerScreenState();
}

class _DocumentScannerScreenState extends State<DocumentScannerScreen> {
  List<String> _scannedImagePaths = [];
  int _currentImageIndex = 0;
  String? _extractedText;
  bool _isProcessing = false;
  bool _isEnhancing = false;
  bool _isExtractingText = false;
  bool _hasStartedScan = false;

  @override
  void initState() {
    super.initState();
    // Ne pas démarrer automatiquement - attendre que l'utilisateur clique
  }

  /// Start the document scanner
  Future<void> _startScanning() async {
    setState(() => _isProcessing = true);

    try {
      final pictures = await CunningDocumentScanner.getPictures(
        noOfPages: 1,
      );

      if (pictures != null && pictures.isNotEmpty && mounted) {
        setState(() {
          _scannedImagePaths = pictures;
          _currentImageIndex = 0;
          _isProcessing = false;
        });
      } else {
        if (mounted) {
          Navigator.of(context).pop();
        }
      }
    } catch (e) {
      debugPrint('Scanning error: $e');
      if (mounted) {
        setState(() => _isProcessing = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erreur lors du scan: $e'),
            backgroundColor: const Color(0xFFEF4444),
          ),
        );
        Navigator.of(context).pop();
      }
    }
  }

  /// Enhance the scanned image (brightness, contrast, sharpness)
  Future<void> _enhanceImage() async {
    if (_scannedImagePaths.isEmpty) return;

    setState(() => _isEnhancing = true);

    try {
      final file = File(_scannedImagePaths[_currentImageIndex]);
      final bytes = await file.readAsBytes();
      final image = img.decodeImage(bytes);

      if (image == null) {
        throw Exception('Failed to decode image');
      }

      // Apply enhancements
      var enhanced = image;
      
      // Augmenter légèrement le contraste et la luminosité
      enhanced = img.adjustColor(
        enhanced,
        contrast: 1.15,  // Légère augmentation (au lieu de 1.3)
        brightness: 1.05, // Légère augmentation (au lieu de 1.1)
        saturation: 1.0,  // Garder saturation normale
      );

      // Sharpen
      enhanced = img.convolution(
        enhanced,
        filter: [
          0, -1, 0,
          -1, 5, -1,
          0, -1, 0,
        ],
      );

      // Save enhanced image
      final directory = await getApplicationDocumentsDirectory();
      final enhancedPath = path.join(
        directory.path,
        'enhanced_doc_${DateTime.now().millisecondsSinceEpoch}.jpg',
      );
      
      final enhancedFile = File(enhancedPath);
      await enhancedFile.writeAsBytes(img.encodeJpg(enhanced, quality: 95));

      setState(() {
        _scannedImagePaths[_currentImageIndex] = enhancedPath;
        _isEnhancing = false;
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Image améliorée avec succès'),
            backgroundColor: Color(0xFF14B8A6), // Teal
            duration: Duration(seconds: 2),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (e) {
      debugPrint('Enhancement error: $e');
      setState(() => _isEnhancing = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erreur amélioration: $e'),
            backgroundColor: const Color(0xFFEF4444),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  /// Apply black & white filter for better readability
  Future<void> _applyBlackWhiteFilter() async {
    if (_scannedImagePaths.isEmpty) return;

    setState(() => _isEnhancing = true);

    try {
      final file = File(_scannedImagePaths[_currentImageIndex]);
      final bytes = await file.readAsBytes();
      final image = img.decodeImage(bytes);

      if (image == null) {
        throw Exception('Failed to decode image');
      }

      // Convert to grayscale then apply threshold
      var processed = img.grayscale(image);
      
      // Appliquer un léger contraste pour N&B lisible
      processed = img.adjustColor(
        processed,
        contrast: 1.3,    // Contraste modéré (au lieu de 1.5)
        brightness: 1.1,  // Luminosité modérée (au lieu de 1.2)
      );

      // Save processed image
      final directory = await getApplicationDocumentsDirectory();
      final processedPath = path.join(
        directory.path,
        'bw_doc_${DateTime.now().millisecondsSinceEpoch}.jpg',
      );
      
      final processedFile = File(processedPath);
      await processedFile.writeAsBytes(img.encodeJpg(processed, quality: 95));

      setState(() {
        _scannedImagePaths[_currentImageIndex] = processedPath;
        _isEnhancing = false;
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Filtre noir & blanc appliqué'),
            backgroundColor: Color(0xFF14B8A6),
            duration: Duration(seconds: 2),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (e) {
      debugPrint('B&W filter error: $e');
      setState(() => _isEnhancing = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erreur filtre: $e'),
            backgroundColor: const Color(0xFFEF4444),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  /// Extract text from the scanned document using ML Kit OCR
  Future<void> _extractText() async {
    if (_scannedImagePaths.isEmpty) return;

    setState(() => _isExtractingText = true);

    try {
      final inputImage = InputImage.fromFilePath(_scannedImagePaths[_currentImageIndex]);
      final textRecognizer = TextRecognizer(script: TextRecognitionScript.latin);

      final RecognizedText recognizedText = await textRecognizer.processImage(inputImage);
      
      await textRecognizer.close();

      setState(() {
        _extractedText = recognizedText.text;
        _isExtractingText = false;
      });

      if (mounted) {
        if (_extractedText != null && _extractedText!.isNotEmpty) {
          _showTextDialog();
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Aucun texte détecté dans le document'),
              backgroundColor: Color(0xFFF59E0B), // orange
              behavior: SnackBarBehavior.floating,
            ),
          );
        }
      }
    } catch (e) {
      debugPrint('OCR error: $e');
      setState(() => _isExtractingText = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erreur OCR: $e'),
            backgroundColor: const Color(0xFFEF4444), // red
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  /// Show extracted text in a dialog - Web style
  void _showTextDialog() {
    showDialog(
      context: context,
      builder: (context) => Dialog(
        backgroundColor: const Color(0xFF374151), // gray-700
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Texte extrait',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 16),
              Container(
                constraints: const BoxConstraints(maxHeight: 400),
                child: SingleChildScrollView(
                  child: SelectableText(
                    _extractedText ?? '',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 14,
                      height: 1.5,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 24),
              Align(
                alignment: Alignment.centerRight,
                child: TextButton(
                  onPressed: () => Navigator.of(context).pop(),
                  style: TextButton.styleFrom(
                    foregroundColor: const Color(0xFF14B8A6),
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                  ),
                  child: const Text(
                    'FERMER',
                    style: TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 14,
                      letterSpacing: 0.5,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// Save and return the scanned document
  void _saveDocument() {
    if (_scannedImagePaths.isNotEmpty && widget.onDocumentScanned != null) {
      widget.onDocumentScanned!(_scannedImagePaths[_currentImageIndex], _extractedText);
    }
    Navigator.of(context).pop(_scannedImagePaths.isNotEmpty ? _scannedImagePaths[_currentImageIndex] : null);
  }

  /// Rescan the document
  void _rescan() {
    setState(() {
      _scannedImagePaths.clear();
      _extractedText = null;
      _currentImageIndex = 0;
    });
    _startScanning();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: const Color(0xFF111827), // gray-900
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.close, color: Colors.white, size: 28),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Row(
          children: [
            Container(
              width: 28,
              height: 28,
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(6),
              ),
              child: SvgPicture.asset(
                'assets/images/logo.svg',
                fit: BoxFit.contain,
              ),
            ),
            const SizedBox(width: 12),
            const Icon(Icons.document_scanner, color: Colors.white, size: 20),
            const SizedBox(width: 8),
            const Text(
              'Scanner un document',
              style: TextStyle(
                color: Colors.white,
                fontSize: 16,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
      body: _isProcessing
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const SizedBox(
                    width: 48,
                    height: 48,
                    child: CircularProgressIndicator(
                      valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF14B8A6)),
                      strokeWidth: 3,
                    ),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'Traitement en cours...',
                    style: TextStyle(color: Colors.white, fontSize: 14),
                  ),
                ],
              ),
            )
          : _scannedImagePaths.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(
                        Icons.document_scanner_outlined,
                        size: 80,
                        color: Colors.white24,
                      ),
                      const SizedBox(height: 24),
                      const Text(
                        'Prêt à scanner',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 20,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'Appuyez sur le bouton ci-dessous pour commencer',
                        style: TextStyle(color: Colors.white70, fontSize: 14),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 32),
                      ElevatedButton.icon(
                        onPressed: () {
                          setState(() => _hasStartedScan = true);
                          _startScanning();
                        },
                        icon: const Icon(Icons.camera_alt, size: 24),
                        label: const Text(
                          'Démarrer le scan',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF14B8A6),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                          elevation: 0,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                      ),
                    ],
                  ),
                )
              : Column(
                  children: [
                    // Image preview
                    Expanded(
                      child: Container(
                        color: Colors.black,
                        child: Center(
                          child: Image.file(
                            File(_scannedImagePaths[_currentImageIndex]),
                            fit: BoxFit.contain,
                          ),
                        ),
                      ),
                    ),

                    // Action buttons - Web style
                    Container(
                      padding: const EdgeInsets.all(24),
                      decoration: const BoxDecoration(
                        color: Color(0xFF111827), // gray-900
                      ),
                      child: Column(
                        children: [
                          // Enhancement buttons row
                          Row(
                            children: [
                              Expanded(
                                child: OutlinedButton.icon(
                                  onPressed: _isEnhancing ? null : _enhanceImage,
                                  icon: _isEnhancing
                                      ? const SizedBox(
                                          width: 16,
                                          height: 16,
                                          child: CircularProgressIndicator(
                                            strokeWidth: 2,
                                            valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF14B8A6)),
                                          ),
                                        )
                                      : const Icon(Icons.auto_fix_high, size: 18),
                                  label: const Text(
                                    'Améliorer',
                                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                                  ),
                                  style: OutlinedButton.styleFrom(
                                    foregroundColor: Colors.white,
                                    side: const BorderSide(color: Color(0xFF14B8A6), width: 1.5),
                                    padding: const EdgeInsets.symmetric(vertical: 14),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: OutlinedButton.icon(
                                  onPressed: _isEnhancing ? null : _applyBlackWhiteFilter,
                                  icon: const Icon(Icons.filter_b_and_w, size: 18),
                                  label: const Text(
                                    'N&B',
                                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                                  ),
                                  style: OutlinedButton.styleFrom(
                                    foregroundColor: Colors.white,
                                    side: const BorderSide(color: Color(0xFF14B8A6), width: 1.5),
                                    padding: const EdgeInsets.symmetric(vertical: 14),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),

                          // OCR button
                          SizedBox(
                            width: double.infinity,
                            child: OutlinedButton.icon(
                              onPressed: _isExtractingText ? null : _extractText,
                              icon: _isExtractingText
                                  ? const SizedBox(
                                      width: 16,
                                      height: 16,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                        valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF14B8A6)),
                                      ),
                                    )
                                  : const Icon(Icons.text_fields, size: 18),
                              label: Text(
                                _extractedText != null ? 'Voir le texte extrait' : 'Extraire le texte (OCR)',
                                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                              ),
                              style: OutlinedButton.styleFrom(
                                foregroundColor: Colors.white,
                                side: const BorderSide(color: Color(0xFF8B5CF6), width: 1.5),
                                padding: const EdgeInsets.symmetric(vertical: 14),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(8),
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(height: 16),

                          // Main action buttons - Web style
                          Row(
                            children: [
                              Expanded(
                                child: OutlinedButton.icon(
                                  onPressed: _rescan,
                                  icon: const Icon(Icons.refresh, size: 20),
                                  label: const Text(
                                    'Reprendre',
                                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
                                  ),
                                  style: OutlinedButton.styleFrom(
                                    foregroundColor: Colors.white,
                                    side: const BorderSide(color: Color(0xFF4B5563), width: 1.5),
                                    backgroundColor: const Color(0xFF374151), // gray-700
                                    padding: const EdgeInsets.symmetric(vertical: 16),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                flex: 2,
                                child: ElevatedButton.icon(
                                  onPressed: _saveDocument,
                                  icon: const Icon(Icons.check, size: 20),
                                  label: const Text(
                                    'Valider',
                                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
                                  ),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: const Color(0xFF14B8A6), // Teal
                                    foregroundColor: Colors.white,
                                    padding: const EdgeInsets.symmetric(vertical: 16),
                                    elevation: 0,
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
    );
  }
}
