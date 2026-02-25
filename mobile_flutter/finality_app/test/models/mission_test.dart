import 'package:flutter_test/flutter_test.dart';
import 'package:finality_app/models/mission.dart';

void main() {
  group('Mission model', () {
    final now = DateTime.now();
    final sampleJson = {
      'id': 'abc-123',
      'user_id': 'user-1',
      'reference': 'REF-001',
      'share_code': 'XY12',
      'mandataire_name': 'Jean Dupont',
      'mandataire_company': 'TransportCo',
      'pickup_address': '123 Rue de Paris',
      'delivery_address': '456 Rue de Lyon',
      'pickup_city': 'Paris',
      'delivery_city': 'Lyon',
      'pickup_postal_code': '75001',
      'delivery_postal_code': '69001',
      'pickup_lat': 48.8566,
      'pickup_lng': 2.3522,
      'delivery_lat': 45.7640,
      'delivery_lng': 4.8357,
      'pickup_date': now.toIso8601String(),
      'delivery_date': now.add(const Duration(days: 1)).toIso8601String(),
      'pickup_contact_name': 'Contact A',
      'pickup_contact_phone': '0600000001',
      'delivery_contact_name': 'Contact B',
      'delivery_contact_phone': '0600000002',
      'vehicle_type': 'sedan',
      'vehicle_brand': 'Peugeot',
      'vehicle_model': '308',
      'vehicle_plate': 'AB-123-CD',
      'vehicle_vin': 'VF3XXXXX',
      'vehicle_year': 2022,
      'status': 'pending',
      'driver_id': 'drv-1',
      'assigned_user_id': 'user-2',
      'client_name': 'Client A',
      'client_phone': '0700000001',
      'client_email': 'client@example.com',
      'agent_name': 'Agent X',
      'notes': 'Attention fragile',
      'special_instructions': 'Appeler avant',
      'price': 350.0,
      'public_tracking_link': 'https://example.com/track/abc',
      'report_id': 'rpt-1',
      'has_restitution': false,
      'restitution_pickup_address': null,
      'restitution_delivery_address': null,
      'restitution_vehicle_brand': null,
      'restitution_vehicle_model': null,
      'restitution_vehicle_plate': null,
      'created_at': now.toIso8601String(),
      'updated_at': now.toIso8601String(),
    };

    test('fromJson parses all fields correctly', () {
      final mission = Mission.fromJson(sampleJson);

      expect(mission.id, 'abc-123');
      expect(mission.userId, 'user-1');
      expect(mission.reference, 'REF-001');
      expect(mission.shareCode, 'XY12');
      expect(mission.pickupCity, 'Paris');
      expect(mission.deliveryCity, 'Lyon');
      expect(mission.vehicleBrand, 'Peugeot');
      expect(mission.vehicleModel, '308');
      expect(mission.vehiclePlate, 'AB-123-CD');
      expect(mission.status, 'pending');
      expect(mission.price, 350.0);
      expect(mission.hasRestitution, false);
      expect(mission.assignedToUserId, 'user-2');
      expect(mission.clientEmail, 'client@example.com');
    });

    test('fromJson handles null optionals', () {
      final minimalJson = {
        'id': 'min-1',
        'status': 'in_progress',
        'created_at': now.toIso8601String(),
        'updated_at': now.toIso8601String(),
      };
      final mission = Mission.fromJson(minimalJson);

      expect(mission.id, 'min-1');
      expect(mission.status, 'in_progress');
      expect(mission.userId, isNull);
      expect(mission.reference, isNull);
      expect(mission.pickupLat, isNull);
      expect(mission.price, isNull);
    });

    test('fromJson defaults status to pending when null', () {
      final json = {
        'id': 'x',
        'created_at': now.toIso8601String(),
        'updated_at': now.toIso8601String(),
      };
      final mission = Mission.fromJson(json);
      expect(mission.status, 'pending');
    });

    test('toJson produces valid Map', () {
      final mission = Mission.fromJson(sampleJson);
      final json = mission.toJson();

      expect(json['id'], 'abc-123');
      expect(json['user_id'], 'user-1');
      expect(json['vehicle_brand'], 'Peugeot');
      expect(json['price'], 350.0);
      expect(json['status'], 'pending');
    });

    test('toJson → fromJson round-trip preserves data', () {
      final original = Mission.fromJson(sampleJson);
      final roundTripped = Mission.fromJson(original.toJson());

      expect(roundTripped.id, original.id);
      expect(roundTripped.reference, original.reference);
      expect(roundTripped.pickupCity, original.pickupCity);
      expect(roundTripped.deliveryCity, original.deliveryCity);
      expect(roundTripped.status, original.status);
      expect(roundTripped.price, original.price);
      expect(roundTripped.vehiclePlate, original.vehiclePlate);
    });

    test('copyWith overrides specified fields', () {
      final mission = Mission.fromJson(sampleJson);
      final updated = mission.copyWith(
        status: 'completed',
        price: 500.0,
        deliveryCity: 'Marseille',
      );

      expect(updated.status, 'completed');
      expect(updated.price, 500.0);
      expect(updated.deliveryCity, 'Marseille');
      // unchanged fields
      expect(updated.id, mission.id);
      expect(updated.pickupCity, 'Paris');
      expect(updated.vehicleBrand, 'Peugeot');
    });

    test('copyWith with no args returns equivalent mission', () {
      final mission = Mission.fromJson(sampleJson);
      final copy = mission.copyWith();

      expect(copy.id, mission.id);
      expect(copy.status, mission.status);
      expect(copy == mission, isTrue);
    });

    test('equality based on id', () {
      final m1 = Mission.fromJson(sampleJson);
      final m2 = Mission.fromJson({...sampleJson, 'status': 'completed'});

      expect(m1 == m2, isTrue);
      expect(m1.hashCode, m2.hashCode);
    });

    test('different ids are not equal', () {
      final m1 = Mission.fromJson(sampleJson);
      final m2 = Mission.fromJson({...sampleJson, 'id': 'other-id'});

      expect(m1 == m2, isFalse);
    });
  });
}
