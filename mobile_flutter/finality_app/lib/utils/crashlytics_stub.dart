// Web stub for firebase_crashlytics (not supported on web platform).
// Imported via conditional import in main.dart:
//   import 'package:firebase_crashlytics/firebase_crashlytics.dart'
//       if (dart.library.html) 'utils/crashlytics_stub.dart';
import 'package:flutter/foundation.dart' show FlutterErrorDetails;

class FirebaseCrashlytics {
  static final FirebaseCrashlytics instance = FirebaseCrashlytics._();
  FirebaseCrashlytics._();

  void recordFlutterFatalError(FlutterErrorDetails details) {}
  void recordFlutterError(FlutterErrorDetails details) {}
  Future<void> recordError(dynamic exception, StackTrace? stack, {bool fatal = false}) async {}
  Future<void> setCustomKey(String key, Object value) async {}
  Future<void> log(String message) async {}
}
