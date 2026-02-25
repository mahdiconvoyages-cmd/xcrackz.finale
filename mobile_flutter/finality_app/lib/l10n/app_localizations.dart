import 'package:flutter/material.dart';

/// Système de localisation simple pour l'application
/// Supporte: Français, English, العربية, Español

class AppLocalizations {
  final Locale locale;
  
  AppLocalizations(this.locale);
  
  static AppLocalizations of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations) ?? 
           AppLocalizations(const Locale('fr'));
  }
  
  static const LocalizationsDelegate<AppLocalizations> delegate = _AppLocalizationsDelegate();
  
  static const List<Locale> supportedLocales = [
    Locale('fr'), // Français
    Locale('en'), // English
    Locale('ar'), // العربية
    Locale('es'), // Español
  ];
  
  static const Map<String, String> languageNames = {
    'fr': 'Français',
    'en': 'English',
    'ar': 'العربية',
    'es': 'Español',
  };
  
  static String getLanguageCode(String languageName) {
    return languageNames.entries
        .firstWhere((e) => e.value == languageName, orElse: () => const MapEntry('fr', 'Français'))
        .key;
  }
  
  static String getLanguageName(String code) {
    return languageNames[code] ?? 'Français';
  }
  
  /// Alias pour getLanguageCode (compatibilité)
  static String getCodeFromName(String languageName) => getLanguageCode(languageName);
  
  /// Alias pour getLanguageName (compatibilité)
  static String getNameFromCode(String code) => getLanguageName(code);
  
  // Dictionnaire de traductions
  static final Map<String, Map<String, String>> _localizedValues = {
    'fr': _frenchTranslations,
    'en': _englishTranslations,
    'ar': _arabicTranslations,
    'es': _spanishTranslations,
  };
  
  String get(String key) {
    return _localizedValues[locale.languageCode]?[key] ?? 
           _localizedValues['fr']?[key] ?? 
           key;
  }
  
  // ============ TRADUCTIONS ============
  
  // Navigation & Tabs
  String get home => get('home');
  String get dashboard => get('dashboard');
  String get missions => get('missions');
  String get vehicles => get('vehicles');
  String get profile => get('profile');
  String get settings => get('settings');
  String get crm => get('crm');
  
  // Actions communes
  String get save => get('save');
  String get cancel => get('cancel');
  String get delete => get('delete');
  String get edit => get('edit');
  String get add => get('add');
  String get search => get('search');
  String get filter => get('filter');
  String get refresh => get('refresh');
  String get loading => get('loading');
  String get error => get('error');
  String get success => get('success');
  String get confirm => get('confirm');
  String get close => get('close');
  String get next => get('next');
  String get previous => get('previous');
  String get done => get('done');
  String get retry => get('retry');
  
  // Authentification
  String get login => get('login');
  String get logout => get('logout');
  String get email => get('email');
  String get password => get('password');
  String get forgotPassword => get('forgotPassword');
  String get register => get('register');
  String get welcomeBack => get('welcomeBack');

  // Splash & Onboarding
  String get splashTagline => get('splashTagline');
  String get onboardingSkip => get('onboardingSkip');
  String get onboardingStart => get('onboardingStart');
  String get onboardingWelcomeTitle => get('onboardingWelcomeTitle');
  String get onboardingWelcomeDesc => get('onboardingWelcomeDesc');
  String get onboardingSmartTitle => get('onboardingSmartTitle');
  String get onboardingSmartDesc => get('onboardingSmartDesc');
  String get onboardingMissionsTitle => get('onboardingMissionsTitle');
  String get onboardingMissionsDesc => get('onboardingMissionsDesc');
  String get onboardingGpsTitle => get('onboardingGpsTitle');
  String get onboardingGpsDesc => get('onboardingGpsDesc');
  
  // Dashboard
  String get credits => get('credits');
  String get creditsRemaining => get('creditsRemaining');
  String get subscription => get('subscription');
  String get expiresOn => get('expiresOn');
  String get daysRemaining => get('daysRemaining');
  String get activeMissions => get('activeMissions');
  String get completedToday => get('completedToday');
  String get totalVehicles => get('totalVehicles');
  String get recentActivity => get('recentActivity');
  String get quickActions => get('quickActions');
  String get newMission => get('newMission');
  String get newVehicle => get('newVehicle');
  String get newClient => get('newClient');
  String get scanVehicle => get('scanVehicle');
  
  // Missions
  String get missionDetails => get('missionDetails');
  String get departure => get('departure');
  String get arrival => get('arrival');
  String get driver => get('driver');
  String get client => get('client');
  String get status => get('status');
  String get pending => get('pending');
  String get inProgress => get('inProgress');
  String get completed => get('completed');
  String get cancelled => get('cancelled');
  String get startMission => get('startMission');
  String get endMission => get('endMission');
  String get missionHistory => get('missionHistory');
  
  // Véhicules
  String get vehicleDetails => get('vehicleDetails');
  String get licensePlate => get('licensePlate');
  String get brand => get('brand');
  String get model => get('model');
  String get year => get('year');
  String get color => get('color');
  String get mileage => get('mileage');
  String get fuelLevel => get('fuelLevel');
  String get inspection => get('inspection');
  String get startInspection => get('startInspection');
  String get photos => get('photos');
  String get damages => get('damages');
  String get noDamages => get('noDamages');
  
  // Inspections
  String get departureInspection => get('departureInspection');
  String get arrivalInspection => get('arrivalInspection');
  String get exteriorFront => get('exteriorFront');
  String get exteriorBack => get('exteriorBack');
  String get exteriorLeft => get('exteriorLeft');
  String get exteriorRight => get('exteriorRight');
  String get interior => get('interior');
  String get trunk => get('trunk');
  String get documents => get('documents');
  String get signature => get('signature');
  String get driverSignature => get('driverSignature');
  String get clientSignature => get('clientSignature');
  String get generateReport => get('generateReport');
  
  // Paramètres
  String get language => get('language');
  String get selectLanguage => get('selectLanguage');
  String get notifications => get('notifications');
  String get darkMode => get('darkMode');
  String get location => get('location');
  String get locationServices => get('locationServices');
  String get backgroundLocation => get('backgroundLocation');
  String get permissions => get('permissions');
  String get grantPermission => get('grantPermission');
  String get permissionGranted => get('permissionGranted');
  String get permissionDenied => get('permissionDenied');
  String get about => get('about');
  String get version => get('version');
  String get help => get('help');
  String get support => get('support');
  String get privacyPolicy => get('privacyPolicy');
  String get termsOfService => get('termsOfService');
  
  // Profil
  String get myProfile => get('myProfile');
  String get editProfile => get('editProfile');
  String get firstName => get('firstName');
  String get lastName => get('lastName');
  String get phone => get('phone');
  String get company => get('company');
  String get changePassword => get('changePassword');
  
  // Messages
  String get noData => get('noData');
  String get noMissions => get('noMissions');
  String get noVehicles => get('noVehicles');
  String get noClients => get('noClients');
  String get noResults => get('noResults');
  String get connectionError => get('connectionError');
  String get offlineMode => get('offlineMode');
  String get syncPending => get('syncPending');
  String get synced => get('synced');
  String get lastSync => get('lastSync');
  
  // Confirmations
  String get confirmDelete => get('confirmDelete');
  String get confirmLogout => get('confirmLogout');
  String get confirmCancel => get('confirmCancel');
  String get unsavedChanges => get('unsavedChanges');
  
  // CRM
  String get clients => get('clients');
  String get addClient => get('addClient');
  String get clientDetails => get('clientDetails');
  String get contactInfo => get('contactInfo');
  String get address => get('address');
  String get notes => get('notes');
  
  // Dashboard supplémentaire
  String get creditsAvailable => get('creditsAvailable');
  String get successRate => get('successRate');
  String get missionsProgress => get('missionsProgress');
  String get seeAll => get('seeAll');
  String get missionCompleted => get('missionCompleted');
  String get newContact => get('newContact');
  String get clientAddedCRM => get('clientAddedCRM');
  String get departureInspectionShort => get('departureInspectionShort');
  String get vehicleDocumented => get('vehicleDocumented');
  String get subscriptionExpired => get('subscriptionExpired');
  String get expiresShort => get('expiresShort');
  String get subscriptionActive => get('subscriptionActive');
  String get renewNow => get('renewNow');
  String get renew => get('renew');
  String get manage => get('manage');
  String get goodMorning => get('goodMorning');
  String get goodAfternoon => get('goodAfternoon');
  String get goodEvening => get('goodEvening');
  String get user => get('user');
  String get errorLoadingDashboard => get('errorLoadingDashboard');
  String get ago => get('ago');
  String get hours => get('hours');
  String get yesterday => get('yesterday');
  
  // Missions supplémentaire
  String get myConvoys => get('myConvoys');
  String get listView => get('listView');
  String get gridView => get('gridView');
  String get missionCode => get('missionCode');
  String get join => get('join');
  String get enterCode => get('enterCode');
  String get missionJoined => get('missionJoined');
  
  // Profil supplémentaire
  String get professionalDriver => get('professionalDriver');
  String get emailNotAvailable => get('emailNotAvailable');
  String get managePreferences => get('managePreferences');
  String get manageSubscription => get('manageSubscription');
  String get helpCenter => get('helpCenter');
  String get versionInfo => get('versionInfo');
  
  // CRM supplémentaire
  String get createDocument => get('createDocument');
  String get newInvoice => get('newInvoice');
  String get createClientInvoice => get('createClientInvoice');
  String get newQuote => get('newQuote');
  String get createClientQuote => get('createClientQuote');
  String get addNewClient => get('addNewClient');
  String get clientManagement => get('clientManagement');
  String get invoices => get('invoices');
  String get quotes => get('quotes');
  String get create => get('create');
  
  // Documents scannés
  String get myDocuments => get('myDocuments');
  String get documentSaved => get('documentSaved');
  String get deleteDocument => get('deleteDocument');
  String get actionIrreversible => get('actionIrreversible');
  String get documentDeleted => get('documentDeleted');
  String get noImageToShare => get('noImageToShare');
  String get share => get('share');
  String get extractedText => get('extractedText');
  String get noImageAvailable => get('noImageAvailable');
  String get loadingError => get('loadingError');
  String get unknownDate => get('unknownDate');
  String get invalidDate => get('invalidDate');
  String get noDocument => get('noDocument');
  String get scanFirstDocument => get('scanFirstDocument');
  String get scanDocument => get('scanDocument');
  String get all => get('all');
  String get contracts => get('contracts');
  String get others => get('others');
  String get searchDocument => get('searchDocument');
  String get scanner => get('scanner');
  
  // Aide
  String get helpCenterTitle => get('helpCenterTitle');
  String get howCanWeHelp => get('howCanWeHelp');
  String get findAnswers => get('findAnswers');
  String get faq => get('faq');
  String get needMoreHelp => get('needMoreHelp');
  String get website => get('website');
  
  // À propos
  String get aboutTitle => get('aboutTitle');
  String get professionalConvoy => get('professionalConvoy');
  String get aboutApp => get('aboutApp');
  
  // Abonnements
  String get subscriptions => get('subscriptions');
  String get availablePlans => get('availablePlans');
  String get choosePlan => get('choosePlan');
  String get popular => get('popular');
  String get current => get('current');
  String get perMonth => get('perMonth');
  String get perYear => get('perYear');
  String get currentPlan => get('currentPlan');
  String get choosePlanBtn => get('choosePlanBtn');
  String get confirmSubscription => get('confirmSubscription');
  String get paymentInProgress => get('paymentInProgress');
  String get free => get('free');
  String get basic => get('basic');
  String get pro => get('pro');
  String get enterprise => get('enterprise');
}

// ============ TRADUCTIONS FRANÇAISES ============
const Map<String, String> _frenchTranslations = {
  // Navigation
  'home': 'Accueil',
  'dashboard': 'Tableau de bord',
  'missions': 'Missions',
  'vehicles': 'Véhicules',
  'profile': 'Profil',
  'settings': 'Paramètres',
  'crm': 'CRM',
  
  // Actions
  'save': 'Enregistrer',
  'cancel': 'Annuler',
  'delete': 'Supprimer',
  'edit': 'Modifier',
  'add': 'Ajouter',
  'search': 'Rechercher',
  'filter': 'Filtrer',
  'refresh': 'Actualiser',
  'loading': 'Chargement...',
  'error': 'Erreur',
  'success': 'Succès',
  'confirm': 'Confirmer',
  'close': 'Fermer',
  'next': 'Suivant',
  'previous': 'Précédent',
  'done': 'Terminé',
  'retry': 'Réessayer',
  
  // Auth
  'login': 'Connexion',
  'logout': 'Déconnexion',
  'email': 'Email',
  'password': 'Mot de passe',
  'forgotPassword': 'Mot de passe oublié ?',
  'register': 'S\'inscrire',
  'welcomeBack': 'Bon retour !',
  
  // Dashboard
  'credits': 'Crédits',
  'creditsRemaining': 'Crédits restants',
  'subscription': 'Abonnement',
  'expiresOn': 'Expire le',
  'daysRemaining': 'jours restants',
  'activeMissions': 'Missions actives',
  'completedToday': 'Terminées aujourd\'hui',
  'totalVehicles': 'Total véhicules',
  'recentActivity': 'Activité récente',
  'quickActions': 'Actions rapides',
  'newMission': 'Nouvelle mission',
  'newVehicle': 'Nouveau véhicule',
  'newClient': 'Nouveau client',
  'scanVehicle': 'Scanner véhicule',
  
  // Missions
  'missionDetails': 'Détails de la mission',
  'departure': 'Départ',
  'arrival': 'Arrivée',
  'driver': 'Chauffeur',
  'client': 'Client',
  'status': 'Statut',
  'pending': 'En attente',
  'inProgress': 'En cours',
  'completed': 'Terminée',
  'cancelled': 'Annulée',
  'startMission': 'Démarrer la mission',
  'endMission': 'Terminer la mission',
  'missionHistory': 'Historique des missions',
  
  // Véhicules
  'vehicleDetails': 'Détails du véhicule',
  'licensePlate': 'Immatriculation',
  'brand': 'Marque',
  'model': 'Modèle',
  'year': 'Année',
  'color': 'Couleur',
  'mileage': 'Kilométrage',
  'fuelLevel': 'Niveau de carburant',
  'inspection': 'Inspection',
  'startInspection': 'Démarrer l\'inspection',
  'photos': 'Photos',
  'damages': 'Dommages',
  'noDamages': 'Aucun dommage',
  
  // Inspections
  'departureInspection': 'Inspection de départ',
  'arrivalInspection': 'Inspection d\'arrivée',
  'exteriorFront': 'Extérieur avant',
  'exteriorBack': 'Extérieur arrière',
  'exteriorLeft': 'Côté gauche',
  'exteriorRight': 'Côté droit',
  'interior': 'Intérieur',
  'trunk': 'Coffre',
  'documents': 'Documents',
  'signature': 'Signature',
  'driverSignature': 'Signature du chauffeur',
  'clientSignature': 'Signature du client',
  'generateReport': 'Générer le rapport',
  
  // Paramètres
  'language': 'Langue',
  'selectLanguage': 'Sélectionnez votre langue',
  'notifications': 'Notifications',
  'darkMode': 'Mode sombre',
  'location': 'Localisation',
  'locationServices': 'Services de localisation',
  'backgroundLocation': 'Localisation en arrière-plan',
  'permissions': 'Permissions',
  'grantPermission': 'Autoriser',
  'permissionGranted': 'Permission accordée',
  'permissionDenied': 'Permission refusée',
  'about': 'À propos',
  'version': 'Version',
  'help': 'Aide',
  'support': 'Support',
  'privacyPolicy': 'Politique de confidentialité',
  'termsOfService': 'Conditions d\'utilisation',
  
  // Profil
  'myProfile': 'Mon profil',
  'editProfile': 'Modifier le profil',
  'firstName': 'Prénom',
  'lastName': 'Nom',
  'phone': 'Téléphone',
  'company': 'Entreprise',
  'changePassword': 'Changer le mot de passe',
  
  // Messages
  'noData': 'Aucune donnée',
  'noMissions': 'Aucune mission',
  'noVehicles': 'Aucun véhicule',
  'noClients': 'Aucun client',
  'noResults': 'Aucun résultat',
  'connectionError': 'Erreur de connexion',
  'offlineMode': 'Mode hors ligne',
  'syncPending': 'Synchronisation en attente',
  'synced': 'Synchronisé',
  'lastSync': 'Dernière synchro',
  
  // Confirmations
  'confirmDelete': 'Êtes-vous sûr de vouloir supprimer ?',
  'confirmLogout': 'Êtes-vous sûr de vouloir vous déconnecter ?',
  'confirmCancel': 'Êtes-vous sûr de vouloir annuler ?',
  'unsavedChanges': 'Vous avez des modifications non enregistrées',
  
  // CRM
  'clients': 'Clients',
  'addClient': 'Ajouter un client',
  'clientDetails': 'Détails du client',
  'contactInfo': 'Coordonnées',
  'address': 'Adresse',
  'notes': 'Notes',
  
  // Dashboard supplémentaire
  'creditsAvailable': 'Crédits disponibles',
  'successRate': 'Taux succès',
  'missionsProgress': 'Progression des missions',
  'seeAll': 'Voir tout',
  'missionCompleted': 'Mission complétée',
  'newContact': 'Nouveau contact',
  'clientAddedCRM': 'Client ajouté au CRM',
  'departureInspectionShort': 'Inspection départ',
  'vehicleDocumented': 'Véhicule documenté',
  'subscriptionExpired': 'Abonnement expiré',
  'expiresShort': 'Expire bientôt',
  'subscriptionActive': 'Abonnement actif',
  'renewNow': 'Renouvelez dès maintenant',
  'renew': 'Renouveler',
  'manage': 'Gérer',
  'goodMorning': 'Bonjour',
  'goodAfternoon': 'Bon après-midi',
  'goodEvening': 'Bonsoir',
  'user': 'Utilisateur',
  'errorLoadingDashboard': 'Erreur chargement dashboard',
  'ago': 'Il y a',
  'hours': 'heures',
  'yesterday': 'Hier',
  
  // Missions supplémentaire
  'myConvoys': 'Mes Convoyages',
  'listView': 'Vue Liste',
  'gridView': 'Vue Grille',
  'missionCode': 'Code de mission...',
  'join': 'Rejoindre',
  'enterCode': 'Veuillez entrer un code',
  'missionJoined': 'Mission rejointe avec succès!',
  
  // Profil supplémentaire
  'professionalDriver': 'Convoyeur Professionnel',
  'emailNotAvailable': 'Email non disponible',
  'managePreferences': 'Gérer vos préférences',
  'manageSubscription': 'Gérer votre abonnement',
  'helpCenter': 'Centre d\'aide et support',
  'versionInfo': 'Version et informations',
  
  // CRM supplémentaire
  'createDocument': 'Créer un document',
  'newInvoice': 'Nouvelle Facture',
  'createClientInvoice': 'Créer une facture client',
  'newQuote': 'Nouveau Devis',
  'createClientQuote': 'Créer un devis client',
  'addNewClient': 'Ajouter un nouveau client',
  'clientManagement': 'Gestion clients',
  'invoices': 'Factures',
  'quotes': 'Devis',
  'create': 'Créer',
  
  // Documents scannés
  'myDocuments': 'Mes Documents',
  'documentSaved': 'Document enregistré avec succès',
  'deleteDocument': 'Supprimer le document',
  'actionIrreversible': 'Cette action est irréversible. Voulez-vous vraiment supprimer ce document ?',
  'documentDeleted': 'Document supprimé',
  'noImageToShare': 'Aucune image à partager',
  'share': 'Partager',
  'extractedText': 'Texte extrait',
  'noImageAvailable': 'Aucune image disponible',
  'loadingError': 'Erreur de chargement',
  'unknownDate': 'Date inconnue',
  'invalidDate': 'Date invalide',
  'noDocument': 'Aucun document',
  'scanFirstDocument': 'Scannez votre premier document',
  'scanDocument': 'Scanner un document',
  'all': 'Tous',
  'contracts': 'Contrats',
  'others': 'Autres',
  'searchDocument': 'Rechercher un document...',
  'scanner': 'Scanner',
  
  // Aide
  'helpCenterTitle': 'Centre d\'aide',
  'howCanWeHelp': 'Comment pouvons-nous vous aider ?',
  'findAnswers': 'Trouvez rapidement des réponses...',
  'faq': 'Questions Fréquentes',
  'needMoreHelp': 'Besoin d\'aide supplémentaire ?',
  'website': 'Site Web',
  
  // À propos
  'aboutTitle': 'À propos',
  'professionalConvoy': 'Convoyage Professionnel',
  'aboutApp': 'À propos de l\'application',
  
  // Abonnements
  'subscriptions': 'Abonnements',
  'availablePlans': 'Plans disponibles',
  'choosePlan': 'Choisissez le plan qui correspond à vos besoins',
  'popular': 'POPULAIRE',
  'current': 'ACTUEL',
  'perMonth': '/mois',
  'perYear': '/an',
  'currentPlan': 'Plan actuel',
  'choosePlanBtn': 'Choisir ce plan',
  'confirmSubscription': 'Confirmer l\'abonnement',
  'paymentInProgress': 'Paiement en cours de développement...',
  'free': 'Gratuit',
  'basic': 'Basique',
  'pro': 'Pro',
  'enterprise': 'Entreprise',

  // Splash & Onboarding
  'splashTagline': 'Inspections Véhicules Pro',
  'onboardingSkip': 'Passer',
  'onboardingStart': 'Commencer',
  'onboardingWelcomeTitle': 'Bienvenue sur ChecksFleet',
  'onboardingWelcomeDesc': 'La plateforme complète pour la gestion de vos convoyages et missions d\'inspection.',
  'onboardingSmartTitle': 'Gestion intelligente',
  'onboardingSmartDesc': 'Trouvez des trajets, partagez les frais, communiquez en temps réel avec les conducteurs et passagers.',
  'onboardingMissionsTitle': 'Missions & Inspections',
  'onboardingMissionsDesc': 'Gérez vos missions de convoyage, réalisez des inspections détaillées avec photos et documents.',
  'onboardingGpsTitle': 'Suivi GPS en Temps Réel',
  'onboardingGpsDesc': 'Suivez vos trajets en direct, partagez votre position et restez connecté pendant vos déplacements.',
};

// ============ TRADUCTIONS ANGLAISES ============
const Map<String, String> _englishTranslations = {
  // Navigation
  'home': 'Home',
  'dashboard': 'Dashboard',
  'missions': 'Missions',
  'vehicles': 'Vehicles',
  'profile': 'Profile',
  'settings': 'Settings',
  'crm': 'CRM',
  
  // Actions
  'save': 'Save',
  'cancel': 'Cancel',
  'delete': 'Delete',
  'edit': 'Edit',
  'add': 'Add',
  'search': 'Search',
  'filter': 'Filter',
  'refresh': 'Refresh',
  'loading': 'Loading...',
  'error': 'Error',
  'success': 'Success',
  'confirm': 'Confirm',
  'close': 'Close',
  'next': 'Next',
  'previous': 'Previous',
  'done': 'Done',
  'retry': 'Retry',
  
  // Auth
  'login': 'Login',
  'logout': 'Logout',
  'email': 'Email',
  'password': 'Password',
  'forgotPassword': 'Forgot password?',
  'register': 'Register',
  'welcomeBack': 'Welcome back!',
  
  // Dashboard
  'credits': 'Credits',
  'creditsRemaining': 'Credits remaining',
  'subscription': 'Subscription',
  'expiresOn': 'Expires on',
  'daysRemaining': 'days remaining',
  'activeMissions': 'Active missions',
  'completedToday': 'Completed today',
  'totalVehicles': 'Total vehicles',
  'recentActivity': 'Recent activity',
  'quickActions': 'Quick actions',
  'newMission': 'New mission',
  'newVehicle': 'New vehicle',
  'newClient': 'New client',
  'scanVehicle': 'Scan vehicle',
  
  // Missions
  'missionDetails': 'Mission details',
  'departure': 'Departure',
  'arrival': 'Arrival',
  'driver': 'Driver',
  'client': 'Client',
  'status': 'Status',
  'pending': 'Pending',
  'inProgress': 'In progress',
  'completed': 'Completed',
  'cancelled': 'Cancelled',
  'startMission': 'Start mission',
  'endMission': 'End mission',
  'missionHistory': 'Mission history',
  
  // Vehicles
  'vehicleDetails': 'Vehicle details',
  'licensePlate': 'License plate',
  'brand': 'Brand',
  'model': 'Model',
  'year': 'Year',
  'color': 'Color',
  'mileage': 'Mileage',
  'fuelLevel': 'Fuel level',
  'inspection': 'Inspection',
  'startInspection': 'Start inspection',
  'photos': 'Photos',
  'damages': 'Damages',
  'noDamages': 'No damages',
  
  // Inspections
  'departureInspection': 'Departure inspection',
  'arrivalInspection': 'Arrival inspection',
  'exteriorFront': 'Exterior front',
  'exteriorBack': 'Exterior back',
  'exteriorLeft': 'Left side',
  'exteriorRight': 'Right side',
  'interior': 'Interior',
  'trunk': 'Trunk',
  'documents': 'Documents',
  'signature': 'Signature',
  'driverSignature': 'Driver signature',
  'clientSignature': 'Client signature',
  'generateReport': 'Generate report',
  
  // Settings
  'language': 'Language',
  'selectLanguage': 'Select your language',
  'notifications': 'Notifications',
  'darkMode': 'Dark mode',
  'location': 'Location',
  'locationServices': 'Location services',
  'backgroundLocation': 'Background location',
  'permissions': 'Permissions',
  'grantPermission': 'Grant permission',
  'permissionGranted': 'Permission granted',
  'permissionDenied': 'Permission denied',
  'about': 'About',
  'version': 'Version',
  'help': 'Help',
  'support': 'Support',
  'privacyPolicy': 'Privacy policy',
  'termsOfService': 'Terms of service',
  
  // Profile
  'myProfile': 'My profile',
  'editProfile': 'Edit profile',
  'firstName': 'First name',
  'lastName': 'Last name',
  'phone': 'Phone',
  'company': 'Company',
  'changePassword': 'Change password',
  
  // Messages
  'noData': 'No data',
  'noMissions': 'No missions',
  'noVehicles': 'No vehicles',
  'noClients': 'No clients',
  'noResults': 'No results',
  'connectionError': 'Connection error',
  'offlineMode': 'Offline mode',
  'syncPending': 'Sync pending',
  'synced': 'Synced',
  'lastSync': 'Last sync',
  
  // Confirmations
  'confirmDelete': 'Are you sure you want to delete?',
  'confirmLogout': 'Are you sure you want to logout?',
  'confirmCancel': 'Are you sure you want to cancel?',
  'unsavedChanges': 'You have unsaved changes',
  
  // CRM
  'clients': 'Clients',
  'addClient': 'Add client',
  'clientDetails': 'Client details',
  'contactInfo': 'Contact info',
  'address': 'Address',
  'notes': 'Notes',
  
  // Dashboard additional
  'creditsAvailable': 'Credits available',
  'successRate': 'Success rate',
  'missionsProgress': 'Missions progress',
  'seeAll': 'See all',
  'missionCompleted': 'Mission completed',
  'newContact': 'New contact',
  'clientAddedCRM': 'Client added to CRM',
  'departureInspectionShort': 'Departure inspection',
  'vehicleDocumented': 'Vehicle documented',
  'subscriptionExpired': 'Subscription expired',
  'expiresShort': 'Expires soon',
  'subscriptionActive': 'Subscription active',
  'renewNow': 'Renew now',
  'renew': 'Renew',
  'manage': 'Manage',
  'goodMorning': 'Good morning',
  'goodAfternoon': 'Good afternoon',
  'goodEvening': 'Good evening',
  'user': 'User',
  'errorLoadingDashboard': 'Error loading dashboard',
  'ago': 'ago',
  'hours': 'hours',
  'yesterday': 'Yesterday',
  
  // Missions additional
  'myConvoys': 'My Convoys',
  'listView': 'List View',
  'gridView': 'Grid View',
  'missionCode': 'Mission code...',
  'join': 'Join',
  'enterCode': 'Please enter a code',
  'missionJoined': 'Mission joined successfully!',
  
  // Profile additional
  'professionalDriver': 'Professional Driver',
  'emailNotAvailable': 'Email not available',
  'managePreferences': 'Manage your preferences',
  'manageSubscription': 'Manage your subscription',
  'helpCenter': 'Help center and support',
  'versionInfo': 'Version and information',
  
  // CRM additional
  'createDocument': 'Create document',
  'newInvoice': 'New Invoice',
  'createClientInvoice': 'Create client invoice',
  'newQuote': 'New Quote',
  'createClientQuote': 'Create client quote',
  'addNewClient': 'Add new client',
  'clientManagement': 'Client management',
  'invoices': 'Invoices',
  'quotes': 'Quotes',
  'create': 'Create',
  
  // Scanned documents
  'myDocuments': 'My Documents',
  'documentSaved': 'Document saved successfully',
  'deleteDocument': 'Delete document',
  'actionIrreversible': 'This action is irreversible. Do you really want to delete this document?',
  'documentDeleted': 'Document deleted',
  'noImageToShare': 'No image to share',
  'share': 'Share',
  'extractedText': 'Extracted text',
  'noImageAvailable': 'No image available',
  'loadingError': 'Loading error',
  'unknownDate': 'Unknown date',
  'invalidDate': 'Invalid date',
  'noDocument': 'No document',
  'scanFirstDocument': 'Scan your first document',
  'scanDocument': 'Scan a document',
  'all': 'All',
  'contracts': 'Contracts',
  'others': 'Others',
  'searchDocument': 'Search a document...',
  'scanner': 'Scanner',
  
  // Help
  'helpCenterTitle': 'Help Center',
  'howCanWeHelp': 'How can we help you?',
  'findAnswers': 'Find answers quickly...',
  'faq': 'Frequently Asked Questions',
  'needMoreHelp': 'Need more help?',
  'website': 'Website',
  
  // About
  'aboutTitle': 'About',
  'professionalConvoy': 'Professional Convoy',
  'aboutApp': 'About the application',
  
  // Subscriptions
  'subscriptions': 'Subscriptions',
  'availablePlans': 'Available plans',
  'choosePlan': 'Choose the plan that fits your needs',
  'popular': 'POPULAR',
  'current': 'CURRENT',
  'perMonth': '/month',
  'perYear': '/year',
  'currentPlan': 'Current plan',
  'choosePlanBtn': 'Choose this plan',
  'confirmSubscription': 'Confirm subscription',
  'paymentInProgress': 'Payment in progress...',
  'free': 'Free',
  'basic': 'Basic',
  'pro': 'Pro',
  'enterprise': 'Enterprise',

  // Splash & Onboarding
  'splashTagline': 'Professional Vehicle Inspections',
  'onboardingSkip': 'Skip',
  'onboardingStart': 'Get Started',
  'onboardingWelcomeTitle': 'Welcome to ChecksFleet',
  'onboardingWelcomeDesc': 'The complete platform for managing your convoys and inspection missions.',
  'onboardingSmartTitle': 'Smart Management',
  'onboardingSmartDesc': 'Find rides, share costs, communicate in real time with drivers and passengers.',
  'onboardingMissionsTitle': 'Missions & Inspections',
  'onboardingMissionsDesc': 'Manage your convoy missions, perform detailed inspections with photos and documents.',
  'onboardingGpsTitle': 'Real-Time GPS Tracking',
  'onboardingGpsDesc': 'Track your trips live, share your location and stay connected during your travels.',
};

// ============ TRADUCTIONS ARABES ============
const Map<String, String> _arabicTranslations = {
  // Navigation
  'home': 'الرئيسية',
  'dashboard': 'لوحة التحكم',
  'missions': 'المهام',
  'vehicles': 'المركبات',
  'profile': 'الملف الشخصي',
  'settings': 'الإعدادات',
  'crm': 'إدارة العملاء',
  
  // Actions
  'save': 'حفظ',
  'cancel': 'إلغاء',
  'delete': 'حذف',
  'edit': 'تعديل',
  'add': 'إضافة',
  'search': 'بحث',
  'filter': 'تصفية',
  'refresh': 'تحديث',
  'loading': 'جاري التحميل...',
  'error': 'خطأ',
  'success': 'نجاح',
  'confirm': 'تأكيد',
  'close': 'إغلاق',
  'next': 'التالي',
  'previous': 'السابق',
  'done': 'تم',
  'retry': 'إعادة المحاولة',
  
  // Auth
  'login': 'تسجيل الدخول',
  'logout': 'تسجيل الخروج',
  'email': 'البريد الإلكتروني',
  'password': 'كلمة المرور',
  'forgotPassword': 'نسيت كلمة المرور؟',
  'register': 'التسجيل',
  'welcomeBack': 'مرحباً بعودتك!',
  
  // Dashboard
  'credits': 'الرصيد',
  'creditsRemaining': 'الرصيد المتبقي',
  'subscription': 'الاشتراك',
  'expiresOn': 'ينتهي في',
  'daysRemaining': 'أيام متبقية',
  'activeMissions': 'المهام النشطة',
  'completedToday': 'المنجزة اليوم',
  'totalVehicles': 'إجمالي المركبات',
  'recentActivity': 'النشاط الأخير',
  'quickActions': 'إجراءات سريعة',
  'newMission': 'مهمة جديدة',
  'newVehicle': 'مركبة جديدة',
  'newClient': 'عميل جديد',
  'scanVehicle': 'مسح المركبة',
  
  // Missions
  'missionDetails': 'تفاصيل المهمة',
  'departure': 'المغادرة',
  'arrival': 'الوصول',
  'driver': 'السائق',
  'client': 'العميل',
  'status': 'الحالة',
  'pending': 'قيد الانتظار',
  'inProgress': 'قيد التنفيذ',
  'completed': 'مكتملة',
  'cancelled': 'ملغاة',
  'startMission': 'بدء المهمة',
  'endMission': 'إنهاء المهمة',
  'missionHistory': 'سجل المهام',
  
  // Vehicles
  'vehicleDetails': 'تفاصيل المركبة',
  'licensePlate': 'لوحة الترخيص',
  'brand': 'العلامة التجارية',
  'model': 'الموديل',
  'year': 'السنة',
  'color': 'اللون',
  'mileage': 'عداد المسافة',
  'fuelLevel': 'مستوى الوقود',
  'inspection': 'الفحص',
  'startInspection': 'بدء الفحص',
  'photos': 'الصور',
  'damages': 'الأضرار',
  'noDamages': 'لا توجد أضرار',
  
  // Inspections
  'departureInspection': 'فحص المغادرة',
  'arrivalInspection': 'فحص الوصول',
  'exteriorFront': 'الأمام الخارجي',
  'exteriorBack': 'الخلف الخارجي',
  'exteriorLeft': 'الجانب الأيسر',
  'exteriorRight': 'الجانب الأيمن',
  'interior': 'الداخلية',
  'trunk': 'صندوق السيارة',
  'documents': 'المستندات',
  'signature': 'التوقيع',
  'driverSignature': 'توقيع السائق',
  'clientSignature': 'توقيع العميل',
  'generateReport': 'إنشاء التقرير',
  
  // Settings
  'language': 'اللغة',
  'selectLanguage': 'اختر لغتك',
  'notifications': 'الإشعارات',
  'darkMode': 'الوضع الداكن',
  'location': 'الموقع',
  'locationServices': 'خدمات الموقع',
  'backgroundLocation': 'الموقع في الخلفية',
  'permissions': 'الأذونات',
  'grantPermission': 'منح الإذن',
  'permissionGranted': 'تم منح الإذن',
  'permissionDenied': 'تم رفض الإذن',
  'about': 'حول',
  'version': 'الإصدار',
  'help': 'المساعدة',
  'support': 'الدعم',
  'privacyPolicy': 'سياسة الخصوصية',
  'termsOfService': 'شروط الخدمة',
  
  // Profile
  'myProfile': 'ملفي الشخصي',
  'editProfile': 'تعديل الملف',
  'firstName': 'الاسم الأول',
  'lastName': 'اسم العائلة',
  'phone': 'الهاتف',
  'company': 'الشركة',
  'changePassword': 'تغيير كلمة المرور',
  
  // Messages
  'noData': 'لا توجد بيانات',
  'noMissions': 'لا توجد مهام',
  'noVehicles': 'لا توجد مركبات',
  'noClients': 'لا يوجد عملاء',
  'noResults': 'لا توجد نتائج',
  'connectionError': 'خطأ في الاتصال',
  'offlineMode': 'وضع عدم الاتصال',
  'syncPending': 'المزامنة معلقة',
  'synced': 'تمت المزامنة',
  'lastSync': 'آخر مزامنة',
  
  // Confirmations
  'confirmDelete': 'هل أنت متأكد من الحذف؟',
  'confirmLogout': 'هل أنت متأكد من تسجيل الخروج؟',
  'confirmCancel': 'هل أنت متأكد من الإلغاء؟',
  'unsavedChanges': 'لديك تغييرات غير محفوظة',
  
  // CRM
  'clients': 'العملاء',
  'addClient': 'إضافة عميل',
  'clientDetails': 'تفاصيل العميل',
  'contactInfo': 'معلومات الاتصال',
  'address': 'العنوان',
  'notes': 'ملاحظات',
  
  // Dashboard additional
  'creditsAvailable': 'الرصيد المتاح',
  'successRate': 'معدل النجاح',
  'missionsProgress': 'تقدم المهام',
  'seeAll': 'عرض الكل',
  'missionCompleted': 'المهمة مكتملة',
  'newContact': 'جهة اتصال جديدة',
  'clientAddedCRM': 'تمت إضافة العميل',
  'departureInspectionShort': 'فحص المغادرة',
  'vehicleDocumented': 'تم توثيق المركبة',
  'subscriptionExpired': 'انتهى الاشتراك',
  'expiresShort': 'ينتهي قريباً',
  'subscriptionActive': 'اشتراك نشط',
  'renewNow': 'جدد الآن',
  'renew': 'تجديد',
  'manage': 'إدارة',
  'goodMorning': 'صباح الخير',
  'goodAfternoon': 'مساء الخير',
  'goodEvening': 'مساء الخير',
  'user': 'مستخدم',
  'errorLoadingDashboard': 'خطأ في تحميل لوحة التحكم',
  'ago': 'منذ',
  'hours': 'ساعات',
  'yesterday': 'أمس',
  
  // Missions additional
  'myConvoys': 'قوافلي',
  'listView': 'عرض القائمة',
  'gridView': 'عرض الشبكة',
  'missionCode': 'رمز المهمة...',
  'join': 'انضمام',
  'enterCode': 'الرجاء إدخال رمز',
  'missionJoined': 'تم الانضمام للمهمة بنجاح!',
  
  // Profile additional
  'professionalDriver': 'سائق محترف',
  'emailNotAvailable': 'البريد غير متاح',
  'managePreferences': 'إدارة التفضيلات',
  'manageSubscription': 'إدارة الاشتراك',
  'helpCenter': 'مركز المساعدة',
  'versionInfo': 'معلومات الإصدار',
  
  // CRM additional
  'createDocument': 'إنشاء مستند',
  'newInvoice': 'فاتورة جديدة',
  'createClientInvoice': 'إنشاء فاتورة عميل',
  'newQuote': 'عرض سعر جديد',
  'createClientQuote': 'إنشاء عرض سعر',
  'addNewClient': 'إضافة عميل جديد',
  'clientManagement': 'إدارة العملاء',
  'invoices': 'الفواتير',
  'quotes': 'عروض الأسعار',
  'create': 'إنشاء',
  
  // Scanned documents
  'myDocuments': 'مستنداتي',
  'documentSaved': 'تم حفظ المستند بنجاح',
  'deleteDocument': 'حذف المستند',
  'actionIrreversible': 'هذا الإجراء لا رجعة فيه. هل تريد حذف هذا المستند؟',
  'documentDeleted': 'تم حذف المستند',
  'noImageToShare': 'لا توجد صورة للمشاركة',
  'share': 'مشاركة',
  'extractedText': 'النص المستخرج',
  'noImageAvailable': 'لا توجد صورة',
  'loadingError': 'خطأ في التحميل',
  'unknownDate': 'تاريخ غير معروف',
  'invalidDate': 'تاريخ غير صالح',
  'noDocument': 'لا توجد مستندات',
  'scanFirstDocument': 'امسح مستندك الأول',
  'scanDocument': 'مسح مستند',
  'all': 'الكل',
  'contracts': 'العقود',
  'others': 'أخرى',
  'searchDocument': 'البحث عن مستند...',
  'scanner': 'الماسح',
  
  // Help
  'helpCenterTitle': 'مركز المساعدة',
  'howCanWeHelp': 'كيف يمكننا مساعدتك؟',
  'findAnswers': 'ابحث عن إجابات...',
  'faq': 'الأسئلة الشائعة',
  'needMoreHelp': 'تحتاج مساعدة إضافية؟',
  'website': 'الموقع',
  
  // About
  'aboutTitle': 'حول',
  'professionalConvoy': 'قافلة محترفة',
  'aboutApp': 'حول التطبيق',
  
  // Subscriptions
  'subscriptions': 'الاشتراكات',
  'availablePlans': 'الخطط المتاحة',
  'choosePlan': 'اختر الخطة المناسبة لك',
  'popular': 'شائع',
  'current': 'الحالي',
  'perMonth': '/شهر',
  'perYear': '/سنة',
  'currentPlan': 'الخطة الحالية',
  'choosePlanBtn': 'اختر هذه الخطة',
  'confirmSubscription': 'تأكيد الاشتراك',
  'paymentInProgress': 'الدفع قيد التطوير...',
  'free': 'مجاني',
  'basic': 'أساسي',
  'pro': 'احترافي',
  'enterprise': 'مؤسسة',

  // Splash & Onboarding
  'splashTagline': 'فحوصات المركبات الاحترافية',
  'onboardingSkip': 'تخطي',
  'onboardingStart': 'ابدأ',
  'onboardingWelcomeTitle': 'مرحبًا بك في ChecksFleet',
  'onboardingWelcomeDesc': 'المنصة الشاملة لإدارة عمليات النقل ومهام التفتيش.',
  'onboardingSmartTitle': 'إدارة ذكية',
  'onboardingSmartDesc': 'ابحث عن رحلات، شارك التكاليف، تواصل في الوقت الفعلي مع السائقين والركاب.',
  'onboardingMissionsTitle': 'المهام والتفتيش',
  'onboardingMissionsDesc': 'أدر مهام النقل، قم بإجراء عمليات تفتيش مفصلة بالصور والمستندات.',
  'onboardingGpsTitle': 'تتبع GPS في الوقت الفعلي',
  'onboardingGpsDesc': 'تابع رحلاتك مباشرة، شارك موقعك وابق على اتصال أثناء تنقلاتك.',
};

// ============ TRADUCTIONS ESPAGNOLES ============
const Map<String, String> _spanishTranslations = {
  // Navigation
  'home': 'Inicio',
  'dashboard': 'Panel',
  'missions': 'Misiones',
  'vehicles': 'Vehículos',
  'profile': 'Perfil',
  'settings': 'Ajustes',
  'crm': 'CRM',
  
  // Actions
  'save': 'Guardar',
  'cancel': 'Cancelar',
  'delete': 'Eliminar',
  'edit': 'Editar',
  'add': 'Añadir',
  'search': 'Buscar',
  'filter': 'Filtrar',
  'refresh': 'Actualizar',
  'loading': 'Cargando...',
  'error': 'Error',
  'success': 'Éxito',
  'confirm': 'Confirmar',
  'close': 'Cerrar',
  'next': 'Siguiente',
  'previous': 'Anterior',
  'done': 'Hecho',
  'retry': 'Reintentar',
  
  // Auth
  'login': 'Iniciar sesión',
  'logout': 'Cerrar sesión',
  'email': 'Email',
  'password': 'Contraseña',
  'forgotPassword': '¿Olvidaste tu contraseña?',
  'register': 'Registrarse',
  'welcomeBack': '¡Bienvenido de nuevo!',
  
  // Dashboard
  'credits': 'Créditos',
  'creditsRemaining': 'Créditos restantes',
  'subscription': 'Suscripción',
  'expiresOn': 'Expira el',
  'daysRemaining': 'días restantes',
  'activeMissions': 'Misiones activas',
  'completedToday': 'Completadas hoy',
  'totalVehicles': 'Total vehículos',
  'recentActivity': 'Actividad reciente',
  'quickActions': 'Acciones rápidas',
  'newMission': 'Nueva misión',
  'newVehicle': 'Nuevo vehículo',
  'newClient': 'Nuevo cliente',
  'scanVehicle': 'Escanear vehículo',
  
  // Missions
  'missionDetails': 'Detalles de la misión',
  'departure': 'Salida',
  'arrival': 'Llegada',
  'driver': 'Conductor',
  'client': 'Cliente',
  'status': 'Estado',
  'pending': 'Pendiente',
  'inProgress': 'En curso',
  'completed': 'Completada',
  'cancelled': 'Cancelada',
  'startMission': 'Iniciar misión',
  'endMission': 'Finalizar misión',
  'missionHistory': 'Historial de misiones',
  
  // Vehicles
  'vehicleDetails': 'Detalles del vehículo',
  'licensePlate': 'Matrícula',
  'brand': 'Marca',
  'model': 'Modelo',
  'year': 'Año',
  'color': 'Color',
  'mileage': 'Kilometraje',
  'fuelLevel': 'Nivel de combustible',
  'inspection': 'Inspección',
  'startInspection': 'Iniciar inspección',
  'photos': 'Fotos',
  'damages': 'Daños',
  'noDamages': 'Sin daños',
  
  // Inspections
  'departureInspection': 'Inspección de salida',
  'arrivalInspection': 'Inspección de llegada',
  'exteriorFront': 'Exterior delantero',
  'exteriorBack': 'Exterior trasero',
  'exteriorLeft': 'Lado izquierdo',
  'exteriorRight': 'Lado derecho',
  'interior': 'Interior',
  'trunk': 'Maletero',
  'documents': 'Documentos',
  'signature': 'Firma',
  'driverSignature': 'Firma del conductor',
  'clientSignature': 'Firma del cliente',
  'generateReport': 'Generar informe',
  
  // Settings
  'language': 'Idioma',
  'selectLanguage': 'Selecciona tu idioma',
  'notifications': 'Notificaciones',
  'darkMode': 'Modo oscuro',
  'location': 'Ubicación',
  'locationServices': 'Servicios de ubicación',
  'backgroundLocation': 'Ubicación en segundo plano',
  'permissions': 'Permisos',
  'grantPermission': 'Conceder permiso',
  'permissionGranted': 'Permiso concedido',
  'permissionDenied': 'Permiso denegado',
  'about': 'Acerca de',
  'version': 'Versión',
  'help': 'Ayuda',
  'support': 'Soporte',
  'privacyPolicy': 'Política de privacidad',
  'termsOfService': 'Términos de servicio',
  
  // Profile
  'myProfile': 'Mi perfil',
  'editProfile': 'Editar perfil',
  'firstName': 'Nombre',
  'lastName': 'Apellido',
  'phone': 'Teléfono',
  'company': 'Empresa',
  'changePassword': 'Cambiar contraseña',
  
  // Messages
  'noData': 'Sin datos',
  'noMissions': 'Sin misiones',
  'noVehicles': 'Sin vehículos',
  'noClients': 'Sin clientes',
  'noResults': 'Sin resultados',
  'connectionError': 'Error de conexión',
  'offlineMode': 'Modo sin conexión',
  'syncPending': 'Sincronización pendiente',
  'synced': 'Sincronizado',
  'lastSync': 'Última sincronización',
  
  // Confirmations
  'confirmDelete': '¿Estás seguro de eliminar?',
  'confirmLogout': '¿Estás seguro de cerrar sesión?',
  'confirmCancel': '¿Estás seguro de cancelar?',
  'unsavedChanges': 'Tienes cambios sin guardar',
  
  // CRM
  'clients': 'Clientes',
  'addClient': 'Añadir cliente',
  'clientDetails': 'Detalles del cliente',
  'contactInfo': 'Información de contacto',
  'address': 'Dirección',
  'notes': 'Notas',
  
  // Dashboard additional
  'creditsAvailable': 'Créditos disponibles',
  'successRate': 'Tasa de éxito',
  'missionsProgress': 'Progreso de misiones',
  'seeAll': 'Ver todo',
  'missionCompleted': 'Misión completada',
  'newContact': 'Nuevo contacto',
  'clientAddedCRM': 'Cliente añadido al CRM',
  'departureInspectionShort': 'Inspección de salida',
  'vehicleDocumented': 'Vehículo documentado',
  'subscriptionExpired': 'Suscripción expirada',
  'expiresShort': 'Expira pronto',
  'subscriptionActive': 'Suscripción activa',
  'renewNow': 'Renovar ahora',
  'renew': 'Renovar',
  'manage': 'Gestionar',
  'goodMorning': 'Buenos días',
  'goodAfternoon': 'Buenas tardes',
  'goodEvening': 'Buenas noches',
  'user': 'Usuario',
  'errorLoadingDashboard': 'Error al cargar el panel',
  'ago': 'hace',
  'hours': 'horas',
  'yesterday': 'Ayer',
  
  // Missions additional
  'myConvoys': 'Mis Convoyes',
  'listView': 'Vista Lista',
  'gridView': 'Vista Cuadrícula',
  'missionCode': 'Código de misión...',
  'join': 'Unirse',
  'enterCode': 'Por favor ingrese un código',
  'missionJoined': '¡Misión unida con éxito!',
  
  // Profile additional
  'professionalDriver': 'Conductor Profesional',
  'emailNotAvailable': 'Email no disponible',
  'managePreferences': 'Gestionar preferencias',
  'manageSubscription': 'Gestionar suscripción',
  'helpCenter': 'Centro de ayuda',
  'versionInfo': 'Versión e información',
  
  // CRM additional
  'createDocument': 'Crear documento',
  'newInvoice': 'Nueva Factura',
  'createClientInvoice': 'Crear factura de cliente',
  'newQuote': 'Nuevo Presupuesto',
  'createClientQuote': 'Crear presupuesto de cliente',
  'addNewClient': 'Añadir nuevo cliente',
  'clientManagement': 'Gestión de clientes',
  'invoices': 'Facturas',
  'quotes': 'Presupuestos',
  'create': 'Crear',
  
  // Scanned documents
  'myDocuments': 'Mis Documentos',
  'documentSaved': 'Documento guardado con éxito',
  'deleteDocument': 'Eliminar documento',
  'actionIrreversible': 'Esta acción es irreversible. ¿Desea eliminar este documento?',
  'documentDeleted': 'Documento eliminado',
  'noImageToShare': 'No hay imagen para compartir',
  'share': 'Compartir',
  'extractedText': 'Texto extraído',
  'noImageAvailable': 'No hay imagen disponible',
  'loadingError': 'Error de carga',
  'unknownDate': 'Fecha desconocida',
  'invalidDate': 'Fecha inválida',
  'noDocument': 'Sin documentos',
  'scanFirstDocument': 'Escanee su primer documento',
  'scanDocument': 'Escanear documento',
  'all': 'Todos',
  'contracts': 'Contratos',
  'others': 'Otros',
  'searchDocument': 'Buscar documento...',
  'scanner': 'Escáner',
  
  // Help
  'helpCenterTitle': 'Centro de Ayuda',
  'howCanWeHelp': '¿Cómo podemos ayudarte?',
  'findAnswers': 'Encuentra respuestas...',
  'faq': 'Preguntas Frecuentes',
  'needMoreHelp': '¿Necesitas más ayuda?',
  'website': 'Sitio web',
  
  // About
  'aboutTitle': 'Acerca de',
  'professionalConvoy': 'Convoy Profesional',
  'aboutApp': 'Acerca de la aplicación',
  
  // Subscriptions
  'subscriptions': 'Suscripciones',
  'availablePlans': 'Planes disponibles',
  'choosePlan': 'Elige el plan que se adapte a tus necesidades',
  'popular': 'POPULAR',
  'current': 'ACTUAL',
  'perMonth': '/mes',
  'perYear': '/año',
  'currentPlan': 'Plan actual',
  'choosePlanBtn': 'Elegir este plan',
  'confirmSubscription': 'Confirmar suscripción',
  'paymentInProgress': 'Pago en desarrollo...',
  'free': 'Gratis',
  'basic': 'Básico',
  'pro': 'Pro',
  'enterprise': 'Empresa',

  // Splash & Onboarding
  'splashTagline': 'Inspecciones de Vehículos Pro',
  'onboardingSkip': 'Saltar',
  'onboardingStart': 'Comenzar',
  'onboardingWelcomeTitle': 'Bienvenido a ChecksFleet',
  'onboardingWelcomeDesc': 'La plataforma completa para la gestión de tus convoyes y misiones de inspección.',
  'onboardingSmartTitle': 'Gestión inteligente',
  'onboardingSmartDesc': 'Encuentra viajes, comparte costos, comunícate en tiempo real con conductores y pasajeros.',
  'onboardingMissionsTitle': 'Misiones e Inspecciones',
  'onboardingMissionsDesc': 'Gestiona tus misiones de convoy, realiza inspecciones detalladas con fotos y documentos.',
  'onboardingGpsTitle': 'Seguimiento GPS en Tiempo Real',
  'onboardingGpsDesc': 'Sigue tus viajes en directo, comparte tu ubicación y mantente conectado durante tus desplazamientos.',
};

// ============ DELEGATE ============
class _AppLocalizationsDelegate extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();
  
  @override
  bool isSupported(Locale locale) {
    return ['fr', 'en', 'ar', 'es'].contains(locale.languageCode);
  }
  
  @override
  Future<AppLocalizations> load(Locale locale) async {
    return AppLocalizations(locale);
  }
  
  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}
