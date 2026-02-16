import 'package:flutter/material.dart';

/// Premium UI Helper avec ombres et animations
class PremiumUIHelper {
  /// Décoration de carte avec ombres optimisées
  static BoxDecoration cardDecoration({
    Color? backgroundColor,
    Color? shadowColor,
    double? borderRadius,
    Gradient? gradient,
  }) {
    return BoxDecoration(
      color: backgroundColor ?? Colors.white,
      gradient: gradient,
      borderRadius: BorderRadius.circular(borderRadius ?? 16),
      boxShadow: [
        BoxShadow(
          color: (shadowColor ?? Colors.blue).withValues(alpha: 0.15),
          blurRadius: 12,
          offset: const Offset(0, 6),
          spreadRadius: 1,
        ),
        BoxShadow(
          color: Colors.black.withValues(alpha: 0.05),
          blurRadius: 4,
          offset: const Offset(0, 2),
        ),
      ],
    );
  }

  /// Style de texte avec ombre pour meilleure lisibilité
  static TextStyle textWithShadow({
    required TextStyle baseStyle,
    double shadowOpacity = 0.1,
    Offset shadowOffset = const Offset(0, 1),
    double shadowBlur = 2,
  }) {
    return baseStyle.copyWith(
      shadows: [
        Shadow(
          color: Colors.black.withOpacity(shadowOpacity),
          offset: shadowOffset,
          blurRadius: shadowBlur,
        ),
      ],
    );
  }

  /// Titre de carte avec ombre
  static TextStyle cardTitle({
    Color color = const Color(0xFF1A1A1A),
    double fontSize = 18,
    FontWeight fontWeight = FontWeight.bold,
  }) {
    return textWithShadow(
      baseStyle: TextStyle(
        color: color,
        fontSize: fontSize,
        fontWeight: fontWeight,
      ),
      shadowOpacity: 0.1,
      shadowOffset: const Offset(0, 1),
      shadowBlur: 3,
    );
  }

  /// Sous-titre de carte
  static TextStyle cardSubtitle({
    Color color = const Color(0xFF6B7280),
    double fontSize = 14,
    FontWeight fontWeight = FontWeight.w600,
  }) {
    return TextStyle(
      color: color,
      fontSize: fontSize,
      fontWeight: fontWeight,
    );
  }

  /// Décoration de bouton avec ombres
  static BoxDecoration buttonDecoration({
    required List<Color> gradientColors,
    double borderRadius = 12,
  }) {
    return BoxDecoration(
      gradient: LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: gradientColors,
      ),
      borderRadius: BorderRadius.circular(borderRadius),
      boxShadow: [
        BoxShadow(
          color: gradientColors.first.withValues(alpha: 0.4),
          blurRadius: 16,
          offset: const Offset(0, 8),
          spreadRadius: 1,
        ),
        BoxShadow(
          color: Colors.black.withValues(alpha: 0.1),
          blurRadius: 4,
          offset: const Offset(0, 2),
        ),
      ],
    );
  }

  /// Décoration de badge/chip
  static BoxDecoration chipDecoration({
    required Color color,
    double borderRadius = 12,
  }) {
    return BoxDecoration(
      color: color.withValues(alpha: 0.15),
      borderRadius: BorderRadius.circular(borderRadius),
      boxShadow: [
        BoxShadow(
          color: color.withValues(alpha: 0.3),
          blurRadius: 6,
          offset: const Offset(0, 3),
        ),
      ],
    );
  }

  /// AppBar avec gradient et ombre
  static PreferredSizeWidget appBar({
    required String title,
    List<Widget>? actions,
    Widget? leading,
    PreferredSizeWidget? bottom,
    List<Color>? gradientColors,
  }) {
    return AppBar(
      flexibleSpace: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: gradientColors ?? [
              const Color(0xFF14B8A6),
              const Color(0xFF0066FF),
              const Color(0xFF4F46E5),
            ],
          ),
        ),
      ),
      title: Text(
        title,
        style: textWithShadow(
          baseStyle: const TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: 22,
            letterSpacing: 0.5,
            color: Colors.white,
          ),
          shadowOpacity: 0.3,
          shadowOffset: const Offset(0, 2),
          shadowBlur: 4,
        ),
      ),
      centerTitle: false,
      elevation: 0,
      actions: actions,
      leading: leading,
      bottom: bottom,
    );
  }

  /// Container de statistique avec icône
  static Widget statCard({
    required IconData icon,
    required String label,
    required String value,
    required Color color,
  }) {
    return Container(
      decoration: cardDecoration(shadowColor: color),
      padding: const EdgeInsets.all(20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: chipDecoration(color: color),
            child: Icon(icon, color: color, size: 28),
          ),
          const SizedBox(height: 12),
          Text(
            value,
            style: textWithShadow(
              baseStyle: const TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.bold,
                color: Color(0xFF1A1A1A),
              ),
              shadowOpacity: 0.1,
              shadowOffset: const Offset(0, 2),
              shadowBlur: 4,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: const TextStyle(
              color: Color(0xFF6B7280),
              fontWeight: FontWeight.w600,
              fontSize: 12,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  /// Animation de fade in
  static Widget fadeIn({
    required Widget child,
    Duration delay = Duration.zero,
    Duration duration = const Duration(milliseconds: 500),
  }) {
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0.0, end: 1.0),
      duration: duration,
      builder: (context, value, child) {
        return Opacity(
          opacity: value,
          child: Transform.translate(
            offset: Offset(0, 20 * (1 - value)),
            child: child,
          ),
        );
      },
      child: child,
    );
  }
}
