import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useState, Component } from 'react';
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
import AssistantPage from './pages/AssistantPage';

// F5: React Error Boundary — prevents white-screen crashes from unhandled component errors
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[RailOpt ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a1628',
          color: '#fff',
          fontFamily: 'system-ui, sans-serif',
          gap: 16,
          padding: 32,
          textAlign: 'center',
        }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 900, margin: '0 auto' }}>!</div>
          <h2 style={{ fontSize: 22, margin: 0 }}>RailOpt AI — Unexpected Error</h2>
          <p style={{ color: '#94a3b8', maxWidth: 480, margin: 0 }}>
            Something went wrong in the interface. Please reload the page. If the problem persists,
            contact your system administrator.
          </p>
          <pre style={{
            background: '#1e293b', borderRadius: 8, padding: '12px 20px',
            fontSize: 12, color: '#f87171', maxWidth: 600, overflow: 'auto',
          }}>
            {this.state.error?.message}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: '#3b82f6', color: '#fff', border: 'none',
              borderRadius: 8, padding: '10px 28px', cursor: 'pointer',
              fontSize: 15, fontWeight: 600,
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// F2: Loading spinner shown while auth is being verified (prevents flash redirect to /login)
function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0a1628',
      flexDirection: 'column',
      gap: 16,
    }}>
      <div style={{
        width: 44,
        height: 44,
        border: '4px solid rgba(255,255,255,0.15)',
        borderTopColor: '#3b82f6',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <p style={{ color: '#94a3b8', fontFamily: 'system-ui, sans-serif', margin: 0 }}>
        Loading RailOpt AI…
      </p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function AppLayout() {
  const { isAuthenticated, loading } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();
  const isAssistant = location.pathname === '/assistant';

  // F2: Show spinner while token verification is in progress — prevents flash to /login
  if (loading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div style={{
      height: isAssistant ? '100vh' : undefined,
      minHeight: isAssistant ? undefined : '100vh',
      display: 'flex',
      flexDirection: 'column',
      overflow: isAssistant ? 'hidden' : undefined,
    }}>
      <Header />
      <div style={{
        display: 'flex',
        flex: 1,
        minHeight: 0,
        overflow: isAssistant ? 'hidden' : undefined,
      }}>
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <main
          id="main-content"
          style={{
            flex: 1,
            height: isAssistant ? '100%' : undefined,
            minHeight: isAssistant ? 0 : 'calc(100vh - 88px)',
            overflow: isAssistant ? 'hidden' : 'auto',
            background: '#F4F6F8',
            display: isAssistant ? 'flex' : undefined,
            flexDirection: isAssistant ? 'column' : undefined,
          }}
        >
          <Routes>
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/corridor-map" element={<ProtectedRoute><CorridorMapPage /></ProtectedRoute>} />
            <Route path="/data-integration" element={<ProtectedRoute><DataIntegration /></ProtectedRoute>} />
            <Route path="/prioritization" element={
              <ProtectedRoute roles={['admin', 'section_controller']}>
                <Prioritization />
              </ProtectedRoute>
            } />
            <Route path="/schedules" element={<ProtectedRoute><Schedules /></ProtectedRoute>} />
            <Route path="/requests" element={<ProtectedRoute><Requests /></ProtectedRoute>} />
            <Route path="/reports" element={
              <ProtectedRoute roles={['admin', 'section_controller']}>
                <Reports />
              </ProtectedRoute>
            } />
            <Route path="/assistant" element={<ProtectedRoute><AssistantPage /></ProtectedRoute>} />
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
      {!isAssistant && <Footer />}
    </div>
  );
}

function App() {
  return (
    // F5: ErrorBoundary wraps everything — white-screen crashes show a user-friendly error page
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <AppLayout />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
