// ignore_for_file: avoid_print
import 'dart:io';
import 'package:image/image.dart' as img;

/// Compress all PNG assets to smaller PNGs with reduced quality
/// Run with: dart run compress_assets.dart
void main() async {
  final assetsDir = Directory('assets');
  if (!assetsDir.existsSync()) {
    print('assets/ directory not found');
    return;
  }

  int totalSaved = 0;
  int fileCount = 0;

  final files = assetsDir
      .listSync(recursive: true)
      .whereType<File>()
      .where((f) => f.path.toLowerCase().endsWith('.png'))
      .toList();

  print('Found ${files.length} PNG files to optimize...\n');

  for (final file in files) {
    final originalSize = file.lengthSync();
    if (originalSize < 50 * 1024) {
      // Skip files smaller than 50KB
      continue;
    }

    try {
      final bytes = file.readAsBytesSync();
      final image = img.decodePng(bytes);
      if (image == null) continue;

      // Resize if dimension > 1024px (vehicle images don't need to be huge)
      img.Image resized = image;
      if (image.width > 1024 || image.height > 1024) {
        if (image.width > image.height) {
          resized = img.copyResize(image, width: 1024);
        } else {
          resized = img.copyResize(image, height: 1024);
        }
      }

      // Encode as optimized PNG (with compression level 6)
      final optimized = img.encodePng(resized, level: 6);

      if (optimized.length < originalSize * 0.95) {
        // Only save if we actually reduced size by at least 5%
        file.writeAsBytesSync(optimized);
        final saved = originalSize - optimized.length;
        totalSaved += saved;
        fileCount++;
        final pct = ((saved / originalSize) * 100).toStringAsFixed(1);
        print('  ✓ ${file.path}: ${(originalSize / 1024).toStringAsFixed(0)}KB → ${(optimized.length / 1024).toStringAsFixed(0)}KB (-$pct%)');
      }
    } catch (e) {
      print('  ✗ ${file.path}: $e');
    }
  }

  print('\n══════════════════════════════════════');
  print('Optimized $fileCount files');
  print('Total saved: ${(totalSaved / 1024 / 1024).toStringAsFixed(2)} MB');
}
