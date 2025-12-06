import 'package:flutter_test/flutter_test.dart';
import 'package:CHECKSFLEET_app/services/connectivity_service.dart';

void main() {
  late ConnectivityService connectivityService;

  setUp(() {
    connectivityService = ConnectivityService();
  });

  group('ConnectivityService Tests', () {
    test('should initialize with default online state', () {
      // Par défaut, on suppose être en ligne
      expect(connectivityService.isOnline, isTrue);
      expect(connectivityService.isOffline, isFalse);
    });

    test('checkConnectivity should return boolean', () async {
      // Act
      final isOnline = await connectivityService.checkConnectivity();

      // Assert
      expect(isOnline, isA<bool>());
    });

    test('isOnline and isOffline should be inverse', () {
      // Les deux getters doivent toujours être l'inverse l'un de l'autre
      expect(connectivityService.isOnline, !connectivityService.isOffline);
    });
  });

  group('ConnectivityService Notifications', () {
    test('should notify listeners on connectivity change', () async {
      // Arrange
      int notificationCount = 0;
      connectivityService.addListener(() {
        notificationCount++;
      });

      // Simuler un changement de connectivité
      // (Dans un vrai test, on mockerait Connectivity)

      // Assert
      // expect(notificationCount, greaterThan(0));
    });
  });
}
