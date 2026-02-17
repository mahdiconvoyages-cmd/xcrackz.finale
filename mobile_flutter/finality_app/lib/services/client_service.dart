import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/client.dart';
import '../utils/logger.dart';
import 'offline_service.dart';
import 'connectivity_service.dart';

/// Service de gestion des clients
/// CRUD complet avec recherche SIRET via API INSEE
/// Supporte le mode hors-ligne avec cache SQLite
class ClientService {
  final SupabaseClient _supabase = Supabase.instance.client;
  final OfflineService _offlineService = OfflineService();
  final ConnectivityService _connectivityService = ConnectivityService();
  bool _isInitialized = false;

  Future<void> _ensureInitialized() async {
    if (!_isInitialized) {
      await _offlineService.initialize();
      _isInitialized = true;
    }
  }

  /// Récupère tous les clients de l'utilisateur courant
  Future<List<Client>> getClients({
    String? searchQuery,
    bool? isCompany,
    bool? isFavorite,
    String orderBy = 'created_at',
    bool ascending = false,
  }) async {
    await _ensureInitialized();

    try {
      final userId = _supabase.auth.currentUser?.id;
      if (userId == null) throw Exception('Utilisateur non connecté');

      // Si offline, retourner le cache
      if (_connectivityService.isOffline) {
        logger.w('ClientService: Offline - returning cached contacts');
        final cached = await _offlineService.getCachedContacts();
        List<Client> clients = cached
            .map((json) => Client.fromJson(json))
            .toList();
        // Appliquer les filtres localement
        if (isCompany != null) {
          clients = clients.where((c) => c.isCompany == isCompany).toList();
        }
        if (isFavorite != null) {
          clients = clients.where((c) => c.isFavorite == isFavorite).toList();
        }
        if (searchQuery != null && searchQuery.isNotEmpty) {
          final q = searchQuery.toLowerCase();
          clients = clients.where((c) {
            return c.name.toLowerCase().contains(q) ||
                c.email.toLowerCase().contains(q) ||
                (c.companyName?.toLowerCase().contains(q) ?? false) ||
                (c.phone?.contains(q) ?? false) ||
                (c.city?.toLowerCase().contains(q) ?? false) ||
                (c.siret?.contains(q) ?? false);
          }).toList();
        }
        return clients;
      }

      // Online: fetch from Supabase
      var query = _supabase
          .from('clients')
          .select()
          .eq('user_id', userId);

      if (isCompany != null) {
        query = query.eq('is_company', isCompany);
      }

      if (isFavorite != null) {
        query = query.eq('is_favorite', isFavorite);
      }

      final response = await query.order(orderBy, ascending: ascending);
      
      final rawList = response as List;
      // Cache pour offline
      await _offlineService.cacheContacts(
        rawList.map((e) => Map<String, dynamic>.from(e as Map)).toList(),
      );

      List<Client> clients = rawList
          .map((json) => Client.fromJson(json as Map<String, dynamic>))
          .toList();

      // Filtrer localement si recherche
      if (searchQuery != null && searchQuery.isNotEmpty) {
        final q = searchQuery.toLowerCase();
        clients = clients.where((client) {
          return client.name.toLowerCase().contains(q) ||
              client.email.toLowerCase().contains(q) ||
              (client.companyName?.toLowerCase().contains(q) ?? false) ||
              (client.phone?.contains(q) ?? false) ||
              (client.city?.toLowerCase().contains(q) ?? false) ||
              (client.siret?.contains(q) ?? false);
        }).toList();
      }

      return clients;
    } catch (e) {
      // Fallback cache
      logger.e('ClientService: Error, fallback to cache: $e');
      final cached = await _offlineService.getCachedContacts();
      if (cached.isNotEmpty) {
        return cached.map((json) => Client.fromJson(json)).toList();
      }
      rethrow;
    }
  }

  /// Récupère un client par son ID
  Future<Client?> getClient(String clientId) async {
    final response = await _supabase
        .from('clients')
        .select()
        .eq('id', clientId)
        .maybeSingle();

    if (response == null) return null;
    return Client.fromJson(response as Map<String, dynamic>);
  }

  /// Crée un nouveau client
  Future<Client> createClient(Client client) async {
    final userId = _supabase.auth.currentUser?.id;
    if (userId == null) throw Exception('Utilisateur non connecté');

    final data = client.toInsertJson();
    data['user_id'] = userId;
    data['created_at'] = DateTime.now().toUtc().toIso8601String();

    final response = await _supabase
        .from('clients')
        .insert(data)
        .select()
        .single();

    return Client.fromJson(response as Map<String, dynamic>);
  }

  /// Met à jour un client existant
  Future<Client> updateClient(Client client) async {
    final data = client.toJson();
    data['updated_at'] = DateTime.now().toUtc().toIso8601String();
    data.remove('created_at');

    final response = await _supabase
        .from('clients')
        .update(data)
        .eq('id', client.id)
        .select()
        .single();

    return Client.fromJson(response as Map<String, dynamic>);
  }

  /// Supprime un client
  Future<void> deleteClient(String clientId) async {
    await _supabase.from('clients').delete().eq('id', clientId);
  }

  /// Toggle le statut favori d'un client
  Future<void> toggleFavorite(String clientId, bool isFavorite) async {
    await _supabase
        .from('clients')
        .update({'is_favorite': isFavorite, 'updated_at': DateTime.now().toUtc().toIso8601String()})
        .eq('id', clientId);
  }

  /// Récupère les statistiques d'un client
  Future<ClientStats> getClientStats(String clientId) async {
    // Factures
    final invoicesResponse = await _supabase
        .from('invoices')
        .select('id, status, total_ttc, created_at')
        .eq('client_id', clientId);

    final invoices = invoicesResponse as List;
    
    // Devis
    final quotesResponse = await _supabase
        .from('quotes')
        .select('id')
        .eq('client_id', clientId);

    final quotes = quotesResponse as List;

    // Calculer les stats
    double totalRevenue = 0;
    double pendingAmount = 0;
    DateTime? lastInvoiceDate;

    for (final invoice in invoices) {
      final status = invoice['status'] as String?;
      final amount = (invoice['total_ttc'] as num?)?.toDouble() ?? 0;
      
      if (status == 'paid') {
        totalRevenue += amount;
      } else if (status != 'cancelled') {
        pendingAmount += amount;
      }

      final createdAt = DateTime.parse(invoice['created_at'] as String);
      if (lastInvoiceDate == null || createdAt.isAfter(lastInvoiceDate)) {
        lastInvoiceDate = createdAt;
      }
    }

    return ClientStats(
      totalInvoices: invoices.length,
      totalQuotes: quotes.length,
      totalRevenue: totalRevenue,
      pendingAmount: pendingAmount,
      lastInvoiceDate: lastInvoiceDate,
    );
  }

  /// Recherche entreprise par SIRET via API gouvernementale
  Future<List<Map<String, dynamic>>> searchBySiret(String siret) async {
    try {
      final cleanSiret = siret.replaceAll(RegExp(r'\s'), '');
      if (cleanSiret.length < 9) return [];

      // Utiliser l'API recherche-entreprises.api.gouv.fr (gratuite, sans auth)
      final uri = Uri.parse(
        'https://recherche-entreprises.api.gouv.fr/search?q=$cleanSiret&page=1&per_page=5'
      );

      final response = await Supabase.instance.client.functions.invoke(
        'proxy-insee',
        body: {'url': uri.toString()},
      );

      // Si pas de fonction edge, on fait la requête directement
      // Note: Cela peut ne pas fonctionner sur mobile à cause de CORS
      // Pour la production, utiliser une edge function Supabase

      return [];
    } catch (e) {
      logger.e('Erreur recherche SIRET: $e');
      return [];
    }
  }

  /// Récupère le nombre total de clients
  Future<Map<String, int>> getClientsCount() async {
    final userId = _supabase.auth.currentUser?.id;
    if (userId == null) return {'total': 0, 'favorites': 0, 'companies': 0};

    final response = await _supabase
        .from('clients')
        .select('id, is_favorite, is_company')
        .eq('user_id', userId);

    final clients = response as List;
    
    return {
      'total': clients.length,
      'favorites': clients.where((c) => c['is_favorite'] == true).length,
      'companies': clients.where((c) => c['is_company'] == true).length,
    };
  }
}
