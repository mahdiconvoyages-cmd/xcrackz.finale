class Invoice {
  final String? id;
  final String userId;
  final String? clientId;
  final String? missionId;
  final String invoiceNumber;
  final DateTime invoiceDate;
  final DateTime? dueDate;
  final String status; // pending, paid, overdue, cancelled
  final double subtotal;
  final double taxRate;
  final double taxAmount;
  final double total;
  final String? notes;
  final String? paymentMethod;
  final DateTime? paidAt;
  final List<InvoiceItem> items;
  final Map<String, dynamic>? clientInfo;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  Invoice({
    this.id,
    required this.userId,
    this.clientId,
    this.missionId,
    required this.invoiceNumber,
    required this.invoiceDate,
    this.dueDate,
    required this.status,
    required this.subtotal,
    this.taxRate = 20.0,
    required this.taxAmount,
    required this.total,
    this.notes,
    this.paymentMethod,
    this.paidAt,
    this.items = const [],
    this.clientInfo,
    this.createdAt,
    this.updatedAt,
  });

  factory Invoice.fromJson(Map<String, dynamic> json) {
    return Invoice(
      id: json['id']?.toString(),
      userId: json['user_id']?.toString() ?? '',
      clientId: json['client_id']?.toString(),
      missionId: json['mission_id']?.toString(),
      invoiceNumber: json['invoice_number']?.toString() ?? '',
      invoiceDate: json['invoice_date'] != null 
          ? DateTime.parse(json['invoice_date'].toString()) 
          : json['issue_date'] != null
              ? DateTime.parse(json['issue_date'].toString())
              : DateTime.now(),
      dueDate: json['due_date'] != null ? DateTime.parse(json['due_date'].toString()) : null,
      status: json['status']?.toString() ?? 'pending',
      subtotal: (json['subtotal'] ?? 0).toDouble(),
      taxRate: (json['tax_rate'] ?? 20.0).toDouble(),
      taxAmount: (json['tax_amount'] ?? 0).toDouble(),
      total: (json['total'] ?? 0).toDouble(),
      notes: json['notes']?.toString(),
      paymentMethod: json['payment_method']?.toString(),
      paidAt: json['paid_at'] != null ? DateTime.parse(json['paid_at'].toString()) : null,
      items: json['items'] != null
          ? (json['items'] as List).map((i) => InvoiceItem.fromJson(i)).toList()
          : [],
      // Si client_info est null (facture créée depuis le web), le reconstituer
      // depuis les colonnes top-level pour que le PDF mobile affiche les infos client
      clientInfo: json['client_info'] as Map<String, dynamic>? ?? _buildClientInfoFromColumns(json),
      createdAt: json['created_at'] != null ? DateTime.parse(json['created_at'].toString()) : null,
      updatedAt: json['updated_at'] != null ? DateTime.parse(json['updated_at'].toString()) : null,
    );
  }

  /// Reconstruit client_info depuis les colonnes top-level (compatibilité web)
  static Map<String, dynamic>? _buildClientInfoFromColumns(Map<String, dynamic> json) {
    final name = json['client_name']?.toString();
    if (name == null || name.isEmpty) return null;
    return {
      'name': name,
      if (json['client_email'] != null) 'email': json['client_email'].toString(),
      if (json['client_siret'] != null) 'siret': json['client_siret'].toString(),
      if (json['client_address'] != null) 'address': json['client_address'].toString(),
      if (json['payment_terms'] != null) 'payment_terms': json['payment_terms'].toString(),
    };
  }

  Map<String, dynamic> toJson() {
    return {
      if (id != null) 'id': id,
      'user_id': userId,
      if (clientId != null) 'client_id': clientId,
      if (missionId != null) 'mission_id': missionId,
      'invoice_number': invoiceNumber,
      'issue_date': invoiceDate.toIso8601String().split('T').first,
      'invoice_date': invoiceDate.toIso8601String().split('T').first,
      if (dueDate != null) 'due_date': dueDate!.toIso8601String().split('T').first,
      'status': status,
      'subtotal': subtotal,
      'tax_rate': taxRate,
      'tax_amount': taxAmount,
      'total': total,
      if (notes != null) 'notes': notes,
      if (paymentMethod != null) 'payment_method': paymentMethod,
      if (paidAt != null) 'paid_at': paidAt!.toIso8601String(),
      'items': items.map((i) => i.toJson()).toList(),
      if (clientInfo != null) 'client_info': clientInfo,
    };
  }

  Invoice copyWith({
    String? id,
    String? userId,
    String? clientId,
    String? missionId,
    String? invoiceNumber,
    DateTime? invoiceDate,
    DateTime? dueDate,
    String? status,
    double? subtotal,
    double? taxRate,
    double? taxAmount,
    double? total,
    String? notes,
    String? paymentMethod,
    DateTime? paidAt,
    List<InvoiceItem>? items,
    Map<String, dynamic>? clientInfo,
  }) {
    return Invoice(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      clientId: clientId ?? this.clientId,
      missionId: missionId ?? this.missionId,
      invoiceNumber: invoiceNumber ?? this.invoiceNumber,
      invoiceDate: invoiceDate ?? this.invoiceDate,
      dueDate: dueDate ?? this.dueDate,
      status: status ?? this.status,
      subtotal: subtotal ?? this.subtotal,
      taxRate: taxRate ?? this.taxRate,
      taxAmount: taxAmount ?? this.taxAmount,
      total: total ?? this.total,
      notes: notes ?? this.notes,
      paymentMethod: paymentMethod ?? this.paymentMethod,
      paidAt: paidAt ?? this.paidAt,
      items: items ?? this.items,
      clientInfo: clientInfo ?? this.clientInfo,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) || other is Invoice && id == other.id;

  @override
  int get hashCode => id.hashCode;
}

class InvoiceItem {
  final String? id;
  final String description;
  final int quantity;
  final double unitPrice;
  final double total;

  InvoiceItem({
    this.id,
    required this.description,
    required this.quantity,
    required this.unitPrice,
    required this.total,
  });

  factory InvoiceItem.fromJson(Map<String, dynamic> json) {
    return InvoiceItem(
      id: json['id']?.toString(),
      description: json['description']?.toString() ?? '',
      quantity: (json['quantity'] ?? 1).toInt(),
      unitPrice: (json['unit_price'] ?? 0).toDouble(),
      total: (json['total'] ?? json['amount'] ?? 0).toDouble(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (id != null) 'id': id,
      'description': description,
      'quantity': quantity,
      'unit_price': unitPrice,
      'total': total,
    };
  }
}
