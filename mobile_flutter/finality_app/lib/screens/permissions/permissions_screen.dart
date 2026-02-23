import 'dart:io';
import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';

class PermissionsScreen extends StatefulWidget {
  const PermissionsScreen({super.key});

  @override
  State<PermissionsScreen> createState() => _PermissionsScreenState();
}

class _PermissionsScreenState extends State<PermissionsScreen>
    with WidgetsBindingObserver {
  Map<String, PermissionStatus> _statuses = {};
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _checkAll();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) _checkAll();
  }

  Future<void> _checkAll() async {
    setState(() => _loading = true);
    final camera = await Permission.camera.status;
    final locationInUse = await Permission.locationWhenInUse.status;
    final notifications = await Permission.notification.status;
    final photos = Platform.isIOS
        ? await Permission.photos.status
        : await Permission.storage.status;
    PermissionStatus locationAlways = PermissionStatus.denied;
    try { locationAlways = await Permission.locationAlways.status; } catch (_) {}
    if (mounted) {
      setState(() {
        _statuses = {
          'camera': camera,
          'locationInUse': locationInUse,
          'locationAlways': locationAlways,
          'notifications': notifications,
          'photos': photos,
        };
        _loading = false;
      });
    }
  }

  Future<void> _requestCamera() async {
    final s = await Permission.camera.request();
    if (mounted) setState(() => _statuses['camera'] = s);
  }

  Future<void> _requestLocation() async {
    final s = await Permission.locationWhenInUse.request();
    if (mounted) setState(() => _statuses['locationInUse'] = s);
    try {
      final a = await Permission.locationAlways.status;
      if (mounted) setState(() => _statuses['locationAlways'] = a);
    } catch (_) {}
  }

  Future<void> _requestNotifications() async {
    final s = await Permission.notification.request();
    if (mounted) setState(() => _statuses['notifications'] = s);
  }

  Future<void> _requestPhotos() async {
    final s = Platform.isIOS
        ? await Permission.photos.request()
        : await Permission.storage.request();
    if (mounted) setState(() => _statuses['photos'] = s);
  }

  bool get _allCriticalGranted {
    return (_statuses['camera']?.isGranted ?? false) &&
        (_statuses['locationInUse']?.isGranted ?? false) &&
        (_statuses['notifications']?.isGranted ?? false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Autorisations',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF1E293B),
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(height: 1, color: const Color(0xFFE2E8F0)),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            tooltip: 'Rafraîchir',
            onPressed: _checkAll,
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _checkAll,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  _buildBanner(),
                  const SizedBox(height: 16),
                  _buildSectionTitle('Principales'),
                  const SizedBox(height: 8),
                  _buildPermCard(
                    icon: Icons.camera_alt_rounded,
                    color: const Color(0xFF14B8A6),
                    title: 'Caméra',
                    subtitle: 'Scanner et photos d\'inspection',
                    status: _statuses['camera'] ?? PermissionStatus.denied,
                    onTap: (_statuses['camera']?.isPermanentlyDenied == true)
                        ? openAppSettings : _requestCamera,
                  ),
                  _buildPermCard(
                    icon: Icons.location_on_rounded,
                    color: const Color(0xFF6366F1),
                    title: 'Localisation',
                    subtitle: 'Suivi GPS des missions de convoyage',
                    status: _statuses['locationInUse'] ?? PermissionStatus.denied,
                    onTap: (_statuses['locationInUse']?.isPermanentlyDenied == true)
                        ? openAppSettings : _requestLocation,
                  ),
                  _buildPermCard(
                    icon: Icons.notifications_rounded,
                    color: const Color(0xFFF59E0B),
                    title: 'Notifications',
                    subtitle: 'Alertes missions, planning et messages',
                    status: _statuses['notifications'] ?? PermissionStatus.denied,
                    onTap: (_statuses['notifications']?.isPermanentlyDenied == true)
                        ? openAppSettings : _requestNotifications,
                  ),
                  const SizedBox(height: 16),
                  _buildSectionTitle('Avancées'),
                  const SizedBox(height: 8),
                  _buildPermCard(
                    icon: Icons.my_location_rounded,
                    color: const Color(0xFF8B5CF6),
                    title: 'Localisation arrière-plan',
                    subtitle: Platform.isIOS
                        ? 'Réglages > ChecksFleet > Localisation > Toujours'
                        : 'GPS continu en arrière-plan',
                    status: _statuses['locationAlways'] ?? PermissionStatus.denied,
                    onTap: openAppSettings,
                    viaSettings: true,
                  ),
                  _buildPermCard(
                    icon: Icons.photo_library_rounded,
                    color: const Color(0xFF3B82F6),
                    title: 'Galerie photos',
                    subtitle: 'Joindre des photos aux inspections',
                    status: _statuses['photos'] ?? PermissionStatus.denied,
                    onTap: (_statuses['photos']?.isPermanentlyDenied == true)
                        ? openAppSettings : _requestPhotos,
                    required: false,
                  ),
                  if (Platform.isIOS) ...[
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: const Color(0xFF6366F1).withOpacity(0.06),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFF6366F1).withOpacity(0.2)),
                      ),
                      child: const Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Icon(Icons.info_outline_rounded, color: Color(0xFF6366F1), size: 18),
                          SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              'La page se rafraîchit automatiquement quand vous revenez des Réglages. Tirez vers le bas pour actualiser.',
                              style: TextStyle(fontSize: 12, color: Color(0xFF475569), height: 1.5),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                  const SizedBox(height: 24),
                ],
              ),
            ),
    );
  }

  Widget _buildBanner() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: _allCriticalGranted
            ? const Color(0xFF10B981).withOpacity(0.08)
            : const Color(0xFFF59E0B).withOpacity(0.08),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: _allCriticalGranted
              ? const Color(0xFF10B981).withOpacity(0.3)
              : const Color(0xFFF59E0B).withOpacity(0.3),
        ),
      ),
      child: Row(
        children: [
          Icon(
            _allCriticalGranted ? Icons.check_circle_rounded : Icons.warning_amber_rounded,
            color: _allCriticalGranted ? const Color(0xFF10B981) : const Color(0xFFF59E0B),
            size: 24,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _allCriticalGranted ? 'Tout est autorisé ✓' : 'Autorisations requises',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                    color: _allCriticalGranted ? const Color(0xFF059669) : const Color(0xFFD97706),
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  _allCriticalGranted
                      ? 'L\'app fonctionne de manière optimale.'
                      : 'Activez les accès requis pour utiliser toutes les fonctions.',
                  style: const TextStyle(fontSize: 12, color: Color(0xFF64748B), height: 1.4),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Text(
      title.toUpperCase(),
      style: const TextStyle(
        fontSize: 11, fontWeight: FontWeight.w700,
        color: Color(0xFF94A3B8), letterSpacing: 0.8,
      ),
    );
  }

  Widget _buildPermCard({
    required IconData icon,
    required Color color,
    required String title,
    required String subtitle,
    required PermissionStatus status,
    required VoidCallback onTap,
    bool required = true,
    bool viaSettings = false,
  }) {
    final granted = status.isGranted || status.isLimited;
    final permDenied = status.isPermanentlyDenied;

    final statusLabel = granted ? 'Autorisé'
        : permDenied ? 'Refusé — ouvrir Réglages'
        : 'Non autorisé';
    final statusColor = granted ? const Color(0xFF10B981)
        : permDenied ? const Color(0xFFEF4444)
        : const Color(0xFFF59E0B);
    final statusIcon = granted ? Icons.check_circle_rounded
        : permDenied ? Icons.cancel_rounded
        : Icons.radio_button_unchecked_rounded;

    final btnLabel = granted ? ''
        : (permDenied || viaSettings) ? 'Réglages'
        : 'Autoriser';

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: granted ? const Color(0xFF10B981).withOpacity(0.25) : const Color(0xFFE2E8F0),
        ),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 6, offset: const Offset(0, 2))],
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        child: Row(
          children: [
            Container(
              width: 42, height: 42,
              decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(11)),
              child: Icon(icon, color: color, size: 21),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(children: [
                    Text(title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14, color: Color(0xFF1E293B))),
                    if (!required) ...[
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                        decoration: BoxDecoration(color: const Color(0xFF94A3B8).withOpacity(0.15), borderRadius: BorderRadius.circular(5)),
                        child: const Text('Optionnel', style: TextStyle(fontSize: 10, color: Color(0xFF94A3B8))),
                      ),
                    ],
                  ]),
                  const SizedBox(height: 2),
                  Text(subtitle, style: const TextStyle(fontSize: 12, color: Color(0xFF64748B), height: 1.4)),
                  const SizedBox(height: 5),
                  Row(children: [
                    Icon(statusIcon, color: statusColor, size: 13),
                    const SizedBox(width: 4),
                    Text(statusLabel, style: TextStyle(fontSize: 11, color: statusColor, fontWeight: FontWeight.w500)),
                  ]),
                ],
              ),
            ),
            const SizedBox(width: 8),
            if (!granted)
              GestureDetector(
                onTap: onTap,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(9)),
                  child: Text(btnLabel, style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600)),
                ),
              )
            else
              Container(
                padding: const EdgeInsets.all(5),
                decoration: BoxDecoration(color: const Color(0xFF10B981).withOpacity(0.1), shape: BoxShape.circle),
                child: const Icon(Icons.check_rounded, color: Color(0xFF10B981), size: 15),
              ),
          ],
        ),
      ),
    );
  }
}
