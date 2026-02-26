import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../services/invoice_service.dart';
import '../models/invoice.dart';
import '../utils/logger.dart';

part 'invoices_provider.g.dart';

/// Provider pour le service Invoice (singleton).
@riverpod
InvoiceService invoiceService(Ref ref) {
  return InvoiceService();
}

/// Provider pour la liste des factures avec filtrage.
@riverpod
class Invoices extends _$Invoices {
  @override
  Future<List<Invoice>> build({String? status}) async {
    logger.d('🧾 Loading invoices (status=$status)');

    try {
      final service = ref.read(invoiceServiceProvider);
      final invoices = await service.getInvoices(status: status);

      logger.i('✅ Loaded ${invoices.length} invoices');
      return invoices;
    } catch (e, stack) {
      logger.e('❌ Failed to load invoices', e, stack);
      rethrow;
    }
  }

  /// Rafraîchir la liste.
  Future<void> refresh() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      final service = ref.read(invoiceServiceProvider);
      return service.getInvoices(status: status);
    });
  }

  /// Créer une facture.
  Future<Invoice> createInvoice(Invoice invoice) async {
    final service = ref.read(invoiceServiceProvider);
    final created = await service.createInvoice(invoice);
    ref.invalidateSelf();
    return created;
  }

  /// Mettre à jour une facture.
  Future<Invoice> updateInvoice(String id, Invoice invoice) async {
    final service = ref.read(invoiceServiceProvider);
    final updated = await service.updateInvoice(id, invoice);
    ref.invalidateSelf();
    return updated;
  }

  /// Marquer comme payée.
  Future<Invoice> markAsPaid(String id, {String? paymentMethod}) async {
    final service = ref.read(invoiceServiceProvider);
    final paid = await service.markAsPaid(id, paymentMethod: paymentMethod);
    ref.invalidateSelf();
    return paid;
  }

  /// Supprimer une facture.
  Future<void> deleteInvoice(String id) async {
    final service = ref.read(invoiceServiceProvider);
    await service.deleteInvoice(id);
    ref.invalidateSelf();
  }
}

/// Provider pour les stats factures.
@riverpod
Future<Map<String, dynamic>> invoiceStats(Ref ref) async {
  final service = ref.read(invoiceServiceProvider);
  return service.getInvoiceStats();
}
