import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../services/mission_service.dart';
import '../services/realtime_service.dart';
import '../services/inspection_service.dart';
import '../services/inspection_timeline_service.dart';
import '../services/inspection_submission_service.dart';
import '../services/inspection_photo_service.dart';
import '../services/background_tracking_service.dart';
import '../services/deep_link_service.dart';
import '../services/insee_service.dart';
import '../services/fcm_service.dart';

/// Centralized service providers — single instances shared across screens.
///
/// Usage: `final svc = ref.read(missionServiceProvider);`
///
/// Note: clientServiceProvider, invoiceServiceProvider, quoteServiceProvider,
/// and subscriptionServiceProvider are defined in their respective
/// codegen providers (clients_provider.dart, invoices_provider.dart, etc.)

/// SupabaseClient provider — central injection point for testability.
final supabaseClientProvider = Provider<SupabaseClient>((ref) {
  return Supabase.instance.client;
});

final missionServiceProvider = Provider<MissionService>((ref) {
  return MissionService(client: ref.read(supabaseClientProvider));
});

final realtimeServiceProvider = Provider<RealtimeService>((ref) {
  return RealtimeService(client: ref.read(supabaseClientProvider));
});

final inspectionServiceProvider = Provider<InspectionService>((ref) {
  return InspectionService(client: ref.read(supabaseClientProvider));
});

final inspectionTimelineServiceProvider = Provider<InspectionTimelineService>((ref) {
  return InspectionTimelineService(client: ref.read(supabaseClientProvider));
});

final inspectionSubmissionServiceProvider = Provider<InspectionSubmissionService>((ref) {
  return InspectionSubmissionService(ref.read(supabaseClientProvider));
});

final inspectionPhotoServiceProvider = Provider<InspectionPhotoService>((ref) {
  return InspectionPhotoService(client: ref.read(supabaseClientProvider));
});

final backgroundTrackingServiceProvider = Provider<BackgroundTrackingService>((ref) {
  return BackgroundTrackingService();
});

final deepLinkServiceProvider = Provider<DeepLinkService>((ref) {
  return DeepLinkService();
});

final inseeServiceProvider = Provider<InseeService>((ref) {
  return InseeService();
});

final fcmServiceProvider = Provider<FCMService>((ref) {
  return FCMService();
});
