import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/annotations.dart';
import 'package:mockito/mockito.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:CHECKSFLEET_app/services/mission_service.dart';
import 'package:CHECKSFLEET_app/models/mission.dart';

// Générer les mocks avec: flutter pub run build_runner build
@GenerateMocks([SupabaseClient, GoTrueClient, PostgrestQueryBuilder])
import 'mission_service_test.mocks.dart';

void main() {
  late MissionService missionService;
  late MockSupabaseClient mockClient;
  late MockGoTrueClient mockAuth;

  setUp(() {
    mockClient = MockSupabaseClient();
    mockAuth = MockGoTrueClient();
    
    // Configuration des mocks
    when(mockClient.auth).thenReturn(mockAuth);
    when(mockAuth.currentUser).thenReturn(
      User(
        id: 'test-user-id',
        appMetadata: {},
        userMetadata: {},
        aud: 'authenticated',
        createdAt: DateTime.now().toIso8601String(),
      ),
    );

    missionService = MissionService();
  });

  group('MissionService Tests', () {
    test('getMissions should return list of missions', () async {
      // Arrange
      final mockData = [
        {
          'id': '1',
          'reference': 'MSN001',
          'status': 'pending',
          'vehicle_brand': 'Toyota',
          'vehicle_model': 'Corolla',
          'vehicle_plate': 'AB-123-CD',
          'pickup_address': '123 Rue Test',
          'delivery_address': '456 Ave Test',
          'created_at': DateTime.now().toIso8601String(),
        },
        {
          'id': '2',
          'reference': 'MSN002',
          'status': 'in_progress',
          'vehicle_brand': 'Peugeot',
          'vehicle_model': '208',
          'vehicle_plate': 'EF-456-GH',
          'pickup_address': '789 Blvd Test',
          'delivery_address': '012 Rue Test',
          'created_at': DateTime.now().toIso8601String(),
        },
      ];

      // Note: Dans un vrai test, il faudrait mocker toute la chaîne Supabase
      // Ceci est un exemple de structure de test

      // Assert
      // expect(missions, isA<List<Mission>>());
      // expect(missions.length, 2);
      // expect(missions[0].reference, 'MSN001');
    });

    test('getMissions with status filter should return filtered missions', () async {
      // Arrange
      const status = 'pending';

      // Act & Assert
      // Tester que le filtre est bien appliqué
    });

    test('createMission should return created mission', () async {
      // Arrange
      final missionData = {
        'reference': 'MSN003',
        'status': 'pending',
        'vehicle_brand': 'Renault',
        'vehicle_model': 'Clio',
        'pickup_address': 'Test Pickup',
        'delivery_address': 'Test Delivery',
      };

      // Act & Assert
      // Tester la création
    });

    test('updateMission should return updated mission', () async {
      // Arrange
      const missionId = 'test-mission-id';
      final updates = {
        'status': 'in_progress',
        'updated_at': DateTime.now().toIso8601String(),
      };

      // Act & Assert
      // Tester la mise à jour
    });

    test('getMissions should throw when user not logged in', () async {
      // Arrange
      when(mockAuth.currentUser).thenReturn(null);

      // Act & Assert
      expect(
        () => missionService.getMissions(),
        throwsA(isA<Exception>()),
      );
    });
  });

  group('Mission Model Tests', () {
    test('Mission.fromJson should parse correctly', () {
      // Arrange
      final json = {
        'id': 'test-id',
        'reference': 'MSN001',
        'status': 'pending',
        'vehicle_brand': 'Toyota',
        'vehicle_model': 'Corolla',
        'vehicle_plate': 'AB-123-CD',
        'pickup_address': '123 Rue Test',
        'delivery_address': '456 Ave Test',
        'created_at': DateTime.now().toIso8601String(),
      };

      // Act
      final mission = Mission.fromJson(json);

      // Assert
      expect(mission.id, 'test-id');
      expect(mission.reference, 'MSN001');
      expect(mission.status, 'pending');
      expect(mission.vehicleBrand, 'Toyota');
      expect(mission.vehicleModel, 'Corolla');
    });

    test('Mission.toJson should serialize correctly', () {
      // Arrange
      final mission = Mission(
        id: 'test-id',
        reference: 'MSN001',
        status: 'pending',
        vehicleBrand: 'Toyota',
        vehicleModel: 'Corolla',
        vehiclePlate: 'AB-123-CD',
        pickupAddress: '123 Rue Test',
        deliveryAddress: '456 Ave Test',
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );

      // Act
      final json = mission.toJson();

      // Assert
      expect(json['id'], 'test-id');
      expect(json['reference'], 'MSN001');
      expect(json['status'], 'pending');
      expect(json['vehicle_brand'], 'Toyota');
    });
  });
}
