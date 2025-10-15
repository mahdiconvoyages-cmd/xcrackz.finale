import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function SignupScreen({ navigation }: any) {
  const { signUp, signInWithGoogle } = useAuth();
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            company: company || null,
          },
        },
      });

      if (error) throw error;

      Alert.alert(
        'Inscription réussie !',
        'Un email de confirmation a été envoyé à votre adresse. Veuillez vérifier votre boîte de réception.',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    } catch (error: any) {
      Alert.alert('Erreur d\'inscription', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (error: any) {
      Alert.alert('Erreur Google', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0b1220" />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Feather name="arrow-left" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.title}>Créer un compte</Text>
            <Text style={styles.subtitle}>Rejoignez xCrackz dès maintenant</Text>
          </View>

          {/* Formulaire d'Inscription */}
          <View style={styles.formContainer}>
            {/* Nom complet */}
            <View style={styles.inputContainer}>
              <View style={styles.inputIconContainer}>
                <Feather name="user" size={20} color="#64748b" />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Nom complet *"
                placeholderTextColor="#94a3af"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>

            {/* Entreprise (optionnel) */}
            <View style={styles.inputContainer}>
              <View style={styles.inputIconContainer}>
                <Feather name="briefcase" size={20} color="#64748b" />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Entreprise (optionnel)"
                placeholderTextColor="#94a3af"
                value={company}
                onChangeText={setCompany}
                autoCapitalize="words"
              />
            </View>

            {/* Email */}
            <View style={styles.inputContainer}>
              <View style={styles.inputIconContainer}>
                <Feather name="mail" size={20} color="#64748b" />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Email *"
                placeholderTextColor="#94a3af"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Mot de passe */}
            <View style={styles.inputContainer}>
              <View style={styles.inputIconContainer}>
                <Feather name="lock" size={20} color="#64748b" />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Mot de passe *"
                placeholderTextColor="#94a3af"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Feather
                  name={showPassword ? 'eye' : 'eye-off'}
                  size={20}
                  color="#64748b"
                />
              </TouchableOpacity>
            </View>

            {/* Confirmation mot de passe */}
            <View style={styles.inputContainer}>
              <View style={styles.inputIconContainer}>
                <Feather name="lock" size={20} color="#64748b" />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Confirmer le mot de passe *"
                placeholderTextColor="#94a3af"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Feather
                  name={showConfirmPassword ? 'eye' : 'eye-off'}
                  size={20}
                  color="#64748b"
                />
              </TouchableOpacity>
            </View>

            {/* Indicateur de force du mot de passe */}
            {password.length > 0 && (
              <View style={styles.passwordStrength}>
                <View style={styles.strengthBar}>
                  <View
                    style={[
                      styles.strengthProgress,
                      {
                        width: `${Math.min((password.length / 12) * 100, 100)}%`,
                        backgroundColor:
                          password.length < 6
                            ? '#ef4444'
                            : password.length < 8
                            ? '#f59e0b'
                            : '#10b981',
                      },
                    ]}
                  />
                </View>
                <Text
                  style={[
                    styles.strengthText,
                    {
                      color:
                        password.length < 6
                          ? '#ef4444'
                          : password.length < 8
                          ? '#f59e0b'
                          : '#10b981',
                    },
                  ]}
                >
                  {password.length < 6
                    ? 'Faible'
                    : password.length < 8
                    ? 'Moyen'
                    : 'Fort'}
                </Text>
              </View>
            )}

            {/* Bouton d'Inscription */}
            <TouchableOpacity
              style={styles.signupButton}
              onPress={handleSignup}
              disabled={loading}
            >
              <LinearGradient
                colors={['#10b981', '#22c55e']}
                style={styles.signupButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {loading ? (
                  <Text style={styles.signupButtonText}>Inscription...</Text>
                ) : (
                  <>
                    <Text style={styles.signupButtonText}>S'inscrire</Text>
                    <Feather name="user-plus" size={20} color="white" />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Séparateur */}
            <View style={styles.separatorContainer}>
              <View style={styles.separatorLine} />
              <Text style={styles.separatorText}>ou</Text>
              <View style={styles.separatorLine} />
            </View>

            {/* Bouton Google */}
            <TouchableOpacity
              style={styles.googleButton}
              onPress={handleGoogleSignup}
              disabled={loading}
            >
              <View style={styles.googleButtonContent}>
                <MaterialCommunityIcons name="google" size={24} color="#EA4335" />
                <Text style={styles.googleButtonText}>S'inscrire avec Google</Text>
              </View>
            </TouchableOpacity>

            {/* Lien Connexion */}
            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Vous avez déjà un compte ? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.loginLink}>Se connecter</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer */}
          <Text style={styles.footer}>
            En créant un compte, vous acceptez nos{'\n'}
            <Text style={styles.footerLink}>Conditions d'utilisation</Text> et notre{' '}
            <Text style={styles.footerLink}>Politique de confidentialité</Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1220',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  header: {
    paddingTop: 16,
    paddingBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: 'white',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3af',
    fontWeight: '500',
  },
  formContainer: {
    flex: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  inputIconContainer: {
    paddingLeft: 16,
    paddingRight: 12,
  },
  input: {
    flex: 1,
    height: 56,
    fontSize: 16,
    color: 'white',
  },
  eyeIcon: {
    paddingHorizontal: 16,
  },
  passwordStrength: {
    marginBottom: 24,
  },
  strengthBar: {
    height: 4,
    backgroundColor: '#334155',
    borderRadius: 2,
    marginBottom: 8,
    overflow: 'hidden',
  },
  strengthProgress: {
    height: '100%',
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
  },
  signupButton: {
    marginBottom: 24,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  signupButtonGradient: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  signupButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
  separatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#334155',
  },
  separatorText: {
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  googleButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  googleButtonContent: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  loginText: {
    fontSize: 14,
    color: '#94a3af',
  },
  loginLink: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '700',
  },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    color: '#64748b',
    marginTop: 24,
    lineHeight: 18,
  },
  footerLink: {
    color: '#3b82f6',
    fontWeight: '600',
  },
});
