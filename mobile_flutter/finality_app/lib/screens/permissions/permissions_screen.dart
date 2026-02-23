import 'dart:io';
import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';

class PermissionsScreen extends StatefulWidget {
  const PermissionsScreen({super.key});

  @override
  State<PermissionsScreen> createState() => _PermissionsScreenState();
}

class _PermissionsScreenState extends State<PermissionsScreen> {
  final Map<_PermDef, PermissionStatus> _statuses = {};
  bool _loading = true;

  // ── Définition des permissions requises ─────────────────────
  static final List<_PermDef> _permissions = [
    _PermDef(
      permission: Permission.camera,
      icon: Icons.camera_alt_rounded,
      color: const Color(0xFF14B8A6),
      title: 'Caméra',
      description: 'Nécessaire pour scanner des documents et prendre des photos d\'inspection.',
      required: true,
    ),
    _PermDef(
      permission: Permission.locationWhenInUse,
      icon: Icons.location_on_rounded,
      color: const Color(0xFF6366F1),
      title: 'Localisation (en cours d\'utilisation)',
      description: 'Nécessaire pour le suivi GPS des missions de convoyage.',
      required: true,
    ),
    _PermDef(
      permission: Permission.locationAlways,
      icon: Icons.my_location_rounded,
      color: const Color(0xFF8B5CF6),
      title: 'Localisation (arrière-plan)',
      description: 'Permet le suivi GPS continu même quand l\'app est en arrière-plan.',
      required: true,
    ),
    _PermDef(
      permission: Permission.notification,
      icon: Icons.notifications_rounded,
      color: const Color(0xFFF59E0B),
      title: 'Notifications',
      description: 'Pour recevoir les alertes de missions, matchs planning et messages.',
      required: true,
    ),
    _PermDef(
      permission: Permission.photos,
      icon: Icons.photo_library_rounded,
      color: const Color(0xFF3B82F6),
      title: 'Galerie photos',
      description: 'Pour accéder à vos photos et les joindre aux inspections.',
      required: false,
    ),
  ];

  @override
  void initState() {
    super.initState();
    _checkAll();
  }

  Future<void> _checkAll() async {
    setState(() => _loading = true);
    for (final def in _permissions) {
      // locationAlways n'existe pas sur iOS < 13 et crash sur some configs — guard
      try {
        final status = await def.permission.status;
        _statuses[def] = status;
      } catch (_) {
        _statuses[def] = PermissionStatus.denied;
      }
    }
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _requestPermission(_PermDef def) async {
    PermissionStatus status;
    try {
      if (_statuses[def] == PermissionStatus.permanentlyDenied) {
        // Ouvre les réglages système
        await openAppSettings();
        await Future.delayed(const Duration(seconds: 1));
        status = await def.permission.status;
      } else {
        status = await def.permission.request();
      }
    } catch (_) {
      status = PermissionStatus.denied;
    }
    if (mounted) setState(() => _statuses[def] = status);
  }

  Future<void> _requestAll() async {
    for (final def in _permissions) {
      final current = _statuses[def];
      if (current == null || current.isDenied) {
        await _requestPermission(def);
      }
    }
  }

  bool get _allGranted =>
      _permissions.where((d) => d.required).every((d) => _statuses[d]?.isGranted == true);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Autorisations', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF1E293B),
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(height: 1, color: const Color(0xFFE2E8F0)),
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                // Status banner
                _StatusBanner(allGranted: _allGranted),

                // Liste des permissions
                Expanded(
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _permissions.length,
                    itemBuilder: (context, index) {
                      final def = _permissions[index];
                      final status = _statuses[def] ?? PermissionStatus.denied;
                      return _PermissionCard(
                        def: def,
                        status: status,
                        onRequest: () => _requestPermission(def),
                      );
                    },
                  ),
                ),

                // Bouton tout autoriser
                if (!_allGranted)
                  _RequestAllButton(onTap: _requestAll),
              ],
            ),
    );
  }
}

// ── Sub-widgets ───────────────────────────────────────────────────────────────

class _StatusBanner extends StatelessWidget {
  final bool allGranted;
  const _StatusBanner({required this.allGranted});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: allGranted
            ? const Color(0xFF10B981).withValues(alpha: 0.08)
            : const Color(0xFFF59E0B).withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: allGranted
              ? const Color(0xFF10B981).withValues(alpha: 0.3)
              : const Color(0xFFF59E0B).withValues(alpha: 0.3),
        ),
      ),
      child: Row(
        children: [
          Icon(
            allGranted ? Icons.check_circle_rounded : Icons.warning_amber_rounded,
            color: allGranted ? const Color(0xFF10B981) : const Color(0xFFF59E0B),
            size: 28,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  allGranted ? 'Tout est autorisé ✓' : 'Autorisations requises',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 15,
                    color: allGranted ? const Color(0xFF059669) : const Color(0xFFD97706),
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  allGranted
                      ? 'L\'app fonctionne de manière optimale.'
                      : 'Certaines fonctionnalités sont limitées. Autorisez les accès requis.',
                  style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _PermissionCard extends StatelessWidget {
  final _PermDef def;
  final PermissionStatus status;
  final VoidCallback onRequest;

  const _PermissionCard({
    required this.def,
    required this.status,
    required this.onRequest,
  });

  String get _statusLabel {
    if (status.isGranted || status.isLimited) return 'Autorisé';
    if (status.isPermanentlyDenied) return 'Refusé définitivement';
    return 'Non autorisé';
  }

  Color get _statusColor {
    if (status.isGranted || status.isLimited) return const Color(0xFF10B981);
    if (status.isPermanentlyDenied) return const Color(0xFFEF4444);
    return const Color(0xFFF59E0B);
  }

  IconData get _statusIcon {
    if (status.isGranted || status.isLimited) return Icons.check_circle_rounded;
    if (status.isPermanentlyDenied) return Icons.cancel_rounded;
    return Icons.radio_button_unchecked_rounded;
  }

  @override
  Widget build(BuildContext context) {
    final granted = status.isGranted || status.isLimited;

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: granted
              ? const Color(0xFF10B981).withValues(alpha: 0.2)
              : const Color(0xFFE2E8F0),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          children: [
            // Icône
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: def.color.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(def.icon, color: def.color, size: 22),
            ),
            const SizedBox(width: 14),
            // Texte
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          def.title,
                          style: const TextStyle(
                            fontWeight: FontWeight.w600,
                            fontSize: 14,
                            color: Color(0xFF1E293B),
                          ),
                        ),
                      ),
                      if (def.required)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: const Color(0xFF6366F1).withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: const Text(
                            'Requis',
                            style: TextStyle(
                              fontSize: 10,
                              color: Color(0xFF6366F1),
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    def.description,
                    style: const TextStyle(fontSize: 12, color: Color(0xFF64748B), height: 1.4),
                  ),
                  const SizedBox(height: 8),
                  // Status + bouton
                  Row(
                    children: [
                      Icon(_statusIcon, color: _statusColor, size: 14),
                      const SizedBox(width: 4),
                      Text(
                        _statusLabel,
                        style: TextStyle(
                          fontSize: 12,
                          color: _statusColor,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const Spacer(),
                      if (!granted)
                        GestureDetector(
                          onTap: onRequest,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(
                              color: def.color,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              status.isPermanentlyDenied ? 'Réglages' : 'Autoriser',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _RequestAllButton extends StatelessWidget {
  final VoidCallback onTap;
  const _RequestAllButton({required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
      child: SizedBox(
        width: double.infinity,
        child: FilledButton.icon(
          onPressed: onTap,
          icon: const Icon(Icons.security_rounded),
          label: const Text('Tout autoriser', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
          style: FilledButton.styleFrom(
            backgroundColor: const Color(0xFF6366F1),
            padding: const EdgeInsets.symmetric(vertical: 16),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          ),
        ),
      ),
    );
  }
}

// ── Data model ────────────────────────────────────────────────────────────────
class _PermDef {
  final Permission permission;
  final IconData icon;
  final Color color;
  final String title;
  final String description;
  final bool required;

  const _PermDef({
    required this.permission,
    required this.icon,
    required this.color,
    required this.title,
    required this.description,
    required this.required,
  });
}
