import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../theme/premium_theme.dart';
import '../../widgets/premium/premium_widgets.dart';
import '../../l10n/app_localizations.dart';
import '../../providers/locale_provider.dart';

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  bool _locationEnabled = true;
  bool _locationPermissionGranted = true;
  bool _backgroundLocationGranted = false;
  bool _notificationsEnabled = true;
  bool _darkMode = true;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadSettings();
  }

  Future<void> _loadSettings() async {
    setState(() => _isLoading = true);
    
    try {
      final prefs = await SharedPreferences.getInstance();
      
      // Charger les préférences
      _notificationsEnabled = prefs.getBool('notifications') ?? true;
      _darkMode = prefs.getBool('darkMode') ?? true;
      
      // Vérifier les permissions
      final locationStatus = await Permission.location.status;
      final locationAlwaysStatus = await Permission.locationAlways.status;
      
      setState(() {
        _locationPermissionGranted = locationStatus.isGranted;
        _backgroundLocationGranted = locationAlwaysStatus.isGranted;
        _locationEnabled = _locationPermissionGranted;
        _isLoading = false;
      });
    } catch (e) {
      debugPrint('Erreur chargement paramètres: $e');
      setState(() => _isLoading = false);
    }
  }

  Future<void> _saveLanguage(String language) async {
    // Utiliser le LocaleProvider Riverpod pour changer la langue immédiatement
    await ref.read(localeNotifierProvider.notifier).setLocaleByCode(
      AppLocalizations.getCodeFromName(language),
    );
    
    if (mounted) {
      final l10n = AppLocalizations.of(context);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('${l10n.language}: $language ✓'),
          backgroundColor: PremiumTheme.primaryTeal,
          behavior: SnackBarBehavior.floating,
          duration: const Duration(seconds: 2),
        ),
      );
    }
  }

  Future<void> _toggleNotifications(bool value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('notifications', value);
    setState(() => _notificationsEnabled = value);
  }

  Future<void> _toggleDarkMode(bool value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('darkMode', value);
    setState(() => _darkMode = value);
    
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Mode ${value ? "sombre" : "clair"} activé (Redémarrez l\'app)'),
          backgroundColor: PremiumTheme.primaryTeal,
          behavior: SnackBarBehavior.floating,
          duration: const Duration(seconds: 3),
        ),
      );
    }
  }

  Future<void> _requestLocationPermission() async {
    final status = await Permission.location.request();
    
    if (status.isGranted) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool('location', true);
      
      setState(() {
        _locationPermissionGranted = true;
        _locationEnabled = true;
      });
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('✅ Permission de localisation accordée'),
            backgroundColor: Colors.green,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } else if (status.isDenied || status.isPermanentlyDenied) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('❌ Permission refusée. Activez-la dans les paramètres'),
            backgroundColor: Colors.red,
            behavior: SnackBarBehavior.floating,
            duration: Duration(seconds: 3),
          ),
        );
      }
      
      if (status.isPermanentlyDenied) {
        await openAppSettings();
      }
    }
  }

  Future<void> _requestBackgroundLocation() async {
    if (!_locationPermissionGranted) {
      await _requestLocationPermission();
    }
    
    final status = await Permission.locationAlways.request();
    
    if (status.isGranted) {
      setState(() => _backgroundLocationGranted = true);
      
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Accès localisation en arrière-plan accordé'),
          backgroundColor: Colors.green,
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  void _openAppSettings() {
    openAppSettings();
    
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Ouvrez Autorisations > Emplacement et sélectionnez "Autoriser tout le temps"'),
        duration: Duration(seconds: 4),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: PremiumTheme.lightBg,
      appBar: AppBar(
        title: Text(
          'Paramètres d\'application',
          style: PremiumTheme.heading3,
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
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Section Langue
                  _buildSectionCard(
                    icon: Icons.language,
                    title: AppLocalizations.of(context).language,
                    gradientColors: [PremiumTheme.primaryBlue, PremiumTheme.primaryIndigo],
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          AppLocalizations.of(context).selectLanguage,
                          style: PremiumTheme.body.copyWith(
                            color: Colors.white70,
                          ),
                        ),
                        const SizedBox(height: 12),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(PremiumTheme.radiusMD),
                            border: Border.all(
                              color: Colors.white.withValues(alpha: 0.2),
                            ),
                          ),
                          child: Builder(
                            builder: (context) {
                              final locale = ref.watch(localeNotifierProvider);
                              final languageName = AppLocalizations.getNameFromCode(locale.languageCode);
                              return DropdownButtonHideUnderline(
                                child: DropdownButton<String>(
                                  value: languageName,
                                  isExpanded: true,
                                  dropdownColor: PremiumTheme.cardBg,
                                  style: PremiumTheme.body,
                                  icon: const Icon(Icons.arrow_drop_down, color: Colors.white),
                                  items: AppLocalizations.languageNames.values
                                      .map((String value) {
                                    return DropdownMenuItem<String>(
                                      value: value,
                                      child: Text(value),
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
                  
                  const SizedBox(height: 24),
                  
                  // Section Géolocalisation
                  _buildSectionCard(
                    icon: Icons.location_on,
                    title: 'Services de géolocalisation',
                    gradientColors: [PremiumTheme.primaryTeal, PremiumTheme.primaryBlue],
                    child: Column(
                      children: [
                        _buildPermissionRow(
                          icon: Icons.gps_fixed,
                          title: 'Services de géolocalisation',
                          subtitle: _locationEnabled ? 'Activé' : 'Désactivé',
                          isEnabled: _locationEnabled,
                          color: PremiumTheme.primaryTeal,
                        ),
                      ],
                    ),
                  ),
                  
                  const SizedBox(height: 24),
                  
                  // Section Autorisations
                  _buildSectionCard(
                    icon: Icons.security,
                    title: 'Autorisations de suivi de localisation',
                    gradientColors: [PremiumTheme.primaryPurple, PremiumTheme.primaryIndigo],
                    child: Column(
                      children: [
                        _buildPermissionRow(
                          icon: Icons.check_circle,
                          title: 'Autoriser l\'accès à votre position',
                          subtitle: _locationPermissionGranted 
                              ? 'Permission accordée' 
                              : 'Permission non accordée',
                          isEnabled: _locationPermissionGranted,
                          color: _locationPermissionGranted 
                              ? Colors.green
                              : Colors.grey,
                        ),
                        const SizedBox(height: 16),
                        _buildPermissionRow(
                          icon: _backgroundLocationGranted 
                              ? Icons.check_circle 
                              : Icons.warning,
                          title: 'Position en arrière plan',
                          subtitle: _backgroundLocationGranted 
                              ? 'Permission accordée' 
                              : 'Permission non accordée',
                          isEnabled: _backgroundLocationGranted,
                          color: _backgroundLocationGranted 
                              ? Colors.green
                              : Colors.orange,
                        ),
                        const SizedBox(height: 24),
                        Text(
                          'Cliquez sur le bouton ci-dessous pour ouvrir les paramètres de l\'application et accédez à Autorisations > Emplacement et sélectionnez « Autoriser tout le temps ».',
                          style: PremiumTheme.caption.copyWith(
                            color: Colors.white60,
                          ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 16),
                        PremiumButton(
                          text: 'Ouvrir les paramètres de l\'application',
                          onPressed: _openAppSettings,
                          gradient: LinearGradient(
                            colors: [PremiumTheme.primaryBlue, PremiumTheme.primaryIndigo],
                          ),
                        ),
                      ],
                    ),
                  ),
                  
                  const SizedBox(height: 24),
                  
                  // Section Notifications
                  _buildSectionCard(
                    icon: Icons.notifications,
                    title: 'Notifications',
                    gradientColors: [PremiumTheme.primaryPurple, PremiumTheme.primaryBlue],
                    child: _buildSwitchRow(
                      icon: Icons.notifications_active,
                      title: 'Activer les notifications',
                      subtitle: 'Recevoir les alertes importantes',
                      value: _notificationsEnabled,
                      onChanged: _toggleNotifications,
                    ),
                  ),
                  
                  const SizedBox(height: 24),
                  
                  // Section Apparence
                  _buildSectionCard(
                    icon: Icons.palette,
                    title: 'Apparence',
                    gradientColors: [PremiumTheme.primaryIndigo, PremiumTheme.primaryPurple],
                    child: _buildSwitchRow(
                      icon: Icons.dark_mode,
                      title: 'Mode sombre',
                      subtitle: 'Thème premium activé',
                      value: _darkMode,
                      onChanged: _toggleDarkMode,
                    ),
                  ),
                  
                  const SizedBox(height: 32),
                  
                  // Info version
                  Center(
                    child: Text(
                      'Version 3.1.0 (26)',
                      style: PremiumTheme.caption.copyWith(
                        color: Colors.white38,
                      ),
                    ),
                  ),
                ],
              ),
            ),
    );
  }

  Widget _buildSectionCard({
    required IconData icon,
    required String title,
    required List<Color> gradientColors,
    required Widget child,
  }) {
    return PremiumCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  gradient: LinearGradient(colors: gradientColors),
                  borderRadius: BorderRadius.circular(PremiumTheme.radiusMD),
                  boxShadow: const [
                    BoxShadow(
                      color: Colors.black26,
                      blurRadius: 8,
                      offset: Offset(0, 4),
                    ),
                  ],
                ),
                child: Icon(icon, color: Colors.white, size: 24),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Text(
                  title,
                  style: PremiumTheme.heading4,
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          child,
        ],
      ),
    );
  }

  Widget _buildPermissionRow({
    required IconData icon,
    required String title,
    required String subtitle,
    required bool isEnabled,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(PremiumTheme.radiusMD),
        border: Border.all(
          color: Colors.white.withValues(alpha: 0.1),
        ),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.2),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: PremiumTheme.body.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  subtitle,
                  style: PremiumTheme.caption.copyWith(
                    color: color,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSwitchRow({
    required IconData icon,
    required String title,
    required String subtitle,
    required bool value,
    required Function(bool) onChanged,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(PremiumTheme.radiusMD),
        border: Border.all(
          color: Colors.white.withValues(alpha: 0.1),
        ),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: PremiumTheme.primaryTeal.withValues(alpha: 0.2),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: PremiumTheme.primaryTeal, size: 20),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: PremiumTheme.body.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  subtitle,
                  style: PremiumTheme.caption.copyWith(
                    color: Colors.white60,
                  ),
                ),
              ],
            ),
          ),
          Switch(
            value: value,
            onChanged: onChanged,
            activeColor: PremiumTheme.primaryTeal,
            activeTrackColor: PremiumTheme.primaryTeal.withValues(alpha: 0.5),
          ),
        ],
      ),
    );
  }
}
