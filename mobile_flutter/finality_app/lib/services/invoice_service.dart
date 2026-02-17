import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/invoice.dart';
import '../utils/logger.dart';

class InvoiceService {
  final _supabase = Supabase.instance.client;

  // Créer une facture
  Future<Invoice> createInvoice(Invoice invoice) async {
    try {
      logger.i('InvoiceService.createInvoice - Début');
      
      // Récupérer l'utilisateur connecté
      final userId = _supabase.auth.currentUser?.id;
      if (userId == null) {
        throw Exception('Utilisateur non connecté');
      }
      logger.d('User ID: $userId');
      
      // Copier l'invoice avec le bon userId
      final invoiceWithUserId = invoice.copyWith(userId: userId);
      
      // Extraire les items avant de sérialiser
      final items = invoiceWithUserId.items;
      logger.d('Nombre d\'items: ${items.length}');
      
      // Créer un JSON sans les items
      final invoiceJson = invoiceWithUserId.toJson();
      invoiceJson.remove('items'); // Retirer les items car ils sont dans une table séparée
      
      // S'assurer que client_name et client_email sont presents (requis par la DB)
      if (invoiceJson['client_name'] == null || invoiceJson['client_name'] == '') {
        final clientInfo = invoiceJson['client_info'] as Map<String, dynamic>?;
        invoiceJson['client_name'] = clientInfo?['name'] ?? 'Client';
      }
      if (invoiceJson['client_email'] == null || invoiceJson['client_email'] == '') {
        final clientInfo = invoiceJson['client_info'] as Map<String, dynamic>?;
        invoiceJson['client_email'] = clientInfo?['email'] ?? '';
      }
      
      logger.d('JSON invoice (sans items): $invoiceJson');
      
      // 1. Créer l'invoice
      final invoiceResponse = await _supabase
          .from('invoices')
          .insert(invoiceJson)
          .select()
          .single();
      
      logger.i('Invoice créée avec ID: ${invoiceResponse['id']}');
      final createdInvoiceId = invoiceResponse['id'] as String;
      
      // 2. Créer les items si présents
      if (items.isNotEmpty) {
        logger.d('Création des ${items.length} items...');
        final itemsJson = items.asMap().entries.map((entry) {
          final index = entry.key;
          final item = entry.value;
          return {
            'invoice_id': createdInvoiceId,
            'description': item.description,
            'quantity': item.quantity,
            'unit_price': item.unitPrice,
            'tax_rate': invoiceWithUserId.taxRate,
            'amount': item.total,
            'sort_order': index,
          };
        }).toList();
        
        await _supabase.from('invoice_items').insert(itemsJson);
        logger.i('Items créés avec succès');
      }
      
      // 3. Récupérer l'invoice complète avec les items
      final completeInvoice = await getInvoiceByIdWithItems(createdInvoiceId);
      logger.i('Invoice complète créée avec succès!');
      
      return completeInvoice ?? Invoice.fromJson(invoiceResponse);
    } catch (e) {
      logger.e('Erreur création facture: $e');
      throw Exception('Erreur création facture: $e');
    }
  }

  // Récupérer toutes les factures de l'utilisateur
  Future<List<Invoice>> getInvoices({String? status, int limit = 30, int offset = 0}) async {
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
      
      final response = await query
          .order('created_at', ascending: false)
          .range(offset, offset + limit - 1);
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
      
      // Convertir invoice_items en items pour le modèle
      final invoiceData = Map<String, dynamic>.from(response);
      if (invoiceData['invoice_items'] != null) {
        invoiceData['items'] = invoiceData['invoice_items'];
        invoiceData.remove('invoice_items');
      }

      return Invoice.fromJson(invoiceData);
    } catch (e) {
      throw Exception('Erreur lors de la récupération de la facture: $e');
    }
  }

  // Mettre à jour une facture
  Future<Invoice> updateInvoice(String id, Invoice invoice) async {
    try {
      logger.i('InvoiceService.updateInvoice - ID: $id');
      
      // Extraire les items
      final items = invoice.items;
      logger.d('Nombre d\'items: ${items.length}');
      
      // JSON sans les items
      final invoiceJson = invoice.toJson();
      invoiceJson.remove('items');
      
      // 1. Mettre à jour l'invoice
      final invoiceResponse = await _supabase
          .from('invoices')
          .update(invoiceJson)
          .eq('id', id)
          .select()
          .single();
      
      logger.i('Invoice mise à jour');
      
      // 2. Supprimer les anciens items
      await _supabase.from('invoice_items').delete().eq('invoice_id', id);
      logger.d('Anciens items supprimés');
      
      // 3. Créer les nouveaux items
      if (items.isNotEmpty) {
        final itemsJson = items.asMap().entries.map((entry) {
          final index = entry.key;
          final item = entry.value;
          return {
            'invoice_id': id,
            'description': item.description,
            'quantity': item.quantity,
            'unit_price': item.unitPrice,
            'tax_rate': invoice.taxRate,
            'amount': item.total,
            'sort_order': index,
          };
        }).toList();
        
        await _supabase.from('invoice_items').insert(itemsJson);
        logger.i('Nouveaux items créés');
      }
      
      // 4. Récupérer l'invoice complète
      final completeInvoice = await getInvoiceByIdWithItems(id);
      logger.i('Invoice mise à jour avec succès!');
      
      return completeInvoice ?? Invoice.fromJson(invoiceResponse);
    } catch (e) {
      logger.e('Erreur mise à jour facture: $e');
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
            'paid_at': DateTime.now().toUtc().toIso8601String(),
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
      if (price <= 0) throw Exception('Prix de la mission non defini');
      
      final taxRate = 20.0;
      final subtotal = price / (1 + taxRate / 100);
      final taxAmount = price - subtotal;

      final invoiceNumber = await generateInvoiceNumber();

      // Recuperer le nom et email du mandataire/client
      final clientName = mission['mandataire_name'] as String? ?? 
                         mission['client_name'] as String? ?? 
                         'Client Mission';
      final clientEmail = mission['client_email'] as String? ?? '';

      final invoice = Invoice(
        userId: userId,
        missionId: missionId,
        invoiceNumber: invoiceNumber,
        invoiceDate: DateTime.now(),
        dueDate: DateTime.now().add(const Duration(days: 30)),
        status: 'draft',
        subtotal: subtotal,
        taxRate: taxRate,
        taxAmount: taxAmount,
        total: price,
        clientInfo: {
          'name': clientName,
          'email': clientEmail,
          'company': mission['mandataire_company'] as String? ?? '',
        },
        items: [
          InvoiceItem(
            description: 'Convoyage ${mission['reference'] ?? ''} - ${mission['vehicle_brand'] ?? ''} ${mission['vehicle_model'] ?? ''}'.trim(),
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
