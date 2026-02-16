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

// Lazy-loaded pages
const Legal = lazy(() => import('./pages/Legal'));
const About = lazy(() => import('./pages/About'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Terms = lazy(() => import('./pages/Terms'));
const SignupWizard = lazy(() => import('./pages/SignupWizard'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const DashboardPremium = lazy(() => import('./pages/DashboardPremium'));
const MissionCreate = lazy(() => import('./pages/MissionCreate'));
const MissionView = lazy(() => import('./pages/MissionView'));
const MissionEdit = lazy(() => import('./pages/MissionEdit'));
const Clients = lazy(() => import('./pages/Clients'));
const Billing = lazy(() => import('./pages/Billing'));
const QuoteGenerator = lazy(() => import('./pages/QuoteGenerator'));
const CRM = lazy(() => import('./pages/CRM'));
const Settings = lazy(() => import('./pages/Settings'));
const Profile = lazy(() => import('./pages/Profile'));
const MissionTracking = lazy(() => import('./pages/MissionTracking'));
const Shop = lazy(() => import('./pages/Shop'));
const Support = lazy(() => import('./pages/Support'));
const Admin = lazy(() => import('./pages/AdminDashboard'));
const AdminUsers = lazy(() => import('./pages/AdminUsers'));
const AdminTracking = lazy(() => import('./pages/AdminTracking'));
const AdminApk = lazy(() => import('./pages/AdminApk'));
const AdminSupport = lazy(() => import('./pages/AdminSupport'));
const AccountSecurity = lazy(() => import('./pages/AccountSecurity'));
const AdminLayout = lazy(() => import('./components/AdminLayout'));
const PublicTrackingNew = lazy(() => import('./pages/PublicTrackingNew'));
const TrackingCommand = lazy(() => import('./pages/TrackingCommand'));
const TeamMissions = lazy(() => import('./pages/TeamMissions'));
const InspectionDeparturePerfect = lazy(() => import('./pages/InspectionDeparturePerfect'));
const InspectionArrivalNew = lazy(() => import('./pages/InspectionArrivalNew'));
const PublicInspectionReport = lazy(() => import('./pages/PublicInspectionReport'));
const TestSentry = lazy(() => import('./pages/TestSentry'));
const PublicInspectionReportShared = lazy(() => import('./pages/PublicInspectionReportShared'));
const PrivacyPolicy = lazy(() => import('./pages/legal/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./pages/legal/TermsOfService'));
const CookiePolicy = lazy(() => import('./pages/legal/CookiePolicy'));
const MobileDownload = lazy(() => import('./pages/MobileDownload'));
const MissionDetail = lazy(() => import('./pages/MissionDetail'));
const ScannerHomePage = lazy(() => import('./pages/ScannerHomePage'));
const ProfessionalScannerPage = lazy(() => import('./pages/ProfessionalScannerPage'));
const MyDocuments = lazy(() => import('./pages/MyDocuments'));

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
                  <Clients />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/crm"
            element={
              <ProtectedRoute>
                <Layout>
                  <CRM />
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
            path="/billing"
            element={
              <ProtectedRoute>
                <Layout>
                  <Billing />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/devis"
            element={
              <ProtectedRoute>
                <Layout>
                  <QuoteGenerator />
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
