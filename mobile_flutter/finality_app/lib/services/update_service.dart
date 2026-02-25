import 'dart:io';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:path_provider/path_provider.dart';
import 'package:http/http.dart' as http;
import '../utils/logger.dart';

/// Modèle représentant une version disponible
class AppUpdate {
  final String version;
  final int buildNumber;
  final String downloadUrl;
  final String? releaseNotes;
  final bool isMandatory;
  final String? minSupportedVersion;
  final double? fileSizeMb;

  AppUpdate({
    required this.version,
    required this.buildNumber,
    required this.downloadUrl,
    this.releaseNotes,
    this.isMandatory = false,
    this.minSupportedVersion,
    this.fileSizeMb,
  });

  factory AppUpdate.fromJson(Map<String, dynamic> json) {
    return AppUpdate(
      // Supporte les deux formats: avec ou sans préfixe out_
      version: (json['out_version'] ?? json['version']) as String,
      buildNumber: ((json['out_build_number'] ?? json['build_number']) as num).toInt(),
      downloadUrl: (json['out_download_url'] ?? json['download_url']) as String,
      releaseNotes: (json['out_release_notes'] ?? json['release_notes']) as String?,
      isMandatory: (json['out_is_mandatory'] ?? json['is_mandatory']) == true,
      minSupportedVersion: (json['out_min_supported_version'] ?? json['min_supported_version']) as String?,
      fileSizeMb: (json['out_file_size_mb'] ?? json['file_size_mb']) != null
          ? ((json['out_file_size_mb'] ?? json['file_size_mb']) as num).toDouble()
          : null,
    );
  }
}

/// Service de vérification et téléchargement des mises à jour
class UpdateService {
  UpdateService._();
  static final instance = UpdateService._();

  final _supabase = Supabase.instance.client;

  /// Vérifie si une mise à jour est disponible
  /// Retourne [AppUpdate] si une version plus récente existe, null sinon
  Future<AppUpdate?> checkForUpdate() async {
    try {
      final packageInfo = await PackageInfo.fromPlatform();
      final currentBuild = int.tryParse(packageInfo.buildNumber) ?? 0;

      logger.i('🔄 Vérification MAJ — version actuelle: ${packageInfo.version}+$currentBuild');

      final response = await _supabase.rpc(
        'get_latest_app_version',
        params: {'p_platform': 'android'},
      );

      if (response == null || (response is List && response.isEmpty)) {
        logger.i('✅ Aucune version trouvée en base');
        return null;
      }

      // La RPC retourne une liste de lignes
      final data = response is List ? response.first : response;
      final update = AppUpdate.fromJson(data as Map<String, dynamic>);

      if (update.buildNumber > currentBuild) {
        logger.i('🆕 Mise à jour disponible: ${update.version}+${update.buildNumber} (actuelle: $currentBuild)');

        // Vérifier si c'est une MAJ forcée (version en dessous du minimum)
        if (update.minSupportedVersion != null) {
          if (_isVersionBelow(packageInfo.version, update.minSupportedVersion!)) {
            return AppUpdate(
              version: update.version,
              buildNumber: update.buildNumber,
              downloadUrl: update.downloadUrl,
              releaseNotes: update.releaseNotes,
              isMandatory: true, // Force si en dessous du minimum
              minSupportedVersion: update.minSupportedVersion,
              fileSizeMb: update.fileSizeMb,
            );
          }
        }

        return update;
      }

      logger.i('✅ Application à jour (build $currentBuild >= ${update.buildNumber})');
      return null;
    } catch (e) {
      logger.e('❌ Erreur vérification MAJ: $e');
      return null; // Ne pas bloquer l'app si la vérification échoue
    }
  }

  /// Télécharge l'APK et retourne le chemin du fichier
  /// [onProgress] callback avec (bytesReceived, totalBytes)
  Future<String?> downloadApk(
    AppUpdate update, {
    void Function(int received, int total)? onProgress,
  }) async {
    try {
      final dir = await getTemporaryDirectory();
      final fileName = 'checksfleet-${update.version}.apk';
      final filePath = '${dir.path}/$fileName';
      final file = File(filePath);

      // Si déjà téléchargé, vérifier la taille
      if (file.existsSync()) {
        final existingSize = file.lengthSync();
        if (update.fileSizeMb != null) {
          final expectedSize = (update.fileSizeMb! * 1024 * 1024).toInt();
          // Tolérance de 5%
          if ((existingSize - expectedSize).abs() < expectedSize * 0.05) {
            logger.i('✅ APK déjà téléchargé: $filePath');
            return filePath;
          }
        } else if (existingSize > 10 * 1024 * 1024) {
          // > 10MB, probablement valide
          logger.i('✅ APK déjà téléchargé: $filePath');
          return filePath;
        }
        file.deleteSync();
      }

      logger.i('⬇️ Téléchargement APK: ${update.downloadUrl}');

      final request = http.Request('GET', Uri.parse(update.downloadUrl));
      final streamedResponse = await request.send();

      if (streamedResponse.statusCode != 200) {
        throw Exception('Erreur HTTP ${streamedResponse.statusCode}');
      }

      final totalBytes = streamedResponse.contentLength ?? 0;
      int receivedBytes = 0;
      final sink = file.openWrite();

      await for (final chunk in streamedResponse.stream) {
        sink.add(chunk);
        receivedBytes += chunk.length;
        onProgress?.call(receivedBytes, totalBytes);
      }

      await sink.close();

      logger.i('✅ APK téléchargé: $filePath (${(receivedBytes / 1024 / 1024).toStringAsFixed(1)} MB)');
      return filePath;
    } catch (e) {
      logger.e('❌ Erreur téléchargement APK: $e');
      return null;
    }
  }

  /// Compare deux versions semver (ex: 3.8.1 < 3.9.0)
  bool _isVersionBelow(String current, String minimum) {
    try {
      final currentParts = current.split('.').map(int.parse).toList();
      final minimumParts = minimum.split('.').map(int.parse).toList();

      for (int i = 0; i < 3; i++) {
        final c = i < currentParts.length ? currentParts[i] : 0;
        final m = i < minimumParts.length ? minimumParts[i] : 0;
        if (c < m) return true;
        if (c > m) return false;
      }
      return false; // Equal
    } catch (_) {
      return false;
    }
  }
}
