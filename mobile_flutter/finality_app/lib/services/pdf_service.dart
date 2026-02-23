import 'dart:io';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:path_provider/path_provider.dart';

/// Service for generating PDF documents from scanned pages
class PdfService {
  /// Generate PDF from multiple scanned images
  static Future<File> generatePDFFromPages(
    List<File> imageFiles, {
    String? title,
    String? documentType,
  }) async {
    final pdf = pw.Document();
    
    // Load all images
    for (final imageFile in imageFiles) {
      final imageBytes = await imageFile.readAsBytes();
      final image = pw.MemoryImage(imageBytes);
      
      pdf.addPage(
        pw.Page(
          pageFormat: PdfPageFormat.a4,
          build: (pw.Context context) {
            return pw.Center(
              child: pw.Image(
                image,
                fit: pw.BoxFit.contain,
              ),
            );
          },
        ),
      );
    }
    
    // Save to temporary directory
    final now = DateTime.now();
    final tempDir = await getTemporaryDirectory();
    final timestamp = now.millisecondsSinceEpoch;
    final fileName = 'scan_${timestamp}.pdf';
    final file = File('${tempDir.path}/$fileName');
    
    await file.writeAsBytes(await pdf.save());
    
    return file;
  }

  /// Generate PDF with metadata for inspection document
  static Future<File> generateInspectionPDF(
    List<File> imageFiles, {
    required String inspectionId,
    String? missionReference,
    String? vehiclePlate,
  }) async {
    final pdf = pw.Document();
    
    // Title page
    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        build: (pw.Context context) {
          return pw.Center(
            child: pw.Column(
              mainAxisAlignment: pw.MainAxisAlignment.center,
              children: [
                pw.Text(
                  'DOCUMENT D\'INSPECTION',
                  style: pw.TextStyle(
                    fontSize: 24,
                    fontWeight: pw.FontWeight.bold,
                  ),
                ),
                pw.SizedBox(height: 20),
                if (missionReference != null) ...[
                  pw.Text('Mission: $missionReference'),
                  pw.SizedBox(height: 10),
                ],
                if (vehiclePlate != null) ...[
                  pw.Text('Véhicule: $vehiclePlate'),
                  pw.SizedBox(height: 10),
                ],
                pw.Text('ID: $inspectionId'),
                pw.SizedBox(height: 10),
                pw.Text(
                  DateFormat('dd/MM/yyyy HH:mm').format(DateTime.now()),
                  style: const pw.TextStyle(fontSize: 12),
                ),
              ],
            ),
          );
        },
      ),
    );
    
    // Add scanned pages
    for (var i = 0; i < imageFiles.length; i++) {
      final imageBytes = await imageFiles[i].readAsBytes();
      final image = pw.MemoryImage(imageBytes);
      
      pdf.addPage(
        pw.Page(
          pageFormat: PdfPageFormat.a4,
          build: (pw.Context context) {
            return pw.Column(
              children: [
                pw.Expanded(
                  child: pw.Center(
                    child: pw.Image(
                      image,
                      fit: pw.BoxFit.contain,
                    ),
                  ),
                ),
                pw.Container(
                  padding: const pw.EdgeInsets.all(10),
                  child: pw.Text(
                    'Page ${i + 1} / ${imageFiles.length}',
                    style: const pw.TextStyle(fontSize: 10),
                  ),
                ),
              ],
            );
          },
        ),
      );
    }
    
    // Save to temporary directory
    final tempDir = await getTemporaryDirectory();
    final timestamp = DateTime.now().millisecondsSinceEpoch;
    final fileName = 'inspection_${inspectionId}_$timestamp.pdf';
    final file = File('${tempDir.path}/$fileName');
    
    await file.writeAsBytes(await pdf.save());
    
    return file;
  }

  /// Get PDF file size in MB
  static Future<double> getFileSizeMB(File file) async {
    final bytes = await file.length();
    return bytes / (1024 * 1024);
  }

  /// Generate thumbnail preview of first page (for display purposes)
  static Future<File?> generateThumbnail(File pdfFile) async {
    // Note: This would require additional packages like pdf_render
    // For now, return null - can be implemented if needed
    return null;
  }
}

/// Scanned page model
class ScannedPage {
  final String id;
  final File imageFile;
  final String? filterApplied;
  final int order;
  final DateTime scannedAt;

  ScannedPage({
    required this.id,
    required this.imageFile,
    this.filterApplied,
    required this.order,
    DateTime? scannedAt,
  }) : scannedAt = scannedAt ?? DateTime.now();

  ScannedPage copyWith({
    String? id,
    File? imageFile,
    String? filterApplied,
    int? order,
    DateTime? scannedAt,
  }) {
    return ScannedPage(
      id: id ?? this.id,
      imageFile: imageFile ?? this.imageFile,
      filterApplied: filterApplied ?? this.filterApplied,
      order: order ?? this.order,
      scannedAt: scannedAt ?? this.scannedAt,
    );
  }
}
