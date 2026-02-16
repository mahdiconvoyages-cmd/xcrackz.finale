import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import ToastContainer from './components/Toast';
import AccessibilityZoom from './components/AccessibilityZoom';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import CookieConsent from './components/CookieConsent';
import BillingGate from './components/BillingGate';
import { lazy, Suspense } from 'react';

// Public pages (loaded eagerly for fast LCP)
import Home from './pages/Home';
import Login from './pages/Login';

// Loading fallback
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-teal-50">
    <div className="animate-spin rounded-full h-12 w-12 border-4 border-teal-500 border-t-transparent"></div>
  </div>
);

// Auto-retry lazy import: reloads the page once if a chunk fails to load (stale cache after deploy)
function lazyRetry(importFn: () => Promise<any>) {
  return lazy(() =>
    importFn().catch(() => {
      const reloaded = sessionStorage.getItem('chunk_reload');
      if (!reloaded) {
        sessionStorage.setItem('chunk_reload', '1');
        window.location.reload();
        return new Promise(() => {}); // never resolves, page is reloading
      }
      sessionStorage.removeItem('chunk_reload');
      return importFn(); // second attempt after reload
    })
  );
}

// Lazy-loaded pages (with auto-retry on chunk load failure)
const Legal = lazyRetry(() => import('./pages/Legal'));
const About = lazyRetry(() => import('./pages/About'));
const Privacy = lazyRetry(() => import('./pages/Privacy'));
const Terms = lazyRetry(() => import('./pages/Terms'));
const SignupWizard = lazyRetry(() => import('./pages/SignupWizard'));
const ForgotPassword = lazyRetry(() => import('./pages/ForgotPassword'));
const ResetPassword = lazyRetry(() => import('./pages/ResetPassword'));
const DashboardPremium = lazyRetry(() => import('./pages/DashboardPremium'));
const MissionCreate = lazyRetry(() => import('./pages/MissionCreate'));
const MissionView = lazyRetry(() => import('./pages/MissionView'));
const MissionEdit = lazyRetry(() => import('./pages/MissionEdit'));
const Clients = lazyRetry(() => import('./pages/Clients'));
const Billing = lazyRetry(() => import('./pages/Billing'));
const QuoteGenerator = lazyRetry(() => import('./pages/QuoteGenerator'));
const CRM = lazyRetry(() => import('./pages/CRM'));
const Settings = lazyRetry(() => import('./pages/Settings'));
const Profile = lazyRetry(() => import('./pages/Profile'));
const MissionTracking = lazyRetry(() => import('./pages/MissionTracking'));
const Shop = lazyRetry(() => import('./pages/Shop'));
const Support = lazyRetry(() => import('./pages/Support'));
const Admin = lazyRetry(() => import('./pages/AdminDashboard'));
const AdminUsers = lazyRetry(() => import('./pages/AdminUsers'));
const AdminTracking = lazyRetry(() => import('./pages/AdminTracking'));
const AdminApk = lazyRetry(() => import('./pages/AdminApk'));
const AdminSupport = lazyRetry(() => import('./pages/AdminSupport'));
const AccountSecurity = lazyRetry(() => import('./pages/AccountSecurity'));
const AdminLayout = lazyRetry(() => import('./components/AdminLayout'));
const PublicTrackingNew = lazyRetry(() => import('./pages/PublicTrackingNew'));
const TrackingCommand = lazyRetry(() => import('./pages/TrackingCommand'));
const TeamMissions = lazyRetry(() => import('./pages/TeamMissions'));
const InspectionDeparturePerfect = lazyRetry(() => import('./pages/InspectionDeparturePerfect'));
const InspectionArrivalNew = lazyRetry(() => import('./pages/InspectionArrivalNew'));
const PublicInspectionReport = lazyRetry(() => import('./pages/PublicInspectionReport'));
const TestSentry = lazyRetry(() => import('./pages/TestSentry'));
const PublicInspectionReportShared = lazyRetry(() => import('./pages/PublicInspectionReportShared'));
const PrivacyPolicy = lazyRetry(() => import('./pages/legal/PrivacyPolicy'));
const TermsOfService = lazyRetry(() => import('./pages/legal/TermsOfService'));
const CookiePolicy = lazyRetry(() => import('./pages/legal/CookiePolicy'));
const MobileDownload = lazyRetry(() => import('./pages/MobileDownload'));
const MissionDetail = lazyRetry(() => import('./pages/MissionDetail'));
const ScannerHomePage = lazyRetry(() => import('./pages/ScannerHomePage'));
const ProfessionalScannerPage = lazyRetry(() => import('./pages/ProfessionalScannerPage'));
const MyDocuments = lazyRetry(() => import('./pages/MyDocuments'));
const BillingProfile = lazyRetry(() => import('./pages/BillingProfile'));

function AppContent() {
  return (
    <>
      <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/legal" element={<Legal />} />
        <Route path="/about" element={<About />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/legal/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/legal/terms-of-service" element={<TermsOfService />} />
        <Route path="/legal/cookie-policy" element={<CookiePolicy />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<SignupWizard />} />
        <Route path="/signup" element={<SignupWizard />} />
        <Route path="/inscription" element={<SignupWizard />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/tracking/:token" element={<PublicTrackingNew />} />
        <Route path="/rapport/:token" element={<PublicInspectionReport />} />
        <Route path="/rapport-inspection/:token" element={<PublicInspectionReportShared />} />
        <Route path="/inspection/report/:inspectionId" element={<PublicInspectionReport />} />
        <Route path="/mission/:missionId" element={<MissionDetail />} />
        <Route path="/scanner" element={
          <ProtectedRoute>
            <Layout>
              <ScannerHomePage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/scanner-pro" element={
          <ProtectedRoute>
            <Layout>
              <ProfessionalScannerPage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/mes-documents" element={
          <ProtectedRoute>
            <Layout>
              <MyDocuments />
            </Layout>
          </ProtectedRoute>
        } />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <DashboardPremium />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Redirect /missions to /team-missions */}
          <Route
            path="/missions"
            element={
              <ProtectedRoute>
                <Layout>
                  <TeamMissions />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Test Sentry - Page de test pour monitorer les erreurs */}
          <Route path="/test-sentry" element={<TestSentry />} />

          <Route
            path="/missions/create"
            element={
              <ProtectedRoute>
                <Layout>
                  <MissionCreate />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/missions/edit/:missionId"
            element={
              <ProtectedRoute>
                <Layout>
                  <MissionEdit />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/tracking"
            element={
              <ProtectedRoute>
                <Layout>
                  <TrackingCommand />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/missions/:missionId/tracking"
            element={
              <ProtectedRoute>
                <Layout>
                  <MissionTracking />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/missions/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <MissionView />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/clients"
            element={
              <ProtectedRoute>
                <Layout>
                  <BillingGate>
                    <Clients />
                  </BillingGate>
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/crm"
            element={
              <ProtectedRoute>
                <Layout>
                  <BillingGate>
                    <CRM />
                  </BillingGate>
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/team-missions"
            element={
              <ProtectedRoute>
                <Layout>
                  <TeamMissions />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/inspection/departure/:missionId"
            element={
              <ProtectedRoute>
                <Layout>
                  <InspectionDeparturePerfect />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/inspection/arrival/:missionId"
            element={
              <ProtectedRoute>
                <Layout>
                  <InspectionArrivalNew />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/billing-profile"
            element={
              <ProtectedRoute>
                <Layout>
                  <BillingProfile />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/billing"
            element={
              <ProtectedRoute>
                <Layout>
                  <BillingGate>
                    <Billing />
                  </BillingGate>
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/devis"
            element={
              <ProtectedRoute>
                <Layout>
                  <BillingGate>
                    <QuoteGenerator />
                  </BillingGate>
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Layout>
                  <Settings />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Layout>
                  <Profile />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/shop"
            element={
              <ProtectedRoute>
                <Layout>
                  <Shop />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/support"
            element={
              <ProtectedRoute>
                <Layout>
                  <Support />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/mobile-download"
            element={
              <ProtectedRoute>
                <Layout>
                  <MobileDownload />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminLayout>
                  <Admin />
                </AdminLayout>
              </AdminRoute>
            }
          />

          <Route
            path="/admin/users"
            element={
              <AdminRoute>
                <AdminLayout>
                  <AdminUsers />
                </AdminLayout>
              </AdminRoute>
            }
          />

          <Route
            path="/admin/tracking"
            element={
              <AdminRoute>
                <AdminLayout>
                  <AdminTracking />
                </AdminLayout>
              </AdminRoute>
            }
          />

          <Route
            path="/admin/security"
            element={
              <AdminRoute>
                <AdminLayout>
                  <AccountSecurity />
                </AdminLayout>
              </AdminRoute>
            }
          />

          <Route
            path="/admin/support"
            element={
              <AdminRoute>
                <AdminLayout>
                  <AdminSupport />
                </AdminLayout>
              </AdminRoute>
            }
          />

          <Route
            path="/admin/apk"
            element={
              <AdminRoute>
                <AdminLayout>
                  <AdminApk />
                </AdminLayout>
              </AdminRoute>
            }
          />

        {/* Keep 404 route at the end - but show a proper 404 page instead of redirecting */}
        <Route path="*" element={
          <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-teal-50">
            <div className="text-center">
              <h1 className="text-6xl font-black text-slate-800 mb-4">404</h1>
              <p className="text-xl text-slate-600 mb-8">Page non trouvée</p>
              <Link 
                to="/" 
                className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-500 to-cyan-500 text-white px-6 py-3 rounded-xl font-bold hover:shadow-xl transition-all"
              >
                Retour à l'accueil
              </Link>
            </div>
          </div>
        } />
      </Routes>
      </Suspense>
      <CookieConsent />
      <ToastContainer />
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <AppContent />
          <AccessibilityZoom />
          <PWAInstallPrompt />
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
