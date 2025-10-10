import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import ToastContainer from './components/Toast';

import Home from './pages/Home';
import Legal from './pages/Legal';
import About from './pages/About';
import Privacy from './pages/Privacy';
import Login from './pages/Login';
import CookieConsent from './components/CookieConsent';
import ChatAssistant from './components/ChatAssistant';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import Missions from './pages/Missions';
import MissionCreate from './pages/MissionCreate';
import MissionView from './pages/MissionView';
import Contacts from './pages/Contacts';
import Billing from './pages/Billing';
import Reports from './pages/Reports';
import Covoiturage from './pages/Covoiturage';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import MissionTracking from './pages/MissionTracking';
import Shop from './pages/Shop';
import Admin from './pages/Admin';
import AdminSupport from './pages/AdminSupport';
import AccountSecurity from './pages/AccountSecurity';
import PublicTracking from './pages/PublicTracking';
import TrackingList from './pages/TrackingList';
import TeamMissions from './pages/TeamMissions';
import InspectionDeparture from './pages/InspectionDeparture';
import InspectionArrival from './pages/InspectionArrival';

function AppContent() {
  const { user } = useAuth();

  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/legal" element={<Legal />} />
        <Route path="/about" element={<About />} />
        <Route path="/privacy" element={<Privacy />} />
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
            path="/reports"
            element={
              <ProtectedRoute>
                <Layout>
                  <Reports />
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
      {user && <ChatAssistant />}
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
