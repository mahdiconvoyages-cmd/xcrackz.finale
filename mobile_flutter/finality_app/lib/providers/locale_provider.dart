import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../utils/logger.dart';

part 'locale_provider.g.dart';

/// Provider Riverpod pour la locale
@riverpod
class LocaleNotifier extends _$LocaleNotifier {
  static const String _localeKey = 'app_locale';

  @override
  Locale build() {
    // Charger la locale sauvegardée
    _loadSavedLocale();
    return const Locale('fr'); // Français par défaut
  }

  Future<void> _loadSavedLocale() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final savedLocale = prefs.getString(_localeKey);
      if (savedLocale != null) {
        state = Locale(savedLocale);
        logger.i('📍 Loaded saved locale: $savedLocale');
      }
    } catch (e) {
      logger.w('⚠️ Could not load saved locale: $e');
    }
  }

  /// Changer la locale
  Future<void> setLocale(Locale locale) async {
    if (state == locale) return;
    
    state = locale;
    
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_localeKey, locale.languageCode);
      logger.i('✅ Locale changed to: ${locale.languageCode}');
    } catch (e) {
      logger.w('⚠️ Could not save locale: $e');
    }
  }

  /// Changer la locale par code de langue
  Future<void> setLocaleByCode(String languageCode) async {
    await setLocale(Locale(languageCode));
  }

  /// Vérifier si la langue est RTL (arabe, hébreu, etc.)
  bool get isRTL {
    return state.languageCode == 'ar' || state.languageCode == 'he';
  }
}

/// Provider simple pour la locale actuelle
final localeProvider = Provider<Locale>((ref) {
  return ref.watch(localeNotifierProvider);
});

/// Provider pour savoir si la langue est RTL
final isRTLProvider = Provider<bool>((ref) {
  final locale = ref.watch(localeNotifierProvider);
  return locale.languageCode == 'ar' || locale.languageCode == 'he';
});
