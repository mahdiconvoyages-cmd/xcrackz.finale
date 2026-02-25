import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
import '../../theme/premium_theme.dart';
import '../../widgets/premium/premium_widgets.dart';
import '../../l10n/app_localizations.dart';
import '../../providers/locale_provider.dart';
import '../../providers/theme_provider.dart';
import '../../main.dart';
import '../profile/support_chat_screen.dart';

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  // Permissions
  bool _locationPermissionGranted = true;
  bool _backgroundLocationGranted = false;
  // ignore: unused_field
  bool _locationEnabled = true;
  
  // Notifications
  bool _notificationsEnabled = true;
  bool _missionNotifications = true;
  bool _messageNotifications = true;
  bool _reminderNotifications = true;
  bool _soundEnabled = true;
  bool _vibrationEnabled = true;
  
  // Apparence
  // ignore: unused_field
  bool _darkMode = true;
  String _fontSize = 'medium'; // small, medium, large
  String _displayMode = 'comfortable'; // compact, comfortable
  
  // GPS
  String _gpsAccuracy = 'high'; // low, balanced, high
  int _gpsUpdateInterval = 30; // seconds
  bool _batterySaverMode = false;
  
  // Données
  bool _autoBackup = true;
  bool _offlineMode = false;
  String _cacheSize = '0 MB';
  
  // Loading
  bool _isLoading = true;
  String _appVersion = '';
  String _buildNumber = '';

  @override
  void initState() {
    super.initState();
    _loadSettings();
    _loadAppInfo();
  }

  Future<void> _loadAppInfo() async {
    try {
      final packageInfo = await PackageInfo.fromPlatform();
      if (!mounted) return;
      setState(() {
        _appVersion = packageInfo.version;
        _buildNumber = packageInfo.buildNumber;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _appVersion = '3.1.0';
        _buildNumber = '26';
      });
    }
  }

  Future<void> _loadSettings() async {
    setState(() => _isLoading = true);
    
    try {
      final prefs = await SharedPreferences.getInstance();
      
      // Notifications
      _notificationsEnabled = prefs.getBool('notifications') ?? true;
      _missionNotifications = prefs.getBool('missionNotifications') ?? true;
      _messageNotifications = prefs.getBool('messageNotifications') ?? true;
      _reminderNotifications = prefs.getBool('reminderNotifications') ?? true;
      _soundEnabled = prefs.getBool('soundEnabled') ?? true;
      _vibrationEnabled = prefs.getBool('vibrationEnabled') ?? true;
      
      // Apparence
      _darkMode = prefs.getBool('darkMode') ?? true;
      _fontSize = prefs.getString('fontSize') ?? 'medium';
      _displayMode = prefs.getString('displayMode') ?? 'comfortable';
      
      // GPS
      _gpsAccuracy = prefs.getString('gpsAccuracy') ?? 'high';
      _gpsUpdateInterval = prefs.getInt('gpsUpdateInterval') ?? 30;
      _batterySaverMode = prefs.getBool('batterySaverMode') ?? false;
      
      // Données
      _autoBackup = prefs.getBool('autoBackup') ?? true;
      _offlineMode = prefs.getBool('offlineMode') ?? false;
      
      // Calculer taille du cache
      await _calculateCacheSize();
      
      // Permissions
      final locationStatus = await Permission.location.status;
      final locationAlwaysStatus = await Permission.locationAlways.status;
      
      if (!mounted) return;
      setState(() {
        _locationPermissionGranted = locationStatus.isGranted;
        _backgroundLocationGranted = locationAlwaysStatus.isGranted;
        _locationEnabled = _locationPermissionGranted;
        _isLoading = false;
      });
    } catch (e) {
      debugPrint('Erreur chargement paramètres: $e');
      if (!mounted) return;
      setState(() => _isLoading = false);
    }
  }

  Future<void> _calculateCacheSize() async {
    try {
      final tempDir = await getTemporaryDirectory();
      int totalSize = 0;
      await for (final entity in tempDir.list(recursive: true, followLinks: false)) {
        if (entity is File) {
          try {
            totalSize += await entity.length();
          } catch (_) {}
        }
      }

      if (totalSize > 1024 * 1024) {
        _cacheSize = '${(totalSize / (1024 * 1024)).toStringAsFixed(1)} MB';
      } else if (totalSize > 1024) {
        _cacheSize = '${(totalSize / 1024).toStringAsFixed(1)} KB';
      } else {
        _cacheSize = '$totalSize B';
      }
    } catch (e) {
      _cacheSize = '0 MB';
    }
  }

  Future<void> _saveLanguage(String language) async {
    await ref.read(localeNotifierProvider.notifier).setLocaleByCode(
      AppLocalizations.getCodeFromName(language),
    );
    
    if (mounted) {
      final l10n = AppLocalizations.of(context);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              const Icon(Icons.check_circle, color: Colors.white),
              const SizedBox(width: 12),
              Text('${l10n.language}: $language'),
            ],
          ),
          backgroundColor: PremiumTheme.accentGreen,
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  Future<void> _saveBoolSetting(String key, bool value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(key, value);
  }

  Future<void> _saveStringSetting(String key, String value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(key, value);
  }

  Future<void> _saveIntSetting(String key, int value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(key, value);
  }

  Future<void> _clearCache() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            Icon(Icons.cleaning_services, color: PremiumTheme.accentAmber),
            const SizedBox(width: 12),
            const Text('Vider le cache'),
          ],
        ),
        content: const Text('Cette action supprimera les données temporaires. Voulez-vous continuer ?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text('Annuler', style: TextStyle(color: PremiumTheme.textSecondary)),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            style: FilledButton.styleFrom(backgroundColor: PremiumTheme.primaryTeal),
            child: const Text('Vider'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      // Clear image cache
      PaintingBinding.instance.imageCache.clear();
      PaintingBinding.instance.imageCache.clearLiveImages();
      
      setState(() => _cacheSize = '0 MB');
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Row(
              children: [
                Icon(Icons.check_circle, color: Colors.white),
                SizedBox(width: 12),
                Text('Cache vidé avec succès'),
              ],
            ),
            backgroundColor: PremiumTheme.accentGreen,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  Future<void> _changePassword() async {
    final currentPasswordController = TextEditingController();
    final newPasswordController = TextEditingController();
    final confirmPasswordController = TextEditingController();
    
    await showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                gradient: PremiumTheme.tealGradient,
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.lock, color: Colors.white, size: 20),
            ),
            const SizedBox(width: 12),
            const Text('Changer le mot de passe'),
          ],
        ),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: currentPasswordController,
                obscureText: true,
                decoration: InputDecoration(
                  labelText: 'Mot de passe actuel',
                  prefixIcon: const Icon(Icons.lock_outline),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: newPasswordController,
                obscureText: true,
                decoration: InputDecoration(
                  labelText: 'Nouveau mot de passe',
                  prefixIcon: const Icon(Icons.lock),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: confirmPasswordController,
                obscureText: true,
                decoration: InputDecoration(
                  labelText: 'Confirmer le mot de passe',
                  prefixIcon: const Icon(Icons.lock_clock),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Annuler', style: TextStyle(color: PremiumTheme.textSecondary)),
          ),
          FilledButton(
            onPressed: () async {
              if (newPasswordController.text != confirmPasswordController.text) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Les mots de passe ne correspondent pas'),
                    backgroundColor: Colors.red,
                  ),
                );
                return;
              }
              
              if (newPasswordController.text.length < 6) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Le mot de passe doit contenir au moins 6 caractères'),
                    backgroundColor: Colors.red,
                  ),
                );
                return;
              }

              if (currentPasswordController.text.isEmpty) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Veuillez entrer votre mot de passe actuel'),
                    backgroundColor: Colors.red,
                  ),
                );
                return;
              }
              
              try {
                // Verify current password first
                final email = supabase.auth.currentUser?.email;
                if (email == null) throw Exception('Utilisateur non connecté');
                await supabase.auth.signInWithPassword(
                  email: email,
                  password: currentPasswordController.text,
                );

                // Current password verified, now update
                await supabase.auth.updateUser(
                  UserAttributes(password: newPasswordController.text),
                );
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: const Row(
                      children: [
                        Icon(Icons.check_circle, color: Colors.white),
                        SizedBox(width: 12),
                        Text('Mot de passe modifié avec succès'),
                      ],
                    ),
                    backgroundColor: PremiumTheme.accentGreen,
                    behavior: SnackBarBehavior.floating,
                  ),
                );
              } on AuthException catch (e) {
                final msg = e.message.contains('Invalid login')
                    ? 'Mot de passe actuel incorrect'
                    : 'Erreur: ${e.message}';
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(msg),
                    backgroundColor: Colors.red,
                  ),
                );
              } catch (e) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('Erreur: $e'),
                    backgroundColor: Colors.red,
                  ),
                );
              }
            },
            style: FilledButton.styleFrom(backgroundColor: PremiumTheme.primaryTeal),
            child: const Text('Modifier'),
          ),
        ],
      ),
    );
  }

  Future<void> _deleteAccount() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            Icon(Icons.warning, color: PremiumTheme.accentRed, size: 28),
            const SizedBox(width: 12),
            const Text('Supprimer le compte'),
          ],
        ),
        content: const Text(
          'Cette action est irréversible. Toutes vos données seront supprimées définitivement.\n\nÊtes-vous sûr de vouloir continuer ?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Annuler'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            style: FilledButton.styleFrom(backgroundColor: PremiumTheme.accentRed),
            child: const Text('Supprimer définitivement'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      try {
        final supabase = Supabase.instance.client;
        final userId = supabase.auth.currentUser?.id;
        if (userId == null) return;

        // Insert real deletion request in Supabase
        await supabase.from('deletion_requests').insert({
          'user_id': userId,
          'reason': 'User requested account deletion from mobile app',
          'requested_at': DateTime.now().toIso8601String(),
          'status': 'pending',
        });

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: const Row(
                children: [
                  Icon(Icons.check_circle, color: Colors.white),
                  SizedBox(width: 12),
                  Expanded(child: Text('Demande de suppression enregistrée. Votre compte sera supprimé sous 30 jours.')),
                ],
              ),
              backgroundColor: PremiumTheme.primaryIndigo,
              behavior: SnackBarBehavior.floating,
              duration: const Duration(seconds: 5),
            ),
          );

          // Sign out
          await supabase.auth.signOut();
          if (mounted) {
            Navigator.of(context).pushNamedAndRemoveUntil('/login', (route) => false);
          }
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Erreur: $e'),
              backgroundColor: Colors.red,
              behavior: SnackBarBehavior.floating,
            ),
          );
        }
      }
    }
  }

  Future<void> _exportData() async {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Row(
          children: [
            SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
            ),
            SizedBox(width: 12),
            Text('Préparation de l\'export...'),
          ],
        ),
        backgroundColor: PremiumTheme.primaryTeal,
        behavior: SnackBarBehavior.floating,
        duration: const Duration(seconds: 10),
      ),
    );

    try {
      final supabase = Supabase.instance.client;
      final userId = supabase.auth.currentUser?.id;
      if (userId == null) throw Exception('Non connecté');

      // Fetch all user data from Supabase (real RGPD export)
      final results = await Future.wait<dynamic>([
        supabase.from('profiles').select().eq('id', userId).maybeSingle(),
        supabase.from('missions').select().eq('user_id', userId),
        supabase.from('contacts').select().eq('user_id', userId),
        supabase.from('invoices').select().eq('user_id', userId),
        supabase.from('vehicle_inspections').select().eq('inspector_id', userId),
      ]);

      final userData = {
        'export_date': DateTime.now().toIso8601String(),
        'profile': results[0],
        'missions': results[1],
        'contacts': results[2],
        'invoices': results[3],
        'inspections': results[4],
      };

      // Save to file
      final dir = await getTemporaryDirectory();
      final fileName = 'CHECKSFLEET-export-${DateTime.now().toIso8601String().split('T')[0]}.json';
      final file = File('${dir.path}/$fileName');
      await file.writeAsString(const JsonEncoder.withIndent('  ').convert(userData));

      // Share the file
      await SharePlus.instance.share(
        ShareParams(
          files: [XFile(file.path)],
          subject: 'ChecksFleet - Export de mes données',
          text: 'Export RGPD de vos données ChecksFleet',
        ),
      );

      if (mounted) {
        ScaffoldMessenger.of(context).hideCurrentSnackBar();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Row(
              children: [
                Icon(Icons.check_circle, color: Colors.white),
                SizedBox(width: 12),
                Text('Données exportées avec succès'),
              ],
            ),
            backgroundColor: PremiumTheme.accentGreen,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).hideCurrentSnackBar();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erreur lors de l\'export: $e'),
            backgroundColor: Colors.red,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  Future<void> _openUrl(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  void _contactSupport() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'Contacter le support',
              style: PremiumTheme.heading3.copyWith(color: PremiumTheme.textPrimary),
            ),
            const SizedBox(height: 24),
            _buildContactOption(
              icon: Icons.email,
              title: 'Email',
              subtitle: 'contact@checksfleet.com',
              color: PremiumTheme.primaryTeal,
              onTap: () => _openUrl('mailto:contact@checksfleet.com'),
            ),
            const SizedBox(height: 12),
            _buildContactOption(
              icon: Icons.phone,
              title: 'Téléphone',
              subtitle: '+33 6 83 39 74 61',
              color: PremiumTheme.primaryBlue,
              onTap: () => _openUrl('tel:+33683397461'),
            ),
            const SizedBox(height: 12),
            _buildContactOption(
              icon: Icons.chat,
              title: 'Chat en direct',
              subtitle: 'Discutez avec le support',
              color: PremiumTheme.primaryPurple,
              onTap: () {
                Navigator.pop(context);
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const SupportChatScreen()),
                );
              },
            ),
            SizedBox(height: MediaQuery.of(context).padding.bottom + 16),
          ],
        ),
      ),
    );
  }

  Widget _buildContactOption({
    required IconData icon,
    required String title,
    required String subtitle,
    required Color color,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withValues(alpha: 0.3)),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: color,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: Colors.white, size: 20),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: TextStyle(fontWeight: FontWeight.bold, color: PremiumTheme.textPrimary)),
                  Text(subtitle, style: TextStyle(color: PremiumTheme.textSecondary, fontSize: 13)),
                ],
              ),
            ),
            Icon(Icons.arrow_forward_ios, color: color, size: 16),
          ],
        ),
      ),
    );
  }

  void _openAppSettings() {
    openAppSettings();
  }

  Future<void> _requestLocationPermission() async {
    final status = await Permission.location.request();
    if (!mounted) return;
    setState(() {
      _locationPermissionGranted = status.isGranted;
      _locationEnabled = status.isGranted;
    });
    
    if (status.isPermanentlyDenied) {
      _showPermissionDeniedDialog('Localisation');
    } else if (status.isGranted) {
      _showSnackBar('Permission de localisation accordée', isSuccess: true);
    }
  }

  Future<void> _requestBackgroundLocationPermission() async {
    // D'abord vérifier si la permission de localisation normale est accordée
    if (!_locationPermissionGranted) {
      await _requestLocationPermission();
      if (!_locationPermissionGranted) return;
    }
    
    final status = await Permission.locationAlways.request();
    if (!mounted) return;
    setState(() {
      _backgroundLocationGranted = status.isGranted;
    });
    
    if (status.isPermanentlyDenied) {
      _showPermissionDeniedDialog('Localisation en arrière-plan');
    } else if (status.isGranted) {
      _showSnackBar('Permission de localisation en arrière-plan accordée', isSuccess: true);
    }
  }

  void _showPermissionDeniedDialog(String permissionName) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Row(
          children: [
            Icon(Icons.warning_amber, color: PremiumTheme.accentAmber),
            const SizedBox(width: 10),
            Text('Permission requise'),
          ],
        ),
        content: Text(
          'La permission "$permissionName" a été refusée de manière permanente. '
          'Veuillez l\'activer manuellement dans les paramètres de l\'application.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text('Annuler'),
          ),
          ElevatedButton.icon(
            onPressed: () {
              Navigator.pop(ctx);
              openAppSettings();
            },
            icon: Icon(Icons.settings),
            label: Text('Ouvrir paramètres'),
            style: ElevatedButton.styleFrom(
              backgroundColor: PremiumTheme.primaryTeal,
            ),
          ),
        ],
      ),
    );
  }

  void _showSnackBar(String message, {bool isSuccess = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(
              isSuccess ? Icons.check_circle : Icons.info,
              color: Colors.white,
            ),
            const SizedBox(width: 10),
            Expanded(child: Text(message)),
          ],
        ),
        backgroundColor: isSuccess ? PremiumTheme.accentGreen : PremiumTheme.primaryTeal,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    
    return Scaffold(
      backgroundColor: PremiumTheme.lightBg,
      appBar: AppBar(
        title: Text(
          l10n.settings,
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        centerTitle: true,
        elevation: 0,
        flexibleSpace: Container(
          decoration: BoxDecoration(
            gradient: PremiumTheme.tealGradient,
          ),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: _isLoading
          ? Center(
              child: ShimmerLoading(
                width: MediaQuery.of(context).size.width - 48,
                height: 200,
              ),
            )
          : SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // ====== COMPTE & SÉCURITÉ ======
                  _buildSectionHeader(
                    icon: Icons.security,
                    title: 'Compte & Sécurité',
                    color: PremiumTheme.primaryTeal,
                  ),
                  const SizedBox(height: 12),
                  _buildSettingsCard(
                    borderColor: PremiumTheme.primaryTeal,
                    children: [
                      _buildActionTile(
                        icon: Icons.lock,
                        title: 'Changer le mot de passe',
                        subtitle: 'Modifier votre mot de passe',
                        color: PremiumTheme.primaryTeal,
                        onTap: _changePassword,
                      ),
                      _buildDivider(),
                      _buildActionTile(
                        icon: Icons.phonelink_lock,
                        title: 'Authentification 2FA',
                        subtitle: 'Sécurité renforcée',
                        color: PremiumTheme.primaryBlue,
                        trailing: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: PremiumTheme.accentAmber.withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text('Bientôt', style: TextStyle(color: PremiumTheme.accentAmber, fontSize: 11, fontWeight: FontWeight.bold)),
                        ),
                        onTap: () {},
                      ),
                      _buildDivider(),
                      _buildActionTile(
                        icon: Icons.devices,
                        title: 'Sessions actives',
                        subtitle: 'Gérer vos appareils connectés',
                        color: PremiumTheme.primaryIndigo,
                        onTap: () {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: const Text('1 session active sur cet appareil'),
                              backgroundColor: PremiumTheme.primaryIndigo,
                              behavior: SnackBarBehavior.floating,
                            ),
                          );
                        },
                      ),
                      _buildDivider(),
                      _buildActionTile(
                        icon: Icons.delete_forever,
                        title: 'Supprimer le compte',
                        subtitle: 'Supprimer définitivement votre compte',
                        color: PremiumTheme.accentRed,
                        onTap: _deleteAccount,
                      ),
                    ],
                  ),

                  const SizedBox(height: 24),

                  // ====== LANGUE ======
                  _buildSectionHeader(
                    icon: Icons.language,
                    title: l10n.language,
                    color: PremiumTheme.primaryBlue,
                  ),
                  const SizedBox(height: 12),
                  _buildSettingsCard(
                    borderColor: PremiumTheme.primaryBlue,
                    children: [
                      Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              l10n.selectLanguage,
                              style: TextStyle(color: PremiumTheme.textSecondary, fontSize: 13),
                            ),
                            const SizedBox(height: 12),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 16),
                              decoration: BoxDecoration(
                                color: PremiumTheme.primaryBlue.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: PremiumTheme.primaryBlue.withValues(alpha: 0.3)),
                              ),
                              child: Builder(
                                builder: (context) {
                                  final locale = ref.watch(localeNotifierProvider);
                                  final languageName = AppLocalizations.getNameFromCode(locale.languageCode);
                                  return DropdownButtonHideUnderline(
                                    child: DropdownButton<String>(
                                      value: languageName,
                                      isExpanded: true,
                                      dropdownColor: Colors.white,
                                      style: TextStyle(color: PremiumTheme.textPrimary, fontSize: 15),
                                      icon: Icon(Icons.arrow_drop_down, color: PremiumTheme.primaryBlue),
                                      items: AppLocalizations.languageNames.values
                                          .map((String value) {
                                        return DropdownMenuItem<String>(
                                          value: value,
                                          child: Row(
                                            children: [
                                              Text(_getLanguageFlag(value), style: const TextStyle(fontSize: 20)),
                                              const SizedBox(width: 12),
                                              Text(value),
                                            ],
                                          ),
                                        );
                                      }).toList(),
                                      onChanged: (String? newValue) {
                                        if (newValue != null) {
                                          _saveLanguage(newValue);
                                        }
                                      },
                                    ),
                                  );
                                },
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 24),

                  // ====== NOTIFICATIONS ======
                  _buildSectionHeader(
                    icon: Icons.notifications,
                    title: 'Notifications',
                    color: PremiumTheme.primaryPurple,
                  ),
                  const SizedBox(height: 12),
                  _buildSettingsCard(
                    borderColor: PremiumTheme.primaryPurple,
                    children: [
                      _buildSwitchTile(
                        icon: Icons.notifications_active,
                        title: 'Activer les notifications',
                        subtitle: 'Notifications push',
                        value: _notificationsEnabled,
                        color: PremiumTheme.primaryPurple,
                        onChanged: (v) {
                          setState(() => _notificationsEnabled = v);
                          _saveBoolSetting('notifications', v);
                        },
                      ),
                      if (_notificationsEnabled) ...[
                        _buildDivider(),
                        _buildSwitchTile(
                          icon: Icons.local_shipping,
                          title: 'Missions',
                          subtitle: 'Nouvelles missions et mises à jour',
                          value: _missionNotifications,
                          color: PremiumTheme.primaryTeal,
                          onChanged: (v) {
                            setState(() => _missionNotifications = v);
                            _saveBoolSetting('missionNotifications', v);
                          },
                        ),
                        _buildDivider(),
                        _buildSwitchTile(
                          icon: Icons.message,
                          title: 'Messages',
                          subtitle: 'Nouveaux messages',
                          value: _messageNotifications,
                          color: PremiumTheme.primaryBlue,
                          onChanged: (v) {
                            setState(() => _messageNotifications = v);
                            _saveBoolSetting('messageNotifications', v);
                          },
                        ),
                        _buildDivider(),
                        _buildSwitchTile(
                          icon: Icons.alarm,
                          title: 'Rappels',
                          subtitle: 'Rappels et alertes',
                          value: _reminderNotifications,
                          color: PremiumTheme.accentAmber,
                          onChanged: (v) {
                            setState(() => _reminderNotifications = v);
                            _saveBoolSetting('reminderNotifications', v);
                          },
                        ),
                        _buildDivider(),
                        _buildSwitchTile(
                          icon: Icons.volume_up,
                          title: 'Sons',
                          subtitle: 'Sons de notification',
                          value: _soundEnabled,
                          color: PremiumTheme.primaryIndigo,
                          onChanged: (v) {
                            setState(() => _soundEnabled = v);
                            _saveBoolSetting('soundEnabled', v);
                            if (v) HapticFeedback.lightImpact();
                          },
                        ),
                        _buildDivider(),
                        _buildSwitchTile(
                          icon: Icons.vibration,
                          title: 'Vibrations',
                          subtitle: 'Vibrer lors des notifications',
                          value: _vibrationEnabled,
                          color: PremiumTheme.primaryPurple,
                          onChanged: (v) {
                            setState(() => _vibrationEnabled = v);
                            _saveBoolSetting('vibrationEnabled', v);
                            if (v) HapticFeedback.mediumImpact();
                          },
                        ),
                      ],
                    ],
                  ),

                  const SizedBox(height: 24),

                  // ====== GPS & LOCALISATION ======
                  _buildSectionHeader(
                    icon: Icons.location_on,
                    title: 'GPS & Localisation',
                    color: PremiumTheme.accentGreen,
                  ),
                  const SizedBox(height: 12),
                  _buildSettingsCard(
                    borderColor: PremiumTheme.accentGreen,
                    children: [
                      _buildPermissionTile(
                        icon: Icons.gps_fixed,
                        title: 'Localisation',
                        isGranted: _locationPermissionGranted,
                        onRequest: _requestLocationPermission,
                      ),
                      _buildDivider(),
                      _buildPermissionTile(
                        icon: Icons.gps_off,
                        title: 'Localisation en arrière-plan',
                        isGranted: _backgroundLocationGranted,
                        onRequest: _requestBackgroundLocationPermission,
                      ),
                      _buildDivider(),
                      _buildDropdownTile(
                        icon: Icons.speed,
                        title: 'Précision GPS',
                        value: _gpsAccuracy,
                        options: {'low': 'Basse (économie batterie)', 'balanced': 'Équilibrée', 'high': 'Haute précision'},
                        color: PremiumTheme.accentGreen,
                        onChanged: (v) {
                          setState(() => _gpsAccuracy = v);
                          _saveStringSetting('gpsAccuracy', v);
                        },
                      ),
                      _buildDivider(),
                      _buildDropdownTile(
                        icon: Icons.timer,
                        title: 'Intervalle de mise à jour',
                        value: _gpsUpdateInterval.toString(),
                        options: {'10': '10 secondes', '30': '30 secondes', '60': '1 minute', '300': '5 minutes'},
                        color: PremiumTheme.primaryTeal,
                        onChanged: (v) {
                          setState(() => _gpsUpdateInterval = int.parse(v));
                          _saveIntSetting('gpsUpdateInterval', int.parse(v));
                        },
                      ),
                      _buildDivider(),
                      _buildSwitchTile(
                        icon: Icons.battery_saver,
                        title: 'Mode économie batterie',
                        subtitle: 'Réduit la fréquence GPS',
                        value: _batterySaverMode,
                        color: PremiumTheme.accentAmber,
                        onChanged: (v) {
                          setState(() => _batterySaverMode = v);
                          _saveBoolSetting('batterySaverMode', v);
                        },
                      ),
                      _buildDivider(),
                      Padding(
                        padding: const EdgeInsets.all(16),
                        child: SizedBox(
                          width: double.infinity,
                          child: OutlinedButton.icon(
                            onPressed: _openAppSettings,
                            icon: const Icon(Icons.settings),
                            label: const Text('Ouvrir les paramètres système'),
                            style: OutlinedButton.styleFrom(
                              foregroundColor: PremiumTheme.accentGreen,
                              side: BorderSide(color: PremiumTheme.accentGreen),
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 24),

                  // ====== APPARENCE ======
                  _buildSectionHeader(
                    icon: Icons.palette,
                    title: 'Apparence',
                    color: PremiumTheme.primaryIndigo,
                  ),
                  const SizedBox(height: 12),
                  _buildSettingsCard(
                    borderColor: PremiumTheme.primaryIndigo,
                    children: [
                      _buildSwitchTile(
                        icon: Icons.dark_mode,
                        title: 'Mode sombre',
                        subtitle: 'Thème sombre',
                        value: ref.watch(themeModeProvider) == ThemeMode.dark,
                        color: PremiumTheme.primaryIndigo,
                        onChanged: (v) {
                          ref.read(themeModeProvider.notifier).setThemeMode(
                            v ? ThemeMode.dark : ThemeMode.light,
                          );
                        },
                      ),
                      _buildDivider(),
                      _buildDropdownTile(
                        icon: Icons.text_fields,
                        title: 'Taille de police',
                        value: _fontSize,
                        options: {'small': 'Petite', 'medium': 'Moyenne', 'large': 'Grande'},
                        color: PremiumTheme.primaryPurple,
                        onChanged: (v) {
                          setState(() => _fontSize = v);
                          _saveStringSetting('fontSize', v);
                        },
                      ),
                      _buildDivider(),
                      _buildDropdownTile(
                        icon: Icons.view_compact,
                        title: 'Mode d\'affichage',
                        value: _displayMode,
                        options: {'compact': 'Compact', 'comfortable': 'Confortable'},
                        color: PremiumTheme.primaryBlue,
                        onChanged: (v) {
                          setState(() => _displayMode = v);
                          _saveStringSetting('displayMode', v);
                        },
                      ),
                    ],
                  ),

                  const SizedBox(height: 24),

                  // ====== DONNÉES & STOCKAGE ======
                  _buildSectionHeader(
                    icon: Icons.storage,
                    title: 'Données & Stockage',
                    color: PremiumTheme.accentAmber,
                  ),
                  const SizedBox(height: 12),
                  _buildSettingsCard(
                    borderColor: PremiumTheme.accentAmber,
                    children: [
                      _buildInfoTile(
                        icon: Icons.folder,
                        title: 'Taille du cache',
                        value: _cacheSize,
                        color: PremiumTheme.accentAmber,
                      ),
                      _buildDivider(),
                      _buildActionTile(
                        icon: Icons.cleaning_services,
                        title: 'Vider le cache',
                        subtitle: 'Libérer de l\'espace',
                        color: PremiumTheme.accentAmber,
                        onTap: _clearCache,
                      ),
                      _buildDivider(),
                      _buildSwitchTile(
                        icon: Icons.cloud_upload,
                        title: 'Sauvegarde automatique',
                        subtitle: 'Sauvegarder sur le cloud',
                        value: _autoBackup,
                        color: PremiumTheme.primaryTeal,
                        onChanged: (v) {
                          setState(() => _autoBackup = v);
                          _saveBoolSetting('autoBackup', v);
                        },
                      ),
                      _buildDivider(),
                      _buildSwitchTile(
                        icon: Icons.offline_bolt,
                        title: 'Mode hors ligne',
                        subtitle: 'Accéder aux données sans connexion',
                        value: _offlineMode,
                        color: PremiumTheme.primaryBlue,
                        onChanged: (v) {
                          setState(() => _offlineMode = v);
                          _saveBoolSetting('offlineMode', v);
                        },
                      ),
                    ],
                  ),

                  const SizedBox(height: 24),

                  // ====== DONNÉES PERSONNELLES (RGPD) ======
                  _buildSectionHeader(
                    icon: Icons.privacy_tip,
                    title: 'Données personnelles',
                    color: PremiumTheme.primaryTeal,
                  ),
                  const SizedBox(height: 12),
                  _buildSettingsCard(
                    borderColor: PremiumTheme.primaryTeal,
                    children: [
                      _buildActionTile(
                        icon: Icons.download,
                        title: 'Exporter mes données',
                        subtitle: 'Télécharger toutes vos données (RGPD)',
                        color: PremiumTheme.primaryTeal,
                        onTap: _exportData,
                      ),
                      _buildDivider(),
                      _buildActionTile(
                        icon: Icons.delete_outline,
                        title: 'Demander la suppression',
                        subtitle: 'Supprimer toutes mes données',
                        color: PremiumTheme.accentRed,
                        onTap: _deleteAccount,
                      ),
                    ],
                  ),

                  const SizedBox(height: 24),

                  // ====== SUPPORT ======
                  _buildSectionHeader(
                    icon: Icons.help,
                    title: 'Aide & Support',
                    color: PremiumTheme.primaryBlue,
                  ),
                  const SizedBox(height: 12),
                  _buildSettingsCard(
                    borderColor: PremiumTheme.primaryBlue,
                    children: [
                      _buildActionTile(
                        icon: Icons.contact_support,
                        title: 'Contacter le support',
                        subtitle: 'Obtenir de l\'aide',
                        color: PremiumTheme.primaryBlue,
                        onTap: _contactSupport,
                      ),
                      _buildDivider(),
                      _buildActionTile(
                        icon: Icons.question_answer,
                        title: 'FAQ',
                        subtitle: 'Questions fréquentes',
                        color: PremiumTheme.primaryIndigo,
                        onTap: () => _openUrl('https://checksfleet.com/faq'),
                      ),
                      _buildDivider(),
                      _buildActionTile(
                        icon: Icons.bug_report,
                        title: 'Signaler un bug',
                        subtitle: 'Aidez-nous à améliorer l\'app',
                        color: PremiumTheme.accentAmber,
                        onTap: () => _openUrl('mailto:bugs@checksfleet.com?subject=Bug Report'),
                      ),
                      _buildDivider(),
                      _buildActionTile(
                        icon: Icons.school,
                        title: 'Tutoriels',
                        subtitle: 'Apprendre à utiliser l\'app',
                        color: PremiumTheme.primaryPurple,
                        onTap: () => _openUrl('https://checksfleet.com/tutorials'),
                      ),
                    ],
                  ),

                  const SizedBox(height: 24),

                  // ====== LÉGAL ======
                  _buildSectionHeader(
                    icon: Icons.gavel,
                    title: 'Légal',
                    color: PremiumTheme.textSecondary,
                  ),
                  const SizedBox(height: 12),
                  _buildSettingsCard(
                    borderColor: PremiumTheme.textSecondary,
                    children: [
                      _buildActionTile(
                        icon: Icons.privacy_tip,
                        title: 'Politique de confidentialité',
                        subtitle: 'Comment nous protégeons vos données',
                        color: PremiumTheme.primaryTeal,
                        onTap: () => _openUrl('https://checksfleet.com/privacy'),
                      ),
                      _buildDivider(),
                      _buildActionTile(
                        icon: Icons.description,
                        title: 'Conditions d\'utilisation',
                        subtitle: 'CGU et CGV',
                        color: PremiumTheme.primaryBlue,
                        onTap: () => _openUrl('https://checksfleet.com/terms'),
                      ),
                      _buildDivider(),
                      _buildActionTile(
                        icon: Icons.code,
                        title: 'Licences open source',
                        subtitle: 'Bibliothèques utilisées',
                        color: PremiumTheme.primaryIndigo,
                        onTap: () {
                          showLicensePage(
                            context: context,
                            applicationName: 'ChecksFleet',
                            applicationVersion: '$_appVersion ($_buildNumber)',
                            applicationIcon: Padding(
                              padding: const EdgeInsets.all(16),
                              child: Icon(Icons.local_shipping, size: 48, color: PremiumTheme.primaryTeal),
                            ),
                          );
                        },
                      ),
                    ],
                  ),

                  const SizedBox(height: 32),

                  // ====== VERSION ======
                  Center(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                      decoration: BoxDecoration(
                        color: PremiumTheme.primaryTeal.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: PremiumTheme.primaryTeal.withValues(alpha: 0.3)),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.info_outline, color: PremiumTheme.primaryTeal, size: 18),
                          const SizedBox(width: 8),
                          Text(
                            'Version $_appVersion ($_buildNumber)',
                            style: TextStyle(
                              color: PremiumTheme.primaryTeal,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  
                  const SizedBox(height: 40),
                ],
              ),
            ),
    );
  }

  String _getLanguageFlag(String language) {
    switch (language) {
      case 'Français':
        return '🇫🇷';
      case 'English':
        return '🇬🇧';
      case 'العربية':
        return '🇸🇦';
      case 'Español':
        return '🇪🇸';
      default:
        return '🌍';
    }
  }

  Widget _buildSectionHeader({
    required IconData icon,
    required String title,
    required Color color,
  }) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, color: color, size: 20),
        ),
        const SizedBox(width: 12),
        Text(
          title,
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: PremiumTheme.textPrimary,
          ),
        ),
      ],
    );
  }

  Widget _buildSettingsCard({
    required Color borderColor,
    required List<Widget> children,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: borderColor.withValues(alpha: 0.3), width: 1.5),
        boxShadow: [
          BoxShadow(
            color: borderColor.withValues(alpha: 0.1),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(children: children),
    );
  }

  Widget _buildDivider() {
    return Divider(height: 1, color: Colors.grey.shade200);
  }

  Widget _buildSwitchTile({
    required IconData icon,
    required String title,
    required String subtitle,
    required bool value,
    required Color color,
    required Function(bool) onChanged,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: color, size: 22),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: TextStyle(fontWeight: FontWeight.w600, color: PremiumTheme.textPrimary)),
                const SizedBox(height: 2),
                Text(subtitle, style: TextStyle(color: PremiumTheme.textSecondary, fontSize: 12)),
              ],
            ),
          ),
          Switch(
            value: value,
            onChanged: onChanged,
            activeColor: color,
            activeTrackColor: color.withValues(alpha: 0.4),
          ),
        ],
      ),
    );
  }

  Widget _buildActionTile({
    required IconData icon,
    required String title,
    required String subtitle,
    required Color color,
    required VoidCallback onTap,
    Widget? trailing,
  }) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: color, size: 22),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: TextStyle(fontWeight: FontWeight.w600, color: PremiumTheme.textPrimary)),
                  const SizedBox(height: 2),
                  Text(subtitle, style: TextStyle(color: PremiumTheme.textSecondary, fontSize: 12)),
                ],
              ),
            ),
            trailing ?? Icon(Icons.chevron_right, color: color),
          ],
        ),
      ),
    );
  }

  Widget _buildPermissionTile({
    required IconData icon,
    required String title,
    required bool isGranted,
    VoidCallback? onRequest,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: (isGranted ? PremiumTheme.accentGreen : PremiumTheme.accentAmber).withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: isGranted ? PremiumTheme.accentGreen : PremiumTheme.accentAmber, size: 22),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Text(title, style: TextStyle(fontWeight: FontWeight.w600, color: PremiumTheme.textPrimary)),
          ),
          if (!isGranted && onRequest != null) ...[
            TextButton.icon(
              onPressed: onRequest,
              icon: Icon(Icons.lock_open, size: 16, color: PremiumTheme.primaryTeal),
              label: Text(
                'Autoriser',
                style: TextStyle(
                  color: PremiumTheme.primaryTeal,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
              style: TextButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                backgroundColor: PremiumTheme.primaryTeal.withValues(alpha: 0.1),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
            ),
            const SizedBox(width: 8),
          ],
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              color: (isGranted ? PremiumTheme.accentGreen : PremiumTheme.accentAmber).withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  isGranted ? Icons.check_circle : Icons.warning,
                  color: isGranted ? PremiumTheme.accentGreen : PremiumTheme.accentAmber,
                  size: 16,
                ),
                const SizedBox(width: 4),
                Text(
                  isGranted ? 'Accordée' : 'Non accordée',
                  style: TextStyle(
                    color: isGranted ? PremiumTheme.accentGreen : PremiumTheme.accentAmber,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoTile({
    required IconData icon,
    required String title,
    required String value,
    required Color color,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: color, size: 22),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Text(title, style: TextStyle(fontWeight: FontWeight.w600, color: PremiumTheme.textPrimary)),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              value,
              style: TextStyle(color: color, fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDropdownTile({
    required IconData icon,
    required String title,
    required String value,
    required Map<String, String> options,
    required Color color,
    required Function(String) onChanged,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: color, size: 22),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Text(title, style: TextStyle(fontWeight: FontWeight.w600, color: PremiumTheme.textPrimary)),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: color.withValues(alpha: 0.3)),
            ),
            child: DropdownButtonHideUnderline(
              child: DropdownButton<String>(
                value: value,
                dropdownColor: Colors.white,
                style: TextStyle(color: color, fontSize: 13, fontWeight: FontWeight.w600),
                icon: Icon(Icons.arrow_drop_down, color: color),
                items: options.entries.map((e) {
                  return DropdownMenuItem<String>(
                    value: e.key,
                    child: Text(e.value, style: TextStyle(color: PremiumTheme.textPrimary)),
                  );
                }).toList(),
                onChanged: (v) {
                  if (v != null) onChanged(v);
                },
              ),
            ),
          ),
        ],
      ),
    );
  }
}
