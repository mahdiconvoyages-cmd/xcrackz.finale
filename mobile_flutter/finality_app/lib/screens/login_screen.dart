import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../main.dart';
import 'home_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen>
    with TickerProviderStateMixin {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  bool _isLoading = false;
  bool _obscurePassword = true;
  bool _rememberMe = false;
  String? _errorMessage;

  // Animation Controllers
  late AnimationController _mainController;
  late AnimationController _pulseController;
  late AnimationController _snowController;
  late AnimationController _twinkleController;
  late Animation<double> _fadeAnimation;
  late Animation<Offset> _slideAnimation;
  late Animation<double> _scaleAnimation;

  // Focus nodes for glow effects
  final _emailFocus = FocusNode();
  final _passwordFocus = FocusNode();
  bool _emailHasFocus = false;
  bool _passwordHasFocus = false;

  @override
  void initState() {
    super.initState();
    _setupAnimations();
    _setupFocusListeners();
  }

  void _setupAnimations() {
    // Main entrance animation
    _mainController = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    );

    // Pulsing animation for logo
    _pulseController = AnimationController(
      duration: const Duration(milliseconds: 2000),
      vsync: this,
    )..repeat(reverse: true);

    // Snow falling animation
    _snowController = AnimationController(
      duration: const Duration(seconds: 20),
      vsync: this,
    )..repeat();

    // Twinkling stars/lights animation
    _twinkleController = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    )..repeat(reverse: true);

    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _mainController,
        curve: const Interval(0.0, 0.5, curve: Curves.easeOut),
      ),
    );

    _slideAnimation = Tween<Offset>(
      begin: const Offset(0, 0.3),
      end: Offset.zero,
    ).animate(
      CurvedAnimation(
        parent: _mainController,
        curve: const Interval(0.2, 0.8, curve: Curves.easeOutCubic),
      ),
    );

    _scaleAnimation = Tween<double>(begin: 0.8, end: 1.0).animate(
      CurvedAnimation(
        parent: _mainController,
        curve: const Interval(0.0, 0.6, curve: Curves.elasticOut),
      ),
    );

    _mainController.forward();
  }

  void _setupFocusListeners() {
    _emailFocus.addListener(() {
      setState(() => _emailHasFocus = _emailFocus.hasFocus);
    });
    _passwordFocus.addListener(() {
      setState(() => _passwordHasFocus = _passwordFocus.hasFocus);
    });
  }

  @override
  void dispose() {
    _mainController.dispose();
    _pulseController.dispose();
    _snowController.dispose();
    _twinkleController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _emailFocus.dispose();
    _passwordFocus.dispose();
    super.dispose();
  }

  // Christmas Colors
  static const Color christmasRed = Color(0xFFC41E3A);
  static const Color christmasGreen = Color(0xFF228B22);
  static const Color christmasGold = Color(0xFFFFD700);
  static const Color christmasDarkRed = Color(0xFF8B0000);
  static const Color christmasLightGreen = Color(0xFF90EE90);
  static const Color snowWhite = Color(0xFFF8F8FF);
  static const Color iceBlue = Color(0xFFE0F7FA);
  static const Color darkNight = Color(0xFF0D1B2A);

  Future<void> _login() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      await supabase.auth.signInWithPassword(
        email: _emailController.text.trim(),
        password: _passwordController.text,
      );

      if (mounted) {
        HapticFeedback.lightImpact();
        Navigator.pushReplacementNamed(context, '/home');
      }
    } on AuthException catch (e) {
      setState(() {
        _errorMessage = _getErrorMessage(e.message);
      });
      HapticFeedback.heavyImpact();
    } catch (e) {
      setState(() {
        _errorMessage = 'Une erreur est survenue';
      });
      HapticFeedback.heavyImpact();
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  String _getErrorMessage(String error) {
    if (error.contains('Invalid login credentials')) {
      return 'Email ou mot de passe incorrect';
    } else if (error.contains('Email not confirmed')) {
      return 'Veuillez confirmer votre email';
    } else if (error.contains('network')) {
      return 'Erreur de connexion réseau';
    }
    return error;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          // Animated Christmas Background
          _ChristmasBackground(
            snowController: _snowController,
            twinkleController: _twinkleController,
          ),

          // Main Content
          SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: FadeTransition(
                  opacity: _fadeAnimation,
                  child: SlideTransition(
                    position: _slideAnimation,
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const SizedBox(height: 20),
                        _buildChristmasLogo(),
                        const SizedBox(height: 16),
                        _buildTitleSection(),
                        const SizedBox(height: 8),
                        _buildChristmasGreeting(),
                        const SizedBox(height: 32),
                        _buildForm(),
                        const SizedBox(height: 24),
                        _buildLoginButton(),
                        const SizedBox(height: 16),
                        _buildAdditionalOptions(),
                        const SizedBox(height: 24),
                        _buildDivider(),
                        const SizedBox(height: 24),
                        _buildSocialButtons(),
                        const SizedBox(height: 32),
                        _buildRegisterInfo(),
                        const SizedBox(height: 20),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),

          // Christmas decorations overlay
          _buildChristmasDecorations(),
        ],
      ),
    );
  }

  Widget _buildChristmasLogo() {
    return ScaleTransition(
      scale: _scaleAnimation,
      child: AnimatedBuilder(
        animation: _pulseController,
        builder: (context, child) {
          final pulse = 1.0 + (_pulseController.value * 0.05);
          return Transform.scale(
            scale: pulse,
            child: Stack(
              alignment: Alignment.center,
              children: [
                // Outer glow
                Container(
                  width: 140,
                  height: 140,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: christmasGold.withOpacity(0.3),
                        blurRadius: 40,
                        spreadRadius: 10,
                      ),
                      BoxShadow(
                        color: christmasRed.withOpacity(0.2),
                        blurRadius: 60,
                        spreadRadius: 20,
                      ),
                    ],
                  ),
                ),
                // Main ornament ball
                Container(
                  width: 120,
                  height: 120,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [
                        christmasRed,
                        christmasDarkRed,
                      ],
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: christmasRed.withOpacity(0.5),
                        blurRadius: 20,
                        offset: const Offset(0, 10),
                      ),
                    ],
                  ),
                  child: Stack(
                    children: [
                      // Shine effect
                      Positioned(
                        top: 15,
                        left: 20,
                        child: Container(
                          width: 30,
                          height: 20,
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(10),
                            gradient: LinearGradient(
                              colors: [
                                Colors.white.withOpacity(0.5),
                                Colors.white.withOpacity(0.0),
                              ],
                            ),
                          ),
                        ),
                      ),
                      // Gold ring at top
                      Align(
                        alignment: Alignment.topCenter,
                        child: Transform.translate(
                          offset: const Offset(0, -8),
                          child: Container(
                            width: 24,
                            height: 16,
                            decoration: BoxDecoration(
                              color: christmasGold,
                              borderRadius: BorderRadius.circular(4),
                              boxShadow: [
                                BoxShadow(
                                  color: christmasGold.withOpacity(0.5),
                                  blurRadius: 8,
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                      // Logo text
                      Center(
                        child: Text(
                          '🎄',
                          style: TextStyle(
                            fontSize: 50,
                            shadows: [
                              Shadow(
                                color: Colors.black.withOpacity(0.3),
                                blurRadius: 10,
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildTitleSection() {
    return ShaderMask(
      shaderCallback: (bounds) => LinearGradient(
        colors: [
          christmasGold,
          Colors.white,
          christmasGold,
        ],
        stops: const [0.0, 0.5, 1.0],
      ).createShader(bounds),
      child: const Text(
        'CheckFlow',
        style: TextStyle(
          fontSize: 42,
          fontWeight: FontWeight.bold,
          color: Colors.white,
          letterSpacing: 4,
          shadows: [
            Shadow(
              color: Colors.black54,
              blurRadius: 10,
              offset: Offset(2, 2),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildChristmasGreeting() {
    return AnimatedBuilder(
      animation: _twinkleController,
      builder: (context, child) {
        return Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              '⭐',
              style: TextStyle(
                fontSize: 18,
                shadows: [
                  Shadow(
                    color: christmasGold.withOpacity(_twinkleController.value),
                    blurRadius: 20,
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            Text(
              'Joyeuses Fêtes !',
              style: TextStyle(
                fontSize: 16,
                color: snowWhite.withOpacity(0.9),
                fontWeight: FontWeight.w500,
                letterSpacing: 2,
              ),
            ),
            const SizedBox(width: 8),
            Text(
              '⭐',
              style: TextStyle(
                fontSize: 18,
                shadows: [
                  Shadow(
                    color: christmasGold.withOpacity(1 - _twinkleController.value),
                    blurRadius: 20,
                  ),
                ],
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _buildForm() {
    return Form(
      key: _formKey,
      child: Column(
        children: [
          if (_errorMessage != null) ...[
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: christmasRed.withOpacity(0.2),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: christmasRed.withOpacity(0.5)),
              ),
              child: Row(
                children: [
                  Icon(Icons.error_outline, color: christmasRed, size: 20),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _errorMessage!,
                      style: TextStyle(color: snowWhite, fontSize: 14),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
          ],
          _buildChristmasInputField(
            controller: _emailController,
            focusNode: _emailFocus,
            hasFocus: _emailHasFocus,
            label: 'Email',
            hint: 'votre@email.com',
            icon: Icons.email_outlined,
            keyboardType: TextInputType.emailAddress,
            validator: (value) {
              if (value == null || value.isEmpty) {
                return 'Veuillez entrer votre email';
              }
              if (!value.contains('@')) {
                return 'Email invalide';
              }
              return null;
            },
          ),
          const SizedBox(height: 16),
          _buildChristmasInputField(
            controller: _passwordController,
            focusNode: _passwordFocus,
            hasFocus: _passwordHasFocus,
            label: 'Mot de passe',
            hint: '••••••••',
            icon: Icons.lock_outlined,
            obscureText: _obscurePassword,
            suffixIcon: IconButton(
              icon: Icon(
                _obscurePassword ? Icons.visibility_off : Icons.visibility,
                color: christmasGold.withOpacity(0.7),
              ),
              onPressed: () {
                setState(() => _obscurePassword = !_obscurePassword);
              },
            ),
            validator: (value) {
              if (value == null || value.isEmpty) {
                return 'Veuillez entrer votre mot de passe';
              }
              if (value.length < 6) {
                return 'Minimum 6 caractères';
              }
              return null;
            },
          ),
        ],
      ),
    );
  }

  Widget _buildChristmasInputField({
    required TextEditingController controller,
    required FocusNode focusNode,
    required bool hasFocus,
    required String label,
    required String hint,
    required IconData icon,
    TextInputType? keyboardType,
    bool obscureText = false,
    Widget? suffixIcon,
    String? Function(String?)? validator,
  }) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 300),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        boxShadow: hasFocus
            ? [
                BoxShadow(
                  color: christmasGold.withOpacity(0.3),
                  blurRadius: 15,
                  spreadRadius: 2,
                ),
              ]
            : [],
      ),
      child: TextFormField(
        controller: controller,
        focusNode: focusNode,
        keyboardType: keyboardType,
        obscureText: obscureText,
        validator: validator,
        style: const TextStyle(color: Colors.white, fontSize: 16),
        decoration: InputDecoration(
          labelText: label,
          hintText: hint,
          labelStyle: TextStyle(
            color: hasFocus ? christmasGold : snowWhite.withOpacity(0.7),
          ),
          hintStyle: TextStyle(color: snowWhite.withOpacity(0.3)),
          prefixIcon: Icon(
            icon,
            color: hasFocus ? christmasGold : snowWhite.withOpacity(0.5),
          ),
          suffixIcon: suffixIcon,
          filled: true,
          fillColor: Colors.white.withOpacity(0.1),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(16),
            borderSide: BorderSide.none,
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(16),
            borderSide: BorderSide(
              color: christmasGreen.withOpacity(0.3),
              width: 1.5,
            ),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(16),
            borderSide: BorderSide(
              color: christmasGold,
              width: 2,
            ),
          ),
          errorBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(16),
            borderSide: BorderSide(color: christmasRed, width: 1.5),
          ),
          focusedErrorBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(16),
            borderSide: BorderSide(color: christmasRed, width: 2),
          ),
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 20,
            vertical: 18,
          ),
        ),
      ),
    );
  }

  Widget _buildLoginButton() {
    return SizedBox(
      width: double.infinity,
      height: 56,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 300),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          gradient: LinearGradient(
            colors: _isLoading
                ? [christmasGreen.withOpacity(0.5), christmasGreen.withOpacity(0.3)]
                : [christmasGreen, christmasLightGreen.withOpacity(0.8), christmasGreen],
          ),
          boxShadow: [
            BoxShadow(
              color: christmasGreen.withOpacity(0.4),
              blurRadius: 15,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: ElevatedButton(
          onPressed: _isLoading ? null : _login,
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.transparent,
            shadowColor: Colors.transparent,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
          ),
          child: _isLoading
              ? Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    SizedBox(
                      width: 24,
                      height: 24,
                      child: CircularProgressIndicator(
                        strokeWidth: 2.5,
                        valueColor: AlwaysStoppedAnimation<Color>(snowWhite),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Text(
                      'Connexion...',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: snowWhite,
                      ),
                    ),
                  ],
                )
              : Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      '🎅',
                      style: TextStyle(fontSize: 24),
                    ),
                    const SizedBox(width: 12),
                    Text(
                      'Se connecter',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                        letterSpacing: 1,
                      ),
                    ),
                  ],
                ),
        ),
      ),
    );
  }

  Widget _buildAdditionalOptions() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        // Remember me
        Row(
          children: [
            SizedBox(
              width: 24,
              height: 24,
              child: Checkbox(
                value: _rememberMe,
                onChanged: (value) {
                  setState(() => _rememberMe = value ?? false);
                },
                fillColor: WidgetStateProperty.resolveWith((states) {
                  if (states.contains(WidgetState.selected)) {
                    return christmasGreen;
                  }
                  return Colors.transparent;
                }),
                side: BorderSide(color: christmasGold.withOpacity(0.5)),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(4),
                ),
              ),
            ),
            const SizedBox(width: 8),
            Text(
              'Se souvenir',
              style: TextStyle(
                color: snowWhite.withOpacity(0.8),
                fontSize: 14,
              ),
            ),
          ],
        ),
        // Forgot password
        TextButton(
          onPressed: () => _showForgotPasswordSheet(),
          child: Text(
            'Mot de passe oublié ?',
            style: TextStyle(
              color: christmasGold,
              fontSize: 14,
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildDivider() {
    return Row(
      children: [
        Expanded(
          child: Container(
            height: 1,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  Colors.transparent,
                  christmasGold.withOpacity(0.5),
                ],
              ),
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Text(
            '🎄 OU 🎄',
            style: TextStyle(
              color: snowWhite.withOpacity(0.7),
              fontSize: 12,
            ),
          ),
        ),
        Expanded(
          child: Container(
            height: 1,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  christmasGold.withOpacity(0.5),
                  Colors.transparent,
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildSocialButtons() {
    return Row(
      children: [
        Expanded(
          child: _buildSocialButton(
            icon: 'G',
            label: 'Google',
            color: christmasRed,
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Row(
                    children: [
                      Text('🎁 '),
                      Text('Google Sign-In bientôt disponible!'),
                    ],
                  ),
                  backgroundColor: christmasGreen,
                ),
              );
            },
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: _buildSocialButton(
            icon: '',
            label: 'Apple',
            color: snowWhite,
            textColor: darkNight,
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Row(
                    children: [
                      Text('🎁 '),
                      Text('Apple Sign-In bientôt disponible!'),
                    ],
                  ),
                  backgroundColor: christmasGreen,
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildSocialButton({
    required String icon,
    required String label,
    required Color color,
    Color textColor = Colors.white,
    required VoidCallback onPressed,
  }) {
    return Container(
      height: 52,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: christmasGold.withOpacity(0.3),
          width: 1,
        ),
      ),
      child: ElevatedButton(
        onPressed: onPressed,
        style: ElevatedButton.styleFrom(
          backgroundColor: color.withOpacity(0.1),
          foregroundColor: textColor,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              icon,
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
            const SizedBox(width: 8),
            Text(
              label,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: snowWhite,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRegisterInfo() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.05),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: christmasGold.withOpacity(0.2)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text('🎁', style: TextStyle(fontSize: 20)),
          const SizedBox(width: 12),
          Flexible(
            child: Text(
              'Contactez votre administrateur pour créer un compte',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: snowWhite.withOpacity(0.7),
                fontSize: 13,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildChristmasDecorations() {
    return IgnorePointer(
      child: Stack(
        children: [
          // Top left holly
          Positioned(
            top: 40,
            left: 16,
            child: Transform.rotate(
              angle: 0.3,
              child: Text('🍀', style: TextStyle(fontSize: 28)),
            ),
          ),
          // Top right ornament
          Positioned(
            top: 60,
            right: 20,
            child: Text('🔔', style: TextStyle(fontSize: 26)),
          ),
          // Bottom decorations
          Positioned(
            bottom: 80,
            left: 20,
            child: Text('❄️', style: TextStyle(fontSize: 22)),
          ),
          Positioned(
            bottom: 100,
            right: 24,
            child: Text('🎀', style: TextStyle(fontSize: 24)),
          ),
        ],
      ),
    );
  }

  void _showForgotPasswordSheet() {
    final resetEmailController = TextEditingController();
    
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom,
        ),
        decoration: BoxDecoration(
          color: darkNight,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          border: Border.all(color: christmasGold.withOpacity(0.3)),
        ),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: christmasGold.withOpacity(0.3),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 24),
              Text(
                '🎄 Réinitialisation 🎄',
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                  color: snowWhite,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Entrez votre email pour recevoir un lien de réinitialisation',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: snowWhite.withOpacity(0.7),
                  fontSize: 14,
                ),
              ),
              const SizedBox(height: 24),
              TextFormField(
                controller: resetEmailController,
                keyboardType: TextInputType.emailAddress,
                style: const TextStyle(color: Colors.white),
                decoration: InputDecoration(
                  labelText: 'Email',
                  labelStyle: TextStyle(color: christmasGold),
                  prefixIcon: Icon(Icons.email, color: christmasGold),
                  filled: true,
                  fillColor: Colors.white.withOpacity(0.1),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide.none,
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(color: christmasGreen.withOpacity(0.3)),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(color: christmasGold, width: 2),
                  ),
                ),
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  onPressed: () async {
                    if (resetEmailController.text.isNotEmpty) {
                      try {
                        await supabase.auth.resetPasswordForEmail(
                          resetEmailController.text.trim(),
                        );
                        if (mounted) {
                          Navigator.pop(context);
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Row(
                                children: [
                                  Text('🎁 '),
                                  Text('Email de réinitialisation envoyé!'),
                                ],
                              ),
                              backgroundColor: christmasGreen,
                            ),
                          );
                        }
                      } catch (e) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text('Erreur: ${e.toString()}'),
                            backgroundColor: christmasRed,
                          ),
                        );
                      }
                    }
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: christmasGreen,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text('🎅', style: TextStyle(fontSize: 20)),
                      const SizedBox(width: 8),
                      Text(
                        'Envoyer',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }
}

// Christmas animated background with snow
class _ChristmasBackground extends StatelessWidget {
  final AnimationController snowController;
  final AnimationController twinkleController;

  const _ChristmasBackground({
    required this.snowController,
    required this.twinkleController,
  });

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        // Dark gradient background
        Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [
                Color(0xFF0D1B2A),
                Color(0xFF1B2838),
                Color(0xFF0D1B2A),
              ],
            ),
          ),
        ),
        // Subtle Christmas gradient overlay
        Container(
          decoration: BoxDecoration(
            gradient: RadialGradient(
              center: Alignment.topRight,
              radius: 1.5,
              colors: [
                Color(0xFFC41E3A).withOpacity(0.1),
                Colors.transparent,
              ],
            ),
          ),
        ),
        Container(
          decoration: BoxDecoration(
            gradient: RadialGradient(
              center: Alignment.bottomLeft,
              radius: 1.5,
              colors: [
                Color(0xFF228B22).withOpacity(0.1),
                Colors.transparent,
              ],
            ),
          ),
        ),
        // Animated snowflakes
        AnimatedBuilder(
          animation: snowController,
          builder: (context, child) {
            return CustomPaint(
              painter: _SnowPainter(
                progress: snowController.value,
                twinkle: twinkleController.value,
              ),
              size: Size.infinite,
            );
          },
        ),
      ],
    );
  }
}

// Snowflake painter
class _SnowPainter extends CustomPainter {
  final double progress;
  final double twinkle;
  final List<_Snowflake> snowflakes;

  _SnowPainter({required this.progress, required this.twinkle})
      : snowflakes = List.generate(
          60,
          (index) => _Snowflake(
            x: (index * 17.3) % 1.0,
            y: (index * 23.7) % 1.0,
            size: 2 + (index % 5) * 1.5,
            speed: 0.3 + (index % 4) * 0.2,
            opacity: 0.3 + (index % 3) * 0.2,
            isSpecial: index % 10 == 0,
          ),
        );

  @override
  void paint(Canvas canvas, Size size) {
    for (var flake in snowflakes) {
      final y = ((flake.y + progress * flake.speed) % 1.2) * size.height - size.height * 0.1;
      final x = flake.x * size.width + sin(progress * 2 * pi + flake.y * 10) * 20;
      
      final opacity = flake.opacity * (0.7 + twinkle * 0.3);
      
      if (flake.isSpecial) {
        // Draw a star/sparkle
        _drawStar(canvas, x, y, flake.size * 1.5, opacity);
      } else {
        // Draw regular snowflake
        final paint = Paint()
          ..color = Colors.white.withOpacity(opacity)
          ..style = PaintingStyle.fill;
        
        canvas.drawCircle(Offset(x, y), flake.size, paint);
        
        // Add subtle glow
        final glowPaint = Paint()
          ..color = Colors.white.withOpacity(opacity * 0.3)
          ..maskFilter = MaskFilter.blur(BlurStyle.normal, flake.size * 2);
        canvas.drawCircle(Offset(x, y), flake.size, glowPaint);
      }
    }
  }

  void _drawStar(Canvas canvas, double x, double y, double size, double opacity) {
    final paint = Paint()
      ..color = Color(0xFFFFD700).withOpacity(opacity)
      ..style = PaintingStyle.fill;

    final path = Path();
    for (int i = 0; i < 4; i++) {
      final angle = i * pi / 2;
      final outerX = x + cos(angle) * size;
      final outerY = y + sin(angle) * size;
      final innerX = x + cos(angle + pi / 4) * size * 0.4;
      final innerY = y + sin(angle + pi / 4) * size * 0.4;
      
      if (i == 0) {
        path.moveTo(outerX, outerY);
      } else {
        path.lineTo(outerX, outerY);
      }
      path.lineTo(innerX, innerY);
    }
    path.close();
    canvas.drawPath(path, paint);

    // Add glow to star
    final glowPaint = Paint()
      ..color = Color(0xFFFFD700).withOpacity(opacity * 0.5)
      ..maskFilter = MaskFilter.blur(BlurStyle.normal, size);
    canvas.drawCircle(Offset(x, y), size * 0.5, glowPaint);
  }

  @override
  bool shouldRepaint(covariant _SnowPainter oldDelegate) => true;
}

class _Snowflake {
  final double x;
  final double y;
  final double size;
  final double speed;
  final double opacity;
  final bool isSpecial;

  _Snowflake({
    required this.x,
    required this.y,
    required this.size,
    required this.speed,
    required this.opacity,
    required this.isSpecial,
  });
}
