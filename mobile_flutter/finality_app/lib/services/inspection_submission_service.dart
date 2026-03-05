import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../utils/logger.dart';

/// Unified service for inspection submission logic.
///
/// Centralizes all Supabase operations shared between
/// InspectionDepartureScreen and InspectionArrivalScreen:
///  - GPS capture
///  - Vehicle inspection record creation
///  - Photo uploads (batched by 3)
///  - Document uploads
///  - Damage record inserts
///  - Expense record inserts (arrival-only)
///  - Mission status updates
///  - Share token creation
///  - Draft persistence
class InspectionSubmissionService {
  final SupabaseClient _supabase;

  InspectionSubmissionService([SupabaseClient? client])
      : _supabase = client ?? Supabase.instance.client;

  // ─── Data Loading ───────────────────────────────────────────────

  /// Load vehicle_type from missions table
  Future<String?> loadVehicleType(String missionId) async {
    try {
      final result = await _supabase
          .from('missions')
          .select('vehicle_type')
          .eq('id', missionId)
          .maybeSingle();
      return result?['vehicle_type'] as String?;
    } catch (e) {
      logger.e('Error loading vehicle type: $e');
      return null;
    }
  }

  /// Load current user's display name from profiles
  Future<String?> loadDriverName() async {
    try {
      final userId = _supabase.auth.currentUser?.id;
      if (userId == null) return null;
      final result = await _supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', userId)
          .maybeSingle();
      if (result == null) return null;
      final first = result['first_name'] as String? ?? '';
      final last = result['last_name'] as String? ?? '';
      return '$first $last'.trim();
    } catch (e) {
      logger.e('Error loading driver name: $e');
      return null;
    }
  }

  // ─── GPS ────────────────────────────────────────────────────────

  /// Capture current GPS position. Returns (lat, lng) or (null, null) on failure.
  Future<({double? lat, double? lng})> captureGpsPosition() async {
    try {
      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 10),
        ),
      );
      return (lat: position.latitude, lng: position.longitude);
    } catch (e) {
      logger.w('GPS capture failed: $e');
      return (lat: null, lng: null);
    }
  }

  // ─── Core Submission ────────────────────────────────────────────

  /// Create vehicle_inspections record; returns the inspection ID.
  Future<String> createInspection({
    required String missionId,
    required String inspectionType,
    required int mileageKm,
    required int fuelLevel,
    required String overallCondition,
    required String internalCleanliness,
    required String externalCleanliness,
    required Map<String, dynamic> vehicleInfo,
    String? notes,
    double? latitude,
    double? longitude,
    Uint8List? driverSignature,
    Uint8List? clientSignature,
    required String driverName,
    required String clientName,
  }) async {
    final userId = _supabase.auth.currentUser!.id;

    final data = {
      'mission_id': missionId,
      'inspector_id': userId,
      'inspection_type': inspectionType,
      'status': 'completed',
      'mileage_km': mileageKm,
      'fuel_level': fuelLevel,
      'overall_condition': overallCondition,
      'internal_cleanliness': internalCleanliness,
      'external_cleanliness': externalCleanliness,
      'vehicle_info': vehicleInfo,
      'notes': notes,
      'latitude': latitude,
      'longitude': longitude,
      'inspector_signature': driverSignature != null
          ? 'data:image/png;base64,${base64Encode(driverSignature)}'
          : null,
      'driver_signature': driverSignature != null
          ? 'data:image/png;base64,${base64Encode(driverSignature)}'
          : null,
      'driver_name': driverName,
      'client_signature': clientSignature != null
          ? 'data:image/png;base64,${base64Encode(clientSignature)}'
          : null,
      'client_name': clientName,
    };

    final response = await _supabase
        .from('vehicle_inspections')
        .insert(data)
        .select('id')
        .single();

    final inspectionId = response['id'] as String;
    debugPrint('✅ Inspection created: $inspectionId');
    return inspectionId;
  }

  // ─── Photo Uploads ──────────────────────────────────────────────

  /// Upload photos to storage + insert into inspection_photos_v2,
  /// batched by [batchSize] in parallel.
  Future<void> uploadPhotos({
    required String inspectionId,
    required List<PhotoDescriptor> photos,
    required String fileNamePrefix,
    int batchSize = 3,
  }) async {
    final userId = _supabase.auth.currentUser!.id;

    for (int i = 0; i < photos.length; i += batchSize) {
      final batch = photos.skip(i).take(batchSize);
      await Future.wait(batch.map((photo) async {
        final file = File(photo.localPath);
        if (!file.existsSync()) {
          debugPrint('⚠️ Photo file missing: ${photo.localPath}');
          return;
        }

        final bytes = await file.readAsBytes();
        final safeType = photo.photoType
            .replaceAll(' ', '_')
            .replaceAll('é', 'e')
            .replaceAll('è', 'e');
        final fileName =
            '${fileNamePrefix}_${inspectionId}_${safeType}_${DateTime.now().millisecondsSinceEpoch}_${photo.index}.jpg';
        final storagePath = 'inspections/$userId/$fileName';

        await _supabase.storage.from('inspection-photos').uploadBinary(
              storagePath,
              bytes,
              fileOptions: const FileOptions(upsert: true),
            );

        final publicUrl = _supabase.storage
            .from('inspection-photos')
            .getPublicUrl(storagePath);

        await _supabase.from('inspection_photos_v2').insert({
          'inspection_id': inspectionId,
          'full_url': publicUrl,
          'photo_type': photo.photoType,
          'damage_status': photo.damageStatus,
          'damage_comment': (photo.damageStatus != 'RAS' &&
                  photo.damageComment != null &&
                  photo.damageComment!.isNotEmpty)
              ? photo.damageComment
              : null,
          'taken_at':
              photo.takenAt?.toUtc().toIso8601String() ??
              DateTime.now().toUtc().toIso8601String(),
          'latitude': photo.latitude,
          'longitude': photo.longitude,
        });
      }));
    }

    debugPrint('✅ ${photos.length} photos uploaded for inspection $inspectionId');
  }

  // ─── Document Uploads ───────────────────────────────────────────

  /// Upload scanned documents to storage + insert into inspection_documents.
  Future<void> uploadDocuments({
    required String inspectionId,
    required List<Map<String, String>> namedDocuments,
    required String fileNamePrefix,
  }) async {
    final userId = _supabase.auth.currentUser!.id;

    for (final doc in namedDocuments) {
      final docPath = doc['url'] ?? '';
      final file = File(docPath);
      if (!file.existsSync()) {
        debugPrint('⚠️ Document file missing: $docPath');
        continue;
      }

      final bytes = await file.readAsBytes();
      final fileName =
          '${fileNamePrefix}_${inspectionId}_${DateTime.now().millisecondsSinceEpoch}.jpg';
      final storagePath = 'inspection-documents/$userId/$fileName';

      await _supabase.storage.from('inspection-photos').uploadBinary(
            storagePath,
            bytes,
            fileOptions: const FileOptions(upsert: true),
          );

      final publicUrl = _supabase.storage
          .from('inspection-photos')
          .getPublicUrl(storagePath);

      await _supabase.from('inspection_documents').insert({
        'inspection_id': inspectionId,
        'document_url': publicUrl,
        'document_type': 'custom',
        'document_title': doc['title'] ?? 'Document',
      });
    }

    debugPrint('✅ ${namedDocuments.length} documents uploaded');
  }

  // ─── Damages ────────────────────────────────────────────────────

  /// Save damage entries to inspection_damages.
  Future<void> saveDamages({
    required String inspectionId,
    required List<DamageDescriptor> damages,
  }) async {
    for (final damage in damages) {
      await _supabase.from('inspection_damages').insert({
        'inspection_id': inspectionId,
        'damage_type': damage.type,
        'severity': 'moderate',
        'location': damage.location,
        'description': damage.description,
        'detected_by': 'manual',
      });
    }
    debugPrint('✅ ${damages.length} damages saved');
  }

  // ─── Expenses (arrival-only) ────────────────────────────────────

  /// Save expense records to inspection_expenses.
  Future<void> saveExpenses({
    required String inspectionId,
    required List<Map<String, dynamic>> expenses,
  }) async {
    for (final expense in expenses) {
      await _supabase.from('inspection_expenses').insert({
        'inspection_id': inspectionId,
        'expense_type': expense['type'] ?? 'other',
        'amount': expense['amount'] ?? 0,
        'description': expense['description'] ?? '',
        'receipt_url': expense['receipt_url'],
      });
    }
    debugPrint('✅ ${expenses.length} expenses saved');
  }

  // ─── Mission Status ─────────────────────────────────────────────

  /// Update mission status after departure inspection.
  Future<void> updateMissionStatusAfterDeparture({
    required String missionId,
    required bool isRestitution,
  }) async {
    if (!isRestitution) {
      await _supabase
          .from('missions')
          .update({'status': 'in_progress'})
          .eq('id', missionId);
      debugPrint('✅ Mission status → in_progress');
    } else {
      debugPrint('⏭️ Restitution departure — status unchanged');
    }
  }

  /// Update mission status after arrival inspection.
  Future<void> updateMissionStatusAfterArrival({
    required String missionId,
    required bool isRestitution,
  }) async {
    if (isRestitution) {
      // Restitution arrival → completed
      await _supabase
          .from('missions')
          .update({'status': 'completed'})
          .eq('id', missionId);
      debugPrint('✅ Mission status → completed (restitution)');
    } else {
      // Check if mission has restitution phase
      final missionData = await _supabase
          .from('missions')
          .select('has_restitution')
          .eq('id', missionId)
          .maybeSingle();

      final hasRestitution = missionData?['has_restitution'] == true;

      if (hasRestitution) {
        await _supabase
            .from('missions')
            .update({'status': 'restitution_pending'})
            .eq('id', missionId);
        debugPrint('✅ Mission status → restitution_pending');
      } else {
        await _supabase
            .from('missions')
            .update({'status': 'completed'})
            .eq('id', missionId);
        debugPrint('✅ Mission status → completed');
      }
    }
  }

  // ─── Report Sharing ─────────────────────────────────────────────

  /// Create/upsert share token in inspection_report_shares. Returns the token.
  Future<String> createShareToken({
    required String missionId,
    required String reportType,
  }) async {
    final userId = _supabase.auth.currentUser!.id;
    final shareToken =
        '${DateTime.now().millisecondsSinceEpoch.toRadixString(36)}${userId.substring(0, 8)}';

    await _supabase.from('inspection_report_shares').upsert({
      'mission_id': missionId,
      'share_token': shareToken,
      'user_id': userId,
      'report_type': reportType,
      'is_active': true,
    }, onConflict: 'mission_id,report_type');

    debugPrint('✅ Share token created: $shareToken');
    return shareToken;
  }

  // ─── Draft Management ───────────────────────────────────────────

  /// Save draft data to SharedPreferences.
  Future<void> saveDraft(String key, Map<String, dynamic> data) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(key, jsonEncode(data));
    } catch (e) {
      logger.e('Error saving draft: $e');
    }
  }

  /// Load draft data from SharedPreferences.
  Future<Map<String, dynamic>?> loadDraft(String key) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(key);
      if (raw == null) return null;
      return jsonDecode(raw) as Map<String, dynamic>;
    } catch (e) {
      logger.e('Error loading draft: $e');
      return null;
    }
  }

  /// Clear draft from SharedPreferences.
  Future<void> clearDraft(String key) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(key);
    } catch (e) {
      logger.e('Error clearing draft: $e');
    }
  }

  // ─── Utility ────────────────────────────────────────────────────

  /// Copy file from cache to a permanent app directory.
  /// Returns the new safe file path.
  Future<String> copyToSafeLocation(String sourcePath) async {
    final appDir = await getApplicationDocumentsDirectory();
    final safeDir = Directory('${appDir.path}/inspection_photos');
    if (!await safeDir.exists()) {
      await safeDir.create(recursive: true);
    }
    final fileName =
        'photo_${DateTime.now().millisecondsSinceEpoch}.jpg';
    final safePath = '${safeDir.path}/$fileName';
    await File(sourcePath).copy(safePath);
    return safePath;
  }
}

// ─── Data Classes ─────────────────────────────────────────────────

/// Descriptor for a photo to be uploaded during inspection submission.
class PhotoDescriptor {
  final String localPath;
  final String photoType;
  final int index;
  final String damageStatus;
  final String? damageComment;
  final DateTime? takenAt;
  final double? latitude;
  final double? longitude;

  const PhotoDescriptor({
    required this.localPath,
    required this.photoType,
    required this.index,
    this.damageStatus = 'RAS',
    this.damageComment,
    this.takenAt,
    this.latitude,
    this.longitude,
  });
}

/// Descriptor for a damage entry.
class DamageDescriptor {
  final String type;
  final String location;
  final String description;

  const DamageDescriptor({
    required this.type,
    required this.location,
    required this.description,
  });
}
