import 'package:flutter_test/flutter_test.dart';
import 'package:CHECKSFLEET_app/services/offline_service.dart';
import 'package:CHECKSFLEET_app/models/mission.dart';

void main() {
  late OfflineService offlineService;

  setUp(() async {
    offlineService = OfflineService();
    await offlineService.initialize();
  });

  tearDown(() async {
    await offlineService.clearAll();
    await offlineService.close();
  });

  group('OfflineService Cache Tests', () {
    test('should initialize database successfully', () {
      expect(offlineService.isInitialized, isTrue);
    });

    test('should cache and retrieve mission', () async {
      // Arrange
      final mission = Mission(
        id: 'test-mission-1',
        reference: 'MSN001',
        status: 'pending',
        vehicleBrand: 'Toyota',
        vehicleModel: 'Corolla',
        vehiclePlate: 'AB-123-CD',
        pickupAddress: '123 Test St',
        deliveryAddress: '456 Test Ave',
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );

      // Act
      await offlineService.cacheMission(mission);
      final cachedMissions = await offlineService.getCachedMissions();

      // Assert
      expect(cachedMissions.length, 1);
      expect(cachedMissions.first.id, 'test-mission-1');
      expect(cachedMissions.first.reference, 'MSN001');
    });

    test('should filter cached missions by status', () async {
      // Arrange
      final mission1 = Mission(
        id: 'test-1',
        reference: 'MSN001',
        status: 'pending',
        vehicleBrand: 'Toyota',
        vehicleModel: 'Corolla',
        pickupAddress: 'Test',
        deliveryAddress: 'Test',
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );

      final mission2 = Mission(
        id: 'test-2',
        reference: 'MSN002',
        status: 'in_progress',
        vehicleBrand: 'Peugeot',
        vehicleModel: '208',
        pickupAddress: 'Test',
        deliveryAddress: 'Test',
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );

      // Act
      await offlineService.cacheMission(mission1);
      await offlineService.cacheMission(mission2);
      
      final pendingMissions = await offlineService.getCachedMissions(status: 'pending');
      final inProgressMissions = await offlineService.getCachedMissions(status: 'in_progress');

      // Assert
      expect(pendingMissions.length, 1);
      expect(pendingMissions.first.status, 'pending');
      expect(inProgressMissions.length, 1);
      expect(inProgressMissions.first.status, 'in_progress');
    });

    test('should replace cached mission on conflict', () async {
      // Arrange
      final mission1 = Mission(
        id: 'same-id',
        reference: 'MSN001',
        status: 'pending',
        vehicleBrand: 'Toyota',
        vehicleModel: 'Corolla',
        pickupAddress: 'Old Address',
        deliveryAddress: 'Test',
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );

      final mission2 = Mission(
        id: 'same-id',
        reference: 'MSN001',
        status: 'in_progress',
        vehicleBrand: 'Toyota',
        vehicleModel: 'Corolla',
        pickupAddress: 'New Address',
        deliveryAddress: 'Test',
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );

      // Act
      await offlineService.cacheMission(mission1);
      await offlineService.cacheMission(mission2);
      
      final cached = await offlineService.getCachedMissions();

      // Assert
      expect(cached.length, 1);
      expect(cached.first.status, 'in_progress');
      expect(cached.first.pickupAddress, 'New Address');
    });
  });

  group('OfflineService Queue Tests', () {
    test('should add action to queue', () async {
      // Arrange
      final action = OfflineAction(
        type: ActionType.create,
        tableName: 'missions',
        itemId: 'test-id',
        data: {'reference': 'MSN001'},
      );

      // Act
      await offlineService.queueAction(action);

      // Assert
      expect(offlineService.pendingActionsCount, 1);
    });

    test('should sync queue successfully', () async {
      // Arrange
      final action1 = OfflineAction(
        type: ActionType.create,
        tableName: 'missions',
        itemId: 'test-1',
        data: {'reference': 'MSN001'},
      );
      final action2 = OfflineAction(
        type: ActionType.update,
        tableName: 'missions',
        itemId: 'test-2',
        data: {'status': 'in_progress'},
      );

      await offlineService.queueAction(action1);
      await offlineService.queueAction(action2);

      // Act
      await offlineService.syncQueue((action) async {
        // Simuler l'exécution réussie
        return Future.value();
      });

      // Assert
      expect(offlineService.pendingActionsCount, 0);
    });

    test('should retry failed sync', () async {
      // Arrange
      final action = OfflineAction(
        type: ActionType.create,
        tableName: 'missions',
        itemId: 'test-fail',
        data: {'reference': 'MSN001'},
      );

      await offlineService.queueAction(action);

      int executionCount = 0;

      // Act
      await offlineService.syncQueue((action) async {
        executionCount++;
        if (executionCount < 3) {
          throw Exception('Temporary failure');
        }
      });

      // Assert - Devrait avoir réessayé et réussi au 3ème essai
      expect(offlineService.pendingActionsCount, 0);
    });

    test('should remove action after max retries', () async {
      // Arrange
      final action = OfflineAction(
        type: ActionType.create,
        tableName: 'missions',
        itemId: 'test-max-retry',
        data: {'reference': 'MSN001'},
      );

      await offlineService.queueAction(action);

      // Act - Forcer 5 échecs
      for (int i = 0; i < 5; i++) {
        await offlineService.syncQueue((action) async {
          throw Exception('Permanent failure');
        });
      }

      // Assert - Action devrait être supprimée après 5 échecs
      expect(offlineService.pendingActionsCount, 0);
    });
  });

  group('OfflineService Cleanup Tests', () {
    test('should clear all data', () async {
      // Arrange
      final mission = Mission(
        id: 'test-clear',
        reference: 'MSN001',
        status: 'pending',
        vehicleBrand: 'Toyota',
        vehicleModel: 'Corolla',
        pickupAddress: 'Test',
        deliveryAddress: 'Test',
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );

      final action = OfflineAction(
        type: ActionType.create,
        tableName: 'missions',
        itemId: 'test-id',
        data: {},
      );

      await offlineService.cacheMission(mission);
      await offlineService.queueAction(action);

      // Act
      await offlineService.clearAll();

      // Assert
      final cached = await offlineService.getCachedMissions();
      expect(cached.length, 0);
      expect(offlineService.pendingActionsCount, 0);
    });
  });
}
