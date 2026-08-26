import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { NAV_ITEMS } from '../../utils/constants';
import {
  FiGrid,
  FiDatabase,
  FiZap,
  FiCalendar,
  FiClipboard,
  FiBarChart2,
  FiChevronLeft,
  FiMap,
} from 'react-icons/fi';

const ICONS = {
  dashboard: FiGrid,
  map: FiMap,
  database: FiDatabase,
  ai: FiZap,
  calendar: FiCalendar,
  request: FiClipboard,
  report: FiBarChart2,
};

export default function Sidebar({ collapsed, onToggle }) {
  const { user } = useAuth();

  const visibleItems = NAV_ITEMS.filter(item => item.roles.includes(user?.role));

  return (
    <aside style={{
      width: collapsed ? '64px' : '240px',
      background: 'linear-gradient(180deg, #0A2540 0%, #003366 100%)',
      color: 'white',
      height: 'calc(100vh - 92px)', // header + gov banner
      position: 'sticky',
      top: '92px',
      transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 50,
      borderRight: '1px solid rgba(255,255,255,0.08)',
    }}>
      {/* Top Header & Toggle Button */}
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          padding: collapsed ? '14px' : '12px 16px',
          border: 'none',
          background: 'rgba(255,255,255,0.03)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          color: 'white',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          transition: 'background 0.2s',
          marginBottom: '8px',
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {!collapsed && (
          <span style={{ fontSize: '14px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#F1F5F9' }}>
            Menu
          </span>
        )}
        <FiChevronLeft style={{
          fontSize: '18px',
          color: 'rgba(255,255,255,0.7)',
          transition: 'transform 0.3s',
          transform: collapsed ? 'rotate(180deg)' : 'none'
        }} />
      </button>

      {/* Navigation Items */}
      <nav style={{ flex: 1, padding: '0 8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {visibleItems.map((item) => {
          const IconComponent = ICONS[item.icon] || FiGrid;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: collapsed ? '12px' : '12px 16px',
                borderRadius: '8px',
                textDecoration: 'none',
                color: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.7)',
                background: isActive ? 'rgba(255, 103, 31, 0.25)' : 'transparent',
                borderLeft: isActive ? '3px solid #FF671F' : '3px solid transparent',
                fontWeight: isActive ? '600' : '400',
                fontSize: '14px',
                transition: 'all 0.2s',
                justifyContent: collapsed ? 'center' : 'flex-start',
                whiteSpace: 'nowrap',
              })}
            >
              <IconComponent style={{ fontSize: '18px', flexShrink: 0, width: '20px' }} />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom — Branding & Version */}
      {!collapsed && (
        <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: '11px', opacity: 0.6, textAlign: 'center' }}>
          <span style={{ fontWeight: '600', color: '#FF671F' }}>RailOpt AI</span> · v1.0.0
        </div>
      )}
    </aside>
  );
}
