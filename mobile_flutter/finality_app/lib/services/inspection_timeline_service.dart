import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/inspection_timeline.dart';

class InspectionTimelineService {
  final SupabaseClient supabase;

  InspectionTimelineService({SupabaseClient? client})
      : supabase = client ?? Supabase.instance.client;

  /// Récupère le rapport complet avec timeline via le token de partage
  Future<InspectionTimelineReport> getTimelineReport(String token) async {
    try {
      final result = await supabase.rpc(
        'get_full_inspection_report',
        params: {'p_token': token},
      );

      if (result == null) {
        throw Exception('Token invalide ou rapport non trouvé');
      }

      if (result is Map<String, dynamic> && result.containsKey('error')) {
        throw Exception(result['error'] as String);
      }

      return InspectionTimelineReport.fromJson(result as Map<String, dynamic>);
    } catch (e) {
      rethrow;
    }
  }

  /// Teste si un token est valide
  Future<bool> isTokenValid(String token) async {
    try {
      final result = await supabase.rpc(
        'get_full_inspection_report',
        params: {'p_token': token},
      );

      return result != null &&
          result is Map<String, dynamic> &&
          !result.containsKey('error');
    } catch (_) {
      return false;
    }
  }
}
