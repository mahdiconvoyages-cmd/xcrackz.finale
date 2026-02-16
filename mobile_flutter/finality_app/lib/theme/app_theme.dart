import 'package:flutter/material.dart';

class AppTheme {
  // Couleurs principales (identiques à la version Expo)
  static const Color primary = Color(0xFF06B6D4); // cyan-500
  static const Color primaryDark = Color(0xFF0891B2); // cyan-600
  static const Color secondary = Color(0xFF8B5CF6); // violet-500
  static const Color secondaryDark = Color(0xFF7C3AED); // violet-600
  
  // Couleurs de fond (dark theme comme Expo)
  static const Color backgroundDark = Color(0xFF0B1220);
  static const Color backgroundMedium = Color(0xFF0E1930);
  static const Color surfaceDark = Color(0xFF1E293B);
  static const Color surfaceMedium = Color(0xFF334155);
  
  // Couleurs de statut
  static const Color success = Color(0xFF10B981); // green-500
  static const Color successDark = Color(0xFF059669); // green-600
  static const Color warning = Color(0xFFF59E0B); // amber-500
  static const Color warningDark = Color(0xFFD97706); // amber-600
  static const Color error = Color(0xFFEF4444); // red-500
  static const Color info = Color(0xFF3B82F6); // blue-500
  
  // Couleurs de texte
  static const Color textPrimary = Color(0xFFFFFFFF);
  static const Color textSecondary = Color(0xFFE2E8F0);
  static const Color textMuted = Color(0xFF94A3B8);
  
  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      
      // Schéma de couleurs
      colorScheme: const ColorScheme.dark(
        primary: primary,
        secondary: secondary,
        surface: surfaceDark,
        background: backgroundDark,
        error: error,
        onPrimary: Colors.white,
        onSecondary: Colors.white,
        onSurface: textPrimary,
        onBackground: textPrimary,
      ),
      
      // Couleurs de scaffold
      scaffoldBackgroundColor: backgroundDark,
      
      // AppBar
      appBarTheme: const AppBarTheme(
        backgroundColor: backgroundDark,
        foregroundColor: textPrimary,
        elevation: 0,
        centerTitle: true,
        titleTextStyle: TextStyle(
          color: textPrimary,
          fontSize: 20,
          fontWeight: FontWeight.w600,
        ),
      ),
      
      // Cards
      cardTheme: CardThemeData(
        color: surfaceDark,
        elevation: 4,
        shadowColor: Colors.black.withValues(alpha: 0.3),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
      ),
      
      // Boutons
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primary,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          elevation: 2,
          textStyle: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: primary,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          textStyle: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: primary,
          side: const BorderSide(color: primary, width: 2),
          padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          textStyle: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      
      // Input
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: surfaceDark,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: surfaceMedium),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: primary, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: error),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        hintStyle: TextStyle(color: textMuted),
      ),
      
      // Drawer
      drawerTheme: const DrawerThemeData(
        backgroundColor: backgroundDark,
        surfaceTintColor: Colors.transparent,
      ),
      
      // Divider
      dividerTheme: DividerThemeData(
        color: surfaceMedium.withValues(alpha: 0.5),
        thickness: 1,
        space: 1,
      ),
      
      // Typographie
      textTheme: const TextTheme(
        displayLarge: TextStyle(
          fontSize: 32,
          fontWeight: FontWeight.bold,
          color: textPrimary,
        ),
        displayMedium: TextStyle(
          fontSize: 28,
          fontWeight: FontWeight.bold,
          color: textPrimary,
        ),
        displaySmall: TextStyle(
          fontSize: 24,
          fontWeight: FontWeight.w600,
          color: textPrimary,
        ),
        headlineLarge: TextStyle(
          fontSize: 22,
          fontWeight: FontWeight.w600,
          color: textPrimary,
        ),
        headlineMedium: TextStyle(
          fontSize: 20,
          fontWeight: FontWeight.w600,
          color: textPrimary,
        ),
        headlineSmall: TextStyle(
          fontSize: 18,
          fontWeight: FontWeight.w600,
          color: textPrimary,
        ),
        titleLarge: TextStyle(
          fontSize: 18,
          fontWeight: FontWeight.w600,
          color: textPrimary,
        ),
        titleMedium: TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w500,
          color: textPrimary,
        ),
        titleSmall: TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w500,
          color: textSecondary,
        ),
        bodyLarge: TextStyle(
          fontSize: 16,
          color: textSecondary,
        ),
        bodyMedium: TextStyle(
          fontSize: 14,
          color: textSecondary,
        ),
        bodySmall: TextStyle(
          fontSize: 12,
          color: textMuted,
        ),
        labelLarge: TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w600,
          color: textPrimary,
        ),
        labelMedium: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w500,
          color: textSecondary,
        ),
        labelSmall: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w500,
          color: textMuted,
        ),
      ),
    );
  }
  
  // Gradients utilisés dans l'app (comme Expo)
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [primary, primaryDark],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
  
  static const LinearGradient secondaryGradient = LinearGradient(
    colors: [secondary, secondaryDark],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
  
  static const LinearGradient successGradient = LinearGradient(
    colors: [success, successDark],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
  
  static const LinearGradient warningGradient = LinearGradient(
    colors: [warning, warningDark],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
  
  static const LinearGradient backgroundGradient = LinearGradient(
    colors: [backgroundDark, backgroundMedium, backgroundDark],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
  );
  
  // Helper pour obtenir couleur selon statut
  static Color getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'pending':
      case 'en attente':
        return warning;
      case 'in_progress':
      case 'en cours':
        return info;
      case 'completed':
      case 'terminé':
      case 'complétée':
        return success;
      case 'cancelled':
      case 'annulé':
      case 'annulée':
        return error;
      default:
        return textMuted;
    }
  }
  
  // Helper pour gradient selon statut
  static LinearGradient getStatusGradient(String status) {
    switch (status.toLowerCase()) {
      case 'pending':
      case 'en attente':
        return warningGradient;
      case 'in_progress':
      case 'en cours':
        return primaryGradient;
      case 'completed':
      case 'terminé':
      case 'complétée':
        return successGradient;
      case 'cancelled':
      case 'annulé':
      case 'annulée':
        return const LinearGradient(
          colors: [error, Color(0xFFDC2626)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        );
      default:
        return const LinearGradient(
          colors: [textMuted, textMuted],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        );
    }
  }
}
