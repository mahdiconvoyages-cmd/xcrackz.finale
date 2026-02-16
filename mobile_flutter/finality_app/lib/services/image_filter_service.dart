import 'dart:io';
import 'package:image/image.dart' as img;

/// Service for applying professional image filters to scanned documents
class ImageFilterService {
  /// Available filter types
  static const String filterBlackWhite = 'black_white';
  static const String filterGrayscale = 'grayscale';
  static const String filterColor = 'color';
  static const String filterEnhanced = 'enhanced';

  /// Apply Black & White filter (high contrast for text documents)
  static Future<File> applyBlackWhite(File imageFile) async {
    final bytes = await imageFile.readAsBytes();
    final image = img.decodeImage(bytes);
    
    if (image == null) throw Exception('Failed to decode image');
    
    // Convert to grayscale
    var filtered = img.grayscale(image);
    
    // Apply high contrast threshold for B&W effect
    for (var y = 0; y < filtered.height; y++) {
      for (var x = 0; x < filtered.width; x++) {
        final pixel = filtered.getPixel(x, y);
        final luminance = img.getLuminance(pixel);
        
        // Threshold at 128 - below becomes black, above becomes white
        final newColor = luminance < 128 ? img.ColorRgb8(0, 0, 0) : img.ColorRgb8(255, 255, 255);
        filtered.setPixel(x, y, newColor);
      }
    }
    
    // Encode and save
    final newBytes = img.encodeJpg(filtered, quality: 95);
    final newPath = imageFile.path.replaceAll('.jpg', '_bw.jpg');
    final newFile = File(newPath);
    await newFile.writeAsBytes(newBytes);
    
    return newFile;
  }

  /// Apply Grayscale filter (softer than B&W, preserves more detail)
  static Future<File> applyGrayscale(File imageFile) async {
    final bytes = await imageFile.readAsBytes();
    final image = img.decodeImage(bytes);
    
    if (image == null) throw Exception('Failed to decode image');
    
    // Convert to grayscale
    var filtered = img.grayscale(image);
    
    // Slight contrast boost
    filtered = img.adjustColor(filtered, contrast: 1.1);
    
    // Encode and save
    final newBytes = img.encodeJpg(filtered, quality: 95);
    final newPath = imageFile.path.replaceAll('.jpg', '_gray.jpg');
    final newFile = File(newPath);
    await newFile.writeAsBytes(newBytes);
    
    return newFile;
  }

  /// Keep color but enhance for document clarity
  static Future<File> applyColorEnhanced(File imageFile) async {
    final bytes = await imageFile.readAsBytes();
    final image = img.decodeImage(bytes);
    
    if (image == null) throw Exception('Failed to decode image');
    
    // Enhance colors for better document visibility
    var filtered = img.adjustColor(
      image,
      contrast: 1.15,
      brightness: 1.05,
      saturation: 1.1,
    );
    
    // Slight sharpening
    filtered = img.convolution(filtered, filter: [
      0, -1, 0,
      -1, 5, -1,
      0, -1, 0,
    ]);
    
    // Encode and save
    final newBytes = img.encodeJpg(filtered, quality: 95);
    final newPath = imageFile.path.replaceAll('.jpg', '_color.jpg');
    final newFile = File(newPath);
    await newFile.writeAsBytes(newBytes);
    
    return newFile;
  }

  /// Auto-enhance (intelligent document enhancement)
  static Future<File> autoEnhance(File imageFile) async {
    final bytes = await imageFile.readAsBytes();
    final image = img.decodeImage(bytes);
    
    if (image == null) throw Exception('Failed to decode image');
    
    // Apply balanced enhancements
    var enhanced = img.adjustColor(
      image,
      contrast: 1.15,
      brightness: 1.05,
      saturation: 1.0,
    );
    
    // Encode and save
    final newBytes = img.encodeJpg(enhanced, quality: 95);
    final newPath = imageFile.path.replaceAll('.jpg', '_enhanced.jpg');
    final newFile = File(newPath);
    await newFile.writeAsBytes(newBytes);
    
    return newFile;
  }

  /// Apply filter by type name
  static Future<File> applyFilter(File imageFile, String filterType) async {
    switch (filterType) {
      case filterBlackWhite:
        return await applyBlackWhite(imageFile);
      case filterGrayscale:
        return await applyGrayscale(imageFile);
      case filterColor:
        return await applyColorEnhanced(imageFile);
      case filterEnhanced:
        return await autoEnhance(imageFile);
      default:
        return imageFile; // No filter
    }
  }

  /// Get display name for filter
  static String getFilterName(String filterType) {
    switch (filterType) {
      case filterBlackWhite:
        return 'Noir & Blanc';
      case filterGrayscale:
        return 'Niveaux de gris';
      case filterColor:
        return 'Couleur améliorée';
      case filterEnhanced:
        return 'Auto-améliorer';
      default:
        return 'Aucun';
    }
  }

  /// Get icon for filter
  static String getFilterIcon(String filterType) {
    switch (filterType) {
      case filterBlackWhite:
        return '⚫';
      case filterGrayscale:
        return '🌫️';
      case filterColor:
        return '🎨';
      case filterEnhanced:
        return '✨';
      default:
        return '📄';
    }
  }
}
