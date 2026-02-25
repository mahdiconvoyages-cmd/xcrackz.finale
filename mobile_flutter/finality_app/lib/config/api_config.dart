// ============================================================
// Centralized API configuration
// All external URLs and endpoints in one place
// ============================================================

class ApiConfig {
  ApiConfig._();

  // ── Supabase ────────────────────────────────────────────────
  static const supabaseUrl = 'https://lqrulgkavtzummbsxsok.supabase.co';
  static const supabaseAnonKey =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxcnVsZ2thdnR6dW1tYnN4c29rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxMTc5OTAsImV4cCI6MjA3NTY5Mzk5MH0.HyY4qR7OLsadOnwITmdn1tAiKyN7AVuNLcuVpLaQfKM';

  // ── French Government APIs ──────────────────────────────────
  /// Address autocomplete & geocoding (free, no key needed)
  static const adresseGouvBase = 'https://api-adresse.data.gouv.fr';

  /// Company search by SIRET/SIREN (free, no key needed)
  static const entreprisesGouvBase = 'https://recherche-entreprises.api.gouv.fr';

  // ── INSEE (SIRET/SIREN validation) ─────────────────────────
  static const inseeBase = 'https://api.insee.fr/entreprises/sirene/V3';

  // ── Routing (OSRM — free, no key needed) ───────────────────
  static const osrmBase = 'https://router.project-osrm.org';

  // ── App domain ─────────────────────────────────────────────
  static const appDomain = 'checksfleet.com';
  static const appBaseUrl = 'https://checksfleet.com';
  static const appWwwUrl = 'https://www.checksfleet.com';
  static const contactEmail = 'contact@checksfleet.com';

  // ── Nominatim / OpenStreetMap (geocoding fallback) ─────────
  static const nominatimBase = 'https://nominatim.openstreetmap.org';
  static const nominatimUserAgent = 'ChecksFleet/1.0 ($contactEmail)';

  // ── Timeouts ───────────────────────────────────────────────
  static const apiTimeout = Duration(seconds: 8);
  static const geocodeTimeout = Duration(seconds: 5);
}
