import 'dart:async';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';
import '../../services/fraud_prevention_service.dart';
import '../../services/validation_service.dart';
import '../../main.dart';

/// Inscription simplifiee - 4 etapes rapides
/// 1. Type (Entreprise / Convoyeur)
/// 2. Infos personnelles + photo
/// 3. Email + mot de passe
/// 4. Resume + CGU
///
/// Le profil de facturation (SIRET, adresse, IBAN...) est rempli APRES.
class SignupWizardScreen extends StatefulWidget {
  const SignupWizardScreen({super.key});

  @override
  State<SignupWizardScreen> createState() => _SignupWizardScreenState();
}

class _SignupWizardScreenState extends State<SignupWizardScreen> {
  final PageController _pageController = PageController();
  final FraudPreventionService _fraudService = FraudPreventionService();

  int _currentStep = 0;
  bool _isLoading = false;
  bool _obscurePassword = true;

  // Phone duplicate check state
  bool _phoneChecked = false;
  bool _phoneAvailable = true;
  bool _checkingPhone = false;

  final Map<String, dynamic> _signupData = {
    'user_type': null, // 'company' or 'driver'
    'full_name': '',
    'email': '',
    'phone': '',
    'password': '',
    'avatar_path': null,
    'terms_accepted': false,
  };

  final _personalFormKey = GlobalKey<FormState>();
  final _credentialsFormKey = GlobalKey<FormState>();

  final _fullNameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  @override
  void dispose() {
    _pageController.dispose();
    _fullNameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  // ==========================================
  // NAVIGATION
  // ==========================================

  void _nextStep() {
    if (_currentStep < 3) {
      setState(() => _currentStep++);
      _pageController.animateToPage(
        _currentStep,
        duration: const Duration(milliseconds: 400),
        curve: Curves.easeInOut,
      );
    }
  }

  void _previousStep() {
    if (_currentStep > 0) {
      setState(() => _currentStep--);
      _pageController.animateToPage(
        _currentStep,
        duration: const Duration(milliseconds: 400),
        curve: Curves.easeInOut,
      );
    }
  }

  // ==========================================
  // PHONE UNIQUENESS CHECK
  // ==========================================

  Future<bool> _checkPhoneAvailability() async {
    final phone = _phoneController.text.trim();
    if (phone.isEmpty) return false;

    setState(() => _checkingPhone = true);
    try {
      // Normalize phone to match DB format
      String normalized = phone.replaceAll(RegExp(r'[\s\-\.\(\)]'), '');
      if (normalized.startsWith('0') && normalized.length == 10) {
        normalized = '+33${normalized.substring(1)}';
      }
      if (!normalized.startsWith('+')) normalized = '+$normalized';

      // Check both formats in profiles table
      final res = await supabase
          .from('profiles')
          .select('id')
          .or('phone.eq.$normalized,phone.eq.$phone')
          .limit(1);

      final available = (res as List).isEmpty;
      setState(() {
        _phoneChecked = true;
        _phoneAvailable = available;
      });
      return available;
    } catch (e) {
      debugPrint('Phone check error: $e');
      // If check fails, don't block — let signup continue
      setState(() {
        _phoneChecked = true;
        _phoneAvailable = true;
      });
      return true;
    } finally {
      if (mounted) setState(() => _checkingPhone = false);
    }
  }

  // ==========================================
  // STEP 1: USER TYPE
  // ==========================================

  Widget _buildStep1UserType() {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Quel est votre profil ?',
            style: TextStyle(fontSize: 26, fontWeight: FontWeight.bold),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 12),
          Text(
            'Choisissez pour une experience adaptee',
            style: TextStyle(fontSize: 15, color: Colors.grey[600]),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 40),

          _UserTypeCard(
            icon: Icons.business,
            title: 'Entreprise',
            description: 'Societe de transport, donneur d\'ordre',
            color: Colors.blue,
            isSelected: _signupData['user_type'] == 'company',
            onTap: () {
              setState(() => _signupData['user_type'] = 'company');
              Future.delayed(const Duration(milliseconds: 250), _nextStep);
            },
          ),

          const SizedBox(height: 16),

          _UserTypeCard(
            icon: Icons.local_shipping,
            title: 'Convoyeur',
            description: 'Chauffeur independant, auto-entrepreneur',
            color: const Color(0xFF14B8A6),
            isSelected: _signupData['user_type'] == 'driver',
            onTap: () {
              setState(() => _signupData['user_type'] = 'driver');
              Future.delayed(const Duration(milliseconds: 250), _nextStep);
            },
          ),
        ],
      ),
    );
  }

  // ==========================================
  // STEP 2: PERSONAL INFO
  // ==========================================

  Widget _buildStep2PersonalInfo() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Form(
        key: _personalFormKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'Informations personnelles',
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              'Parlez-nous un peu de vous',
              style: TextStyle(fontSize: 15, color: Colors.grey[600]),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 32),

            // Avatar
            Center(
              child: GestureDetector(
                onTap: _pickAvatar,
                child: Container(
                  width: 110,
                  height: 110,
                  decoration: BoxDecoration(
                    color: Colors.grey[100],
                    shape: BoxShape.circle,
                    border: Border.all(color: const Color(0xFF14B8A6), width: 3),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF14B8A6).withAlpha(51),
                        blurRadius: 12,
                        spreadRadius: 2,
                      ),
                    ],
                  ),
                  child: _signupData['avatar_path'] != null
                      ? ClipOval(
                          child: Image.file(
                            File(_signupData['avatar_path']),
                            fit: BoxFit.cover,
                            width: 110,
                            height: 110,
                          ),
                        )
                      : Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.add_a_photo, size: 36, color: Colors.grey[400]),
                            const SizedBox(height: 4),
                            Text('Photo', style: TextStyle(fontSize: 11, color: Colors.grey[500])),
                          ],
                        ),
                ),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Cliquez pour ajouter une photo (optionnel)',
              style: TextStyle(fontSize: 12, color: Colors.grey[500]),
              textAlign: TextAlign.center,
            ),

            const SizedBox(height: 32),

            TextFormField(
              controller: _fullNameController,
              decoration: InputDecoration(
                labelText: 'Nom complet *',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                prefixIcon: const Icon(Icons.person),
              ),
              textCapitalization: TextCapitalization.words,
              validator: (value) {
                final result = ValidationService.validateFullName(value ?? '');
                return result.isValid ? null : result.errorMessage;
              },
              onChanged: (value) => _signupData['full_name'] = value,
            ),

            const SizedBox(height: 24),

            ElevatedButton(
              onPressed: () {
                if (_personalFormKey.currentState!.validate()) {
                  _nextStep();
                }
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF0066FF),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.all(16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text('Continuer', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  SizedBox(width: 8),
                  Icon(Icons.arrow_forward, size: 20),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ==========================================
  // STEP 3: CREDENTIALS
  // ==========================================

  Widget _buildStep3Credentials() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Form(
        key: _credentialsFormKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'Creez votre compte',
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              'Vos identifiants de connexion',
              style: TextStyle(fontSize: 15, color: Colors.grey[600]),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 32),

            TextFormField(
              controller: _emailController,
              decoration: InputDecoration(
                labelText: 'Email *',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                prefixIcon: const Icon(Icons.email),
              ),
              keyboardType: TextInputType.emailAddress,
              validator: (value) {
                final result = ValidationService.validateEmail(value ?? '');
                return result.isValid ? null : result.errorMessage;
              },
              onChanged: (value) => _signupData['email'] = value,
            ),

            const SizedBox(height: 16),

            // Phone (obligatoire, unicité vérifiée)
            TextFormField(
              controller: _phoneController,
              decoration: InputDecoration(
                labelText: 'Telephone *',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                prefixIcon: const Icon(Icons.phone),
                hintText: '06 12 34 56 78',
                suffixIcon: _checkingPhone
                    ? const Padding(
                        padding: EdgeInsets.all(12),
                        child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)),
                      )
                    : _phoneChecked && _phoneAvailable
                        ? const Icon(Icons.check_circle, color: Color(0xFF10B981))
                        : _phoneChecked && !_phoneAvailable
                            ? const Icon(Icons.error, color: Colors.red)
                            : null,
              ),
              keyboardType: TextInputType.phone,
              validator: (value) {
                if (value == null || value.trim().isEmpty) {
                  return 'Le numero de telephone est requis';
                }
                if (_phoneChecked && !_phoneAvailable) {
                  return 'Ce numero est deja utilise. Connectez-vous ou utilisez un autre numero.';
                }
                return null;
              },
              onChanged: (value) {
                _signupData['phone'] = value;
                setState(() {
                  _phoneChecked = false;
                  _phoneAvailable = true;
                });
              },
            ),

            if (_phoneChecked && !_phoneAvailable) ...[
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.red[50],
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.red[200]!),
                ),
                child: Row(
                  children: [
                    Icon(Icons.warning_amber, color: Colors.red[700], size: 20),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Ce numero appartient deja a un compte. Utilisez un autre numero ou connectez-vous avec le compte existant.',
                        style: TextStyle(fontSize: 12, color: Colors.red[800]),
                      ),
                    ),
                  ],
                ),
              ),
            ],

            const SizedBox(height: 16),

            TextFormField(
              controller: _passwordController,
              decoration: InputDecoration(
                labelText: 'Mot de passe *',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                prefixIcon: const Icon(Icons.lock),
                suffixIcon: IconButton(
                  icon: Icon(_obscurePassword ? Icons.visibility_off : Icons.visibility),
                  onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                ),
              ),
              obscureText: _obscurePassword,
              validator: (value) {
                final result = ValidationService.validatePassword(value ?? '');
                return result.isValid ? null : result.errorMessage;
              },
              onChanged: (value) => _signupData['password'] = value,
            ),

            const SizedBox(height: 16),

            TextFormField(
              controller: _confirmPasswordController,
              decoration: InputDecoration(
                labelText: 'Confirmer le mot de passe *',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                prefixIcon: const Icon(Icons.lock_outline),
              ),
              obscureText: true,
              validator: (value) {
                final result = ValidationService.validatePassword(
                  _passwordController.text,
                  confirmPassword: value,
                );
                return result.isValid ? null : result.errorMessage;
              },
            ),

            const SizedBox(height: 24),

            ElevatedButton(
              onPressed: () async {
                if (_credentialsFormKey.currentState!.validate()) {
                  // Check phone uniqueness
                  final phoneOk = await _checkPhoneAvailability();
                  if (!phoneOk) {
                    _credentialsFormKey.currentState!.validate(); // Re-validate to show error
                    return;
                  }
                  final emailAvailable = await _fraudService.isEmailAvailable(
                    _emailController.text,
                  );
                  if (!emailAvailable && mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Cet email est deja utilise'),
                        backgroundColor: Colors.red,
                      ),
                    );
                    return;
                  }
                  _nextStep();
                }
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF0066FF),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.all(16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text('Continuer', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  SizedBox(width: 8),
                  Icon(Icons.arrow_forward, size: 20),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ==========================================
  // STEP 4: SUMMARY + CGU
  // ==========================================

  Widget _buildStep4Summary() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Recapitulatif',
            style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          Text(
            'Verifiez vos informations',
            style: TextStyle(fontSize: 15, color: Colors.grey[600]),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 24),

          // Summary card
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.grey[200]!),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withAlpha(13),
                  blurRadius: 10,
                ),
              ],
            ),
            child: Column(
              children: [
                Row(
                  children: [
                    CircleAvatar(
                      radius: 28,
                      backgroundColor: const Color(0xFF14B8A6),
                      backgroundImage: _signupData['avatar_path'] != null
                          ? FileImage(File(_signupData['avatar_path']))
                          : null,
                      child: _signupData['avatar_path'] == null
                          ? Text(
                              (_signupData['full_name'] as String).isNotEmpty
                                  ? (_signupData['full_name'] as String)[0].toUpperCase()
                                  : '?',
                              style: const TextStyle(
                                fontSize: 22,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                              ),
                            )
                          : null,
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _signupData['full_name'] ?? '',
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                            decoration: BoxDecoration(
                              color: _signupData['user_type'] == 'company'
                                  ? Colors.blue[50]
                                  : Colors.teal[50],
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Text(
                              _signupData['user_type'] == 'company'
                                  ? 'Entreprise'
                                  : 'Convoyeur',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                                color: _signupData['user_type'] == 'company'
                                    ? Colors.blue[800]
                                    : Colors.teal[800],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const Divider(height: 32),
                _SummaryItem(
                  icon: Icons.email,
                  label: 'Email',
                  value: _signupData['email'] ?? '',
                ),
                if ((_signupData['phone'] as String?)?.isNotEmpty == true) ...[
                  _SummaryItem(
                    icon: Icons.phone,
                    label: 'Telephone',
                    value: _signupData['phone'],
                  ),
                ],
              ],
            ),
          ),

          const SizedBox(height: 16),

          // Welcome gift — given after email verification
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.amber[50],
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.amber[300]!),
            ),
            child: Row(
              children: [
                const Text('🎁', style: TextStyle(fontSize: 28)),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Cadeau de bienvenue',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                          color: Colors.amber[900],
                        ),
                      ),
                      Text(
                        '10 credits offerts en validant votre email',
                        style: TextStyle(fontSize: 12, color: Colors.amber[800]),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // Info billing profile
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.blue[50],
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.blue[200]!),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Icons.info_outline, color: Colors.blue[700], size: 20),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Vous pourrez completer votre profil de facturation (SIRET, adresse, IBAN...) depuis votre espace.',
                    style: TextStyle(fontSize: 12, color: Colors.blue[900]),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 20),

          // CGU checkbox
          CheckboxListTile(
            value: _signupData['terms_accepted'] ?? false,
            onChanged: (value) => setState(() => _signupData['terms_accepted'] = value),
            title: const Text(
              'J\'accepte les conditions d\'utilisation et la politique de confidentialite',
              style: TextStyle(fontSize: 14),
            ),
            controlAffinity: ListTileControlAffinity.leading,
            contentPadding: EdgeInsets.zero,
            activeColor: const Color(0xFF14B8A6),
          ),

          const SizedBox(height: 24),

          ElevatedButton(
            onPressed: _signupData['terms_accepted'] == true ? _createAccount : null,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF10B981),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.all(16),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              disabledBackgroundColor: Colors.grey[300],
            ),
            child: _isLoading
                ? const SizedBox(
                    width: 24,
                    height: 24,
                    child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
                  )
                : const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.check, size: 22),
                      SizedBox(width: 8),
                      Text('Creer mon compte', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                    ],
                  ),
          ),
        ],
      ),
    );
  }

  // ==========================================
  // ACTIONS
  // ==========================================

  Future<void> _pickAvatar() async {
    final picker = ImagePicker();
    final image = await picker.pickImage(source: ImageSource.gallery, maxWidth: 512, maxHeight: 512);
    if (image != null && mounted) {
      setState(() => _signupData['avatar_path'] = image.path);
    }
  }

  Future<void> _createAccount() async {
    setState(() => _isLoading = true);

    try {
      // 1. Create Supabase Auth account with user metadata
      final authResponse = await supabase.auth.signUp(
        email: _signupData['email'],
        password: _signupData['password'],
        data: {
          'full_name': _signupData['full_name'],
          'user_type': _signupData['user_type'],
          'phone': _signupData['phone'] ?? '',
          'phone_verified': false,
        },
      );

      if (authResponse.user == null) {
        throw Exception('Erreur creation compte');
      }

      final userId = authResponse.user!.id;

      // 2. Upload avatar if present
      String? avatarUrl;
      if (_signupData['avatar_path'] != null) {
        final file = File(_signupData['avatar_path']);
        final fileName = 'avatar_$userId.jpg';
        await supabase.storage.from('avatars').upload(fileName, file);
        avatarUrl = supabase.storage.from('avatars').getPublicUrl(fileName);
      }

      // 3. Create/update profile (use upsert to avoid conflict with trigger)
      // NOTE: full_name is GENERATED ALWAYS — write to first_name + last_name instead!
      final deviceFingerprint = await _fraudService.getDeviceFingerprint();
      final ipAddress = await _fraudService.getPublicIP();

      final fullName = (_signupData['full_name'] ?? '') as String;
      final nameParts = fullName.trim().split(RegExp(r'\s+'));
      final firstName = nameParts.isNotEmpty ? nameParts.first : '';
      final lastName = nameParts.length > 1 ? nameParts.sublist(1).join(' ') : '';

      // Use NULL for empty phone to avoid unique constraint violation
      final phoneValue = (_signupData['phone'] ?? '').toString().trim();

      try {
        await supabase.from('profiles').upsert({
          'id': userId,
          'email': _signupData['email'],
          'first_name': firstName,
          'last_name': lastName,
          'phone': phoneValue.isEmpty ? null : phoneValue,
          'phone_verified': false,
          'avatar_url': avatarUrl,
          'user_type': _signupData['user_type'],
          'device_fingerprint': deviceFingerprint,
          'registration_ip': ipAddress,
          'app_role': _signupData['user_type'] == 'company' ? 'donneur_d_ordre' : 'convoyeur',
          'credits': 0,
        });
      } catch (profileErr) {
        // Profile upsert may fail (e.g. unique constraint on phone) but 
        // the trigger already created the profile — don't block signup
        debugPrint('Profile upsert warning (non-blocking): $profileErr');
      }

      // 4. Credits de bienvenue donnés après validation email (via trigger SQL)
      // Pas de crédits à l'inscription, ils seront ajoutés quand l'email est confirmé

      // 5. Log successful signup
      await _fraudService.logSignupAttempt(
        email: _signupData['email'],
        phone: _signupData['phone'] ?? '',
        stepReached: 4,
        success: true,
      );

      // 6. Navigate to email verification screen
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('✅ Inscription reussie ! Verifiez votre email pour recevoir vos 10 credits de bienvenue.'),
            backgroundColor: Color(0xFF10B981),
            duration: Duration(seconds: 4),
          ),
        );
        // Show verification message then go to login
        showDialog(
          context: context,
          barrierDismissible: false,
          builder: (ctx) => AlertDialog(
            title: const Text('Verifiez votre email'),
            content: Text(
              'Un email de verification a ete envoye a ${_signupData['email']}.\n\n'
              'Cliquez sur le lien dans l\'email pour activer votre compte, puis connectez-vous.',
            ),
            actions: [
              TextButton(
                onPressed: () {
                  Navigator.of(ctx).pop();
                  Navigator.of(context).pop(); // Back to login
                },
                child: const Text('Compris'),
              ),
            ],
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erreur: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }

      await _fraudService.logSignupAttempt(
        email: _signupData['email'],
        phone: _signupData['phone'] ?? '',
        stepReached: _currentStep + 1,
        success: false,
        failureReason: e.toString(),
      );
    }
  }

  // ==========================================
  // BUILD
  // ==========================================

  @override
  Widget build(BuildContext context) {
    final stepLabels = ['Profil', 'Identite', 'Compte', 'Confirmer'];
    final stepColors = [
      const Color(0xFF14B8A6),
      const Color(0xFF0066FF),
      const Color(0xFF8B7EE8),
      const Color(0xFF10B981),
    ];

    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Creer un compte', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            Text(
              'Etape ${_currentStep + 1} sur ${stepLabels.length}',
              style: TextStyle(fontSize: 12, color: Colors.grey[600]),
            ),
          ],
        ),
        leading: _currentStep > 0
            ? IconButton(
                icon: const Icon(Icons.arrow_back),
                onPressed: _previousStep,
              )
            : null,
        elevation: 0,
        backgroundColor: Colors.transparent,
      ),
      body: Column(
        children: [
          // Progress bar
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
            child: Row(
              children: List.generate(stepLabels.length, (i) {
                return Expanded(
                  child: Padding(
                    padding: EdgeInsets.only(right: i < stepLabels.length - 1 ? 8 : 0),
                    child: Column(
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(4),
                          child: LinearProgressIndicator(
                            value: i < _currentStep ? 1.0 : (i == _currentStep ? 0.5 : 0.0),
                            backgroundColor: Colors.grey[200],
                            color: stepColors[i],
                            minHeight: 4,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          stepLabels[i],
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                            color: i <= _currentStep ? stepColors[i] : Colors.grey[400],
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }),
            ),
          ),

          // Page content
          Expanded(
            child: PageView(
              controller: _pageController,
              physics: const NeverScrollableScrollPhysics(),
              children: [
                _buildStep1UserType(),
                _buildStep2PersonalInfo(),
                _buildStep3Credentials(),
                _buildStep4Summary(),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ==========================================
// WIDGETS HELPERS
// ==========================================

class _UserTypeCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String description;
  final Color color;
  final bool isSelected;
  final VoidCallback onTap;

  const _UserTypeCard({
    required this.icon,
    required this.title,
    required this.description,
    required this.color,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          border: Border.all(
            color: isSelected ? color : Colors.grey[300]!,
            width: isSelected ? 2.5 : 1,
          ),
          borderRadius: BorderRadius.circular(16),
          color: isSelected ? color.withAlpha(25) : Colors.white,
          boxShadow: isSelected
              ? [BoxShadow(color: color.withAlpha(38), blurRadius: 12, spreadRadius: 1)]
              : null,
        ),
        child: Row(
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [color, color.withAlpha(179)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Icon(icon, size: 28, color: Colors.white),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.bold,
                      color: isSelected ? color : Colors.black87,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    description,
                    style: TextStyle(fontSize: 13, color: Colors.grey[600]),
                  ),
                ],
              ),
            ),
            Container(
              width: 28,
              height: 28,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: isSelected ? color : Colors.transparent,
                border: Border.all(
                  color: isSelected ? color : Colors.grey[400]!,
                  width: 2,
                ),
              ),
              child: isSelected
                  ? const Icon(Icons.check, color: Colors.white, size: 18)
                  : null,
            ),
          ],
        ),
      ),
    );
  }
}

class _SummaryItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _SummaryItem({
    required this.icon,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Icon(icon, color: Colors.grey[500], size: 20),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: TextStyle(fontSize: 12, color: Colors.grey[500])),
              Text(value, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w500)),
            ],
          ),
        ],
      ),
    );
  }
}