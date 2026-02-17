class Quote {
  final String? id;
  final String quoteNumber;
  final String userId;
  final String? missionId;
  final String? clientName;
  final String? clientEmail;
  final String? clientPhone;
  final String? clientAddress;
  final DateTime quoteDate;
  final DateTime? validUntil;
  final List<QuoteItem> items;
  final double subtotal;
  final double taxRate;
  final double taxAmount;
  final double total;
  final String status; // 'draft', 'sent', 'accepted', 'rejected', 'converted'
  final String? notes;
  final String? terms;
  final DateTime? sentAt;
  final DateTime? acceptedAt;
  final DateTime? rejectedAt;
  final DateTime? convertedAt;
  final String? convertedInvoiceId;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  Quote({
    this.id,
    required this.quoteNumber,
    required this.userId,
    this.missionId,
    this.clientName,
    this.clientEmail,
    this.clientPhone,
    this.clientAddress,
    required this.quoteDate,
    this.validUntil,
    required this.items,
    required this.subtotal,
    this.taxRate = 20.0,
    required this.taxAmount,
    required this.total,
    this.status = 'draft',
    this.notes,
    this.terms,
    this.sentAt,
    this.acceptedAt,
    this.rejectedAt,
    this.convertedAt,
    this.convertedInvoiceId,
    this.createdAt,
    this.updatedAt,
  });

  factory Quote.fromJson(Map<String, dynamic> json) {
    final items = (json['quote_items'] as List<dynamic>?)
        ?.map((item) => QuoteItem.fromJson(item))
        .toList() ?? [];

    final subtotal = items.fold<double>(
      0.0,
      (sum, item) => sum + item.total,
    );
    
    final taxRate = (json['tax_rate'] as num?)?.toDouble() ?? 20.0;
    final taxAmount = subtotal * (taxRate / 100);
    final total = subtotal + taxAmount;

    return Quote(
      id: json['id']?.toString(),
      quoteNumber: json['quote_number']?.toString() ?? '',
      userId: json['user_id']?.toString() ?? '',
      missionId: json['mission_id']?.toString(),
      clientName: json['client_name']?.toString(),
      clientEmail: json['client_email']?.toString(),
      clientPhone: json['client_phone']?.toString(),
      clientAddress: json['client_address']?.toString(),
      quoteDate: json['issue_date'] != null 
          ? DateTime.parse(json['issue_date'].toString()) 
          : json['quote_date'] != null
              ? DateTime.parse(json['quote_date'].toString())
              : DateTime.now(),
      validUntil: json['valid_until'] != null
          ? DateTime.parse(json['valid_until'].toString())
          : null,
      items: items,
      subtotal: subtotal,
      taxRate: taxRate,
      taxAmount: taxAmount,
      total: total,
      status: json['status']?.toString() ?? 'draft',
      notes: json['notes']?.toString(),
      terms: json['terms']?.toString(),
      sentAt: json['sent_at'] != null
          ? DateTime.parse(json['sent_at'].toString())
          : null,
      acceptedAt: json['accepted_at'] != null
          ? DateTime.parse(json['accepted_at'].toString())
          : null,
      rejectedAt: json['rejected_at'] != null
          ? DateTime.parse(json['rejected_at'].toString())
          : null,
      convertedAt: json['converted_at'] != null
          ? DateTime.parse(json['converted_at'].toString())
          : null,
      convertedInvoiceId: json['converted_invoice_id']?.toString(),
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'].toString())
          : null,
      updatedAt: json['updated_at'] != null
          ? DateTime.parse(json['updated_at'].toString())
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (id != null) 'id': id,
      'quote_number': quoteNumber,
      'user_id': userId,
      if (missionId != null) 'mission_id': missionId,
      if (clientName != null) 'client_name': clientName,
      if (clientEmail != null) 'client_email': clientEmail,
      if (clientPhone != null) 'client_phone': clientPhone,
      if (clientAddress != null) 'client_address': clientAddress,
      'issue_date': quoteDate.toIso8601String(),
      if (validUntil != null) 'valid_until': validUntil!.toIso8601String(),
      'tax_rate': taxRate,
      'status': status,
      if (notes != null) 'notes': notes,
      if (terms != null) 'terms': terms,
      if (sentAt != null) 'sent_at': sentAt!.toIso8601String(),
      if (acceptedAt != null) 'accepted_at': acceptedAt!.toIso8601String(),
      if (rejectedAt != null) 'rejected_at': rejectedAt!.toIso8601String(),
      if (convertedAt != null) 'converted_at': convertedAt!.toIso8601String(),
      if (convertedInvoiceId != null) 'converted_invoice_id': convertedInvoiceId,
      if (createdAt != null) 'created_at': createdAt!.toIso8601String(),
      if (updatedAt != null) 'updated_at': updatedAt!.toIso8601String(),
    };
  }

  Quote copyWith({
    String? id,
    String? quoteNumber,
    String? userId,
    String? missionId,
    String? clientName,
    String? clientEmail,
    String? clientPhone,
    String? clientAddress,
    DateTime? quoteDate,
    DateTime? validUntil,
    List<QuoteItem>? items,
    double? subtotal,
    double? taxRate,
    double? taxAmount,
    double? total,
    String? status,
    String? notes,
    String? terms,
    DateTime? sentAt,
    DateTime? acceptedAt,
    DateTime? rejectedAt,
    DateTime? convertedAt,
    String? convertedInvoiceId,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return Quote(
      id: id ?? this.id,
      quoteNumber: quoteNumber ?? this.quoteNumber,
      userId: userId ?? this.userId,
      missionId: missionId ?? this.missionId,
      clientName: clientName ?? this.clientName,
      clientEmail: clientEmail ?? this.clientEmail,
      clientPhone: clientPhone ?? this.clientPhone,
      clientAddress: clientAddress ?? this.clientAddress,
      quoteDate: quoteDate ?? this.quoteDate,
      validUntil: validUntil ?? this.validUntil,
      items: items ?? this.items,
      subtotal: subtotal ?? this.subtotal,
      taxRate: taxRate ?? this.taxRate,
      taxAmount: taxAmount ?? this.taxAmount,
      total: total ?? this.total,
      status: status ?? this.status,
      notes: notes ?? this.notes,
      terms: terms ?? this.terms,
      sentAt: sentAt ?? this.sentAt,
      acceptedAt: acceptedAt ?? this.acceptedAt,
      rejectedAt: rejectedAt ?? this.rejectedAt,
      convertedAt: convertedAt ?? this.convertedAt,
      convertedInvoiceId: convertedInvoiceId ?? this.convertedInvoiceId,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}

class QuoteItem {
  final String? id;
  final String? quoteId;
  final String description;
  final double quantity;
  final double unitPrice;
  final double total;
  final int? sortOrder;

  QuoteItem({
    this.id,
    this.quoteId,
    required this.description,
    required this.quantity,
    required this.unitPrice,
    required this.total,
    this.sortOrder,
  });

  factory QuoteItem.fromJson(Map<String, dynamic> json) {
    return QuoteItem(
      id: json['id']?.toString(),
      quoteId: json['quote_id']?.toString(),
      description: json['description']?.toString() ?? '',
      quantity: (json['quantity'] ?? 1).toDouble(),
      unitPrice: (json['unit_price'] ?? 0).toDouble(),
      total: (json['total'] ?? 0).toDouble(),
      sortOrder: json['sort_order'] as int?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (id != null) 'id': id,
      if (quoteId != null) 'quote_id': quoteId,
      'description': description,
      'quantity': quantity,
      'unit_price': unitPrice,
      'total': total,
      if (sortOrder != null) 'sort_order': sortOrder,
    };
  }

  QuoteItem copyWith({
    String? id,
    String? quoteId,
    String? description,
    double? quantity,
    double? unitPrice,
    double? total,
    int? sortOrder,
  }) {
    return QuoteItem(
      id: id ?? this.id,
      quoteId: quoteId ?? this.quoteId,
      description: description ?? this.description,
      quantity: quantity ?? this.quantity,
      unitPrice: unitPrice ?? this.unitPrice,
      total: total ?? this.total,
      sortOrder: sortOrder ?? this.sortOrder,
    );
  }
}
