import { useAuth } from '../../context/AuthContext';
import { ROLE_LABELS, ZONAL_RAILWAYS } from '../../utils/constants';
import { useState } from 'react';
import { FiLogOut, FiUser, FiChevronDown, FiGlobe } from 'react-icons/fi';

export default function Header() {
  const { user, logout, activeZone, setActiveZone } = useAuth();
  const [fontSize, setFontSize] = useState(16);
  const [showMenu, setShowMenu] = useState(false);

  const changeFontSize = (delta) => {
    const newSize = Math.min(Math.max(fontSize + delta, 12), 22);
    setFontSize(newSize);
    document.documentElement.style.fontSize = `${newSize}px`;
  };

  return (
    <div style={{ position: 'sticky', top: 0, zIndex: 1000, width: '100%' }}>
      {/* Skip to content — GIGW compliance */}
      <a href="#main-content" className="skip-link">Skip to Main Content</a>

      {/* Top Government Banner */}
      <div style={{ background: '#002244', color: 'white', fontSize: '12px', padding: '4px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: '600' }}>Government of India</span>
          <span style={{ opacity: 0.6 }}>|</span>
          <span>भारत सरकार</span>
          <span style={{ opacity: 0.6 }}>|</span>
          <span style={{ opacity: 0.9 }}>Ministry of Railways</span>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          {/* Font Size Switcher — GIGW */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', opacity: 0.8, marginRight: '4px' }}>Text Size:</span>
            <button onClick={() => changeFontSize(-1)} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.3)', color: 'white', borderRadius: '3px', padding: '1px 6px', cursor: 'pointer', fontSize: '11px' }} aria-label="Decrease font size">A-</button>
            <button onClick={() => changeFontSize(0)} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.3)', color: 'white', borderRadius: '3px', padding: '1px 6px', cursor: 'pointer', fontSize: '12px' }} aria-label="Reset font size">A</button>
            <button onClick={() => changeFontSize(1)} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.3)', color: 'white', borderRadius: '3px', padding: '1px 6px', cursor: 'pointer', fontSize: '13px' }} aria-label="Increase font size">A+</button>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header style={{
        background: 'linear-gradient(135deg, #0A2540 0%, #003366 50%, #1A5276 100%)',
        color: 'white',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '64px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      }}>
        {/* Left — Official Emblem + Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* Official Indian Railways Logo */}
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '50%',
            background: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid rgba(255,255,255,0.8)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
            overflow: 'hidden',
            flexShrink: 0
          }}>
            <img
              src="/favicon.png"
              alt="Indian Railways 18-Star Logo"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: '800', letterSpacing: '0.03em', margin: 0, lineHeight: 1.2, color: '#FFFFFF' }}>
              RailOpt AI
            </h1>
            <p style={{ fontSize: '11px', opacity: 0.85, margin: '2px 0 0', fontWeight: '400', color: '#E2E8F0' }}>
              Indian Railways — Automatic Maintenance Scheduling & Block Planning
            </p>
          </div>
        </div>

        {/* Right — Zone Selector & User Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', position: 'relative' }}>
          {/* Pan-India Zone Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FiGlobe style={{ color: '#FBBF24', fontSize: '15px' }} />
            <select
              value={activeZone || 'ALL'}
              onChange={(e) => setActiveZone(e.target.value)}
              style={{
                background: 'rgba(255, 255, 255, 0.12)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                color: '#FFFFFF',
                borderRadius: '6px',
                padding: '6px 10px',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                outline: 'none',
              }}
              aria-label="Select Railway Zone"
            >
              {ZONAL_RAILWAYS.map((z) => (
                <option key={z.code} value={z.code} style={{ background: '#0A2540', color: '#FFFFFF' }}>
                  {z.code === 'ALL' ? '🌐 Pan-India (All 18 Zones)' : `${z.code} — ${z.name}`}
                </option>
              ))}
            </select>
          </div>

          <div
            style={{
              display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer',
              padding: '6px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.15)', transition: 'background 0.2s',
            }}
            onClick={() => setShowMenu(!showMenu)}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          >
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #FF671F, #E65100)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '14px', fontWeight: '700', color: 'white',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            }}>
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '13px', fontWeight: '600', margin: 0, lineHeight: 1.2 }}>{user?.name || 'Admin User'}</p>
              <p style={{ fontSize: '11px', opacity: 0.75, margin: 0 }}>{ROLE_LABELS[user?.role] || user?.role || 'Administrator'}</p>
            </div>
            <FiChevronDown style={{ opacity: 0.7, fontSize: '14px', transition: 'transform 0.2s', transform: showMenu ? 'rotate(180deg)' : 'none' }} />
          </div>

          {/* Dropdown Menu */}
          {showMenu && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, marginTop: '8px',
              background: 'white', borderRadius: '10px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
              minWidth: '220px', overflow: 'hidden', zIndex: 200, border: '1px solid #E2E8F0',
            }} className="animate-fadeIn">
              <div style={{ padding: '14px 16px', borderBottom: '1px solid #E2E8F0', background: '#F8FAFC' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <FiUser style={{ color: '#003366', fontSize: '14px' }} />
                  <p style={{ fontSize: '13px', fontWeight: '700', color: '#1E293B', margin: 0 }}>{user?.name}</p>
                </div>
                <p style={{ fontSize: '12px', color: '#64748B', margin: 0 }}>{user?.email}</p>
                <span style={{
                  display: 'inline-block', marginTop: '6px', padding: '2px 8px',
                  background: '#E6EDF5', color: '#003366', borderRadius: '4px',
                  fontSize: '11px', fontWeight: '600',
                }}>{user?.department || 'Operating'}</span>
              </div>
              <button
                onClick={logout}
                style={{
                  width: '100%', padding: '12px 16px', border: 'none',
                  background: 'none', textAlign: 'left', cursor: 'pointer',
                  fontSize: '13px', color: '#DC2626', fontWeight: '600',
                  display: 'flex', alignItems: 'center', gap: '8px',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#FEE2E2'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
              >
                <FiLogOut style={{ fontSize: '15px' }} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </header>
    </div>
  );
}
