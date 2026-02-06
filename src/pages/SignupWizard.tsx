/**
 * Wizard d'inscription intelligent - 7 étapes progressives
 * Version Web React - Identique au mobile Flutter
 * 
 * Étapes :
 * 1. Type d'utilisateur (company/driver/individual)
 * 2. Informations personnelles + avatar
 * 3. Informations entreprise + logo (conditionnel)
 * 4. Email/téléphone
 * 5. IBAN bancaire (optionnel)
 * 6. Vérification fraude (automatique)
 * 7. Résumé + acceptation CGU
 */

import React, { useState, useRef } from 'react';
import {
  Box,
  Container,
  Paper,
  Stepper,
  Step,
  StepLabel,
  Button,
  TextField,
  Typography,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  Avatar,
  Chip,
  Alert,
  CircularProgress,
  LinearProgress,
  IconButton,
  InputAdornment,
  Card,
  CardContent,
  Divider,
  Checkbox,
  Link as MuiLink,
} from '@mui/material';
import {
  ArrowBack,
  ArrowForward,
  CloudUpload,
  Business,
  Person,
  LocalShipping,
  Visibility,
  VisibilityOff,
  CheckCircle,
  Warning,
  Error as ErrorIcon,
  Shield,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { validationService } from '../services/validationService';
import { fraudPreventionService, FraudCheckResult } from '../services/fraudPreventionService';

interface SignupData {
  // Étape 1
  userType: 'company' | 'driver' | 'individual' | '';
  
  // Étape 2
  fullName: string;
  avatarFile: File | null;
  avatarUrl: string;
  
  // Étape 3
  company: string;
  siret: string;
  logoFile: File | null;
  logoUrl: string;
  legalAddress: string;
  companySize: 'solo' | 'small' | 'medium' | 'large' | '';
  fleetSize: number;
  
  // Étape 4
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  
  // Étape 5
  bankIban: string;
  
  // Étape 6
  fraudCheck: FraudCheckResult | null;
  
  // Étape 7
  acceptedTerms: boolean;
}

const steps = [
  'Type de compte',
  'Informations personnelles',
  'Informations entreprise',
  'Coordonnées',
  'Informations bancaires',
  'Vérification',
  'Confirmation'
];

export default function SignupWizardScreen() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<SignupData>({
    userType: '',
    fullName: '',
    avatarFile: null,
    avatarUrl: '',
    company: '',
    siret: '',
    logoFile: null,
    logoUrl: '',
    legalAddress: '',
    companySize: '',
    fleetSize: 0,
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    bankIban: '',
    fraudCheck: null,
    acceptedTerms: false,
  });

  // Validation par étape
  const validateStep = async (step: number): Promise<boolean> => {
    setError('');

    switch (step) {
      case 0: // Type d'utilisateur
        if (!formData.userType) {
          setError('Veuillez sélectionner un type de compte');
          return false;
        }
        return true;

      case 1: // Informations personnelles
        if (!formData.fullName.trim()) {
          setError('Nom complet requis');
          return false;
        }
        if (formData.fullName.length < 3) {
          setError('Le nom doit contenir au moins 3 caractères');
          return false;
        }
        return true;

      case 2: // Informations entreprise (conditionnel)
        if (formData.userType === 'company') {
          if (!formData.company.trim()) {
            setError('Nom de l\'entreprise requis');
            return false;
          }
          
          if (!formData.siret.trim()) {
            setError('SIRET requis pour les entreprises');
            return false;
          }

          // Valider format SIRET
          const siretValidation = validationService.validateSiretFormat(formData.siret);
          if (!siretValidation.isValid) {
            setError(siretValidation.error || 'SIRET invalide');
            return false;
          }

          // Vérifier disponibilité SIRET
          const isSiretAvailable = await fraudPreventionService.checkSiretAvailable(formData.siret);
          if (!isSiretAvailable) {
            setError('Ce SIRET est déjà associé à un compte existant');
            return false;
          }

          if (!formData.companySize) {
            setError('Taille de l\'entreprise requise');
            return false;
          }
        }
        return true;

      case 3: // Coordonnées
        // Valider email
        const emailValidation = validationService.validateEmail(formData.email);
        if (!emailValidation.isValid) {
          setError(emailValidation.error || 'Email invalide');
          return false;
        }

        // Vérifier disponibilité email
        const emailCheck = await validationService.checkEmailAvailability(formData.email);
        if (!emailCheck.isValid) {
          setError(emailCheck.error || 'Email déjà utilisé');
          return false;
        }

        // Valider téléphone
        const phoneValidation = validationService.validatePhone(formData.phone);
        if (!phoneValidation.isValid) {
          setError(phoneValidation.error || 'Téléphone invalide');
          return false;
        }

        // Vérifier réutilisation téléphone
        const phoneUsage = await validationService.checkPhoneUsage(formData.phone);
        if (phoneUsage.warning) {
          // Warning mais pas bloquant
          console.warn(phoneUsage.warning);
        }

        // Valider mot de passe
        if (formData.password.length < 6) {
          setError('Le mot de passe doit contenir au moins 6 caractères');
          return false;
        }

        if (formData.password !== formData.confirmPassword) {
          setError('Les mots de passe ne correspondent pas');
          return false;
        }

        const passwordStrength = validationService.evaluatePasswordStrength(formData.password);
        if (passwordStrength.level === 'weak') {
          setError('Mot de passe trop faible. ' + passwordStrength.suggestions[0]);
          return false;
        }

        return true;

      case 4: // IBAN (optionnel)
        if (formData.bankIban) {
          const ibanValidation = validationService.validateIban(formData.bankIban);
          if (!ibanValidation.isValid) {
            setError(ibanValidation.error || 'IBAN invalide');
            return false;
          }
        }
        return true;

      case 5: // Vérification fraude (automatique)
        setLoading(true);
        try {
          const fraudCheck = await fraudPreventionService.checkSignupFraud(
            formData.email,
            formData.phone,
            formData.userType === 'company' ? formData.siret : undefined
          );

          setFormData(prev => ({ ...prev, fraudCheck }));

          if (fraudCheck.recommendation === 'block') {
            setError('Inscription bloquée pour des raisons de sécurité');
            return false;
          }

          return true;
        } catch (err: any) {
          setError('Erreur lors de la vérification : ' + err.message);
          return false;
        } finally {
          setLoading(false);
        }

      case 6: // Confirmation
        if (!formData.acceptedTerms) {
          setError('Vous devez accepter les conditions d\'utilisation');
          return false;
        }
        return true;

      default:
        return true;
    }
  };

  const handleNext = async () => {
    const isValid = await validateStep(activeStep);
    if (!isValid) return;

    // Skip étape 2 (entreprise) si pas une company
    if (activeStep === 1 && formData.userType !== 'company') {
      setActiveStep(prev => prev + 2); // Skip étape 2
    } else {
      setActiveStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    // Skip étape 2 (entreprise) si pas une company
    if (activeStep === 3 && formData.userType !== 'company') {
      setActiveStep(prev => prev - 2);
    } else {
      setActiveStep(prev => prev - 1);
    }
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('L\'image ne doit pas dépasser 5 MB');
        return;
      }

      setFormData(prev => ({
        ...prev,
        avatarFile: file,
        avatarUrl: URL.createObjectURL(file)
      }));
    }
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('L\'image ne doit pas dépasser 5 MB');
        return;
      }

      setFormData(prev => ({
        ...prev,
        logoFile: file,
        logoUrl: URL.createObjectURL(file)
      }));
    }
  };

  const uploadImage = async (file: File, path: string): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${path}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      // 1. Upload avatar si présent
      let avatarUrl = '';
      if (formData.avatarFile) {
        avatarUrl = await uploadImage(formData.avatarFile, 'avatars');
      }

      // 2. Upload logo si présent
      let logoUrl = '';
      if (formData.logoFile) {
        logoUrl = await uploadImage(formData.logoFile, 'logos');
      }

      // 3. Créer le compte Supabase Auth
      const deviceFingerprint = await fraudPreventionService.generateDeviceFingerprint();
      const ipAddress = await fraudPreventionService.getUserIpAddress();

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            phone: formData.phone,
            user_type: formData.userType,
            company: formData.company || null,
            siret: formData.siret || null,
            company_size: formData.companySize || null,
            fleet_size: formData.fleetSize || 0,
            legal_address: formData.legalAddress || null,
            bank_iban: formData.bankIban || null,
            avatar_url: avatarUrl || null,
            logo_url: logoUrl || null,
            device_fingerprint: deviceFingerprint,
            registration_ip: ipAddress,
            suspicious_flag: formData.fraudCheck?.isSuspicious || false,
            app_role: 'convoyeur',
          }
        }
      });

      if (authError) throw authError;

      // 4. Logger la tentative réussie
      await fraudPreventionService.logSignupAttempt({
        email: formData.email,
        phone: formData.phone,
        deviceFingerprint,
        ipAddress,
        userAgent: navigator.userAgent,
        stepReached: 7,
        success: true
      });

      // 5. Rediriger vers login
      alert('Inscription réussie ! Un email de confirmation a été envoyé.');
      navigate('/login');
    } catch (err: any) {
      console.error('Signup error:', err);
      setError(err.message || 'Erreur lors de l\'inscription');

      // Logger la tentative échouée
      const deviceFingerprint = await fraudPreventionService.generateDeviceFingerprint();
      const ipAddress = await fraudPreventionService.getUserIpAddress();
      
      await fraudPreventionService.logSignupAttempt({
        email: formData.email,
        phone: formData.phone,
        deviceFingerprint,
        ipAddress,
        userAgent: navigator.userAgent,
        stepReached: activeStep + 1,
        success: false,
        failureReason: err.message
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0: // Type d'utilisateur
        return (
          <Box sx={{ py: 4 }}>
            <Typography variant="h5" gutterBottom fontWeight="bold">
              Quel type de compte souhaitez-vous créer ?
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
              Sélectionnez le type qui correspond le mieux à votre activité
            </Typography>

            <FormControl component="fieldset" fullWidth>
              <RadioGroup
                value={formData.userType}
                onChange={(e) => setFormData(prev => ({ ...prev, userType: e.target.value as any }))}
              >
                <Card sx={{ mb: 2, cursor: 'pointer', border: formData.userType === 'company' ? 2 : 1, borderColor: formData.userType === 'company' ? 'primary.main' : 'divider' }}
                      onClick={() => setFormData(prev => ({ ...prev, userType: 'company' }))}>
                  <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Business sx={{ fontSize: 40, color: 'primary.main' }} />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" fontWeight="bold">Entreprise</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Vous êtes une société de transport ou un donneur d'ordre
                      </Typography>
                    </Box>
                    <Radio value="company" checked={formData.userType === 'company'} />
                  </CardContent>
                </Card>

                <Card sx={{ mb: 2, cursor: 'pointer', border: formData.userType === 'driver' ? 2 : 1, borderColor: formData.userType === 'driver' ? 'primary.main' : 'divider' }}
                      onClick={() => setFormData(prev => ({ ...prev, userType: 'driver' }))}>
                  <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <LocalShipping sx={{ fontSize: 40, color: 'primary.main' }} />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" fontWeight="bold">Convoyeur</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Vous êtes chauffeur indépendant ou convoyeur
                      </Typography>
                    </Box>
                    <Radio value="driver" checked={formData.userType === 'driver'} />
                  </CardContent>
                </Card>

                <Card sx={{ cursor: 'pointer', border: formData.userType === 'individual' ? 2 : 1, borderColor: formData.userType === 'individual' ? 'primary.main' : 'divider' }}
                      onClick={() => setFormData(prev => ({ ...prev, userType: 'individual' }))}>
                  <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Person sx={{ fontSize: 40, color: 'primary.main' }} />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" fontWeight="bold">Particulier</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Vous recherchez des solutions de transport ponctuelles
                      </Typography>
                    </Box>
                    <Radio value="individual" checked={formData.userType === 'individual'} />
                  </CardContent>
                </Card>
              </RadioGroup>
            </FormControl>
          </Box>
        );

      case 1: // Informations personnelles
        return (
          <Box sx={{ py: 4 }}>
            <Typography variant="h5" gutterBottom fontWeight="bold">
              Informations personnelles
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
              Parlez-nous un peu de vous
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
              <Avatar
                src={formData.avatarUrl}
                sx={{ width: 120, height: 120, mb: 2, cursor: 'pointer' }}
                onClick={() => avatarInputRef.current?.click()}
              >
                {formData.fullName[0]?.toUpperCase()}
              </Avatar>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleAvatarSelect}
              />
              <Button
                startIcon={<CloudUpload />}
                onClick={() => avatarInputRef.current?.click()}
              >
                Changer la photo
              </Button>
            </Box>

            <TextField
              fullWidth
              label="Nom complet *"
              value={formData.fullName}
              onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
              sx={{ mb: 2 }}
            />
          </Box>
        );

      case 2: // Informations entreprise
        return (
          <Box sx={{ py: 4 }}>
            <Typography variant="h5" gutterBottom fontWeight="bold">
              Informations entreprise
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
              Complétez les informations de votre société
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
              <Avatar
                src={formData.logoUrl}
                sx={{ width: 120, height: 120, mb: 2, cursor: 'pointer' }}
                variant="rounded"
                onClick={() => logoInputRef.current?.click()}
              >
                <Business sx={{ fontSize: 60 }} />
              </Avatar>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleLogoSelect}
              />
              <Button
                startIcon={<CloudUpload />}
                onClick={() => logoInputRef.current?.click()}
              >
                Ajouter un logo
              </Button>
            </Box>

            <TextField
              fullWidth
              label="Nom de l'entreprise *"
              value={formData.company}
              onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="SIRET *"
              value={formData.siret}
              onChange={(e) => {
                const value = e.target.value.replace(/\s/g, '');
                setFormData(prev => ({ ...prev, siret: value }));
              }}
              placeholder="123 456 789 00012"
              helperText="14 chiffres sans espaces"
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Adresse du siège social"
              value={formData.legalAddress}
              onChange={(e) => setFormData(prev => ({ ...prev, legalAddress: e.target.value }))}
              multiline
              rows={2}
              sx={{ mb: 2 }}
            />

            <FormControl fullWidth sx={{ mb: 2 }}>
              <FormLabel>Taille de l'entreprise *</FormLabel>
              <RadioGroup
                value={formData.companySize}
                onChange={(e) => setFormData(prev => ({ ...prev, companySize: e.target.value as any }))}
                row
              >
                <FormControlLabel value="solo" control={<Radio />} label="Solo (1 personne)" />
                <FormControlLabel value="small" control={<Radio />} label="Petite (2-10)" />
                <FormControlLabel value="medium" control={<Radio />} label="Moyenne (11-50)" />
                <FormControlLabel value="large" control={<Radio />} label="Grande (50+)" />
              </RadioGroup>
            </FormControl>

            <TextField
              fullWidth
              type="number"
              label="Nombre de véhicules dans la flotte"
              value={formData.fleetSize}
              onChange={(e) => setFormData(prev => ({ ...prev, fleetSize: parseInt(e.target.value) || 0 }))}
              inputProps={{ min: 0 }}
            />
          </Box>
        );

      case 3: // Coordonnées
        const passwordStrength = validationService.evaluatePasswordStrength(formData.password);
        
        return (
          <Box sx={{ py: 4 }}>
            <Typography variant="h5" gutterBottom fontWeight="bold">
              Coordonnées et sécurité
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
              Comment pouvons-nous vous contacter ?
            </Typography>

            <TextField
              fullWidth
              label="Adresse email *"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Téléphone *"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="06 12 34 56 78"
              sx={{ mb: 3 }}
            />

            <Divider sx={{ my: 3 }} />
            <Typography variant="subtitle1" gutterBottom fontWeight="bold">
              Sécurité de votre compte
            </Typography>

            <TextField
              fullWidth
              label="Mot de passe *"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
              sx={{ mb: 1 }}
            />

            {formData.password && (
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={passwordStrength.score}
                    sx={{ flex: 1, height: 8, borderRadius: 4 }}
                    color={
                      passwordStrength.level === 'weak' ? 'error' :
                      passwordStrength.level === 'medium' ? 'warning' : 'success'
                    }
                  />
                  <Chip
                    label={
                      passwordStrength.level === 'weak' ? 'Faible' :
                      passwordStrength.level === 'medium' ? 'Moyen' : 'Fort'
                    }
                    size="small"
                    color={
                      passwordStrength.level === 'weak' ? 'error' :
                      passwordStrength.level === 'medium' ? 'warning' : 'success'
                    }
                  />
                </Box>
                {passwordStrength.suggestions.length > 0 && (
                  <Typography variant="caption" color="text.secondary">
                    {passwordStrength.suggestions[0]}
                  </Typography>
                )}
              </Box>
            )}

            <TextField
              fullWidth
              label="Confirmer le mot de passe *"
              type={showConfirmPassword ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
          </Box>
        );

      case 4: // IBAN
        return (
          <Box sx={{ py: 4 }}>
            <Typography variant="h5" gutterBottom fontWeight="bold">
              Informations bancaires
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
              (Optionnel) Pour recevoir vos paiements directement
            </Typography>

            <Alert severity="info" sx={{ mb: 3 }}>
              Vous pourrez ajouter ou modifier ces informations plus tard dans votre profil
            </Alert>

            <TextField
              fullWidth
              label="IBAN (optionnel)"
              value={formData.bankIban}
              onChange={(e) => {
                const value = e.target.value.toUpperCase();
                setFormData(prev => ({ ...prev, bankIban: value }));
              }}
              placeholder="FR76 1234 5678 9012 3456 7890 123"
              helperText="Format français uniquement (FR + 25 chiffres)"
            />
          </Box>
        );

      case 5: // Vérification fraude
        return (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Shield sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom fontWeight="bold">
              Vérification de sécurité
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
              Nous vérifions l'authenticité de vos informations...
            </Typography>

            {loading && <CircularProgress sx={{ mb: 3 }} />}

            {formData.fraudCheck && !loading && (
              <Box>
                {formData.fraudCheck.recommendation === 'allow' && (
                  <Alert severity="success" icon={<CheckCircle />} sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" fontWeight="bold">Vérification réussie !</Typography>
                    <Typography variant="body2">Votre compte est prêt à être créé</Typography>
                  </Alert>
                )}

                {formData.fraudCheck.recommendation === 'manual_review' && (
                  <Alert severity="warning" icon={<Warning />} sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" fontWeight="bold">Vérification manuelle requise</Typography>
                    <Typography variant="body2">
                      Votre compte sera examiné par notre équipe (24-48h)
                    </Typography>
                  </Alert>
                )}

                {formData.fraudCheck.recommendation === 'block' && (
                  <Alert severity="error" icon={<ErrorIcon />} sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" fontWeight="bold">Inscription bloquée</Typography>
                    <Typography variant="body2">
                      Nous ne pouvons pas créer votre compte pour des raisons de sécurité
                    </Typography>
                  </Alert>
                )}

                <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.100', borderRadius: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Score de sécurité : {formData.fraudCheck.fraudScore}/100
                  </Typography>
                </Box>
              </Box>
            )}
          </Box>
        );

      case 6: // Résumé
        return (
          <Box sx={{ py: 4 }}>
            <Typography variant="h5" gutterBottom fontWeight="bold">
              Récapitulatif
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
              Vérifiez vos informations avant de valider
            </Typography>

            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Avatar src={formData.avatarUrl} sx={{ width: 60, height: 60 }}>
                    {formData.fullName[0]?.toUpperCase()}
                  </Avatar>
                  <Box>
                    <Typography variant="h6">{formData.fullName}</Typography>
                    <Chip
                      label={
                        formData.userType === 'company' ? 'Entreprise' :
                        formData.userType === 'driver' ? 'Convoyeur' : 'Particulier'
                      }
                      size="small"
                      color="primary"
                    />
                  </Box>
                </Box>

                <Divider sx={{ my: 2 }} />

                {formData.userType === 'company' && (
                  <>
                    <Typography variant="subtitle2" color="text.secondary">Entreprise</Typography>
                    <Typography variant="body1" gutterBottom>{formData.company}</Typography>
                    <Typography variant="subtitle2" color="text.secondary">SIRET</Typography>
                    <Typography variant="body1" gutterBottom>{validationService.formatSiret(formData.siret)}</Typography>
                  </>
                )}

                <Typography variant="subtitle2" color="text.secondary">Email</Typography>
                <Typography variant="body1" gutterBottom>{formData.email}</Typography>

                <Typography variant="subtitle2" color="text.secondary">Téléphone</Typography>
                <Typography variant="body1" gutterBottom>{validationService.formatPhone(formData.phone)}</Typography>

                {formData.bankIban && (
                  <>
                    <Typography variant="subtitle2" color="text.secondary">IBAN</Typography>
                    <Typography variant="body1">{validationService.formatIban(formData.bankIban)}</Typography>
                  </>
                )}
              </CardContent>
            </Card>

            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.acceptedTerms}
                  onChange={(e) => setFormData(prev => ({ ...prev, acceptedTerms: e.target.checked }))}
                />
              }
              label={
                <Typography variant="body2">
                  J'accepte les{' '}
                  <MuiLink href="/terms" target="_blank">conditions d'utilisation</MuiLink>
                  {' '}et la{' '}
                  <MuiLink href="/privacy" target="_blank">politique de confidentialité</MuiLink>
                </Typography>
              }
            />
          </Box>
        );

      default:
        return null;
    }
  };

  const shouldSkipStep = (step: number) => {
    return step === 2 && formData.userType !== 'company';
  };

  const getDisplaySteps = () => {
    return steps.filter((_, index) => !shouldSkipStep(index));
  };

  const getDisplayStepIndex = (actualIndex: number) => {
    let displayIndex = actualIndex;
    for (let i = 0; i < actualIndex; i++) {
      if (shouldSkipStep(i)) displayIndex--;
    }
    return displayIndex;
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p:4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
          <IconButton onClick={() => navigate('/signup')} edge="start">
            <ArrowBack />
          </IconButton>
          <Typography variant="h4" sx={{ ml: 2, fontWeight: 'bold' }}>
            Créer un compte
          </Typography>
        </Box>

        <Stepper activeStep={getDisplayStepIndex(activeStep)} sx={{ mb: 4 }}>
          {getDisplaySteps().map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {renderStepContent()}

        <Box sx={{ display: 'flex', gap: 2, mt: 4 }}>
          <Button
            disabled={activeStep === 0}
            onClick={handleBack}
            startIcon={<ArrowBack />}
          >
            Retour
          </Button>

          <Box sx={{ flex: 1 }} />

          {activeStep === steps.length - 1 ? (
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={loading || !formData.acceptedTerms}
              endIcon={loading ? <CircularProgress size={20} /> : <CheckCircle />}
            >
              {loading ? 'Création en cours...' : 'Créer mon compte'}
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={loading}
              endIcon={<ArrowForward />}
            >
              Continuer
            </Button>
          )}
        </Box>

        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Étape {getDisplayStepIndex(activeStep) + 1} sur {getDisplaySteps().length}
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
}
