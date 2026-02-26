import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../services/quote_service.dart';
import '../models/quote.dart';
import '../utils/logger.dart';

part 'quotes_provider.g.dart';

/// Provider pour le service Quote (singleton).
@riverpod
QuoteService quoteService(Ref ref) {
  return QuoteService();
}

/// Provider pour la liste des devis avec filtrage.
@riverpod
class Quotes extends _$Quotes {
  @override
  Future<List<Quote>> build({String? status}) async {
    logger.d('📝 Loading quotes (status=$status)');

    try {
      final service = ref.read(quoteServiceProvider);
      final quotes = await service.getQuotes(status: status);

      logger.i('✅ Loaded ${quotes.length} quotes');
      return quotes;
    } catch (e, stack) {
      logger.e('❌ Failed to load quotes', e, stack);
      rethrow;
    }
  }

  /// Rafraîchir la liste.
  Future<void> refresh() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      final service = ref.read(quoteServiceProvider);
      return service.getQuotes(status: status);
    });
  }

  /// Créer un devis.
  Future<Quote> createQuote(Quote quote) async {
    final service = ref.read(quoteServiceProvider);
    final created = await service.createQuote(quote);
    ref.invalidateSelf();
    return created;
  }

  /// Supprimer un devis.
  Future<void> deleteQuote(String id) async {
    final service = ref.read(quoteServiceProvider);
    await service.deleteQuote(id);
    ref.invalidateSelf();
  }
}
