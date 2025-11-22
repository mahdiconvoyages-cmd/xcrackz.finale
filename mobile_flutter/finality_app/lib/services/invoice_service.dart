import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/invoice.dart';

class InvoiceService {
  final _supabase = Supabase.instance.client;

  // Créer une facture
  Future<Invoice> createInvoice(Invoice invoice) async {
    try {
      final response = await _supabase
          .from('invoices')
          .insert(invoice.toJson())
          .select()
          .single();

      return Invoice.fromJson(response);
    } catch (e) {
      throw Exception('Erreur création facture: $e');
    }
  }

  // Récupérer toutes les factures de l'utilisateur
  Future<List<Invoice>> getInvoices({String? status}) async {
    try {
      final userId = _supabase.auth.currentUser?.id;
      if (userId == null) throw Exception('Utilisateur non connecté');

      var query = _supabase
          .from('invoices')
          .select('*')
          .eq('user_id', userId);

      if (status != null && status != 'all') {
        query = query.eq('status', status);
      }
      
      final response = await query.order('created_at', ascending: false);
      return (response as List).map((json) => Invoice.fromJson(json)).toList();
    } catch (e) {
      throw Exception('Erreur chargement factures: $e');
    }
  }

  // Récupérer une facture par ID
  Future<Invoice?> getInvoiceById(String id) async {
    try {
      final response = await _supabase
          .from('invoices')
          .select()
          .eq('id', id)
          .single();

      return Invoice.fromJson(response);
    } catch (e) {
      throw Exception('Erreur lors de la récupération de la facture: $e');
    }
  }

  Future<Invoice?> getInvoiceByIdWithItems(String id) async {
    try {
      final response = await _supabase
          .from('invoices')
          .select('*, invoice_items(*)')
          .eq('id', id)
          .single();

      return Invoice.fromJson(response);
    } catch (e) {
      throw Exception('Erreur lors de la récupération de la facture: $e');
    }
  }

  // Mettre à jour une facture
  Future<Invoice> updateInvoice(String id, Invoice invoice) async {
    try {
      final response = await _supabase
          .from('invoices')
          .update(invoice.toJson())
          .eq('id', id)
          .select()
          .single();

      return Invoice.fromJson(response);
    } catch (e) {
      throw Exception('Erreur mise à jour facture: $e');
    }
  }

  // Supprimer une facture
  Future<void> deleteInvoice(String id) async {
    try {
      await _supabase.from('invoices').delete().eq('id', id);
    } catch (e) {
      throw Exception('Erreur suppression facture: $e');
    }
  }

  // Marquer une facture comme payée
  Future<Invoice> markAsPaid(String id, {String? paymentMethod}) async {
    try {
      final response = await _supabase
          .from('invoices')
          .update({
            'status': 'paid',
            'paid_at': DateTime.now().toIso8601String(),
            if (paymentMethod != null) 'payment_method': paymentMethod,
          })
          .eq('id', id)
          .select()
          .single();

      return Invoice.fromJson(response);
    } catch (e) {
      throw Exception('Erreur marquage paiement: $e');
    }
  }

  // Annuler une facture
  Future<Invoice> cancelInvoice(String id) async {
    try {
      final response = await _supabase
          .from('invoices')
          .update({'status': 'cancelled'})
          .eq('id', id)
          .select()
          .single();

      return Invoice.fromJson(response);
    } catch (e) {
      throw Exception('Erreur annulation facture: $e');
    }
  }

  // Statistiques des factures
  Future<Map<String, dynamic>> getInvoiceStats() async {
    try {
      final userId = _supabase.auth.currentUser?.id;
      if (userId == null) throw Exception('Utilisateur non connecté');

      final invoices = await getInvoices();

      final total = invoices.length;
      final pending = invoices.where((i) => i.status == 'pending').length;
      final paid = invoices.where((i) => i.status == 'paid').length;
      final overdue = invoices.where((i) => i.status == 'overdue').length;
      final cancelled = invoices.where((i) => i.status == 'cancelled').length;

      final totalRevenue = invoices
          .where((i) => i.status == 'paid')
          .fold(0.0, (sum, i) => sum + i.total);

      // Revenus mensuels
      final now = DateTime.now();
      final firstDayOfMonth = DateTime(now.year, now.month, 1);
      final monthlyRevenue = invoices
          .where((i) =>
              i.status == 'paid' &&
              i.paidAt != null &&
              i.paidAt!.isAfter(firstDayOfMonth))
          .fold(0.0, (sum, i) => sum + i.total);

      // Revenus hebdomadaires
      final firstDayOfWeek = now.subtract(Duration(days: now.weekday - 1));
      final weeklyRevenue = invoices
          .where((i) =>
              i.status == 'paid' &&
              i.paidAt != null &&
              i.paidAt!.isAfter(firstDayOfWeek))
          .fold(0.0, (sum, i) => sum + i.total);

      return {
        'total': total,
        'pending': pending,
        'paid': paid,
        'overdue': overdue,
        'cancelled': cancelled,
        'totalRevenue': totalRevenue,
        'monthlyRevenue': monthlyRevenue,
        'weeklyRevenue': weeklyRevenue,
      };
    } catch (e) {
      throw Exception('Erreur statistiques factures: $e');
    }
  }

  // Générer un numéro de facture
  Future<String> generateInvoiceNumber() async {
    try {
      final userId = _supabase.auth.currentUser?.id;
      if (userId == null) throw Exception('Utilisateur non connecté');

      final response = await _supabase
          .from('invoices')
          .select('invoice_number')
          .eq('user_id', userId)
          .order('created_at', ascending: false)
          .limit(1);

      if (response.isEmpty) {
        return 'INV-${DateTime.now().year}-0001';
      }

      final lastInvoiceNumber = response.first['invoice_number'] as String;
      final parts = lastInvoiceNumber.split('-');
      if (parts.length == 3) {
        final year = DateTime.now().year.toString();
        final lastNumber = int.tryParse(parts[2]) ?? 0;
        final newNumber = (lastNumber + 1).toString().padLeft(4, '0');
        return 'INV-$year-$newNumber';
      }

      return 'INV-${DateTime.now().year}-0001';
    } catch (e) {
      return 'INV-${DateTime.now().year}-${DateTime.now().millisecondsSinceEpoch.toString().substring(8)}';
    }
  }

  // Créer une facture depuis une mission
  Future<Invoice> createInvoiceFromMission(String missionId) async {
    try {
      final userId = _supabase.auth.currentUser?.id;
      if (userId == null) throw Exception('Utilisateur non connecté');

      // Récupérer la mission
      final missionResponse = await _supabase
          .from('missions')
          .select('*')
          .eq('id', missionId)
          .single();

      final mission = missionResponse;
      final price = (mission['price'] ?? 0).toDouble();
      final taxRate = 20.0;
      final subtotal = price / (1 + taxRate / 100);
      final taxAmount = price - subtotal;

      final invoiceNumber = await generateInvoiceNumber();

      final invoice = Invoice(
        userId: userId,
        missionId: missionId,
        invoiceNumber: invoiceNumber,
        invoiceDate: DateTime.now(),
        dueDate: DateTime.now().add(const Duration(days: 30)),
        status: 'pending',
        subtotal: subtotal,
        taxRate: taxRate,
        taxAmount: taxAmount,
        total: price,
        items: [
          InvoiceItem(
            description: 'Mission ${mission['reference']} - ${mission['vehicle_brand']} ${mission['vehicle_model']}',
            quantity: 1,
            unitPrice: subtotal,
            total: subtotal,
          ),
        ],
      );

      return await createInvoice(invoice);
    } catch (e) {
      throw Exception('Erreur création facture depuis mission: $e');
    }
  }
}
