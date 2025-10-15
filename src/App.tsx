import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import ToastContainer from './components/Toast';

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
import Missions from './pages/Missions';
import MissionCreate from './pages/MissionCreate';
import MissionView from './pages/MissionView';
import Contacts from './pages/Contacts_PREMIUM';
import Clients from './pages/Clients';
import Billing from './pages/Billing';
import Covoiturage from './pages/Covoiturage';
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
import TeamMissions from './pages/TeamMissions';
import InspectionDeparture from './pages/InspectionDeparture';
import InspectionArrival from './pages/InspectionArrival';
import InspectionWizard from './pages/InspectionWizard';
import RapportsInspection from './pages/RapportsInspection';
import PrivacyPolicy from './pages/legal/PrivacyPolicy';
import TermsOfService from './pages/legal/TermsOfService';
import CookiePolicy from './pages/legal/CookiePolicy';
import VoiceSettings from './pages/VoiceSettings';

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
        <Route path="/tracking/public/:token" element={<PublicTracking />} />

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

          <Route
            path="/missions"
            element={
              <ProtectedRoute>
                <Layout>
                  <Missions />
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
                <InspectionDeparture />
              </ProtectedRoute>
            }
          />

          <Route
            path="/inspection/arrival/:missionId"
            element={
              <ProtectedRoute>
                <InspectionArrival />
              </ProtectedRoute>
            }
          />

          <Route
            path="/inspection/wizard/:missionId"
            element={
              <ProtectedRoute>
                <InspectionWizard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/rapports-inspection"
            element={
              <ProtectedRoute>
                <Layout>
                  <RapportsInspection />
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

        <Route path="*" element={<Navigate to="/" replace />} />
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
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
