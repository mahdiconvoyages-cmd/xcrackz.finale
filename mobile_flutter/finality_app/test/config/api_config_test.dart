import 'package:flutter_test/flutter_test.dart';
import 'package:finality_app/config/api_config.dart';

void main() {
  group('ApiConfig', () {
    test('supabaseUrl is non-empty', () {
      expect(ApiConfig.supabaseUrl, isNotEmpty);
      expect(ApiConfig.supabaseUrl, startsWith('https://'));
    });

    test('supabaseAnonKey is non-empty', () {
      expect(ApiConfig.supabaseAnonKey, isNotEmpty);
      expect(ApiConfig.supabaseAnonKey.length, greaterThan(50));
    });

    test('API base URLs are valid HTTPS', () {
      expect(ApiConfig.adresseGouvBase, startsWith('https://'));
      expect(ApiConfig.entreprisesGouvBase, startsWith('https://'));
      expect(ApiConfig.osrmBase, startsWith('https://'));
      expect(ApiConfig.nominatimBase, startsWith('https://'));
    });

    test('appDomain is correct', () {
      expect(ApiConfig.appDomain, 'checksfleet.com');
    });

    test('timeouts are reasonable', () {
      expect(ApiConfig.apiTimeout.inSeconds, greaterThanOrEqualTo(5));
      expect(ApiConfig.geocodeTimeout.inSeconds, greaterThanOrEqualTo(3));
    });
  });
}
