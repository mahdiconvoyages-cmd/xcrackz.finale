import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// 🎨 THÈME PREMIUM FINALITY
/// Design moderne clair inspiré des apps modernes - fond blanc, texte noir

class PremiumTheme {
  // ============================================
  // COULEURS PRINCIPALES - THÈME CLAIR
  // ============================================
  
  static const Color primaryBlue = Color(0xFF0066FF);
  static const Color primaryIndigo = Color(0xFF5B8DEF);
  static const Color primaryPurple = Color(0xFF8B7EE8);
  static const Color primaryTeal = Color(0xFF14B8A6);

  /// Brand violet — used for CTAs, FABs, and navigation highlights.
  static const Color brandViolet = Color(0xFF8B5CF6);
  
  static const Color accentGreen = Color(0xFF10B981);
  static const Color accentAmber = Color(0xFFF59E0B);
  static const Color accentRed = Color(0xFFEF4444);
  static const Color accentPink = Color(0xFFEC4899);
  
  // Extended palette — frequently used across screens
  static const Color accentBlue = Color(0xFF3B82F6);
  static const Color indigo500 = Color(0xFF6366F1);
  static const Color purpleAccent = Color(0xFF9333EA);
  static const Color darkSlate = Color(0xFF1E293B);
  static const Color textMuted = Color(0xFF94A3B8);
  static const Color slate300 = Color(0xFFCBD5E1);
  
  // Backgrounds - Thème clair
  static const Color lightBg = Color(0xFFF8F9FA);
  static const Color cardBg = Color(0xFFFFFFFF);
  static const Color cardBgLight = Color(0xFFF5F7FA);
  
  // Alias pour compatibilité avec l'ancien thème
  static const Color darkBg = lightBg;
  
  // Text - Thème clair
  static const Color textPrimary = Color(0xFF1A1A1A);
  static const Color textSecondary = Color(0xFF6B7280);
  static const Color textTertiary = Color(0xFF9CA3AF);

  // ============================================
  // GRADIENTS
  // ============================================
  
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [primaryBlue, primaryIndigo, primaryPurple],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
  
  static const LinearGradient tealGradient = LinearGradient(
    colors: [Color(0xFF14B8A6), Color(0xFF0D9488), Color(0xFF0F766E)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
  
  static const LinearGradient greenGradient = LinearGradient(
    colors: [Color(0xFF10B981), Color(0xFF059669)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
  
  static const LinearGradient amberGradient = LinearGradient(
    colors: [Color(0xFFF59E0B), Color(0xFFD97706)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
  
  static const LinearGradient redGradient = LinearGradient(
    colors: [Color(0xFFEF4444), Color(0xFFDC2626)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
  
  static const LinearGradient purpleGradient = LinearGradient(
    colors: [Color(0xFF8B5CF6), Color(0xFF7C3AED)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  // ============================================
  // GLASSMORPHISM
  // ============================================
  
  static BoxDecoration glassCard({
    Color? color,
    double blur = 10,
    double opacity = 1.0,
  }) {
    return BoxDecoration(
      color: color ?? cardBg,
      borderRadius: BorderRadius.circular(16),
      border: Border.all(
        color: const Color(0xFFE5E7EB),
        width: 1,
      ),
      boxShadow: [
        BoxShadow(
          color: Colors.black.withValues(alpha: 0.04),
          blurRadius: blur,
          offset: const Offset(0, 2),
        ),
      ],
    );
  }
  
  static BoxDecoration glassCardWithGradient(Gradient gradient) {
    return BoxDecoration(
      gradient: gradient,
      borderRadius: BorderRadius.circular(20),
      border: Border.all(
        color: Colors.white.withValues(alpha: 0.3),
        width: 2,
      ),
      boxShadow: [
        BoxShadow(
          color: Colors.black.withValues(alpha: 0.2),
          blurRadius: 20,
          offset: const Offset(0, 8),
        ),
      ],
    );
  }

  // ============================================
  // NEUMORPHISM
  // ============================================
  
  static BoxDecoration neumorphicCard({
    Color? color,
    bool pressed = false,
    Brightness brightness = Brightness.light,
  }) {
    final isLight = brightness == Brightness.light;
    return BoxDecoration(
      color: color ?? (isLight ? cardBg : const Color(0xFF1E1E1E)),
      borderRadius: BorderRadius.circular(20),
      boxShadow: pressed
          ? [
              BoxShadow(
                color: Colors.black.withValues(alpha: isLight ? 0.1 : 0.2),
                blurRadius: 10,
                offset: const Offset(2, 2),
              ),
            ]
          : [
              BoxShadow(
                color: isLight
                    ? Colors.white.withValues(alpha: 0.8)
                    : Colors.white.withValues(alpha: 0.05),
                blurRadius: 10,
                offset: const Offset(-5, -5),
              ),
              BoxShadow(
                color: isLight
                    ? Colors.black.withValues(alpha: 0.08)
                    : Colors.black.withValues(alpha: 0.3),
                blurRadius: 10,
                offset: const Offset(5, 5),
              ),
            ],
    );
  }

  // ============================================
  // SHADOWS
  // ============================================
  
  static List<BoxShadow> softShadow = [
    BoxShadow(
      color: Colors.black.withValues(alpha: 0.08),
      blurRadius: 12,
      offset: const Offset(0, 4),
    ),
  ];
  
  static List<BoxShadow> mediumShadow = [
    BoxShadow(
      color: Colors.black.withValues(alpha: 0.15),
      blurRadius: 20,
      offset: const Offset(0, 8),
    ),
  ];
  
  static List<BoxShadow> strongShadow = [
    BoxShadow(
      color: Colors.black.withValues(alpha: 0.25),
      blurRadius: 30,
      offset: const Offset(0, 12),
    ),
  ];
  
  static List<BoxShadow> glowShadow(Color color) {
    return [
      BoxShadow(
        color: color.withValues(alpha: 0.5),
        blurRadius: 20,
        offset: const Offset(0, 0),
      ),
    ];
  }

  // ============================================
  // ANIMATIONS
  // ============================================
  
  static const Duration fastAnimation = Duration(milliseconds: 200);
  static const Duration normalAnimation = Duration(milliseconds: 300);
  static const Duration slowAnimation = Duration(milliseconds: 500);
  
  static const Curve defaultCurve = Curves.easeInOutCubic;
  static const Curve bounceCurve = Curves.elasticOut;
  static const Curve smoothCurve = Curves.easeOutQuart;

  // ============================================
  // SPACINGS
  // ============================================
  
  static const double spaceXS = 4.0;
  static const double spaceSM = 8.0;
  static const double spaceMD = 16.0;
  static const double spaceLG = 24.0;
  static const double spaceXL = 32.0;
  static const double space2XL = 48.0;
  static const double space3XL = 64.0;

  // ============================================
  // BORDER RADIUS
  // ============================================
  
  static const double radiusSM = 8.0;
  static const double radiusMD = 12.0;
  static const double radiusLG = 16.0;
  static const double radiusXL = 20.0;
  static const double radius2XL = 24.0;
  static const double radiusFull = 9999.0;

  // ============================================
  // TYPOGRAPHY
  // ============================================
  
  static const TextStyle heading1 = TextStyle(
    fontSize: 32,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.5,
    color: textPrimary,
    height: 1.2,
  );
  
  static const TextStyle heading2 = TextStyle(
    fontSize: 28,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.3,
    color: textPrimary,
    height: 1.3,
  );
  
  static const TextStyle heading3 = TextStyle(
    fontSize: 24,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.2,
    color: textPrimary,
    height: 1.4,
  );
  
  static const TextStyle heading4 = TextStyle(
    fontSize: 20,
    fontWeight: FontWeight.w600,
    color: textPrimary,
    height: 1.4,
  );
  
  static const TextStyle bodyLarge = TextStyle(
    fontSize: 18,
    fontWeight: FontWeight.normal,
    color: textPrimary,
    height: 1.5,
  );
  
  static const TextStyle body = TextStyle(
    fontSize: 16,
    fontWeight: FontWeight.normal,
    color: textPrimary,
    height: 1.5,
  );
  
  static const TextStyle bodySmall = TextStyle(
    fontSize: 14,
    fontWeight: FontWeight.normal,
    color: textSecondary,
    height: 1.5,
  );
  
  static const TextStyle caption = TextStyle(
    fontSize: 12,
    fontWeight: FontWeight.normal,
    color: textTertiary,
    height: 1.4,
  );
  
  static const TextStyle label = TextStyle(
    fontSize: 14,
    fontWeight: FontWeight.w600,
    color: textPrimary,
    letterSpacing: 0.5,
  );

  // ============================================
  // THEME DATA - THÈME CLAIR MODERNE
  // ============================================
  
  static ThemeData get lightTheme => _lightTheme;

  /// Dark theme — proper Material3 dark mode
  static ThemeData get darkTheme => _darkTheme;

  static final ThemeData _lightTheme = ThemeData(
    useMaterial3: true,
    brightness: Brightness.light,
    scaffoldBackgroundColor: lightBg,
    
    colorScheme: const ColorScheme.light(
      primary: primaryBlue,
      secondary: primaryTeal,
      tertiary: primaryPurple,
      surface: cardBg,
      error: accentRed,
      onPrimary: Colors.white,
      onSecondary: Colors.white,
      onSurface: textPrimary,
      onError: Colors.white,
    ),
    
    appBarTheme: const AppBarTheme(
      backgroundColor: Colors.white,
      elevation: 0,
      centerTitle: false,
      systemOverlayStyle: SystemUiOverlayStyle.dark,
      titleTextStyle: TextStyle(
        color: textPrimary,
        fontSize: 20,
        fontWeight: FontWeight.w600,
      ),
      iconTheme: IconThemeData(color: textPrimary),
    ),
    
    cardTheme: CardThemeData(
      color: cardBg,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(radiusXL),
      ),
      clipBehavior: Clip.antiAlias,
    ),
    
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: const Color(0xFFDEEAFF),
        foregroundColor: primaryBlue,
        elevation: 0,
        padding: const EdgeInsets.symmetric(horizontal: spaceLG, vertical: spaceMD),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        textStyle: const TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w600,
          letterSpacing: 0.3,
        ),
      ),
    ),
    
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: primaryBlue,
        padding: const EdgeInsets.symmetric(horizontal: spaceMD, vertical: spaceSM),
        textStyle: const TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w600,
        ),
      ),
    ),
    
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFFE5E7EB)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFFE5E7EB)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: primaryBlue, width: 2),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: accentRed),
      ),
      contentPadding: const EdgeInsets.symmetric(
        horizontal: spaceMD,
        vertical: spaceMD,
      ),
      hintStyle: const TextStyle(color: textTertiary),
    ),
    
    floatingActionButtonTheme: const FloatingActionButtonThemeData(
      backgroundColor: primaryBlue,
      foregroundColor: Colors.white,
      elevation: 4,
    ),
    
    bottomNavigationBarTheme: BottomNavigationBarThemeData(
      backgroundColor: Colors.white,
      selectedItemColor: primaryBlue,
      unselectedItemColor: textTertiary,
      type: BottomNavigationBarType.fixed,
      elevation: 8,
      selectedLabelStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
      unselectedLabelStyle: const TextStyle(fontSize: 12),
    ),
    
    dividerTheme: const DividerThemeData(
      color: Color(0xFFE5E7EB),
      thickness: 1,
      space: 1,
    ),
    
    chipTheme: ChipThemeData(
      backgroundColor: const Color(0xFFF3F4F6),
      selectedColor: const Color(0xFFDEEAFF),
      padding: const EdgeInsets.symmetric(horizontal: spaceMD, vertical: spaceSM),
      labelStyle: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: textPrimary),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(radiusFull),
      ),
    ),
  );

  // ============================================
  // THEME DATA - DARK MODE
  // ============================================

  static const Color _darkBg = Color(0xFF121212);
  static const Color _darkCard = Color(0xFF1E1E1E);
  static const Color _darkSurface = Color(0xFF2C2C2C);

  static final ThemeData _darkTheme = ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    scaffoldBackgroundColor: _darkBg,

    colorScheme: const ColorScheme.dark(
      primary: primaryBlue,
      secondary: primaryTeal,
      tertiary: primaryPurple,
      surface: _darkCard,
      error: accentRed,
      onPrimary: Colors.white,
      onSecondary: Colors.white,
      onSurface: Colors.white,
      onError: Colors.white,
    ),

    appBarTheme: const AppBarTheme(
      backgroundColor: _darkCard,
      elevation: 0,
      centerTitle: false,
      systemOverlayStyle: SystemUiOverlayStyle.light,
      titleTextStyle: TextStyle(
        color: Colors.white,
        fontSize: 20,
        fontWeight: FontWeight.w600,
      ),
      iconTheme: IconThemeData(color: Colors.white),
    ),

    cardTheme: CardThemeData(
      color: _darkCard,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(radiusXL),
      ),
      clipBehavior: Clip.antiAlias,
    ),

    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: const Color(0xFF1A3A6B),
        foregroundColor: primaryBlue,
        elevation: 0,
        padding: const EdgeInsets.symmetric(horizontal: spaceLG, vertical: spaceMD),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        textStyle: const TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w600,
          letterSpacing: 0.3,
        ),
      ),
    ),

    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: primaryBlue,
        padding: const EdgeInsets.symmetric(horizontal: spaceMD, vertical: spaceSM),
        textStyle: const TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w600,
        ),
      ),
    ),

    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: _darkSurface,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFF404040)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFF404040)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: primaryBlue, width: 2),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: accentRed),
      ),
      contentPadding: const EdgeInsets.symmetric(
        horizontal: spaceMD,
        vertical: spaceMD,
      ),
      hintStyle: const TextStyle(color: Color(0xFF757575)),
    ),

    floatingActionButtonTheme: const FloatingActionButtonThemeData(
      backgroundColor: primaryBlue,
      foregroundColor: Colors.white,
      elevation: 4,
    ),

    bottomNavigationBarTheme: BottomNavigationBarThemeData(
      backgroundColor: _darkCard,
      selectedItemColor: primaryBlue,
      unselectedItemColor: const Color(0xFF757575),
      type: BottomNavigationBarType.fixed,
      elevation: 8,
      selectedLabelStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
      unselectedLabelStyle: const TextStyle(fontSize: 12),
    ),

    dividerTheme: const DividerThemeData(
      color: Color(0xFF404040),
      thickness: 1,
      space: 1,
    ),

    chipTheme: ChipThemeData(
      backgroundColor: _darkSurface,
      selectedColor: const Color(0xFF1A3A6B),
      padding: const EdgeInsets.symmetric(horizontal: spaceMD, vertical: spaceSM),
      labelStyle: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Colors.white),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(radiusFull),
      ),
    ),
  );

  // ============================================
  // HELPER METHODS
  // ============================================
  
  /// Génère un gradient personnalisé
  static LinearGradient customGradient(List<Color> colors) {
    return LinearGradient(
      colors: colors,
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
    );
  }
  
  /// Crée une bordure gradient (simulated avec Container imbriqués)
  static Widget gradientBorder({
    required Widget child,
    required Gradient gradient,
    double width = 2,
    double radius = 16,
  }) {
    return Container(
      decoration: BoxDecoration(
        gradient: gradient,
        borderRadius: BorderRadius.circular(radius),
      ),
      child: Container(
        margin: EdgeInsets.all(width),
        decoration: BoxDecoration(
          color: cardBg,
          borderRadius: BorderRadius.circular(radius - width),
        ),
        child: child,
      ),
    );
  }
  
  /// Shimmer loading placeholder gradient — adapts to theme brightness.
  static BoxDecoration shimmerGradient({Brightness brightness = Brightness.light}) {
    final isLight = brightness == Brightness.light;
    return BoxDecoration(
      borderRadius: BorderRadius.circular(8),
      gradient: LinearGradient(
        colors: isLight
            ? [
                const Color(0xFFE5E7EB),
                const Color(0xFFF3F4F6),
                const Color(0xFFE5E7EB),
              ]
            : [
                Colors.white.withValues(alpha: 0.05),
                Colors.white.withValues(alpha: 0.1),
                Colors.white.withValues(alpha: 0.05),
              ],
        stops: const [0.0, 0.5, 1.0],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      ),
    );
  }
}
