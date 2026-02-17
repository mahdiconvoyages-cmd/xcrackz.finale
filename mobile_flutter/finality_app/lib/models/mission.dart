class Mission {
  final String id;
  final String? userId;
  final String? reference;
  final String? shareCode;
  final String? mandataireName;
  final String? mandataireCompany;
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
  final String? pickupContactName;
  final String? pickupContactPhone;
  final String? deliveryContactName;
  final String? deliveryContactPhone;
  final String? vehicleType;
  final String? vehicleBrand;
  final String? vehicleModel;
  final String? vehiclePlate;
  final String? vehicleVin;
  final int? vehicleYear;
  final String status;
  final String? driverId;
  final String? assignedToUserId;
  final String? clientName;
  final String? clientPhone;
  final String? clientEmail;
  final String? agentName;
  final String? notes;
  final String? specialInstructions;
  final double? price;
  final String? publicTrackingLink;
  final String? reportId;
  final bool hasRestitution;
  final String? restitutionPickupAddress;
  final String? restitutionDeliveryAddress;
  final String? restitutionVehicleBrand;
  final String? restitutionVehicleModel;
  final String? restitutionVehiclePlate;
  final DateTime createdAt;
  final DateTime updatedAt;

  Mission({
    required this.id,
    this.userId,
    this.reference,
    this.shareCode,
    this.mandataireName,
    this.mandataireCompany,
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
    this.pickupContactName,
    this.pickupContactPhone,
    this.deliveryContactName,
    this.deliveryContactPhone,
    this.vehicleType,
    this.vehicleBrand,
    this.vehicleModel,
    this.vehiclePlate,
    this.vehicleVin,
    this.vehicleYear,
    required this.status,
    this.driverId,
    this.assignedToUserId,
    this.clientName,
    this.clientPhone,
    this.clientEmail,
    this.agentName,
    this.notes,
    this.specialInstructions,
    this.price,
    this.publicTrackingLink,
    this.reportId,
    this.hasRestitution = false,
    this.restitutionPickupAddress,
    this.restitutionDeliveryAddress,
    this.restitutionVehicleBrand,
    this.restitutionVehicleModel,
    this.restitutionVehiclePlate,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Mission.fromJson(Map<String, dynamic> json) {
    return Mission(
      id: json['id'] as String,
      userId: json['user_id'] as String?,
      reference: json['reference'] as String?,
      shareCode: json['share_code'] as String?,
      mandataireName: json['mandataire_name'] as String?,
      mandataireCompany: json['mandataire_company'] as String?,
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
      pickupContactName: json['pickup_contact_name'] as String?,
      pickupContactPhone: json['pickup_contact_phone'] as String?,
      deliveryContactName: json['delivery_contact_name'] as String?,
      deliveryContactPhone: json['delivery_contact_phone'] as String?,
      vehicleType: json['vehicle_type'] as String?,
      vehicleBrand: json['vehicle_brand'] as String?,
      vehicleModel: json['vehicle_model'] as String?,
      vehiclePlate: json['vehicle_plate'] as String?,
      vehicleVin: json['vehicle_vin'] as String?,
      vehicleYear: json['vehicle_year'] != null ? (json['vehicle_year'] as num).toInt() : null,
      status: json['status'] as String? ?? 'pending',
      driverId: json['driver_id'] as String?,
      assignedToUserId: json['assigned_to_user_id'] as String?,
      clientName: json['client_name'] as String?,
      clientPhone: json['client_phone'] as String?,
      clientEmail: json['client_email'] as String?,
      agentName: json['agent_name'] as String?,
      notes: json['notes'] as String?,
      specialInstructions: json['special_instructions'] as String?,
      price: json['price'] != null ? (json['price'] as num).toDouble() : null,
      publicTrackingLink: json['public_tracking_link'] as String?,
      reportId: json['report_id'] as String?,
      hasRestitution: json['has_restitution'] == true,
      restitutionPickupAddress: json['restitution_pickup_address'] as String?,
      restitutionDeliveryAddress: json['restitution_delivery_address'] as String?,
      restitutionVehicleBrand: json['restitution_vehicle_brand'] as String?,
      restitutionVehicleModel: json['restitution_vehicle_model'] as String?,
      restitutionVehiclePlate: json['restitution_vehicle_plate'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'user_id': userId,
      'reference': reference,
      'share_code': shareCode,
      'mandataire_name': mandataireName,
      'mandataire_company': mandataireCompany,
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
      'pickup_contact_name': pickupContactName,
      'pickup_contact_phone': pickupContactPhone,
      'delivery_contact_name': deliveryContactName,
      'delivery_contact_phone': deliveryContactPhone,
      'vehicle_type': vehicleType,
      'vehicle_brand': vehicleBrand,
      'vehicle_model': vehicleModel,
      'vehicle_plate': vehiclePlate,
      'vehicle_vin': vehicleVin,
      'vehicle_year': vehicleYear,
      'status': status,
      'driver_id': driverId,
      'assigned_to_user_id': assignedToUserId,
      'client_name': clientName,
      'client_phone': clientPhone,
      'client_email': clientEmail,
      'agent_name': agentName,
      'notes': notes,
      'special_instructions': specialInstructions,
      'price': price,
      'has_restitution': hasRestitution,
      'restitution_pickup_address': restitutionPickupAddress,
      'restitution_delivery_address': restitutionDeliveryAddress,
      'restitution_vehicle_brand': restitutionVehicleBrand,
      'restitution_vehicle_model': restitutionVehicleModel,
      'restitution_vehicle_plate': restitutionVehiclePlate,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }

  Mission copyWith({
    String? id,
    String? userId,
    String? reference,
    String? shareCode,
    String? mandataireName,
    String? mandataireCompany,
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
    String? pickupContactName,
    String? pickupContactPhone,
    String? deliveryContactName,
    String? deliveryContactPhone,
    String? vehicleType,
    String? vehicleBrand,
    String? vehicleModel,
    String? vehiclePlate,
    String? vehicleVin,
    int? vehicleYear,
    String? status,
    String? driverId,
    String? clientName,
    String? clientPhone,
    String? clientEmail,
    String? agentName,
    String? notes,
    String? specialInstructions,
    double? price,
    String? publicTrackingLink,
    String? reportId,
    bool? hasRestitution,
    String? restitutionPickupAddress,
    String? restitutionDeliveryAddress,
    String? restitutionVehicleBrand,
    String? restitutionVehicleModel,
    String? restitutionVehiclePlate,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return Mission(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      reference: reference ?? this.reference,
      shareCode: shareCode ?? this.shareCode,
      mandataireName: mandataireName ?? this.mandataireName,
      mandataireCompany: mandataireCompany ?? this.mandataireCompany,
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
      pickupContactName: pickupContactName ?? this.pickupContactName,
      pickupContactPhone: pickupContactPhone ?? this.pickupContactPhone,
      deliveryContactName: deliveryContactName ?? this.deliveryContactName,
      deliveryContactPhone: deliveryContactPhone ?? this.deliveryContactPhone,
      vehicleType: vehicleType ?? this.vehicleType,
      vehicleBrand: vehicleBrand ?? this.vehicleBrand,
      vehicleModel: vehicleModel ?? this.vehicleModel,
      vehiclePlate: vehiclePlate ?? this.vehiclePlate,
      vehicleVin: vehicleVin ?? this.vehicleVin,
      vehicleYear: vehicleYear ?? this.vehicleYear,
      status: status ?? this.status,
      driverId: driverId ?? this.driverId,
      clientName: clientName ?? this.clientName,
      clientPhone: clientPhone ?? this.clientPhone,
      clientEmail: clientEmail ?? this.clientEmail,
      agentName: agentName ?? this.agentName,
      notes: notes ?? this.notes,
      specialInstructions: specialInstructions ?? this.specialInstructions,
      price: price ?? this.price,
      publicTrackingLink: publicTrackingLink ?? this.publicTrackingLink,
      reportId: reportId ?? this.reportId,
      hasRestitution: hasRestitution ?? this.hasRestitution,
      restitutionPickupAddress: restitutionPickupAddress ?? this.restitutionPickupAddress,
      restitutionDeliveryAddress: restitutionDeliveryAddress ?? this.restitutionDeliveryAddress,
      restitutionVehicleBrand: restitutionVehicleBrand ?? this.restitutionVehicleBrand,
      restitutionVehicleModel: restitutionVehicleModel ?? this.restitutionVehicleModel,
      restitutionVehiclePlate: restitutionVehiclePlate ?? this.restitutionVehiclePlate,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}
