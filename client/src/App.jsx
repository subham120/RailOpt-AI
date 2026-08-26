import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import Footer from './components/layout/Footer';
import ProtectedRoute from './components/layout/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DataIntegration from './pages/DataIntegration';
import Prioritization from './pages/Prioritization';
import Schedules from './pages/Schedules';
import Requests from './pages/Requests';
import Reports from './pages/Reports';
import CorridorMapPage from './pages/CorridorMapPage';

function AppLayout() {
  const { isAuthenticated } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />
      <div style={{ display: 'flex', flex: 1 }}>
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <main
          id="main-content"
          style={{
            flex: 1,
            minHeight: 'calc(100vh - 88px)',
            overflow: 'auto',
            background: '#F4F6F8',
          }}
        >
          <Routes>
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/corridor-map" element={<ProtectedRoute><CorridorMapPage /></ProtectedRoute>} />
            <Route path="/data-integration" element={<ProtectedRoute><DataIntegration /></ProtectedRoute>} />
            <Route path="/prioritization" element={
              <ProtectedRoute roles={['admin', 'control_office']}>
                <Prioritization />
              </ProtectedRoute>
            } />
            <Route path="/schedules" element={<ProtectedRoute><Schedules /></ProtectedRoute>} />
            <Route path="/requests" element={<ProtectedRoute><Requests /></ProtectedRoute>} />
            <Route path="/reports" element={
              <ProtectedRoute roles={['admin', 'control_office']}>
                <Reports />
              </ProtectedRoute>
            } />
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppLayout />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
