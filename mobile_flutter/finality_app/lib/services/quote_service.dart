import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/quote.dart';
import '../models/invoice.dart';

class QuoteService {
  final SupabaseClient _supabase = Supabase.instance.client;

  // Create
  Future<Quote> createQuote(Quote quote) async {
    try {
      // Insert quote
      final quoteData = quote.toJson();
      final quoteResponse = await _supabase
          .from('quotes')
          .insert(quoteData)
          .select()
          .single();

      final quoteId = quoteResponse['id'] as String;

      // Insert quote items
      final itemsData = quote.items.map((item) {
        final itemJson = item.toJson();
        itemJson['quote_id'] = quoteId;
        return itemJson;
      }).toList();

      if (itemsData.isNotEmpty) {
        await _supabase.from('quote_items').insert(itemsData);
      }

      return getQuoteById(quoteId);
    } catch (e) {
      throw Exception('Erreur lors de la création du devis: $e');
    }
  }

  // Read
  Future<List<Quote>> getQuotes({String? status, int offset = 0, int limit = 20}) async {
    try {
      final userId = _supabase.auth.currentUser?.id;
      if (userId == null) throw Exception('Utilisateur non connecté');

      var query = _supabase
          .from('quotes')
          .select('*')
          .eq('user_id', userId);

      if (status != null && status != 'all') {
        query = query.eq('status', status);
      }
      
      final response = await query
          .order('created_at', ascending: false)
          .range(offset, offset + limit - 1);
      
      final quotes = <Quote>[];
      for (final json in response as List) {
        final quoteId = json['id'] as String?;
        if (quoteId != null) {
          try {
            final items = await _supabase
                .from('quote_items')
                .select('*')
                .eq('quote_id', quoteId);
            json['quote_items'] = items;
          } catch (_) {
            json['quote_items'] = [];
          }
        }
        quotes.add(Quote.fromJson(json));
      }
      
      return quotes;
    } catch (e) {
      throw Exception('Erreur lors de la récupération des devis: $e');
    }
  }

  Future<Quote> getQuoteById(String id) async {
    try {
      final response = await _supabase
          .from('quotes')
          .select('*')
          .eq('id', id)
          .single();

      // Charger les items séparément
      final items = await _supabase
          .from('quote_items')
          .select('*')
          .eq('quote_id', id);
      
      response['quote_items'] = items;
      return Quote.fromJson(response);
    } catch (e) {
      throw Exception('Erreur lors de la récupération du devis: $e');
    }
  }

  // Update
  Future<Quote> updateQuote(Quote quote) async {
    try {
      final quoteData = quote.toJson();
      quoteData['updated_at'] = DateTime.now().toUtc().toIso8601String();

      await _supabase
          .from('quotes')
          .update(quoteData)
          .eq('id', quote.id!);

      // Delete existing items
      await _supabase.from('quote_items').delete().eq('quote_id', quote.id!);

      // Insert new items
      final itemsData = quote.items.map((item) {
        final itemJson = item.toJson();
        itemJson['quote_id'] = quote.id;
        return itemJson;
      }).toList();

      if (itemsData.isNotEmpty) {
        await _supabase.from('quote_items').insert(itemsData);
      }

      return getQuoteById(quote.id!);
    } catch (e) {
      throw Exception('Erreur lors de la mise à jour du devis: $e');
    }
  }

  // Delete
  Future<void> deleteQuote(String id) async {
    try {
      await _supabase.from('quotes').delete().eq('id', id);
    } catch (e) {
      throw Exception('Erreur lors de la suppression du devis: $e');
    }
  }

  // Status actions
  Future<Quote> markAsSent(String id) async {
    try {
      await _supabase.from('quotes').update({
        'status': 'sent',
        'sent_at': DateTime.now().toUtc().toIso8601String(),
        'updated_at': DateTime.now().toUtc().toIso8601String(),
      }).eq('id', id);

      return getQuoteById(id);
    } catch (e) {
      throw Exception('Erreur lors du marquage comme envoyé: $e');
    }
  }

  Future<Quote> markAsAccepted(String id) async {
    try {
      await _supabase.from('quotes').update({
        'status': 'accepted',
        'accepted_at': DateTime.now().toUtc().toIso8601String(),
        'updated_at': DateTime.now().toUtc().toIso8601String(),
      }).eq('id', id);

      return getQuoteById(id);
    } catch (e) {
      throw Exception('Erreur lors du marquage comme accepté: $e');
    }
  }

  Future<Quote> markAsRejected(String id) async {
    try {
      await _supabase.from('quotes').update({
        'status': 'rejected',
        'rejected_at': DateTime.now().toUtc().toIso8601String(),
        'updated_at': DateTime.now().toUtc().toIso8601String(),
      }).eq('id', id);

      return getQuoteById(id);
    } catch (e) {
      throw Exception('Erreur lors du marquage comme rejeté: $e');
    }
  }

  // Convert to invoice
  Future<Invoice> convertToInvoice(String quoteId) async {
    try {
      final quote = await getQuoteById(quoteId);

      // Create invoice from quote
      final invoice = Invoice(
        invoiceNumber: await _generateInvoiceNumber(),
        userId: quote.userId,
        missionId: quote.missionId,
        clientInfo: {
          'name': quote.clientName,
          'email': quote.clientEmail,
          'phone': quote.clientPhone,
          'address': quote.clientAddress,
        },
        invoiceDate: DateTime.now(),
        dueDate: DateTime.now().add(const Duration(days: 30)),
        items: quote.items.map((item) => InvoiceItem(
          description: item.description,
          quantity: item.quantity.toInt(),
          unitPrice: item.unitPrice,
          total: item.total,
        )).toList(),
        subtotal: quote.subtotal,
        taxRate: quote.taxRate,
        taxAmount: quote.taxAmount,
        total: quote.total,
        status: 'pending',
        notes: quote.notes,
      );

      // Insert invoice
      final invoiceData = invoice.toJson();
      final invoiceResponse = await _supabase
          .from('invoices')
          .insert(invoiceData)
          .select()
          .single();

      final invoiceId = invoiceResponse['id'] as String;

      // Insert invoice items
      final itemsData = invoice.items.map((item) {
        final itemJson = item.toJson();
        itemJson['invoice_id'] = invoiceId;
        return itemJson;
      }).toList();

      if (itemsData.isNotEmpty) {
        await _supabase.from('invoice_items').insert(itemsData);
      }

      // Update quote status
      await _supabase.from('quotes').update({
        'status': 'converted',
        'converted_at': DateTime.now().toUtc().toIso8601String(),
        'converted_invoice_id': invoiceId,
        'updated_at': DateTime.now().toUtc().toIso8601String(),
      }).eq('id', quoteId);

      // Fetch complete invoice with items
      final completeInvoiceResponse = await _supabase
          .from('invoices')
          .select('*, invoice_items(*)')
          .eq('id', invoiceId)
          .single();

      return Invoice.fromJson(completeInvoiceResponse);
    } catch (e) {
      throw Exception('Erreur lors de la conversion en facture: $e');
    }
  }

  // Statistics
  Future<Map<String, dynamic>> getQuoteStats() async {
    try {
      final quotes = await getQuotes();
      
      final total = quotes.length;
      final draft = quotes.where((q) => q.status == 'draft').length;
      final sent = quotes.where((q) => q.status == 'sent').length;
      final accepted = quotes.where((q) => q.status == 'accepted').length;
      final rejected = quotes.where((q) => q.status == 'rejected').length;
      final converted = quotes.where((q) => q.status == 'converted').length;
      
      final totalValue = quotes.fold<double>(
        0.0,
        (sum, quote) => sum + quote.total,
      );
      
      final acceptedValue = quotes
          .where((q) => q.status == 'accepted' || q.status == 'converted')
          .fold<double>(0.0, (sum, quote) => sum + quote.total);

      final acceptanceRate = sent > 0 
          ? (accepted + converted) / sent * 100 
          : 0.0;

      return {
        'total': total,
        'draft': draft,
        'sent': sent,
        'accepted': accepted,
        'rejected': rejected,
        'converted': converted,
        'totalValue': totalValue,
        'acceptedValue': acceptedValue,
        'acceptanceRate': acceptanceRate,
      };
    } catch (e) {
      throw Exception('Erreur lors du calcul des statistiques: $e');
    }
  }

  // Generate quote number
  Future<String> generateQuoteNumber() async {
    try {
      final now = DateTime.now();
      final year = now.year;
      
      final response = await _supabase
          .from('quotes')
          .select('quote_number')
          .like('quote_number', 'DEV-$year-%')
          .order('quote_number', ascending: false)
          .limit(1);

      if (response.isEmpty) {
        return 'DEV-$year-0001';
      }

      final lastNumber = response[0]['quote_number'] as String;
      final parts = lastNumber.split('-');
      final lastSequence = int.parse(parts[2]);
      final newSequence = lastSequence + 1;

      return 'DEV-$year-${newSequence.toString().padLeft(4, '0')}';
    } catch (e) {
      final now = DateTime.now();
      return 'DEV-${now.year}-0001';
    }
  }

  Future<String> _generateInvoiceNumber() async {
    try {
      final now = DateTime.now();
      final year = now.year;
      
      final response = await _supabase
          .from('invoices')
          .select('invoice_number')
          .like('invoice_number', 'INV-$year-%')
          .order('invoice_number', ascending: false)
          .limit(1);

      if (response.isEmpty) {
        return 'INV-$year-0001';
      }

      final lastNumber = response[0]['invoice_number'] as String;
      final parts = lastNumber.split('-');
      final lastSequence = int.parse(parts[2]);
      final newSequence = lastSequence + 1;

      return 'INV-$year-${newSequence.toString().padLeft(4, '0')}';
    } catch (e) {
      final now = DateTime.now();
      return 'INV-${now.year}-0001';
    }
  }
}
