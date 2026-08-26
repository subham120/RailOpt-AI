import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiAlertTriangle, FiLogIn } from 'react-icons/fi';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const demoAccounts = [
    { email: 'admin@railways.gov.in', password: 'admin123', label: 'Admin', color: '#003366' },
    { email: 'engineering@railways.gov.in', password: 'eng123', label: 'Engineering', color: '#1A5276' },
    { email: 'trd@railways.gov.in', password: 'trd123', label: 'TRD (OHE)', color: '#FF671F' },
    { email: 'signal@railways.gov.in', password: 'sig123', label: 'S&T (Signal)', color: '#046A38' },
    { email: 'control@railways.gov.in', password: 'control123', label: 'Control Office', color: '#6B21A8' },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0A2540 0%, #003366 40%, #1A5276 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      {/* Background Pattern */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.04,
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }} />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '480px' }} className="animate-fadeIn">
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px', color: 'white' }}>
          {/* Indian Railways Official Logo */}
          <div style={{
            width: '76px', height: '76px', borderRadius: '50%',
            background: '#FFFFFF',
            border: '3px solid rgba(255,255,255,0.9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            overflow: 'hidden'
          }}>
            <img
              src="/favicon.png"
              alt="Indian Railways 18-Star Official Logo"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: '800', margin: '0 0 4px', letterSpacing: '0.02em', color: '#FFFFFF' }}>
            RailOpt AI
          </h1>
          <p style={{ fontSize: '13px', opacity: 0.85, margin: 0, color: '#E2E8F0' }}>
            Indian Railways — Automatic Maintenance Scheduling System
          </p>
        </div>

        {/* Login Card */}
        <div style={{
          background: 'rgba(255,255,255,0.98)', borderRadius: '16px',
          padding: '36px', boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
          backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.8)',
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#1E293B', marginBottom: '24px', textAlign: 'center' }}>
            Divisional Official Login
          </h2>

          {error && (
            <div style={{
              background: '#FEE2E2', color: '#991B1B', padding: '12px 16px',
              borderRadius: '8px', marginBottom: '20px', fontSize: '13px',
              border: '1px solid #FECACA', display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <FiAlertTriangle style={{ fontSize: '18px', flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                Official Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="name@railways.gov.in"
                required
                autoFocus
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                Secure Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-lg"
              style={{ width: '100%', opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              {loading ? (
                <><span style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} /> Signing In...</>
              ) : (
                <><FiLogIn /> Sign In to Portal</>
              )}
            </button>
          </form>

          {/* Quick Demo Accounts */}
          <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid #E2E8F0' }}>
            <p style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', marginBottom: '10px', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Quick Demo Accounts
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center' }}>
              {demoAccounts.map((acc) => (
                <button
                  key={acc.email}
                  onClick={() => { setEmail(acc.email); setPassword(acc.password); }}
                  style={{
                    padding: '5px 12px', borderRadius: '6px', border: `1px solid ${acc.color}25`,
                    background: `${acc.color}08`, color: acc.color, fontSize: '12px', fontWeight: '600',
                    cursor: 'pointer', transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = `${acc.color}15`; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = `${acc.color}08`; }}
                  type="button"
                >
                  {acc.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
