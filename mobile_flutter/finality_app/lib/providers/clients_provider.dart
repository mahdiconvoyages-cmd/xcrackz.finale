import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../services/client_service.dart';
import '../models/client.dart';
import '../utils/logger.dart';
import 'service_providers.dart';

part 'clients_provider.g.dart';

/// Provider pour le service Client (singleton).
@riverpod
ClientService clientService(Ref ref) {
  return ClientService(client: ref.read(supabaseClientProvider));
}

/// Provider pour la liste des clients avec filtrage.
@riverpod
class Clients extends _$Clients {
  @override
  Future<List<Client>> build({
    String? searchQuery,
    bool? isCompany,
    bool? isFavorite,
  }) async {
    logger.d('📇 Loading clients (search=$searchQuery, company=$isCompany, fav=$isFavorite)');

    try {
      final service = ref.read(clientServiceProvider);
      final clients = await service.getClients(
        searchQuery: searchQuery,
        isCompany: isCompany,
        isFavorite: isFavorite,
      );

      logger.i('✅ Loaded ${clients.length} clients');
      return clients;
    } catch (e, stack) {
      logger.e('❌ Failed to load clients', e, stack);
      rethrow;
    }
  }

  /// Rafraîchir la liste.
  Future<void> refresh() async {
    logger.d('🔄 Refreshing clients...');
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      final service = ref.read(clientServiceProvider);
      return service.getClients(
        searchQuery: searchQuery,
        isCompany: isCompany,
        isFavorite: isFavorite,
      );
    });
  }

  /// Créer un client et invalider le cache.
  Future<Client> createClient(Client client) async {
    final service = ref.read(clientServiceProvider);
    final created = await service.createClient(client);
    ref.invalidateSelf();
    logger.i('✅ Client created: ${created.id}');
    return created;
  }

  /// Mettre à jour un client et invalider le cache.
  Future<Client> updateClient(Client client) async {
    final service = ref.read(clientServiceProvider);
    final updated = await service.updateClient(client);
    ref.invalidateSelf();
    logger.i('✅ Client updated: ${updated.id}');
    return updated;
  }

  /// Supprimer un client et invalider le cache.
  Future<void> deleteClient(String clientId) async {
    final service = ref.read(clientServiceProvider);
    await service.deleteClient(clientId);
    ref.invalidateSelf();
    logger.i('✅ Client deleted: $clientId');
  }

  /// Toggle favori.
  Future<void> toggleFavorite(String clientId, bool isFavorite) async {
    final service = ref.read(clientServiceProvider);
    await service.toggleFavorite(clientId, isFavorite);
    ref.invalidateSelf();
  }
}

/// Provider pour les statistiques clients.
@riverpod
Future<Map<String, int>> clientCounts(Ref ref) async {
  final service = ref.read(clientServiceProvider);
  return service.getClientsCount();
}

/// Provider pour les stats d'un client.
@riverpod
Future<ClientStats> clientStats(Ref ref, String clientId) async {
  final service = ref.read(clientServiceProvider);
  return service.getClientStats(clientId);
}
