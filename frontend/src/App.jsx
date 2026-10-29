import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import AppLayout from './components/layout/AppLayout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Overview from './pages/Overview';
import NetworkMonitor from './pages/NetworkMonitor';
import ThreatDetection from './pages/ThreatDetection';
import Datasets from './pages/Datasets';
import DetectionHistory from './pages/DetectionHistory';
import MLAnalytics from './pages/MLAnalytics';
import Explainability from './pages/Explainability';
import SecurityAlerts from './pages/SecurityAlerts';
import IncidentInvestigation from './pages/IncidentInvestigation';
import Reports from './pages/Reports';
import AuditLogs from './pages/AuditLogs';
import Settings from './pages/Settings';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-border border-t-accent-emerald rounded-full animate-spin" />
          <span className="text-xs text-text-muted">Authenticating CyberKavach AI Session…</span>
        </div>
      </div>
    );
  }

  // Enforce authentication unless explicitly bypassed
  const devBypass = import.meta.env.DEV && import.meta.env.VITE_DEV_BYPASS_AUTH === 'true';
  if (!isAuthenticated && !devBypass) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Overview />} />
        <Route path="network" element={<NetworkMonitor />} />
        <Route path="threat-detection" element={<ThreatDetection />} />
        <Route path="datasets" element={<Datasets />} />
        <Route path="detection-history" element={<DetectionHistory />} />
        <Route path="ml-analytics" element={<MLAnalytics />} />
        <Route path="explainability" element={<Explainability />} />
        <Route path="alerts" element={<SecurityAlerts />} />
        <Route path="incidents" element={<IncidentInvestigation />} />
        <Route path="reports" element={<Reports />} />
        <Route path="audit-logs" element={<AuditLogs />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppProvider>
          <AppRoutes />
        </AppProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
