import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import ToastContainer from './components/Toast';
import AccessibilityZoom from './components/AccessibilityZoom';

import Home from './pages/Home';
import Legal from './pages/Legal';
import About from './pages/About';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import Login from './pages/Login';
import CookieConsent from './components/CookieConsent';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import MissionCreate from './pages/MissionCreate';
import MissionView from './pages/MissionView';
import Contacts from './pages/Contacts_PREMIUM';
import Clients from './pages/Clients';
import Billing from './pages/Billing';
import Covoiturage from './pages/Covoiturage';
import CarpoolingPage from './pages/CarpoolingPage';
import MyRidesDashboard from './pages/MyRidesDashboard';
import RideDetailsPage from './pages/RideDetailsPage';
import PublishRidePage from './pages/PublishRidePage';
import DriverProfilePage from './pages/DriverProfilePage';
import DashboardProPage from './pages/DashboardProPage';
import CarpoolingMapPage from './pages/CarpoolingMapPage';
import AdvancedSearchPage from './pages/AdvancedSearchPage';
import MessagesPage from './pages/MessagesPage';
import PublishRideSimplePage from './pages/PublishRideSimplePage';
import RideDetailsSimplePage from './pages/RideDetailsSimplePage';
import QuoteGenerator from './pages/QuoteGenerator';
import CRM from './pages/CRM';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import MissionTracking from './pages/MissionTracking';
import Shop from './pages/Shop';
import Support from './pages/Support';
import Admin from './pages/Admin';
import AdminSupport from './pages/AdminSupport';
import AccountSecurity from './pages/AccountSecurity';
import PublicTracking from './pages/PublicTracking';
import TrackingList from './pages/TrackingList';
import RealtimeTracking from './pages/RealtimeTracking';
import TeamMissions from './pages/TeamMissions';
import InspectionDepartureNew from './pages/InspectionDepartureNew';
import InspectionArrivalNew from './pages/InspectionArrivalNew';
import InspectionReportsPremium from './pages/InspectionReportsPremium';
import PublicInspectionReport from './pages/PublicInspectionReport';
import PublicInspectionReportShared from './pages/PublicInspectionReportShared';
import PrivacyPolicy from './pages/legal/PrivacyPolicy';
import TermsOfService from './pages/legal/TermsOfService';
import CookiePolicy from './pages/legal/CookiePolicy';
import VoiceSettings from './pages/VoiceSettings';
import MobileDownload from './pages/MobileDownload';
import ResetPassword from './pages/ResetPassword';

function AppContent() {
  return (
    <>
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
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/tracking/public/:token" element={<PublicTracking />} />
        <Route path="/rapport/:token" element={<PublicInspectionReport />} />
        <Route path="/rapport-inspection/:token" element={<PublicInspectionReportShared />} />
        <Route path="/inspection/report/:inspectionId" element={<PublicInspectionReport />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
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
            path="/tracking"
            element={
              <ProtectedRoute>
                <Layout>
                  <TrackingList />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/missions/:missionId/tracking"
            element={
              <ProtectedRoute>
                <MissionTracking />
              </ProtectedRoute>
            }
          />

          <Route
            path="/missions/:missionId/realtime"
            element={
              <ProtectedRoute>
                <RealtimeTracking />
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
            path="/contacts"
            element={
              <ProtectedRoute>
                <Layout>
                  <Contacts />
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
                  <InspectionDepartureNew />
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
            path="/rapports-inspection"
            element={
              <ProtectedRoute>
                <Layout>
                  <InspectionReportsPremium />
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
            path="/covoiturage"
            element={
              <ProtectedRoute>
                <Layout>
                  <CarpoolingPage />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/covoiturage/publier"
            element={
              <ProtectedRoute>
                <PublishRideSimplePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/covoiturage/trajet/:rideId"
            element={
              <ProtectedRoute>
                <RideDetailsSimplePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/covoiturage/mes-trajets"
            element={
              <ProtectedRoute>
                <Layout>
                  <MyRidesDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/covoiturage/carte"
            element={
              <ProtectedRoute>
                <Layout>
                  <CarpoolingMapPage />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/covoiturage/recherche"
            element={
              <ProtectedRoute>
                <Layout>
                  <AdvancedSearchPage />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/covoiturage/messages"
            element={
              <ProtectedRoute>
                <MessagesPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/covoiturage/dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <DashboardProPage />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/covoiturage/profil/:userId"
            element={
              <ProtectedRoute>
                <Layout>
                  <DriverProfilePage />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/covoiturage-old"
            element={
              <ProtectedRoute>
                <Layout>
                  <Covoiturage />
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
            path="/voice-settings"
            element={
              <ProtectedRoute>
                <Layout>
                  <VoiceSettings />
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
                <Layout>
                  <Admin />
                </Layout>
              </AdminRoute>
            }
          />

          <Route
            path="/admin/security"
            element={
              <AdminRoute>
                <Layout>
                  <AccountSecurity />
                </Layout>
              </AdminRoute>
            }
          />

          <Route
            path="/admin/support"
            element={
              <AdminRoute>
                <Layout>
                  <AdminSupport />
                </Layout>
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
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
