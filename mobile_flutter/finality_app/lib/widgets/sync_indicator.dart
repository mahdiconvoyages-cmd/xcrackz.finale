import 'package:flutter/material.dart';

/// Sync status indicator widget matching Expo SyncIndicator
class SyncIndicator extends StatefulWidget {
  final SyncStatus status;
  final String? message;
  final double? progress;
  final bool showText;

  const SyncIndicator({
    super.key,
    required this.status,
    this.message,
    this.progress,
    this.showText = true,
  });

  @override
  State<SyncIndicator> createState() => _SyncIndicatorState();
}

class _SyncIndicatorState extends State<SyncIndicator> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(seconds: 2),
      vsync: this,
    );
    _animation = CurvedAnimation(parent: _controller, curve: Curves.easeInOut);
    
    if (widget.status == SyncStatus.syncing) {
      _controller.repeat();
    }
  }

  @override
  void didUpdateWidget(SyncIndicator oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.status == SyncStatus.syncing && !_controller.isAnimating) {
      _controller.repeat();
    } else if (widget.status != SyncStatus.syncing && _controller.isAnimating) {
      _controller.stop();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Color _getStatusColor() {
    switch (widget.status) {
      case SyncStatus.syncing:
        return const Color(0xFF3b82f6); // Blue
      case SyncStatus.synced:
        return const Color(0xFF10b981); // Green
      case SyncStatus.error:
        return const Color(0xFFef4444); // Red
      case SyncStatus.idle:
        return Colors.grey;
    }
  }

  IconData _getStatusIcon() {
    switch (widget.status) {
      case SyncStatus.syncing:
        return Icons.sync;
      case SyncStatus.synced:
        return Icons.check_circle;
      case SyncStatus.error:
        return Icons.error;
      case SyncStatus.idle:
        return Icons.cloud_done;
    }
  }

  String _getStatusText() {
    if (widget.message != null) return widget.message!;
    
    switch (widget.status) {
      case SyncStatus.syncing:
        return 'Synchronisation...';
      case SyncStatus.synced:
        return 'Synchronisé';
      case SyncStatus.error:
        return 'Erreur de sync';
      case SyncStatus.idle:
        return 'En attente';
    }
  }

  @override
  Widget build(BuildContext context) {
    final color = _getStatusColor();
    final icon = _getStatusIcon();
    final text = _getStatusText();

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          RotationTransition(
            turns: widget.status == SyncStatus.syncing ? _animation : const AlwaysStoppedAnimation(0),
            child: Icon(
              icon,
              size: 16,
              color: color,
            ),
          ),
          if (widget.showText) ...[
            const SizedBox(width: 8),
            Text(
              text,
              style: TextStyle(
                color: color,
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
          if (widget.progress != null && widget.status == SyncStatus.syncing) ...[
            const SizedBox(width: 8),
            SizedBox(
              width: 40,
              height: 4,
              child: LinearProgressIndicator(
                value: widget.progress,
                backgroundColor: color.withValues(alpha: 0.2),
                valueColor: AlwaysStoppedAnimation(color),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

enum SyncStatus {
  idle,
  syncing,
  synced,
  error,
}
