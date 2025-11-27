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
