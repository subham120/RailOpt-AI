export default function Footer() {
  return (
    <footer style={{
      background: '#0A2540',
      color: 'rgba(255,255,255,0.7)',
      padding: '20px 24px',
      fontSize: '12px',
      borderTop: '3px solid #FF671F',
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <p style={{ margin: 0, fontWeight: '700', color: 'white', fontSize: '13px' }}>RailOpt AI — Indian Railways</p>
          <p style={{ margin: '4px 0 0', opacity: 0.7 }}>Automatic Maintenance Scheduling & Intelligent Block Optimization</p>
        </div>
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
          <a href="#" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = '#FF671F'} onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}>Privacy Policy</a>
          <a href="#" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = '#FF671F'} onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}>Terms of Service</a>
          <a href="#" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = '#FF671F'} onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}>GIGW Accessibility</a>
          <a href="#" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = '#FF671F'} onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}>Sitemap</a>
          <a href="#" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = '#FF671F'} onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}>Contact Ministry</a>
        </div>
      </div>
      <div style={{ maxWidth: '1200px', margin: '12px auto 0', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.1)', textAlign: 'center', opacity: 0.7 }}>
        © {new Date().getFullYear()} Ministry of Railways, Government of India. All rights reserved. Powered by RailOpt AI Engine.
      </div>
    </footer>
  );
}
