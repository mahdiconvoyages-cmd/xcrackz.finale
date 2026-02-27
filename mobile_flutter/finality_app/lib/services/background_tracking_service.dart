// Conditional export: web = stub, native = full implementation
export 'background_tracking_service_impl.dart'
    if (dart.library.html) 'background_tracking_service_web.dart';
