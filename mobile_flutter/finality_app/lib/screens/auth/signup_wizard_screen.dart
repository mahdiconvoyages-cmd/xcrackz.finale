import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';
import '../../services/fraud_prevention_service.dart';
import '../../services/validation_service.dart';
import '../../main.dart';
import '../home_screen.dart';

/// Écran d'inscription intelligent avec questionnaire progressif (7 étapes)
/// Collecte toutes les informations nécessaires et prévient la fraude
class SignupWizardScreen extends StatefulWidget {
  const SignupWizardScreen({super.key});

  @override
  State<SignupWizardScreen> createState() => _SignupWizardScreenState();
}

class _SignupWizardScreenState extends State<SignupWizardScreen> {
  final PageController _pageController = PageController();
  final FraudPreventionService _fraudService = FraudPreventionService();

  // État de la progression
  int _currentStep = 0;
  bool _isLoading = false;

  // Données collectées
  final Map<String, dynamic> _signupData = {
    'user_type': null, // 'company', 'driver', 'individual'
    'full_name': '',
    'email': '',
    'phone': '',
    'password': '',
    'avatar_path': null,
    'company_name': '',
    'siret': '',
    'logo_path': null,
    'legal_address': '',
    'company_size': null,
    'fleet_size': 0,
    'bank_iban': '',
    'terms_accepted': false,
  };

  // Contrôleurs de formulaire
  final _step2FormKey = GlobalKey<FormState>();
  final _step3FormKey = GlobalKey<FormState>();
  final _step5FormKey = GlobalKey<FormState>();

  final _fullNameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  final _companyNameController = TextEditingController();
  final _siretController = TextEditingController();
  final _ibanController = TextEditingController();
  final _billingAddressController = TextEditingController();
  final _billingPostalCodeController = TextEditingController();
  final _billingCityController = TextEditingController();
  final _billingEmailController = TextEditingController();
  final _tvaNumberController = TextEditingController();

  @override
  void dispose() {
    _pageController.dispose();
    _fullNameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    _companyNameController.dispose();
    _siretController.dispose();
    _ibanController.dispose();
    _billingAddressController.dispose();
    _billingPostalCodeController.dispose();
    _billingCityController.dispose();
    _billingEmailController.dispose();
    _tvaNumberController.dispose();
    super.dispose();
  }

  // ==========================================
  // NAVIGATION
  // ==========================================

  void _nextStep() {
    if (_currentStep < 6) {
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
  // ÉTAPES
  // ==========================================

  Widget _buildStep1UserType() {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Vous êtes...',
            style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 12),
          const Text(
            'Choisissez votre profil pour une expérience adaptée',
            style: TextStyle(fontSize: 16, color: Colors.grey),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 40),

          // Option: Entreprise
          _UserTypeCard(
            icon: Icons.business,
            title: 'Entreprise',
            description: 'Gestion de flotte, missions multiples',
            isSelected: _signupData['user_type'] == 'company',
            onTap: () {
              setState(() => _signupData['user_type'] = 'company');
              Future.delayed(const Duration(milliseconds: 300), _nextStep);
            },
          ),

          const SizedBox(height: 16),

          // Option: Conducteur indépendant
          _UserTypeCard(
            icon: Icons.local_shipping,
            title: 'Conducteur',
            description: 'Convoyeur indépendant, auto-entrepreneur',
            isSelected: _signupData['user_type'] == 'driver',
            onTap: () {
              setState(() => _signupData['user_type'] = 'driver');
              Future.delayed(const Duration(milliseconds: 300), _nextStep);
            },
          ),

          const SizedBox(height: 16),

          // Option: Particulier
          _UserTypeCard(
            icon: Icons.person,
            title: 'Particulier',
            description: 'Utilisation occasionnelle',
            isSelected: _signupData['user_type'] == 'individual',
            onTap: () {
              setState(() => _signupData['user_type'] = 'individual');
              Future.delayed(const Duration(milliseconds: 300), _nextStep);
            },
          ),
        ],
      ),
    );
  }

  Widget _buildStep2PersonalInfo() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Form(
        key: _step2FormKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'Informations personnelles',
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 24),

            // Avatar (optionnel)
            Center(
              child: GestureDetector(
                onTap: _pickAvatar,
                child: Container(
                  width: 100,
                  height: 100,
                  decoration: BoxDecoration(
                    color: Colors.grey[200],
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.blue, width: 2),
                  ),
                  child: _signupData['avatar_path'] != null
                      ? ClipOval(
                          child: Image.file(
                            File(_signupData['avatar_path']),
                            fit: BoxFit.cover,
                          ),
                        )
                      : const Icon(Icons.add_a_photo, size: 40, color: Colors.grey),
                ),
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Cliquez pour ajouter une photo (optionnel)',
              style: TextStyle(fontSize: 12, color: Colors.grey),
              textAlign: TextAlign.center,
            ),

            const SizedBox(height: 32),

            // Nom complet
            TextFormField(
              controller: _fullNameController,
              decoration: const InputDecoration(
                labelText: 'Nom complet *',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.person),
              ),
              validator: (value) {
                final result = ValidationService.validateFullName(value ?? '');
                return result.isValid ? null : result.errorMessage;
              },
              onChanged: (value) => _signupData['full_name'] = value,
            ),

            const SizedBox(height: 16),

            // Email
            TextFormField(
              controller: _emailController,
              decoration: const InputDecoration(
                labelText: 'Email *',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.email),
              ),
              keyboardType: TextInputType.emailAddress,
              validator: (value) {
                final result = ValidationService.validateEmail(value ?? '');
                return result.isValid ? null : result.errorMessage;
              },
              onChanged: (value) => _signupData['email'] = value,
            ),

            const SizedBox(height: 16),

            // Téléphone
            TextFormField(
              controller: _phoneController,
              decoration: const InputDecoration(
                labelText: 'Téléphone *',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.phone),
                hintText: '06 12 34 56 78',
              ),
              keyboardType: TextInputType.phone,
              validator: (value) {
                final result = ValidationService.validatePhone(value ?? '');
                return result.isValid ? null : result.errorMessage;
              },
              onChanged: (value) => _signupData['phone'] = value,
            ),

            const SizedBox(height: 16),

            // Mot de passe
            TextFormField(
              controller: _passwordController,
              decoration: const InputDecoration(
                labelText: 'Mot de passe *',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.lock),
              ),
              obscureText: true,
              validator: (value) {
                final result = ValidationService.validatePassword(value ?? '');
                return result.isValid ? null : result.errorMessage;
              },
              onChanged: (value) => _signupData['password'] = value,
            ),

            const SizedBox(height: 16),

            // Confirmation mot de passe
            TextFormField(
              controller: _confirmPasswordController,
              decoration: const InputDecoration(
                labelText: 'Confirmer le mot de passe *',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.lock_outline),
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
                if (_step2FormKey.currentState!.validate()) {
                  // Vérifier si email disponible
                  final emailAvailable = await _fraudService.isEmailAvailable(
                    _emailController.text,
                  );
                  if (!emailAvailable && mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Cet email est déjà utilisé'),
                        backgroundColor: Colors.red,
                      ),
                    );
                    return;
                  }
                  _nextStep();
                }
              },
              child: const Padding(
                padding: EdgeInsets.all(16),
                child: Text('Continuer', style: TextStyle(fontSize: 16)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStep3CompanyInfo() {
    // Si pas une entreprise, passer cette étape
    if (_signupData['user_type'] != 'company') {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted && _currentStep == 2) {
          _nextStep();
        }
      });
      return const Center(child: CircularProgressIndicator());
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Form(
        key: _step3FormKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'Informations entreprise',
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 24),

            // Logo entreprise
            Center(
              child: GestureDetector(
                onTap: _pickLogo,
                child: Container(
                  width: 120,
                  height: 120,
                  decoration: BoxDecoration(
                    color: Colors.grey[200],
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.blue, width: 2),
                  ),
                  child: _signupData['logo_path'] != null
                      ? ClipRRect(
                          borderRadius: BorderRadius.circular(10),
                          child: Image.file(
                            File(_signupData['logo_path']),
                            fit: BoxFit.cover,
                          ),
                        )
                      : const Icon(Icons.business, size: 50, color: Colors.grey),
                ),
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Cliquez pour ajouter le logo',
              style: TextStyle(fontSize: 12, color: Colors.grey),
              textAlign: TextAlign.center,
            ),

            const SizedBox(height: 32),

            // Nom entreprise
            TextFormField(
              controller: _companyNameController,
              decoration: const InputDecoration(
                labelText: 'Nom de l\'entreprise *',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.business),
              ),
              validator: (value) {
                final result = ValidationService.validateCompanyName(value ?? '');
                return result.isValid ? null : result.errorMessage;
              },
              onChanged: (value) => _signupData['company_name'] = value,
            ),

            const SizedBox(height: 16),

            // SIRET
            TextFormField(
              controller: _siretController,
              decoration: const InputDecoration(
                labelText: 'SIRET *',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.numbers),
                hintText: '123 456 789 01234',
                helperText: 'Sera vérifié via l\'API INSEE',
              ),
              keyboardType: TextInputType.number,
              maxLength: 17, // 14 chiffres + 3 espaces
              validator: (value) {
                if (!ValidationService.isValidSiretFormat(value ?? '')) {
                  return 'Format SIRET invalide (14 chiffres)';
                }
                return null;
              },
              onChanged: (value) {
                // Auto-formattage
                final formatted = ValidationService.formatSiret(value);
                if (formatted != value) {
                  _siretController.value = TextEditingValue(
                    text: formatted,
                    selection: TextSelection.collapsed(offset: formatted.length),
                  );
                }
                _signupData['siret'] = ValidationService.cleanSiret(value);
              },
            ),

            const SizedBox(height: 16),

            // Taille entreprise
            DropdownButtonFormField<String>(
              decoration: const InputDecoration(
                labelText: 'Taille de l\'entreprise *',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.people),
              ),
              items: const [
                DropdownMenuItem(value: 'solo', child: Text('Solo / Micro')),
                DropdownMenuItem(value: 'small', child: Text('Petite (2-10 employés)')),
                DropdownMenuItem(value: 'medium', child: Text('Moyenne (11-50 employés)')),
                DropdownMenuItem(value: 'large', child: Text('Grande (50+ employés)')),
              ],
              onChanged: (value) => setState(() => _signupData['company_size'] = value),
              validator: (value) => value == null ? 'Requis' : null,
            ),

            const SizedBox(height: 16),

            // Taille de flotte
            TextFormField(
              decoration: const InputDecoration(
                labelText: 'Nombre de véhicules dans votre flotte',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.directions_car),
              ),
              keyboardType: TextInputType.number,
              initialValue: '0',
              onChanged: (value) => _signupData['fleet_size'] = int.tryParse(value) ?? 0,
            ),

            const SizedBox(height: 24),

            ElevatedButton(
              onPressed: () async {
                if (_step3FormKey.currentState!.validate()) {
                  // Valider SIRET via INSEE
                  setState(() => _isLoading = true);
                  final siretResult = await ValidationService.validateSiretWithInsee(
                    _siretController.text,
                  );
                  if (!mounted) return;
                  setState(() => _isLoading = false);

                  if (!mounted) return;

                  if (!siretResult.isValid) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(siretResult.errorMessage ?? 'SIRET invalide'),
                        backgroundColor: Colors.red,
                      ),
                    );
                    return;
                  }

                  // Vérifier si SIRET déjà utilisé
                  final siretAvailable = await _fraudService.isSiretAvailable(
                    _signupData['siret'],
                  );
                  if (!siretAvailable && mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Ce SIRET est déjà associé à un compte'),
                        backgroundColor: Colors.red,
                      ),
                    );
                    return;
                  }

                  // Auto-remplir l'adresse depuis INSEE
                  if (siretResult.address != null) {
                    _signupData['legal_address'] = siretResult.address;
                  }

                  _nextStep();
                }
              },
              child: _isLoading
                  ? const CircularProgressIndicator(color: Colors.white)
                  : const Padding(
                      padding: EdgeInsets.all(16),
                      child: Text('Continuer', style: TextStyle(fontSize: 16)),
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStep4Verification() {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Vérification',
            style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 24),

          const Text(
            'Pour sécuriser votre compte et prévenir les fraudes, nous devons vérifier vos informations.',
            style: TextStyle(fontSize: 14, color: Colors.grey),
          ),

          const SizedBox(height: 32),

          // Email
          _VerificationTile(
            icon: Icons.email,
            title: 'Email',
            subtitle: _signupData['email'],
            isVerified: false,
            onVerify: () async {
              // Email sera vérifié automatiquement par Supabase après inscription
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Un email de vérification sera envoyé après inscription'),
                ),
              );
            },
          ),

          const SizedBox(height: 16),

          // Téléphone
          _VerificationTile(
            icon: Icons.phone,
            title: 'Téléphone',
            subtitle: _signupData['phone'],
            isVerified: false,
            onVerify: () async {
              // TODO: Implémenter vérification SMS OTP
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Vérification SMS disponible prochainement'),
                ),
              );
            },
          ),

          const Spacer(),

          ElevatedButton(
            onPressed: _nextStep,
            child: const Padding(
              padding: EdgeInsets.all(16),
              child: Text('Continuer', style: TextStyle(fontSize: 16)),
            ),
          ),

          const SizedBox(height: 8),

          TextButton(
            onPressed: _nextStep,
            child: const Text('Passer cette étape'),
          ),
        ],
      ),
    );
  }

  Widget _buildStep5Banking() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Form(
        key: _step5FormKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'Profil de facturation',
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            const Text(
              'Ces informations apparaîtront sur toutes vos factures',
              style: TextStyle(fontSize: 14, color: Colors.grey),
            ),

            const SizedBox(height: 24),

            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.amber[50],
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.amber[300]!),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.receipt_long, color: Colors.amber[800], size: 28),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Pourquoi ces informations ?',
                          style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                        ),
                        SizedBox(height: 4),
                        Text(
                          'Ces données seront automatiquement insérées sur les factures que vous générerez pour vos missions. Elles sont obligatoires pour une facturation conforme.',
                          style: TextStyle(fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // SIRET
            TextFormField(
              controller: _siretController,
              decoration: const InputDecoration(
                labelText: 'Numéro SIRET *',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.business),
                hintText: '123 456 789 00012',
                helperText: 'Obligatoire pour facturer en France',
              ),
              keyboardType: TextInputType.number,
              validator: (value) {
                if (value == null || value.trim().isEmpty) {
                  return 'Le SIRET est obligatoire pour la facturation';
                }
                final siret = value.replaceAll(RegExp(r'\s'), '');
                if (siret.length != 14) {
                  return 'Le SIRET doit contenir 14 chiffres';
                }
                return null;
              },
              onChanged: (value) => _signupData['siret'] = value,
            ),

            const SizedBox(height: 16),

            // Adresse de facturation
            TextFormField(
              controller: _billingAddressController,
              decoration: const InputDecoration(
                labelText: 'Adresse de facturation *',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.location_on),
                hintText: '123 rue de la République',
                helperText: 'Adresse qui apparaîtra sur vos factures',
              ),
              keyboardType: TextInputType.streetAddress,
              validator: (value) {
                if (value == null || value.trim().isEmpty) {
                  return 'L\'adresse est obligatoire';
                }
                return null;
              },
              onChanged: (value) => _signupData['billing_address'] = value,
            ),

            const SizedBox(height: 16),

            // Code postal et Ville
            Row(
              children: [
                Expanded(
                  flex: 2,
                  child: TextFormField(
                    controller: _billingPostalCodeController,
                    decoration: const InputDecoration(
                      labelText: 'Code postal *',
                      border: OutlineInputBorder(),
                      prefixIcon: Icon(Icons.markunread_mailbox),
                      hintText: '75001',
                    ),
                    keyboardType: TextInputType.number,
                    validator: (value) {
                      if (value == null || value.trim().isEmpty) {
                        return 'Requis';
                      }
                      if (value.length != 5) {
                        return 'Code postal invalide';
                      }
                      return null;
                    },
                    onChanged: (value) => _signupData['billing_postal_code'] = value,
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  flex: 3,
                  child: TextFormField(
                    controller: _billingCityController,
                    decoration: const InputDecoration(
                      labelText: 'Ville *',
                      border: OutlineInputBorder(),
                      prefixIcon: Icon(Icons.location_city),
                      hintText: 'Paris',
                    ),
                    keyboardType: TextInputType.text,
                    validator: (value) {
                      if (value == null || value.trim().isEmpty) {
                        return 'La ville est requise';
                      }
                      return null;
                    },
                    onChanged: (value) => _signupData['billing_city'] = value,
                  ),
                ),
              ],
            ),

            const SizedBox(height: 16),

            // Email de facturation
            TextFormField(
              controller: _billingEmailController,
              decoration: const InputDecoration(
                labelText: 'Email de facturation *',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.email),
                hintText: 'facturation@entreprise.fr',
                helperText: 'Pour recevoir les notifications de facture',
              ),
              keyboardType: TextInputType.emailAddress,
              validator: (value) {
                if (value == null || value.trim().isEmpty) {
                  return 'L\'email de facturation est obligatoire';
                }
                if (!value.contains('@')) {
                  return 'Email invalide';
                }
                return null;
              },
              onChanged: (value) => _signupData['billing_email'] = value,
            ),

            const SizedBox(height: 24),

            const Divider(),
            const SizedBox(height: 8),
            const Text(
              'Informations optionnelles',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: Colors.grey),
            ),
            const SizedBox(height: 16),

            // IBAN
            TextFormField(
              controller: _ibanController,
              decoration: const InputDecoration(
                labelText: 'IBAN (optionnel)',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.account_balance),
                hintText: 'FR76 1234 5678 9012 3456 7890 123',
                helperText: 'Pour recevoir vos paiements',
              ),
              keyboardType: TextInputType.text,
              onChanged: (value) => _signupData['bank_iban'] = value,
            ),

            const SizedBox(height: 16),

            // Numéro TVA intracommunautaire
            TextFormField(
              controller: _tvaNumberController,
              decoration: const InputDecoration(
                labelText: 'N° TVA intracommunautaire (optionnel)',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.euro),
                hintText: 'FR12345678901',
                helperText: 'Si vous êtes assujetti à la TVA',
              ),
              keyboardType: TextInputType.text,
              onChanged: (value) => _signupData['tva_number'] = value,
            ),

            const SizedBox(height: 16),

            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.blue[50],
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.blue[200]!),
              ),
              child: Row(
                children: [
                  Icon(Icons.info, color: Colors.blue[700]),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Text(
                      'Toutes ces informations sont modifiables à tout moment depuis votre profil.',
                      style: TextStyle(fontSize: 12),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            ElevatedButton(
              onPressed: () {
                if (_step5FormKey.currentState!.validate()) {
                  _nextStep();
                }
              },
              child: const Padding(
                padding: EdgeInsets.all(16),
                child: Text('Continuer', style: TextStyle(fontSize: 16)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStep6FraudCheck() {
    // Vérification automatique en arrière-plan
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      if (_isLoading || !mounted || _currentStep != 5) return; // Déjà en cours ou pas sur cette étape

      setState(() => _isLoading = true);

      // Analyser fraude
      final fraudResult = await _fraudService.performFraudCheck(
        email: _signupData['email'],
        phone: _signupData['phone'],
        siret: _signupData['siret'],
      );

      if (!mounted) return;
      setState(() => _isLoading = false);

      if (!mounted) return;

      // Si bloqué, afficher message et retourner
      if (fraudResult.shouldBlock) {
        _fraudService.showFraudWarning(context, fraudResult);
        await _fraudService.logSignupAttempt(
          email: _signupData['email'],
          phone: _signupData['phone'],
          stepReached: 6,
          success: false,
          failureReason: 'Fraud check blocked',
        );
        Navigator.pop(context); // Retour au login
        return;
      }

      // Si nécessite revue manuelle, informer
      if (fraudResult.needsManualReview) {
        _fraudService.showFraudWarning(context, fraudResult);
      }

      // Continuer vers étape finale
      _nextStep();
    });

    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const CircularProgressIndicator(),
          const SizedBox(height: 24),
          const Text(
            'Vérification de sécurité...',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),
          Text(
            'Analyse anti-fraude en cours',
            style: TextStyle(fontSize: 14, color: Colors.grey[600]),
          ),
        ],
      ),
    );
  }

  Widget _buildStep7Summary() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Récapitulatif',
            style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 24),

          _SummaryItem(
            icon: Icons.person,
            label: 'Nom',
            value: _signupData['full_name'],
          ),
          _SummaryItem(
            icon: Icons.email,
            label: 'Email',
            value: _signupData['email'],
          ),
          _SummaryItem(
            icon: Icons.phone,
            label: 'Téléphone',
            value: _signupData['phone'],
          ),

          if (_signupData['user_type'] == 'company') ...[
            const Divider(height: 32),
            _SummaryItem(
              icon: Icons.business,
              label: 'Entreprise',
              value: _signupData['company_name'],
            ),
            _SummaryItem(
              icon: Icons.numbers,
              label: 'SIRET',
              value: ValidationService.formatSiret(_signupData['siret'] ?? ''),
            ),
          ],

          const SizedBox(height: 32),

          // Conditions d'utilisation
          CheckboxListTile(
            value: _signupData['terms_accepted'] ?? false,
            onChanged: (value) => setState(() => _signupData['terms_accepted'] = value),
            title: const Text('J\'accepte les conditions d\'utilisation'),
            controlAffinity: ListTileControlAffinity.leading,
            contentPadding: EdgeInsets.zero,
          ),

          const SizedBox(height: 24),

          ElevatedButton(
            onPressed: _signupData['terms_accepted'] == true
                ? _createAccount
                : null,
            child: _isLoading
                ? const CircularProgressIndicator(color: Colors.white)
                : const Padding(
                    padding: EdgeInsets.all(16),
                    child: Text('Créer mon compte', style: TextStyle(fontSize: 16)),
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
    final image = await picker.pickImage(source: ImageSource.gallery);
    if (image != null && mounted) {
      setState(() => _signupData['avatar_path'] = image.path);
    }
  }

  Future<void> _pickLogo() async {
    final picker = ImagePicker();
    final image = await picker.pickImage(source: ImageSource.gallery);
    if (image != null && mounted) {
      setState(() => _signupData['logo_path'] = image.path);
    }
  }

  Future<void> _createAccount() async {
    setState(() => _isLoading = true);

    try {
      // 1. Créer compte Supabase Auth
      final authResponse = await supabase.auth.signUp(
        email: _signupData['email'],
        password: _signupData['password'],
      );

      if (authResponse.user == null) {
        throw Exception('Erreur création compte');
      }

      final userId = authResponse.user!.id;

      // 2. Upload avatar si présent
      String? avatarUrl;
      if (_signupData['avatar_path'] != null) {
        final file = File(_signupData['avatar_path']);
        final fileName = 'avatar_$userId.jpg';
        await supabase.storage.from('avatars').upload(fileName, file);
        avatarUrl = supabase.storage.from('avatars').getPublicUrl(fileName);
      }

      // 3. Upload logo si présent (entreprise)
      String? logoUrl;
      if (_signupData['logo_path'] != null) {
        final file = File(_signupData['logo_path']);
        final fileName = 'logo_$userId.jpg';
        await supabase.storage.from('logos').upload(fileName, file);
        logoUrl = supabase.storage.from('logos').getPublicUrl(fileName);
      }

      // 4. Créer profil complet
      final deviceFingerprint = await _fraudService.getDeviceFingerprint();
      final ipAddress = await _fraudService.getPublicIP();

      await supabase.from('profiles').insert({
        'user_id': userId,
        'email': _signupData['email'],
        'full_name': _signupData['full_name'],
        'phone': _signupData['phone'],
        'avatar_url': avatarUrl,
        'user_type': _signupData['user_type'],
        'company': _signupData['company_name'],
        'siret': _signupData['siret'],
        'logo_url': logoUrl,
        'legal_address': _signupData['legal_address'],
        'company_size': _signupData['company_size'],
        'fleet_size': _signupData['fleet_size'],
        'bank_iban': _signupData['bank_iban'],
        'device_fingerprint': deviceFingerprint,
        'registration_ip': ipAddress,
        'app_role': _signupData['user_type'] == 'company' ? 'donneur_d_ordre' : 'convoyeur',
      });

      // 5. Log tentative réussie
      await _fraudService.logSignupAttempt(
        email: _signupData['email'],
        phone: _signupData['phone'],
        stepReached: 7,
        success: true,
      );

      // 6. Redirection vers home
      if (mounted) {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (context) => const HomeScreen()),
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

      // Log tentative échouée
      await _fraudService.logSignupAttempt(
        email: _signupData['email'],
        phone: _signupData['phone'],
        stepReached: 7,
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
    return Scaffold(
      appBar: AppBar(
        title: const Text('Inscription'),
        leading: _currentStep > 0
            ? IconButton(
                icon: const Icon(Icons.arrow_back),
                onPressed: _previousStep,
              )
            : null,
      ),
      body: Column(
        children: [
          // Indicateur de progression
          LinearProgressIndicator(
            value: (_currentStep + 1) / 7,
            backgroundColor: Colors.grey[200],
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Text(
              'Étape ${_currentStep + 1} sur 7',
              style: TextStyle(fontSize: 14, color: Colors.grey[600]),
            ),
          ),

          // Contenu des étapes
          Expanded(
            child: PageView(
              controller: _pageController,
              physics: const NeverScrollableScrollPhysics(),
              children: [
                _buildStep1UserType(),
                _buildStep2PersonalInfo(),
                _buildStep3CompanyInfo(),
                _buildStep4Verification(),
                _buildStep5Banking(),
                _buildStep6FraudCheck(),
                _buildStep7Summary(),
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
  final bool isSelected;
  final VoidCallback onTap;

  const _UserTypeCard({
    required this.icon,
    required this.title,
    required this.description,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          border: Border.all(
            color: isSelected ? Colors.blue : Colors.grey[300]!,
            width: isSelected ? 2 : 1,
          ),
          borderRadius: BorderRadius.circular(12),
          color: isSelected ? Colors.blue[50] : Colors.white,
        ),
        child: Row(
          children: [
            Icon(icon, size: 40, color: isSelected ? Colors.blue : Colors.grey),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: isSelected ? Colors.blue : Colors.black,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    description,
                    style: TextStyle(fontSize: 14, color: Colors.grey[600]),
                  ),
                ],
              ),
            ),
            if (isSelected) const Icon(Icons.check_circle, color: Colors.blue),
          ],
        ),
      ),
    );
  }
}

class _VerificationTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final bool isVerified;
  final VoidCallback onVerify;

  const _VerificationTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.isVerified,
    required this.onVerify,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        border: Border.all(color: Colors.grey[300]!),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Icon(icon, color: Colors.blue),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
                Text(subtitle, style: TextStyle(fontSize: 12, color: Colors.grey[600])),
              ],
            ),
          ),
          isVerified
              ? const Icon(Icons.verified, color: Colors.green)
              : TextButton(
                  onPressed: onVerify,
                  child: const Text('Vérifier'),
                ),
        ],
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
          Icon(icon, color: Colors.blue, size: 20),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: TextStyle(fontSize: 12, color: Colors.grey[600])),
              Text(value, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w500)),
            ],
          ),
        ],
      ),
    );
  }
}
