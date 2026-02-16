<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\MissionController;
use App\Http\Controllers\ContactController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\BillingController;
use App\Http\Controllers\MarketplaceController;
use App\Http\Controllers\CovoiturageController;
use App\Http\Controllers\SettingsController;
use App\Http\Middleware\AuthMiddleware;

// Public routes
Route::get('/', [HomeController::class, 'index'])->name('home');

// Auth routes
Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
Route::post('/login', [AuthController::class, 'login']);
Route::get('/register', [AuthController::class, 'showRegister'])->name('register');
Route::post('/register', [AuthController::class, 'register']);
Route::get('/forgot-password', [AuthController::class, 'forgotPassword'])->name('forgot-password');
Route::post('/reset-password', [AuthController::class, 'resetPassword']);
Route::post('/logout', [AuthController::class, 'logout'])->name('logout');

// Protected routes (require authentication)
Route::middleware([AuthMiddleware::class])->group(function () {
    // Dashboard
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    // Missions
    Route::get('/missions', [MissionController::class, 'index'])->name('missions.index');
    Route::get('/missions/create', [MissionController::class, 'create'])->name('missions.create');
    Route::post('/missions', [MissionController::class, 'store'])->name('missions.store');
    Route::get('/missions/{id}', [MissionController::class, 'show'])->name('missions.show');
    Route::get('/missions/{id}/edit', [MissionController::class, 'edit'])->name('missions.edit');
    Route::put('/missions/{id}', [MissionController::class, 'update'])->name('missions.update');
    Route::delete('/missions/{id}', [MissionController::class, 'destroy'])->name('missions.destroy');
    Route::patch('/missions/{id}/status', [MissionController::class, 'updateStatus'])->name('missions.updateStatus');
    Route::post('/missions/{id}/archive', [MissionController::class, 'archive'])->name('missions.archive');
    Route::get('/missions/export/csv', [MissionController::class, 'exportCsv'])->name('missions.exportCsv');

    // Contacts
    Route::get('/contacts', [ContactController::class, 'index'])->name('contacts.index');
    Route::post('/contacts/invite', [ContactController::class, 'invite'])->name('contacts.invite');
    Route::get('/contacts/accept/{id}', [ContactController::class, 'accept'])->name('contacts.accept');
    Route::post('/contacts/{id}/reject', [ContactController::class, 'reject'])->name('contacts.reject');
    Route::delete('/contacts/{id}', [ContactController::class, 'destroy'])->name('contacts.destroy');

    // Reports
    Route::get('/reports', [ReportController::class, 'index'])->name('reports.index');
    Route::get('/reports/{id}', [ReportController::class, 'show'])->name('reports.show');
    Route::post('/reports/{id}/send-email', [ReportController::class, 'sendEmail'])->name('reports.sendEmail');
    Route::get('/reports/{id}/download-photos', [ReportController::class, 'downloadPhotos'])->name('reports.downloadPhotos');
    Route::post('/reports/{id}/archive', [ReportController::class, 'archive'])->name('reports.archive');
    Route::post('/reports/{id}/unarchive', [ReportController::class, 'unarchive'])->name('reports.unarchive');
    Route::get('/reports/export/csv', [ReportController::class, 'exportCsv'])->name('reports.exportCsv');

    // Billing
    Route::get('/billing', [BillingController::class, 'index'])->name('billing.index');
    Route::get('/billing/company', [BillingController::class, 'companySettings'])->name('billing.company');
    Route::post('/billing/company', [BillingController::class, 'saveCompanySettings'])->name('billing.saveCompany');
    Route::post('/billing/clients', [BillingController::class, 'createClient'])->name('billing.createClient');
    Route::post('/billing/invoices', [BillingController::class, 'createInvoice'])->name('billing.createInvoice');
    Route::post('/billing/quotes', [BillingController::class, 'createQuote'])->name('billing.createQuote');
    Route::patch('/billing/invoices/{id}/status', [BillingController::class, 'updateInvoiceStatus'])->name('billing.updateInvoiceStatus');
    Route::patch('/billing/quotes/{id}/status', [BillingController::class, 'updateQuoteStatus'])->name('billing.updateQuoteStatus');
    Route::get('/billing/invoices/{id}/pdf', [BillingController::class, 'downloadInvoicePdf'])->name('billing.downloadInvoicePdf');
    Route::get('/billing/quotes/{id}/pdf', [BillingController::class, 'downloadQuotePdf'])->name('billing.downloadQuotePdf');
    Route::post('/billing/invoices/{id}/send-email', [BillingController::class, 'sendInvoiceEmail'])->name('billing.sendInvoiceEmail');
    Route::post('/billing/quotes/{id}/convert', [BillingController::class, 'convertQuoteToInvoice'])->name('billing.convertQuoteToInvoice');

    // Marketplace
    Route::get('/marketplace', [MarketplaceController::class, 'index'])->name('marketplace.index');
    Route::get('/marketplace/create', [MarketplaceController::class, 'create'])->name('marketplace.create');
    Route::post('/marketplace', [MarketplaceController::class, 'store'])->name('marketplace.store');
    Route::get('/marketplace/{id}', [MarketplaceController::class, 'show'])->name('marketplace.show');
    Route::post('/marketplace/{id}/respond', [MarketplaceController::class, 'respond'])->name('marketplace.respond');
    Route::get('/marketplace/my/missions', [MarketplaceController::class, 'myMissions'])->name('marketplace.myMissions');
    Route::get('/marketplace/my/offers', [MarketplaceController::class, 'myOffers'])->name('marketplace.myOffers');
    Route::post('/marketplace/{missionId}/responses/{responseId}/accept', [MarketplaceController::class, 'acceptResponse'])->name('marketplace.acceptResponse');
    Route::post('/marketplace/{missionId}/responses/{responseId}/reject', [MarketplaceController::class, 'rejectResponse'])->name('marketplace.rejectResponse');

    // Covoiturage
    Route::get('/covoiturage', [CovoiturageController::class, 'index'])->name('covoiturage.index');
    Route::get('/covoiturage/publish', [CovoiturageController::class, 'publish'])->name('covoiturage.publish');
    Route::post('/covoiturage', [CovoiturageController::class, 'store'])->name('covoiturage.store');
    Route::get('/covoiturage/trips/{id}', [CovoiturageController::class, 'show'])->name('covoiturage.show');
    Route::post('/covoiturage/trips/{id}/reserve', [CovoiturageController::class, 'reserve'])->name('covoiturage.reserve');
    Route::get('/covoiturage/my-trips', [CovoiturageController::class, 'myTrips'])->name('covoiturage.myTrips');
    Route::post('/covoiturage/trips/{rideId}/reservations/{reservationId}/confirm', [CovoiturageController::class, 'confirmReservation'])->name('covoiturage.confirmReservation');
    Route::post('/covoiturage/trips/{rideId}/reservations/{reservationId}/cancel', [CovoiturageController::class, 'cancelReservation'])->name('covoiturage.cancelReservation');
    Route::get('/covoiturage/messages', [CovoiturageController::class, 'messages'])->name('covoiturage.messages');
    Route::post('/covoiturage/trips/{id}/messages', [CovoiturageController::class, 'sendMessage'])->name('covoiturage.sendMessage');

    // Settings
    Route::get('/settings', [SettingsController::class, 'index'])->name('settings.index');
    Route::post('/settings/profile', [SettingsController::class, 'updateProfile'])->name('settings.updateProfile');
    Route::post('/settings/avatar', [SettingsController::class, 'uploadAvatar'])->name('settings.uploadAvatar');
    Route::delete('/settings/avatar', [SettingsController::class, 'deleteAvatar'])->name('settings.deleteAvatar');
    Route::post('/settings/password', [SettingsController::class, 'updatePassword'])->name('settings.updatePassword');
    Route::post('/settings/notifications', [SettingsController::class, 'updateNotifications'])->name('settings.updateNotifications');
    Route::post('/settings/language', [SettingsController::class, 'updateLanguage'])->name('settings.updateLanguage');
    Route::delete('/settings/account', [SettingsController::class, 'deleteAccount'])->name('settings.deleteAccount');
});
