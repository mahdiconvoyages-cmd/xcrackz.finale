import 'package:flutter/material.dart';
import '../theme/premium_theme.dart';

/// Reusable empty-state illustration widget.
///
/// Shows an icon inside a gradient circle, a title, a subtitle,
/// and an optional action button.
class EmptyStateWidget extends StatelessWidget {
  /// Icon displayed inside the gradient circle.
  final IconData icon;

  /// Primary colour used for the icon and gradient.
  final Color color;

  /// Bold headline, e.g. "Aucune mission en cours".
  final String title;

  /// Secondary description text.
  final String subtitle;

  /// Optional CTA label — if non-null an elevated button is shown.
  final String? actionLabel;

  /// Callback for the optional CTA button.
  final VoidCallback? onAction;

  const EmptyStateWidget({
    super.key,
    required this.icon,
    required this.color,
    required this.title,
    required this.subtitle,
    this.actionLabel,
    this.onAction,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 48),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Gradient circle with icon
            Container(
              width: 120,
              height: 120,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    color.withValues(alpha: 0.12),
                    color.withValues(alpha: 0.04),
                  ],
                ),
              ),
              child: Icon(icon, size: 56, color: color.withValues(alpha: 0.7)),
            ),
            const SizedBox(height: 24),
            Text(
              title,
              textAlign: TextAlign.center,
              style: PremiumTheme.heading4.copyWith(fontSize: 18),
            ),
            const SizedBox(height: 8),
            Text(
              subtitle,
              textAlign: TextAlign.center,
              style: PremiumTheme.bodySmall,
            ),
            if (actionLabel != null && onAction != null) ...[
              const SizedBox(height: 24),
              FilledButton.icon(
                onPressed: onAction,
                icon: const Icon(Icons.add, size: 18),
                label: Text(actionLabel!),
                style: FilledButton.styleFrom(
                  backgroundColor: color,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
