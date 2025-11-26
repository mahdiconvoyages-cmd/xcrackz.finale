class Mission {
  final String id;
  final String? reference;
  final String? pickupAddress;
  final String? deliveryAddress;
  final String? pickupCity;
  final String? deliveryCity;
  final String? pickupPostalCode;
  final String? deliveryPostalCode;
  final double? pickupLat;
  final double? pickupLng;
  final double? deliveryLat;
  final double? deliveryLng;
  final DateTime? pickupDate;
  final DateTime? deliveryDate;
  final String? vehicleType;
  final String? vehicleBrand;
  final String? vehicleModel;
  final String? vehiclePlate;
  final String? vehicleVin;
  final String status;
  final String? driverId;
  final String? clientName;
  final String? clientPhone;
  final String? clientEmail;
  final String? notes;
  final double? price;
  final String? publicTrackingLink;
  final String? reportId;
  final DateTime createdAt;
  final DateTime updatedAt;

  Mission({
    required this.id,
    this.reference,
    this.pickupAddress,
    this.deliveryAddress,
    this.pickupCity,
    this.deliveryCity,
    this.pickupPostalCode,
    this.deliveryPostalCode,
    this.pickupLat,
    this.pickupLng,
    this.deliveryLat,
    this.deliveryLng,
    this.pickupDate,
    this.deliveryDate,
    this.vehicleType,
    this.vehicleBrand,
    this.vehicleModel,
    this.vehiclePlate,
    this.vehicleVin,
    required this.status,
    this.driverId,
    this.clientName,
    this.clientPhone,
    this.clientEmail,
    this.notes,
    this.price,
    this.publicTrackingLink,
    this.reportId,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Mission.fromJson(Map<String, dynamic> json) {
    return Mission(
      id: json['id'] as String,
      reference: json['reference'] as String?,
      pickupAddress: json['pickup_address'] as String?,
      deliveryAddress: json['delivery_address'] as String?,
      pickupCity: json['pickup_city'] as String?,
      deliveryCity: json['delivery_city'] as String?,
      pickupPostalCode: json['pickup_postal_code'] as String?,
      deliveryPostalCode: json['delivery_postal_code'] as String?,
      pickupLat: json['pickup_lat'] != null ? (json['pickup_lat'] as num).toDouble() : null,
      pickupLng: json['pickup_lng'] != null ? (json['pickup_lng'] as num).toDouble() : null,
      deliveryLat: json['delivery_lat'] != null ? (json['delivery_lat'] as num).toDouble() : null,
      deliveryLng: json['delivery_lng'] != null ? (json['delivery_lng'] as num).toDouble() : null,
      pickupDate: json['pickup_date'] != null ? DateTime.parse(json['pickup_date'] as String) : null,
      deliveryDate: json['delivery_date'] != null ? DateTime.parse(json['delivery_date'] as String) : null,
      vehicleType: json['vehicle_type'] as String?,
      vehicleBrand: json['vehicle_brand'] as String?,
      vehicleModel: json['vehicle_model'] as String?,
      vehiclePlate: json['vehicle_plate'] as String?,
      vehicleVin: json['vehicle_vin'] as String?,
      status: json['status'] as String? ?? 'pending',
      driverId: json['driver_id'] as String?,
      clientName: json['client_name'] as String?,
      clientPhone: json['client_phone'] as String?,
      clientEmail: json['client_email'] as String?,
      notes: json['notes'] as String?,
      price: json['price'] != null ? (json['price'] as num).toDouble() : null,
      publicTrackingLink: json['public_tracking_link'] as String?,
      reportId: json['report_id'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'reference': reference,
      'pickup_address': pickupAddress,
      'delivery_address': deliveryAddress,
      'pickup_city': pickupCity,
      'delivery_city': deliveryCity,
      'pickup_postal_code': pickupPostalCode,
      'delivery_postal_code': deliveryPostalCode,
      'pickup_lat': pickupLat,
      'pickup_lng': pickupLng,
      'delivery_lat': deliveryLat,
      'delivery_lng': deliveryLng,
      'pickup_date': pickupDate?.toIso8601String(),
      'delivery_date': deliveryDate?.toIso8601String(),
      'vehicle_type': vehicleType,
      'vehicle_brand': vehicleBrand,
      'vehicle_model': vehicleModel,
      'vehicle_plate': vehiclePlate,
      'vehicle_vin': vehicleVin,
      'status': status,
      'driver_id': driverId,
      'client_name': clientName,
      'client_phone': clientPhone,
      'client_email': clientEmail,
      'notes': notes,
      'price': price,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }

  Mission copyWith({
    String? id,
    String? pickupAddress,
    String? deliveryAddress,
    String? pickupCity,
    String? deliveryCity,
    String? pickupPostalCode,
    String? deliveryPostalCode,
    double? pickupLat,
    double? pickupLng,
    double? deliveryLat,
    double? deliveryLng,
    DateTime? pickupDate,
    DateTime? deliveryDate,
    String? vehicleType,
    String? vehicleBrand,
    String? vehicleModel,
    String? vehiclePlate,
    String? vehicleVin,
    String? status,
    String? driverId,
    String? clientName,
    String? clientPhone,
    String? clientEmail,
    String? notes,
    double? price,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return Mission(
      id: id ?? this.id,
      pickupAddress: pickupAddress ?? this.pickupAddress,
      deliveryAddress: deliveryAddress ?? this.deliveryAddress,
      pickupCity: pickupCity ?? this.pickupCity,
      deliveryCity: deliveryCity ?? this.deliveryCity,
      pickupPostalCode: pickupPostalCode ?? this.pickupPostalCode,
      deliveryPostalCode: deliveryPostalCode ?? this.deliveryPostalCode,
      pickupLat: pickupLat ?? this.pickupLat,
      pickupLng: pickupLng ?? this.pickupLng,
      deliveryLat: deliveryLat ?? this.deliveryLat,
      deliveryLng: deliveryLng ?? this.deliveryLng,
      pickupDate: pickupDate ?? this.pickupDate,
      deliveryDate: deliveryDate ?? this.deliveryDate,
      vehicleType: vehicleType ?? this.vehicleType,
      vehicleBrand: vehicleBrand ?? this.vehicleBrand,
      vehicleModel: vehicleModel ?? this.vehicleModel,
      vehiclePlate: vehiclePlate ?? this.vehiclePlate,
      vehicleVin: vehicleVin ?? this.vehicleVin,
      status: status ?? this.status,
      driverId: driverId ?? this.driverId,
      clientName: clientName ?? this.clientName,
      clientPhone: clientPhone ?? this.clientPhone,
      clientEmail: clientEmail ?? this.clientEmail,
      notes: notes ?? this.notes,
      price: price ?? this.price,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}
